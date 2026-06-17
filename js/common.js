const FountainData = (function() {
    const STORAGE_KEYS = {
        SCHEDULES: 'fountain_schedules',
        DEVICE_STATE: 'fountain_device_state',
        WEATHER: 'fountain_weather',
        MAINTENANCE_LOGS: 'fountain_maintenance_logs'
    };

    const WIND_THRESHOLD = 6;

    function initDefaultData() {
        if (!localStorage.getItem(STORAGE_KEYS.DEVICE_STATE)) {
            localStorage.setItem(STORAGE_KEYS.DEVICE_STATE, JSON.stringify({
                status: 'normal',
                description: '设备运行正常',
                lastUpdate: new Date().toISOString(),
                operator: '系统初始化'
            }));
        }

        if (!localStorage.getItem(STORAGE_KEYS.WEATHER)) {
            localStorage.setItem(STORAGE_KEYS.WEATHER, JSON.stringify({
                windLevel: 3,
                description: '微风',
                isWindy: false,
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
                    createdAt: new Date().toISOString()
                },
                {
                    id: generateId(),
                    date: dateStr,
                    startTime: '15:00',
                    endTime: '16:00',
                    status: 'scheduled',
                    cancelReason: null,
                    createdAt: new Date().toISOString()
                },
                {
                    id: generateId(),
                    date: dateStr,
                    startTime: '19:00',
                    endTime: '20:30',
                    status: 'scheduled',
                    cancelReason: null,
                    createdAt: new Date().toISOString()
                }
            ];
            localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(defaultSchedules));
        }

        if (!localStorage.getItem(STORAGE_KEYS.MAINTENANCE_LOGS)) {
            localStorage.setItem(STORAGE_KEYS.MAINTENANCE_LOGS, JSON.stringify([]));
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
        localStorage.setItem(STORAGE_KEYS.DEVICE_STATE, JSON.stringify(newState));

        if (state.status === 'maintenance') {
            cancelSessionsForMaintenance();
        } else if (state.status === 'normal') {
            restoreCancelledSessions();
        }

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
            createdAt: new Date().toISOString()
        };

        if (deviceState.status === 'maintenance') {
            newSchedule.status = 'cancelled';
            newSchedule.cancelReason = '设备维护中';
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
                schedule.cancelReason === '设备维护中' &&
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

    function canModifySchedule(schedule) {
        if (isSessionEnded(schedule)) {
            return { can: false, reason: '已结束的场次不能修改' };
        }

        const deviceState = getDeviceState();
        if (deviceState.status === 'maintenance') {
            return { can: false, reason: '设备维护中，请联系维修人员' };
        }

        return { can: true };
    }

    function getPublicStatus() {
        const deviceState = getDeviceState();
        const weather = getWeather();
        const todaySessions = getTodaySessions();

        return {
            deviceState,
            weather,
            sessions: todaySessions.map(s => ({
                ...s,
                isEnded: isSessionEnded(s),
                isOngoing: isSessionOngoing(s)
            })),
            canOpen: deviceState.status === 'normal' && !weather.isWindy,
            lastUpdate: new Date().toISOString()
        };
    }

    function resetAllData() {
        localStorage.removeItem(STORAGE_KEYS.SCHEDULES);
        localStorage.removeItem(STORAGE_KEYS.DEVICE_STATE);
        localStorage.removeItem(STORAGE_KEYS.WEATHER);
        localStorage.removeItem(STORAGE_KEYS.MAINTENANCE_LOGS);
        initDefaultData();
    }

    initDefaultData();

    return {
        generateId,
        formatDate,
        getCurrentTime,
        isSessionEnded,
        isSessionOngoing,
        getDeviceState,
        setDeviceState,
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
        getMaintenanceLogs,
        addMaintenanceLog,
        canModifySchedule,
        getPublicStatus,
        resetAllData,
        WIND_THRESHOLD
    };
})();
