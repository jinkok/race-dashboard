import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // 콘솔에 남겨서 원인 파악을 돕습니다.
    console.error('ErrorBoundary caught an error:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    const syncStatus = typeof window !== 'undefined' ? window.__RACE_SYNC_STATUS__ : undefined;
    const picksStatus = typeof window !== 'undefined' ? window.__RACE_PICKS_STATUS__ : undefined;
    const message = this.state.error?.message || String(this.state.error);

    return (
      <div style={{ padding: 16, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial' }}>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>화면 렌더링 중 오류가 발생했습니다.</div>
        <div style={{ marginBottom: 8, color: '#b91c1c' }}>
          <div style={{ fontWeight: 700 }}>Error</div>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{message}</pre>
        </div>
        <div style={{ marginBottom: 12, color: '#475569', fontSize: 13 }}>
          <div>syncStatus: {syncStatus ?? '-'}</div>
          <div>picksStatus: {picksStatus ?? '-'}</div>
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: '#4f46e5',
            color: 'white',
            padding: '10px 14px',
            border: 0,
            borderRadius: 10,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          새로고침
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;

