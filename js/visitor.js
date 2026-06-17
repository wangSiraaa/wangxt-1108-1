let refreshInterval = null;

document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    refreshData();
    startAutoRefresh();
    startClock();
});

function initializePage() {
    document.getElementById('todayDate').textContent =
        new Date().toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
}

function startClock() {
    updateHeroTime();
    setInterval(updateHeroTime, 1000);
}

function updateHeroTime() {
    document.getElementById('currentTimeHero').textContent =
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
    renderHeroStatus(status);
    renderAlertBanners(status);
    renderQuickStats(status);
    renderScheduleTimeline(status.sessions);
    renderInfoGrid(status);
    document.getElementById('lastUpdate').textContent =
        new Date(status.lastUpdate).toLocaleString('zh-CN');
}

function renderHeroStatus(status) {
    const card = document.getElementById('heroStatusCard');
    const icon = document.getElementById('heroStatusIcon');
    const title = document.getElementById('heroStatusTitle');
    const subtitle = document.getElementById('heroStatusSubtitle');

    card.className = 'hero-status-card';

    if (status.deviceState.status === 'maintenance') {
        card.classList.add('hero-status-maintenance');
        icon.textContent = '🔧';
        title.textContent = '设备维护中';
        subtitle.textContent = status.deviceState.publicNotice || '喷泉暂不开放，敬请谅解';
    } else if (status.deviceState.status === 'fault') {
        card.classList.add('hero-status-fault');
        icon.textContent = '⚠️';
        title.textContent = '设备故障';
        subtitle.textContent = status.deviceState.publicNotice || '喷泉暂不开放，正在抢修';
    } else if (status.weather.isWindy) {
        card.classList.add('hero-status-windy');
        icon.textContent = '🌬️';
        title.textContent = '大风暂停';
        subtitle.textContent = `风力${status.weather.windLevel}级，今日排程已调整`;
    } else if (status.ongoingSession) {
        card.classList.add('hero-status-ongoing');
        icon.textContent = '🎬';
        title.textContent = '开放中';
        subtitle.textContent = `${status.ongoingSession.startTime} - ${status.ongoingSession.endTime} 正在播放`;
    } else if (status.upcomingCount > 0) {
        card.classList.add('hero-status-normal');
        icon.textContent = '💧';
        title.textContent = '今日开放';
        subtitle.textContent = `今日共${status.activeCount}场，下一场即将开始`;
    } else if (status.activeCount > 0) {
        card.classList.add('hero-status-normal');
        icon.textContent = '💧';
        title.textContent = '今日开放';
        subtitle.textContent = `今日共${status.activeCount}场，欢迎观赏`;
    } else if (status.cancelledCount > 0) {
        card.classList.add('hero-status-cancelled');
        icon.textContent = '🚫';
        title.textContent = '今日全部取消';
        subtitle.textContent = '所有场次已取消，请关注后续通知';
    } else {
        card.classList.add('hero-status-empty');
        icon.textContent = '💤';
        title.textContent = '今日暂无排程';
        subtitle.textContent = '请明日再来观赏';
    }
}

