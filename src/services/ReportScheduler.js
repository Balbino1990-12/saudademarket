const fs = require('fs');
const path = require('path');

const SCHEDULES_PATH = path.join(__dirname, '../../reports/scheduled_reports.json');

class ReportScheduler {
  static async ensureStorage() {
    const dir = path.dirname(SCHEDULES_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(SCHEDULES_PATH)) {
      fs.writeFileSync(SCHEDULES_PATH, JSON.stringify([]), 'utf8');
    }
  }

  static async getSchedules() {
    await ReportScheduler.ensureStorage();
    const content = fs.readFileSync(SCHEDULES_PATH, 'utf8');
    return JSON.parse(content || '[]');
  }

  static async saveSchedule(schedule) {
    await ReportScheduler.ensureStorage();
    const schedules = await ReportScheduler.getSchedules();
    const newSchedule = {
      id: Date.now(),
      name: schedule.name,
      frequency: schedule.frequency,
      format: schedule.format || 'csv',
      filters: schedule.filters || {},
      createdAt: new Date().toISOString(),
      lastRun: null
    };
    schedules.push(newSchedule);
    fs.writeFileSync(SCHEDULES_PATH, JSON.stringify(schedules, null, 2), 'utf8');
    return newSchedule;
  }
}

module.exports = ReportScheduler;
