document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    refreshAllData();
});

function setupEventListeners() {
    document.getElementById('deviceStateForm').addEventListener('submit', function(e) {
        e.preventDefault();
        handleDeviceStateChange();
    });

    document.getElementById('deviceStatus').addEventListener('change', function() {
        updateDescriptionPlaceholder();
        autoGenerateNotice();
    });

    document.getElementById('description').addEventListener('input', function() {
        autoGenerateNotice();
    });

    document.getElementById('abnormalForm').addEventListener('submit', function(e) {
        e.preventDefault();
        handleAbnormalSave();
    });
}

function updateDescriptionPlaceholder() {
    const status = document.getElementById('deviceStatus').value;
    const descriptionInput = document.getElementById('description');

    const placeholders = {
        'normal': '设备已修复，恢复正常运行',
        'maintenance': '计划维护内容、预计完成时间等',
        'fault': '故障现象、可能原因、影响范围等'
    };

    descriptionInput.placeholder = placeholders[status] || '请输入详细说明';
}

function autoGenerateNotice() {
    const status = document.getElementById('deviceStatus').value;
    const description = document.getElementById('description').value.trim();

    let notice = '';
    let tip = '';

    if (status === 'maintenance') {
        notice = description ? `设备维护中：${description}` : '设备维护中，喷泉暂不开放';
        tip = '因设备维护，今日开放时间可能调整，请以现场公告为准';
    } else if (status === 'fault') {
        notice = description ? `设备故障：${description}` : '设备故障，喷泉暂不开放';
        tip = '因设备故障，今日开放时间可能调整，请以现场公告为准';
    } else {
        notice = '';
        tip = '';
    }

    document.getElementById('publicNotice').value = notice;
    document.getElementById('visitorTip').value = tip;
}

function resetNoticeFields() {
    autoGenerateNotice();
}

