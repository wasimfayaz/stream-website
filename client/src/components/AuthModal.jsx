import { useState } from 'react';
import { Heart, Lock, Mail, User, Key, ArrowRight, PlusCircle, Users } from 'lucide-react';

const API_BASE = import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin;

export default function AuthModal({ onAuthSuccess, initialUser }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [mode, setMode] = useState(initialUser && !initialUser.coupleId ? 'couple-setup' : 'auth'); // 'auth' | 'couple-setup'
  
  // Form states
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [createdInviteCode, setCreatedInviteCode] = useState(null);
  
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to login');
      
      localStorage.setItem('streaam_token', data.token);
      localStorage.setItem('streaam_username', data.user.username);
      
      if (!data.user.coupleId) {
        setMode('couple-setup');
      } else {
        onAuthSuccess(data.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register');
      
      localStorage.setItem('streaam_token', data.token);
      localStorage.setItem('streaam_username', data.user.username);
      
      setMode('couple-setup');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCouple = async () => {
    setError(null);
    setLoading(true);
    try {
      const token = localStorage.getItem('streaam_token');
      const res = await fetch(`${API_BASE}/api/auth/create-couple`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create couple space');
      
      localStorage.setItem('streaam_token', data.token);
      setCreatedInviteCode(data.couple.inviteCode);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCouple = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = localStorage.getItem('streaam_token');
      const res = await fetch(`${API_BASE}/api/auth/join-couple`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ inviteCode: inviteCodeInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join couple space');
      
      localStorage.setItem('streaam_token', data.token);
      
      // Fetch updated profile
      const meRes = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${data.token}` }
      });
      const updatedUser = await meRes.json();
      onAuthSuccess(updatedUser);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinishSetup = async () => {
    const token = localStorage.getItem('streaam_token');
    const meRes = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const updatedUser = await meRes.json();
    onAuthSuccess(updatedUser);
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
          <div style={{ background: 'rgba(255,75,110,0.15)', padding: '0.75rem', borderRadius: '50%' }}>
            <Heart size={32} color="#ff4b2b" fill="#ff4b2b" />
          </div>
        </div>

        {mode === 'auth' ? (
          <>
            <h2 className="auth-title">Welcome to Streaam</h2>
            <p className="auth-subtitle">Your private shared theater space ❤️</p>

            <div className="auth-tabs">
              <button 
                className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`}
                onClick={() => { setTab('login'); setError(null); }}
              >
                Sign In
              </button>
              <button 
                className={`auth-tab-btn ${tab === 'register' ? 'active' : ''}`}
                onClick={() => { setTab('register'); setError(null); }}
              >
                Create Account
              </button>
            </div>

            {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}

            {tab === 'login' ? (
              <form className="auth-form" onSubmit={handleLogin}>
                <div>
                  <label>Email Address</label>
                  <div className="form-input-icon" style={{ position: 'relative' }}>
                    <input 
                      type="email" 
                      className="form-input" 
                      placeholder="your.email@example.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label>Password</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
                  {loading ? 'Signing In...' : 'Sign In to Our Space'}
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleRegister}>
                <div>
                  <label>Email Address</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="your.email@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label>Your Name / Username</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Wasim or Edilyn" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label>Password</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Account & Continue'}
                </button>
              </form>
            )}
          </>
        ) : (
          <>
            <h2 className="auth-title">Setup Couple Space</h2>
            <p className="auth-subtitle">Connect with your partner to share a permanent theater space ❤️</p>

            {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}

            {createdInviteCode ? (
              <div style={{ padding: '0.5rem 0' }}>
                <p style={{ fontSize: '0.88rem', color: '#e2e8f0' }}>
                  Share this Invite Code with your girlfriend/partner:
                </p>

                <div className="couple-invite-badge">
                  {createdInviteCode}
                </div>

                <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
                  Once she enters this code during signup, you will both automatically enter your private theater!
                </p>

                <button onClick={handleFinishSetup} className="btn-primary" style={{ width: '100%' }}>
                  Enter Our Theater Space <ArrowRight size={16} style={{ marginLeft: '0.5rem' }} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '0.95rem' }}>Option A: Create New Couple Space</h4>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '1rem' }}>Generate an invite code to pair with your partner.</p>
                  <button onClick={handleCreateCouple} className="btn-primary" style={{ width: '100%' }} disabled={loading}>
                    <PlusCircle size={16} style={{ marginRight: '0.5rem' }} /> {loading ? 'Creating...' : 'Create Couple Space'}
                  </button>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '0.95rem' }}>Option B: Join Partner's Space</h4>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '1rem' }}>Enter the invite code generated by your partner.</p>
                  
                  <form onSubmit={handleJoinCouple} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. WASIM7"
                      value={inviteCodeInput}
                      onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                      style={{ textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}
                      required
                    />
                    <button type="submit" className="btn-primary" style={{ padding: '0.6rem 1rem' }} disabled={loading}>
                      Join
                    </button>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
