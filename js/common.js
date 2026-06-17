const FountainData = (function() {
    const STORAGE_KEYS = {
        SCHEDULES: 'fountain_schedules',
        DEVICE_STATE: 'fountain_device_state',
        WEATHER: 'fountain_weather',
        MAINTENANCE_LOGS: 'fountain_maintenance_logs',
        FESTIVALS: 'fountain_festivals',
        TEMP_EVENTS: 'fountain_temp_events',
        ENERGY_POLICY: 'fountain_energy_policy',
        VISITOR_NOTICES: 'fountain_visitor_notices'
    };

    const WIND_THRESHOLD = 6;
    const WIND_STOP_THRESHOLD = 5;

    const ENERGY_PEAK_HOURS = [
        { start: '08:00', end: '11:00' },
        { start: '18:00', end: '22:00' }
    ];

    function initDefaultData() {
        if (!localStorage.getItem(STORAGE_KEYS.DEVICE_STATE)) {
            localStorage.setItem(STORAGE_KEYS.DEVICE_STATE, JSON.stringify({
                status: 'normal',
                description: '设备运行正常',
                lastUpdate: new Date().toISOString(),
                operator: '系统初始化',
                relatedSchedules: [],
                publicNotice: null
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
                    originalStartTime: '09:00',
                    originalEndTime: '10:00',
                    status: 'scheduled',
                    cancelReason: null,
                    adjustReason: null,
                    abnormalReason: null,
                    linkedEventId: null,
                    visitorNotice: null,
                    createdAt: new Date().toISOString()
                },
                {
                    id: generateId(),
                    date: dateStr,
                    startTime: '15:00',
                    endTime: '16:00',
                    originalStartTime: '15:00',
                    originalEndTime: '16:00',
                    status: 'scheduled',
                    cancelReason: null,
                    adjustReason: null,
                    abnormalReason: null,
                    linkedEventId: null,
                    visitorNotice: null,
                    createdAt: new Date().toISOString()
                },
                {
                    id: generateId(),
                    date: dateStr,
                    startTime: '19:00',
                    endTime: '20:30',
                    originalStartTime: '19:00',
                    originalEndTime: '20:30',
                    status: 'scheduled',
                    cancelReason: null,
                    adjustReason: null,
                    abnormalReason: null,
                    linkedEventId: null,
                    visitorNotice: null,
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
            const year = today.getFullYear();
            const defaultFestivals = [
                {
                    id: generateId(),
                    name: '元旦',
                    startDate: `${year}-01-01`,
                    endDate: `${year}-01-01`,
                    crowdLevel: 'high',
                    note: '新年第一天，游客较多',
                    isHoliday: true
                },
                {
                    id: generateId(),
                    name: '春节',
                    startDate: `${year}-02-10`,
                    endDate: `${year}-02-17`,
                    crowdLevel: 'very_high',
                    note: '春节黄金周，预计客流高峰',
                    isHoliday: true
                },
                {
                    id: generateId(),
                    name: '五一劳动节',
                    startDate: `${year}-05-01`,
                    endDate: `${year}-05-05`,
                    crowdLevel: 'very_high',
                    note: '小长假，游客较多',
                    isHoliday: true
                },
                {
                    id: generateId(),
                    name: '国庆节',
                    startDate: `${year}-10-01`,
                    endDate: `${year}-10-07`,
                    crowdLevel: 'very_high',
                    note: '国庆黄金周，客流最高峰',
                    isHoliday: true
                }
            ];
            localStorage.setItem(STORAGE_KEYS.FESTIVALS, JSON.stringify(defaultFestivals));
        }

        if (!localStorage.getItem(STORAGE_KEYS.TEMP_EVENTS)) {
            localStorage.setItem(STORAGE_KEYS.TEMP_EVENTS, JSON.stringify([]));
        }

        if (!localStorage.getItem(STORAGE_KEYS.ENERGY_POLICY)) {
            localStorage.setItem(STORAGE_KEYS.ENERGY_POLICY, JSON.stringify({
                enabled: true,
                peakHoursEnabled: true,
                peakSavingPercent: 20,
                notice: '用电高峰期间适度调整运行时间，保障电网稳定'
            }));
        }

        if (!localStorage.getItem(STORAGE_KEYS.VISITOR_NOTICES)) {
            localStorage.setItem(STORAGE_KEYS.VISITOR_NOTICES, JSON.stringify([]));
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

    function isTimeInRange(time, start, end) {
        return time >= start && time < end;
    }

    function isEnergyPeakTime(date, time) {
        const policy = getEnergyPolicy();
        if (!policy.enabled || !policy.peakHoursEnabled) return false;

        return ENERGY_PEAK_HOURS.some(hour =>
            isTimeInRange(time, hour.start, hour.end)
        );
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

        if (state.status === 'maintenance' || state.status === 'fault') {
            const relatedIds = state.relatedSchedules && state.relatedSchedules.length > 0
                ? state.relatedSchedules
                : null;
            cancelSessionsForMaintenance(state.status, state.description, relatedIds, state.publicNotice);
        } else if (state.status === 'normal') {
            restoreCancelledSessions();
            if (state.publicNotice) {
                addVisitorNotice({
                    type: 'info',
                    title: '设备恢复公告',
                    content: state.publicNotice,
                    priority: 'normal'
                });
            }
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
            cancelSessionsForWeather(newWeather.windLevel);
        } else {
            restoreWeatherCancelledSessions();
        }

        return newWeather;
    }

    function getFestivals() {
        initDefaultData();
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.FESTIVALS));
    }

    function addFestival(festival) {
        const festivals = getFestivals();
        const newFestival = {
            id: generateId(),
            ...festival,
            createdAt: new Date().toISOString()
        };
        festivals.push(newFestival);
        localStorage.setItem(STORAGE_KEYS.FESTIVALS, JSON.stringify(festivals));

        if (festival.isHoliday && festival.crowdLevel === 'very_high') {
            adjustSchedulesForFestival(newFestival);
        }

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
        return true;
    }

    function getFestivalsForDate(dateStr) {
        const festivals = getFestivals();
        return festivals.filter(f => dateStr >= f.startDate && dateStr <= f.endDate);
    }

    function getCrowdLevelForDate(dateStr) {
        const festivals = getFestivalsForDate(dateStr);
        if (festivals.length === 0) return 'normal';

        const levels = festivals.map(f => f.crowdLevel);
        if (levels.includes('very_high')) return 'very_high';
        if (levels.includes('high')) return 'high';
        return 'normal';
    }

    function getTempEvents() {
        initDefaultData();
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.TEMP_EVENTS));
    }

    function addTempEvent(event) {
        const events = getTempEvents();
        const newEvent = {
            id: generateId(),
            ...event,
            createdAt: new Date().toISOString()
        };
        events.push(newEvent);
        localStorage.setItem(STORAGE_KEYS.TEMP_EVENTS, JSON.stringify(events));

        if (event.impactSchedules && event.impactSchedules.length > 0) {
            linkSchedulesToEvent(newEvent.id, event.impactSchedules);
        }

        if (event.autoAdjust) {
            applyTempEventAdjustment(newEvent);
        }

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
        const schedules = getSchedules();
        schedules.forEach(s => {
            if (s.linkedEventId === id) s.linkedEventId = null;
        });
        localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
        return true;
    }

    function getTempEventsForDate(dateStr) {
        const events = getTempEvents();
        return events.filter(e => dateStr >= e.date || (e.startDate && dateStr >= e.startDate && dateStr <= e.endDate));
    }

    function linkSchedulesToEvent(eventId, scheduleIds) {
        const schedules = getSchedules();
        scheduleIds.forEach(sid => {
            const schedule = schedules.find(s => s.id === sid);
            if (schedule) {
                schedule.linkedEventId = eventId;
            }
        });
        localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
    }

    function applyTempEventAdjustment(event) {
        const schedules = getSchedules();
        const eventDate = event.date || event.startDate;

        schedules.forEach(schedule => {
            if ((eventDate && schedule.date === eventDate) ||
                (event.linkedScheduleIds && event.linkedScheduleIds.includes(schedule.id))) {

                if (event.adjustType === 'delay') {
                    const newStart = addMinutes(schedule.startTime, event.delayMinutes || 30);
                    const newEnd = addMinutes(schedule.endTime, event.delayMinutes || 30);
                    schedule.startTime = newStart;
                    schedule.endTime = newEnd;
                    schedule.adjustReason = `活动延时开放：${event.name}`;
                    schedule.visitorNotice = event.notice || `因${event.name}活动，本场次延时开放`;
                } else if (event.adjustType === 'advance') {
                    const newEnd = subtractMinutes(schedule.endTime, event.advanceMinutes || 30);
                    schedule.endTime = newEnd;
                    schedule.adjustReason = `活动提前结束：${event.name}`;
                    schedule.visitorNotice = event.notice || `因${event.name}活动，本场次提前结束`;
                } else if (event.adjustType === 'cancel') {
                    if (schedule.status !== 'cancelled') {
                        schedule.status = 'cancelled';
                        schedule.cancelReason = `临时活动取消：${event.name}`;
                    }
                }
            }
        });

        localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
    }

    function addMinutes(timeStr, minutes) {
        const [h, m] = timeStr.split(':').map(Number);
        const total = h * 60 + m + minutes;
        const nh = Math.floor(total / 60) % 24;
        const nm = total % 60;
        return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
    }

    function subtractMinutes(timeStr, minutes) {
        const [h, m] = timeStr.split(':').map(Number);
        let total = h * 60 + m - minutes;
        if (total < 0) total = 0;
        const nh = Math.floor(total / 60);
        const nm = total % 60;
        return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
    }

    function adjustSchedulesForFestival(festival) {
        const schedules = getSchedules();
        const adjustedIds = [];

        schedules.forEach(schedule => {
            if (schedule.date >= festival.startDate && schedule.date <= festival.endDate) {
                if (festival.crowdLevel === 'very_high') {
                    const newEnd = addMinutes(schedule.endTime, 30);
                    schedule.endTime = newEnd;
                    schedule.adjustReason = `节庆延时开放（${festival.name}）`;
                    schedule.visitorNotice = `节庆期间（${festival.name}）本场次延时30分钟开放`;
                    adjustedIds.push(schedule.id);
                } else if (festival.crowdLevel === 'high') {
                    const newEnd = addMinutes(schedule.endTime, 15);
                    schedule.endTime = newEnd;
                    schedule.adjustReason = `节庆延时开放（${festival.name}）`;
                    schedule.visitorNotice = `节庆期间（${festival.name}）本场次延时15分钟开放`;
                    adjustedIds.push(schedule.id);
                }
            }
        });

        localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
        return adjustedIds;
    }

    function getEnergyPolicy() {
        initDefaultData();
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.ENERGY_POLICY));
    }

    function updateEnergyPolicy(policy) {
        const current = getEnergyPolicy();
        const newPolicy = { ...current, ...policy };
        localStorage.setItem(STORAGE_KEYS.ENERGY_POLICY, JSON.stringify(newPolicy));
        return newPolicy;
    }

    function generateScheduleSuggestions(schedule) {
        const suggestions = [];
        const weather = getWeather();
        const crowdLevel = getCrowdLevelForDate(schedule.date);
        const tempEvents = getTempEventsForDate(schedule.date);
        const policy = getEnergyPolicy();
        const deviceState = getDeviceState();

        if (weather.windLevel >= WIND_STOP_THRESHOLD && weather.windLevel < WIND_THRESHOLD) {
            suggestions.push({
                type: 'wind_warn',
                level: 'warning',
                title: '风力接近阈值',
                content: `当前风力${weather.windLevel}级，接近停开阈值。建议密切关注，若持续上升需提前停开。`,
                action: '提前停开',
                actionType: 'early_stop',
                minutes: 15
            });
        }

        if (weather.windLevel >= WIND_THRESHOLD) {
            suggestions.push({
                type: 'wind_stop',
                level: 'danger',
                title: '大风天气需停开',
                content: `当前风力${weather.windLevel}级，已达到停开标准。建议立即取消今日场次。`,
                action: '取消场次',
                actionType: 'cancel',
                reason: '大风天气'
            });
        }

        if (crowdLevel === 'very_high') {
            suggestions.push({
                type: 'crowd_delay',
                level: 'info',
                title: '节庆人流高峰',
                content: '今日为节庆高峰期，预计游客量极大。建议延时开放以分流人群。',
                action: '延时30分钟',
                actionType: 'delay_end',
                minutes: 30
            });
        } else if (crowdLevel === 'high') {
            suggestions.push({
                type: 'crowd_delay',
                level: 'info',
                title: '节假日人流较多',
                content: '今日为节假日，游客量高于平日。建议适当延时开放。',
                action: '延时15分钟',
                actionType: 'delay_end',
                minutes: 15
            });
        }

        tempEvents.forEach(event => {
            if (event.type === 'performance' || event.type === 'celebration') {
                suggestions.push({
                    type: 'event_synergy',
                    level: 'success',
                    title: `配合活动：${event.name}`,
                    content: `今日有「${event.name}」活动，建议与活动时间协同调整喷泉开放。`,
                    action: '查看详情',
                    actionType: 'view_event',
                    eventId: event.id
                });
            }
        });

        if (policy.enabled && policy.peakHoursEnabled) {
            const isPeak = isEnergyPeakTime(schedule.date, schedule.startTime);
            const isNearPeak = ENERGY_PEAK_HOURS.some(hour => {
                const startDiff = timeDifferenceMinutes(schedule.startTime, hour.start);
                return startDiff > -30 && startDiff < 60;
            });

            if (isPeak) {
                suggestions.push({
                    type: 'energy_peak',
                    level: 'warning',
                    title: '用电高峰时段',
                    content: `本场次处于用电高峰（${schedule.startTime}），建议提前15分钟停开，降低能耗${policy.peakSavingPercent}%。`,
                    action: '提前15分钟停开',
                    actionType: 'early_stop',
                    minutes: 15
                });
            } else if (isNearPeak) {
                suggestions.push({
                    type: 'energy_near_peak',
                    level: 'info',
                    title: '临近用电高峰',
                    content: '本场次临近用电高峰时段，可根据实际情况适度调整运行时长。',
                    action: '查看节能方案',
                    actionType: 'view_energy'
                });
            }
        }

        if (deviceState.status === 'maintenance' || deviceState.status === 'fault') {
            suggestions.push({
                type: 'device_issue',
                level: 'danger',
                title: '设备状态异常',
                content: `当前设备${deviceState.status === 'maintenance' ? '维护中' : '故障'}：${deviceState.description}`,
                action: '查看设备状态',
                actionType: 'view_device'
            });
        }

        return suggestions;
    }

    function timeDifferenceMinutes(time1, time2) {
        const [h1, m1] = time1.split(':').map(Number);
        const [h2, m2] = time2.split(':').map(Number);
        return (h1 - h2) * 60 + (m1 - m2);
    }

    function applyScheduleSuggestion(scheduleId, suggestion) {
        const schedule = getSchedules().find(s => s.id === scheduleId);
        if (!schedule) return null;

        if (isSessionEnded(schedule)) {
            throw new Error('已结束的场次不能调整时间');
        }

        const updates = {};

        switch (suggestion.actionType) {
            case 'early_stop':
                updates.endTime = subtractMinutes(schedule.endTime, suggestion.minutes);
                updates.adjustReason = updates.adjustReason || `建议提前停开${suggestion.minutes}分钟：${suggestion.title}`;
                break;
            case 'delay_end':
                updates.endTime = addMinutes(schedule.endTime, suggestion.minutes);
                updates.adjustReason = updates.adjustReason || `建议延时${suggestion.minutes}分钟：${suggestion.title}`;
                if (!updates.visitorNotice) {
                    updates.visitorNotice = `本场次将延时${suggestion.minutes}分钟开放`;
                }
                break;
            case 'cancel':
                updates.status = 'cancelled';
                updates.cancelReason = suggestion.reason || suggestion.title;
                break;
        }

        return updateSchedule(scheduleId, updates);
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
            date: schedule.date,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            originalStartTime: schedule.startTime,
            originalEndTime: schedule.endTime,
            status: 'scheduled',
            cancelReason: null,
            adjustReason: schedule.adjustReason || null,
            abnormalReason: null,
            linkedEventId: schedule.linkedEventId || null,
            visitorNotice: schedule.visitorNotice || null,
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

        const crowdLevel = getCrowdLevelForDate(schedule.date);
        if (crowdLevel === 'very_high' && newSchedule.status === 'scheduled') {
            newSchedule.endTime = addMinutes(newSchedule.endTime, 30);
            newSchedule.adjustReason = '节庆延时开放';
            newSchedule.visitorNotice = '节庆期间本场次延时30分钟';
        } else if (crowdLevel === 'high' && newSchedule.status === 'scheduled') {
            newSchedule.endTime = addMinutes(newSchedule.endTime, 15);
            newSchedule.adjustReason = '节假日延时开放';
            newSchedule.visitorNotice = '节假日本场次延时15分钟';
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

        if (isSessionEnded(schedule) && (updates.startTime || updates.endTime || updates.date || updates.status)) {
            if (updates.status === 'cancelled' || updates.startTime || updates.endTime) {
                throw new Error('已结束的场次不能修改开放时间或状态');
            }
        }

        if (schedule.status === 'cancelled' &&
            (schedule.cancelReason === '设备维护中' || schedule.cancelReason === '设备故障')) {
            const deviceState = getDeviceState();
            if (deviceState.status === 'maintenance' || deviceState.status === 'fault') {
                if (!updates.abnormalReason) {
                    throw new Error('设备异常中，无法修改此场次，请先恢复设备状态');
                }
            }
        }

        if ((updates.startTime || updates.endTime) && !isSessionEnded(schedule)) {
            if (updates.startTime && updates.startTime !== schedule.originalStartTime) {
                if (!updates.adjustReason) {
                    updates.adjustReason = '手动调整开始时间';
                }
            }
            if (updates.endTime && updates.endTime !== schedule.originalEndTime) {
                if (!updates.adjustReason) {
                    updates.adjustReason = '手动调整结束时间';
                }
            }
        }

        schedules[index] = { ...schedule, ...updates };
        localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
        return schedules[index];
    }

    function addAbnormalReason(id, reason) {
        const schedules = getSchedules();
        const schedule = schedules.find(s => s.id === id);
        if (!schedule) return null;

        if (!isSessionEnded(schedule)) {
            throw new Error('只能为已结束的场次补录异常原因');
        }

        schedule.abnormalReason = reason;
        localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
        return schedule;
    }

    function deleteSchedule(id) {
        const schedules = getSchedules();
        const schedule = schedules.find(s => s.id === id);
        if (!schedule) return false;

        if (isSessionEnded(schedule)) {
            throw new Error('已结束的场次不能删除，可补录异常原因');
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

        if (deviceState.status === 'maintenance' || deviceState.status === 'fault') {
            throw new Error(`设备${deviceState.status === 'maintenance' ? '维护中' : '故障'}，无法恢复场次`);
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

    function cancelSessionsForMaintenance(status, description, relatedIds, publicNotice) {
        const schedules = getSchedules();
        const today = formatDate(new Date());

        schedules.forEach(schedule => {
            const shouldCancel = relatedIds
                ? relatedIds.includes(schedule.id)
                : schedule.date >= today;

            if (shouldCancel && schedule.status === 'scheduled' && !isSessionEnded(schedule)) {
                schedule.status = 'cancelled';
                schedule.cancelReason = status === 'fault' ? `设备故障：${description}` : `设备维护中：${description}`;
                schedule.visitorNotice = publicNotice || (status === 'fault' ? '因设备故障，本场次取消，敬请谅解' : '因设备维护，本场次取消，敬请谅解');
            }
        });

        localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));

        if (publicNotice) {
            addVisitorNotice({
                type: status === 'fault' ? 'warning' : 'info',
                title: status === 'fault' ? '设备故障公告' : '设备维护公告',
                content: publicNotice,
                priority: 'high'
            });
        }
    }

    function cancelSessionsForWeather(windLevel) {
        const schedules = getSchedules();
        const today = formatDate(new Date());

        schedules.forEach(schedule => {
            if (schedule.date === today && schedule.status === 'scheduled' && !isSessionEnded(schedule)) {
                schedule.status = 'cancelled';
                schedule.cancelReason = `大风天气（${windLevel}级）`;
                schedule.visitorNotice = `因大风天气（${windLevel}级），本场次取消，请游客注意安全`;
            }
        });

        localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));

        addVisitorNotice({
            type: 'warning',
            title: '大风天气公告',
            content: `今日风力${windLevel}级，喷泉场次已自动取消，请游客远离喷水池区域，注意安全。`,
            priority: 'high'
        });
    }

    function restoreCancelledSessions() {
        const schedules = getSchedules();
        const weather = getWeather();
        const today = formatDate(new Date());

        schedules.forEach(schedule => {
            if (schedule.status === 'cancelled' &&
                (schedule.cancelReason && schedule.cancelReason.startsWith('设备')) &&
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
                schedule.cancelReason &&
                schedule.cancelReason.startsWith('大风') &&
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
            status: log.status,
            operator: log.operator,
            description: log.description,
            relatedScheduleIds: log.relatedScheduleIds || [],
            publicNotice: log.publicNotice || null,
            expectedFinishTime: log.expectedFinishTime || null,
            faultType: log.faultType || null,
            createdAt: new Date().toISOString()
        };
        logs.unshift(newLog);
        localStorage.setItem(STORAGE_KEYS.MAINTENANCE_LOGS, JSON.stringify(logs));
        return newLog;
    }

    function getVisitorNotices() {
        initDefaultData();
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.VISITOR_NOTICES));
    }

    function addVisitorNotice(notice) {
        const notices = getVisitorNotices();
        const newNotice = {
            id: generateId(),
            ...notice,
            createdAt: new Date().toISOString(),
            expiresAt: notice.expiresAt || addDays(1).toISOString(),
            isActive: true
        };
        notices.unshift(newNotice);
        localStorage.setItem(STORAGE_KEYS.VISITOR_NOTICES, JSON.stringify(notices));
        return newNotice;
    }

    function addDays(days) {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d;
    }

    function dismissVisitorNotice(id) {
        const notices = getVisitorNotices();
        const notice = notices.find(n => n.id === id);
        if (notice) {
            notice.isActive = false;
            localStorage.setItem(STORAGE_KEYS.VISITOR_NOTICES, JSON.stringify(notices));
        }
        return notice;
    }

    function getActiveVisitorNotices() {
        const notices = getVisitorNotices();
        const now = new Date();
        return notices.filter(n =>
            n.isActive && new Date(n.expiresAt) > now
        ).sort((a, b) => {
            const priorityWeight = { high: 0, normal: 1, low: 2 };
            return (priorityWeight[a.priority] || 1) - (priorityWeight[b.priority] || 1);
        });
    }

    function canModifySchedule(schedule) {
        if (isSessionEnded(schedule)) {
            return { can: false, reason: '已结束的场次不能修改时间或状态', canAddAbnormal: true };
        }

        const deviceState = getDeviceState();
        if (deviceState.status === 'maintenance' || deviceState.status === 'fault') {
            return {
                can: false,
                reason: `设备${deviceState.status === 'maintenance' ? '维护中' : '故障'}，请联系维修人员`,
                canAddAbnormal: false
            };
        }

        return { can: true, canAddAbnormal: false };
    }

    function getPublicStatus() {
        const deviceState = getDeviceState();
        const weather = getWeather();
        const todaySessions = getTodaySessions();
        const notices = getActiveVisitorNotices();
        const festivals = getFestivalsForDate(formatDate(new Date()));
        const tempEvents = getTempEventsForDate(formatDate(new Date()));
        const crowdLevel = getCrowdLevelForDate(formatDate(new Date()));

        const scheduled = todaySessions.filter(s => s.status !== 'cancelled');
        const cancelled = todaySessions.filter(s => s.status === 'cancelled');
        const ongoing = todaySessions.find(s => isSessionOngoing(s));
        const maintenance = deviceState.status === 'maintenance' || deviceState.status === 'fault';

        return {
            deviceState,
            weather,
            sessions: todaySessions.map(s => ({
                ...s,
                isEnded: isSessionEnded(s),
                isOngoing: isSessionOngoing(s),
                suggestions: generateScheduleSuggestions(s)
            })),
            summary: {
                scheduledCount: scheduled.length,
                cancelledCount: cancelled.length,
                ongoingCount: ongoing ? 1 : 0,
                totalCount: todaySessions.length,
                nextSession: scheduled.find(s => !isSessionOngoing(s) && !isSessionEnded(s)) || null
            },
            notices,
            festivals,
            tempEvents,
            crowdLevel,
            onSiteStatus: {
                isOpenNow: !!ongoing,
                isMaintenance: maintenance,
                isTemporaryStop: cancelled.length > 0 && scheduled.length === 0,
                hasFullSchedule: scheduled.length > 0,
                statusText: maintenance
                    ? '现场维护中'
                    : ongoing
                        ? '正在开放'
                        : cancelled.length > 0 && scheduled.length === 0
                            ? '临时停开'
                            : scheduled.length > 0
                                ? '按计划开放'
                                : '今日无场次'
            },
            canOpen: deviceState.status === 'normal' && !weather.isWindy,
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
        isEnergyPeakTime,
        getDeviceState,
        setDeviceState,
        getWeather,
        setWeather,
        WIND_THRESHOLD,
        WIND_STOP_THRESHOLD,
        getFestivals,
        addFestival,
        updateFestival,
        deleteFestival,
        getFestivalsForDate,
        getCrowdLevelForDate,
        getTempEvents,
        addTempEvent,
        updateTempEvent,
        deleteTempEvent,
        getTempEventsForDate,
        linkSchedulesToEvent,
        getEnergyPolicy,
        updateEnergyPolicy,
        ENERGY_PEAK_HOURS,
        generateScheduleSuggestions,
        applyScheduleSuggestion,
        addMinutes,
        subtractMinutes,
        getSchedules,
        getTodaySessions,
        getFutureSessions,
        addSchedule,
        updateSchedule,
        addAbnormalReason,
        deleteSchedule,
        cancelSchedule,
        restoreSchedule,
        getMaintenanceLogs,
        addMaintenanceLog,
        getVisitorNotices,
        addVisitorNotice,
        dismissVisitorNotice,
        getActiveVisitorNotices,
        canModifySchedule,
        getPublicStatus,
        resetAllData
    };
})();
