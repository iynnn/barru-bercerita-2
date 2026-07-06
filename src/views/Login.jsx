import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowRight, ShieldAlert, User } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('admin');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  const redirectUrl = searchParams.get('redirect') || '/ManageServices';

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulasi otentikasi local: username 'admin' & password 'admin'
    setTimeout(() => {
      if (username.trim().toLowerCase() === 'admin' && password === 'admin') {
        localStorage.setItem('authToken', 'mock-mac-desktop-session-token-2026');
        navigate(redirectUrl);
      } else {
        setError('Password atau Username salah. Gunakan admin / admin');
        setShake(true);
        setPassword('');
        setTimeout(() => setShake(false), 500);
      }
      setLoading(false);
    }, 600);
  };

  return (
    <div className="login-screen-box">
      <div className={`login-window ${shake ? 'animate-shake' : ''}`}>
        
        {/* User profile avatar */}
        <div className="login-avatar">
          <User size={32} />
        </div>

        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.2rem' }}>Administrator</h3>
        <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1.75rem' }}>
          Barru Bercerita Portal
        </p>

        {/* Credentials Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input 
            type="text" 
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="glass-input"
            style={{ textAlign: 'center' }}
            required
          />

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input 
              type="password" 
              placeholder="Masukkan Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass-input"
              style={{ textAlign: 'center', paddingRight: '2.75rem' }}
              required
              autoFocus
            />
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                position: 'absolute', 
                right: '8px', 
                width: '32px', 
                height: '32px', 
                borderRadius: '8px', 
                background: 'rgba(0,0,0,0.05)', 
                border: 'none', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                cursor: 'pointer' 
              }}
            >
              <ArrowRight size={14} className={loading ? 'animate-pulse' : ''} />
            </button>
          </div>
        </form>

        {/* Shake Keyframe Injection */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-8px); }
            40%, 80% { transform: translateX(8px); }
          }
          .animate-shake {
            animation: shake 0.4s ease-in-out;
          }
        `}} />

        {error && (
          <div style={{ 
            background: 'rgba(255,59,48,0.1)', 
            color: '#ff3b30', 
            border: '1px solid rgba(255,59,48,0.15)',
            fontSize: '0.7rem', 
            padding: '0.75rem 1rem', 
            borderRadius: '12px', 
            marginTop: '1.25rem',
            textAlign: 'left',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'flex-start'
          }}>
            <ShieldAlert size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ marginTop: '2rem', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
          Kredensial bawaan: <span style={{ fontWeight: 700 }}>admin / admin</span>
        </div>
      </div>
    </div>
  );
}
