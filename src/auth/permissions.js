// 🎨 TEAM D.D AUTHORIZATION & PERMISSION RULES
import { areSupplierKeysEquivalent } from '../utils/validation.js';

export function isAdmin(userRole) {
  return userRole === 'admin';
}

export function canAccessSupplierData(itemSupplierKey, currentSupplierKey, userRole) {
  if (isAdmin(userRole)) return true;
  if (!itemSupplierKey) return true;
  return areSupplierKeysEquivalent(itemSupplierKey, currentSupplierKey);
}

export function canEditSupplierProfile(targetSupplierId, currentSupplierKey, userRole) {
  if (isAdmin(userRole)) return true;
  return areSupplierKeysEquivalent(targetSupplierId, currentSupplierKey);
}

export function canViewSchedule(schedule, currentSupplierKey, userRole) {
  if (isAdmin(userRole)) return true;
  if (schedule.is_shared === true) return true;
  if (!schedule.supplier_key) return true;
  return areSupplierKeysEquivalent(schedule.supplier_key, currentSupplierKey);
}
