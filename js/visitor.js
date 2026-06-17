let refreshInterval = null;

document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    refreshData();
    startAutoRefresh();
});

function initializePage() {
    document.getElementById('todayDate').textContent =
        new Date().toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });

    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
}

function updateCurrentTime() {
    document.getElementById('currentTime').textContent =
        new Date().toLocaleTimeString('zh-CN');
}

function startAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    refreshInterval = setInterval(refreshData, 30000);
}

function refreshData() {
    const status = FountainData.getPublicStatus();
    renderStatusAlerts(status);
    renderStatusGrid(status);
    renderTimeline(status.sessions);
    document.getElementById('lastUpdate').textContent =
        new Date(status.lastUpdate).toLocaleString('zh-CN');
}

function renderStatusAlerts(status) {
    const container = document.getElementById('statusAlerts');
    const alerts = [];

    if (status.deviceState.status === 'maintenance') {
        alerts.push({
            type: 'warning',
            message: `🔧 设备维护中：${status.deviceState.description}，喷泉暂不开放`
        });
    } else if (status.deviceState.status === 'fault') {
        alerts.push({
            type: 'danger',
            message: `⚠️ 设备故障：${status.deviceState.description}，喷泉暂不开放`
        });
    }

    if (status.weather.isWindy) {
        alerts.push({
            type: 'warning',
            message: `🌬️ 大风天气（${status.weather.windLevel}级），今日喷泉排程已自动取消`
        });
    }

    if (!status.canOpen && alerts.length === 0) {
        alerts.push({
            type: 'info',
            message: '当前喷泉暂不开放'
        });
    }

    if (status.canOpen && alerts.length === 0) {
        alerts.push({
            type: 'success',
            message: '✅ 设备正常，天气良好，喷泉将按计划开放'
        });
    }

    container.innerHTML = alerts.map(a =>
        `<div class="alert alert-${a.type}">${a.message}</div>`
    ).join('');
}

function renderStatusGrid(status) {
    const fountainStatus = document.getElementById('fountainStatus');
    if (status.canOpen) {
        const ongoingSession = status.sessions.find(s => s.isOngoing);
        if (ongoingSession) {
            fountainStatus.textContent = '🟢 开放中';
            fountainStatus.className = 'status-value status-normal';
        } else {
            fountainStatus.textContent = '⏸️ 待开放';
            fountainStatus.className = 'status-value status-normal';
        }
    } else {
        fountainStatus.textContent = '🔴 暂停开放';
        fountainStatus.className = 'status-value status-warning';
    }

    const deviceStatus = document.getElementById('deviceStatus');
    if (status.deviceState.status === 'normal') {
        deviceStatus.textContent = '✅ 正常';
        deviceStatus.className = 'status-value status-normal';
    } else if (status.deviceState.status === 'maintenance') {
        deviceStatus.textContent = '🔧 维护中';
        deviceStatus.className = 'status-value status-warning';
    } else {
        deviceStatus.textContent = '⚠️ 故障';
        deviceStatus.className = 'status-value status-warning';
    }

    const weatherStatus = document.getElementById('weatherStatus');
    weatherStatus.textContent = status.weather.description;
    weatherStatus.className = 'status-value ' +
        (status.weather.isWindy ? 'status-warning' : 'status-normal');

    const windLevel = document.getElementById('windLevel');
    windLevel.textContent = status.weather.windLevel + ' 级';
    windLevel.className = 'status-value ' +
        (status.weather.isWindy ? 'status-warning' : 'status-normal');
}

function renderTimeline(sessions) {
    const timeline = document.getElementById('timeline');
    const emptyState = document.getElementById('emptyState');

    const activeSessions = sessions.filter(s => s.status !== 'cancelled');
    const cancelledSessions = sessions.filter(s => s.status === 'cancelled');
    const allSessions = [...activeSessions, ...cancelledSessions];

    if (allSessions.length === 0) {
        timeline.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    allSessions.sort((a, b) => a.startTime.localeCompare(b.startTime));

    timeline.innerHTML = allSessions.map(session => renderTimelineItem(session)).join('');
}

function renderTimelineItem(session) {
    let itemClass = '';
    let statusBadge = '';
    let note = '';

    if (session.status === 'cancelled') {
        itemClass = 'cancelled';
        statusBadge = '<span class="badge badge-danger timeline-status">已取消</span>';
        note = session.cancelReason ? `取消原因：${session.cancelReason}` : '';
    } else if (session.isEnded) {
        itemClass = 'completed';
        statusBadge = '<span class="badge badge-secondary timeline-status">已结束</span>';
    } else if (session.isOngoing) {
        itemClass = 'ongoing';
        statusBadge = '<span class="badge badge-warning timeline-status">开放中 🎬</span>';
        note = '喷泉正在开放，欢迎观赏！';
    } else {
        statusBadge = '<span class="badge badge-success timeline-status">待开放</span>';
        const minutesUntilStart = getMinutesUntilStart(session);
        if (minutesUntilStart > 0 && minutesUntilStart < 60) {
            note = `距离开始还有约 ${minutesUntilStart} 分钟`;
        }
    }

    return `
        <div class="timeline-item ${itemClass}">
            <div class="timeline-time">
                ${session.startTime} - ${session.endTime}
                ${session.isOngoing ? ' <span style="font-size: 14px; color: #667eea;">● 正在播放</span>' : ''}
            </div>
            ${statusBadge}
            ${note ? `<div class="timeline-note">${note}</div>` : ''}
        </div>
    `;
}

function getMinutesUntilStart(session) {
    const now = new Date();
    const [hours, minutes] = session.startTime.split(':').map(Number);
    const start = new Date();
    start.setHours(hours, minutes, 0, 0);

    const diffMs = start - now;
    if (diffMs <= 0) return 0;

    return Math.ceil(diffMs / (1000 * 60));
}