function renderAlertBanners(status) {
    const container = document.getElementById('alertBanners');
    const banners = [];

    if (status.deviceState.status === 'maintenance') {
        banners.push({
            type: 'warning',
            icon: '🔧',
            title: '设备维护',
            message: status.deviceState.publicNotice || '设备维护中，喷泉暂不开放'
        });
    } else if (status.deviceState.status === 'fault') {
        banners.push({
            type: 'danger',
            icon: '⚠️',
            title: '设备故障',
            message: status.deviceState.publicNotice || '设备故障，喷泉暂不开放'
        });
    }

    if (status.weather.isWindy) {
        banners.push({
            type: 'warning',
            icon: '🌬️',
            title: '大风天气',
            message: `当前风力${status.weather.windLevel}级，已超过安全阈值，相关场次已取消`
        });
    }

    if (status.festival) {
        banners.push({
            type: 'info',
            icon: '🎉',
            title: status.festival.name,
            message: status.festival.description || '节假日期间，预计人流量大'
        });
    }

    if (status.tempEvents && status.tempEvents.length > 0) {
        banners.push({
            type: 'info',
            icon: '📅',
            title: '临时活动',
            message: `今日有${status.tempEvents.length}场临时活动，开放时间可能调整`
        });
    }

    if (status.deviceState.visitorTip && status.deviceState.status !== 'normal') {
        banners.push({
            type: 'info',
            icon: '💡',
            title: '温馨提示',
            message: status.deviceState.visitorTip
        });
    }

    if (banners.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = banners.map(b => `
        <div class="alert-banner alert-banner-${b.type}">
            <div class="alert-banner-icon">${b.icon}</div>
            <div class="alert-banner-content">
                <div class="alert-banner-title">${b.title}</div>
                <div class="alert-banner-message">${b.message}</div>
            </div>
        </div>
    `).join('');
}

function renderQuickStats(status) {
    const total = status.sessions.length;
    const active = status.sessions.filter(s => s.status !== 'cancelled').length;
    const cancelled = status.sessions.filter(s => s.status === 'cancelled').length;
    const completed = status.sessions.filter(s => s.isEnded && s.status !== 'cancelled').length;

    document.getElementById('todayTotal').textContent = total;
    document.getElementById('activeCount').textContent = active;
    document.getElementById('cancelledCount').textContent = cancelled;
    document.getElementById('completedCount').textContent = completed;
}

function renderScheduleTimeline(sessions) {
    const timeline = document.getElementById('scheduleTimeline');
    const emptyState = document.getElementById('emptyState');

    const allSessions = [...sessions].sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (allSessions.length === 0) {
        timeline.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    timeline.innerHTML = allSessions.map(session => renderTimelineCard(session)).join('');
}

function renderTimelineCard(session) {
    let cardClass = 'schedule-card';
    let statusBadge = '';
    let statusText = '';
    let note = '';

    if (session.status === 'cancelled') {
        cardClass += ' schedule-cancelled';
        statusBadge = '<span class="schedule-status schedule-status-cancelled">已取消</span>';
        statusText = session.cancelReason || '临时取消';
    } else if (session.isOngoing) {
        cardClass += ' schedule-ongoing';
        statusBadge = '<span class="schedule-status schedule-status-ongoing">播放中 🎬</span>';
        statusText = '喷泉正在开放';
    } else if (session.isEnded) {
        cardClass += ' schedule-completed';
        statusBadge = '<span class="schedule-status schedule-status-completed">已结束</span>';
        statusText = '本场已结束';
    } else if (session.isUpcoming) {
        cardClass += ' schedule-upcoming';
        statusBadge = '<span class="schedule-status schedule-status-upcoming">即将开始</span>';
        const mins = getMinutesUntilStart(session);
        statusText = mins > 0 ? `${mins}分钟后开始` : '即将开始';
    } else {
        cardClass += ' schedule-scheduled';
        statusBadge = '<span class="schedule-status schedule-status-scheduled">待开放</span>';
        statusText = '按计划开放';
    }

    let timeDisplay = `${session.startTime} - ${session.endTime}`;
    let originalTime = '';

    if (session.adjustType && session.status !== 'cancelled') {
        const adjustTexts = {
            'delay_open': '延后开放',
            'early_close': '提前结束',
            'extend_open': '延长开放',
            'advance_open': '提前开放'
        };
        originalTime = `<div class="schedule-original-time">原定：${session.originalStartTime} - ${session.originalEndTime}</div>`;
        note = `<div class="schedule-note">📌 ${adjustTexts[session.adjustType] || '时间调整'}${session.adjustReason ? '：' + session.adjustReason : ''}</div>`;
    }

    if (session.status === 'cancelled' && session.cancelReason) {
        note = `<div class="schedule-note">❌ ${session.cancelReason}</div>`;
    }

    if (session.abnormalReason && session.isEnded) {
        note = (note ? note + '' : '') + `<div class="schedule-note schedule-note-abnormal">⚠️ 异常：${session.abnormalReason}</div>`;
    }

    return `
        <div class="${cardClass}">
            <div class="schedule-time-block">
                <div class="schedule-time">${timeDisplay}</div>
                ${originalTime}
            </div>
            <div class="schedule-info-block">
                ${statusBadge}
                <div class="schedule-status-text">${statusText}</div>
                ${note}
            </div>
            ${session.isOngoing ? '<div class="schedule-pulse"></div>' : ''}
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

function renderInfoGrid(status) {
    document.getElementById('weatherInfo').textContent = status.weather.description;
    document.getElementById('windInfo').textContent = `风力 ${status.weather.windLevel} 级`;

    const deviceInfo = document.getElementById('deviceInfo');
    const deviceDesc = document.getElementById('deviceDesc');
    if (status.deviceState.status === 'normal') {
        deviceInfo.textContent = '正常运行';
        deviceDesc.textContent = status.deviceState.description || '设备状态良好';
    } else if (status.deviceState.status === 'maintenance') {
        deviceInfo.textContent = '维护中';
        deviceDesc.textContent = status.deviceState.description || '设备定期维护';
    } else {
        deviceInfo.textContent = '故障';
        deviceDesc.textContent = status.deviceState.description || '设备故障中';
    }

    const festivalInfo = document.getElementById('festivalInfo');
    const festivalDesc = document.getElementById('festivalDesc');
    if (status.festival) {
        festivalInfo.textContent = status.festival.name;
        festivalDesc.textContent = status.festival.description || '节庆活动进行中';
    } else {
        festivalInfo.textContent = '暂无';
        festivalDesc.textContent = '近期无节庆活动';
    }

    const noticeInfo = document.getElementById('noticeInfo');
    const noticeDesc = document.getElementById('noticeDesc');
    if (status.notices && status.notices.mainNotice) {
        noticeInfo.textContent = '有公告';
        noticeDesc.textContent = status.notices.mainNotice;
    } else if (status.deviceState.visitorTip) {
        noticeInfo.textContent = '温馨提示';
        noticeDesc.textContent = status.deviceState.visitorTip;
    } else {
        noticeInfo.textContent = '正常';
        noticeDesc.textContent = status.notices.safetyTips || '请遵守现场秩序';
    }
}
