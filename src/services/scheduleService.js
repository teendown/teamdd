// 🎨 TEAM D.D SCHEDULE SERVICE
import { dbFetch, dbSave, dbDelete } from '../api/supabaseClient.js';
import { DEMO_SCHEDULES } from '../config/defaults.js';

export async function fetchSchedules() {
  return dbFetch('schedules', DEMO_SCHEDULES, 'start_date');
}

export async function saveSchedule(scheduleData, isEdit = false, currentList = []) {
  return dbSave('schedules', scheduleData, isEdit, currentList);
}

export async function deleteSchedule(scheduleId, currentList = []) {
  return dbDelete('schedules', scheduleId, currentList);
}
