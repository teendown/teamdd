// 🎨 TEAM D.D PART SECURITY & NORMALIZATION UTILITIES
import { areSupplierKeysEquivalent } from './validation.js';
import { isAdmin } from '../auth/permissions.js';

/**
 * 부품번호(Part No) 정규화
 * - 영문 대문자 변환
 * - 공백 제거
 * - 검색 비교용 클린 키 생성
 */
export function normalizePartNo(rawPartNo) {
  if (!rawPartNo || typeof rawPartNo !== 'string') return '';
  return rawPartNo.trim().replace(/^PART[-_]?/i, '').toUpperCase();
}

/**
 * 검색 및 중복 매칭용 클린 키 (영문/숫자만 추출, 불필요한 PART- 접두어 자동 제거)
 * 예: "PART-328854" -> "328854"
 * 예: "VOE-14532101" -> "VOE14532101"
 * 예: "1453 2101" -> "14532101"
 */
export function getCleanPartKey(rawPartNo) {
  if (!rawPartNo || typeof rawPartNo !== 'string') return '';
  const stripped = rawPartNo.trim().replace(/^PART[-_]?/i, '');
  return stripped.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * 매입단가 및 원가 정보 접근 권한 검사
 * - 관리자(admin)이거나,
 * - 해당 매입단가의 소유자(supplierKey)와 현재 로그인한 사업자가 동일할 때만 true
 */
export function canAccessPurchasePrice(itemSupplierKey, currentSupplierKey, userRole) {
  if (isAdmin(userRole)) return true;
  if (!itemSupplierKey || !currentSupplierKey) return false;
  return areSupplierKeysEquivalent(itemSupplierKey, currentSupplierKey);
}

/**
 * 사업자별 로컬 스토리지 캐시 격리 키 생성 (캐시 오염 방지)
 */
export function getIsolatedStorageKey(tableName, supplierKey) {
  const safeSupp = (supplierKey || 'unknown').toLowerCase().trim();
  return `dd_${tableName}_${safeSupp}_v1`;
}

/**
 * 거래명세서/견적서 인쇄, 공유, 캔버스 렌더링 시 매입원가 및 비밀정보 원천 소거
 */
export function sanitizeItemForExport(item) {
  if (!item || typeof item !== 'object') return item;
  
  // 깊은 복사 후 매입단가 및 원가 관련 필드 완전 제거
  const safeItem = { ...item };
  delete safeItem.purchase_price;
  delete safeItem.cost_price;
  delete safeItem.buying_price;
  delete safeItem.vendor_name;
  delete safeItem.vendor_bizno;
  delete safeItem.supplier_cost;
  delete safeItem.private_memo;
  
  return safeItem;
}

/**
 * 전표 전체 항목 목록 소거
 */
export function sanitizeDocumentForExport(doc) {
  if (!doc) return doc;
  const safeDoc = { ...doc };
  if (Array.isArray(safeDoc.items)) {
    safeDoc.items = safeDoc.items.map(sanitizeItemForExport);
  }
  return safeDoc;
}
