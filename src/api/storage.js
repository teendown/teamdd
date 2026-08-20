// 🎨 TEAM D.D LOCAL STORAGE & DRAFTS STORE HELPERS
import { STORAGE_KEYS } from '../config/constants.js';

export const getLocalItem = (key, fallback) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
};

export const setLocalItem = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('LocalStorage write error for key:', key, e);
  }
};

export const removeLocalItem = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (e) {}
};

// ── 임시보관함(Drafts) & 자동 만료(TTL: 3일) 매니저 ─────────────────────────
const DRAFT_TTL_DAYS = 3;

export function getDraftDocuments() {
  const rawList = getLocalItem(STORAGE_KEYS.DRAFTS, []);
  const now = Date.now();
  const validList = rawList.filter(d => {
    if (!d.saved_at) return true;
    const diffDays = (now - new Date(d.saved_at).getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= DRAFT_TTL_DAYS;
  });

  if (validList.length !== rawList.length) {
    setLocalItem(STORAGE_KEYS.DRAFTS, validList);
  }
  return validList;
}

export function saveDraftDocument(draftState) {
  const drafts = getDraftDocuments();
  const now = new Date();
  const summaryTitle = `${draftState.customer?.name || '미지정 거래처'} (${draftState.docType || '거래명세서'})`;
  
  let existingIdx = -1;
  if (draftState.draft_id) {
    existingIdx = drafts.findIndex(d => d.draft_id === draftState.draft_id);
  }

  const newDraft = {
    ...draftState,
    draft_id: draftState.draft_id || ('draft_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)),
    saved_at: now.toISOString(),
    saved_label: `${now.getMonth() + 1}월 ${now.getDate()}일 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    summary_title: summaryTitle
  };

  let updatedDrafts;
  if (existingIdx >= 0) {
    updatedDrafts = drafts.map((d, idx) => idx === existingIdx ? newDraft : d);
  } else {
    updatedDrafts = [newDraft, ...drafts];
  }

  setLocalItem(STORAGE_KEYS.DRAFTS, updatedDrafts);
  return { updatedDrafts, savedDraft: newDraft };
}

export function deleteDraftDocument(draftId) {
  const drafts = getDraftDocuments();
  const updated = drafts.filter(d => d.draft_id !== draftId);
  setLocalItem(STORAGE_KEYS.DRAFTS, updated);
  return updated;
}

export function clearAllDrafts() {
  setLocalItem(STORAGE_KEYS.DRAFTS, []);
  return [];
}
