import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Compass, HelpCircle, Settings, LogOut, Menu, X, BarChart2, Calendar, Sun, Moon, ExternalLink, Clock, LogIn } from 'lucide-react';
import api from '../api';

export default function SidebarLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDbFallback, setIsDbFallback] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  
  // Theme mode state (light / dark)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('appTheme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('appTheme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Diagnostic check to detect database state
  useEffect(() => {
    const checkDbStatus = async () => {
      try {
        await api.get('dashboard.php', { params: { action: 'options' } });
        setIsDbFallback(false);
      } catch (err) {
        setIsDbFallback(true);
      }
    };
    checkDbStatus();

    // Format current Indonesian Date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(new Date().toLocaleDateString('id-ID', options));
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('authUser');
    navigate('/login');
  };

  const isLoggedIn = !!localStorage.getItem('authToken');

  const navItems = [
    { name: 'Home Portal', path: '/landing-page', icon: <BarChart2 size={16} /> },
    { name: 'Dashboard Data', path: '/dashboard', icon: <LayoutDashboard size={16} /> },
    { name: 'PST Services', path: '/IntegratedPST', icon: <Compass size={16} /> },
    { name: 'Jadwal Jaga PST', path: '/PstSchedule', icon: <Clock size={16} /> },
    { name: 'Panduan', path: '/Help', icon: <HelpCircle size={16} /> },
    { name: 'Admin Portal', path: '/ManageServices', icon: <Settings size={16} /> }
  ];

  return (
    <>
      {/* Background Animated Blobs */}
      <div className="bg-blobs no-print">
        <div className="blob blob-blue"></div>
        <div className="blob blob-purple"></div>
        <div className="blob blob-teal"></div>
      </div>

      {/* Mobile Sticky Header Header */}
      <header className="mobile-header no-print">
        <Link to="/landing-page" className="brand-section" style={{ marginBottom: 0 }}>
          <div className="brand-icon" style={{ width: '32px', height: '32px', borderRadius: '8px' }}>
            <BarChart2 size={16} />
          </div>
          <div>
            <h2 className="brand-name" style={{ fontSize: '0.9rem' }}>Barru Bercerita</h2>
          </div>
        </Link>

        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="mobile-menu-toggle"
        >
          {isMobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
        </button>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="mobile-menu-dropdown">
            {navItems.map((item) => {
              const isActive = location.pathname.includes(item.path.split('/')[1]);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              );
            })}

            {isLoggedIn && (
              <button 
                onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                className="logout-btn"
                style={{ marginTop: '0.5rem' }}
              >
                <LogOut size={16} />
                <span>Keluar Admin</span>
              </button>
            )}
          </div>
        )}
      </header>

      {/* Grid Application Container */}
      <div className="app-container">
        
        {/* Desktop App Sidebar Navigation (Standard Fixed 260px) */}
        <aside className="app-sidebar no-print">
          <div>
            {/* Logo Branding */}
            <div style={{ marginBottom: '2.5rem' }}>
              <Link to="/landing-page" className="brand-section" style={{ marginBottom: 0 }} title="Barru Bercerita">
                <div className="brand-icon">
                  <BarChart2 size={20} />
                </div>
                <div>
                  <h2 className="brand-name">Barru Bercerita</h2>
                  <span className="brand-tagline">Portal Data v2.0</span>
                </div>
              </Link>
            </div>

            {/* Navigation Links */}
            <nav className="nav-menu">
              {navItems.map((item) => {
                const isActive = location.pathname.includes(item.path.split('/')[1]);
                return (
                  <Link 
                    key={item.name} 
                    to={item.path} 
                    className={`nav-link ${isActive ? 'active' : ''}`}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer Logged In Actions */}
          <div className="sidebar-footer">
            {isLoggedIn ? (
              <button 
                onClick={handleLogout} 
                className="logout-btn"
              >
                <LogOut size={16} />
                <span>Keluar Admin</span>
              </button>
            ) : (
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, paddingLeft: '0.5rem' }}>
                Mode Tamu Aktif
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <section className="app-content">
          {/* Top Header info bar */}
          <div className="top-bar no-print">
            <div className="page-title-box">
              <h1>
                {location.pathname.includes('dashboard') ? 'Dashboard Analisis' : 
                 location.pathname.includes('IntegratedPST') ? 'Pelayanan Statistik Terpadu' : 
                 location.pathname.includes('PstSchedule') ? 'Jadwal Piket Jaga PST' : 
                 location.pathname.includes('Help') ? 'Panduan Penggunaan' : 
                 location.pathname.includes('ManageServices') ? 'Portal Administrator' :
                 location.pathname.includes('login') ? 'Masuk Kredensial' : 'Pintu Portal Utama'}
              </h1>
              <p className="flex items-center gap-1.5 mt-1" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={12} className="text-gray-400" />
                <span>{currentDate}</span>
              </p>
            </div>

            {/* Top Bar Actions: Theme Toggle + Database Status Dot */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {/* Dark/Light Mode Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                className="theme-toggle-btn"
                title={theme === 'light' ? 'Beralih ke Mode Gelap' : 'Beralih ke Mode Terang'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '99px',
                  background: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)',
                  border: '1px solid ' + (theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)'),
                  color: 'var(--text-main)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  transition: 'all 0.25s ease'
                }}
              >
                {theme === 'light' ? (
                  <>
                    <Moon size={14} style={{ color: '#5856d6' }} />
                    <span>Mode Gelap</span>
                  </>
                ) : (
                  <>
                    <Sun size={14} style={{ color: '#ffcc00' }} />
                    <span>Mode Terang</span>
                  </>
                )}
              </button>

              {/* Login / Logout Quick Button */}
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="glass-btn"
                  title="Keluar dari akun admin/petugas"
                  style={{ fontSize: '0.75rem', padding: '0.45rem 0.8rem', color: '#ff3b30', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              ) : (
                <Link
                  to="/login"
                  className="glass-btn glass-btn-primary"
                  title="Masuk sebagai Administrator atau Petugas PST"
                  style={{ textDecoration: 'none', fontSize: '0.75rem', padding: '0.45rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <LogIn size={14} />
                  <span>Login Admin</span>
                </Link>
              )}

              {/* Database active indicator (Buletan Ijo / Merah) */}
              <div title={isDbFallback ? "Koneksi Database Terputus (Mode Cadangan JSON Aktif)" : "Koneksi Database Terhubung (MySQL MAMP Aktif)"} style={{ display: 'flex', alignItems: 'center', padding: '0.25rem' }}>
                <span className={`db-status-dot ${isDbFallback ? 'fallback' : 'active'}`} />
              </div>
            </div>
          </div>

          {/* Inject Active view layout */}
          <Outlet />

          {/* Global Footer Source Attribution */}
          <footer style={{ marginTop: '3.5rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }} className="no-print">
            <div>
              © {new Date().getFullYear()} <strong>Barru Bercerita</strong> • Portal Integrasi Data Statistik
            </div>
            <a 
              href="https://barrukab.bps.go.id" 
              target="_blank" 
              rel="noreferrer" 
              style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <span>Sumber Data Resmi: BPS Kabupaten Barru (barrukab.bps.go.id)</span>
              <ExternalLink size={12} />
            </a>
          </footer>
        </section>

      </div>
    </>
  );
}
