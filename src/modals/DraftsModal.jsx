// 🎨 TEAM D.D DRAFTS MODAL COMPONENT (3-DAY AUTO-EXPIRY TTL DRAFTS MANAGER)
import React from 'react';

export default function DraftsModal({
  isOpen,
  onClose,
  onLoadDraft,
  draftsList = [],
  onDeleteDraft,
  onClearAll
}) {
  if (!isOpen) return null;

  const formatRemainingTime = (savedAt) => {
    if (!savedAt) return '3일 보관';
    const expiresAt = new Date(savedAt).getTime() + 3 * 24 * 60 * 60 * 1000;
    const diffMs = expiresAt - Date.now();
    if (diffMs <= 0) return '만료됨';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days}일 ${hours % 24}시간 남음`;
    }
    return `${hours}시간 남음`;
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        className="modal-content card-box"
        style={{
          maxWidth: '720px',
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '0',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '1rem 1.25rem',
            backgroundColor: 'var(--c-navy-dark)',
            color: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '900', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📂</span>
              {`임시보관함 (${draftsList.length}건)`}
            </h3>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px' }}>
              ⏱️ 임시저장된 문서는 정식 DB와 격리되며, 3일(72시간) 후 자동으로 안전하게 폐기됩니다.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '1.25rem',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            ✕
          </button>
        </div>

        {/* Body List */}
        <div style={{ padding: '1rem 1.25rem', flex: 1, backgroundColor: '#F8FAFC' }}>
          {draftsList.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</div>
              <div style={{ fontSize: '0.9375rem', fontWeight: '800', color: 'var(--c-navy-dark)' }}>
                임시보관된 문서가 없습니다.
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                작성 화면에서 '📝 임시저장' 버튼을 누르면 언제든지 작성 중인 내용을 보관할 수 있습니다.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {draftsList.map((draft, idx) => {
                const savedDateStr = draft.saved_at
                  ? new Date(draft.saved_at).toLocaleString('ko-KR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : '';
                const custName = draft.customer?.name || draft.customer_name || '거래처 미지정';
                const itemsCount = (draft.items || []).length;
                const firstItem = draft.items && draft.items[0] ? draft.items[0].name : '';
                const remainStr = formatRemainingTime(draft.saved_at);

                return (
                  <div
                    key={draft.draft_id || idx}
                    style={{
                      padding: '0.875rem 1rem',
                      borderRadius: '10px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: '800',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--c-blue-lightest)',
                            color: 'var(--c-navy-primary)',
                            border: '1px solid var(--c-blue-soft)'
                          }}
                        >
                          {draft.docType || draft.doc_type || '거래명세서'}
                        </span>
                        <span style={{ fontSize: '0.9375rem', fontWeight: '900', color: 'var(--c-navy-dark)' }}>
                          {custName}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: '800',
                            color: '#D97706',
                            backgroundColor: '#FEF3C7',
                            padding: '1px 5px',
                            borderRadius: '4px'
                          }}
                        >
                          {`⏱️ ${remainStr}`}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        {firstItem ? `${firstItem} 외 ${itemsCount}건 품목` : `품목 ${itemsCount}건`}
                        {` · 임시저장일시: ${savedDateStr}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ fontWeight: '800' }}
                        onClick={() => {
                          onLoadDraft(draft);
                          onClose();
                        }}
                      >
                        ✍️ 불러와서 이어쓰기
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ color: '#D92D20', borderColor: '#FECDCA', backgroundColor: '#FEF3F2' }}
                        onClick={() => onDeleteDraft(draft.draft_id)}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '0.875rem 1.25rem',
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottomLeftRadius: '16px',
            borderBottomRightRadius: '16px'
          }}
        >
          {draftsList.length > 0 ? (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ color: '#D92D20', borderColor: '#FECDCA' }}
              onClick={onClearAll}
            >
              🗑️ 임시보관함 전체 비우기
            </button>
          ) : (
            <div />
          )}
          <button
            type="button"
            className="btn btn-outline"
            style={{ height: '34px', fontSize: '0.8125rem' }}
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
