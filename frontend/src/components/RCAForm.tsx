import { useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || ''
const CATEGORIES = [
  'HARDWARE_FAILURE', 'SOFTWARE_BUG', 'CONFIGURATION_ERROR',
  'CAPACITY_EXHAUSTION', 'NETWORK_ISSUE', 'HUMAN_ERROR', 'THIRD_PARTY'
]

interface Props {
  workItemId: string
  onSaved: () => void
}

type FormKey = 'incidentStart' | 'incidentEnd' | 'rootCauseCategory' | 'fixApplied' | 'preventionSteps'

export default function RCAForm({ workItemId, onSaved }: Props) {
  const [form, setForm] = useState<Record<FormKey, string>>({
    incidentStart: '', incidentEnd: '', rootCauseCategory: '', fixApplied: '', preventionSteps: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setSaving(true); setError('')
    try {
      await axios.post(`${API}/api/work-items/${workItemId}/rca`, form)
      onSaved()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      setError(err.response?.data?.error || 'Error saving RCA')
    }
    setSaving(false)
  }

  const inputStyle = {
    width: '100%',
    background: '#0d0f14',
    border: '1px solid #2a2e3e',
    color: '#e8e0cc',
    borderRadius: 6,
    padding: '8px 10px',
    fontSize: 13,
    boxSizing: 'border-box' as const,
    fontFamily: 'system-ui, sans-serif',
  }

  const set = (key: FormKey) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  return (
    <div style={{ background: '#111520', borderRadius: 10, padding: '1.2rem', border: '1px solid #c9a84c33', marginBottom: '1.5rem' }}>
      <div style={{ fontSize: 14, color: '#c9a84c', marginBottom: 14, fontWeight: 600 }}>📋 Root Cause Analysis</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: '#7a7d90', marginBottom: 4 }}>Incident Start *</label>
          <input type="datetime-local" value={form.incidentStart} onChange={set('incidentStart')} style={inputStyle} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: '#7a7d90', marginBottom: 4 }}>Incident End *</label>
          <input type="datetime-local" value={form.incidentEnd} onChange={set('incidentEnd')} style={inputStyle} />
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 11, color: '#7a7d90', marginBottom: 4 }}>Root Cause Category *</label>
        <select value={form.rootCauseCategory} onChange={set('rootCauseCategory')} style={inputStyle}>
          <option value="">Select category...</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 11, color: '#7a7d90', marginBottom: 4 }}>Fix Applied *</label>
        <textarea
          value={form.fixApplied}
          onChange={set('fixApplied')}
          rows={3}
          placeholder="Describe what fix was applied..."
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 11, color: '#7a7d90', marginBottom: 4 }}>Prevention Steps *</label>
        <textarea
          value={form.preventionSteps}
          onChange={set('preventionSteps')}
          rows={3}
          placeholder="Describe steps to prevent recurrence..."
          style={inputStyle}
        />
      </div>

      {error && <div style={{ color: '#e88', fontSize: 13, marginBottom: 10 }}>⚠ {error}</div>}

      <button
        onClick={save}
        disabled={saving}
        style={{
          background: saving ? '#444' : '#c9a84c',
          color: '#0d0f14',
          border: 'none',
          borderRadius: 8,
          padding: '9px 20px',
          cursor: saving ? 'not-allowed' : 'pointer',
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        {saving ? 'Saving...' : 'Save RCA'}
      </button>
    </div>
  )
}
