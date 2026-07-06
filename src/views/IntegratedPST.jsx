import React, { useState, useEffect } from 'react';
import { Search, ExternalLink, Loader2 } from 'lucide-react';
import { fetchServices, API_BASE } from '../api';

export default function IntegratedPST() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadServices = async () => {
      try {
        const data = await fetchServices();
        setServices(data || []);
      } catch (err) {
        console.error('Error fetching services:', err);
      } finally {
        setLoading(false);
      }
    };
    loadServices();
  }, []);

  const getLogo = (src) => {
    if (!src) return 'https://i.imgur.com/gAY8c2j.png';
    if (/^https?:\/\//i.test(src)) return src;
    const origin = API_BASE.replace('/api', '');
    return `${origin}/${src}`;
  };

  const getUrl = (raw) => {
    const v = String(raw || '').trim();
    if (!v) return '#';
    return /^https?:\/\//i.test(v) ? v : `https://${v}`;
  };

  const displayUrl = (raw) => {
    return String(raw || '').trim().replace(/^https?:\/\//i, '');
  };

  const filteredServices = services.filter((s) =>
    (s.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Map theme colors to specific Vanilla CSS classes
  const getThemeClass = (tc) => {
    tc = tc || 'bg-mariner-200';
    if (tc.includes('mariner-500')) return 'border-l-blue';
    if (tc.includes('mariner-200')) return 'border-l-teal';
    if (tc.includes('malachite')) return 'border-l-green';
    if (tc.includes('hibiscus')) return 'border-l-pink';
    if (tc.includes('warning')) return 'border-l-orange';
    return 'border-l-gray';
  };

  const getButtonClass = (tc) => {
    tc = tc || 'bg-mariner-200';
    if (tc.includes('mariner-500')) return 'pst-btn-blue';
    if (tc.includes('mariner-200')) return 'pst-btn-teal';
    if (tc.includes('malachite')) return 'pst-btn-green';
    if (tc.includes('hibiscus')) return 'pst-btn-pink';
    if (tc.includes('warning')) return 'pst-btn-orange';
    return 'pst-btn-gray';
  };

  return (
    <div className="animate-fade-in text-gray-800">
      
      {/* Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Pintu Pelayanan Terpadu Terintegrasi</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Akses cepat seluruh layanan terpadu (PST) online resmi BPS Kabupaten Barru.</p>
        </div>

        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Cari layanan online..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-input"
            style={{ paddingLeft: '2.5rem', borderRadius: '99px' }}
          />
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '30vh', gap: '0.5rem' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: '#007aff' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Memuat layanan...</span>
        </div>
      )}

      {!loading && filteredServices.length === 0 && (
        <div className="glass-card" style={{ maxWidth: '400px', margin: '4rem auto', textAlign: 'center', padding: '3rem 2rem' }}>
          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>🔍</span>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Tidak Ditemukan Layanan</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {searchQuery ? `Kami tidak dapat menemukan pencarian "${searchQuery}".` : 'Saat ini belum ada kartu pelayanan terdaftar.'}
          </p>
        </div>
      )}

      {/* Services Grid */}
      {!loading && filteredServices.length > 0 && (
        <div className="pst-grid">
          {filteredServices.map((service) => (
            <div key={service.id} className={`pst-card ${getThemeClass(service.theme_class || service.themeClass)}`}>
              <div>
                <div className="pst-card-header">
                  <div style={{ minWidth: 0 }}>
                    <h3 className="pst-card-title" title={service.title}>{service.title}</h3>
                    <a href={getUrl(service.url)} target="_blank" rel="noreferrer" className="pst-card-url">
                      {displayUrl(service.url)}
                    </a>
                  </div>
                  <div className="pst-logo-box">
                    <img
                      src={getLogo(service.logo)}
                      alt={service.title}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://i.imgur.com/gAY8c2j.png';
                      }}
                    />
                  </div>
                </div>
                <p className="pst-card-desc">{service.description}</p>
              </div>

              <a href={getUrl(service.url)} target="_blank" rel="noreferrer" className={`pst-btn ${getButtonClass(service.theme_class || service.themeClass)}`}>
                <span>Kunjungi Layanan</span>
                <ExternalLink size={14} />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
