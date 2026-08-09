import { useState } from 'react';
import { Heart, Lock, Mail, User, Key, ArrowRight, PlusCircle, Users } from 'lucide-react';

const API_BASE = import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin;

export default function AuthModal({ onAuthSuccess, initialUser }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [mode, setMode] = useState(initialUser && !initialUser.coupleId ? 'couple-setup' : 'auth'); // 'auth' | 'couple-setup' | 'verification' | 'forgot-password' | 'reset-password'
  
  // Form states
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [createdInviteCode, setCreatedInviteCode] = useState(null);

  // New Verification & Password Reset States
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [resetCodeInput, setResetCodeInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [successMessage, setSuccessMessage] = useState(null);
  
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (data.requiresVerification) {
        setVerificationEmail(data.email);
        setMode('verification');
        setError(data.error || 'Email verification code sent.');
        return;
      }

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
    setSuccessMessage(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to register');
      
      if (data.requiresVerification) {
        setVerificationEmail(data.email);
        setMode('verification');
        setSuccessMessage('A 6-digit verification code has been sent to your email.');
        return;
      }
      
      localStorage.setItem('streaam_token', data.token);
      localStorage.setItem('streaam_username', data.user.username);
      setMode('couple-setup');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verificationEmail, code: verificationCodeInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      
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

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reset code');
      
      setSuccessMessage(data.message || 'Reset code sent to your email!');
      setMode('reset-password');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: resetCodeInput, newPassword: newPasswordInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password reset failed');
      
      setSuccessMessage(data.message || 'Password successfully reset! Please login now.');
      setMode('auth');
      setTab('login');
      // Clear inputs
      setResetCodeInput('');
      setNewPasswordInput('');
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

        {mode === 'auth' && (
          <>
            <h2 className="auth-title">Welcome to Streaam</h2>
            <p className="auth-subtitle">Your private shared theater space ❤️</p>

            <div className="auth-tabs">
              <button 
                className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`}
                onClick={() => { setTab('login'); setError(null); setSuccessMessage(null); }}
              >
                Sign In
              </button>
              <button 
                className={`auth-tab-btn ${tab === 'register' ? 'active' : ''}`}
                onClick={() => { setTab('register'); setError(null); setSuccessMessage(null); }}
              >
                Create Account
              </button>
            </div>

            {successMessage && <div style={{ marginBottom: '1rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.88rem', textAlign: 'center' }}>{successMessage}</div>}
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

                <div style={{ textAlign: 'right', marginTop: '0.25rem', marginBottom: '0.75rem' }}>
                  <button 
                    type="button" 
                    onClick={() => { setMode('forgot-password'); setError(null); setSuccessMessage(null); }} 
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Forgot Password?
                  </button>
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
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
        )}

        {mode === 'verification' && (
          <>
            <h2 className="auth-title">Verify Your Email</h2>
            <p className="auth-subtitle">We sent a 6-digit verification code to <strong>{verificationEmail}</strong></p>

            {successMessage && <div style={{ marginBottom: '1rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.88rem', textAlign: 'center' }}>{successMessage}</div>}
            {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}

            <form className="auth-form" onSubmit={handleVerify}>
              <div>
                <label>6-Digit Code</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="123456" 
                  value={verificationCodeInput}
                  onChange={(e) => setVerificationCodeInput(e.target.value)}
                  style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '1.25rem', fontWeight: 'bold' }}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '0.75rem' }} disabled={loading}>
                {loading ? 'Verifying...' : 'Verify Code & Continue'}
              </button>
              
              <button 
                type="button" 
                onClick={() => { setMode('auth'); setError(null); setSuccessMessage(null); }} 
                className="btn-secondary" 
                style={{ width: '100%', marginTop: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.65rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.9rem' }}
              >
                Back to Sign In
              </button>
            </form>
          </>
        )}

        {mode === 'forgot-password' && (
          <>
            <h2 className="auth-title">Forgot Password</h2>
            <p className="auth-subtitle">Enter your registered email address to receive a 6-digit reset code</p>

            {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}

            <form className="auth-form" onSubmit={handleRequestReset}>
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

              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '0.75rem' }} disabled={loading}>
                {loading ? 'Sending Code...' : 'Send Reset Code'}
              </button>
              
              <button 
                type="button" 
                onClick={() => { setMode('auth'); setError(null); setSuccessMessage(null); }} 
                className="btn-secondary" 
                style={{ width: '100%', marginTop: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.65rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.9rem' }}
              >
                Cancel
              </button>
            </form>
          </>
        )}

        {mode === 'reset-password' && (
          <>
            <h2 className="auth-title">Reset Password</h2>
            <p className="auth-subtitle">Enter the reset code sent to your email and your new password</p>

            {successMessage && <div style={{ marginBottom: '1rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.88rem', textAlign: 'center' }}>{successMessage}</div>}
            {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}

            <form className="auth-form" onSubmit={handleResetPassword}>
              <div>
                <label>6-Digit Reset Code</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="123456" 
                  value={resetCodeInput}
                  onChange={(e) => setResetCodeInput(e.target.value)}
                  style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '1.25rem', fontWeight: 'bold' }}
                  required
                />
              </div>

              <div>
                <label>New Password</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="••••••••" 
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '0.75rem' }} disabled={loading}>
                {loading ? 'Updating Password...' : 'Reset Password'}
              </button>
              
              <button 
                type="button" 
                onClick={() => { setMode('auth'); setError(null); setSuccessMessage(null); }} 
                className="btn-secondary" 
                style={{ width: '100%', marginTop: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.65rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.9rem' }}
              >
                Cancel
              </button>
            </form>
          </>
        )}

        {mode === 'couple-setup' && (
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
