'use client';

import { useEffect, useState } from 'react';

interface LogEntry {
  id: string;
  user_id: string;
  timestamp: string;
  incoming_message: string;
  detected_intent: string;
  pending_action_found: string | null;
  handler_used: string;
  parsed_data: Record<string, any> | null;
  response_sent: string;
  error: string | null;
  processing_time_ms: number;
}

export default function DebugPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/debug');
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setLogs(data.logs || []);
        setError(null);
      }
    } catch (err) {
      setError('Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fmtTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const fmtDate = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const intentColor = (intent: string) => {
    if (intent.startsWith('query')) return '#8b5cf6';
    if (intent === 'expense') return '#22c55e';
    if (intent === 'income') return '#3b82f6';
    if (intent === 'pending_response') return '#f59e0b';
    if (intent === 'undo') return '#ef4444';
    if (intent === 'fallback') return '#71717a';
    return '#a1a1aa';
  };

  return (
    <div style={{
      background: '#0a0a0b', color: '#fafafa', minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      padding: '24px 16px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Caixinha Debug</h1>
            <p style={{ color: '#71717a', fontSize: 13, margin: '4px 0 0' }}>
              Caixa-preta — {logs.length} logs carregados
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label style={{ color: '#a1a1aa', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh 5s
            </label>
            <input
              type="text"
              placeholder="Filtrar..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                background: '#27272a', border: '1px solid #3f3f46', color: '#fafafa',
                padding: '6px 12px', borderRadius: 6, fontSize: 13, width: 180,
                outline: 'none',
              }}
            />
            <button
              onClick={fetchLogs}
              style={{
                background: '#27272a', border: '1px solid #3f3f46', color: '#fafafa',
                padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
              }}
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            background: '#1c1017', border: '1px solid #7f1d1d', borderRadius: 8,
            padding: '12px 16px', marginBottom: 16, color: '#fca5a5', fontSize: 14,
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <p style={{ color: '#71717a' }}>Carregando...</p>
        ) : logs.length === 0 ? (
          <div style={{
            background: '#141418', border: '1px solid #27272a', borderRadius: 8,
            padding: '40px 20px', textAlign: 'center', color: '#71717a',
          }}>
            Nenhum log ainda. Manda uma mensagem no WhatsApp e atualiza.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {logs.filter((log) => {
              if (!filter) return true;
              const f = filter.toLowerCase();
              return (
                (log.incoming_message || '').toLowerCase().includes(f) ||
                (log.detected_intent || '').toLowerCase().includes(f) ||
                (log.handler_used || '').toLowerCase().includes(f) ||
                (log.response_sent || '').toLowerCase().includes(f) ||
                (log.error || '').toLowerCase().includes(f)
              );
            }).map((log) => (
              <div
                key={log.id}
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                style={{
                  background: log.error ? '#1c1017' : '#141418',
                  border: `1px solid ${log.error ? '#7f1d1d' : '#27272a'}`,
                  borderRadius: 8, padding: '14px 18px', cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ color: '#71717a', fontSize: 12, fontFamily: 'monospace', minWidth: 90 }}>
                    {fmtDate(log.timestamp)} {fmtTime(log.timestamp)}
                  </span>
                  <span style={{
                    background: intentColor(log.detected_intent) + '22',
                    color: intentColor(log.detected_intent),
                    padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                    fontFamily: 'monospace',
                  }}>
                    {log.detected_intent}
                  </span>
                  <span style={{ color: '#a1a1aa', fontSize: 12, fontFamily: 'monospace' }}>
                    {log.handler_used}
                  </span>
                  <span style={{ color: '#71717a', fontSize: 11, fontFamily: 'monospace', marginLeft: 'auto' }}>
                    {log.processing_time_ms}ms
                  </span>
                </div>

                {/* Message */}
                <div style={{ marginTop: 8 }}>
                  <span style={{ color: '#22c55e', fontSize: 13, fontFamily: 'monospace' }}>IN: </span>
                  <span style={{ color: '#fafafa', fontSize: 14 }}>{log.incoming_message}</span>
                </div>
                <div style={{ marginTop: 4 }}>
                  <span style={{ color: '#3b82f6', fontSize: 13, fontFamily: 'monospace' }}>OUT: </span>
                  <span style={{ color: '#a1a1aa', fontSize: 14 }}>
                    {log.response_sent.length > 120
                      ? log.response_sent.substring(0, 120) + '...'
                      : log.response_sent}
                  </span>
                </div>

                {log.error && (
                  <div style={{ marginTop: 6, color: '#fca5a5', fontSize: 13, fontFamily: 'monospace' }}>
                    ERROR: {log.error.substring(0, 200)}
                  </div>
                )}

                {log.pending_action_found && (
                  <div style={{ marginTop: 4, color: '#f59e0b', fontSize: 12, fontFamily: 'monospace' }}>
                    PENDING: {log.pending_action_found}
                  </div>
                )}

                {/* Expanded details */}
                {expandedId === log.id && (
                  <div style={{
                    marginTop: 12, paddingTop: 12, borderTop: '1px solid #27272a',
                  }}>
                    <pre style={{
                      background: '#0a0a0b', padding: 12, borderRadius: 6,
                      fontSize: 12, fontFamily: 'monospace', color: '#a1a1aa',
                      overflow: 'auto', maxHeight: 300, whiteSpace: 'pre-wrap',
                    }}>
{JSON.stringify({
  user_id: log.user_id,
  parsed_data: log.parsed_data,
  pending_action_found: log.pending_action_found,
  handler_used: log.handler_used,
  processing_time_ms: log.processing_time_ms,
  error: log.error,
  response_sent_full: log.response_sent,
}, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
