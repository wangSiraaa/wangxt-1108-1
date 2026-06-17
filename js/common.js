const FountainData = (function() {
    const STORAGE_KEYS = {
        SCHEDULES: 'fountain_schedules',
        DEVICE_STATE: 'fountain_device_state',
        WEATHER: 'fountain_weather',
        MAINTENANCE_LOGS: 'fountain_maintenance_logs',
        FESTIVALS: 'fountain_festivals',
        TEMP_EVENTS: 'fountain_temp_events',
        VISITOR_NOTICES: 'fountain_visitor_notices',
        ENERGY_CONFIG: 'fountain_energy_config',
        ABNORMAL_RECORDS: 'fountain_abnormal_records'
    };

    const WIND_THRESHOLD = 6;
    const HEAVY_WIND_THRESHOLD = 8;
    const HOLIDAY_CROWD_THRESHOLD = 'high';

    function initDefaultData() {
        if (!localStorage.getItem(STORAGE_KEYS.DEVICE_STATE)) {
            localStorage.setItem(STORAGE_KEYS.DEVICE_STATE, JSON.stringify({
                status: 'normal',
                description: '设备运行正常',
                lastUpdate: new Date().toISOString(),
                operator: '系统初始化',
                publicNotice: '',
                visitorTip: ''
            }));
        }

        if (!localStorage.getItem(STORAGE_KEYS.WEATHER)) {
            localStorage.setItem(STORAGE_KEYS.WEATHER, JSON.stringify({
                windLevel: 3,
                description: '微风',
                isWindy: false,
                temperature: 25,
                lastUpdate: new Date().toISOString()
            }));
        }

        if (!localStorage.getItem(STORAGE_KEYS.SCHEDULES)) {
            const today = new Date();
            const dateStr = formatDate(today);
            const defaultSchedules = [
                {
                    id: generateId(),
                    date: dateStr,
                    startTime: '09:00',
                    endTime: '10:00',
                    status: 'scheduled',
                    cancelReason: null,
                    abnormalReason: '',
                    originalStartTime: '09:00',
                    originalEndTime: '10:00',
                    adjustType: null,
                    adjustReason: null,
                    createdAt: new Date().toISOString()
                },
                {
                    id: generateId(),
                    date: dateStr,
                    startTime: '15:00',
                    endTime: '16:00',
                    status: 'scheduled',
                    cancelReason: null,
                    abnormalReason: '',
                    originalStartTime: '15:00',
                    originalEndTime: '16:00',
                    adjustType: null,
                    adjustReason: null,
                    createdAt: new Date().toISOString()
                },
                {
                    id: generateId(),
                    date: dateStr,
                    startTime: '19:00',
                    endTime: '20:30',
                    status: 'scheduled',
                    cancelReason: null,
                    abnormalReason: '',
                    originalStartTime: '19:00',
                    originalEndTime: '20:30',
                    adjustType: null,
                    adjustReason: null,
                    createdAt: new Date().toISOString()
                }
            ];
            localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(defaultSchedules));
        }

        if (!localStorage.getItem(STORAGE_KEYS.MAINTENANCE_LOGS)) {
            localStorage.setItem(STORAGE_KEYS.MAINTENANCE_LOGS, JSON.stringify([]));
        }

        if (!localStorage.getItem(STORAGE_KEYS.FESTIVALS)) {
            const today = new Date();
            const defaultFestivals = [];
            const holidayNames = ['元旦', '春节', '清明节', '劳动节', '端午节', '中秋节', '国庆节'];
            for (let i = 0; i < 3; i++) {
                const d = new Date(today);
                d.setDate(today.getDate() + i * 30);
                defaultFestivals.push({
                    id: generateId(),
                    name: holidayNames[i % holidayNames.length],
                    date: formatDate(d),
                    crowdLevel: 'high',
                    description: holidayNames[i % holidayNames.length] + '假期，预计人流量大',
                    createdAt: new Date().toISOString()
                });
            }
            localStorage.setItem(STORAGE_KEYS.FESTIVALS, JSON.stringify(defaultFestivals));
        }

        if (!localStorage.getItem(STORAGE_KEYS.TEMP_EVENTS)) {
            localStorage.setItem(STORAGE_KEYS.TEMP_EVENTS, JSON.stringify([]));
        }

        if (!localStorage.getItem(STORAGE_KEYS.VISITOR_NOTICES)) {
            localStorage.setItem(STORAGE_KEYS.VISITOR_NOTICES, JSON.stringify({
                mainNotice: '',
                safetyTips: '喷泉开放期间请注意安全，请勿靠近喷泉区域。',
                lastUpdate: new Date().toISOString()
            }));
        }

        if (!localStorage.getItem(STORAGE_KEYS.ENERGY_CONFIG)) {
            localStorage.setItem(STORAGE_KEYS.ENERGY_CONFIG, JSON.stringify({
                energySavingMode: false,
                peakHours: ['12:00-14:00', '18:00-20:00'],
                powerLimit: 100,
                lastUpdate: new Date().toISOString()
            }));
        }

        if (!localStorage.getItem(STORAGE_KEYS.ABNORMAL_RECORDS)) {
            localStorage.setItem(STORAGE_KEYS.ABNORMAL_RECORDS, JSON.stringify([]));
        }
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function getCurrentTime() {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }

    function isSessionEnded(schedule) {
        const now = new Date();
        const today = formatDate(now);
        const currentTime = getCurrentTime();

        if (schedule.date < today) {
            return true;
        }
        if (schedule.date === today && schedule.endTime <= currentTime) {
            return true;
        }
        return false;
    }

    function isSessionOngoing(schedule) {
        const now = new Date();
        const today = formatDate(now);
        const currentTime = getCurrentTime();

        return schedule.date === today &&
               schedule.startTime <= currentTime &&
               schedule.endTime > currentTime &&
               schedule.status !== 'cancelled';
    }

    function isSessionUpcoming(schedule) {
        const now = new Date();
        const today = formatDate(now);
        const currentTime = getCurrentTime();
        const oneHourLater = addMinutesToTime(currentTime, 60);

        return schedule.date === today &&
               schedule.startTime > currentTime &&
               schedule.startTime <= oneHourLater &&
               schedule.status !== 'cancelled';
    }

    function addMinutesToTime(time, minutes) {
        const [h, m] = time.split(':').map(Number);
        const totalMinutes = h * 60 + m + minutes;
        const newH = Math.floor(totalMinutes / 60) % 24;
        const newM = totalMinutes % 60;
        return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    }

    function getMinutesDiff(time1, time2) {
        const [h1, m1] = time1.split(':').map(Number);
        const [h2, m2] = time2.split(':').map(Number);
        return (h2 * 60 + m2) - (h1 * 60 + m1);
    }

    function getDeviceState() {
        initDefaultData();
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.DEVICE_STATE));
    }

    function setDeviceState(state) {
        const currentState = getDeviceState();
        const newState = {
            ...currentState,
            ...state,
            lastUpdate: new Date().toISOString()
        };

        if (state.status === 'maintenance' || state.status === 'fault') {
            newState.publicNotice = state.publicNotice || `设备${state.status === 'maintenance' ? '维护' : '故障'}中，喷泉暂不开放`;
            newState.visitorTip = state.visitorTip || `因设备${state.status === 'maintenance' ? '维护' : '故障'}，今日开放时间可能调整，请以现场公告为准`;
        } else if (state.status === 'normal') {
            newState.publicNotice = state.publicNotice || '';
            newState.visitorTip = state.visitorTip || '';
        }

        localStorage.setItem(STORAGE_KEYS.DEVICE_STATE, JSON.stringify(newState));

        if (state.status === 'maintenance') {
            cancelSessionsForMaintenance();
        } else if (state.status === 'fault') {
            cancelSessionsForFault();
        } else if (state.status === 'normal') {
            restoreCancelledSessions();
        }

        return newState;
    }

    function updatePublicNotice(notice, tip) {
        const state = getDeviceState();
        const newState = {
            ...state,
            publicNotice: notice || state.publicNotice,
            visitorTip: tip || state.visitorTip,
            lastUpdate: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEYS.DEVICE_STATE, JSON.stringify(newState));
        return newState;
    }

    function getWeather() {
        initDefaultData();
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.WEATHER));
    }

    function setWeather(weather) {
        const currentWeather = getWeather();
        const newWeather = {
            ...currentWeather,
            ...weather,
            isWindy: weather.windLevel >= WIND_THRESHOLD,
            lastUpdate: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEYS.WEATHER, JSON.stringify(newWeather));

        if (newWeather.isWindy) {
            cancelSessionsForWeather();
        } else {
            restoreWeatherCancelledSessions();
        }

        return newWeather;
    }

    function getSchedules() {
        initDefaultData();
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHEDULES));
    }

    function getTodaySessions() {
        const today = formatDate(new Date());
        const schedules = getSchedules();
        return schedules
            .filter(s => s.date === today)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }

    function getFutureSessions() {
        const today = formatDate(new Date());
        const schedules = getSchedules();
        return schedules
            .filter(s => s.date >= today)
            .sort((a, b) => {
                if (a.date !== b.date) return a.date.localeCompare(b.date);
                return a.startTime.localeCompare(b.startTime);
            });
    }

    function addSchedule(schedule) {
        const schedules = getSchedules();
        const deviceState = getDeviceState();
        const weather = getWeather();

        const newSchedule = {
            id: generateId(),
            ...schedule,
            status: 'scheduled',
            cancelReason: null,
            abnormalReason: '',
            originalStartTime: schedule.startTime,
            originalEndTime: schedule.endTime,
            adjustType: null,
            adjustReason: null,
            createdAt: new Date().toISOString()
        };

        if (deviceState.status === 'maintenance') {
            newSchedule.status = 'cancelled';
            newSchedule.cancelReason = '设备维护中';
        } else if (deviceState.status === 'fault') {
            newSchedule.status = 'cancelled';
            newSchedule.cancelReason = '设备故障';
        } else if (weather.isWindy && schedule.date === formatDate(new Date())) {
            newSchedule.status = 'cancelled';
            newSchedule.cancelReason = '大风天气';
        }

        schedules.push(newSchedule);
        localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
        return newSchedule;
    }

    function updateSchedule(id, updates) {
        const schedules = getSchedules();
        const index = schedules.findIndex(s => s.id === id);
        if (index === -1) return null;

        const schedule = schedules[index];

        if (isSessionEnded(schedule) && (updates.startTime || updates.endTime || updates.date)) {
            throw new Error('已结束的场次不能修改开放时间');
        }

        if (schedule.status === 'cancelled' && schedule.cancelReason === '设备维护中') {
            const deviceState = getDeviceState();
            if (deviceState.status === 'maintenance') {
                throw new Error('设备维护中，无法修改此场次');
            }
        }

        schedules[index] = { ...schedule, ...updates };
        localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
        return schedules[index];
    }

    function deleteSchedule(id) {
        const schedules = getSchedules();
        const schedule = schedules.find(s => s.id === id);
        if (!schedule) return false;

        if (isSessionEnded(schedule)) {
            throw new Error('已结束的场次不能删除');
        }

        const filtered = schedules.filter(s => s.id !== id);
        localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(filtered));
        return true;
    }

    function cancelSchedule(id, reason) {
        return updateSchedule(id, {
            status: 'cancelled',
            cancelReason: reason
        });
    }

    function restoreSchedule(id) {
        const deviceState = getDeviceState();
        const weather = getWeather();

        if (deviceState.status === 'maintenance') {
            throw new Error('设备维护中，无法恢复场次');
        }
        if (deviceState.status === 'fault') {
            throw new Error('设备故障，无法恢复场次');
        }

        if (weather.isWindy) {
            const schedule = getSchedules().find(s => s.id === id);
            if (schedule && schedule.date === formatDate(new Date())) {
                throw new Error('大风天气，无法恢复今日场次');
            }
        }

        return updateSchedule(id, {
            status: 'scheduled',
            cancelReason: null
        });
    }

    function adjustScheduleTime(id, adjustType, reason) {
        const schedules = getSchedules();
        const index = schedules.findIndex(s => s.id === id);
        if (index === -1) throw new Error('场次不存在');

        const schedule = schedules[index];

        if (isSessionEnded(schedule)) {
            throw new Error('已结束的场次不能调整时间');
        }

        if (schedule.status === 'cancelled') {
            throw new Error('已取消的场次不能调整时间');
        }

        let newStartTime = schedule.startTime;
        let newEndTime = schedule.endTime;

        if (adjustType === 'delay_open') {
            newStartTime = addMinutesToTime(schedule.startTime, 30);
            newEndTime = addMinutesToTime(schedule.endTime, 30);
        } else if (adjustType === 'early_close') {
            newEndTime = addMinutesToTime(schedule.endTime, -30);
        } else if (adjustType === 'extend_open') {
            newEndTime = addMinutesToTime(schedule.endTime, 30);
        } else if (adjustType === 'advance_open') {
            newStartTime = addMinutesToTime(schedule.startTime, -30);
        }

        if (getMinutesDiff(newStartTime, newEndTime) < 15) {
            throw new Error('调整后开放时长不足15分钟');
        }

        schedules[index] = {
            ...schedule,
            startTime: newStartTime,
            endTime: newEndTime,
            adjustType: adjustType,
            adjustReason: reason
        };

        localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
        return schedules[index];
    }

    function resetScheduleTime(id) {
        const schedules = getSchedules();
        const index = schedules.findIndex(s => s.id === id);
        if (index === -1) throw new Error('场次不存在');

        const schedule = schedules[index];

        schedules[index] = {
            ...schedule,
            startTime: schedule.originalStartTime,
            endTime: schedule.originalEndTime,
            adjustType: null,
            adjustReason: null
        };

        localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
        return schedules[index];
    }

    function addAbnormalReason(id, reason, operator) {
        const schedules = getSchedules();
        const index = schedules.findIndex(s => s.id === id);
        if (index === -1) throw new Error('场次不存在');

        const schedule = schedules[index];

        schedules[index] = {
            ...schedule,
            abnormalReason: reason
        };

        localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));

        const abnormalRecords = getAbnormalRecords();
        abnormalRecords.unshift({
            id: generateId(),
            scheduleId: id,
            date: schedule.date,
            startTime: schedule.originalStartTime,
            endTime: schedule.originalEndTime,
            reason: reason,
            operator: operator,
            createdAt: new Date().toISOString()
        });
        localStorage.setItem(STORAGE_KEYS.ABNORMAL_RECORDS, JSON.stringify(abnormalRecords));

        return schedules[index];
    }

    function cancelSessionsForMaintenance() {
        const schedules = getSchedules();
        const today = formatDate(new Date());

        schedules.forEach(schedule => {
            if (schedule.date >= today && schedule.status === 'scheduled') {
                schedule.status = 'cancelled';
                schedule.cancelReason = '设备维护中';
            }
        });

        localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
    }

    function cancelSessionsForFault() {
        const schedules = getSchedules();
        const today = formatDate(new Date());

        schedules.forEach(schedule => {
            if (schedule.date >= today && schedule.status === 'scheduled') {
                schedule.status = 'cancelled';
                schedule.cancelReason = '设备故障';
            }
        });

        localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
    }

    function cancelSessionsForWeather() {
        const schedules = getSchedules();
        const today = formatDate(new Date());

        schedules.forEach(schedule => {
            if (schedule.date === today && schedule.status === 'scheduled') {
                schedule.status = 'cancelled';
                schedule.cancelReason = '大风天气';
            }
        });

        localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
    }

    function restoreCancelledSessions() {
        const schedules = getSchedules();
        const weather = getWeather();
        const today = formatDate(new Date());

        schedules.forEach(schedule => {
            if (schedule.status === 'cancelled' &&
                (schedule.cancelReason === '设备维护中' || schedule.cancelReason === '设备故障') &&
                !isSessionEnded(schedule)) {
                if (weather.isWindy && schedule.date === today) {
                    schedule.cancelReason = '大风天气';
                } else {
                    schedule.status = 'scheduled';
                    schedule.cancelReason = null;
                }
            }
        });

        localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
    }

    function restoreWeatherCancelledSessions() {
        const schedules = getSchedules();
        const deviceState = getDeviceState();
        const today = formatDate(new Date());

        schedules.forEach(schedule => {
            if (schedule.status === 'cancelled' &&
                schedule.cancelReason === '大风天气' &&
                schedule.date === today &&
                deviceState.status === 'normal' &&
                !isSessionEnded(schedule)) {
                schedule.status = 'scheduled';
                schedule.cancelReason = null;
            }
        });

        localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
    }

    function getMaintenanceLogs() {
        initDefaultData();
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.MAINTENANCE_LOGS));
    }

    function addMaintenanceLog(log) {
        const logs = getMaintenanceLogs();
        const newLog = {
            id: generateId(),
            ...log,
            createdAt: new Date().toISOString()
        };
        logs.unshift(newLog);
        localStorage.setItem(STORAGE_KEYS.MAINTENANCE_LOGS, JSON.stringify(logs));
        return newLog;
    }

    function getFestivals() {
        initDefaultData();
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.FESTIVALS));
    }

    function getTodayFestival() {
        const today = formatDate(new Date());
        const festivals = getFestivals();
        return festivals.find(f => f.date === today) || null;
    }

    function addFestival(festival) {
        const festivals = getFestivals();
        const newFestival = {
            id: generateId(),
            ...festival,
            createdAt: new Date().toISOString()
        };
        festivals.push(newFestival);
        festivals.sort((a, b) => a.date.localeCompare(b.date));
        localStorage.setItem(STORAGE_KEYS.FESTIVALS, JSON.stringify(festivals));
        return newFestival;
    }

    function updateFestival(id, updates) {
        const festivals = getFestivals();
        const index = festivals.findIndex(f => f.id === id);
        if (index === -1) return null;
        festivals[index] = { ...festivals[index], ...updates };
        localStorage.setItem(STORAGE_KEYS.FESTIVALS, JSON.stringify(festivals));
        return festivals[index];
    }

    function deleteFestival(id) {
        const festivals = getFestivals();
        const filtered = festivals.filter(f => f.id !== id);
        localStorage.setItem(STORAGE_KEYS.FESTIVALS, JSON.stringify(filtered));
        return filtered.length < festivals.length;
    }

    function getTempEvents() {
        initDefaultData();
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.TEMP_EVENTS));
    }

    function getTodayTempEvents() {
        const today = formatDate(new Date());
        const events = getTempEvents();
        return events.filter(e => e.date === today);
    }

    function addTempEvent(event) {
        const events = getTempEvents();
        const newEvent = {
            id: generateId(),
            ...event,
            createdAt: new Date().toISOString()
        };
        events.push(newEvent);
        events.sort((a, b) => a.date.localeCompare(b.date));
        localStorage.setItem(STORAGE_KEYS.TEMP_EVENTS, JSON.stringify(events));
        return newEvent;
    }

    function updateTempEvent(id, updates) {
        const events = getTempEvents();
        const index = events.findIndex(e => e.id === id);
        if (index === -1) return null;
        events[index] = { ...events[index], ...updates };
        localStorage.setItem(STORAGE_KEYS.TEMP_EVENTS, JSON.stringify(events));
        return events[index];
    }

    function deleteTempEvent(id) {
        const events = getTempEvents();
        const filtered = events.filter(e => e.id !== id);
        localStorage.setItem(STORAGE_KEYS.TEMP_EVENTS, JSON.stringify(filtered));
        return filtered.length < events.length;
    }

    function getVisitorNotices() {
        initDefaultData();
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.VISITOR_NOTICES));
    }

    function updateVisitorNotices(notices) {
        const current = getVisitorNotices();
        const updated = {
            ...current,
            ...notices,
            lastUpdate: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEYS.VISITOR_NOTICES, JSON.stringify(updated));
        return updated;
    }

    function getEnergyConfig() {
        initDefaultData();
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.ENERGY_CONFIG));
    }

    function updateEnergyConfig(config) {
        const current = getEnergyConfig();
        const updated = {
            ...current,
            ...config,
            lastUpdate: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEYS.ENERGY_CONFIG, JSON.stringify(updated));
        return updated;
    }

    function getAbnormalRecords() {
        initDefaultData();
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.ABNORMAL_RECORDS));
    }

    function canModifySchedule(schedule) {
        if (isSessionEnded(schedule)) {
            return { can: false, reason: '已结束的场次不能修改' };
        }

        const deviceState = getDeviceState();
        if (deviceState.status === 'maintenance') {
            return { can: false, reason: '设备维护中，请联系维修人员' };
        }
        if (deviceState.status === 'fault') {
            return { can: false, reason: '设备故障，请联系维修人员' };
        }

        return { can: true };
    }

    function getScheduleSuggestions() {
        const weather = getWeather();
        const festival = getTodayFestival();
        const tempEvents = getTodayTempEvents();
        const energyConfig = getEnergyConfig();
        const sessions = getTodaySessions();
        const deviceState = getDeviceState();

        const suggestions = [];

        if (weather.isWindy && weather.windLevel >= HEAVY_WIND_THRESHOLD) {
            suggestions.push({
                type: 'weather',
                level: 'danger',
                title: '强风预警',
                description: `当前风力${weather.windLevel}级，已达到强风标准，建议所有场次提前结束或取消`,
                action: 'early_close',
                affectedSessions: sessions.filter(s => s.status === 'scheduled' && !isSessionEnded(s)).map(s => s.id)
            });
        } else if (weather.isWindy) {
            suggestions.push({
                type: 'weather',
                level: 'warning',
                title: '大风提醒',
                description: `当前风力${weather.windLevel}级，建议室外场次适当缩短开放时间`,
                action: 'early_close',
                affectedSessions: sessions.filter(s => s.status === 'scheduled' && !isSessionEnded(s)).map(s => s.id)
            });
        }

        if (festival && festival.crowdLevel === 'high') {
            suggestions.push({
                type: 'festival',
                level: 'info',
                title: `节庆活动：${festival.name}`,
                description: '今日为节假日，预计人流量大，建议增加场次或延长开放时间',
                action: 'extend_open',
                affectedSessions: sessions.filter(s => s.status === 'scheduled').map(s => s.id)
            });
        }

        if (tempEvents.length > 0) {
            suggestions.push({
                type: 'event',
                level: 'info',
                title: '临时活动',
                description: `今日有${tempEvents.length}场临时活动，建议根据活动时间调整排程`,
                action: 'adjust',
                events: tempEvents
            });
        }

        if (energyConfig.energySavingMode) {
            suggestions.push({
                type: 'energy',
                level: 'warning',
                title: '节能模式',
                description: '当前处于节能模式，高峰时段可能限制功率输出',
                action: 'none'
            });
        }

        if (deviceState.status !== 'normal') {
            suggestions.push({
                type: 'device',
                level: 'danger',
                title: deviceState.status === 'maintenance' ? '设备维护中' : '设备故障',
                description: deviceState.description,
                action: 'none'
            });
        }

        return suggestions;
    }

    function getPublicStatus() {
        const deviceState = getDeviceState();
        const weather = getWeather();
        const todaySessions = getTodaySessions();
        const festival = getTodayFestival();
        const tempEvents = getTodayTempEvents();
        const notices = getVisitorNotices();
        const energyConfig = getEnergyConfig();

        const activeSessions = todaySessions.filter(s => s.status !== 'cancelled');
        const cancelledSessions = todaySessions.filter(s => s.status === 'cancelled');
        const ongoingSession = todaySessions.find(s => isSessionOngoing(s));
        const upcomingSessions = todaySessions.filter(s => isSessionUpcoming(s));

        let overallStatus = 'normal';
        let statusText = '正常开放';
        let statusClass = 'status-normal';

        if (deviceState.status === 'maintenance') {
            overallStatus = 'maintenance';
            statusText = '维护中';
            statusClass = 'status-warning';
        } else if (deviceState.status === 'fault') {
            overallStatus = 'fault';
            statusText = '故障';
            statusClass = 'status-warning';
        } else if (weather.isWindy) {
            overallStatus = 'windy';
            statusText = '大风暂停';
            statusClass = 'status-warning';
        } else if (activeSessions.length === 0 && todaySessions.length > 0) {
            overallStatus = 'all_cancelled';
            statusText = '今日全部取消';
            statusClass = 'status-warning';
        } else if (ongoingSession) {
            overallStatus = 'ongoing';
            statusText = '开放中';
            statusClass = 'status-normal';
        }

        return {
            deviceState,
            weather,
            festival,
            tempEvents,
            notices,
            energyConfig,
            sessions: todaySessions.map(s => ({
                ...s,
                isEnded: isSessionEnded(s),
                isOngoing: isSessionOngoing(s),
                isUpcoming: isSessionUpcoming(s)
            })),
            overallStatus,
            statusText,
            statusClass,
            canOpen: deviceState.status === 'normal' && !weather.isWindy,
            activeCount: activeSessions.length,
            cancelledCount: cancelledSessions.length,
            ongoingSession: ongoingSession ? { ...ongoingSession, isEnded: false, isOngoing: true, isUpcoming: false } : null,
            upcomingCount: upcomingSessions.length,
            lastUpdate: new Date().toISOString()
        };
    }

    function resetAllData() {
        Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
        initDefaultData();
    }

    initDefaultData();

    return {
        generateId,
        formatDate,
        getCurrentTime,
        isSessionEnded,
        isSessionOngoing,
        isSessionUpcoming,
        addMinutesToTime,
        getMinutesDiff,
        getDeviceState,
        setDeviceState,
        updatePublicNotice,
        getWeather,
        setWeather,
        getSchedules,
        getTodaySessions,
        getFutureSessions,
        addSchedule,
        updateSchedule,
        deleteSchedule,
        cancelSchedule,
        restoreSchedule,
        adjustScheduleTime,
        resetScheduleTime,
        addAbnormalReason,
        getMaintenanceLogs,
        addMaintenanceLog,
        getFestivals,
        getTodayFestival,
        addFestival,
        updateFestival,
        deleteFestival,
        getTempEvents,
        getTodayTempEvents,
        addTempEvent,
        updateTempEvent,
        deleteTempEvent,
        getVisitorNotices,
        updateVisitorNotices,
        getEnergyConfig,
        updateEnergyConfig,
        getAbnormalRecords,
        canModifySchedule,
        getScheduleSuggestions,
        getPublicStatus,
        resetAllData,
        WIND_THRESHOLD,
        HEAVY_WIND_THRESHOLD
    };
})();
