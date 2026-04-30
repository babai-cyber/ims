import { useEffect, useState } from 'react'
import axios from 'axios'
import RCAForm from './RCAForm'

const API = import.meta.env.VITE_API_URL || ''

const NEXT_STATUS: Record<string, string> = {
  OPEN: 'INVESTIGATING', INVESTIGATING: 'RESOLVED', RESOLVED: 'CLOSED',
}
const STATUS_COLORS: Record<string, string> = {
  OPEN: '#c94c4c', INVESTIGATING: '#c9a84c', RESOLVED: '#4c9ac9', CLOSED: '#4caf7d',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function IncidentDetail({ id, onClose }: { id: string; onClose: () => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null)
  const [showRCA, setShowRCA] = useState(false)
  const [error, setError] = useState('')
  const [advancing, setAdvancing] = useState(false)

  const load = async () => {
    try {
      const { data: d } = await axios.get(`${API}/api/work-items/${id}`)
      setData(d)
    } catch (e) { console.error(e) }
  }

  useEffect(() => { load() }, [id])

  const advance = async () => {
    setError(''); setAdvancing(true)
    try {
      const next = NEXT_STATUS[data.workItem.status]
      await axios.patch(`${API}/api/work-items/${id}/status`, { status: next })
      await load()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      setError(err.response?.data?.error || 'Failed to advance status')
    }
    setAdvancing(false)
  }

  if (!data) return (
    <div style={{ padding: '3rem', color: '#7a7d90', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      Loading incident details...
    </div>
  )

  const { workItem, signals, rca } = data

  return (
    <div style={{ overflowY: 'auto', padding: '1.5rem', background: '#0d0f14' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '1.5rem', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600 }}>{workItem.title}</h2>
          <div style={{ fontSize: 12, color: '#7a7d90' }}>{workItem.componentId} · ID: {workItem.id.slice(0, 8)}...</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: '1px solid #2a2e3e', color: '#7a7d90', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>✕</button>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: '1.5rem' }}>
        {[
          ['Status', workItem.status, STATUS_COLORS[workItem.status]],
          ['Priority', workItem.priority, '#c9a84c'],
          ['Signals', String(workItem.signalCount), '#4c9ac9'],
          ['Started', new Date(workItem.startTime).toLocaleString(), null],
          ['MTTR', workItem.mttr ? `${workItem.mttr.toFixed(1)} min` : '—', null],
          ['RCA', rca ? '✓ Complete' : '✗ Missing', rca ? '#4caf7d' : '#c94c4c'],
        ].map(([k, v, color]) => (
          <div key={k as string} style={{ background: '#111520', borderRadius: 8, padding: '0.75rem 1rem', border: '1px solid #1c2030' }}>
            <div style={{ fontSize: 10, color: '#4a4d60', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: (color as string) || '#e8e0cc' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div style={{ background: '#c94c4c18', border: '1px solid #c94c4c55', color: '#e88', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {workItem.status !== 'CLOSED' && (
          <button
            onClick={advance}
            disabled={advancing || (workItem.status === 'RESOLVED' && !rca)}
            style={{
              background: advancing ? '#333' : '#4c9ac9',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              cursor: (advancing || (workItem.status === 'RESOLVED' && !rca)) ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 500,
              opacity: (workItem.status === 'RESOLVED' && !rca) ? 0.5 : 1,
            }}
          >
            {advancing ? '...' : `→ Move to ${NEXT_STATUS[workItem.status]}`}
          </button>
        )}
        {workItem.status === 'RESOLVED' && !rca && (
          <button
            onClick={() => setShowRCA(!showRCA)}
            style={{ background: '#c9a84c', color: '#0d0f14', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            {showRCA ? 'Hide RCA Form' : '📋 Fill RCA (required to close)'}
          </button>
        )}
      </div>

      {/* RCA Form */}
      {showRCA && <RCAForm workItemId={id} onSaved={() => { setShowRCA(false); load() }} />}

      {/* RCA display */}
      {rca && (
        <div style={{ background: '#111520', borderRadius: 10, padding: '1rem', border: '1px solid #4caf7d33', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: 12, color: '#4caf7d', marginBottom: 10, fontWeight: 600 }}>✓ RCA Complete</div>
          <div style={{ fontSize: 13, marginBottom: 6 }}><b style={{ color: '#7a7d90' }}>Root Cause:</b> {rca.rootCauseCategory?.replace(/_/g,' ')}</div>
          <div style={{ fontSize: 13, marginBottom: 6 }}><b style={{ color: '#7a7d90' }}>Fix Applied:</b> {rca.fixApplied}</div>
          <div style={{ fontSize: 13 }}><b style={{ color: '#7a7d90' }}>Prevention:</b> {rca.preventionSteps}</div>
        </div>
      )}

      {/* Raw Signals */}
      <div style={{ fontSize: 12, color: '#7a7d90', marginBottom: 8, fontWeight: 500 }}>
        Raw Signals ({signals.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {signals.slice(0, 20).map((s: Record<string, unknown>) => (
          <div key={s._id as string} style={{ background: '#111520', borderRadius: 6, padding: '8px 12px', fontSize: 12, border: '1px solid #1c2030', fontFamily: 'monospace' }}>
            <span style={{ color: '#c9a84c' }}>{s.componentType as string}</span>
            {s.errorCode && <span style={{ color: '#c94c4c', marginLeft: 8 }}>[{s.errorCode as string}]</span>}
            {s.errorMessage && <span style={{ color: '#7a7d90', marginLeft: 8 }}>{s.errorMessage as string}</span>}
            {s.latencyMs && <span style={{ float: 'right', color: '#4a4d60' }}>{s.latencyMs as number}ms</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
