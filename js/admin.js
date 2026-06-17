let editingScheduleId = null;
let editingFestivalId = null;
let editingEventId = null;

document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupEventListeners();
    refreshAllData();
});

function initializePage() {
    const todayStr = new Date().toLocaleDateString('zh-CN');
    document.getElementById('todayDate').textContent = todayStr;
    document.getElementById('todayDateTag').textContent = todayStr;

    const today = FountainData.formatDate(new Date());
    document.getElementById('scheduleDate').min = today;
    document.getElementById('scheduleDate').value = today;
    document.getElementById('festivalDate').min = today;
    document.getElementById('eventDate').min = today;

    const weather = FountainData.getWeather();
    document.getElementById('windLevel').value = weather.windLevel;
    updateWindDisplay(weather.windLevel);

    const energyConfig = FountainData.getEnergyConfig();
    document.getElementById('energySavingMode').checked = energyConfig.energySavingMode;
    document.getElementById('powerLimit').value = energyConfig.powerLimit;
    document.getElementById('peakHours').value = energyConfig.peakHours.join(',');
    updateEnergySavingStatus();

    const notices = FountainData.getVisitorNotices();
    document.getElementById('mainNotice').value = notices.mainNotice || '';
    document.getElementById('safetyTips').value = notices.safetyTips || '';
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

    document.getElementById('energySavingMode').addEventListener('change', function() {
        updateEnergySavingStatus();
    });

    document.getElementById('addScheduleForm').addEventListener('submit', function(e) {
        e.preventDefault();
        handleAddSchedule();
    });

    document.getElementById('editScheduleForm').addEventListener('submit', function(e) {
        e.preventDefault();
        handleEditSchedule();
    });

    document.getElementById('adjustForm').addEventListener('submit', function(e) {
        e.preventDefault();
        handleAdjustSchedule();
    });

    document.getElementById('festivalForm').addEventListener('submit', function(e) {
        e.preventDefault();
        handleFestivalSave();
    });

    document.getElementById('eventForm').addEventListener('submit', function(e) {
        e.preventDefault();
        handleEventSave();
    });

    document.getElementById('energyConfigForm').addEventListener('submit', function(e) {
        e.preventDefault();
        handleEnergyConfigSave();
    });

    document.getElementById('noticeForm').addEventListener('submit', function(e) {
        e.preventDefault();
        handleNoticeSave();
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');

    if (tabName === 'festivals') {
        renderFestivals();
    } else if (tabName === 'events') {
        renderEvents();
    }
}

function updateWindDisplay(level) {
    document.getElementById('windLevelDisplay').textContent = level + ' 级';

    const statusEl = document.getElementById('windStatus');
    if (level >= FountainData.HEAVY_WIND_THRESHOLD) {
        statusEl.textContent = '⚠️ 强风天气，建议所有场次提前结束';
        statusEl.style.color = '#ffc107';
    } else if (level >= FountainData.WIND_THRESHOLD) {
        statusEl.textContent = '⚠️ 大风天气，今日排程受影响';
        statusEl.style.color = '#ffc107';
    } else {
        statusEl.textContent = '✅ 风力正常';
        statusEl.style.color = '#28a745';
    }
}

function updateEnergySavingStatus() {
    const isOn = document.getElementById('energySavingMode').checked;
    document.getElementById('energySavingStatus').textContent = isOn ? '已开启' : '未开启';
    document.getElementById('energySavingStatus').style.color = isOn ? '#28a745' : '#666';
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

function openAdjustModal(id) {
    document.getElementById('adjustScheduleId').value = id;
    document.getElementById('adjustType').value = 'delay_open';
    document.getElementById('adjustReason').value = '天气原因';
    document.getElementById('adjustDescription').value = '';
    document.getElementById('adjustModal').style.display = 'flex';
}

function closeAdjustModal() {
    document.getElementById('adjustModal').style.display = 'none';
}

function handleAdjustSchedule() {
    const id = document.getElementById('adjustScheduleId').value;
    const adjustType = document.getElementById('adjustType').value;
    const adjustReason = document.getElementById('adjustReason').value;
    const adjustDescription = document.getElementById('adjustDescription').value;

    try {
        if (adjustType === 'reset') {
            FountainData.resetScheduleTime(id);
            showAlert('已恢复原定时间', 'success');
        } else {
            const fullReason = adjustDescription ? `${adjustReason}：${adjustDescription}` : adjustReason;
            FountainData.adjustScheduleTime(id, adjustType, fullReason);
            const typeNames = {
                'delay_open': '延后开放',
                'advance_open': '提前开放',
                'early_close': '提前结束',
                'extend_open': '延长开放'
            };
            showAlert(`已${typeNames[adjustType]}`, 'success');
        }

        closeAdjustModal();
        refreshAllData();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

function handleEnergyConfigSave() {
    const energySavingMode = document.getElementById('energySavingMode').checked;
    const powerLimit = parseInt(document.getElementById('powerLimit').value);
    const peakHoursStr = document.getElementById('peakHours').value;
    const peakHours = peakHoursStr.split(',').map(s => s.trim()).filter(s => s);

    try {
        FountainData.updateEnergyConfig({
            energySavingMode,
            powerLimit,
            peakHours
        });
        showAlert('能耗配置已保存', 'success');
        refreshAllData();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

function handleNoticeSave() {
    const mainNotice = document.getElementById('mainNotice').value.trim();
    const safetyTips = document.getElementById('safetyTips').value.trim();

    try {
        FountainData.updateVisitorNotices({
            mainNotice,
            safetyTips
        });
        showAlert('公告已保存', 'success');
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

function openFestivalModal(id) {
    editingFestivalId = id || null;
    document.getElementById('festivalModalTitle').textContent = id ? '编辑节庆活动' : '新增节庆活动';

    if (id) {
        const festivals = FountainData.getFestivals();
        const festival = festivals.find(f => f.id === id);
        if (festival) {
            document.getElementById('festivalId').value = festival.id;
            document.getElementById('festivalName').value = festival.name;
            document.getElementById('festivalDate').value = festival.date;
            document.getElementById('festivalCrowdLevel').value = festival.crowdLevel;
            document.getElementById('festivalDescription').value = festival.description || '';
        }
    } else {
        document.getElementById('festivalForm').reset();
        document.getElementById('festivalId').value = '';
        document.getElementById('festivalDate').value = FountainData.formatDate(new Date());
        document.getElementById('festivalCrowdLevel').value = 'high';
    }

    document.getElementById('festivalModal').style.display = 'flex';
}

function closeFestivalModal() {
    document.getElementById('festivalModal').style.display = 'none';
    editingFestivalId = null;
}

function handleFestivalSave() {
    const id = document.getElementById('festivalId').value;
    const name = document.getElementById('festivalName').value.trim();
    const date = document.getElementById('festivalDate').value;
    const crowdLevel = document.getElementById('festivalCrowdLevel').value;
    const description = document.getElementById('festivalDescription').value.trim();

    if (!name) {
        showAlert('请输入节庆名称', 'danger');
        return;
    }

    try {
        if (id) {
            FountainData.updateFestival(id, { name, date, crowdLevel, description });
            showAlert('节庆活动已更新', 'success');
        } else {
            FountainData.addFestival({ name, date, crowdLevel, description });
            showAlert('节庆活动已添加', 'success');
        }

        closeFestivalModal();
        renderFestivals();
        refreshAllData();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

function handleDeleteFestival(id) {
    if (!confirm('确定要删除这个节庆活动吗？')) return;

    try {
        FountainData.deleteFestival(id);
        showAlert('节庆活动已删除', 'success');
        renderFestivals();
        refreshAllData();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

function renderFestivals() {
    const festivals = FountainData.getFestivals();
    const tbody = document.getElementById('festivalsTableBody');
    const emptyEl = document.getElementById('festivalsEmpty');

    if (festivals.length === 0) {
        tbody.innerHTML = '';
        emptyEl.style.display = 'block';
        return;
    }

    emptyEl.style.display = 'none';
    const crowdColors = {
        'low': 'badge-success',
        'medium': 'badge-warning',
        'high': 'badge-danger'
    };
    const crowdTexts = {
        'low': '少',
        'medium': '中',
        'high': '多'
    };

    const today = FountainData.formatDate(new Date());
    tbody.innerHTML = festivals.map(f => `
        <tr class="${f.date === today ? 'table-info' : ''}">
            <td><strong>${f.name}</strong></td>
            <td>${f.date}</td>
            <td><span class="badge ${crowdColors[f.crowdLevel]}">${crowdTexts[f.crowdLevel]}</span></td>
            <td>${f.description || '-'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="openFestivalModal('${f.id}')" style="margin-right: 5px;">编辑</button>
                <button class="btn btn-sm btn-danger" onclick="handleDeleteFestival('${f.id}')">删除</button>
            </td>
        </tr>
    `).join('');
}

function openEventModal(id) {
    editingEventId = id || null;
    document.getElementById('eventModalTitle').textContent = id ? '编辑临时活动' : '新增临时活动';

    if (id) {
        const events = FountainData.getTempEvents();
        const event = events.find(e => e.id === id);
        if (event) {
            document.getElementById('eventId').value = event.id;
            document.getElementById('eventName').value = event.name;
            document.getElementById('eventDate').value = event.date;
            document.getElementById('eventCrowdLevel').value = event.crowdLevel || 'medium';
            document.getElementById('eventStartTime').value = event.startTime || '';
            document.getElementById('eventEndTime').value = event.endTime || '';
            document.getElementById('eventDescription').value = event.description || '';
        }
    } else {
        document.getElementById('eventForm').reset();
        document.getElementById('eventId').value = '';
        document.getElementById('eventDate').value = FountainData.formatDate(new Date());
        document.getElementById('eventCrowdLevel').value = 'medium';
    }

    document.getElementById('eventModal').style.display = 'flex';
}

function closeEventModal() {
    document.getElementById('eventModal').style.display = 'none';
    editingEventId = null;
}

function handleEventSave() {
    const id = document.getElementById('eventId').value;
    const name = document.getElementById('eventName').value.trim();
    const date = document.getElementById('eventDate').value;
    const crowdLevel = document.getElementById('eventCrowdLevel').value;
    const startTime = document.getElementById('eventStartTime').value;
    const endTime = document.getElementById('eventEndTime').value;
    const description = document.getElementById('eventDescription').value.trim();

    if (!name) {
        showAlert('请输入活动名称', 'danger');
        return;
    }

    try {
        if (id) {
            FountainData.updateTempEvent(id, { name, date, crowdLevel, startTime, endTime, description });
            showAlert('临时活动已更新', 'success');
        } else {
            FountainData.addTempEvent({ name, date, crowdLevel, startTime, endTime, description });
            showAlert('临时活动已添加', 'success');
        }

        closeEventModal();
        renderEvents();
        refreshAllData();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

function handleDeleteEvent(id) {
    if (!confirm('确定要删除这个临时活动吗？')) return;

    try {
        FountainData.deleteTempEvent(id);
        showAlert('临时活动已删除', 'success');
        renderEvents();
        refreshAllData();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

function renderEvents() {
    const events = FountainData.getTempEvents();
    const tbody = document.getElementById('eventsTableBody');
    const emptyEl = document.getElementById('eventsEmpty');

    if (events.length === 0) {
        tbody.innerHTML = '';
        emptyEl.style.display = 'block';
        return;
    }

    emptyEl.style.display = 'none';
    const crowdColors = {
        'low': 'badge-success',
        'medium': 'badge-warning',
        'high': 'badge-danger'
    };
    const crowdTexts = {
        'low': '少',
        'medium': '中',
        'high': '多'
    };

    const today = FountainData.formatDate(new Date());
    tbody.innerHTML = events.map(e => {
        const timeStr = (e.startTime && e.endTime) ? `${e.startTime} - ${e.endTime}` : (e.startTime || '-');
        return `
        <tr class="${e.date === today ? 'table-info' : ''}">
            <td><strong>${e.name}</strong></td>
            <td>${e.date}</td>
            <td>${timeStr}</td>
            <td><span class="badge ${crowdColors[e.crowdLevel]}">${crowdTexts[e.crowdLevel]}</span></td>
            <td>${e.description || '-'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="openEventModal('${e.id}')" style="margin-right: 5px;">编辑</button>
                <button class="btn btn-sm btn-danger" onclick="handleDeleteEvent('${e.id}')">删除</button>
            </td>
        </tr>
    `}).join('');
}

function renderSuggestions() {
    const suggestions = FountainData.getScheduleSuggestions();
    const container = document.getElementById('suggestionsList');
    const countEl = document.getElementById('suggestionCount');

    countEl.textContent = suggestions.length + ' 条建议';

    if (suggestions.length === 0) {
        container.innerHTML = '<div class="suggestion-empty">暂无特殊建议，按计划正常开放</div>';
        return;
    }

    container.innerHTML = suggestions.map(s => {
        const levelColors = {
            'danger': 'suggestion-danger',
            'warning': 'suggestion-warning',
            'info': 'suggestion-info'
        };
        const icons = {
            'weather': '🌬️',
            'festival': '🎊',
            'event': '🎪',
            'energy': '⚡',
            'device': '🔧'
        };

        let actionBtn = '';
        if (s.action === 'early_close' && s.affectedSessions && s.affectedSessions.length > 0) {
            actionBtn = `<button class="btn btn-sm btn-warning" onclick="applySuggestion('${s.action}')">一键应用</button>`;
        } else if (s.action === 'extend_open' && s.affectedSessions && s.affectedSessions.length > 0) {
            actionBtn = `<button class="btn btn-sm btn-success" onclick="applySuggestion('${s.action}')">一键应用</button>`;
        }

        return `
            <div class="suggestion-card ${levelColors[s.level]}">
                <div class="suggestion-header">
                    <span class="suggestion-icon">${icons[s.type] || '💡'}</span>
                    <span class="suggestion-title">${s.title}</span>
                </div>
                <div class="suggestion-desc">${s.description}</div>
                ${actionBtn ? `<div class="suggestion-action">${actionBtn}</div>` : ''}
            </div>
        `;
    }).join('');
}

function applySuggestion(action) {
    const suggestions = FountainData.getScheduleSuggestions();
    const suggestion = suggestions.find(s => s.action === action);
    if (!suggestion || !suggestion.affectedSessions) return;

    const reasonMap = {
        'early_close': '天气原因：大风预警，提前结束',
        'extend_open': '节庆活动：增加开放时间'
    };

    try {
        let successCount = 0;
        suggestion.affectedSessions.forEach(id => {
            try {
                if (action === 'early_close') {
                    FountainData.adjustScheduleTime(id, 'early_close', reasonMap[action]);
                } else if (action === 'extend_open') {
                    FountainData.adjustScheduleTime(id, 'extend_open', reasonMap[action]);
                }
                successCount++;
            } catch (e) {
            }
        });

        showAlert(`已应用 ${successCount} 场排程调整`, 'success');
        refreshAllData();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

function refreshAllData() {
    renderTodaySessions();
    renderFutureSessions();
    renderSuggestions();
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
    const hasAdjust = schedule.adjustType && schedule.startTime !== schedule.originalStartTime;

    const originalTime = `${schedule.originalStartTime} - ${schedule.originalEndTime}`;
    const adjustedTime = hasAdjust
        ? `${schedule.startTime} - ${schedule.endTime} <span class="badge badge-warning" style="margin-left:5px;">已调整</span>`
        : '<span style="color:#999;">无调整</span>';

    const reasonText = schedule.cancelReason || schedule.adjustReason || '-';
    const abnormalText = schedule.abnormalReason || '-';

    let actions = '';

    if (isEnded) {
        actions = `
            <span class="badge badge-secondary">已结束</span>
        `;
    } else if (!canModify.can) {
        actions = `<span class="badge badge-warning" title="${canModify.reason}">${canModify.reason}</span>`;
    } else {
        actions = `
            <div class="action-buttons">
                <button class="btn btn-sm btn-info" onclick="openAdjustModal('${schedule.id}')" style="margin-right: 3px;" title="调整时间">⏰</button>
                <button class="btn btn-sm btn-primary" onclick="openEditModal('${schedule.id}')" style="margin-right: 3px;" title="编辑">✏️</button>
                ${schedule.status === 'scheduled'
                    ? `<button class="btn btn-sm btn-warning" onclick="handleCancel('${schedule.id}')" style="margin-right: 3px;" title="取消">🚫</button>`
                    : `<button class="btn btn-sm btn-success" onclick="handleRestore('${schedule.id}')" style="margin-right: 3px;" title="恢复">↩️</button>`
                }
                <button class="btn btn-sm btn-danger" onclick="handleDelete('${schedule.id}')" title="删除">🗑️</button>
            </div>
        `;
    }

    if (isToday) {
        return `
            <tr class="${isOngoing ? 'table-warning' : ''}">
                <td>${originalTime}</td>
                <td>${adjustedTime}</td>
                <td>${statusBadge}</td>
                <td>${reasonText}</td>
                <td>${abnormalText}</td>
                <td>${actions}</td>
            </tr>
        `;
    }

    return `
        <tr>
            <td>${schedule.date}</td>
            <td>${originalTime}</td>
            <td>${adjustedTime}</td>
            <td>${statusBadge}</td>
            <td>${reasonText}</td>
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

    if (schedule.adjustType) {
        return '<span class="badge badge-info">已调整</span>';
    }

    return '<span class="badge badge-success">计划中</span>';
}

function renderSystemStatus() {
    const status = FountainData.getPublicStatus();

    document.getElementById('todayDateTag').textContent = new Date().toLocaleDateString('zh-CN');
    document.getElementById('todayDateTag').className = 'status-value status-normal';

    document.getElementById('deviceStatus').textContent =
        status.deviceState.status === 'normal' ? '✅ 正常运行' : '⚠️ ' + status.deviceState.description;
    document.getElementById('deviceStatus').className = 'status-value ' +
        (status.deviceState.status === 'normal' ? 'status-normal' : 'status-warning');

    document.getElementById('weatherStatus').textContent =
        status.weather.isWindy ? '🌬️ 大风' : '☀️ ' + status.weather.description;
    document.getElementById('weatherStatus').className = 'status-value ' +
        (status.weather.isWindy ? 'status-warning' : 'status-normal');

    document.getElementById('sessionStats').textContent =
        `${status.activeCount} 场正常 / ${status.cancelledCount} 场取消`;
    document.getElementById('sessionStats').className = 'status-value ' +
        (status.cancelledCount > 0 ? 'status-warning' : 'status-normal');

    document.getElementById('canOpen').textContent = status.canOpen ? '✅ 可以开放' : '❌ 暂不能开放';
    document.getElementById('canOpen').className = 'status-value ' +
        (status.canOpen ? 'status-normal' : 'status-warning');

    const festival = status.festival;
    document.getElementById('festivalStatus').textContent = festival ? `🎊 ${festival.name}` : '无活动';
    document.getElementById('festivalStatus').className = 'status-value ' +
        (festival ? 'status-normal' : '');

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
