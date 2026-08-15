import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Trash2, Edit3, Plus, X, Upload, Check, Loader2, RefreshCw, Layers, Sliders, Database, Search, Info, CheckCircle2, AlertCircle, AlertTriangle, BarChart2, Filter, Eye, EyeOff, ArrowUpDown, FileSpreadsheet, FileDown, Clock, Lock, ShieldAlert, User } from 'lucide-react';
import { 
  fetchServices, 
  fetchServicesAdmin,
  toggleServiceVisibility,
  createService, 
  updateService, 
  deleteService, 
  syncBpsData, 
  fetchBpsVariables, 
  fetchSnapshotsSettings, 
  saveSnapshotsSettings, 
  fetchCrudIndicators, 
  saveIndicator, 
  deleteIndicator,
  fetchSeries,
  fetchSchedule,
  autoGenerateSchedule,
  savePstOfficer,
  updateDaySchedule,
  API_BASE 
} from '../api';
import SearchableMultiSelect from '../components/SearchableMultiSelect';
import PstSchedule from './PstSchedule';

export default function ManageServices() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'pst'); // 'pst', 'dataset', 'sync', or 'snapshots'
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Toast Notification state
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3500);
  };

  // Confirmation Glass Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Ya, Hapus',
    onConfirm: null
  });

  const showConfirm = (title, message, onConfirm, confirmText = 'Ya, Hapus') => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      onConfirm
    });
  };

  const handleCloseConfirm = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  // BPS Sync form states
  const [syncDomain, setSyncDomain] = useState('7310');

  // Schedule & Roster Management States (Unified Admin Portal)
  const [schMonth, setSchMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [schOfficers, setSchOfficers] = useState([]);
  const [schSchedules, setSchSchedules] = useState({});
  const [schPresensiMap, setSchPresensiMap] = useState({});
  const [schSubTab, setSchSubTab] = useState('rekap'); // 'rekap' or 'officers'
  const [schLoading, setSchLoading] = useState(false);
  const [schTeamFilter, setSchTeamFilter] = useState('all');
  const [schGenMode, setSchGenMode] = useState('sequential');
  const [schEditOfficerModal, setSchEditOfficerModal] = useState(null);

  const loadSchData = async (m) => {
    setSchLoading(true);
    try {
      const res = await fetchSchedule(m || schMonth);
      if (res && res.status === 'success') {
        setSchOfficers(res.officers || []);
        setSchSchedules(res.schedules || {});
        setSchPresensiMap(res.presensi || {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSchLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'schedule') {
      loadSchData(schMonth);
    }
  }, [activeTab, schMonth]);

  const handleSchAutoGenerate = async () => {
    setSchLoading(true);
    try {
      const res = await autoGenerateSchedule(schMonth, schGenMode);
      showToast('success', res.message || 'Auto-rotasi 1 bulan berhasil di-generate!');
      loadSchData(schMonth);
    } catch (e) {
      showToast('error', 'Gagal meng-generate jadwal piket.');
    } finally {
      setSchLoading(false);
    }
  };

  const handleSchSaveOfficer = async (e) => {
    e.preventDefault();
    if (!schEditOfficerModal) return;
    try {
      await savePstOfficer(schEditOfficerModal);
      showToast('success', 'Data petugas & tim piket berhasil disimpan!');
      setSchEditOfficerModal(null);
      loadSchData(schMonth);
    } catch (e) {
      showToast('error', 'Gagal menyimpan data petugas.');
    }
  };

  // Calculate monthly statistics per officer for attendance summary
  const schOfficerStats = useMemo(() => {
    const stats = {};
    schOfficers.forEach(o => {
      stats[o.id] = {
        id: o.id,
        name: o.name,
        pool_type: o.pool_type || 'K',
        position: o.position,
        nip: o.nip,
        username: o.username,
        assignedCount: 0,
        hadirCount: 0,
        terlambatCount: 0,
        absentCount: 0,
        lastCheckIn: null
      };
    });

    Object.values(schSchedules).forEach(sch => {
      ['k1', 'k2', 'p', 'r'].forEach(role => {
        const offId = sch[role];
        if (offId && stats[offId]) {
          stats[offId].assignedCount++;
        }
      });
    });

    Object.values(schPresensiMap).forEach(pr => {
      const offId = pr.officer_id;
      if (offId && stats[offId]) {
        if (pr.status === 'terlambat') {
          stats[offId].terlambatCount++;
        } else {
          stats[offId].hadirCount++;
        }
        if (!stats[offId].lastCheckIn || (pr.date + ' ' + pr.check_in_time) > (stats[offId].lastCheckIn.date + ' ' + stats[offId].lastCheckIn.check_in_time)) {
          stats[offId].lastCheckIn = pr;
        }
      }
    });

    Object.values(stats).forEach(s => {
      const checked = s.hadirCount + s.terlambatCount;
      s.absentCount = Math.max(0, s.assignedCount - checked);
      s.rate = s.assignedCount > 0 ? Math.round((checked / s.assignedCount) * 100) : 100;
    });

    return Object.values(stats);
  }, [schOfficers, schSchedules, schPresensiMap]);

  const downloadPresensiExcel = () => {
    let tableHtml = `<table border="1"><thead><tr>
      <th style="background-color:#007aff;color:#fff;">No</th>
      <th style="background-color:#007aff;color:#fff;">Nama Lengkap & Gelar</th>
      <th style="background-color:#007aff;color:#fff;">Tim Jaga</th>
      <th style="background-color:#007aff;color:#fff;">NIP / NIPPPK</th>
      <th style="background-color:#007aff;color:#fff;">Jabatan / Tim Kerja</th>
      <th style="background-color:#007aff;color:#fff;">Username Login</th>
      <th style="background-color:#007aff;color:#fff;">No. WhatsApp</th>
      <th style="background-color:#007aff;color:#fff;">Total Ditugaskan</th>
      <th style="background-color:#007aff;color:#fff;">Hadir Tepat Waktu</th>
      <th style="background-color:#007aff;color:#fff;">Hadir Terlambat</th>
      <th style="background-color:#007aff;color:#fff;">Belum Presensi</th>
      <th style="background-color:#007aff;color:#fff;">Persentase Kehadiran (%)</th>
      <th style="background-color:#007aff;color:#fff;">Log Presensi Terakhir</th>
    </tr></thead><tbody>`;

    schOfficerStats.forEach((st, idx) => {
      const poolLabel = st.pool_type === 'K' ? 'Tim PST (K)' : st.pool_type === 'P' ? 'Tim Pengaduan (P)' : 'Tim Rekomendasi (R)';
      const lastLog = st.lastCheckIn ? `${st.lastCheckIn.date} (${st.lastCheckIn.check_in_time} WITA)` : 'Belum Ada Log';

      tableHtml += `<tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td style="font-weight:bold;">${st.name}</td>
        <td>${poolLabel}</td>
        <td>${st.nip || '—'}</td>
        <td>${st.position || '—'}</td>
        <td>${st.username || '—'}</td>
        <td>${st.phone || '—'}</td>
        <td style="text-align:center;font-weight:bold;">${st.assignedCount} kali</td>
        <td style="text-align:center;color:#248a3d;">${st.hadirCount}</td>
        <td style="text-align:center;color:#ff9500;">${st.terlambatCount}</td>
        <td style="text-align:center;color:#ff3b30;">${st.absentCount}</td>
        <td style="text-align:center;font-weight:bold;">${st.rate}%</td>
        <td>${lastLog}</td>
      </tr>`;
    });

    tableHtml += '</tbody></table>';

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"></head>
      <body>
        <h2>REKAPITULASI PRESENSI PETUGAS PST BPS KABUPATEN BARRU</h2>
        <p>Bulan: ${schMonth}</p>
        ${tableHtml}
      </body>
      </html>
    `;

    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rekap_Presensi_PST_Barru_${schMonth}_${Date.now()}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const [syncStart, setSyncStart] = useState('118');
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

  // Dataset Indicator CRUD States
  const [datasetList, setDatasetList] = useState([]);
  const [loadingDataset, setLoadingDataset] = useState(false);
  const [datasetSearch, setDatasetSearch] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState('');
  const [isDatasetFormOpen, setIsDatasetFormOpen] = useState(false);
  const [editingDatasetId, setEditingDatasetId] = useState(null);
  const [indName, setIndName] = useState('');
  const [indUnit, setIndUnit] = useState('');
  const [indDesc, setIndDesc] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Dataset table column sorting state
  const [sortColumn, setSortColumn] = useState('id'); // 'id', 'category', 'name', 'count'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Indicator Detail Modal state
  const [detailModal, setDetailModal] = useState({
    isOpen: false,
    indicator: null,
    loading: false,
    seriesData: null
  });

  const handleViewIndicatorDetail = async (indicator) => {
    setDetailModal({
      isOpen: true,
      indicator,
      loading: true,
      seriesData: null
    });

    try {
      const data = await fetchSeries({ indicator_ids: [indicator.id] });
      setDetailModal(prev => ({
        ...prev,
        loading: false,
        seriesData: data
      }));
    } catch (err) {
      console.error('Failed to load series details for indicator:', err);
      showToast('error', 'Gagal memuat rincian angka data indikator.');
      setDetailModal(prev => ({ ...prev, loading: false }));
    }
  };

  const stripHtml = (html) => {
    if (!html) return '';
    return html
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]*>?/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Terbaru (Sinkron Otomatis)';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(d);
    } catch (e) {
      return dateStr;
    }
  };

  const getCleanName = (name) => {
    if (!name) return '';
    const clean = stripHtml(name);
    if (clean.includes(' - ')) {
      const parts = clean.split(' - ');
      if (parts.length > 1 && parts[parts.length - 1].trim()) {
        return parts[parts.length - 1].trim();
      }
    }
    return clean;
  };

  const downloadSingleCsv = (indicator, seriesData) => {
    if (!seriesData || !seriesData.labels) return;
    const cleanIndName = stripHtml(indicator.name);
    const header = `Tahun;${cleanIndName}\n`;
    const rows = seriesData.labels.map((yr, idx) => `${yr};${seriesData.datasets[0].data[idx] ?? ''}`).join('\n');
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(header + rows);
    const link = document.createElement('a');
    link.href = csvContent;
    link.download = `data_${cleanIndName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadSingleExcel = (indicator, seriesData) => {
    if (!seriesData || !seriesData.labels) return;
    const cleanIndName = stripHtml(indicator.name);
    let tableHtml = `<table border="1"><thead><tr><th style="background-color:#007aff;color:#fff;">Tahun</th><th style="background-color:#007aff;color:#fff;">${cleanIndName} (${indicator.unit || ''})</th></tr></thead><tbody>`;
    seriesData.labels.forEach((yr, idx) => {
      tableHtml += `<tr><td style="font-weight:bold;text-align:center;">${yr}</td><td style="text-align:right;">${seriesData.datasets[0].data[idx] ?? ''}</td></tr>`;
    });
    tableHtml += '</tbody></table>';

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"></head>
      <body>${tableHtml}</body>
      </html>
    `;

    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `data_${cleanIndName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [datasetSearch, selectedCatFilter, itemsPerPage]);

  const loadDatasetList = async () => {
    setLoadingDataset(true);
    try {
      const data = await fetchCrudIndicators();
      setDatasetList(data || []);
    } catch (err) {
      console.error('Error loading dataset list for CRUD:', err);
    } finally {
      setLoadingDataset(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dataset') {
      loadDatasetList();
    }
  }, [activeTab]);

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
      showToast('error', 'Maksimum snapshot utama dashboard adalah 6 indikator.');
      return;
    }
    setSavingSnapshots(true);
    try {
      await saveSnapshotsSettings(selectedSnapshotIds);
      showToast('success', 'Konfigurasi snapshot utama dashboard berhasil disimpan!');
    } catch (err) {
      console.error(err);
      showToast('error', 'Gagal menyimpan konfigurasi snapshot.');
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
      const data = await fetchServicesAdmin();
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
      setPreviewLogo(URL.createObjectURL(file));
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
  };

  const handleEditClick = (service) => {
    setIsEditing(true);
    setFormId(service.id);
    setTitle(service.title);
    setUrl(service.url);
    setDescription(service.description);
    setThemeClass(service.theme_class || 'bg-mariner-200');
    setExistingLogo(service.logo);
    setPreviewLogo('');
    setUploadedFile(null);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('url', url);
    formData.append('description', description);
    formData.append('theme_class', themeClass);

    if (uploadedFile) {
      formData.append('logo', uploadedFile);
    }

    try {
      if (isEditing) {
        await updateService(formId, formData);
        showToast('success', 'Layanan PST berhasil diperbarui!');
      } else {
        await createService(formData);
        showToast('success', 'Layanan PST baru berhasil ditambahkan!');
      }
      resetForm();
      loadServices();
    } catch (err) {
      console.error(err);
      showToast('error', 'Gagal menyimpan layanan. Periksa koneksi backend.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleVisibility = async (id, currentHidden) => {
    try {
      const newHidden = Number(currentHidden) === 1 ? 0 : 1;
      await toggleServiceVisibility(id, newHidden);
      setServices(prev => prev.map(s => s.id === id ? { ...s, is_hidden: newHidden } : s));
      showToast('success', newHidden ? 'Kartu layanan berhasil disembunyikan dari publik.' : 'Kartu layanan kembali ditampilkan ke publik.');
    } catch (err) {
      console.error('Error toggling visibility:', err);
      showToast('error', 'Gagal mengubah status visibilitas layanan.');
    }
  };

  const handleDeleteClick = (id, serviceTitle) => {
    showConfirm(
      'Hapus Layanan Terintegrasi',
      `Apakah Anda yakin ingin menghapus layanan "${serviceTitle}" secara permanen? Kartu layanan ini akan hilang dari portal.`,
      async () => {
        try {
          await deleteService(id);
          setServices(prev => prev.filter(s => s.id !== id));
          showToast('success', `Layanan "${serviceTitle}" berhasil dihapus.`);
        } catch (err) {
          console.error(err);
          showToast('error', 'Gagal menghapus layanan.');
        }
      }
    );
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
      for (const chunk of yearChunks) {
        try {
          const res = await syncBpsData({
            domain: syncDomain,
            var_id: varId,
            start_year: chunk.start,
            end_year: chunk.end
          });
          
          if (res.status === 'empty' || res.synced_values_count === 0) {
            setSyncLogs(prev => [
              ...prev,
              `  └─ Info Th ${chunk.start}-${chunk.end}: Data tidak ditemukan di BPS (Domain ${syncDomain})`
            ]);
          } else if (res.error || res.status === 'error') {
            varSuccess = false;
            setSyncLogs(prev => [
              ...prev,
              `  └─ Error Th ${chunk.start}-${chunk.end}: ${res.error || res.message}`
            ]);
          } else {
            setSyncLogs(prev => [
              ...prev,
              `  └─ Sukses Th ${chunk.start}-${chunk.end}: +${res.synced_values_count || 0} data terunduh`
            ]);
          }
        } catch (err) {
          varSuccess = false;
          const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Koneksi BPS timeout';
          setSyncLogs(prev => [
            ...prev,
            `  └─ Gagal Th ${chunk.start}-${chunk.end}: ${errMsg}`
          ]);
        }
      }

      if (varSuccess) successCount++;
    }

    setSyncLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Proses Sinkronisasi Selesai. Total ${successCount}/${varList.length} variabel sukses diproses.`
    ]);
    setSyncing(false);
    showToast('success', `Sinkronisasi BPS API selesai (${successCount}/${varList.length} variabel).`);
  };

  const handleOpenCreateDataset = () => {
    setEditingDatasetId(null);
    setIndName('');
    setIndUnit('');
    setIndDesc('');
    setIsDatasetFormOpen(true);
  };

  const handleOpenEditDataset = (item) => {
    setEditingDatasetId(item.id);
    setIndName(item.name || '');
    setIndUnit(item.unit || '');
    setIndDesc(item.description || '');
    setIsDatasetFormOpen(true);
  };

  const handleSaveDataset = async (e) => {
    e.preventDefault();
    if (!indName.trim()) {
      showToast('error', 'Nama indikator wajib diisi.');
      return;
    }
    setSavingDataset(true);
    try {
      await saveIndicator({
        id: editingDatasetId,
        name: indName,
        unit: indUnit,
        description: indDesc
      });
      showToast('success', editingDatasetId ? 'Indikator dataset berhasil diubah!' : 'Indikator dataset baru berhasil ditambahkan!');
      setIsDatasetFormOpen(false);
      loadDatasetList();
    } catch (err) {
      console.error('Error saving dataset indicator:', err);
      showToast('error', err.response?.data?.error || err.message || 'Gagal menyimpan indikator dataset.');
    } finally {
      setSavingDataset(false);
    }
  };

  const handleDeleteDataset = (id, name) => {
    showConfirm(
      'Hapus Indikator Dataset',
      `Apakah Anda yakin ingin menghapus indikator "${name}"? Seluruh deret data nilainya juga akan dihapus dari dashboard.`,
      async () => {
        try {
          await deleteIndicator(id);
          showToast('success', `Indikator "${name}" berhasil dihapus.`);
          loadDatasetList();
        } catch (err) {
          console.error('Error deleting dataset indicator:', err);
          showToast('error', err.response?.data?.error || 'Gagal menghapus indikator dataset.');
        }
      }
    );
  };

  const uniqueCategories = Array.from(new Set(datasetList.map(item => item.table_name || 'Indikator Kategori')));

  const filteredDatasetList = datasetList.filter(item => {
    const matchesSearch = (item.name || '').toLowerCase().includes(datasetSearch.toLowerCase()) ||
                          (item.table_name || '').toLowerCase().includes(datasetSearch.toLowerCase()) ||
                          (item.category_name || '').toLowerCase().includes(datasetSearch.toLowerCase());
    const matchesCat = !selectedCatFilter || (item.table_name || 'Indikator Kategori') === selectedCatFilter;
    return matchesSearch && matchesCat;
  });

  const totalDataPoints = datasetList.reduce((acc, curr) => acc + (curr.value_count || 0), 0);

  const sortedDatasetList = useMemo(() => {
    return [...filteredDatasetList].sort((a, b) => {
      let valA = a[sortColumn];
      let valB = b[sortColumn];

      if (sortColumn === 'id') {
        valA = Number(a.id || 0);
        valB = Number(b.id || 0);
      } else if (sortColumn === 'category') {
        valA = (a.table_name || '').toLowerCase();
        valB = (b.table_name || '').toLowerCase();
      } else if (sortColumn === 'name') {
        valA = (a.name || '').toLowerCase();
        valB = (b.name || '').toLowerCase();
      } else if (sortColumn === 'count') {
        valA = Number(a.value_count || 0);
        valB = Number(b.value_count || 0);
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredDatasetList, sortColumn, sortDirection]);

  const totalPages = Math.ceil(sortedDatasetList.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDatasetList = sortedDatasetList.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="animate-fade-in text-gray-800" style={{ paddingBottom: '3rem' }}>
      
      {/* Toast Notification Bar */}
      {toast.show && (
        <div className="toast-container">
          <div className={`toast-card ${toast.type}`}>
            {toast.type === 'success' && <CheckCircle2 size={20} style={{ color: '#34c759', flexShrink: 0 }} />}
            {toast.type === 'error' && <AlertCircle size={20} style={{ color: '#ff3b30', flexShrink: 0 }} />}
            {toast.type === 'info' && <Info size={20} style={{ color: '#007aff', flexShrink: 0 }} />}
            <div style={{ flex: 1, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {toast.message}
            </div>
            <button 
              onClick={() => setToast(prev => ({ ...prev, show: false }))} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Glass Modal */}
      {confirmModal.isOpen && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  {confirmModal.title}
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                  Konfirmasi Tindakan Admin
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.825rem', color: 'var(--text-main)', lineHeight: '1.5', marginBottom: '1.5rem' }}>
              {confirmModal.message}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button 
                onClick={handleCloseConfirm} 
                className="glass-btn glass-btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                  handleCloseConfirm();
                }} 
                className="glass-btn"
                style={{ fontSize: '0.75rem', padding: '0.5rem 1rem', background: '#ff3b30', color: '#ffffff', borderColor: '#ff3b30', fontWeight: 700 }}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Admin Tabs */}
      <div className="admin-tabs no-print" style={{ marginBottom: '2rem' }}>
        <button 
          onClick={() => setActiveTab('pst')} 
          className={`admin-tab-btn ${activeTab === 'pst' ? 'active' : ''}`}
        >
          Manajemen Layanan PST
        </button>
        <button 
          onClick={() => setActiveTab('schedule')} 
          className={`admin-tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
        >
          Tim & Rotasi Piket PST
        </button>
        <button 
          onClick={() => setActiveTab('dataset')} 
          className={`admin-tab-btn ${activeTab === 'dataset' ? 'active' : ''}`}
        >
          Manajemen Dataset Dashboard
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

            <form onSubmit={handleFormSubmit} className="admin-form-grid">
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
                    rows={3}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <span className="filter-label">Tema Kartu Layanan</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                    {colorOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setThemeClass(opt.value)}
                        style={{
                          padding: '0.5rem',
                          borderRadius: '8px',
                          border: themeClass === opt.value ? '2px solid var(--primary-dark)' : '1px solid rgba(0,0,0,0.1)',
                          background: opt.color,
                          color: '#fff',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        {themeClass === opt.value && <Check size={12} />}
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="filter-label">Logo / Ikon Aplikasi</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {previewLogo ? (
                        <img src={previewLogo} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} />
                      ) : existingLogo ? (
                        <img 
                          src={existingLogo.startsWith('http') ? existingLogo : `${API_BASE}/${existingLogo.replace(/^api\//, '')}`} 
                          alt="Existing" 
                          style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} 
                        />
                      ) : (
                        <Upload size={20} style={{ color: 'var(--text-secondary)' }} />
                      )}
                    </div>

                    <label className="glass-btn glass-btn-secondary" style={{ cursor: 'pointer', fontSize: '0.75rem' }}>
                      <Upload size={14} />
                      <span>{uploadedFile ? 'Ganti Berkas' : 'Unggah Logo Baru'}</span>
                      <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
                  {isEditing && (
                    <button type="button" onClick={resetForm} className="glass-btn glass-btn-secondary" style={{ flex: 1 }}>
                      Batal
                    </button>
                  )}
                  <button type="submit" disabled={submitting} className="glass-btn glass-btn-primary" style={{ flex: 2 }}>
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : (isEditing ? <Check size={16} /> : <Plus size={16} />)}
                    <span>{submitting ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Tambah Layanan')}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* List of PST services */}
          <div className="glass-card">
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Daftar Kartu Layanan Terpasang ({services.length})
            </h3>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
                <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem', color: 'var(--primary)' }} />
                <div>Memuat daftar layanan PST...</div>
              </div>
            ) : services.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
                Belum ada layanan PST yang terpasang.
              </div>
            ) : (
              <div className="pst-grid">
                {services.map((service) => {
                  const isHidden = Number(service.is_hidden) === 1;
                  return (
                    <div 
                      key={service.id} 
                      className="pst-card" 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        justify: 'space-between',
                        opacity: isHidden ? 0.65 : 1,
                        position: 'relative',
                        border: isHidden ? '1px dashed rgba(255, 149, 0, 0.4)' : undefined,
                        background: isHidden ? 'rgba(255, 149, 0, 0.03)' : undefined
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'white', padding: '6px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img 
                              src={service.logo?.startsWith('http') ? service.logo : `${API_BASE}/${service.logo?.replace(/^api\//, '')}`} 
                              alt={service.title} 
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              onError={(e) => { e.target.src = 'https://i.imgur.com/gAY8c2j.png'; }}
                            />
                          </div>

                          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                            {isHidden && (
                              <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '6px', background: 'rgba(255, 149, 0, 0.15)', color: '#ff9500', marginRight: '0.25rem' }}>
                                Disembunyikan
                              </span>
                            )}
                            <button 
                              onClick={() => handleToggleVisibility(service.id, service.is_hidden)} 
                              className="glass-btn" 
                              style={{ padding: '0.4rem', borderRadius: '8px' }} 
                              title={isHidden ? "Tampilkan ke publik" : "Sembunyikan dari publik"}
                            >
                              {isHidden ? <EyeOff size={14} style={{ color: '#ff9500' }} /> : <Eye size={14} style={{ color: '#34c759' }} />}
                            </button>
                            <button onClick={() => handleEditClick(service)} className="glass-btn" style={{ padding: '0.4rem', borderRadius: '8px' }} title="Ubah">
                              <Edit3 size={14} style={{ color: '#007aff' }} />
                            </button>
                            <button onClick={() => handleDeleteClick(service.id, service.title)} className="glass-btn" style={{ padding: '0.4rem', borderRadius: '8px' }} title="Hapus">
                              <Trash2 size={14} style={{ color: '#ff3b30' }} />
                            </button>
                          </div>
                        </div>

                        <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.35rem' }}>{service.title}</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '1rem' }}>{service.description}</p>
                      </div>

                      <a href={service.url.startsWith('http') ? service.url : `https://${service.url}`} target="_blank" rel="noreferrer" className="pst-btn-link" style={{ marginTop: 'auto' }}>
                        Buka Tautan
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PST Schedule & Officer Management */}
      {activeTab === 'schedule' && (
        <PstSchedule isAdmin={true} />
      )}

      {/* TAB 2: Dataset Indicators CRUD Management */}
      {activeTab === 'dataset' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Top Metric Cards Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(0,122,255,0.1)', color: '#007aff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <BarChart2 size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Indikator</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>{datasetList.length} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Item</span></div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(52,199,89,0.1)', color: '#248a3d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Database size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Deret Data</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>{totalDataPoints} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Poin</span></div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(175,82,222,0.1)', color: '#af52de', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Layers size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rumpun Tabel BPS</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>{uniqueCategories.length} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Kategori</span></div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(52,199,89,0.1)', color: '#34c759', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle2 size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status Database</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#248a3d', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                  <span className="db-status-dot active" style={{ width: '8px', height: '8px' }} />
                  <span>Aktif Tersambung</span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls Bar (Filter, Search, Add Button) */}
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
                {/* Search Bar */}
                <div style={{ position: 'relative', minWidth: '260px', flex: 1 }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    placeholder="Cari berdasarkan nama indikator atau kategori..."
                    value={datasetSearch}
                    onChange={(e) => setDatasetSearch(e.target.value)}
                    className="glass-input"
                    style={{ fontSize: '0.8rem', paddingLeft: '2.4rem', paddingRight: datasetSearch ? '2.4rem' : '0.8rem' }}
                  />
                  {datasetSearch && (
                    <button onClick={() => setDatasetSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Category Dropdown Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '200px' }}>
                  <Filter size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  <select
                    value={selectedCatFilter}
                    onChange={(e) => setSelectedCatFilter(e.target.value)}
                    className="glass-select"
                    style={{ fontSize: '0.8rem', padding: '0.6rem 0.8rem' }}
                  >
                    <option value="">Semua Rumpun Kategori ({uniqueCategories.length})</option>
                    {uniqueCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Form Modal Overlay for Create/Edit Indicator */}
          {isDatasetFormOpen && (
            <div className="confirm-modal-overlay">
              <div className="confirm-modal-box" style={{ maxWidth: '560px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(0,122,255,0.1)', color: '#007aff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Database size={18} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                        {editingDatasetId ? 'Ubah Informasi Indikator' : 'Tambah Indikator Dataset Baru'}
                      </h4>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        {editingDatasetId ? `Menyunting Indikator ID #${editingDatasetId}` : 'Lengkapi atribut indikator baru di bawah'}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setIsDatasetFormOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.25rem' }}>
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveDataset} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <span className="filter-label">Nama Indikator Dataset *</span>
                    <input
                      type="text"
                      value={indName}
                      onChange={(e) => setIndName(e.target.value)}
                      placeholder="Contoh: Persentase Penduduk Miskin - Kota"
                      className="glass-input"
                      required
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span className="filter-label" style={{ marginBottom: 0 }}>Satuan Data</span>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {['%', 'Miliar Rp', 'Jiwa', 'Orang', 'Index'].map(preset => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setIndUnit(preset)}
                            style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                          >
                            +{preset}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={indUnit}
                      onChange={(e) => setIndUnit(e.target.value)}
                      placeholder="Contoh: %, Miliar Rp, Jiwa, Orang"
                      className="glass-input"
                    />
                  </div>

                  <div>
                    <span className="filter-label">Penjelasan / Deskripsi Indikator</span>
                    <textarea
                      value={indDesc}
                      onChange={(e) => setIndDesc(e.target.value)}
                      placeholder="Tuliskan keterangan mengenai sumber data atau metode kalkulasi indikator ini..."
                      className="glass-input"
                      rows={3}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button 
                      type="button" 
                      onClick={() => setIsDatasetFormOpen(false)} 
                      className="glass-btn glass-btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.65rem 1.25rem' }}
                    >
                      Batal
                    </button>
                    <button 
                      type="submit" 
                      disabled={savingDataset} 
                      className="glass-btn glass-btn-primary"
                      style={{ fontSize: '0.75rem', padding: '0.65rem 1.5rem' }}
                    >
                      {savingDataset ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      <span>{savingDataset ? 'Menyimpan...' : 'Simpan Indikator'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Dataset Table Card */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-scroll" style={{ maxHeight: '520px', overflowX: 'auto' }}>
              <table className="custom-table" style={{ width: '100%', minWidth: '820px' }}>
                <thead>
                  <tr>
                    <th onClick={() => handleSort('id')} style={{ width: '80px', cursor: 'pointer', userSelect: 'none' }} title="Klik untuk mengurutkan berdasarkan ID">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>ID</span>
                        {sortColumn === 'id' ? (sortDirection === 'asc' ? '▲' : '▼') : <ArrowUpDown size={11} style={{ opacity: 0.4 }} />}
                      </div>
                    </th>
                    <th onClick={() => handleSort('category')} style={{ width: '220px', cursor: 'pointer', userSelect: 'none' }} title="Klik untuk mengurutkan berdasarkan Rumpun Kategori">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>Rumpun Kategori / Variabel</span>
                        {sortColumn === 'category' ? (sortDirection === 'asc' ? '▲' : '▼') : <ArrowUpDown size={11} style={{ opacity: 0.4 }} />}
                      </div>
                    </th>
                    <th onClick={() => handleSort('name')} style={{ minWidth: '240px', cursor: 'pointer', userSelect: 'none' }} title="Klik untuk mengurutkan berdasarkan Nama Indikator">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>Nama Indikator Dataset</span>
                        {sortColumn === 'name' ? (sortDirection === 'asc' ? '▲' : '▼') : <ArrowUpDown size={11} style={{ opacity: 0.4 }} />}
                      </div>
                    </th>
                    <th style={{ width: '90px' }}>Satuan</th>
                    <th onClick={() => handleSort('count')} style={{ width: '180px', cursor: 'pointer', userSelect: 'none' }} title="Klik untuk mengurutkan berdasarkan Jumlah Data">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>Rentang & Jumlah Data</span>
                        {sortColumn === 'count' ? (sortDirection === 'asc' ? '▲' : '▼') : <ArrowUpDown size={11} style={{ opacity: 0.4 }} />}
                      </div>
                    </th>
                    <th style={{ textAlign: 'center', width: '130px' }}>Aksi (CRUD)</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingDataset ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
                        <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 0.5rem', color: 'var(--primary)' }} />
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Memuat daftar dataset indikator...</div>
                      </td>
                    </tr>
                  ) : filteredDatasetList.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
                        <Database size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Tidak ada indikator dataset yang cocok.</div>
                        <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Coba ubah kata kunci pencarian atau filter kategori.</div>
                      </td>
                    </tr>
                  ) : (
                    paginatedDatasetList.map((item) => (
                      <tr key={item.id} onClick={() => handleViewIndicatorDetail(item)} style={{ cursor: 'pointer' }} className="hover:bg-blue-50/50 transition-colors">
                        <td style={{ fontWeight: 800, color: 'var(--text-secondary)' }}>#{item.id}</td>
                        <td style={{ maxWidth: '210px' }}>
                          <span 
                            style={{ 
                              fontSize: '0.7rem', 
                              fontWeight: 700, 
                              padding: '0.25rem 0.6rem', 
                              borderRadius: '8px', 
                              background: 'rgba(0,122,255,0.08)', 
                              color: '#007aff', 
                              display: 'block',
                              maxWidth: '100%',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                            title={stripHtml(item.table_name)}
                          >
                            {stripHtml(item.table_name) || 'Indikator Kategori'}
                          </span>
                        </td>
                        <td style={{ maxWidth: '280px' }}>
                          <div 
                            style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                            title={stripHtml(item.name)}
                          >
                            {getCleanName(item.name)}
                          </div>
                          {item.description && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {stripHtml(item.description)}
                            </div>
                          )}
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.04)', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                            {item.unit || '–'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#248a3d', background: 'rgba(52,199,89,0.12)', padding: '0.2rem 0.65rem', borderRadius: '99px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', width: 'fit-content' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34c759' }} />
                              <span>{item.value_count} data ({item.min_year && item.max_year ? `${item.min_year} - ${item.max_year}` : '–'})</span>
                            </span>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} title={`Update terakhir: ${formatDate(item.last_synced_at || item.updated_at)}`}>
                              <Clock size={10} style={{ opacity: 0.6 }} />
                              <span>Diupdate {formatDate(item.last_synced_at || item.updated_at)}</span>
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleViewIndicatorDetail(item); }}
                              className="glass-btn"
                              style={{ padding: '0.4rem 0.65rem', fontSize: '0.7rem', color: '#248a3d', borderColor: 'rgba(52,199,89,0.3)', borderRadius: '8px', background: 'rgba(52,199,89,0.08)' }}
                              title="Lihat Isi Angka Data (Detail)"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenEditDataset(item); }}
                              className="glass-btn"
                              style={{ padding: '0.4rem 0.65rem', fontSize: '0.7rem', color: '#007aff', borderColor: 'rgba(0,122,255,0.2)', borderRadius: '8px' }}
                              title="Ubah Informasi Indikator"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteDataset(item.id, item.name); }}
                              className="glass-btn"
                              style={{ padding: '0.4rem 0.65rem', fontSize: '0.7rem', color: '#ff3b30', borderColor: 'rgba(255,59,48,0.2)', borderRadius: '8px' }}
                              title="Hapus Indikator"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer with Pagination Controls & Items Per Page Selector */}
            <div style={{ padding: '0.85rem 1.25rem', background: 'rgba(255,255,255,0.6)', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>Tampilkan:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="glass-select"
                    style={{ padding: '0.35rem 1.8rem 0.35rem 0.6rem', fontSize: '0.75rem', borderRadius: '8px', minWidth: '70px', background: 'rgba(255,255,255,0.85)' }}
                  >
                    <option value={10}>10 Baris</option>
                    <option value={20}>20 Baris</option>
                    <option value={50}>50 Baris</option>
                    <option value={100}>100 Baris</option>
                    <option value={filteredDatasetList.length || 9999}>Semua ({filteredDatasetList.length})</option>
                  </select>
                </div>
                <span>
                  Menampilkan <strong>{filteredDatasetList.length > 0 ? startIndex + 1 : 0}</strong> - <strong>{Math.min(startIndex + itemsPerPage, filteredDatasetList.length)}</strong> dari <strong>{filteredDatasetList.length}</strong> indikator dataset.
                </span>
              </div>

              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="glass-btn"
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.7rem', opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    ‹ Prev
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className="glass-btn"
                      style={{
                        padding: '0.35rem 0.65rem',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: currentPage === page ? 'var(--primary)' : 'rgba(255,255,255,0.8)',
                        color: currentPage === page ? '#ffffff' : 'var(--text-main)',
                        borderColor: currentPage === page ? 'var(--primary)' : 'rgba(0,0,0,0.08)'
                      }}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="glass-btn"
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.7rem', opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                  >
                    Next ›
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: BPS Web API Synchronization */}
      {activeTab === 'sync' && (
        <div className="glass-card" style={{ position: 'relative', maxWidth: '650px', margin: '0 auto', overflow: 'visible', zIndex: 999, backdropFilter: 'none', WebkitBackdropFilter: 'none', background: 'rgba(255, 255, 255, 0.9)' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={16} />
            <span>Hubungkan & Sinkronkan BPS Web-API</span>
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

            {/* Year Code Formula Helper Callout */}
            <div style={{ background: 'rgba(0, 122, 255, 0.08)', border: '1px solid rgba(0, 122, 255, 0.2)', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.75rem', color: '#007aff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={16} style={{ flexShrink: 0 }} />
              <span>
                <strong>Panduan Kode Tahun BPS Web API:</strong> Format kode tahun BPS menggunakan rumus <code>(1900 + Kode)</code>. 
                Contoh: Kode <strong>100</strong> = Tahun <strong>2000</strong>, Kode <strong>125</strong> = Tahun <strong>2025</strong>.
              </span>
            </div>

            <div className="admin-form-grid" style={{ gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span className="filter-label" style={{ marginBottom: 0 }}>Kode Awal Tahun BPS</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#007aff', background: 'rgba(0,122,255,0.08)', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                    ➜ Tahun {1900 + Number(syncStart || 0)} (Kode: {syncStart})
                  </span>
                </div>
                <input
                  type="number"
                  value={syncStart}
                  onChange={(e) => setSyncStart(e.target.value)}
                  className="glass-input"
                  placeholder="100 (Tahun 2000)"
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span className="filter-label" style={{ marginBottom: 0 }}>Kode Akhir Tahun BPS</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#007aff', background: 'rgba(0,122,255,0.08)', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                    ➜ Tahun {1900 + Number(syncEnd || 0)} (Kode: {syncEnd})
                  </span>
                </div>
                <input
                  type="number"
                  value={syncEnd}
                  onChange={(e) => setSyncEnd(e.target.value)}
                  className="glass-input"
                  placeholder="125 (Tahun 2025)"
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

      {/* TAB 4: Dashboard Snapshots Configuration */}
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
                      showToast('error', 'Maksimum snapshot yang diperbolehkan adalah 6 indikator.');
                      return;
                    }
                    setSelectedSnapshotIds(newValues);
                  }}
                />
              )}
            </div>

            <button 
              onClick={handleSaveSnapshots} 
              disabled={savingSnapshots} 
              className="glass-btn glass-btn-primary" 
              style={{ width: '100%' }}
            >
              {savingSnapshots ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              <span>{savingSnapshots ? 'Menyimpan...' : 'Simpan Pengaturan Snapshot'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. Indicator Detail Numbers Modal */}
      {detailModal.isOpen && (
        <div className="confirm-modal-overlay animate-fade-in" style={{ zIndex: 99999 }}>
          <div className="confirm-modal-box glass-card" style={{ maxWidth: '750px', width: '92%', maxHeight: '88vh', display: 'flex', flexDirection: 'column', padding: '1.75rem', borderRadius: '24px' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '6px', background: 'rgba(0,122,255,0.12)', color: '#007aff' }}>
                    ID #{detailModal.indicator?.id}
                  </span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '6px', background: 'rgba(175,82,222,0.12)', color: '#af52de' }}>
                    {stripHtml(detailModal.indicator?.table_name) || 'Rumpun Kategori BPS'}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, lineHeight: 1.35 }}>
                  {stripHtml(detailModal.indicator?.name)}
                </h3>
              </div>
              <button 
                onClick={() => setDetailModal({ isOpen: false, indicator: null, loading: false, seriesData: null })}
                className="glass-btn"
                style={{ padding: '0.4rem', borderRadius: '10px', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body Content */}
            {detailModal.loading ? (
              <div style={{ padding: '4rem 0', textAlign: 'center' }}>
                <Loader2 size={36} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto 0.75rem' }} />
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>Memuat rincian data indikator...</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Mengambil seluruh deret angka historis dari database</div>
              </div>
            ) : detailModal.seriesData && detailModal.seriesData.labels && detailModal.seriesData.labels.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', flex: 1, paddingRight: '0.35rem' }}>
                
                {/* Quick Metrics Header */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                  <div style={{ background: 'rgba(0,122,255,0.06)', padding: '0.85rem', borderRadius: '14px', border: '1px solid rgba(0,122,255,0.1)' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Satuan Data</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#007aff', marginTop: '0.2rem' }}>
                      {detailModal.indicator?.unit || '–'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(52,199,89,0.06)', padding: '0.85rem', borderRadius: '14px', border: '1px solid rgba(52,199,89,0.1)' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Rentang & Poin Data</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#248a3d', marginTop: '0.2rem' }}>
                      {detailModal.seriesData.labels.length} Data ({detailModal.seriesData.labels[0]} - {detailModal.seriesData.labels[detailModal.seriesData.labels.length - 1]})
                    </div>
                  </div>
                  <div style={{ background: 'rgba(175,82,222,0.06)', padding: '0.85rem', borderRadius: '14px', border: '1px solid rgba(175,82,222,0.1)' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Capaian Terbaru</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#af52de', marginTop: '0.2rem' }}>
                      {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(detailModal.seriesData.datasets?.[0]?.data?.[detailModal.seriesData.datasets[0].data.length - 1] ?? 0)} {detailModal.indicator?.unit}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,149,0,0.06)', padding: '0.85rem', borderRadius: '14px', border: '1px solid rgba(255,149,0,0.1)' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={10} />
                      <span>Terakhir Diupdate</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#d97706', marginTop: '0.2rem' }}>
                      {formatDate(detailModal.indicator?.last_synced_at || detailModal.indicator?.updated_at)}
                    </div>
                  </div>
                </div>

                {/* Source Info */}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span>Sumber Data Resmi:</span>
                  <strong style={{ color: 'var(--text-main)' }}>Badan Pusat Statistik (BPS) Kabupaten Barru</strong>
                  <span>• barrukab.bps.go.id</span>
                  <span style={{ opacity: 0.5 }}>|</span>
                  <span>Terakhir Diperbarui: <strong>{formatDate(detailModal.indicator?.last_synced_at || detailModal.indicator?.updated_at)}</strong></span>
                </div>

                {/* Historical Data Table Header & Download Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, textTransform: 'uppercase' }}>
                    Deret Angka Data Historis ({detailModal.seriesData.labels.length} Tahun)
                  </h4>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => downloadSingleExcel(detailModal.indicator, detailModal.seriesData)} 
                      className="glass-btn glass-btn-primary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.7rem', background: '#21a366', borderColor: '#1e965d' }}
                    >
                      <FileSpreadsheet size={13} />
                      <span>Unduh Excel</span>
                    </button>
                    <button 
                      onClick={() => downloadSingleCsv(detailModal.indicator, detailModal.seriesData)} 
                      className="glass-btn glass-btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.7rem' }}
                    >
                      <FileDown size={13} />
                      <span>Unduh CSV</span>
                    </button>
                  </div>
                </div>

                {/* Table of Historical Data */}
                <div className="table-scroll" style={{ maxHeight: '320px', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '14px' }}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th style={{ width: '60px' }}>No</th>
                        <th>Tahun Data</th>
                        <th style={{ textAlign: 'right' }}>Nilai Data ({detailModal.indicator?.unit || '–'})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailModal.seriesData.labels.map((yr, idx) => {
                        const val = detailModal.seriesData.datasets?.[0]?.data?.[idx];
                        return (
                          <tr key={yr}>
                            <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{idx + 1}</td>
                            <td style={{ fontWeight: 700 }}>Tahun {yr}</td>
                            <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                              {val !== null && val !== undefined ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(val) : '–'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Description Box (Positioned Below Table) */}
                {detailModal.indicator?.description && (
                  <div style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '14px', padding: '0.85rem 1rem', marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Penjelasan & Keterangan Indikator:
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                      {stripHtml(detailModal.indicator.description)}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Belum ada deret angka data yang tercatat untuk indikator ini.
              </div>
            )}

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '1rem', marginTop: '1rem' }}>
              <button 
                onClick={() => setDetailModal({ isOpen: false, indicator: null, loading: false, seriesData: null })}
                className="glass-btn glass-btn-secondary"
                style={{ padding: '0.5rem 1.5rem', fontWeight: 700 }}
              >
                Tutup Rincian Preview
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