function handleDeviceStateChange() {
    const status = document.getElementById('deviceStatus').value;
    const operator = document.getElementById('operator').value.trim();
    const description = document.getElementById('description').value.trim();
    const publicNotice = document.getElementById('publicNotice').value.trim();
    const visitorTip = document.getElementById('visitorTip').value.trim();

    if (!operator) {
        showAlert('请输入操作员姓名', 'danger');
        return;
    }

    if (!description) {
        showAlert('请输入状态说明', 'danger');
        return;
    }

    try {
        FountainData.setDeviceState({
            status: status,
            description: description,
            operator: operator,
            publicNotice: publicNotice,
            visitorTip: visitorTip
        });

        FountainData.addMaintenanceLog({
            status: status,
            operator: operator,
            description: description
        });

        showAlert(getSuccessMessage(status), 'success');
        document.getElementById('deviceStateForm').reset();
        updateDescriptionPlaceholder();
        refreshAllData();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

function getSuccessMessage(status) {
    const messages = {
        'normal': '设备状态已更新为正常运行，排程已自动恢复，公示信息已同步',
        'maintenance': '设备已标记为维护中，相关排程已自动取消，公示信息已同步',
        'fault': '设备故障状态已登记，相关排程已自动取消，公示信息已同步'
    };
    return messages[status] || '状态更新成功';
}

function refreshAllData() {
    renderCurrentDeviceState();
    renderPublicNotice();
    renderEndedSessions();
    renderMaintenanceLogs();
    renderSystemStatus();
}

function renderCurrentDeviceState() {
    const state = FountainData.getDeviceState();
    const container = document.getElementById('currentDeviceState');

    const statusColors = {
        'normal': 'badge-success',
        'maintenance': 'badge-warning',
        'fault': 'badge-danger'
    };

    const statusTexts = {
        'normal': '✅ 正常运行',
        'maintenance': '🔧 维护中',
        'fault': '⚠️ 故障'
    };

    container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
            <span class="badge ${statusColors[state.status]}" style="font-size: 16px; padding: 8px 20px;">
                ${statusTexts[state.status]}
            </span>
            <span style="color: #666;">${state.description}</span>
        </div>
        <div style="margin-top: 10px; font-size: 14px; color: #999;">
            最后更新：${new Date(state.lastUpdate).toLocaleString('zh-CN')} | 操作员：${state.operator}
        </div>
    `;

    document.getElementById('deviceStatus').value = state.status;
    updateDescriptionPlaceholder();

    document.getElementById('publicNotice').value = state.publicNotice || '';
    document.getElementById('visitorTip').value = state.visitorTip || '';
}

function renderPublicNotice() {
    const state = FountainData.getDeviceState();

    document.getElementById('publicNoticeText').textContent = state.publicNotice || '设备正常开放';
    document.getElementById('visitorTipText').textContent = state.visitorTip || '暂无特殊提示';

    const syncStatus = document.getElementById('syncStatus');
    if (state.status === 'normal' && !state.publicNotice) {
        syncStatus.textContent = '正常开放';
        syncStatus.className = 'badge badge-success';
    } else if (state.status !== 'normal' && state.publicNotice) {
        syncStatus.textContent = '已同步更新';
        syncStatus.className = 'badge badge-warning';
    } else {
        syncStatus.textContent = '已同步';
        syncStatus.className = 'badge badge-info';
    }
}

function renderEndedSessions() {
    const sessions = FountainData.getTodaySessions();
    const endedSessions = sessions.filter(s => FountainData.isSessionEnded(s));
    const tbody = document.getElementById('endedSessionsBody');
    const emptyEl = document.getElementById('endedSessionsEmpty');
    const statsEl = document.getElementById('endedSessionsStats');

    if (endedSessions.length === 0) {
        tbody.innerHTML = '';
        emptyEl.style.display = 'block';
        statsEl.style.display = 'none';
        return;
    }

    emptyEl.style.display = 'none';
    statsEl.style.display = 'block';

    const totalEnded = endedSessions.length;
    const cancelledCount = endedSessions.filter(s => s.status === 'cancelled').length;
    const normalEnded = totalEnded - cancelledCount;
    const hasAbnormal = endedSessions.filter(s => s.abnormalReason).length;

    statsEl.innerHTML = `
        <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div>
                <span style="color: #666;">已结束场次：</span>
                <strong>${totalEnded}</strong> 场
            </div>
            <div>
                <span style="color: #666;">正常结束：</span>
                <strong class="status-normal">${normalEnded}</strong> 场
            </div>
            <div>
                <span style="color: #666;">取消场次：</span>
                <strong class="status-warning">${cancelledCount}</strong> 场
            </div>
            <div>
                <span style="color: #666;">有异常备注：</span>
                <strong class="status-warning">${hasAbnormal}</strong> 场
            </div>
        </div>
    `;

    tbody.innerHTML = endedSessions.map(session => {
        const statusColors = {
            'scheduled': 'badge-secondary',
            'cancelled': 'badge-danger'
        };

        const statusTexts = {
            'scheduled': '已结束',
            'cancelled': '已取消'
        };

        const adjustTypeTexts = {
            'delay_open': '延后开放',
            'early_close': '提前结束',
            'extend_open': '延长开放',
            'advance_open': '提前开放'
        };

        let reasonText = '';
        if (session.status === 'cancelled') {
            reasonText = session.cancelReason || '-';
        } else if (session.adjustType) {
            reasonText = adjustTypeTexts[session.adjustType] + (session.adjustReason ? `：${session.adjustReason}` : '');
        }

        return `
            <tr>
                <td>${session.originalStartTime} - ${session.originalEndTime}</td>
                <td>${session.startTime} - ${session.endTime}</td>
                <td><span class="badge ${statusColors[session.status]}">${statusTexts[session.status]}</span></td>
                <td>${reasonText || '-'}</td>
                <td>${session.abnormalReason || '<span style="color: #999;">暂无</span>'}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="openAbnormalModal('${session.id}')">
                        ${session.abnormalReason ? '修改备注' : '补录异常'}
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function openAbnormalModal(sessionId) {
    const sessions = FountainData.getTodaySessions();
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    document.getElementById('abnormalSessionId').value = sessionId;
    document.getElementById('abnormalSessionTime').textContent = 
        `${session.originalStartTime} - ${session.originalEndTime}（实际：${session.startTime} - ${session.endTime}）`;
    document.getElementById('abnormalReason').value = session.abnormalReason || '';
    document.getElementById('abnormalOperator').value = '';

    document.getElementById('abnormalModal').style.display = 'flex';
}

function closeAbnormalModal() {
    document.getElementById('abnormalModal').style.display = 'none';
}

function handleAbnormalSave() {
    const sessionId = document.getElementById('abnormalSessionId').value;
    const reason = document.getElementById('abnormalReason').value.trim();
    const operator = document.getElementById('abnormalOperator').value.trim() || '维修员';

    if (!reason) {
        showAlert('请输入异常原因', 'danger');
        return;
    }

    try {
        FountainData.addAbnormalReason(sessionId, reason, operator);
        showAlert('异常原因已保存', 'success');
        closeAbnormalModal();
        refreshAllData();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

function renderMaintenanceLogs() {
    const logs = FountainData.getMaintenanceLogs();
    const tbody = document.getElementById('logsTableBody');
    const emptyEl = document.getElementById('logsEmpty');
    const statsEl = document.getElementById('maintenanceStats');

    if (logs.length === 0) {
        tbody.innerHTML = '';
        emptyEl.style.display = 'block';
        statsEl.style.display = 'none';
        return;
    }

    emptyEl.style.display = 'none';
    statsEl.style.display = 'block';

    const totalRecords = logs.length;
    const maintenanceCount = logs.filter(l => l.status === 'maintenance').length;
    const faultCount = logs.filter(l => l.status === 'fault').length;
    const normalCount = logs.filter(l => l.status === 'normal').length;

    statsEl.innerHTML = `
        <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div>
                <span style="color: #666;">总记录数：</span>
                <strong>${totalRecords}</strong> 条
            </div>
            <div>
                <span style="color: #666;">维护次数：</span>
                <strong class="status-warning">${maintenanceCount}</strong> 次
            </div>
            <div>
                <span style="color: #666;">故障次数：</span>
                <strong class="status-warning">${faultCount}</strong> 次
            </div>
            <div>
                <span style="color: #666;">修复恢复：</span>
                <strong class="status-normal">${normalCount}</strong> 次
            </div>
        </div>
    `;

    tbody.innerHTML = logs.map(log => {
        const statusColors = {
            'normal': 'badge-success',
            'maintenance': 'badge-warning',
            'fault': 'badge-danger'
        };

        const statusTexts = {
            'normal': '正常运行',
            'maintenance': '维护中',
            'fault': '故障'
        };

        return `
            <tr>
                <td>${new Date(log.createdAt).toLocaleString('zh-CN')}</td>
                <td>${log.operator}</td>
                <td><span class="badge ${statusColors[log.status]}">${statusTexts[log.status]}</span></td>
                <td>${log.description}</td>
            </tr>
        `;
    }).join('');
}

function renderSystemStatus() {
    const status = FountainData.getPublicStatus();

    document.getElementById('systemDeviceStatus').textContent =
        status.deviceState.status === 'normal' ? '✅ 正常运行' : '⚠️ ' + status.deviceState.description;
    document.getElementById('systemDeviceStatus').className = 'status-value ' +
        (status.deviceState.status === 'normal' ? 'status-normal' : 'status-warning');

    document.getElementById('systemWeatherStatus').textContent =
        status.weather.isWindy ? '🌬️ 大风' : '☀️ ' + status.weather.description;
    document.getElementById('systemWeatherStatus').className = 'status-value ' +
        (status.weather.isWindy ? 'status-warning' : 'status-normal');

    const cancelledCount = status.sessions.filter(s => s.status === 'cancelled').length;
    document.getElementById('cancelledCount').textContent = cancelledCount + ' 场';
    document.getElementById('cancelledCount').className = 'status-value ' +
        (cancelledCount > 0 ? 'status-warning' : 'status-normal');

    const endedCount = status.sessions.filter(s => s.isEnded).length;
    document.getElementById('endedCount').textContent = endedCount + ' 场';
    document.getElementById('endedCount').className = 'status-value status-normal';

    const festival = status.festival;
    document.getElementById('festivalStatus').textContent = festival ? '🎉 ' + festival.name : '无';
    document.getElementById('festivalStatus').className = 'status-value ' +
        (festival ? 'status-warning' : 'status-normal');

    document.getElementById('lastUpdate').textContent =
        new Date(status.lastUpdate).toLocaleString('zh-CN');
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
