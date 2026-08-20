// 🎨 TEAM D.D SUPPLIER SERVICE
import { dbFetch, dbSave, dbDelete } from '../api/supabaseClient.js';
import { INITIAL_SUPPLIERS_LIST, DEFAULT_SUPPLIERS } from '../config/defaults.js';
import { areSupplierKeysEquivalent } from '../utils/validation.js';

export async function fetchSuppliers() {
  return dbFetch('suppliers', INITIAL_SUPPLIERS_LIST, 'code');
}

export async function saveSupplier(supplierData, isEdit = false, currentList = []) {
  return dbSave('suppliers', supplierData, isEdit, currentList);
}

export async function deleteSupplier(supplierId, currentList = []) {
  return dbDelete('suppliers', supplierId, currentList);
}

export function resolveActiveSupplier(supplierKey, suppliersList = []) {
  const found = (suppliersList || []).find(s => areSupplierKeysEquivalent(s.id, supplierKey) || s.code === supplierKey);
  if (found) {
    return {
      ...found,
      company: found.name || found.company,
      tel: found.phone || found.tel,
      hasStamp: areSupplierKeysEquivalent(supplierKey, 'sejin') ? true : !!found.hasStamp
    };
  }
  if (DEFAULT_SUPPLIERS[supplierKey]) {
    return DEFAULT_SUPPLIERS[supplierKey];
  }
  return DEFAULT_SUPPLIERS.sejin;
}
