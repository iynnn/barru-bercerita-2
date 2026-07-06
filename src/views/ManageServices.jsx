import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Edit3, Plus, X, Upload, Check, Loader2, RefreshCw, Layers, Sliders } from 'lucide-react';
import { fetchServices, createService, updateService, deleteService, syncBpsData, fetchBpsVariables, fetchSnapshotsSettings, saveSnapshotsSettings, fetchDataTables, API_BASE } from '../api';
import SearchableMultiSelect from '../components/SearchableMultiSelect';

export default function ManageServices() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pst'); // 'pst', 'sync', or 'snapshots'
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // BPS Sync form states
  const [syncDomain, setSyncDomain] = useState('7310');
  const [syncStart, setSyncStart] = useState('100');
  const [syncEnd, setSyncEnd] = useState('125');
  const [syncVars, setSyncVars] = useState(['81', '34', '52']);
  const [syncing, setSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState(['Terminal siap. Klik Mulai Sinkronisasi untuk mengunduh data BPS...']);

  const [bpsVarsList, setBpsVarsList] = useState([]);
  const [loadingVars, setLoadingVars] = useState(false);

  // Snapshots configurations states
  const [allIndicators, setAllIndicators] = useState([]);
  const [selectedSnapshotIds, setSelectedSnapshotIds] = useState([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [savingSnapshots, setSavingSnapshots] = useState(false);

  useEffect(() => {
    const loadBpsVars = async () => {
      setLoadingVars(true);
      try {
        const data = await fetchBpsVariables(syncDomain);
        setBpsVarsList(data || []);
      } catch (err) {
        console.error('Error loading BPS variables:', err);
      } finally {
        setLoadingVars(false);
      }
    };
    if (activeTab === 'sync') {
      loadBpsVars();
    }
  }, [syncDomain, activeTab]);

  useEffect(() => {
    const loadSnapshotsConfig = async () => {
      setLoadingSnapshots(true);
      try {
        const data = await fetchSnapshotsSettings();
        setAllIndicators(data.indicators || []);
        setSelectedSnapshotIds(data.selected_ids || []);
      } catch (err) {
        console.error('Error loading snapshots settings:', err);
      } finally {
        setLoadingSnapshots(false);
      }
    };
    if (activeTab === 'snapshots') {
      loadSnapshotsConfig();
    }
  }, [activeTab]);

  const handleSaveSnapshots = async () => {
    if (selectedSnapshotIds.length > 6) {
      alert('Maksimum snapshot utama dashboard adalah 6 indikator.');
      return;
    }
    setSavingSnapshots(true);
    try {
      await saveSnapshotsSettings(selectedSnapshotIds);
      alert('Konfigurasi snapshot utama dashboard berhasil disimpan!');
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan konfigurasi snapshot.');
    } finally {
      setSavingSnapshots(false);
    }
  };

  // PST Form State
  const [formId, setFormId] = useState(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [themeClass, setThemeClass] = useState('bg-mariner-200');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewLogo, setPreviewLogo] = useState('');
  const [existingLogo, setExistingLogo] = useState('');

  const colorOptions = [
    { label: 'Biru Muda', value: 'bg-mariner-200', color: '#00b4d8' },
    { label: 'Biru Utama', value: 'bg-mariner-500', color: '#007aff' },
    { label: 'Hijau', value: 'bg-malachite-800', color: '#34c759' },
    { label: 'Merah Muda', value: 'bg-hibiscus-500', color: '#af52de' },
    { label: 'Kuning', value: 'bg-warning', color: '#ff9500' },
    { label: 'Abu-abu', value: 'bg-gray-400', color: '#8e8e93' },
  ];

  // Auth protection check
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/login?redirect=/ManageServices');
    }
  }, [navigate]);

  const loadServices = async () => {
    setLoading(true);
    try {
      const data = await fetchServices();
      setServices(data || []);
    } catch (err) {
      console.error('Error fetching services:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const getLogo = (src) => {
    if (!src) return 'https://i.imgur.com/gAY8c2j.png';
    if (/^https?:\/\//i.test(src)) return src;
    const origin = API_BASE.replace('/api', '');
    return `${origin}/${src}`;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0] || null;
    setUploadedFile(file);
    if (file) {
      setPreviewLogo(URL.createObjectURL(file));
    } else {
      setPreviewLogo(existingLogo ? getLogo(existingLogo) : '');
    }
  };

  const resetForm = () => {
    setFormId(null);
    setTitle('');
    setUrl('');
    setDescription('');
    setThemeClass('bg-mariner-200');
    setUploadedFile(null);
    setPreviewLogo('');
    setExistingLogo('');
    setIsEditing(false);
    const fileInput = document.getElementById('logo-upload');
    if (fileInput) fileInput.value = '';
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;

    setSubmitting(true);
    const fd = new FormData();
    fd.append('title', title.trim());
    fd.append('url', url.trim());
    fd.append('description', description.trim());
    fd.append('theme_class', themeClass);
    if (uploadedFile) fd.append('logo', uploadedFile);

    try {
      if (isEditing) {
        fd.append('_method', 'PATCH');
        const data = await updateService(formId, fd);
        setServices(services.map(s => s.id === data.id ? data : s));
        alert('Layanan PST berhasil diperbarui.');
      } else {
        const data = await createService(fd);
        setServices([data, ...services]);
        alert('Layanan PST baru berhasil ditambahkan.');
      }
      resetForm();
    } catch (err) {
      console.error(err);
      alert('Gagal memproses pengiriman data.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (service) => {
    setIsEditing(true);
    setFormId(service.id);
    setTitle(service.title || '');
    setUrl(service.url || '');
    setDescription(service.description || '');
    setThemeClass(service.theme_class || service.themeClass || 'bg-mariner-200');
    setUploadedFile(null);
    setExistingLogo(service.logo || '');
    setPreviewLogo(service.logo ? getLogo(service.logo) : '');
  };

  const handleDeleteClick = async (id) => {
    if (!window.confirm('Hapus layanan terintegrasi ini secara permanen?')) return;
    try {
      await deleteService(id);
      setServices(services.filter(s => s.id !== id));
      alert('Layanan berhasil dihapus.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerSync = async () => {
    setSyncing(true);
    setSyncLogs([
      `[${new Date().toLocaleTimeString()}] Memulai sinkronisasi ${syncVars.length} variabel...`
    ]);

    const varList = syncVars.map(Number);
    const startYear = parseInt(syncStart);
    const endYear = parseInt(syncEnd);
    let successCount = 0;

    // Generate 2-year BPS th parameter chunks
    const yearChunks = [];
    for (let yr = startYear; yr <= endYear; yr += 2) {
      const yrEnd = Math.min(endYear, yr + 1);
      yearChunks.push({ start: yr, end: yrEnd });
    }

    for (let i = 0; i < varList.length; i++) {
      const varId = varList[i];
      const varMeta = bpsVarsList.find(v => v.id === varId) || { name: `Variabel ID ${varId}` };
      
      setSyncLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Menghubungi API BPS untuk: ${varMeta.name} (ID: ${varId})...`
      ]);

      let varSuccess = true;

      for (let j = 0; j < yearChunks.length; j++) {
        const chunk = yearChunks[j];
        
        // Render approximate years label
        const yrLabelStart = chunk.start - 100 + 2010;
        const yrLabelEnd = chunk.end - 100 + 2010;
        const periodText = yrLabelStart === yrLabelEnd ? `${yrLabelStart}` : `${yrLabelStart}-${yrLabelEnd}`;

        setSyncLogs(prev => [
          ...prev,
          `   -> Sinkronisasi periode tahun ${periodText} (BPS ID: ${chunk.start}-${chunk.end})...`
        ]);

        try {
          await syncBpsData({
            domain: syncDomain,
            start: chunk.start,
            end: chunk.end,
            varIds: [varId]
          });
        } catch (err) {
          console.error(err);
          varSuccess = false;
          setSyncLogs(prev => [
            ...prev,
            `   -> GAGAL untuk periode ${periodText}: ${err.response?.data?.message || err.message || 'Error koneksi BPS.'}`
          ]);
          break; // Stop querying more years for this variable if one chunk fails
        }
      }

      if (varSuccess) {
        successCount++;
        setSyncLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Sukses menyinkronkan seluruh periode untuk: ${varMeta.name}!`,
          `[${new Date().toLocaleTimeString()}] Database & JSON backup diperbarui.`
        ]);
      } else {
        setSyncLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] GAGAL menyinkronkan seluruh periode untuk: ${varMeta.name}.`
        ]);
      }
    }

    setSyncLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Selesai! Berhasil menyinkronkan ${successCount} dari ${varList.length} variabel.`
    ]);
    setSyncing(false);
  };

  return (
    <div className="animate-fade-in text-gray-800">
      
      {/* Tab Navigation header */}
      <div className="admin-tab-nav">
        <button 
          onClick={() => setActiveTab('pst')} 
          className={`admin-tab-btn ${activeTab === 'pst' ? 'active' : ''}`}
        >
          Manajemen Layanan PST
        </button>
        <button 
          onClick={() => setActiveTab('sync')} 
          className={`admin-tab-btn ${activeTab === 'sync' ? 'active' : ''}`}
        >
          Sinkronisasi BPS API
        </button>
        <button 
          onClick={() => setActiveTab('snapshots')} 
          className={`admin-tab-btn ${activeTab === 'snapshots' ? 'active' : ''}`}
        >
          Konfigurasi Snapshot Dashboard
        </button>
      </div>

      {/* TAB 1: PST CRUD Operations */}
      {activeTab === 'pst' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* CRUD Form card */}
          <div className="glass-card">
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              {isEditing ? 'Ubah Kartu Layanan PST' : 'Tambah Kartu Layanan PST Baru'}
            </h3>

            <form onSubmit={handleFormSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <span className="filter-label">Judul Layanan</span>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Aplikasi Silasik"
                    className="glass-input"
                    required
                  />
                </div>

                <div>
                  <span className="filter-label">Tautan Alamat (URL)</span>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Contoh: barrukab.bps.go.id/silasik"
                    className="glass-input"
                    required
                  />
                </div>

                <div>
                  <span className="filter-label">Deskripsi Singkat</span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tulis penjelasan singkat mengenai layanan ini..."
                    className="glass-input"
                    style={{ minHeight: '80px', resize: 'none' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.85rem' }}>
                {/* Logo upload field */}
                <div>
                  <span className="filter-label">Berkas Logo / Icon</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem' }}>
                    <label className="glass-btn" style={{ background: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                      <Upload size={14} />
                      Pilih Gambar
                      <input type="file" id="logo-upload" onChange={handleFileUpload} style={{ display: 'none' }} accept="image/*" />
                    </label>
                    {previewLogo && (
                      <div className="pst-logo-box" style={{ width: '42px', height: '42px' }}>
                        <img src={previewLogo} alt="Preview" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Preset Glow theme select */}
                <div>
                  <span className="filter-label">Warna Aksen Border</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.25rem' }}>
                    {colorOptions.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setThemeClass(opt.value)}
                        className="glass-btn"
                        style={{ 
                          padding: '0.4rem 0.8rem', 
                          fontSize: '0.75rem',
                          background: themeClass === opt.value ? 'white' : 'rgba(255,255,255,0.4)',
                          borderColor: themeClass === opt.value ? 'var(--primary)' : 'rgba(0,0,0,0.06)'
                        }}
                      >
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: opt.color, display: 'inline-block', marginRight: '4px' }} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-end', marginTop: '1rem' }}>
                  {isEditing && (
                    <button type="button" onClick={resetForm} className="glass-btn glass-btn-secondary">
                      Batal
                    </button>
                  )}
                  <button type="submit" disabled={submitting} className="glass-btn glass-btn-primary">
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : 'Simpan Layanan'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* List display table */}
          <div className="data-table-box">
            <h4 className="table-title">Daftar Layanan Terdaftar</h4>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <Loader2 size={24} className="animate-spin" style={{ color: '#007aff', margin: '0 auto' }} />
              </div>
            ) : services.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center' }}>
                Belum ada layanan terdaftar.
              </div>
            ) : (
              <div className="table-scroll">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>No</th>
                      <th style={{ width: '60px' }}>Logo</th>
                      <th>Nama Layanan</th>
                      <th>Alamat URL</th>
                      <th style={{ width: '100px', textAlign: 'right' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((item, idx) => (
                      <tr key={item.id}>
                        <td>{idx + 1}</td>
                        <td>
                          <div className="pst-logo-box" style={{ width: '32px', height: '32px', padding: '0.2rem' }}>
                            <img 
                              src={getLogo(item.logo)} 
                              alt="Logo" 
                              onError={(e) => { e.target.onerror = null; e.target.src = 'https://i.imgur.com/gAY8c2j.png'; }}
                            />
                          </div>
                        </td>
                        <td style={{ fontWeight: 700 }}>{item.title}</td>
                        <td style={{ color: '#007aff' }}>{item.url}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                            <button onClick={() => handleEditClick(item)} className="glass-btn" style={{ padding: '0.4rem' }}>
                              <Edit3 size={12} />
                            </button>
                            <button onClick={() => handleDeleteClick(item.id)} className="glass-btn" style={{ padding: '0.4rem', color: 'var(--danger)' }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BPS API Sync */}
      {activeTab === 'sync' && (
        <div className="glass-card" style={{ position: 'relative', maxWidth: '600px', margin: '0 auto', overflow: 'visible', zIndex: 999, backdropFilter: 'none', WebkitBackdropFilter: 'none', background: 'rgba(255, 255, 255, 0.9)' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Hubungkan & Sinkronkan BPS Web-API
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <span className="filter-label">Kode Wilayah Domain BPS</span>
              <input
                type="text"
                value={syncDomain}
                onChange={(e) => setSyncDomain(e.target.value)}
                className="glass-input"
                placeholder="7310 (Kabupaten Barru)"
              />
            </div>

            <div>
              <span className="filter-label">Daftar Variabel BPS yang disinkronisasi</span>
              {loadingVars ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0' }}>
                  <Loader2 size={12} className="animate-spin" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Memuat daftar variabel BPS...</span>
                </div>
              ) : (
                <SearchableMultiSelect
                  options={bpsVarsList}
                  selectedValues={syncVars}
                  placeholder="Pilih variabel BPS yang akan di-sinkron..."
                  labelSelected="Variabel Terpilih"
                  onChange={(newValues) => setSyncVars(newValues)}
                />
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <span className="filter-label">Kode Awal Tahun BPS</span>
                <input
                  type="number"
                  value={syncStart}
                  onChange={(e) => setSyncStart(e.target.value)}
                  className="glass-input"
                />
              </div>
              <div>
                <span className="filter-label">Kode Akhir Tahun BPS</span>
                <input
                  type="number"
                  value={syncEnd}
                  onChange={(e) => setSyncEnd(e.target.value)}
                  className="glass-input"
                />
              </div>
            </div>

            <button 
              onClick={handleTriggerSync} 
              disabled={syncing} 
              className="glass-btn glass-btn-primary" 
              style={{ width: '100%', marginTop: '1rem' }}
            >
              {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              <span>{syncing ? 'Proses Penarikan Data...' : 'Mulai Sinkronisasi Data'}</span>
            </button>

            {/* Sync Console Outputs */}
            <div>
              <span className="filter-label">Log Konsol Aktivitas</span>
              <div className="admin-terminal-log">
                {syncLogs.map((log, index) => (
                  <div key={index}>{log}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Dashboard Snapshots Configuration */}
      {activeTab === 'snapshots' && (
        <div className="glass-card" style={{ position: 'relative', maxWidth: '600px', margin: '0 auto', overflow: 'visible', zIndex: 999, backdropFilter: 'none', WebkitBackdropFilter: 'none', background: 'rgba(255, 255, 255, 0.9)' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={16} />
            <span>Pengaturan Snapshot Utama Dashboard</span>
          </h3>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '1.5rem' }}>
            Pilih hingga <strong>maksimal 6 indikator utama</strong> yang akan dipasang sebagai kartu ringkasan cepat (snapshot) di baris teratas Dashboard utama. 
            <br />
            <span style={{ color: 'var(--primary-dark)', fontWeight: 600 }}>* Catatan: Jika kosong, dashboard secara otomatis akan menampilkan 6 data dengan tanggal rilis terbaru secara dinamis.</span>
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <span className="filter-label">Indikator Snapshot Terpilih (Maksimal 6)</span>
              {loadingSnapshots ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0' }}>
                  <Loader2 size={12} className="animate-spin" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Memuat pengaturan snapshot...</span>
                </div>
              ) : (
                <SearchableMultiSelect
                  options={allIndicators}
                  selectedValues={selectedSnapshotIds}
                  placeholder="Pilih indikator snapshot..."
                  labelSelected="Indikator Snapshot Terpilih"
                  onChange={(newValues) => {
                    if (newValues.length > 6) {
                      alert('Maksimum snapshot yang diperbolehkan adalah 6 indikator.');
                      return;
                    }
                    setSelectedSnapshotIds(newValues);
                  }}
                />
              )}
            </div>

            <button 
              onClick={handleSaveSnapshots}
              disabled={savingSnapshots || loadingSnapshots}
              className="glass-btn glass-btn-primary" 
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              {savingSnapshots ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              <span>Simpan Konfigurasi Snapshot</span>
            </button>
          </div>
        </div>
      )}

      {/* Styled Responsive overrides */}
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 768px) {
          form {
            grid-template-columns: 1fr !important;
          }
        }
      `}} />
    </div>
  );
}
