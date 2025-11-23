/**
 * Indian Holiday Manager
 * 
 * Manages Indian holidays and calculates working days
 * Part of Precision Pivot system - Indian Context
 */

class HolidayManager {
    constructor(logger, db) {
        this.logger = logger || console;
        this.db = db;
        this.holidays = this.loadHolidays();
    }

    /**
     * Get holidays between dates
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @param {Object} options - Options (state, includeWeekends)
     * @returns {Array} Array of holidays
     */
    async getHolidays(startDate, endDate, options = {}) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const holidays = [];

        // Get all holidays in range
        this.holidays.forEach(holiday => {
            const holidayDate = new Date(holiday.date);
            if (holidayDate >= start && holidayDate <= end) {
                // Filter by state if specified
                if (!options.state || !holiday.states || holiday.states.includes(options.state)) {
                    holidays.push(holiday);
                }
            }
        });

        // Include weekends if requested
        if (options.includeWeekends) {
            const weekendDays = this.getWeekendDays(start, end);
            holidays.push(...weekendDays);
        }

        return holidays.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    /**
     * Calculate working days excluding holidays
     */
    calculateWorkingDays(startDate, endDate, holidays = null) {
        if (!holidays) {
            holidays = this.getHolidays(startDate, endDate);
        }

        let workingDays = 0;
        const current = new Date(startDate);
        const end = new Date(endDate);
        const holidayDates = new Set(holidays.map(h => h.date));

        while (current <= end) {
            const dayOfWeek = current.getDay();
            const dateStr = current.toISOString().split('T')[0];

            // Exclude weekends (Saturday = 6, Sunday = 0)
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                // Exclude holidays
                if (!holidayDates.has(dateStr)) {
                    workingDays++;
                }
            }

            current.setDate(current.getDate() + 1);
        }

        return workingDays;
    }

    /**
     * Get festival impact factor
     */
    getFestivalImpact(startDate, endDate) {
        const festivals = [
            { name: 'Diwali', month: 10, impact: 0.7 }, // 30% reduction
            { name: 'Holi', month: 2, impact: 0.8 }, // 20% reduction
            { name: 'Dussehra', month: 9, impact: 0.85 }, // 15% reduction
            { name: 'New Year', month: 0, impact: 0.9 } // 10% reduction
        ];

        const startMonth = startDate.getMonth();
        const endMonth = endDate.getMonth();

        for (const festival of festivals) {
            if (startMonth <= festival.month && endMonth >= festival.month) {
                return festival.impact;
            }
        }

        return 1.0; // No impact
    }

    /**
     * Get weekend days
     */
    getWeekendDays(startDate, endDate) {
        const weekends = [];
        const current = new Date(startDate);
        const end = new Date(endDate);

        while (current <= end) {
            const dayOfWeek = current.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                weekends.push({
                    name: dayOfWeek === 0 ? 'Sunday' : 'Saturday',
                    date: current.toISOString().split('T')[0],
                    isPublic: false,
                    isWeekend: true
                });
            }
            current.setDate(current.getDate() + 1);
        }

        return weekends;
    }

    /**
     * Load Indian holidays (2024-2025)
     */
    loadHolidays() {
        return [
            { name: 'Republic Day', date: '2024-01-26', isPublic: true, states: ['all'] },
            { name: 'Holi', date: '2024-03-25', isPublic: true, states: ['all'] },
            { name: 'Good Friday', date: '2024-03-29', isPublic: true, states: ['all'] },
            { name: 'Eid ul-Fitr', date: '2024-04-11', isPublic: true, states: ['all'] },
            { name: 'Independence Day', date: '2024-08-15', isPublic: true, states: ['all'] },
            { name: 'Ganesh Chaturthi', date: '2024-09-07', isPublic: true, states: ['Maharashtra', 'Goa'] },
            { name: 'Dussehra', date: '2024-10-12', isPublic: true, states: ['all'] },
            { name: 'Diwali', date: '2024-10-31', isPublic: true, states: ['all'] },
            { name: 'Guru Nanak Jayanti', date: '2024-11-15', isPublic: true, states: ['all'] },
            { name: 'Christmas', date: '2024-12-25', isPublic: true, states: ['all'] },
            { name: 'New Year', date: '2025-01-01', isPublic: true, states: ['all'] },
            { name: 'Republic Day', date: '2025-01-26', isPublic: true, states: ['all'] }
        ];
    }
}

module.exports = HolidayManager;

