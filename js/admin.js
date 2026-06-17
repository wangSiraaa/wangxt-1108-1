let editingScheduleId = null;

document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupEventListeners();
    refreshAllData();
});

function initializePage() {
    document.getElementById('todayDate').textContent = new Date().toLocaleDateString('zh-CN');

    const today = FountainData.formatDate(new Date());
    document.getElementById('scheduleDate').min = today;
    document.getElementById('scheduleDate').value = today;

    const weather = FountainData.getWeather();
    document.getElementById('windLevel').value = weather.windLevel;
    updateWindDisplay(weather.windLevel);
}

function setupEventListeners() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchTab(tabName);
        });
    });

    document.getElementById('windLevel').addEventListener('input', function() {
        const level = parseInt(this.value);
        updateWindDisplay(level);
    });

    document.getElementById('windLevel').addEventListener('change', function() {
        const level = parseInt(this.value);
        handleWindChange(level);
    });

    document.getElementById('addScheduleForm').addEventListener('submit', function(e) {
        e.preventDefault();
        handleAddSchedule();
    });

    document.getElementById('editScheduleForm').addEventListener('submit', function(e) {
        e.preventDefault();
        handleEditSchedule();
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

function updateWindDisplay(level) {
    document.getElementById('windLevelDisplay').textContent = level + ' 级';

    const statusEl = document.getElementById('windStatus');
    if (level >= FountainData.WIND_THRESHOLD) {
        statusEl.textContent = '⚠️ 大风天气，今日排程将自动取消';
        statusEl.style.color = '#ffc107';
    } else {
        statusEl.textContent = '✅ 风力正常';
        statusEl.style.color = '#28a745';
    }
}

function handleWindChange(level) {
    const descriptions = [
        '无风', '软风', '轻风', '微风', '和风', '清风',
        '强风', '疾风', '大风', '烈风', '狂风', '暴风', '飓风'
    ];

    FountainData.setWeather({
        windLevel: level,
        description: descriptions[level] || '未知'
    });

    showAlert('天气状态已更新', level >= FountainData.WIND_THRESHOLD ? 'warning' : 'success');
    refreshAllData();
}

function handleAddSchedule() {
    const date = document.getElementById('scheduleDate').value;
    const startTime = document.getElementById('scheduleStartTime').value;
    const endTime = document.getElementById('scheduleEndTime').value;

    if (startTime >= endTime) {
        showAlert('结束时间必须晚于开始时间', 'danger');
        return;
    }

    try {
        FountainData.addSchedule({
            date: date,
            startTime: startTime,
            endTime: endTime
        });

        showAlert('排程添加成功', 'success');
        document.getElementById('addScheduleForm').reset();
        document.getElementById('scheduleDate').value = FountainData.formatDate(new Date());
        switchTab('today');
        refreshAllData();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

function handleEditSchedule() {
    const id = document.getElementById('editScheduleId').value;
    const date = document.getElementById('editScheduleDate').value;
    const startTime = document.getElementById('editScheduleStartTime').value;
    const endTime = document.getElementById('editScheduleEndTime').value;

    if (startTime >= endTime) {
        showAlert('结束时间必须晚于开始时间', 'danger');
        return;
    }

    try {
        FountainData.updateSchedule(id, {
            date: date,
            startTime: startTime,
            endTime: endTime
        });

        showAlert('排程更新成功', 'success');
        closeEditModal();
        refreshAllData();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

function refreshAllData() {
    renderTodaySessions();
    renderFutureSessions();
    renderSystemStatus();
}

function renderTodaySessions() {
    const sessions = FountainData.getTodaySessions();
    const tbody = document.getElementById('todayTableBody');
    const emptyEl = document.getElementById('todayEmpty');

    if (sessions.length === 0) {
        tbody.innerHTML = '';
        emptyEl.style.display = 'block';
        return;
    }

    emptyEl.style.display = 'none';
    tbody.innerHTML = sessions.map(s => renderScheduleRow(s, true)).join('');
}

function renderFutureSessions() {
    const today = FountainData.formatDate(new Date());
    const allSessions = FountainData.getFutureSessions();
    const sessions = allSessions.filter(s => s.date > today);
    const tbody = document.getElementById('futureTableBody');
    const emptyEl = document.getElementById('futureEmpty');

    if (sessions.length === 0) {
        tbody.innerHTML = '';
        emptyEl.style.display = 'block';
        return;
    }

    emptyEl.style.display = 'none';
    tbody.innerHTML = sessions.map(s => renderScheduleRow(s, false)).join('');
}

function renderScheduleRow(schedule, isToday) {
    const statusBadge = getStatusBadge(schedule);
    const canModify = FountainData.canModifySchedule(schedule);
    const isEnded = FountainData.isSessionEnded(schedule);
    const isOngoing = FountainData.isSessionOngoing(schedule);

    let actions = '';

    if (isEnded) {
        actions = '<span class="badge badge-secondary">已结束</span>';
    } else if (!canModify.can) {
        actions = `<span class="badge badge-warning" title="${canModify.reason}">${canModify.reason}</span>`;
    } else {
        actions = `
            <button class="btn btn-sm btn-primary" onclick="openEditModal('${schedule.id}')" style="margin-right: 5px;">编辑</button>
            ${schedule.status === 'scheduled'
                ? `<button class="btn btn-sm btn-warning" onclick="handleCancel('${schedule.id}')" style="margin-right: 5px;">取消</button>`
                : `<button class="btn btn-sm btn-success" onclick="handleRestore('${schedule.id}')" style="margin-right: 5px;">恢复</button>`
            }
            <button class="btn btn-sm btn-danger" onclick="handleDelete('${schedule.id}')">删除</button>
        `;
    }

    if (isToday) {
        return `
            <tr class="${isOngoing ? 'table-warning' : ''}">
                <td>${schedule.startTime}</td>
                <td>${schedule.endTime}</td>
                <td>${statusBadge}</td>
                <td>${schedule.cancelReason || '-'}</td>
                <td>${actions}</td>
            </tr>
        `;
    }

    return `
        <tr>
            <td>${schedule.date}</td>
            <td>${schedule.startTime}</td>
            <td>${schedule.endTime}</td>
            <td>${statusBadge}</td>
            <td>${schedule.cancelReason || '-'}</td>
            <td>${actions}</td>
        </tr>
    `;
}

function getStatusBadge(schedule) {
    if (schedule.status === 'cancelled') {
        return '<span class="badge badge-danger">已取消</span>';
    }

    if (FountainData.isSessionEnded(schedule)) {
        return '<span class="badge badge-secondary">已结束</span>';
    }

    if (FountainData.isSessionOngoing(schedule)) {
        return '<span class="badge badge-warning">进行中</span>';
    }

    return '<span class="badge badge-success">计划中</span>';
}

function renderSystemStatus() {
    const status = FountainData.getPublicStatus();

    document.getElementById('deviceStatus').textContent =
        status.deviceState.status === 'normal' ? '✅ 正常运行' : '⚠️ ' + status.deviceState.description;
    document.getElementById('deviceStatus').className = 'status-value ' +
        (status.deviceState.status === 'normal' ? 'status-normal' : 'status-warning');

    document.getElementById('weatherStatus').textContent =
        status.weather.isWindy ? '🌬️ 大风' : '☀️ ' + status.weather.description;
    document.getElementById('weatherStatus').className = 'status-value ' +
        (status.weather.isWindy ? 'status-warning' : 'status-normal');

    document.getElementById('canOpen').textContent = status.canOpen ? '✅ 可以开放' : '❌ 暂不能开放';
    document.getElementById('canOpen').className = 'status-value ' +
        (status.canOpen ? 'status-normal' : 'status-warning');

    document.getElementById('lastUpdate').textContent =
        new Date(status.lastUpdate).toLocaleString('zh-CN');
}

function openEditModal(id) {
    const schedules = FountainData.getSchedules();
    const schedule = schedules.find(s => s.id === id);
    if (!schedule) return;

    document.getElementById('editScheduleId').value = schedule.id;
    document.getElementById('editScheduleDate').value = schedule.date;
    document.getElementById('editScheduleStartTime').value = schedule.startTime;
    document.getElementById('editScheduleEndTime').value = schedule.endTime;
    document.getElementById('editScheduleDate').min = FountainData.formatDate(new Date());

    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    editingScheduleId = null;
}

function handleCancel(id) {
    if (!confirm('确定要取消此排程吗？')) return;

    try {
        FountainData.cancelSchedule(id, '手动取消');
        showAlert('排程已取消', 'success');
        refreshAllData();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

function handleRestore(id) {
    if (!confirm('确定要恢复此排程吗？')) return;

    try {
        FountainData.restoreSchedule(id);
        showAlert('排程已恢复', 'success');
        refreshAllData();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

function handleDelete(id) {
    if (!confirm('确定要删除此排程吗？此操作不可恢复。')) return;

    try {
        FountainData.deleteSchedule(id);
        showAlert('排程已删除', 'success');
        refreshAllData();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

function showAlert(message, type = 'info') {
    const container = document.getElementById('alertContainer');
    const alertHtml = `
        <div class="alert alert-${type}">
            ${message}
        </div>
    `;
    container.innerHTML = alertHtml;

    setTimeout(() => {
        container.innerHTML = '';
    }, 3000);
}
