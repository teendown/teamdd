import { createClient } from '@supabase/supabase-js';

let _client = null;
let _currentUrl = '';
let _currentKey = '';

/**
 * Supabase 클라이언트 인스턴스 반환 (동적 생성/캐싱)
 * URL/Key 변경 시 새 클라이언트 생성
 */
export function getSupabaseClient(url, key) {
  if (!url || !key) return null;
  // 새 크리덴셜이면 클라이언트 재생성
  if (_client && url === _currentUrl && key === _currentKey) {
    return _client;
  }
  try {
    _client = createClient(url.trim(), key.trim(), {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    _currentUrl = url;
    _currentKey = key;
    return _client;
  } catch (e) {
    console.error('Supabase client creation error:', e);
    return null;
  }
}

/**
 * LocalStorage에서 크리덴셜을 읽어 자동으로 클라이언트 반환
 */
export function getAutoClient() {
  const url = localStorage.getItem('supabase_url') || '';
  const key = localStorage.getItem('supabase_anon_key') || '';
  return getSupabaseClient(url, key);
}

/**
 * 연결 테스트: customers 테이블 조회 시도
 */
export async function testConnection(url, key) {
  if (!url || !key) {
    return { ok: false, message: 'URL과 Anon Key를 입력해 주세요.' };
  }
  const client = getSupabaseClient(url, key);
  if (!client) {
    return { ok: false, message: 'Supabase 클라이언트 생성 실패.' };
  }
  try {
    const { error } = await client.from('customers').select('id').limit(1);
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return {
          ok: true,
          isTableMissing: true,
          message: '✓ Supabase 연결 성공 (테이블 미생성 - SQL Editor에서 스키마 실행 필요)'
        };
      }
      return { ok: false, message: `연결 오류: ${error.message}` };
    }
    return { ok: true, isTableMissing: false, message: '✓ Supabase 클라우드 데이터베이스 연결 성공!' };
  } catch (err) {
    return { ok: false, message: `연결 실패: ${err.message}` };
  }
}
