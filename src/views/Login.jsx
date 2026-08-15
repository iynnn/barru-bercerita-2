import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ShieldAlert, User, Eye, EyeOff } from 'lucide-react';
import { loginUser } from '../api';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  const redirectUrl = searchParams.get('redirect') || '/ManageServices';

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await loginUser(username, password);
      if (res && res.success) {
        localStorage.setItem('authToken', res.token || 'auth-token-barru-2026');
        if (res.user) {
          localStorage.setItem('user', JSON.stringify(res.user));
          localStorage.setItem('authUser', JSON.stringify(res.user));
        }
        navigate(redirectUrl);
      } else {
        throw new Error(res.error || 'Username atau password tidak cocok.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || err.message || 'Username atau password salah.');
      setShake(true);
      setPassword('');
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
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
            autoFocus
          />

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input 
              type={showPassword ? 'text' : 'password'} 
              placeholder="Masukkan Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass-input"
              style={{ textAlign: 'center', paddingRight: '5rem' }}
              required
            />
            
            {/* Toggle Show/Hide Password */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? 'Sembunyikan Password' : 'Tampilkan Password'}
              style={{ 
                position: 'absolute', 
                right: '44px', 
                width: '32px', 
                height: '32px', 
                borderRadius: '8px', 
                background: 'rgba(0,0,0,0.04)', 
                border: 'none', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                cursor: 'pointer',
                color: 'var(--text-secondary)'
              }}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={loading}
              title="Masuk"
              style={{ 
                position: 'absolute', 
                right: '8px', 
                width: '32px', 
                height: '32px', 
                borderRadius: '8px', 
                background: 'var(--accent-color, #007aff)', 
                color: '#ffffff',
                border: 'none', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                cursor: 'pointer' 
              }}
            >
              <ArrowRight size={15} className={loading ? 'animate-pulse' : ''} />
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
      </div>
    </div>
  );
}
