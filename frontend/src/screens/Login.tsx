import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// Small helper to get API base URL
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

type Role = 'farmer' | 'customer'

export default function Login() {
  const [activeRole, setActiveRole] = useState<Role>('farmer')
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Login</h1>

      <div role="tablist" className="tabs tabs-boxed w-fit mb-6">
        <button
          role="tab"
          className={`tab ${activeRole === 'farmer' ? 'tab-active' : ''}`}
          onClick={() => setActiveRole('farmer')}
        >
          Farmer
        </button>
        <button
          role="tab"
          className={`tab ${activeRole === 'customer' ? 'tab-active' : ''}`}
          onClick={() => setActiveRole('customer')}
        >
          Customer
        </button>
      </div>

      {activeRole === 'farmer' ? (
        <LoginForm role="farmer" />
      ) : (
        <LoginForm role="customer" />
      )}
    </div>
  )
}

function LoginForm({ role }: { role: Role }) {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const label = role === 'farmer' ? 'Kisan card photo' : 'FSSAI licence photo'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Important: current backend login expects JSON (not form-data)
      // and a role value of 'farmer' or 'consumer'. We map 'customer' -> 'consumer'.
      const mappedRole = role === 'customer' ? 'consumer' : 'farmer'

      const res = await fetch(`${API_BASE}/api/v1/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password, role: mappedRole }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.message || 'Login failed')
      }

      // Optionally upload the ID proof right after login if provided
      if (file) {
        try {
          const fd = new FormData()
          fd.append('role', mappedRole)
          fd.append('id_proof', file)
          // This endpoint may need to exist in your backend router:
          // PATCH /api/v1/users/id-proof with auth and upload.single('id_proof')
          await fetch(`${API_BASE}/api/v1/users/id-proof`, {
            method: 'PATCH',
            credentials: 'include',
            body: fd,
          })
          // If it fails, we still allow navigation; file upload is best-effort here.
        } catch (e) {
          // best-effort upload; non-blocking on error
          console.warn('ID proof upload failed (non-blocking):', e)
        }
      }

      // Navigate based on role
      navigate(role === 'farmer' ? '/farmer' : '/customer')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="form-control">
        <label className="label">
          <span className="label-text">Username</span>
        </label>
        <input
          type="text"
          className="input input-bordered"
          placeholder="your-unique-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Password</span>
        </label>
        <input
          type="password"
          className="input input-bordered"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">{label}</span>
        </label>
        <input
          type="file"
          className="file-input file-input-bordered"
          accept="image/*,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          required
        />
        <label className="label">
          <span className="label-text-alt text-base-content/60">
            Accepted formats: images or PDF. Used for verification.
          </span>
        </label>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? 'Logging in…' : 'Login'}
      </button>
    </form>
  )
}
