// 🎨 TEAM D.D AUTHENTICATION SERVICE
import { STORAGE_KEYS } from '../config/constants.js';

export function getStoredSession() {
  return {
    isLoggedIn: !!sessionStorage.getItem(STORAGE_KEYS.LOGGED_IN),
    userRole: sessionStorage.getItem(STORAGE_KEYS.USER_ROLE) || 'supplier',
    selectedSupplierKey: sessionStorage.getItem(STORAGE_KEYS.SELECTED_SUPPLIER) || localStorage.getItem(STORAGE_KEYS.SELECTED_SUPPLIER) || 'sejin'
  };
}

export function loginUser(supplierKey, role = 'supplier') {
  sessionStorage.setItem(STORAGE_KEYS.LOGGED_IN, 'true');
  sessionStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
  sessionStorage.setItem(STORAGE_KEYS.SELECTED_SUPPLIER, supplierKey);
  localStorage.setItem(STORAGE_KEYS.SELECTED_SUPPLIER, supplierKey);
  return { isLoggedIn: true, userRole: role, selectedSupplierKey: supplierKey };
}

export function logoutUser() {
  sessionStorage.removeItem(STORAGE_KEYS.LOGGED_IN);
  sessionStorage.removeItem(STORAGE_KEYS.USER_ROLE);
  return { isLoggedIn: false, userRole: 'supplier' };
}
