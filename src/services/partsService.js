// 🎨 TEAM D.D SECURE PARTS & INVENTORY SERVICE
import { getSupabaseClient, dbFetch, dbSave } from '../api/supabaseClient.js';
import { DEMO_PARTS } from '../config/defaults.js';
import { normalizePartNo, getCleanPartKey, canAccessPurchasePrice, getIsolatedStorageKey } from '../utils/partSecurity.js';
import { getLocalItem, setLocalItem } from '../api/storage.js';
import { areSupplierKeysEquivalent, packRow } from '../utils/validation.js';

// 기본 부품 카테고리 목록
export const PART_CATEGORIES = [
  '전체',
  '유압계통',
  '엔진계통',
  '전기/전장',
  '하부/주행',
  '오일/필터',
  '작업장치/버켓',
  '기타소모품'
];

/**
 * 부품 공용 마스터 + 로그인한 사업자의 매입단가/재고 안전 결합 조회
 */
export async function fetchPartsWithPricing(selectedSupplierKey = 'sejin', userRole = 'supplier') {
  // 1. 공용 부품 마스터 로드 (전체 공유)
  let masterParts = [];
  const sb = getSupabaseClient();
  
  if (sb) {
    try {
      const { data, error } = await sb.from('parts').select('*').order('code', { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        masterParts = data;
        setLocalItem('dd_parts_master_v1', data);
      }
    } catch (e) {
      console.warn('[partsService] Supabase 마스터 조회 실패, 캐시 사용:', e);
    }
  }

  if (masterParts.length === 0) {
    masterParts = getLocalItem('dd_parts_master_v1', DEMO_PARTS);
  }

  // 2. 사업자별 매입단가 & 재고 데이터 로드 (철저 격리)
  const pricingKey = getIsolatedStorageKey('part_pricing', selectedSupplierKey);
  let myPricingMap = {}; // { [partCode or cleanKey]: { purchase_price, vendor_name, stock, min_stock, bin_location, memo } }

  if (sb) {
    try {
      const { data, error } = await sb
        .from('supplier_part_pricing')
        .select('*')
        .eq('supplier_key', selectedSupplierKey);
      
      if (!error && Array.isArray(data)) {
        data.forEach(p => {
          const key = getCleanPartKey(p.part_code || p.part_id);
          if (key) myPricingMap[key] = p;
        });
        setLocalItem(pricingKey, myPricingMap);
      }
    } catch (e) {
      // 테이블이 아직 없거나 오류 시 로컬 캐시 사용
    }
  }

  // Supabase 조회가 안 되었거나 결과가 없으면 로컬 격리 스토리지 조회
  if (Object.keys(myPricingMap).length === 0) {
    myPricingMap = getLocalItem(pricingKey, {});
  }

  // 3. 결합 (공용 정보 + 오직 내 매입가/재고만 병합)
  return masterParts.map(p => {
    const cleanKey = getCleanPartKey(p.code);
    const legacyRawKey = (p.code || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const myPricing = myPricingMap[cleanKey] || myPricingMap[legacyRawKey] || {};

    return {
      id: p.id,
      code: normalizePartNo(p.code),
      cleanKey,
      name: p.name || '',
      spec: p.spec || '',
      category: p.category || '기타소모품',
      unit: p.unit || 'EA',
      machine_models: p.machine_models || '',
      price: Number(p.price) || 0, // 권장 판매가 (공개)
      
      // 🔒 내 사업자 전용 격리 데이터 (타 사업자에게는 절대 노출 안 됨)
      purchase_price: myPricing.purchase_price !== undefined ? Number(myPricing.purchase_price) : null,
      vendor_name: myPricing.vendor_name || '',
      stock: myPricing.stock !== undefined ? Number(myPricing.stock) : (Number(p.stock) || 0),
      min_stock: myPricing.min_stock !== undefined ? Number(myPricing.min_stock) : (Number(p.min_stock) || 0),
      bin_location: myPricing.bin_location || '',
      private_memo: myPricing.memo || '',
      has_my_pricing: !!myPricing.purchase_price
    };
  });
}

/**
 * 부품 등록/수정 (공용 마스터 + 사업자별 매입단가 동시 처리)
 */
export async function savePartWithPricing({
  partData,
  selectedSupplierKey = 'sejin',
  isEdit = false,
  currentList = []
}) {
  const normCode = normalizePartNo(partData.code);
  const cleanKey = getCleanPartKey(normCode);
  if (!normCode) throw new Error('부품번호는 필수 입력 항목입니다.');
  if (!partData.name) throw new Error('품명은 필수 입력 항목입니다.');

  // 1. 공용 마스터 페이로드
  const masterPayload = {
    id: partData.id || `part_${Date.now()}`,
    code: normCode,
    name: partData.name.trim(),
    spec: (partData.spec || '').trim(),
    category: partData.category || '기타소모품',
    unit: (partData.unit || 'EA').trim(),
    machine_models: (partData.machine_models || '').trim(),
    price: Number(partData.price) || 0, // 기준 판매가
    is_shared: true
  };

  // 공용 마스터 저장 (Supabase & Local)
  const sb = getSupabaseClient();
  if (sb) {
    try {
      const packed = packRow(masterPayload, 'parts');
      if (isEdit && partData.id) {
        await sb.from('parts').upsert(packed);
      } else {
        await sb.from('parts').upsert(packed, { onConflict: 'code' });
      }
    } catch (e) {
      console.warn('[partsService] Supabase 마스터 저장 경고:', e);
    }
  }

  // 로컬 마스터 캐시 갱신
  const masterList = getLocalItem('dd_parts_master_v1', DEMO_PARTS);
  const existingMasterIdx = masterList.findIndex(p => getCleanPartKey(p.code) === cleanKey);
  if (existingMasterIdx !== -1) {
    masterList[existingMasterIdx] = { ...masterList[existingMasterIdx], ...masterPayload };
  } else {
    masterList.push(masterPayload);
  }
  setLocalItem('dd_parts_master_v1', masterList);

  // 2. 사업자별 격리 매입단가 & 재고 저장
  const pricingKey = getIsolatedStorageKey('part_pricing', selectedSupplierKey);
  const myPricingMap = getLocalItem(pricingKey, {});

  const myPricingData = {
    part_code: normCode,
    supplier_key: selectedSupplierKey,
    purchase_price: partData.purchase_price !== null && partData.purchase_price !== undefined ? Number(partData.purchase_price) : null,
    vendor_name: (partData.vendor_name || '').trim(),
    stock: Number(partData.stock) || 0,
    min_stock: Number(partData.min_stock) || 0,
    bin_location: (partData.bin_location || '').trim(),
    memo: (partData.private_memo || '').trim(),
    updated_at: new Date().toISOString()
  };

  myPricingMap[cleanKey] = myPricingData;
  setLocalItem(pricingKey, myPricingMap);

  if (sb) {
    try {
      await sb.from('supplier_part_pricing').upsert(myPricingData, { onConflict: 'part_code,supplier_key' });
    } catch (e) {
      // 테이블 미존재 시 패스
    }
  }

  // 최신 목록 재조회 반환
  return fetchPartsWithPricing(selectedSupplierKey);
}

/**
 * 내 부품 목록에서 연결 해제 (소프트 딜리트 / 공용 마스터는 보존)
 */
export async function unlinkPartFromMyPricing(partCode, selectedSupplierKey) {
  const cleanKey = getCleanPartKey(partCode);
  const pricingKey = getIsolatedStorageKey('part_pricing', selectedSupplierKey);
  const myPricingMap = getLocalItem(pricingKey, {});

  delete myPricingMap[cleanKey];
  setLocalItem(pricingKey, myPricingMap);

  const sb = getSupabaseClient();
  if (sb) {
    try {
      await sb.from('supplier_part_pricing')
        .delete()
        .match({ part_code: normalizePartNo(partCode), supplier_key: selectedSupplierKey });
    } catch (e) {
      console.warn('[partsService] Supabase 단가 삭제 실패:', e);
    }
  }

  return fetchPartsWithPricing(selectedSupplierKey);
}

// 하위 호환용 래퍼 함수들
export async function fetchParts() {
  const supp = sessionStorage.getItem('selectedSupplierKey') || localStorage.getItem('selectedSupplierKey') || 'sejin';
  return fetchPartsWithPricing(supp);
}

export async function savePart(partData, isEdit = false, currentList = []) {
  const supp = sessionStorage.getItem('selectedSupplierKey') || localStorage.getItem('selectedSupplierKey') || 'sejin';
  return savePartWithPricing({ partData, selectedSupplierKey: supp, isEdit, currentList });
}

export async function deletePart(partId, currentList = []) {
  const supp = sessionStorage.getItem('selectedSupplierKey') || localStorage.getItem('selectedSupplierKey') || 'sejin';
  const found = currentList.find(p => p.id === partId);
  if (found && found.code) {
    return unlinkPartFromMyPricing(found.code, supp);
  }
  return currentList.filter(p => p.id !== partId);
}
