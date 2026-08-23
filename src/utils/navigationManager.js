// 🎨 TEAM D.D MOBILE BACK BUTTON & NAVIGATION MANAGER
/**
 * Handles browser popstate events, modal/drawer back handler stacks (LIFO),
 * tab screen history, and exit confirmation logic.
 */

// LIFO stack of registered back handlers (e.g. open modals, sidebars, sheets)
const backHandlers = [];

// Screen / Tab history stack
const tabHistory = [];

let isListening = false;
let onTriggerExitModalCallback = null;
let lastBackPressTime = 0;

/**
 * Push a tab to the history stack (avoiding consecutive duplicates)
 */
export function pushTabHistory(tab) {
  if (!tab) return;
  if (tabHistory.length === 0 || tabHistory[tabHistory.length - 1] !== tab) {
    tabHistory.push(tab);
  }
}

/**
 * Pop the current tab and return the previous tab
 */
export function popTabHistory() {
  if (tabHistory.length <= 1) {
    return null;
  }
  tabHistory.pop(); // Remove current
  return tabHistory[tabHistory.length - 1] || null;
}

/**
 * Check if there is a previous tab in the history stack
 */
export function canGoBackTab() {
  return tabHistory.length > 1;
}

/**
 * Get current tab history stack (shallow copy)
 */
export function getTabHistory() {
  return [...tabHistory];
}

/**
 * Register a back handler (for modals, drawers, overlays).
 * Returns an unregister function.
 * @param {Function} handler - Function called on back. If it returns true (or void), back action is handled.
 * @param {string} [name] - Optional name for debugging
 */
export function registerBackHandler(handler, name = 'anonymous') {
  const item = { handler, name, id: Date.now() + Math.random() };
  backHandlers.push(item);

  return () => {
    const idx = backHandlers.findIndex(h => h.id === item.id);
    if (idx !== -1) {
      backHandlers.splice(idx, 1);
    }
  };
}

/**
 * Check if any modal or drawer is currently in the back handler stack
 */
export function hasOpenModals() {
  return backHandlers.length > 0;
}

/**
 * Manually trigger the back button logic (used by UI back buttons)
 */
export function triggerBackAction({ onNavigateTab }) {
  // 1. Priority 1: Top-most Modal / Drawer in LIFO stack
  if (backHandlers.length > 0) {
    const top = backHandlers.pop();
    try {
      const handled = top.handler();
      if (handled !== false) {
        return;
      }
    } catch (err) {
      console.error('Error executing back handler:', err);
    }
  }

  // 2. Priority 2: Screen / Tab Navigation History
  if (tabHistory.length > 1) {
    const previousTab = popTabHistory();
    if (previousTab && onNavigateTab) {
      onNavigateTab(previousTab, false);
      return;
    }
  }

  // 3. Priority 3: Root screen -> Trigger Exit Confirmation Modal
  if (onTriggerExitModalCallback) {
    onTriggerExitModalCallback();
  }
}

/**
 * Set the callback function to show the Exit Confirmation Modal
 */
export function setExitModalTrigger(cb) {
  onTriggerExitModalCallback = cb;
}

/**
 * Perform exit app action
 */
export function performExitApp() {
  try {
    // Try to close window if opened via script or PWA
    window.close();
  } catch (e) {
    console.warn('window.close() failed', e);
  }

  // If window.close() is blocked, try history.go back or navigate to blank
  try {
    if (window.history.length > 1) {
      window.history.go(-1);
    }
  } catch (e) {
    console.warn('history.go(-1) failed', e);
  }
}

/**
 * Initialize history state & popstate listener
 */
export function initNavigationManager({ onNavigateTab, onExitConfirm }) {
  if (onExitConfirm) {
    setExitModalTrigger(onExitConfirm);
  }

  // Push an initial history state so back button can be intercepted
  try {
    if (!window.history.state || !window.history.state.teamDdApp) {
      window.history.replaceState({ teamDdApp: true, step: 'root' }, '');
      window.history.pushState({ teamDdApp: true, step: 'active' }, '');
    }
  } catch (e) {
    console.error('History pushState error:', e);
  }

  if (isListening) return;
  isListening = true;

  window.addEventListener('popstate', (e) => {
    // Always re-push a dummy state to keep the popstate interceptor alive
    try {
      window.history.pushState({ teamDdApp: true, step: 'active' }, '');
    } catch (err) {
      // Ignore
    }

    // 1. Priority 1: Top-most Modal / Drawer in LIFO stack
    if (backHandlers.length > 0) {
      const top = backHandlers.pop();
      try {
        const handled = top.handler();
        if (handled !== false) {
          return;
        }
      } catch (err) {
        console.error('Error executing back handler:', err);
      }
    }

    // 2. Priority 2: Screen / Tab Navigation History
    if (tabHistory.length > 1) {
      const previousTab = popTabHistory();
      if (previousTab && onNavigateTab) {
        onNavigateTab(previousTab, false); // false indicates this is a back navigation
        return;
      }
    }

    // 3. Priority 3: Root screen -> Trigger Exit Confirmation Modal
    const now = Date.now();
    if (onTriggerExitModalCallback) {
      onTriggerExitModalCallback();
    } else {
      // Fallback: Double-back within 2 seconds
      if (now - lastBackPressTime < 2000) {
        performExitApp();
      } else {
        lastBackPressTime = now;
        if (window.showToast) {
          window.showToast('뒤로가기 버튼을 한 번 더 누르면 앱이 종료됩니다.');
        } else {
          alert('뒤로가기 버튼을 한 번 더 누르면 앱이 종료됩니다.');
        }
      }
    }
  });
}
