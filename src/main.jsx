// 🎨 TEAM D.D REACT 18 ENTRY POINT
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

const rootElement = document.getElementById('root');

if (rootElement) {
  const loadingIndicator = document.getElementById('loading-indicator');
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
  } catch (error) {
    console.error('TEAM D.D Application Mount Error:', error);
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
    if (window.showError) {
      window.showError('앱 초기화 오류', error.message || String(error));
    }
  }
}
