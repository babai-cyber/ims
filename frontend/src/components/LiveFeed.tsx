import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || ''

const PRIORITY_COLORS: Record<string, string> = {
  P0: '#c94c4c', P1: '#e8862a', P2: '#c9a84c', P3: '#4caf7d',
}
const STATUS_COLORS: Record<string, string> = {
  OPEN: '#c94c4c', INVESTIGATING: '#c9a84c', RESOLVED: '#4c9ac9', CLOSED: '#4caf7d',
}

interface WorkItem {
  id: string
  componentId: string
  title: string
  status: string
  priority: string
  signalCount: number
  startTime: string
}

interface Props {
  onSelect: (id: string) => void
  selectedId: string | null
}

export default function LiveFeed({ onSelect, selectedId }: Props) {
  const [incidents, setIncidents] = useState<WorkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/work-items`)
      setIncidents(data.data || [])
      setLastRefresh(new Date())
    } catch (e) {
      console.error('Failed to load incidents:', e)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [load])

  const activeCount = incidents.filter(i => i.status !== 'CLOSED').length

  if (loading) {
    return <div style={{ padding: '2rem', color: '#7a7d90' }}>Loading incidents...</div>
  }

  return (
    <div style={{ overflowY: 'auto', borderRight: '1px solid #2a2e3e', background: '#111520' }}>
      {/* Header */}
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #2a2e3e', position: 'sticky', top: 0, background: '#111520', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: '#7a7d90' }}>Active Incidents</span>
          {activeCount > 0 && (
            <span style={{ background: '#c94c4c', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 600 }}>
              {activeCount}
            </span>
          )}
          <button
            onClick={load}
            style={{ marginLeft: 'auto', background: 'none', border: '1px solid #2a2e3e', color: '#7a7d90', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 11 }}
          >
            ↻ Refresh
          </button>
        </div>
        <div style={{ fontSize: 10, color: '#4a4d60' }}>
          Auto-refresh every 5s · Last: {lastRefresh.toLocaleTimeString()}
        </div>
      </div>

      {incidents.length === 0 && (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#4a4d60' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
          <div>No active incidents</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Run seed/seed.sh to simulate failures</div>
        </div>
      )}

      {incidents.map(inc => (
        <div
          key={inc.id}
          onClick={() => onSelect(inc.id)}
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #1c2030',
            cursor: 'pointer',
            background: selectedId === inc.id ? '#1c2030' : 'transparent',
            borderLeft: selectedId === inc.id ? `3px solid ${PRIORITY_COLORS[inc.priority] || '#4c9ac9'}` : '3px solid transparent',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { if (selectedId !== inc.id) (e.currentTarget as HTMLElement).style.background = '#161924' }}
          onMouseLeave={e => { if (selectedId !== inc.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <div style={{ display: 'flex', gap: 6, marginBottom: 5, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ background: (PRIORITY_COLORS[inc.priority] || '#888') + '25', color: PRIORITY_COLORS[inc.priority] || '#888', padding: '1px 7px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
              {inc.priority}
            </span>
            <span style={{ background: (STATUS_COLORS[inc.status] || '#888') + '20', color: STATUS_COLORS[inc.status] || '#888', padding: '1px 7px', borderRadius: 4, fontSize: 11 }}>
              {inc.status}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: '#4a4d60' }}>
              {new Date(inc.startTime).toLocaleTimeString()}
            </span>
          </div>
          <div style={{ fontSize: 13, color: '#e8e0cc', marginBottom: 3, fontWeight: 500 }}>{inc.title}</div>
          <div style={{ fontSize: 11, color: '#7a7d90' }}>
            {inc.componentId} · {inc.signalCount} signal{inc.signalCount !== 1 ? 's' : ''}
          </div>
        </div>
      ))}
    </div>
  )
}
