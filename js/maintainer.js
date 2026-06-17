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

function handleDeviceStateChange() {
    const status = document.getElementById('deviceStatus').value;
    const operator = document.getElementById('operator').value.trim();
    const description = document.getElementById('description').value.trim();

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
            operator: operator
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
        'normal': '设备状态已更新为正常运行，排程已自动恢复',
        'maintenance': '设备已标记为维护中，相关排程已自动取消',
        'fault': '设备故障状态已登记'
    };
    return messages[status] || '状态更新成功';
}

function refreshAllData() {
    renderCurrentDeviceState();
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
