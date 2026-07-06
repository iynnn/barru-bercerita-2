import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Compass, HelpCircle, Settings, LogOut, Menu, X, BarChart2, ShieldCheck, Database, Calendar } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../api';

export default function SidebarLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDbFallback, setIsDbFallback] = useState(false);
  const [currentDate, setCurrentDate] = useState('');

  // Diagnostic check to detect database state
  useEffect(() => {
    const checkDbStatus = async () => {
      try {
        await axios.get(`${API_BASE}/dashboard.php?action=options`);
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
    navigate('/login');
  };

  const isLoggedIn = !!localStorage.getItem('authToken');

  const navItems = [
    { name: 'Home Portal', path: '/landing-page', icon: <BarChart2 size={16} /> },
    { name: 'Dashboard Data', path: '/dashboard', icon: <LayoutDashboard size={16} /> },
    { name: 'PST Services', path: '/IntegratedPST', icon: <Compass size={16} /> },
    { name: 'Panduan', path: '/Help', icon: <HelpCircle size={16} /> },
    { name: 'Admin Portal', path: '/ManageServices', icon: <Settings size={16} /> }
  ];

  return (
    <>
      {/* Background Animated Blobs (Outside Grid Container) */}
      <div className="bg-blobs no-print">
        <div className="blob blob-blue"></div>
        <div className="blob blob-purple"></div>
        <div className="blob blob-teal"></div>
      </div>

      {/* Mobile Sticky Header Header (Shown only on small viewports) */}
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
        
        {/* Desktop App Sidebar Navigation (Sticky) */}
        <aside className="app-sidebar no-print">
          <div>
            {/* Logo Branding */}
            <Link to="/landing-page" className="brand-section">
              <div className="brand-icon">
                <BarChart2 size={22} />
              </div>
              <div>
                <h2 className="brand-name">Barru Bercerita</h2>
                <span className="brand-tagline">Rebuild Portal v2.0</span>
              </div>
            </Link>

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
              <button onClick={handleLogout} className="logout-btn">
                <LogOut size={16} />
                <span>Keluar Admin</span>
              </button>
            ) : (
              <div style={{ fontSize: '0.65rem', color: '#aeaeae', fontWeight: 600, paddingLeft: '1rem' }}>
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
                 location.pathname.includes('Help') ? 'Panduan Penggunaan' : 
                 location.pathname.includes('ManageServices') ? 'Portal Administrator' :
                 location.pathname.includes('login') ? 'Masuk Kredensial' : 'Pintu Portal Utama'}
              </h1>
              <p className="flex items-center gap-1.5 mt-1" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={12} className="text-gray-400" />
                <span>{currentDate}</span>
              </p>
            </div>

            {/* Database active indicator */}
            <div>
              {isDbFallback ? (
                <span className="status-pill status-fallback" title="MySQL MAMP mati. Data dimuat dari cadangan berkas JSON lokal.">
                  <Database size={12} />
                  JSON Fallback Active
                </span>
              ) : (
                <span className="status-pill status-active" title="Koneksi database MySQL MAMP berjalan normal.">
                  <ShieldCheck size={12} />
                  Connected Database
                </span>
              )}
            </div>
          </div>

          {/* Inject Active view layout */}
          <Outlet />
        </section>

      </div>
    </>
  );
}
