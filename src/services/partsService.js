// 🎨 TEAM D.D PARTS SERVICE
import { dbFetch, dbSave, dbDelete } from '../api/supabaseClient.js';
import { DEMO_PARTS } from '../config/defaults.js';

export async function fetchParts() {
  return dbFetch('parts', DEMO_PARTS, 'code');
}

export async function savePart(partData, isEdit = false, currentList = []) {
  return dbSave('parts', partData, isEdit, currentList);
}

export async function deletePart(partId, currentList = []) {
  return dbDelete('parts', partId, currentList);
}
