import { useState } from 'react'
import LiveFeed from './components/LiveFeed'
import IncidentDetail from './components/IncidentDetail'

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#0d0f14', minHeight: '100vh', color: '#e8e0cc' }}>
      <header style={{ padding: '1rem 2rem', borderBottom: '1px solid #2a2e3e', display: 'flex', alignItems: 'center', gap: 12, background: '#111520' }}>
        <span style={{ fontSize: 20, color: '#c94c4c' }}>⬤</span>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: '-0.3px' }}>
          Incident Management System
        </h1>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#7a7d90', background: '#1c2030', padding: '3px 10px', borderRadius: 20 }}>
          Zeotap IMS v1.0
        </span>
      </header>

      <div style={{
        display: 'grid',
        gridTemplateColumns: selectedId ? '420px 1fr' : '1fr',
        height: 'calc(100vh - 57px)',
        overflow: 'hidden',
      }}>
        <LiveFeed onSelect={setSelectedId} selectedId={selectedId} />
        {selectedId && <IncidentDetail id={selectedId} onClose={() => setSelectedId(null)} />}
      </div>
    </div>
  )
}
