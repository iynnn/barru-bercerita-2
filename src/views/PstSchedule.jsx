import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { 
  Calendar, Clock, Sun, Moon, ShieldAlert, FileSpreadsheet, 
  Users, RefreshCw, Printer, Search, Plus, Edit3, CheckCircle2, 
  X, AlertCircle, Phone, MessageSquare, Award, ArrowRight, UserCheck, Layers, Info, Key, LogIn, Eye, EyeOff,
  ChevronLeft, ChevronRight, ChevronDown, FileUp, Download, Upload, Trash2, Palmtree, Sparkles, ArrowLeftRight, CheckSquare, XSquare, BookOpen
} from 'lucide-react';
import { 
  fetchSchedule, 
  autoGenerateSchedule, 
  updateDaySchedule, 
  savePstOfficer,
  checkInPst,
  importPstOfficers,
  deletePstOfficers,
  savePstHoliday,
  deletePstHoliday,
  syncPstNationalHolidays,
  createPstSwapRequest,
  respondPstSwapRequest,
  deletePstSwapRequest
} from '../api';

const DUTY_ROLES = {
  k1: {
    code: 'K1',
    name: 'Jaga PST Pagi',
    timeMonThu: '08.00 – 12.30 WITA',
    timeFri: '08.00 – 12.30 WITA',
    color: '#007aff',
    bg: 'rgba(0, 122, 255, 0.08)',
    border: 'rgba(0, 122, 255, 0.2)',
    desc: 'Melayani konsultasi & permintaan data statistik sesi pagi'
  },
  k2: {
    code: 'K2',
    name: 'Jaga PST Siang',
    timeMonThu: '12.30 – 16.00 WITA',
    timeFri: '12.30 – 16.30 WITA',
    color: '#00b4d8',
    bg: 'rgba(0, 180, 216, 0.08)',
    border: 'rgba(0, 180, 216, 0.2)',
    desc: 'Melayani konsultasi & permintaan data statistik sesi siang'
  },
  p: {
    code: 'P',
    name: 'Jaga Pengaduan',
    timeMonThu: '08.00 – 16.00 WITA',
    timeFri: '08.00 – 16.30 WITA',
    color: '#ff9500',
    bg: 'rgba(255, 149, 0, 0.08)',
    border: 'rgba(255, 149, 0, 0.2)',
    desc: 'Menangani saran, aspirasi & pengaduan konsumen data'
  },
  r: {
    code: 'R',
    name: 'Jaga Rekomendasi Statistik',
    timeMonThu: '08.00 – 16.00 WITA',
    timeFri: '08.00 – 16.30 WITA',
    color: '#af52de',
    bg: 'rgba(175, 82, 222, 0.08)',
    border: 'rgba(175, 82, 222, 0.2)',
    desc: 'Pemeriksaan & pengurusan rekomendasi kegiatan statistik'
  }
};

const CustomMonthPicker = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [selectedYear, setSelectedYear] = useState(() => {
    const parts = (value || '').split('-');
    return parts[0] ? parseInt(parts[0], 10) : new Date().getFullYear();
  });

  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts[0]) setSelectedYear(parseInt(parts[0], 10));
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const MONTH_NAMES = [
    { num: '01', short: 'Jan', long: 'Januari' },
    { num: '02', short: 'Feb', long: 'Februari' },
    { num: '03', short: 'Mar', long: 'Maret' },
    { num: '04', short: 'Apr', long: 'April' },
    { num: '05', short: 'Mei', long: 'Mei' },
    { num: '06', short: 'Jun', long: 'Juni' },
    { num: '07', short: 'Jul', long: 'Juli' },
    { num: '08', short: 'Agu', long: 'Agustus' },
    { num: '09', short: 'Sep', long: 'September' },
    { num: '10', short: 'Okt', long: 'Oktober' },
    { num: '11', short: 'Nov', long: 'November' },
    { num: '12', short: 'Des', long: 'Desember' }
  ];

  const currentMonthNum = (value || '').split('-')[1] || '08';
  const currentMonthYear = (value || '').split('-')[0] || '2026';

  const selectedMonthObj = MONTH_NAMES.find(m => m.num === currentMonthNum) || MONTH_NAMES[7];

  const handleSelectMonth = (monthNum) => {
    const newMonthStr = `${selectedYear}-${monthNum}`;
    onChange(newMonthStr);
    setIsOpen(false);
  };

  const handleToday = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    onChange(`${y}-${m}`);
    setSelectedYear(y);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="glass-btn"
        style={{
          padding: '0.35rem 0.75rem',
          borderRadius: '8px',
          fontSize: '0.8rem',
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          borderColor: isOpen ? '#007aff' : undefined
        }}
      >
        <Calendar size={14} style={{ color: '#007aff' }} />
        <span>{selectedMonthObj.long} {currentMonthYear}</span>
        <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {isOpen && (
        <div
          className="glass-card animate-fade-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 99999,
            width: '270px',
            padding: '0.85rem',
            borderRadius: '14px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
            border: '1px solid var(--glass-border, rgba(255,255,255,0.25))'
          }}
        >
          {/* Year Navigator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px dashed var(--glass-border, rgba(0,0,0,0.1))' }}>
            <button
              type="button"
              onClick={() => setSelectedYear(selectedYear - 1)}
              className="glass-btn"
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {selectedYear}
            </span>
            <button
              type="button"
              onClick={() => setSelectedYear(selectedYear + 1)}
              className="glass-btn"
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Month Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', marginBottom: '0.75rem' }}>
            {MONTH_NAMES.map((m) => {
              const isSelected = selectedYear.toString() === currentMonthYear && m.num === currentMonthNum;
              return (
                <button
                  key={m.num}
                  type="button"
                  onClick={() => handleSelectMonth(m.num)}
                  style={{
                    padding: '0.45rem 0.25rem',
                    fontSize: '0.78rem',
                    fontWeight: isSelected ? 800 : 600,
                    borderRadius: '8px',
                    border: isSelected ? 'none' : '1px solid var(--glass-border, rgba(0,0,0,0.06))',
                    background: isSelected 
                      ? 'linear-gradient(135deg, #007aff 0%, #0056b3 100%)' 
                      : 'var(--card-bg, rgba(255,255,255,0.4))',
                    color: isSelected ? '#ffffff' : 'var(--text-main)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 3px 10px rgba(0, 122, 255, 0.3)' : 'none'
                  }}
                >
                  {m.short}
                </button>
              );
            })}
          </div>

          {/* Quick Footer Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.4rem', borderTop: '1px solid var(--glass-border, rgba(0,0,0,0.08))' }}>
            <button
              type="button"
              onClick={handleToday}
              style={{ background: 'none', border: 'none', color: '#007aff', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <span>⚡ Bulan Ini</span>
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function PstSchedule({ isAdmin: propsIsAdmin }) {
  const isLoggedIn = !!localStorage.getItem('authToken');
  const loggedUser = useMemo(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('user') || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }, []);

  const isAdmin = propsIsAdmin !== undefined ? Boolean(propsIsAdmin) : (isLoggedIn && loggedUser?.role === 'admin');
  const isOfficer = isLoggedIn && (loggedUser?.role === 'officer' || loggedUser?.officer_id);

  // States
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [activeTab, setActiveTab] = useState('daily'); // 'daily', 'monthly', 'officers', 'presensi'
  const [loading, setLoading] = useState(false);
  const [officers, setOfficers] = useState([]);
  const [schedulesMap, setSchedulesMap] = useState({});
  const [presensiMap, setPresensiMap] = useState({});
  const [holidaysMap, setHolidaysMap] = useState({});
  const [searchFilter, setSearchFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [genMode, setGenMode] = useState('sequential'); // 'sequential' or 'random'

  // Holiday Management Modal State
  const [manageHolidaysModal, setManageHolidaysModal] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ date: '', title: '', type: 'national_holiday', description: '' });

  // Shift Swap Modal & States
  const [swapRequests, setSwapRequests] = useState([]);
  const [swapModal, setSwapModal] = useState(false);
  const [swapListModal, setSwapListModal] = useState(false);
  const [showSwapPassword, setShowSwapPassword] = useState(false);
  const [confirmRespondModal, setConfirmRespondModal] = useState(null);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [swapForm, setSwapForm] = useState({
    requester_id: '',
    target_officer_id: '',
    requester_date: '',
    requester_role: 'k1',
    target_date: '',
    target_role: 'k1',
    reason: '',
    password: ''
  });

  const [swapMonth, setSwapMonth] = useState(currentMonth);
  const [swapSchedulesMap, setSwapSchedulesMap] = useState({});
  const [swapHolidaysMap, setSwapHolidaysMap] = useState({});

  // Sync swap month data when swapMonth changes
  useEffect(() => {
    if (swapMonth === currentMonth) {
      setSwapSchedulesMap(schedulesMap);
      setSwapHolidaysMap(holidaysMap);
    } else {
      let isMounted = true;
      fetchSchedule(swapMonth).then(res => {
        if (isMounted && res && res.status === 'success') {
          setSwapSchedulesMap(res.schedules || {});
          setSwapHolidaysMap(res.holidays || {});
        }
      }).catch(err => console.error('Error fetching swap month schedule:', err));
      return () => { isMounted = false; };
    }
  }, [swapMonth, currentMonth, schedulesMap, holidaysMap]);

  // Helper to extract actual generated shifts for an officer for the selected swap month
  const getOfficerShifts = useCallback((officerId) => {
    if (!officerId) return [];
    const shifts = [];
    const roleNames = { k1: 'K1 (Pagi)', k2: 'K2 (Siang)', p: 'P (Pengaduan)', r: 'R (Rekomendasi)' };
    const targetMap = (swapMonth === currentMonth) ? schedulesMap : swapSchedulesMap;
    const targetHolidays = (swapMonth === currentMonth) ? holidaysMap : swapHolidaysMap;

    Object.entries(targetMap).forEach(([dt, sch]) => {
      if (targetHolidays[dt]) return;
      ['k1', 'k2', 'p', 'r'].forEach(r => {
        if (sch[r] == officerId) {
          shifts.push({
            date: dt,
            role: r,
            label: `📅 ${dt} — Shift ${roleNames[r]}`
          });
        }
      });
    });
    return shifts.sort((a, b) => a.date.localeCompare(b.date));
  }, [swapMonth, currentMonth, schedulesMap, swapSchedulesMap, holidaysMap, swapHolidaysMap]);

  // Toast & Modals
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Helper for presensi time range validation & button blocking
  const getPresensiEligibility = useCallback((dateStr, roleCode) => {
    if (holidaysMap[dateStr]) {
      return {
        eligible: false,
        reason: `Libur: ${holidaysMap[dateStr].title}`,
        isHoliday: true,
        holidayTitle: holidaysMap[dateStr].title
      };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (dateStr > todayStr) {
      return { eligible: false, reason: 'Belum Waktunya Presensi' };
    }
    if (dateStr < todayStr) {
      return { eligible: false, reason: 'Presensi Ditutup' };
    }

    const now = new Date();
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return { eligible: false, reason: 'Libur Akhir Pekan' };
    }

    const hour = now.getHours();
    const minute = now.getMinutes();
    const timeVal = hour * 60 + minute;

    if (roleCode === 'k2') {
      if (timeVal < (12 * 60)) {
        return { eligible: false, reason: 'Belum Buka (Sesi Siang 12:00 WITA)' };
      }
    } else {
      if (timeVal < (7 * 60 + 30)) {
        return { eligible: false, reason: 'Belum Buka (Sesi Pagi 07:30 WITA)' };
      }
    }

    if (timeVal > (17 * 60)) {
      return { eligible: false, reason: 'Waktu Presensi Selesai' };
    }

    return { eligible: true, reason: 'Presensi Sesi Ini' };
  }, []);

  // Edit Single Day Modal
  const [editDayModal, setEditDayModal] = useState(null);
  // Calendar Day Detail Modal Pop-up
  const [dayDetailModal, setDayDetailModal] = useState(null);
  // Edit Officer Modal
  const [editOfficerModal, setEditOfficerModal] = useState(null);
  // Digital Presensi Modal with Username & Password
  const [presensiModal, setPresensiModal] = useState(null);
  const [presensiError, setPresensiError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Floating Info Modal (Aturan Presensi & Jam Operasional)
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Import Excel Modal
  const [importExcelModal, setImportExcelModal] = useState(false);
  const [previewImportData, setPreviewImportData] = useState([]);
  const [csvDelimiter, setCsvDelimiter] = useState('auto'); // 'auto', ';', ',', '\t'
  const [rawFileText, setRawFileText] = useState('');

  // Custom Delete Confirmation Modal State
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(null); // { ids: [], count: 0 }

  // Bulk Selection for Officer Management
  const [selectedOfficerIds, setSelectedOfficerIds] = useState([]);

  const handleToggleSelectOfficer = (id) => {
    setSelectedOfficerIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllOfficers = (officersList) => {
    const allIds = officersList.map(o => o.id);
    const allSelected = allIds.length > 0 && allIds.every(id => selectedOfficerIds.includes(id));
    if (allSelected) {
      setSelectedOfficerIds(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelectedOfficerIds(prev => Array.from(new Set([...prev, ...allIds])));
    }
  };

  const handleBulkDeleteOfficers = (idsToDelete = selectedOfficerIds) => {
    if (!idsToDelete || !idsToDelete.length) return;
    setConfirmDeleteModal({
      ids: idsToDelete,
      count: idsToDelete.length
    });
  };

  const executeDeleteOfficers = async () => {
    if (!confirmDeleteModal || !confirmDeleteModal.ids.length) return;
    setLoading(true);
    try {
      const res = await deletePstOfficers(confirmDeleteModal.ids);
      showToast(res.message || 'Data petugas berhasil dihapus!');
      setSelectedOfficerIds(prev => prev.filter(id => !confirmDeleteModal.ids.includes(id)));
      setConfirmDeleteModal(null);
      loadData(currentMonth);
    } catch (err) {
      console.error('Error deleting officers:', err);
      showToast(err.response?.data?.error || err.message || 'Gagal menghapus data petugas.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const downloadExcelTemplate = () => {
    const data = [
      ['No', 'Nama Lengkap', 'NIP / NIPPPK', 'Jabatan', 'Tim Jaga (K/P/R)', 'No HP/WA', 'Username', 'Password'],
      ['1', 'Budi Santoso, S.Si.', '199001012020121001', 'Statistisi Ahli Pertama', 'K', '081234567890', 'budi', 'iyatawwa10'],
      ['2', 'Siti Aminah, S.Stat', '199205102021022002', 'Petugas Pengaduan & Aspirasi', 'P', '081234567891', 'siti', 'iyatawwa10'],
      ['3', 'Ahmad Fauzi, S.T.', '198808152015031003', 'Pemeriksa Rekomendasi Statistik', 'R', '081234567892', 'fauzi', 'iyatawwa10']
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Petugas');
    XLSX.writeFile(wb, 'Template_Import_Petugas_PST.xlsx');
  };

  const parseExcelOrCsv = (rawRows) => {
    if (!rawRows || !rawRows.length) return [];
    
    // Find header row (row containing keywords 'nama', 'name', 'nip', or 'petugas')
    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(rawRows.length, 5); r++) {
      const rowStr = (rawRows[r] || []).map(c => String(c || '').toLowerCase()).join(' ');
      if (rowStr.includes('nama') || rowStr.includes('name') || rowStr.includes('nip') || rowStr.includes('petugas')) {
        headerRowIdx = r;
        break;
      }
    }

    let nameIdx = -1, nipIdx = -1, positionIdx = -1, poolIdx = -1, phoneIdx = -1, usernameIdx = -1, passwordIdx = -1;

    if (headerRowIdx !== -1) {
      const headerCols = (rawRows[headerRowIdx] || []).map(h => String(h || '').trim().toLowerCase());
      nameIdx = headerCols.findIndex(h => h.includes('nama') || h.includes('name') || h === 'petugas');
      nipIdx = headerCols.findIndex(h => h.includes('nip'));
      positionIdx = headerCols.findIndex(h => h.includes('jabat') || h.includes('posis') || h.includes('role'));
      poolIdx = headerCols.findIndex(h => h.includes('tim') || h.includes('pool') || h.includes('jaga') || h.includes('k/p/r'));
      phoneIdx = headerCols.findIndex(h => h.includes('hp') || h.includes('wa') || h.includes('phone') || h.includes('telp') || h.includes('kontak'));
      usernameIdx = headerCols.findIndex(h => h.includes('user'));
      passwordIdx = headerCols.findIndex(h => h.includes('pass'));
    }

    const startIndex = headerRowIdx !== -1 ? headerRowIdx + 1 : 0;
    
    // Fallback if headers were not detected
    if (nameIdx === -1) {
      const sampleCol0 = String(rawRows[startIndex]?.[0] || '').trim();
      nameIdx = (!isNaN(sampleCol0) && sampleCol0.length > 0 && sampleCol0.length <= 4) ? 1 : 0;
    }
    if (nipIdx === -1) nipIdx = nameIdx === 1 ? 2 : 1;
    if (positionIdx === -1) positionIdx = nameIdx === 1 ? 3 : 2;
    if (poolIdx === -1) poolIdx = nameIdx === 1 ? 4 : 3;
    if (phoneIdx === -1) phoneIdx = nameIdx === 1 ? 5 : 4;
    if (usernameIdx === -1) usernameIdx = nameIdx === 1 ? 6 : 5;
    if (passwordIdx === -1) passwordIdx = nameIdx === 1 ? 7 : 6;

    const parsed = [];
    for (let i = startIndex; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || !row.length) continue;

      const name = String(row[nameIdx] ?? '').trim();
      // Skip empty or header-like entries
      if (!name || name.toLowerCase() === 'nama' || name.toLowerCase() === 'nama lengkap' || name.toLowerCase() === 'name') continue;

      const nipVal = String(row[nipIdx] ?? '').trim();
      const posVal = String(row[positionIdx] ?? '').trim();
      const poolValRaw = String(row[poolIdx] ?? 'K').trim();
      const phoneVal = String(row[phoneIdx] ?? '').trim();
      let userVal = String(row[usernameIdx] ?? '').trim().toLowerCase();
      const passVal = String(row[passwordIdx] ?? '').trim() || 'iyatawwa10';

      let poolVal = 'K';
      const upperPool = poolValRaw.toUpperCase();
      if (upperPool.includes('P') && !upperPool.includes('PST') && !upperPool.includes('TIM PST')) poolVal = 'P';
      else if (upperPool.includes('R') && !upperPool.includes('BARRU')) poolVal = 'R';
      else poolVal = 'K';

      // Auto generate username if empty
      if (!userVal) {
        const parts = name.toLowerCase().replace(/[^a-z ]/g, '').trim().split(/\s+/);
        userVal = parts[0] || 'petugas';
        if (userVal.length < 3 && parts[1]) userVal += parts[1];
      }

      parsed.push({
        name,
        nip: nipVal,
        position: posVal,
        pool_type: poolVal,
        phone: phoneVal,
        username: userVal,
        password: passVal
      });
    }

    return parsed;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        const parsed = parseExcelOrCsv(rawRows);
        setPreviewImportData(parsed);
      } catch (err) {
        console.error('Error parsing spreadsheet:', err);
        showToast('Gagal memproses file Excel/CSV: ' + err.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = async () => {
    if (!previewImportData.length) return;
    setLoading(true);
    try {
      const res = await importPstOfficers(previewImportData);
      showToast(res.message || 'Berhasil mengimpor data petugas dari Excel!');
      setImportExcelModal(false);
      setPreviewImportData([]);
      loadData(currentMonth);
    } catch (err) {
      console.error('Error importing officers:', err);
      showToast(err.response?.data?.error || err.message || 'Gagal mengimpor file Excel.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Holiday CRUD Actions
  const handleSaveHoliday = async (e) => {
    e.preventDefault();
    if (!holidayForm.date || !holidayForm.title) {
      showToast('Tanggal dan Nama Hari Libur wajib diisi.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await savePstHoliday(holidayForm);
      showToast(res.message || 'Hari Libur berhasil disimpan!');
      setHolidayForm({ date: '', title: '', type: 'national_holiday', description: '' });
      loadData(currentMonth);
    } catch (err) {
      showToast('Gagal menyimpan hari libur.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHoliday = async (date) => {
    setLoading(true);
    try {
      const res = await deletePstHoliday(date);
      showToast(res.message || 'Hari Libur berhasil dihapus!');
      loadData(currentMonth);
    } catch (err) {
      showToast('Gagal menghapus hari libur.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncHolidays = async () => {
    setLoading(true);
    try {
      const year = currentMonth.split('-')[0] || new Date().getFullYear();
      const res = await syncPstNationalHolidays(year);
      showToast(res.message || `Hari Libur Nasional ${year} berhasil disinkronkan!`);
      loadData(currentMonth);
    } catch (err) {
      showToast('Gagal menyinkronkan hari libur.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Shift Swap Actions
  const handleCreateSwap = async (e) => {
    e.preventDefault();
    if (!swapForm.requester_id || !swapForm.target_officer_id || !swapForm.requester_date || !swapForm.target_date) {
      showToast('Mohon lengkapi semua data pengajuan tukar jadwal.', 'error');
      return;
    }
    if (!swapForm.password) {
      showToast('Mohon masukkan password akun petugas pengaju.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await createPstSwapRequest(swapForm);
      if (res && res.status === 'error') {
        showToast(res.message || 'Gagal mengajukan tukar jadwal.', 'error');
      } else {
        showToast(res?.message || 'Pengajuan tukar jadwal berhasil dikirim!');
        setSwapModal(false);
        setSwapForm({ requester_id: '', target_officer_id: '', requester_date: '', requester_role: 'k1', target_date: '', target_role: 'k1', reason: '', password: '' });
        await loadData(currentMonth);
        setActiveTab('swap');
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Gagal mengajukan tukar jadwal.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRespondSwapSubmit = async (e) => {
    e.preventDefault();
    if (!confirmRespondModal || !confirmRespondModal.password) {
      showToast('Password verifikasi wajib diisi.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await respondPstSwapRequest({
        request_id: confirmRespondModal.requestId,
        action_type: confirmRespondModal.actionType,
        password: confirmRespondModal.password,
        rejection_reason: confirmRespondModal.rejectionReason || ''
      });
      if (res && res.status === 'error') {
        showToast(res.message || 'Gagal merespons pengajuan.', 'error');
      } else {
        showToast(res?.message || 'Berhasil merespons pengajuan tukar!');
        setConfirmRespondModal(null);
        await loadData(currentMonth);
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Gagal merespons pengajuan.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSwap = async (requestId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus log pengajuan tukar jadwal ini dari sistem?')) return;
    setLoading(true);
    try {
      const res = await deletePstSwapRequest({ request_id: requestId });
      showToast(res.message || 'Log pengajuan berhasil dihapus.');
      await loadData(currentMonth);
    } catch (err) {
      showToast('Gagal menghapus log pengajuan.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCompletedSwaps = async () => {
    if (!window.confirm('Bersihkan seluruh log pengajuan tukar yang sudah selesai (disetujui/ditolak)?')) return;
    setLoading(true);
    try {
      const res = await deletePstSwapRequest({ clear_all_completed: true });
      showToast(res.message || 'Seluruh log selesai berhasil dibersihkan.');
      await loadData(currentMonth);
    } catch (err) {
      showToast('Gagal membersihkan log pengajuan.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const [genRemaining, setGenRemaining] = useState(3);
  const [genCount, setGenCount] = useState(0);
  const [genInfo, setGenInfo] = useState(null);
  const [confirmGenModal, setConfirmGenModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const loadData = async (month) => {
    setLoading(true);
    try {
      const res = await fetchSchedule(month || currentMonth);
      if (res && res.status === 'success') {
        const rawHolidays = res.holidays || {};
        const rawSchedules = res.schedules || {};
        const cleanedSchedules = { ...rawSchedules };

        // Ensure holiday dates have no officers assigned
        Object.keys(rawHolidays).forEach(hDate => {
          if (cleanedSchedules[hDate]) {
            cleanedSchedules[hDate] = {
              ...cleanedSchedules[hDate],
              k1: null,
              k2: null,
              p: null,
              r: null,
              is_holiday: true,
              note: rawHolidays[hDate].title
            };
          }
        });

        setOfficers(res.officers || []);
        setSchedulesMap(cleanedSchedules);
        setPresensiMap(res.presensi || {});
        setHolidaysMap(rawHolidays);
        setSwapRequests(res.swap_requests || []);
        if (res.gen_remaining !== undefined) {
          setGenRemaining(res.gen_remaining);
        }
        if (res.gen_count !== undefined) {
          setGenCount(res.gen_count);
        }
        if (res.gen_info) {
          setGenInfo(res.gen_info);
        }
      }
    } catch (err) {
      console.error('Error fetching PST schedule:', err);
      showToast('Gagal memuat jadwal PST.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const newMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(newMonthStr);
    setSelectedDate(`${newMonthStr}-01`);
  };

  const handleNextMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const newMonthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(newMonthStr);
    setSelectedDate(`${newMonthStr}-01`);
  };

  const handleJumpToToday = () => {
    const today = new Date();
    const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setCurrentMonth(monthStr);
    setSelectedDate(dateStr);
  };

  const handleJumpToNextMonth = () => {
    const today = new Date();
    const nextDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const monthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    const dateStr = `${monthStr}-01`;
    setCurrentMonth(monthStr);
    setSelectedDate(dateStr);
  };

  const currentActualMonthStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const isFutureMonth = currentMonth > currentActualMonthStr;

  const downloadRekapExcel = () => {
    let csv = "NO,NAMA PETUGAS,NIP,JABATAN,TIM JAGA,TOTAL SEBULAN,JADWAL SELESAI,JADWAL MENDATANG,HADIR TEPAT,HADIR TERLAMBAT,TIDAK HADIR,TINGKAT KEHADIRAN (%)\n";
    
    const rekapData = officers
      .filter(o => roleFilter === 'all' || (o.pool_type || 'K').toUpperCase() === roleFilter)
      .map((off, idx) => {
        const pool = (off.pool_type || 'K').toUpperCase();
        let pastAssigned = 0;
        let futureAssigned = 0;
        let onTimeCount = 0;
        let lateCount = 0;
        let absentCount = 0;

        Object.entries(schedulesMap).forEach(([dt, sch]) => {
          const isPastOrToday = dt <= todayStr;
          ['k1', 'k2', 'p', 'r'].forEach(r => {
            if (sch[r] == off.id) {
              const roleCodeUpper = r.toUpperCase();
              const roleCodeLower = r.toLowerCase();
              const presObj = presensiMap[`${dt}_${off.id}_${roleCodeUpper}`] || presensiMap[`${dt}_${off.id}_${roleCodeLower}`];
              if (isPastOrToday) {
                pastAssigned++;
                if (presObj) {
                  if (presObj.status === 'terlambat') lateCount++;
                  else onTimeCount++;
                } else {
                  absentCount++;
                }
              } else {
                futureAssigned++;
              }
            }
          });
        });

        const totalMonth = pastAssigned + futureAssigned;
        const weightedScore = (onTimeCount * 1.0) + (lateCount * 0.5);
        const pct = pastAssigned > 0 ? Math.round((weightedScore / pastAssigned) * 100) : 100;
        const poolLabel = pool === 'K' ? 'Tim PST (K)' : (pool === 'P' ? 'Tim Pengaduan (P)' : 'Tim Rekomendasi (R)');

        return {
          no: idx + 1,
          name: off.name,
          nip: off.nip || '-',
          position: off.position || '-',
          poolLabel,
          totalMonth,
          pastAssigned,
          futureAssigned,
          onTimeCount,
          lateCount,
          absentCount,
          pct: `${pct}%`
        };
      });

    rekapData.forEach(row => {
      csv += `"${row.no}","${row.name}","${row.nip}","${row.position}","${row.poolLabel}","${row.totalMonth} Hari","${row.pastAssigned} Hari","${row.futureAssigned} Hari","${row.onTimeCount} Sesi","${row.lateCount} Sesi","${row.absentCount} Sesi","${row.pct}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Rekap_Kehadiran_PST_Barru_${currentMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrevDay = () => {
    const curr = new Date(selectedDate);
    curr.setDate(curr.getDate() - 1);
    const mStr = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}`;
    const dStr = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
    if (mStr !== currentMonth) {
      setCurrentMonth(mStr);
    }
    setSelectedDate(dStr);
  };

  const handleNextDay = () => {
    const curr = new Date(selectedDate);
    curr.setDate(curr.getDate() + 1);
    const mStr = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}`;
    const dStr = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
    if (mStr !== currentMonth) {
      setCurrentMonth(mStr);
    }
    setSelectedDate(dStr);
  };

  const handleSubmitPresensi = async (e) => {
    e.preventDefault();
    if (!presensiModal) return;
    setLoading(true);
    setPresensiError('');
    try {
      const res = await checkInPst({
        date: presensiModal.date,
        officer_id: presensiModal.officer_id,
        role_code: presensiModal.role_code,
        username: presensiModal.username,
        password: presensiModal.password,
        notes: presensiModal.notes || 'Presensi Digital Mandiri'
      });
      showToast(res.message || 'Presensi piket berhasil dicatat!');
      setPresensiModal(null);
      setPresensiError('');
      loadData(currentMonth);
    } catch (err) {
      console.error('Error presensi:', err);
      const errMsg = err.response?.data?.error || err.message || 'Presensi gagal. Username atau password tidak cocok.';
      setPresensiError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(currentMonth);
  }, [currentMonth]);

  useEffect(() => {
    if (selectedDate && selectedDate.length >= 7) {
      const targetMonth = selectedDate.substring(0, 7);
      if (targetMonth !== currentMonth) {
        setCurrentMonth(targetMonth);
      }
    }
  }, [selectedDate]);

  // Officer Map for fast lookup
  const officerMap = useMemo(() => {
    const map = {};
    officers.forEach(o => {
      map[o.id] = o;
    });
    return map;
  }, [officers]);

  // Real-time Status Calculation for Today
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todaySchedule = schedulesMap[todayStr] || null;

  const currentPstStatus = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const timeVal = hour + minute / 60;

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return { status: 'closed', label: 'Tutup (Akhir Pekan)', color: '#ff3b30', activeRole: null };
    }

    const isFriday = dayOfWeek === 5;
    const closingTime = isFriday ? 16.5 : 16.0;

    if (timeVal < 8.0) {
      return { status: 'before', label: 'Belum Buka (Buka 08.00 WITA)', color: '#ff9500', activeRole: null };
    } else if (timeVal >= 8.0 && timeVal < 12.5) {
      return { status: 'morning', label: 'Buka - Sesi Pagi (K1, P, R)', color: '#34c759', activeRole: 'k1' };
    } else if (timeVal >= 12.5 && timeVal < closingTime) {
      return { status: 'afternoon', label: `Buka - Sesi Siang (K2, P, R)`, color: '#00b4d8', activeRole: 'k2' };
    } else {
      return { status: 'closed', label: 'Tutup Jam Operasional', color: '#ff3b30', activeRole: null };
    }
  }, []);

  // Calculate overall monthly metrics for Tab 3 Summary Cards
  const overallMonthlyStats = useMemo(() => {
    let totalAssignedSchedules = 0;
    let totalOnTimeSchedules = 0;
    let totalLateSchedules = 0;
    let totalAbsentSchedules = 0;

    officers.forEach(off => {
      Object.entries(schedulesMap).forEach(([dt, sch]) => {
        const isPastOrToday = dt <= todayStr;
        ['k1', 'k2', 'p', 'r'].forEach(r => {
          if (sch[r] == off.id) {
            const roleCodeUpper = r.toUpperCase();
            const roleCodeLower = r.toLowerCase();
            const presObj = presensiMap[`${dt}_${off.id}_${roleCodeUpper}`] || presensiMap[`${dt}_${off.id}_${roleCodeLower}`];
            if (isPastOrToday) {
              totalAssignedSchedules++;
              if (presObj) {
                if (presObj.status === 'terlambat') {
                  totalLateSchedules++;
                } else {
                  totalOnTimeSchedules++;
                }
              } else {
                totalAbsentSchedules++;
              }
            }
          }
        });
      });
    });

    const weightedTotal = (totalOnTimeSchedules * 1.0) + (totalLateSchedules * 0.5);
    const overallRate = totalAssignedSchedules > 0 ? Math.round((weightedTotal / totalAssignedSchedules) * 100) : 100;

    return {
      totalAssignedSchedules,
      totalOnTimeSchedules,
      totalLateSchedules,
      totalAbsentSchedules,
      overallRate
    };
  }, [officers, schedulesMap, presensiMap, todayStr]);

  // Handle Digital Presensi / Check-In
  const handleCheckIn = async (roleCode, officerId) => {
    if (!officerId) return;
    try {
      const res = await checkInPst({
        date: selectedDate,
        officer_id: officerId,
        role_code: roleCode,
        notes: 'Presensi Digital Mandiri'
      });
      showToast(res.message || 'Presensi piket berhasil dicatat!');
      loadData(currentMonth);
    } catch (err) {
      console.error('Error check-in:', err);
      showToast('Gagal melakukan presensi piket.', 'error');
    }
  };

  // Handle Auto Generate Roster Prompt
  const handleAutoGenerate = () => {
    if (!isAdmin) return;
    setConfirmGenModal(true);
  };

  const executeAutoGenerate = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res = await autoGenerateSchedule(currentMonth, genMode);
      showToast(res.message || 'Rotasi piket 1 bulan berhasil di-generate secara adil tanpa irisan!');
      if (res.gen_info) setGenInfo(res.gen_info);
      if (res.gen_count !== undefined) setGenCount(res.gen_count);
      if (res.gen_remaining !== undefined) setGenRemaining(res.gen_remaining);
      await loadData(currentMonth);
    } catch (err) {
      console.error('Error auto generating:', err);
      showToast(err.response?.data?.error || err.message || 'Gagal meng-generate jadwal piket.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Save Single Day Assignment
  const handleSaveDayAssignment = async (e) => {
    e.preventDefault();
    if (!editDayModal) return;
    try {
      await updateDaySchedule(editDayModal);
      showToast(`Jadwal tanggal ${editDayModal.date} berhasil disimpan!`);
      setEditDayModal(null);
      loadData(currentMonth);
    } catch (err) {
      showToast('Gagal memperbarui jadwal piket.', 'error');
    }
  };

  // Handle Save Officer Profile & Account
  const handleSaveOfficer = async (e) => {
    e.preventDefault();
    if (!editOfficerModal) return;
    try {
      await savePstOfficer(editOfficerModal);
      showToast('Data & Akun Petugas PST berhasil disimpan!');
      setEditOfficerModal(null);
      loadData(currentMonth);
    } catch (err) {
      showToast('Gagal menyimpan data petugas.', 'error');
    }
  };

  // Monthly statistics of shifts per officer
  const officerStats = useMemo(() => {
    const stats = {};
    officers.forEach(o => {
      stats[o.id] = { k1: 0, k2: 0, p: 0, r: 0, total: 0 };
    });

    Object.values(schedulesMap).forEach(sch => {
      ['k1', 'k2', 'p', 'r'].forEach(role => {
        const offId = sch[role];
        if (offId && stats[offId]) {
          stats[offId][role]++;
          stats[offId].total++;
        }
      });
    });

    return stats;
  }, [officers, schedulesMap]);

  // Calendar dates list for target month
  const calendarDays = useMemo(() => {
    const parts = currentMonth.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);

    const firstDayIndex = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();

    const days = [];
    for (let i = 0; i < (firstDayIndex === 0 ? 6 : firstDayIndex - 1); i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, dateStr });
    }
    return days;
  }, [currentMonth]);

  const targetDayDetails = schedulesMap[selectedDate] || null;
  const isFridaySelected = new Date(selectedDate).getDay() === 5;
  const isWeekendSelected = [0, 6].includes(new Date(selectedDate).getDay());

  return (
    <div className="animate-fade-in text-gray-800" style={{ paddingBottom: '3rem' }}>
      
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 999999,
          background: toast.type === 'error' ? '#ff3b30' : '#34c759',
          color: '#fff',
          padding: '0.75rem 1.25rem',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
          fontWeight: 700
        }}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(0,122,255,0.06), rgba(0,180,216,0.04))', borderColor: 'rgba(0,122,255,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#007aff', marginBottom: '0.35rem' }}>
              <Clock size={14} />
              <span>Pelayanan Statistik Terpadu (PST) BPS Barru</span>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              Jadwal Piket Jaga PST & Rekomendasi
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', marginBottom: 0 }}>
              Sistem informasi rotasi giliran tugas harian PST Pagi (K1), PST Siang (K2), Pengaduan (P), dan Rekomendasi (R).
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Live Operational Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: '99px',
              background: currentPstStatus.color + '15',
              border: `1px solid ${currentPstStatus.color}35`,
              color: currentPstStatus.color,
              fontSize: '0.75rem',
              fontWeight: 800
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: currentPstStatus.color, animation: 'pulse 1.5s infinite' }} />
              <span>{currentPstStatus.label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Role-based User Status Banner */}
      {isLoggedIn ? (
        <div className="glass-card" style={{ marginBottom: '1.25rem', padding: '0.85rem 1.25rem', background: 'rgba(52,199,89,0.06)', borderColor: 'rgba(52,199,89,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <UserCheck size={18} style={{ color: '#248a3d' }} />
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Sesi Login: {loggedUser?.name || loggedUser?.username || 'Pengguna'}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                ({isAdmin ? '🔑 Administrator' : '👤 Petugas Piket PST'})
              </span>
            </div>
          </div>

          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#248a3d', background: 'rgba(52,199,89,0.15)', padding: '0.2rem 0.6rem', borderRadius: '99px' }}>
            {isAdmin ? 'Akses Penuh Pengelolaan Jadwal' : 'Akses Presensi Mandiri Petugas'}
          </span>
        </div>
      ) : (
        <div className="glass-card" style={{ marginBottom: '1.25rem', padding: '0.85rem 1.25rem', background: 'rgba(0,122,255,0.04)', borderColor: 'rgba(0,122,255,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <LogIn size={18} style={{ color: '#007aff' }} />
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Tampilan Publik (Melihat Jadwal)
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem', display: 'block' }}>
                Admin & Petugas PST dapat login untuk mengelola jadwal atau melakukan presensi digital.
              </span>
            </div>
          </div>

          <a href="#/login" className="glass-btn glass-btn-primary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.85rem', textDecoration: 'none' }}>
            🔑 Login Admin / Petugas
          </a>
        </div>
      )}

      {/* Primary Navigation Tabs & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }} className="no-print">
        {/* Left: Tab Switcher */}
        <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(0,0,0,0.04)', padding: '0.3rem', borderRadius: '14px' }}>
          <button
            onClick={() => setActiveTab('daily')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: activeTab === 'daily' ? 'var(--card-bg, #ffffff)' : 'transparent',
              color: activeTab === 'daily' ? '#007aff' : 'var(--text-secondary)',
              boxShadow: activeTab === 'daily' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Clock size={15} />
            Piket Hari Ini
          </button>

          <button
            onClick={() => setActiveTab('monthly')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: activeTab === 'monthly' ? 'var(--card-bg, #ffffff)' : 'transparent',
              color: activeTab === 'monthly' ? '#007aff' : 'var(--text-secondary)',
              boxShadow: activeTab === 'monthly' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Calendar size={15} />
            Kalender Bulanan
          </button>

          <button
            onClick={() => setActiveTab('rekap')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: activeTab === 'rekap' ? 'var(--card-bg, #ffffff)' : 'transparent',
              color: activeTab === 'rekap' ? '#007aff' : 'var(--text-secondary)',
              boxShadow: activeTab === 'rekap' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Award size={15} />
            Rekap Jadwal & Absen
          </button>

          <button
            onClick={() => setActiveTab('swap')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: activeTab === 'swap' ? 'var(--card-bg, #ffffff)' : 'transparent',
              color: activeTab === 'swap' ? '#007aff' : 'var(--text-secondary)',
              boxShadow: activeTab === 'swap' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <ArrowLeftRight size={15} />
            <span>Tukar Jadwal</span>
            {swapRequests.filter(s => s.status === 'pending_user2' || s.status === 'pending_admin').length > 0 && (
              <span style={{ fontSize: '0.65rem', fontWeight: 900, background: '#ff3b30', color: '#fff', padding: '0.1rem 0.45rem', borderRadius: '10px' }}>
                {swapRequests.filter(s => s.status === 'pending_user2' || s.status === 'pending_admin').length}
              </span>
            )}
          </button>

          {isAdmin && (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setActiveTab('officers')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: activeTab === 'officers' ? 'var(--card-bg, #ffffff)' : 'transparent',
                  color: activeTab === 'officers' ? '#007aff' : 'var(--text-secondary)',
                  boxShadow: activeTab === 'officers' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Users size={15} />
                Kelola Petugas & Akun
              </button>

              <button
                onClick={() => setManageHolidaysModal(true)}
                className="glass-btn"
                style={{
                  padding: '0.5rem 0.85rem',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: '#ff9500',
                  borderColor: 'rgba(255,149,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Palmtree size={15} />
                Kelola Hari Libur
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TAB 1: DAILY DUTY VIEW (JADWAL HARIAN & PRESENSI) */}
      {activeTab === 'daily' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Target Date Picker & Day Switcher Bar */}
          <div className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            {/* Day Switcher Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(0,0,0,0.04)', padding: '0.25rem', borderRadius: '10px' }}>
                <button
                  onClick={handlePrevDay}
                  className="glass-btn"
                  title="Hari Sebelumnya"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: 700 }}
                >
                  <ChevronLeft size={14} />
                  Sebelumnya
                </button>

                <button
                  onClick={handleJumpToToday}
                  className="glass-btn glass-btn-primary"
                  title="Langsung lari ke jadwal Hari Ini"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 800, background: selectedDate === todayStr ? '#248a3d' : '#007aff' }}
                >
                  ⚡ Hari Ini
                </button>

                <button
                  onClick={handleNextDay}
                  className="glass-btn"
                  title="Hari Berikutnya"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: 700 }}
                >
                  Berikutnya
                  <ChevronRight size={14} />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="glass-input"
                  style={{ padding: '0.35rem 0.65rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700 }}
                />
              </div>

              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#007aff', marginLeft: '0.25rem' }}>
                📅 {new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>

            {/* Right: Auto-Rotation Controls (Admin Only) */}
            {isAdmin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '0.25rem 0.6rem',
                  borderRadius: '6px',
                  background: 'rgba(52,199,89,0.12)',
                  color: '#248a3d'
                }}>
                  ⚡ Auto-Rotasi Piket Aktif
                </span>

                <select
                  value={genMode}
                  onChange={(e) => setGenMode(e.target.value)}
                  className="glass-select"
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.65rem' }}
                  title="Pilih mode urutan rotasi"
                >
                  <option value="sequential">Rotasi Urut (Sequential)</option>
                  <option value="random">Rotasi Acak (Random)</option>
                </select>

                <button
                  onClick={handleAutoGenerate}
                  className="glass-btn glass-btn-primary"
                  disabled={loading}
                  title={`Generate rotasi piket bergiliran 4 role tanpa irisan untuk bulan ${currentMonth}`}
                  style={{ padding: '0.45rem 0.85rem', fontSize: '0.75rem', fontWeight: 800, background: isFutureMonth ? 'linear-gradient(135deg, #007aff 0%, #5856d6 100%)' : undefined }}
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  {isFutureMonth ? `⚡ Pre-Generate ${new Date(`${currentMonth}-01`).toLocaleDateString('id-ID', { month: 'short' })}` : 'Auto-Rotasi 1 Bulan'}
                </button>
              </div>
            )}
          </div>

          {/* Info Banner: Last Generation Timestamp & Source (Visible to User & Admin) */}
          <div style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '14px',
            background: isFutureMonth ? 'rgba(88,86,214,0.06)' : 'rgba(0,122,255,0.06)',
            border: isFutureMonth ? '1px solid rgba(88,86,214,0.2)' : '1px solid rgba(0,122,255,0.15)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: isFutureMonth ? '#5856d6' : '#007aff',
            fontWeight: 700,
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Info size={16} />
              <span>
                <strong>Status Roster Bulan {currentMonth}:</strong> Terakhir di-generate pada{' '}
                <strong>{genInfo?.timestamp || 'Awal Bulan'}</strong> ({genInfo?.type_label || 'Otomatis Sistem Tanggal 1'}).
              </span>
              {isFutureMonth && (
                <span style={{ fontSize: '0.65rem', fontWeight: 900, background: '#5856d6', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '99px' }}>
                  🚀 Pre-Generate (Bulan Mendatang)
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowGuide(!showGuide)}
                className="glass-btn"
                style={{
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  background: showGuide ? '#007aff' : 'rgba(0,122,255,0.1)',
                  color: showGuide ? '#ffffff' : '#007aff',
                  borderColor: 'rgba(0,122,255,0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
                title="Lihat Panduan Ringkas Presensi Petugas PST"
              >
                <BookOpen size={13} />
                <span>{showGuide ? 'Sembunyikan Panduan' : '💡 Panduan Presensi'}</span>
              </button>

              <button
                onClick={handlePrevMonth}
                className="glass-btn"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                title="Bulan Sebelumnya"
              >
                <ChevronLeft size={12} />
              </button>

              <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                {new Date(`${currentMonth}-01`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </span>

              <button
                onClick={handleNextMonth}
                className="glass-btn"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                title="Bulan Sesudahnya"
              >
                <ChevronRight size={12} />
              </button>

              <button
                onClick={handleJumpToNextMonth}
                className="glass-btn"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', fontWeight: 800, background: 'rgba(88,86,214,0.1)', color: '#5856d6', borderColor: 'rgba(88,86,214,0.2)' }}
                title="Langsung Lompat ke Bulan Depan"
              >
                ⏩ Bulan Depan
              </button>
            </div>
          </div>

          {/* Panduan Simpel Presensi Petugas PST */}
          {showGuide && (
            <div className="glass-card animate-fade-in" style={{ padding: '1.25rem 1.5rem', borderRadius: '16px', borderLeft: '4px solid #007aff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(0,122,255,0.12)', color: '#007aff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                      Panduan Ringkas Presensi Petugas Pelayanan PST
                    </h3>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      Petunjuk teknis pencatatan jadwal & presensi piket PST BPS Kabupaten Barru
                    </span>
                  </div>
                </div>
                <button onClick={() => setShowGuide(false)} className="glass-btn" style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem', fontWeight: 700 }}>
                  Tutup ✕
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '0.75rem' }}>
                {/* Langkah 1 */}
                <div style={{ background: 'var(--card-sub-bg)', padding: '0.9rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem', color: '#007aff', fontWeight: 800, fontSize: '0.78rem' }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#007aff', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 900 }}>1</span>
                    <span>Pilih Sesi & Peran Tugas</span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    Buka tab <strong>Harian</strong> pada tanggal bertugas. Pastikan nama Anda tertera di salah satu kartu peran (<strong>K1</strong> Pagi, <strong>K2</strong> Siang, <strong>P</strong> Pengaduan, atau <strong>R</strong> Rekomendasi).
                  </p>
                </div>

                {/* Langkah 2 */}
                <div style={{ background: 'var(--card-sub-bg)', padding: '0.9rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem', color: '#007aff', fontWeight: 800, fontSize: '0.78rem' }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#007aff', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 900 }}>2</span>
                    <span>Klik Presensi Sesi Ini</span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    Klik tombol <strong>`⚡ Presensi Sesi Ini`</strong> pada kartu tugas Anda. Tombol ini akan aktif saat jam operasional sesi berjalan.
                  </p>
                </div>

                {/* Langkah 3 */}
                <div style={{ background: 'var(--card-sub-bg)', padding: '0.9rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem', color: '#007aff', fontWeight: 800, fontSize: '0.78rem' }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#007aff', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 900 }}>3</span>
                    <span>Login & Submit Presensi</span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    Masukkan <strong>Username & Password</strong> akun petugas Anda. Setelah disubmit, kartu akan berstatus hijau <strong>`✓ Telah Presensi`</strong>.
                  </p>
                </div>

                {/* Langkah 4 */}
                <div style={{ background: 'var(--card-sub-bg)', padding: '0.9rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem', color: '#5856d6', fontWeight: 800, fontSize: '0.78rem' }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#5856d6', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 900 }}>4</span>
                    <span>Tukar Jadwal (Swap)</span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    Jika ada keperluan dinas luar/keluarga, ajukan penukaran jadwal di tab <strong>🔄 Pengajuan Tukar</strong> untuk di-ACC oleh Admin.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Weekend or National Holiday Alert */}
          {isWeekendSelected || holidaysMap[selectedDate] ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', background: 'rgba(255,59,48,0.03)', borderColor: 'rgba(255,59,48,0.15)' }}>
              <Palmtree size={42} style={{ color: holidaysMap[selectedDate] ? '#ff9500' : '#ff3b30', margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.35rem' }}>
                {holidaysMap[selectedDate] ? `🎉 Libur: ${holidaysMap[selectedDate].title}` : 'Hari Libur Akhir Pekan'}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 1.25rem', lineHeight: 1.5 }}>
                {holidaysMap[selectedDate]
                  ? `Pelayanan Terpadu Satu Pintu (PST) BPS Kabupaten Barru tutup berkenaan dengan ${holidaysMap[selectedDate].title}. Anda dapat mengajukan janji temu atau menghubungi layanan kami:`
                  : 'Pelayanan Terpadu Terintegrasi (PST) BPS Kabupaten Barru tutup pada hari Sabtu dan Minggu. Layanan kembali beroperasi pada hari kerja berikutnya. Anda dapat mengajukan janji temu atau berkonsultasi via layanan kami:'}
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <a
                  href="http://s.bps.go.id/pst7310_janjitemu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-btn glass-btn-primary"
                  style={{ textDecoration: 'none', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Calendar size={15} />
                  <span>Form Janji Temu PST</span>
                </a>
                <a
                  href="https://wa.me/6282190439816"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-btn"
                  style={{ textDecoration: 'none', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 800, background: '#25D366', color: '#ffffff', borderColor: '#1eb857', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <MessageSquare size={15} />
                  <span>WhatsApp PST (0821-9043-9816)</span>
                </a>
              </div>
            </div>
          ) : (
            <>
              {/* Outside Operating Hours Service Redirect Banner */}
              {selectedDate === todayStr && currentPstStatus.status === 'closed' && !isWeekendSelected && (
                <div className="glass-card" style={{ padding: '1rem 1.25rem', borderRadius: '14px', background: 'rgba(255,149,0,0.06)', border: '1px solid rgba(255,149,0,0.2)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,149,0,0.12)', color: '#ff9500', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Clock size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        Jam Operasional Pelayanan PST Hari Ini Telah Berakhir
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        PST buka kembali besok pukul 08.00 WITA. Anda tetap dapat mengajukan janji temu atau berkonsultasi via layanan kami:
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <a
                      href="http://s.bps.go.id/pst7310_janjitemu"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glass-btn glass-btn-primary"
                      style={{ textDecoration: 'none', padding: '0.4rem 0.75rem', fontSize: '0.75rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Calendar size={14} />
                      <span>Form Janji Temu PST</span>
                    </a>
                    <a
                      href="https://wa.me/6282190439816"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glass-btn"
                      style={{ textDecoration: 'none', padding: '0.4rem 0.75rem', fontSize: '0.75rem', fontWeight: 800, background: '#25D366', color: '#ffffff', borderColor: '#1eb857', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <MessageSquare size={14} />
                      <span>WhatsApp PST (0821-9043-9816)</span>
                    </a>
                  </div>
                </div>
              )}

              {/* 4 Duty Cards Grid (Strict Non-Overlapping Officers) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                {Object.entries(DUTY_ROLES).map(([key, role]) => {
                  const officerId = targetDayDetails?.[key];
                  const officer = officerMap[officerId];
                  const isActiveRole = selectedDate === todayStr && currentPstStatus.activeRole === key;
                  const dutyTime = isFridaySelected ? role.timeFri : role.timeMonThu;

                  const presensiKey = `${selectedDate}_${officerId}_${key}`;
                  const presensiRecord = presensiMap[presensiKey];

                  // Check if logged officer matches this duty card
                  const isUserAssignedHere = (loggedUser?.officer_id && loggedUser?.officer_id === officerId) || isAdmin;

                  return (
                    <div
                      key={key}
                      className="glass-card"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: '1.25rem',
                        position: 'relative',
                        borderRadius: '16px',
                        borderTop: `3px solid ${role.color}`,
                        borderLeft: '1px solid var(--glass-border)',
                        borderRight: '1px solid var(--glass-border)',
                        borderBottom: '1px solid var(--glass-border)',
                        background: 'var(--card-bg)',
                        boxShadow: isActiveRole ? `0 0 24px ${role.color}30` : undefined,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {/* Top Header Badge */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <span style={{
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              background: role.color,
                              color: '#fff',
                              fontSize: '0.72rem',
                              fontWeight: 900,
                              letterSpacing: '0.02em'
                            }}>
                              {role.code}
                            </span>
                            <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                              {role.name}
                            </span>
                          </div>

                          {isActiveRole && (
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              padding: '0.2rem 0.55rem',
                              borderRadius: '99px',
                              background: 'rgba(52,199,89,0.15)',
                              color: '#34c759',
                              border: '1px solid rgba(52,199,89,0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34c759' }} />
                              Sesi Aktif
                            </span>
                          )}
                        </div>

                        {/* Duty Time Badge */}
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: role.color, display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '1rem' }}>
                          <Clock size={13} />
                          <span>{dutyTime}</span>
                        </div>

                        {/* Assigned Officer Details */}
                        {officer ? (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.85rem',
                            padding: '0.85rem 1rem',
                            borderRadius: '14px',
                            background: 'var(--card-sub-bg)',
                            border: '1px solid var(--glass-border)'
                          }}>
                            {/* Avatar */}
                            <div style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '10px',
                              background: `linear-gradient(135deg, ${role.color}, #0f172a)`,
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1rem',
                              fontWeight: 800,
                              flexShrink: 0
                            }}>
                              {officer.name.charAt(0)}
                            </div>

                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>
                                {officer.name}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ padding: '1rem', textAlign: 'center', borderRadius: '14px', background: 'var(--card-sub-bg)', border: '1px dashed var(--glass-border)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Belum ada petugas ditugaskan
                          </div>
                        )}

                        {/* Presensi Check-In Status */}
                        {officer && (
                          <div style={{ marginTop: '0.85rem' }}>
                            {presensiRecord ? (
                              <div style={{
                                padding: '0.45rem 0.75rem',
                                borderRadius: '9px',
                                background: presensiRecord.status === 'terlambat' ? 'rgba(255,149,0,0.12)' : 'rgba(52,199,89,0.12)',
                                border: `1px solid ${presensiRecord.status === 'terlambat' ? 'rgba(255,149,0,0.3)' : 'rgba(52,199,89,0.3)'}`,
                                color: presensiRecord.status === 'terlambat' ? '#ff9500' : '#34c759',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.4rem'
                              }}>
                                <div style={{ fontSize: '0.74rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <CheckCircle2 size={14} />
                                  <span>Telah Presensi ({presensiRecord.check_in_time})</span>
                                </div>
                                {presensiRecord.notes && (
                                  <span style={{ fontSize: '0.68rem', fontWeight: 600, opacity: 0.85 }}>
                                    {presensiRecord.notes}
                                  </span>
                                )}
                              </div>
                            ) : (() => {
                              const eligibility = getPresensiEligibility(selectedDate, key);
                              return (
                                <button
                                  onClick={() => {
                                    if (!eligibility.eligible) return;
                                    setPresensiError('');
                                    setPresensiModal({
                                      date: selectedDate,
                                      officer_id: officerId,
                                      officer: officer,
                                      role_code: key,
                                      roleName: role.name,
                                      username: officer.username || '',
                                      password: '',
                                      notes: ''
                                    });
                                  }}
                                  disabled={!eligibility.eligible}
                                  title={eligibility.reason}
                                  className={`glass-btn ${eligibility.eligible ? 'glass-btn-primary' : ''}`}
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    fontSize: '0.78rem',
                                    fontWeight: 800,
                                    borderRadius: '9px',
                                    whiteSpace: 'nowrap',
                                    opacity: eligibility.eligible ? 1 : 0.5,
                                    cursor: eligibility.eligible ? 'pointer' : 'not-allowed',
                                    background: eligibility.eligible ? 'linear-gradient(135deg, #007aff 0%, #0056b3 100%)' : 'var(--card-sub-bg)',
                                    color: eligibility.eligible ? '#ffffff' : 'var(--text-secondary)'
                                  }}
                                >
                                  {eligibility.reason}
                                </button>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Bottom Action Footer */}
                      <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {officer && officer.phone ? (
                          <a
                            href={`https://wa.me/${officer.phone.replace(/[^0-9]/g, '')}?text=Halo%20${encodeURIComponent(officer.name)},%20saya%20konsumen%20PST%20BPS%20Barru.`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              color: '#25D366',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            <MessageSquare size={13} />
                            <span>WhatsApp</span>
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>BPS 7310</span>
                        )}

                        {isAdmin && (
                          <button
                            onClick={() => setEditDayModal({
                              date: selectedDate,
                              k1: targetDayDetails?.k1 || '',
                              k2: targetDayDetails?.k2 || '',
                              p:  targetDayDetails?.p || '',
                              r:  targetDayDetails?.r || '',
                              note: targetDayDetails?.note || ''
                            })}
                            className="glass-btn"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                            title="Ubah Penugasan Tanggal Ini"
                          >
                            <Edit3 size={12} />
                            Ubah
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: MONTHLY SCHEDULE VIEW (KALENDER BULANAN) */}
      {activeTab === 'monthly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Filter Bar & Month Navigation Controls */}
          <div className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', position: 'relative', zIndex: 100 }}>
            
            {/* Top Row: Month Navigation & Calendar Title + Pre-Generate Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {/* Month Navigator Group */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', background: 'rgba(0,0,0,0.04)', padding: '0.2rem', borderRadius: '10px' }}>
                  <button
                    onClick={handlePrevMonth}
                    className="glass-btn"
                    title="Bulan Sebelumnya"
                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', fontWeight: 700 }}
                  >
                    <ChevronLeft size={14} />
                    Sebelumnya
                  </button>

                  <button
                    onClick={handleJumpToToday}
                    className="glass-btn glass-btn-primary"
                    title="Ke Bulan Ini"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 800, background: '#007aff' }}
                  >
                    ⚡ Bulan Ini
                  </button>

                  <button
                    onClick={handleNextMonth}
                    className="glass-btn"
                    title="Bulan Sesudahnya"
                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', fontWeight: 700 }}
                  >
                    Berikutnya
                    <ChevronRight size={14} />
                  </button>

                  <button
                    onClick={handleJumpToNextMonth}
                    className="glass-btn"
                    title="Langsung Lompat ke Roster Bulan Depan"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 800, background: 'rgba(88,86,214,0.1)', color: '#5856d6', borderColor: 'rgba(88,86,214,0.2)' }}
                  >
                    ⏩ Bulan Depan
                  </button>
                </div>

                <CustomMonthPicker 
                  value={currentMonth}
                  onChange={(newM) => setCurrentMonth(newM)}
                />
              </div>

              {/* Title & Status Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                {isFutureMonth && (
                  <span style={{ fontSize: '0.68rem', fontWeight: 900, background: 'linear-gradient(135deg, #5856d6 0%, #007aff 100%)', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '99px', boxShadow: '0 2px 8px rgba(88,86,214,0.3)' }}>
                    🚀 Pre-Generate Bulan Mendatang
                  </span>
                )}
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: isFutureMonth ? '#5856d6' : '#007aff' }}>
                  📅 Kalender {new Date(`${currentMonth}-01`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Bottom Row: Search & Role Filter (Left) + Admin Auto-Rotation Toolbar (Right) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.65rem', borderTop: '1px solid var(--glass-border, rgba(0,0,0,0.06))' }}>
              
              {/* Left Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', width: '210px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    placeholder="Cari nama petugas..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="glass-input"
                    style={{ paddingLeft: '2.2rem', borderRadius: '8px', fontSize: '0.78rem', width: '100%' }}
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="glass-select"
                  style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', maxWidth: '220px' }}
                >
                  <option value="all">Semua Peran (K1, K2, P, R)</option>
                  <option value="k1">K1 - Jaga PST Pagi</option>
                  <option value="k2">K2 - Jaga PST Siang</option>
                  <option value="p">P - Jaga Pengaduan</option>
                  <option value="r">R - Jaga Rekomendasi</option>
                </select>
              </div>

              {/* Right Admin Action Group */}
              {isAdmin && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'nowrap' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)' }}>Mode:</span>
                  <select
                    value={genMode}
                    onChange={(e) => setGenMode(e.target.value)}
                    className="glass-select"
                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.65rem' }}
                    title="Pilih mode urutan rotasi"
                  >
                    <option value="sequential">Rotasi Urut (Sequential)</option>
                    <option value="random">Rotasi Acak (Random)</option>
                  </select>

                  <button
                    onClick={handleAutoGenerate}
                    className="glass-btn glass-btn-primary"
                    disabled={loading}
                    title={`Generate rotasi piket bergiliran 4 role tanpa irisan untuk bulan ${currentMonth}`}
                    style={{
                      padding: '0.45rem 0.95rem',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      borderRadius: '9px',
                      boxShadow: '0 4px 14px rgba(0,122,255,0.25)',
                      background: isFutureMonth ? 'linear-gradient(135deg, #007aff 0%, #5856d6 100%)' : undefined
                    }}
                  >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    <span>{isFutureMonth ? `⚡ Pre-Generate ${new Date(`${currentMonth}-01`).toLocaleDateString('id-ID', { month: 'short' })}` : '⚡ Auto-Rotasi 1 Bulan'}</span>
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Calendar Grid View */}
          <div className="glass-card" style={{ padding: '1.25rem', overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(130px, 1fr))', gap: '0.5rem', marginBottom: '0.5rem', textAlign: 'center' }}>
              {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((d, i) => (
                <div key={d} className={`pst-calendar-header-day ${i >= 5 ? 'weekend' : ''}`}>
                  {d}
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(130px, 1fr))', gap: '0.5rem' }}>
              {calendarDays.map((cell, idx) => {
                if (!cell) {
                  return <div key={`empty-${idx}`} style={{ minHeight: '110px', background: 'rgba(0,0,0,0.01)', borderRadius: '10px' }} />;
                }

                const dateStr = cell.dateStr;
                const sch = schedulesMap[dateStr] || {};
                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === todayStr;
                const dayOfWeek = new Date(dateStr).getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                const matchesSearch = (offId) => {
                  if (!searchFilter) return true;
                  const off = officerMap[offId];
                  return off && off.name.toLowerCase().includes(searchFilter.toLowerCase());
                };

                return (
                  <div
                    key={dateStr}
                    onClick={() => {
                      setSelectedDate(dateStr);
                      setDayDetailModal({ date: dateStr });
                    }}
                    className={`pst-calendar-day-box ${isWeekend ? 'weekend' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span style={{
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          color: isWeekend ? '#ff3b30' : (isToday ? '#248a3d' : 'var(--text-main)')
                        }}>
                          {cell.day}
                        </span>

                        {isToday && (
                          <span style={{ fontSize: '0.55rem', fontWeight: 800, background: '#34c759', color: '#fff', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                            HARI INI
                          </span>
                        )}
                      </div>

                      {isWeekend || holidaysMap[dateStr] ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.15rem' }}>
                          <span style={{ fontSize: '0.68rem', color: holidaysMap[dateStr] ? '#d97706' : '#ff3b30', fontWeight: 800 }}>
                            {holidaysMap[dateStr] ? `🎉 Libur: ${holidaysMap[dateStr].title}` : 'Libur Akhir Pekan'}
                          </span>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.15rem' }}>
                            <a
                              href="http://s.bps.go.id/pst7310_janjitemu"
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                fontSize: '0.6rem',
                                fontWeight: 800,
                                padding: '0.2rem 0.35rem',
                                borderRadius: '4px',
                                background: 'rgba(0,122,255,0.1)',
                                color: '#007aff',
                                textDecoration: 'none',
                                textAlign: 'center',
                                border: '1px solid rgba(0,122,255,0.2)',
                                display: 'block'
                              }}
                            >
                              Janji Temu PST ↗
                            </a>

                            <a
                              href="https://wa.me/6282190439816"
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                fontSize: '0.6rem',
                                fontWeight: 800,
                                padding: '0.2rem 0.35rem',
                                borderRadius: '4px',
                                background: 'rgba(37,211,102,0.12)',
                                color: '#1eb857',
                                textDecoration: 'none',
                                textAlign: 'center',
                                border: '1px solid rgba(37,211,102,0.25)',
                                display: 'block'
                              }}
                            >
                              WhatsApp PST ↗
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {(roleFilter === 'all' || roleFilter === 'k1') && sch.k1 && matchesSearch(sch.k1) && (
                            <div className="pst-duty-pill pst-duty-pill-k1">
                              K1: {officerMap[sch.k1]?.name.split(' ')[0]}
                            </div>
                          )}

                          {(roleFilter === 'all' || roleFilter === 'k2') && sch.k2 && matchesSearch(sch.k2) && (
                            <div className="pst-duty-pill pst-duty-pill-k2">
                              K2: {officerMap[sch.k2]?.name.split(' ')[0]}
                            </div>
                          )}

                          {(roleFilter === 'all' || roleFilter === 'p') && sch.p && matchesSearch(sch.p) && (
                            <div className="pst-duty-pill pst-duty-pill-p">
                              P: {officerMap[sch.p]?.name.split(' ')[0]}
                            </div>
                          )}

                          {(roleFilter === 'all' || roleFilter === 'r') && sch.r && matchesSearch(sch.r) && (
                            <div className="pst-duty-pill pst-duty-pill-r">
                              R: {officerMap[sch.r]?.name.split(' ')[0]}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {isAdmin && !isWeekend && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditDayModal({
                            date: dateStr,
                            k1: sch.k1 || '',
                            k2: sch.k2 || '',
                            p:  sch.p || '',
                            r:  sch.r || '',
                            note: sch.note || ''
                          });
                        }}
                        style={{ fontSize: '0.6rem', border: 'none', background: 'transparent', color: '#007aff', fontWeight: 700, cursor: 'pointer', textAlign: 'right', marginTop: '0.2rem' }}
                      >
                        ✏️ Edit
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REKAPITULASI JADWAL & ABSENSI KEHADIRAN PETUGAS (K, P, R) */}
      {activeTab === 'rekap' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Summary Metric Cards Banner */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="glass-card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(0,122,255,0.12)', color: '#007aff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Calendar size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Total Sesi Piket Selesai
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#007aff', marginTop: '0.15rem' }}>
                  {overallMonthlyStats.totalAssignedSchedules} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Shift</span>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(52,199,89,0.12)', color: '#248a3d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <UserCheck size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Hadir Tepat Waktu
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#248a3d', marginTop: '0.15rem' }}>
                  {overallMonthlyStats.totalOnTimeSchedules} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Sesi</span>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,149,0,0.12)', color: '#ff9500', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Hadir Terlambat
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ff9500', marginTop: '0.15rem' }}>
                  {overallMonthlyStats.totalLateSchedules} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Sesi</span>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,59,48,0.12)', color: '#ff3b30', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertCircle size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Tidak Hadir / Absen
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ff3b30', marginTop: '0.15rem' }}>
                  {overallMonthlyStats.totalAbsentSchedules} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Sesi</span>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(175,82,222,0.12)', color: '#af52de', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Award size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Tingkat Kehadiran Instansi
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#af52de', marginTop: '0.15rem' }}>
                  {overallMonthlyStats.overallRate}% <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Kehadiran</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Controls Bar */}
          <div className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', position: 'relative', zIndex: 100 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              
              <CustomMonthPicker 
                value={currentMonth}
                onChange={(newM) => setCurrentMonth(newM)}
              />

              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  placeholder="Cari nama / NIP..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="glass-input"
                  style={{ paddingLeft: '2.2rem', borderRadius: '8px', fontSize: '0.8rem' }}
                />
              </div>

              {/* Team Pool Filter Tabs */}
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setRoleFilter('all')}
                  className={`glass-btn ${roleFilter === 'all' ? 'glass-btn-primary' : ''}`}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                >
                  Semua Tim
                </button>
                <button
                  onClick={() => setRoleFilter('K')}
                  className={`glass-btn ${roleFilter === 'K' ? 'glass-btn-primary' : ''}`}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                >
                  Tim K (PST)
                </button>
                <button
                  onClick={() => setRoleFilter('P')}
                  className={`glass-btn ${roleFilter === 'P' ? 'glass-btn-primary' : ''}`}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                >
                  Tim P (Pengaduan)
                </button>
                <button
                  onClick={() => setRoleFilter('R')}
                  className={`glass-btn ${roleFilter === 'R' ? 'glass-btn-primary' : ''}`}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                >
                  Tim R (Rekomendasi)
                </button>
              </div>

            </div>

            <button
              onClick={downloadRekapExcel}
              className="glass-btn glass-btn-primary"
              style={{ background: '#21a366', borderColor: '#1e965d', fontSize: '0.75rem', padding: '0.4rem 0.85rem' }}
              title="Unduh Rekapitulasi Format CSV / Excel"
            >
              <FileSpreadsheet size={15} />
              <span>Unduh Rekap Excel</span>
            </button>
          </div>

          {/* Rekapitulasi Table Card */}
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Award size={18} style={{ color: '#007aff' }} />
                  Rekapitulasi Penugasan & Presensi Petugas ({new Date(`${currentMonth}-01`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })})
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                  Laporan rekapitulasi kehadiran piket bulanan untuk Tim PST (K), Tim Pengaduan (P), dan Tim Rekomendasi Statistik (R).
                </p>
              </div>
            </div>

            <div className="table-scroll">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>No</th>
                    <th>Nama Petugas PST</th>
                    <th>Tim Jaga</th>
                    <th>NIP / Jabatan</th>
                    <th style={{ textAlign: 'center' }}>Total Sebulan</th>
                    <th style={{ textAlign: 'center' }}>Jadwal Selesai</th>
                    <th style={{ textAlign: 'center' }}>Mendatang</th>
                    <th style={{ textAlign: 'center' }}>Hadir / Terlambat / Absen</th>
                    <th style={{ textAlign: 'center' }}>Tingkat Kehadiran</th>
                    <th>Rincian Tanggal Piket Bulan Ini</th>
                  </tr>
                </thead>
                <tbody>
                  {officers
                    .filter(o => roleFilter === 'all' || (o.pool_type || 'K').toUpperCase() === roleFilter)
                    .filter(o => !searchFilter || o.name.toLowerCase().includes(searchFilter.toLowerCase()) || (o.nip && o.nip.includes(searchFilter)))
                    .map((off, idx) => {
                      const pool = (off.pool_type || 'K').toUpperCase();
                      const poolBadge = pool === 'K' ? { label: 'Tim PST (K)', color: '#007aff', bg: 'rgba(0,122,255,0.12)' }
                                      : pool === 'P' ? { label: 'Tim Pengaduan (P)', color: '#ff9500', bg: 'rgba(255,149,0,0.12)' }
                                      : { label: 'Tim Rekomendasi (R)', color: '#af52de', bg: 'rgba(175,82,222,0.12)' };

                      const assignedShifts = [];
                      let pastCount = 0;
                      let futureCount = 0;
                      let onTimeCount = 0;
                      let lateCount = 0;
                      let absentCount = 0;

                      Object.entries(schedulesMap).forEach(([dt, sch]) => {
                        const isPastOrToday = dt <= todayStr;
                        const isHolidayDate = !!holidaysMap[dt];

                        const rolesToCheck = [
                          { key: 'k1', code: 'K1', name: 'K1 Pagi' },
                          { key: 'k2', code: 'K2', name: 'K2 Siang' },
                          { key: 'p',  code: 'P',  name: 'Pengaduan' },
                          { key: 'r',  code: 'R',  name: 'Rekomendasi' }
                        ];

                        rolesToCheck.forEach(r => {
                          if (sch[r.key] == off.id) {
                            const presKeyUpper = `${dt}_${off.id}_${r.code.toUpperCase()}`;
                            const presKeyLower = `${dt}_${off.id}_${r.code.toLowerCase()}`;
                            const presObj = presensiMap[presKeyUpper] || presensiMap[presKeyLower];
                            const isPresent = !!presObj;
                            const isLate = presObj?.status === 'terlambat';

                            if (isPastOrToday && !isHolidayDate) {
                              pastCount++;
                              if (isPresent) {
                                if (isLate) lateCount++;
                                else onTimeCount++;
                              } else {
                                absentCount++;
                              }
                            } else if (!isPastOrToday && !isHolidayDate) {
                              futureCount++;
                            }

                            assignedShifts.push({
                              date: dt,
                              dayNum: parseInt(dt.split('-')[2], 10),
                              roleCode: r.code,
                              roleName: r.name,
                              isPastOrToday,
                              isPresent,
                              isLate,
                              presensiTime: presObj?.check_in_time || presObj?.time || null,
                              presensiNotes: presObj?.notes || null
                            });
                          }
                        });
                      });

                      assignedShifts.sort((a, b) => a.date.localeCompare(b.date));

                      const weightedAttended = (onTimeCount * 1.0) + (lateCount * 0.5);
                      const attendancePct = pastCount > 0 ? Math.round((weightedAttended / pastCount) * 100) : 100;

                      return (
                        <tr key={off.id}>
                          <td>{idx + 1}</td>
                          <td>
                            <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.85rem' }}>
                              {off.name}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: '6px', background: poolBadge.bg, color: poolBadge.color }}>
                              {poolBadge.label}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>{off.nip || '—'}</div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{off.position || '—'}</div>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 800, color: '#007aff' }}>
                            {pastCount + futureCount} Hari
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 800 }}>
                            {pastCount} Hari
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)' }}>
                            {futureCount} Hari
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 800 }}>
                              <span style={{ color: '#248a3d' }} title="Hadir Tepat Waktu">{onTimeCount} H</span>
                              <span style={{ color: 'var(--text-secondary)' }}>/</span>
                              <span style={{ color: '#ff9500' }} title="Hadir Terlambat">{lateCount} T</span>
                              <span style={{ color: 'var(--text-secondary)' }}>/</span>
                              <span style={{ color: '#ff3b30' }} title="Tidak Hadir / Absen">{absentCount} A</span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                padding: '0.15rem 0.55rem',
                                borderRadius: '99px',
                                background: attendancePct >= 100 ? 'rgba(52,199,89,0.12)' : (attendancePct >= 75 ? 'rgba(0,122,255,0.12)' : 'rgba(255,59,48,0.12)'),
                                color: attendancePct >= 100 ? '#248a3d' : (attendancePct >= 75 ? '#007aff' : '#ff3b30')
                              }}>
                                {attendancePct}%
                              </span>
                            </div>
                          </td>
                          <td>
                            {assignedShifts.length > 0 ? (
                              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                {assignedShifts.map((s, sIdx) => {
                                  const dateFormatted = new Date(s.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                                  const timeShort = s.presensiTime ? s.presensiTime.substring(0, 5) : '';
                                  
                                  const badgeBg = s.isPresent 
                                    ? (s.isLate ? 'rgba(255,149,0,0.14)' : 'rgba(52,199,89,0.12)')
                                    : (s.isPastOrToday ? 'rgba(255,59,48,0.12)' : 'rgba(0,122,255,0.08)');

                                  const badgeColor = s.isPresent 
                                    ? (s.isLate ? '#ff9500' : '#248a3d')
                                    : (s.isPastOrToday ? '#ff3b30' : '#007aff');

                                  const badgeBorder = s.isPresent 
                                    ? (s.isLate ? 'rgba(255,149,0,0.3)' : 'rgba(52,199,89,0.25)')
                                    : (s.isPastOrToday ? 'rgba(255,59,48,0.25)' : 'rgba(0,122,255,0.2)');

                                  const statusLabel = s.isPresent 
                                    ? (s.isLate ? `Terlambat jam ${s.presensiTime}` : `Hadir tepat jam ${s.presensiTime}`)
                                    : (s.isPastOrToday ? 'Tidak Hadir' : 'Jadwal Mendatang');

                                  return (
                                    <div
                                      key={sIdx}
                                      onClick={() => setDayDetailModal({ date: s.date })}
                                      style={{
                                        fontSize: '0.65rem',
                                        padding: '0.2rem 0.5rem',
                                        borderRadius: '6px',
                                        fontWeight: 700,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        cursor: 'pointer',
                                        background: badgeBg,
                                        color: badgeColor,
                                        border: `1px solid ${badgeBorder}`
                                      }}
                                      title={`${s.date} (${s.roleName}): ${statusLabel}${s.presensiNotes ? ` - Catatan: ${s.presensiNotes}` : ''}`}
                                    >
                                      <span>{s.roleCode}</span>
                                      <span>{dateFormatted}</span>
                                      {s.isPresent && (
                                        <span style={{ fontSize: '0.6rem', opacity: 0.9, fontWeight: 800 }}>
                                          ({timeShort}{s.isLate ? ' T' : ''})
                                        </span>
                                      )}
                                      {s.isPresent && <CheckCircle2 size={10} />}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tidak ada piket bulan ini</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 4: SHIFT SWAP MANAGEMENT (TUKAR JADWAL INLINE PAGE) */}
      {activeTab === 'swap' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Header Banner Card */}
          <div className="glass-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'linear-gradient(135deg, rgba(0,122,255,0.06) 0%, rgba(52,199,89,0.04) 100%)', borderColor: 'rgba(0,122,255,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'rgba(0,122,255,0.12)', color: '#007aff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowLeftRight size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Manajemen & Pengajuan Tukar Jadwal Piket
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Sistem pengajuan tukar shift antar petugas PST dengan persetujuan 2 tingkat (Rekan Piket & Admin PST)
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {isAdmin && swapRequests.some(r => r.status === 'approved' || r.status === 'rejected') && (
                <button
                  onClick={handleClearCompletedSwaps}
                  className="glass-btn"
                  style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem', color: '#ff3b30', borderColor: 'rgba(255,59,48,0.3)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Trash2 size={15} />
                  <span>Bersihkan Log Selesai</span>
                </button>
              )}

              <button
                onClick={() => setSwapModal(true)}
                className="glass-btn glass-btn-primary"
                style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Plus size={16} />
                <span>Buat Pengajuan Tukar Baru</span>
              </button>
            </div>
          </div>

          {/* List of Swap Requests (Premium Inline Cards) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {swapRequests.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-secondary)' }}>
                <ArrowLeftRight size={36} style={{ color: 'var(--text-secondary)', margin: '0 auto 0.75rem', opacity: 0.4 }} />
                <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--text-main)' }}>Belum Ada Pengajuan Tukar Jadwal</h4>
                <p style={{ fontSize: '0.8rem', margin: 0 }}>Gunakan tombol "Buat Pengajuan Tukar Baru" di atas untuk mengajukan tukar shift piket PST.</p>
              </div>
            ) : (
              swapRequests.map((req) => {
                const reqOff = officers.find(o => o.id == req.requester_id) || { name: req.requester_name || 'Petugas 1' };
                const tarOff = officers.find(o => o.id == req.target_officer_id) || { name: req.target_name || 'Petugas 2' };

                const roleLabels = {
                  k1: 'K1 - Konsultasi PST (Sesi Pagi)',
                  k2: 'K2 - Konsultasi PST (Sesi Siang)',
                  p: 'P - Tim Pengaduan & Aspirasi',
                  r: 'R - Tim Rekomendasi Kegiatan'
                };

                const statusBadge = (req.status === 'pending_user2' || req.status === 'pending_admin')
                  ? { label: '🟡 Menunggu ACC (Petugas Target / Admin)', bg: 'rgba(255,149,0,0.12)', color: '#d97706', border: 'rgba(255,149,0,0.3)' }
                  : req.status === 'approved'
                  ? { label: '🟢 Disetujui & Jadwal Ditukar', bg: 'rgba(52,199,89,0.12)', color: '#248a3d', border: 'rgba(52,199,89,0.3)' }
                  : { label: `🔴 Ditolak oleh ${req.rejected_by === 'admin' ? 'Admin PST' : tarOff.name}`, bg: 'rgba(255,59,48,0.12)', color: '#ff3b30', border: 'rgba(255,59,48,0.3)' };

                const formatDateNice = (dStr) => {
                  if (!dStr) return '-';
                  const dObj = new Date(dStr);
                  return dObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                };

                return (
                  <div key={req.id} className="glass-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    {/* Top Row: User 1 vs User 2 & Status Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>
                          👤 {reqOff.name}
                        </span>
                        <div style={{ padding: '0.25rem 0.6rem', borderRadius: '20px', background: 'rgba(0,122,255,0.1)', color: '#007aff', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 800 }}>
                          <ArrowLeftRight size={14} />
                          <span>Tukar Shift</span>
                        </div>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>
                          👥 {tarOff.name}
                        </span>
                      </div>

                      <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.3rem 0.75rem', borderRadius: '99px', background: statusBadge.bg, color: statusBadge.color, border: `1px solid ${statusBadge.border}` }}>
                        {statusBadge.label}
                      </span>
                    </div>

                    {/* Comparison Box (Left: Requester, Right: Target) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                      
                      {/* Requester Shift Box */}
                      <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', background: 'rgba(0,122,255,0.04)', border: '1px solid rgba(0,122,255,0.15)' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#007aff', marginBottom: '0.35rem' }}>
                          Shift Asli Pengaju ({reqOff.name})
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.15rem' }}>
                          📅 {formatDateNice(req.requester_date)}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                          ⏰ {roleLabels[req.requester_role] || req.requester_role?.toUpperCase()}
                        </div>
                      </div>

                      {/* Target Shift Box */}
                      <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', background: 'rgba(255,149,0,0.04)', border: '1px solid rgba(255,149,0,0.15)' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#d97706', marginBottom: '0.35rem' }}>
                          Shift Target Diajak Tukar ({tarOff.name})
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.15rem' }}>
                          📅 {formatDateNice(req.target_date)}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                          ⏰ {roleLabels[req.target_role] || req.target_role?.toUpperCase()}
                        </div>
                      </div>

                    </div>

                    {/* Alasan & Action Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.25rem' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        💬 Alasan Penukaran: "{req.reason || 'Tidak ada catatan'}"
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteSwap(req.id)}
                            className="glass-btn"
                            style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', color: '#ff3b30', borderColor: 'rgba(255,59,48,0.3)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                            title="Hapus log pengajuan ini (Admin)"
                          >
                            <Trash2 size={14} />
                            <span>Hapus Log</span>
                          </button>
                        )}

                        {(req.status === 'pending_user2' || req.status === 'pending_admin') && (
                          <>
                            <button
                              onClick={() => setConfirmRespondModal({
                                requestId: req.id,
                                actionType: 'acc_user2',
                                title: `⚡ Setujui & Tukar Jadwal Piket`,
                                targetOfficerId: req.target_officer_id,
                                targetOfficerName: tarOff.name,
                                password: '',
                                rejectionReason: ''
                              })}
                              className="glass-btn glass-btn-primary"
                              style={{
                                fontSize: '0.75rem',
                                padding: '0.4rem 0.9rem',
                                background: 'linear-gradient(135deg, #34c759 0%, #28a745 100%)',
                                borderColor: '#248a3d',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem'
                              }}
                            >
                              <CheckSquare size={14} />
                              <span>⚡ Setujui (ACC & Tukar Jadwal)</span>
                            </button>
                            <button
                              onClick={() => setConfirmRespondModal({
                                requestId: req.id,
                                actionType: 'reject_user2',
                                title: `Tolak Pengajuan Penukaran Jadwal`,
                                targetOfficerId: req.target_officer_id,
                                targetOfficerName: tarOff.name,
                                password: '',
                                rejectionReason: ''
                              })}
                              className="glass-btn"
                              style={{
                                fontSize: '0.75rem',
                                padding: '0.4rem 0.85rem',
                                color: '#ff3b30',
                                borderColor: 'rgba(255,59,48,0.3)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem'
                              }}
                            >
                              <XSquare size={14} />
                              <span>Tolak</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

      {/* TAB 3: OFFICERS MANAGEMENT & LOGIN ACCOUNTS (ADMIN ONLY) */}
      {activeTab === 'officers' && isAdmin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Kelola Petugas PST & Akun Login ({officers.length} Anggota)
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Kelola profil staf BPS Barru per tim (Tim PST K, Tim Pengaduan P, Tim Rekomendasi R).
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    setPreviewImportData([]);
                    setImportExcelModal(true);
                  }}
                  className="glass-btn"
                  style={{ background: 'rgba(33, 163, 102, 0.12)', color: '#21a366', borderColor: 'rgba(33, 163, 102, 0.3)' }}
                >
                  <FileUp size={14} />
                  Import via Excel/CSV
                </button>

                <button
                  onClick={() => setEditOfficerModal({ id: null, name: '', nip: '', position: '', pool_type: 'K', phone: '', username: '', password: '', is_active: 1 })}
                  className="glass-btn glass-btn-primary"
                >
                  <Plus size={14} />
                  Tambah Petugas Baru
                </button>
              </div>
            </div>

            {/* Team Pool Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setRoleFilter('all')}
                className={`glass-btn ${roleFilter === 'all' ? 'glass-btn-primary' : ''}`}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
              >
                Semua Tim ({officers.length})
              </button>

              <button
                onClick={() => setRoleFilter('K')}
                className={`glass-btn ${roleFilter === 'K' ? 'glass-btn-primary' : ''}`}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', borderColor: roleFilter === 'K' ? '#007aff' : undefined }}
              >
                🏢 Tim PST (K1 & K2) ({officers.filter(o => (o.pool_type || 'K') === 'K').length})
              </button>

              <button
                onClick={() => setRoleFilter('P')}
                className={`glass-btn ${roleFilter === 'P' ? 'glass-btn-primary' : ''}`}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', borderColor: roleFilter === 'P' ? '#ff9500' : undefined }}
              >
                📢 Tim Pengaduan (P) ({officers.filter(o => o.pool_type === 'P').length})
              </button>

              <button
                onClick={() => setRoleFilter('R')}
                className={`glass-btn ${roleFilter === 'R' ? 'glass-btn-primary' : ''}`}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', borderColor: roleFilter === 'R' ? '#af52de' : undefined }}
              >
                📊 Tim Rekomendasi (R) ({officers.filter(o => o.pool_type === 'R').length})
              </button>
            </div>

            {/* Filtered officers helper */}
            {(() => {
              const filteredOfficers = officers.filter(o => roleFilter === 'all' || (o.pool_type || 'K') === roleFilter);
              const isAllSelected = filteredOfficers.length > 0 && filteredOfficers.every(o => selectedOfficerIds.includes(o.id));

              return (
                <>
                  {/* Bulk Selection Bar */}
                  {selectedOfficerIds.length > 0 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'space-between',
                      padding: '0.75rem 1rem',
                      borderRadius: '12px',
                      background: 'rgba(255,59,48,0.08)',
                      border: '1px solid rgba(255,59,48,0.2)',
                      marginBottom: '1rem'
                    }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ff3b30', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CheckCircle2 size={16} />
                        <span>{selectedOfficerIds.length} Petugas Terpilih</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => setSelectedOfficerIds([])}
                          className="glass-btn"
                          style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                        >
                          Batal Pilih
                        </button>
                        <button
                          onClick={() => handleBulkDeleteOfficers(selectedOfficerIds)}
                          disabled={loading}
                          className="glass-btn"
                          style={{ background: '#ff3b30', color: '#ffffff', borderColor: '#d32f2f', fontSize: '0.75rem', padding: '0.35rem 0.75rem', fontWeight: 800 }}
                        >
                          <Trash2 size={14} />
                          <span>Hapus {selectedOfficerIds.length} Terpilih</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="table-scroll">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isAllSelected}
                              onChange={() => handleSelectAllOfficers(filteredOfficers)}
                              style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                            />
                          </th>
                          <th style={{ width: '40px' }}>No</th>
                          <th>Nama Lengkap</th>
                          <th>Tim Jaga</th>
                          <th>NIP / NIPPPK</th>
                          <th>Jabatan / Tim</th>
                          <th>Username Login</th>
                          <th>No. WhatsApp</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'center' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOfficers.map((off, idx) => {
                          const pool = (off.pool_type || 'K').toUpperCase();
                          const poolBadge = pool === 'K' ? { label: 'Tim PST (K)', color: '#007aff', bg: 'rgba(0,122,255,0.12)' }
                                          : pool === 'P' ? { label: 'Tim Pengaduan (P)', color: '#ff9500', bg: 'rgba(255,149,0,0.12)' }
                                          : { label: 'Tim Rekomendasi (R)', color: '#af52de', bg: 'rgba(175,82,222,0.12)' };

                          const isSelected = selectedOfficerIds.includes(off.id);

                          return (
                            <tr key={off.id} style={{ background: isSelected ? 'rgba(0,122,255,0.06)' : undefined }}>
                              <td style={{ textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectOfficer(off.id)}
                                  style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                                />
                              </td>
                              <td>{idx + 1}</td>
                              <td style={{ fontWeight: 800 }}>{off.name}</td>
                              <td>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: '6px', background: poolBadge.bg, color: poolBadge.color }}>
                                  {poolBadge.label}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.75rem' }}>{off.nip || '—'}</td>
                              <td style={{ fontSize: '0.75rem' }}>{off.position || '—'}</td>
                              <td style={{ fontSize: '0.75rem', fontWeight: 700, color: '#007aff' }}>
                                {off.username ? `👤 ${off.username}` : '—'}
                              </td>
                              <td style={{ fontSize: '0.75rem' }}>{off.phone || '—'}</td>
                              <td>
                                <span style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '99px',
                                  background: off.is_active ? 'rgba(52,199,89,0.12)' : 'rgba(255,59,48,0.12)',
                                  color: off.is_active ? '#248a3d' : '#ff3b30'
                                }}>
                                  {off.is_active ? 'Aktif Piket' : 'Non-Aktif'}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                                  <button
                                    onClick={() => setEditOfficerModal(off)}
                                    className="glass-btn"
                                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.7rem' }}
                                  >
                                    <Edit3 size={12} />
                                    Edit
                                  </button>

                                  <button
                                    onClick={() => handleBulkDeleteOfficers([off.id])}
                                    className="glass-btn"
                                    style={{ padding: '0.35rem 0.55rem', fontSize: '0.7rem', color: '#ff3b30', borderColor: 'rgba(255,59,48,0.3)', background: 'rgba(255,59,48,0.08)' }}
                                    title="Hapus Petugas Ini"
                                  >
                                    <Trash2 size={12} />
                                    Hapus
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* EDIT SINGLE DAY MODAL */}
      {editDayModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '1.5rem', background: 'var(--card-bg, #ffffff)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>
                Ubah Tugas Piket — {new Date(editDayModal.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
              <button onClick={() => setEditDayModal(null)} className="glass-btn" style={{ padding: '0.35rem' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveDayAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: DUTY_ROLES.k1.color, display: 'block', marginBottom: '0.35rem' }}>
                  K1 - Jaga PST Pagi (08.00 – 12.30)
                </label>
                <select
                  value={editDayModal.k1}
                  onChange={(e) => setEditDayModal({ ...editDayModal, k1: e.target.value })}
                  className="glass-select"
                >
                  <option value="">-- Pilih Petugas K1 --</option>
                  {officers.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: DUTY_ROLES.k2.color, display: 'block', marginBottom: '0.35rem' }}>
                  K2 - Jaga PST Siang (12.30 – Selesai)
                </label>
                <select
                  value={editDayModal.k2}
                  onChange={(e) => setEditDayModal({ ...editDayModal, k2: e.target.value })}
                  className="glass-select"
                >
                  <option value="">-- Pilih Petugas K2 --</option>
                  {officers.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: DUTY_ROLES.p.color, display: 'block', marginBottom: '0.35rem' }}>
                  P - Jaga Pengaduan (08.00 – Selesai)
                </label>
                <select
                  value={editDayModal.p}
                  onChange={(e) => setEditDayModal({ ...editDayModal, p: e.target.value })}
                  className="glass-select"
                >
                  <option value="">-- Pilih Petugas Pengaduan --</option>
                  {officers.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: DUTY_ROLES.r.color, display: 'block', marginBottom: '0.35rem' }}>
                  R - Jaga Rekomendasi Statistik (08.00 – Selesai)
                </label>
                <select
                  value={editDayModal.r}
                  onChange={(e) => setEditDayModal({ ...editDayModal, r: e.target.value })}
                  className="glass-select"
                >
                  <option value="">-- Pilih Petugas Rekomendasi --</option>
                  {officers.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                  Catatan Khusus (Opsional):
                </label>
                <input
                  type="text"
                  placeholder="Misal: Cuti / Pengganti / Dinas Luar"
                  value={editDayModal.note || ''}
                  onChange={(e) => setEditDayModal({ ...editDayModal, note: e.target.value })}
                  className="glass-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setEditDayModal(null)} className="glass-btn">
                  Batal
                </button>
                <button type="submit" className="glass-btn glass-btn-primary">
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CALENDAR DAY DETAIL POP-UP MODAL */}
      {dayDetailModal && (() => {
        const dtStr = dayDetailModal.date;
        const dateObj = new Date(dtStr);
        const dayOfWeek = dateObj.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isToday = dtStr === todayStr;
        const sch = schedulesMap[dtStr] || {};

        const rolesList = [
          { key: 'k1', label: 'K1 - Konsultasi PST (Sesi Pagi)', code: 'K1', time: '08:00 - 12:30 WITA', bg: 'rgba(0,122,255,0.06)', border: 'rgba(0,122,255,0.18)', badgeColor: '#007aff' },
          { key: 'k2', label: 'K2 - Konsultasi PST (Sesi Siang)', code: 'K2', time: '12:30 - 16:00 WITA', bg: 'rgba(0,180,216,0.06)', border: 'rgba(0,180,216,0.18)', badgeColor: '#00b4d8' },
          { key: 'p',  label: 'P - Tim Pengaduan & Aspirasi',    code: 'P',  time: '08:00 - 16:00 WITA', bg: 'rgba(255,149,0,0.06)', border: 'rgba(255,149,0,0.18)', badgeColor: '#ff9500' },
          { key: 'r',  label: 'R - Tim Rekomendasi Kegiatan',    code: 'R',  time: '08:00 - 16:00 WITA', bg: 'rgba(175,82,222,0.06)', border: 'rgba(175,82,222,0.18)', badgeColor: '#af52de' }
        ];

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9995, padding: '1rem' }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', background: 'var(--card-bg, #ffffff)', boxShadow: '0 25px 60px rgba(0,0,0,0.35)' }}>
              
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                      📅 {dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </h3>
                    {isToday && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, background: '#34c759', color: '#fff', padding: '0.15rem 0.45rem', borderRadius: '6px' }}>
                        HARI INI
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Rincian Petugas & Status Presensi Piket PST
                  </span>
                </div>

                <button onClick={() => setDayDetailModal(null)} className="glass-btn" style={{ padding: '0.4rem' }}>
                  <X size={16} />
                </button>
              </div>

              {/* Modal Content */}
              {isWeekend || holidaysMap[dtStr] ? (
                <div style={{ padding: '2rem 1.5rem', textAlign: 'center', background: holidaysMap[dtStr] ? 'rgba(255,149,0,0.06)' : 'rgba(255,59,48,0.06)', border: `1px solid ${holidaysMap[dtStr] ? 'rgba(255,149,0,0.2)' : 'rgba(255,59,48,0.18)'}`, borderRadius: '14px' }}>
                  <Palmtree size={40} style={{ color: holidaysMap[dtStr] ? '#ff9500' : '#ff3b30', margin: '0 auto 0.5rem' }} />
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: holidaysMap[dtStr] ? '#ff9500' : '#ff3b30', margin: '0 0 0.3rem 0' }}>
                    {holidaysMap[dtStr] ? `🎉 Libur: ${holidaysMap[dtStr].title}` : 'Libur Akhir Pekan'}
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 1.25rem 0', lineHeight: 1.5 }}>
                    {holidaysMap[dtStr]
                      ? `Pelayanan Terpadu Satu Pintu (PST) BPS Kabupaten Barru tutup berkenaan dengan ${holidaysMap[dtStr].title}. Tidak ada penugasan piket pada hari libur nasional.`
                      : 'Pelayanan PST dan penugasan piket tidak beroperasi pada hari Sabtu & Minggu. Silakan ajukan janji temu atau hubungi petugas kami:'}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <a
                      href="http://s.bps.go.id/pst7310_janjitemu"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glass-btn glass-btn-primary"
                      style={{ textDecoration: 'none', padding: '0.45rem 0.85rem', fontSize: '0.75rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Calendar size={14} />
                      <span>Form Janji Temu PST</span>
                    </a>
                    <a
                      href="https://wa.me/6282190439816"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glass-btn"
                      style={{ textDecoration: 'none', padding: '0.45rem 0.85rem', fontSize: '0.75rem', fontWeight: 800, background: '#25D366', color: '#ffffff', borderColor: '#1eb857', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <MessageSquare size={14} />
                      <span>WhatsApp PST (0821-9043-9816)</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {rolesList.map(r => {
                    const offId = sch[r.key];
                    const off = officerMap[offId];
                    const presKeyUpper = `${dtStr}_${offId}_${r.code.toUpperCase()}`;
                    const presKeyLower = `${dtStr}_${offId}_${r.code.toLowerCase()}`;
                    const presObj = presensiMap[presKeyUpper] || presensiMap[presKeyLower];
                    const isPresent = !!presObj;

                    return (
                      <div
                        key={r.key}
                        style={{
                          padding: '0.9rem 1.1rem',
                          borderRadius: '12px',
                          background: r.bg,
                          border: `1px solid ${r.border}`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.6rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: r.badgeColor }}>
                            {r.label}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            ⏰ {r.time}
                          </span>
                        </div>

                        {off ? (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                👤 {off.name}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                NIP: {off.nip || '—'} • {off.position || '—'}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {isPresent ? (() => {
                                const isLate = presObj?.status === 'terlambat';
                                return (
                                  <div style={{
                                    padding: '0.35rem 0.65rem',
                                    borderRadius: '8px',
                                    background: isLate ? 'rgba(255,149,0,0.14)' : 'rgba(52,199,89,0.15)',
                                    color: isLate ? '#d97706' : '#248a3d',
                                    border: `1px solid ${isLate ? 'rgba(255,149,0,0.3)' : 'rgba(52,199,89,0.25)'}`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.1rem'
                                  }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                      {isLate ? <Clock size={13} /> : <CheckCircle2 size={13} />}
                                      <span>{isLate ? `Terlambat (${presObj.check_in_time})` : `Hadir Tepat (${presObj.check_in_time})`}</span>
                                    </div>
                                    {presObj.notes && (
                                      <div style={{ fontSize: '0.68rem', fontWeight: 600, opacity: 0.9 }}>
                                        Catatan: {presObj.notes}
                                      </div>
                                    )}
                                  </div>
                                );
                              })() : (() => {
                                const eligibility = getPresensiEligibility(dtStr, r.key);
                                return (
                                  <button
                                    onClick={() => {
                                      if (!eligibility.eligible) return;
                                      setDayDetailModal(null);
                                      setPresensiError('');
                                      setPresensiModal({
                                        date: dtStr,
                                        officer_id: off.id,
                                        officer: off,
                                        role_code: r.key,
                                        roleName: r.label,
                                        username: off.username || '',
                                        password: '',
                                        notes: ''
                                      });
                                    }}
                                    disabled={!eligibility.eligible}
                                    title={eligibility.reason}
                                    className={`glass-btn ${eligibility.eligible ? 'glass-btn-primary' : ''}`}
                                    style={{
                                      padding: '0.3rem 0.65rem',
                                      fontSize: '0.72rem',
                                      fontWeight: 800,
                                      opacity: eligibility.eligible ? 1 : 0.6,
                                      cursor: eligibility.eligible ? 'pointer' : 'not-allowed',
                                      background: eligibility.eligible ? undefined : 'rgba(0,0,0,0.04)',
                                      color: eligibility.eligible ? undefined : 'var(--text-secondary)'
                                    }}
                                  >
                                    {eligibility.reason}
                                  </button>
                                );
                              })()}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            Belum ada petugas yang ditugaskan untuk shift ini.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Modal Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                {isAdmin && !isWeekend ? (
                  <button
                    onClick={() => {
                      setDayDetailModal(null);
                      setEditDayModal({
                        date: dtStr,
                        k1: sch.k1 || '',
                        k2: sch.k2 || '',
                        p:  sch.p || '',
                        r:  sch.r || '',
                        note: sch.note || ''
                      });
                    }}
                    className="glass-btn"
                    style={{ fontSize: '0.78rem', fontWeight: 700, color: '#007aff', borderColor: 'rgba(0,122,255,0.3)' }}
                  >
                    ✏️ Edit Penugasan Hari Ini
                  </button>
                ) : <div />}

                <button onClick={() => setDayDetailModal(null)} className="glass-btn" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                  Tutup
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* EDIT OFFICER & USER ACCOUNT MODAL */}
      {editOfficerModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '460px', padding: '1.5rem', background: 'var(--card-bg, #ffffff)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>
                {editOfficerModal.id ? 'Edit Petugas & Akun Login' : 'Tambah Petugas & Akun Login'}
              </h3>
              <button onClick={() => setEditOfficerModal(null)} className="glass-btn" style={{ padding: '0.35rem' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveOfficer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ahmad Ridwan, S.St"
                  value={editOfficerModal.name || ''}
                  onChange={(e) => setEditOfficerModal({ ...editOfficerModal, name: e.target.value })}
                  className="glass-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#007aff', display: 'block', marginBottom: '0.3rem' }}>Kategori Tim Piket *</label>
                <select
                  value={editOfficerModal.pool_type || 'K'}
                  onChange={(e) => setEditOfficerModal({ ...editOfficerModal, pool_type: e.target.value })}
                  className="glass-select"
                >
                  <option value="K">🏢 Tim PST (Konsultasi Pagi K1 & Siang K2)</option>
                  <option value="P">📢 Tim Pengaduan (P)</option>
                  <option value="R">📊 Tim Rekomendasi Kegiatan Statistik (R)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>Username Login Petugas *</label>
                <input
                  type="text"
                  placeholder="Contoh: ridwan"
                  value={editOfficerModal.username || ''}
                  onChange={(e) => setEditOfficerModal({ ...editOfficerModal, username: e.target.value })}
                  className="glass-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>
                  {editOfficerModal.id ? 'Password Baru (Kosongkan jika tidak diubah)' : 'Password Login Petugas'}
                </label>
                <input
                  type="password"
                  placeholder={editOfficerModal.id ? '••••••••' : 'Password login'}
                  value={editOfficerModal.password || ''}
                  onChange={(e) => setEditOfficerModal({ ...editOfficerModal, password: e.target.value })}
                  className="glass-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>No. WhatsApp Contact</label>
                <input
                  type="text"
                  placeholder="081234567890"
                  value={editOfficerModal.phone || ''}
                  onChange={(e) => setEditOfficerModal({ ...editOfficerModal, phone: e.target.value })}
                  className="glass-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>Status Keaktifan Rotasi</label>
                <select
                  value={editOfficerModal.is_active ?? 1}
                  onChange={(e) => setEditOfficerModal({ ...editOfficerModal, is_active: parseInt(e.target.value) })}
                  className="glass-select"
                >
                  <option value={1}>Aktif (Ikut Rotasi Piket)</option>
                  <option value={0}>Non-Aktif (Cuti Panjang / Pindah)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setEditOfficerModal(null)} className="glass-btn">
                  Batal
                </button>
                <button type="submit" className="glass-btn glass-btn-primary">
                  Simpan Petugas & Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIGITAL PRESENSI AUTHENTICATION MODAL */}
      {presensiModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '440px', padding: '1.5rem', background: 'var(--card-bg, #ffffff)', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(52,199,89,0.12)', color: '#248a3d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Presensi Piket Digital</h3>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Otentikasi Mandiri Petugas Sesi Ini</span>
                </div>
              </div>
              <button onClick={() => setPresensiModal(null)} className="glass-btn" style={{ padding: '0.35rem' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '0.85rem', borderRadius: '12px', background: 'rgba(0,122,255,0.06)', border: '1px solid rgba(0,122,255,0.15)', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#007aff', marginBottom: '0.2rem' }}>
                {presensiModal.roleName} — {new Date(presensiModal.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Petugas Bertugas: {presensiModal.officer?.name}
              </div>
            </div>

            {/* Inline Error Alert Box */}
            {presensiError && (
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                background: 'rgba(255,59,48,0.12)',
                border: '1px solid rgba(255,59,48,0.3)',
                color: '#ff3b30',
                fontSize: '0.78rem',
                fontWeight: 800,
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                lineHeight: 1.4
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{presensiError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitPresensi} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>
                  Username Petugas *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masukkan username petugas"
                  value={presensiModal.username || ''}
                  onChange={(e) => setPresensiModal({ ...presensiModal, username: e.target.value })}
                  className="glass-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>
                  Password Petugas *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Masukkan password login"
                    value={presensiModal.password || ''}
                    onChange={(e) => setPresensiModal({ ...presensiModal, password: e.target.value })}
                    className="glass-input"
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.2rem'
                    }}
                    title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  Catatan / Keterangan Presensi (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Presensi Mandiri Tepat Waktu"
                  value={presensiModal.notes || ''}
                  onChange={(e) => setPresensiModal({ ...presensiModal, notes: e.target.value })}
                  className="glass-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setPresensiModal(null)} className="glass-btn">
                  Batal
                </button>
                <button type="submit" className="glass-btn glass-btn-primary" disabled={loading} style={{ fontWeight: 800 }}>
                  Konfirmasi Presensi Piket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXCEL / CSV IMPORT OFFICERS MODAL */}
      {importExcelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '680px', padding: '1.5rem', background: 'var(--card-bg, #ffffff)', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(33,163,102,0.12)', color: '#21a366', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Import Data Petugas via Excel / CSV</h3>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Tambah / perbarui daftar staf & akun piket secara kolektif</span>
                </div>
              </div>
              <button onClick={() => setImportExcelModal(false)} className="glass-btn" style={{ padding: '0.35rem' }}>
                <X size={16} />
              </button>
            </div>

            {/* Template Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', borderRadius: '12px', background: 'rgba(0,122,255,0.06)', border: '1px solid rgba(0,122,255,0.15)', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#007aff' }}>Format Kolom Excel / CSV</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Download format baku untuk diisi di Microsoft Excel atau Google Sheets</div>
              </div>
              <button
                type="button"
                onClick={downloadExcelTemplate}
                className="glass-btn"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', background: '#ffffff', color: '#007aff', fontWeight: 800 }}
              >
                <Download size={14} />
                Unduh Template Excel (.xlsx)
              </button>
            </div>

            {/* File Upload Input */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                Upload File Excel / CSV (.xlsx, .xls, .csv) *
              </label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.txt"
                onChange={handleFileUpload}
                className="glass-input"
                style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', width: '100%' }}
              />
            </div>

            {/* Delimiter / Separator Selection Controls */}
            <div style={{ marginBottom: '1.25rem', padding: '0.75rem', borderRadius: '12px', background: 'var(--card-bg, rgba(0,0,0,0.03))', border: '1px solid var(--glass-border, rgba(0,0,0,0.06))' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, display: 'block', marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                Pilih Pemisah Kolom / Separator File CSV:
              </label>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleDelimiterChange('auto')}
                  className={`glass-btn ${csvDelimiter === 'auto' ? 'glass-btn-primary' : ''}`}
                  style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
                >
                  ⚡ Deteksi Otomatis
                </button>
                <button
                  type="button"
                  onClick={() => handleDelimiterChange(';')}
                  className={`glass-btn ${csvDelimiter === ';' ? 'glass-btn-primary' : ''}`}
                  style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
                >
                  Titik Koma ( ; ) — Excel Indo
                </button>
                <button
                  type="button"
                  onClick={() => handleDelimiterChange(',')}
                  className={`glass-btn ${csvDelimiter === ',' ? 'glass-btn-primary' : ''}`}
                  style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
                >
                  Koma ( , ) — Standard
                </button>
                <button
                  type="button"
                  onClick={() => handleDelimiterChange('\t')}
                  className={`glass-btn ${csvDelimiter === '\t' ? 'glass-btn-primary' : ''}`}
                  style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
                >
                  Tab ( \t ) — TSV
                </button>
              </div>
            </div>

            {/* Preview Table */}
            {previewImportData.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '0.5rem', color: '#21a366', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle2 size={14} />
                  <span>Preview Data Siap Diimpor ({previewImportData.length} Orang)</span>
                </div>
                <div className="table-scroll" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                  <table className="custom-table" style={{ fontSize: '0.72rem' }}>
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Nama Lengkap</th>
                        <th>NIP</th>
                        <th>Jabatan</th>
                        <th>Tim</th>
                        <th>No HP</th>
                        <th>Username</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewImportData.map((row, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td style={{ fontWeight: 700 }}>{row.name}</td>
                          <td>{row.nip || '-'}</td>
                          <td>{row.position || '-'}</td>
                          <td>
                            <span style={{ fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '4px', background: row.pool_type === 'K' ? 'rgba(0,122,255,0.1)' : (row.pool_type === 'P' ? 'rgba(255,149,0,0.1)' : 'rgba(175,82,222,0.1)'), color: row.pool_type === 'K' ? '#007aff' : (row.pool_type === 'P' ? '#ff9500' : '#af52de') }}>
                              Tim {row.pool_type}
                            </span>
                          </td>
                          <td>{row.phone || '-'}</td>
                          <td>{row.username || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
              <button type="button" onClick={() => setImportExcelModal(false)} className="glass-btn">
                Batal
              </button>
              <button
                type="button"
                disabled={!previewImportData.length || loading}
                onClick={handleConfirmImport}
                className="glass-btn glass-btn-primary"
                style={{ background: '#21a366', borderColor: '#1e965d', opacity: (!previewImportData.length || loading) ? 0.6 : 1 }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Memproses Import...</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>Impor {previewImportData.length} Petugas Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM GLASSMORPHIC DELETE CONFIRMATION MODAL */}
      {confirmDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '1.5rem', background: 'var(--card-bg, #ffffff)', boxShadow: '0 20px 50px rgba(0,0,0,0.35)', borderRadius: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,59,48,0.12)', color: '#ff3b30', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Konfirmasi Hapus Data
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#ff3b30', fontWeight: 700 }}>
                  Tindakan ini tidak dapat dibatalkan
                </span>
              </div>
            </div>

            <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', background: 'rgba(255,59,48,0.06)', border: '1px solid rgba(255,59,48,0.18)', marginBottom: '1.25rem', fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
              Apakah Anda yakin ingin menghapus <strong>{confirmDeleteModal.count} petugas</strong> terpilih ini beserta akun login yang terhubung?
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                disabled={loading}
                onClick={() => setConfirmDeleteModal(null)}
                className="glass-btn"
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
              >
                Batal
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={executeDeleteOfficers}
                className="glass-btn"
                style={{ background: '#ff3b30', color: '#ffffff', borderColor: '#d32f2f', fontSize: '0.8rem', padding: '0.45rem 1rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.4rem', opacity: loading ? 0.6 : 1 }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Ya, Hapus {confirmDeleteModal.count} Petugas</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Info Button (i Bunder Bening) in Bottom Right */}
      <button
        onClick={() => setShowInfoModal(true)}
        className="no-print"
        title="Informasi Aturan Presensi & Jam Operasional Piket PST"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(12px)',
          border: '1.5px solid rgba(0, 122, 255, 0.35)',
          boxShadow: '0 8px 32px rgba(0, 122, 255, 0.25)',
          color: '#007aff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 9990,
          transition: 'all 0.25s ease'
        }}
      >
        <Info size={26} />
      </button>

      {/* INFORMASI ATURAN JAM PRESENSI MODAL */}
      {showInfoModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '520px', padding: '1.5rem', background: 'var(--card-bg, #ffffff)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(0,122,255,0.12)', color: '#007aff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Info size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Ketentuan Jam Presensi Piket PST</h3>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Standard Operasional Prosedur BPS Kabupaten Barru</span>
                </div>
              </div>
              <button onClick={() => setShowInfoModal(false)} className="glass-btn" style={{ padding: '0.35rem' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Rules Sesi Pagi */}
              <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(0,122,255,0.06)', border: '1px solid rgba(0,122,255,0.15)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#007aff', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sun size={16} />
                  <span>Sesi Pagi (K1 PST Pagi, P Pengaduan, R Rekomendasi)</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                  • <strong>Jam Operasional:</strong> 08.00 – 12.30 WITA<br/>
                  • <strong style={{ color: '#248a3d' }}>Tepat Waktu:</strong> Presensi dilakukan antara pukul <strong>07.30 – 08.15 WITA</strong> (Toleransi 15 menit).<br/>
                  • <strong style={{ color: '#ff9500' }}>Terlambat:</strong> Presensi dilakukan setelah pukul <strong>08.15 WITA</strong>.
                </div>
              </div>

              {/* Rules Sesi Siang */}
              <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(0,180,216,0.06)', border: '1px solid rgba(0,180,216,0.15)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#00b4d8', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Moon size={16} />
                  <span>Sesi Siang (K2 PST Siang)</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                  • <strong>Jam Operasional:</strong> 12.30 – 16.00 WITA (Jumat hingga 16.30 WITA)<br/>
                  • <strong style={{ color: '#248a3d' }}>Tepat Waktu:</strong> Presensi dilakukan antara pukul <strong>12.15 – 12.45 WITA</strong> (Toleransi 15 menit).<br/>
                  • <strong style={{ color: '#ff9500' }}>Terlambat:</strong> Presensi dilakukan setelah pukul <strong>12.45 WITA</strong>.
                </div>
              </div>

              {/* Status Badges Legend & Percentage Weights */}
              <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '0.6rem', color: 'var(--text-main)' }}>
                  Indikator Status & Bobot Persentase Kehadiran:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '6px', background: 'rgba(52,199,89,0.15)', color: '#248a3d', fontWeight: 800 }}>✓ Hadir Tepat Waktu</span>
                      <span style={{ color: 'var(--text-secondary)' }}>Sebelum batas toleransi</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#248a3d', background: 'rgba(52,199,89,0.12)', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                      Bobot 100%
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '6px', background: 'rgba(255,149,0,0.15)', color: '#ff9500', fontWeight: 800 }}>⚠ Terlambat</span>
                      <span style={{ color: 'var(--text-secondary)' }}>Setelah batas toleransi</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ff9500', background: 'rgba(255,149,0,0.12)', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                      Bobot 50%
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '6px', background: 'rgba(255,59,48,0.15)', color: '#ff3b30', fontWeight: 800 }}>✕ Tidak Hadir / Absen</span>
                      <span style={{ color: 'var(--text-secondary)' }}>Tidak melakukan presensi</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ff3b30', background: 'rgba(255,59,48,0.12)', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                      Bobot 0%
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px dashed rgba(0,0,0,0.1)', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  <strong>Rumus Perhitungan (%):</strong><br/>
                  <code>{"Tingkat Kehadiran = ((Total Tepat × 100%) + (Total Terlambat × 50%) + (Total Absen × 0%)) / Total Shift Selesai"}</code>
                </div>
              </div>

              {/* Outside Hours & Weekend Service Info */}
              <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(0,122,255,0.06)', border: '1px solid rgba(0,122,255,0.15)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '0.35rem', color: '#007aff' }}>
                  Layanan Luar Jam Operasional & Akhir Pekan:
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                  Jika membutuhkan pelayanan statistik di luar jam operasional atau pada hari libur, silakan memanfaatkan fasilitas janji temu atau kontak terpadu kami:
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <a
                    href="http://s.bps.go.id/pst7310_janjitemu"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass-btn glass-btn-primary"
                    style={{ textDecoration: 'none', padding: '0.35rem 0.65rem', fontSize: '0.72rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <Calendar size={13} />
                    <span>Form Janji Temu PST</span>
                  </a>
                  <a
                    href="https://wa.me/6282190439816"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass-btn"
                    style={{ textDecoration: 'none', padding: '0.35rem 0.65rem', fontSize: '0.72rem', fontWeight: 800, background: '#25D366', color: '#ffffff', borderColor: '#1eb857', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <MessageSquare size={13} />
                    <span>WhatsApp PST (0821-9043-9816)</span>
                  </a>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
              <button onClick={() => setShowInfoModal(false)} className="glass-btn glass-btn-primary">
                Tutup Informasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE HOLIDAYS MODAL (ADMIN ONLY) */}
      {manageHolidaysModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '640px', padding: '1.5rem', background: 'var(--card-bg, #ffffff)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,149,0,0.12)', color: '#ff9500', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Palmtree size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Kelola Hari Libur & Cuti Bersama</h3>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Atur libur nasional untuk memblokir presensi & menyesuaikan rekapitulasi</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleSyncHolidays}
                  className="glass-btn glass-btn-secondary"
                  disabled={loading}
                  style={{ fontSize: '0.75rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#007aff' }}
                  title="Sinkronkan otomatis Hari Libur Nasional Indonesia Tahun Ini"
                >
                  <Sparkles size={14} />
                  <span>Auto-Sync Libur 2026</span>
                </button>
                <button onClick={() => setManageHolidaysModal(false)} className="glass-btn" style={{ padding: '0.4rem' }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Form Tambah / Edit Libur */}
            <form onSubmit={handleSaveHoliday} style={{ marginBottom: '1.5rem', background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                {holidayForm.date && holidaysMap[holidayForm.date] ? '✏️ Edit Tanggal Libur' : '➕ Tambah Tanggal Libur Baru'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Tanggal Libur *</label>
                  <input
                    type="date"
                    required
                    value={holidayForm.date}
                    onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                    className="glass-input"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Nama Hari Libur / Cuti Bersama *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Hari Kemerdekaan RI / Cuti Bersama"
                    value={holidayForm.title}
                    onChange={(e) => setHolidayForm({ ...holidayForm, title: e.target.value })}
                    className="glass-input"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Kategori Libur</label>
                  <select
                    value={holidayForm.type}
                    onChange={(e) => setHolidayForm({ ...holidayForm, type: e.target.value })}
                    className="glass-select"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                  >
                    <option value="national_holiday">🎉 Libur Nasional</option>
                    <option value="cuti_bersama">🏖️ Cuti Bersama</option>
                    <option value="custom">🏢 Libur Khusus Kantor</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Keterangan Tambahan (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Catatan tambahan mengenai pelayanan"
                    value={holidayForm.description}
                    onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
                    className="glass-input"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                {holidayForm.date && (
                  <button type="button" onClick={() => setHolidayForm({ date: '', title: '', type: 'national_holiday', description: '' })} className="glass-btn" style={{ fontSize: '0.75rem' }}>
                    Reset Form
                  </button>
                )}
                <button type="submit" className="glass-btn glass-btn-primary" disabled={loading} style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                  Simpan Hari Libur
                </button>
              </div>
            </form>

            {/* Daftar Tanggal Libur Terkonfigurasi */}
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.65rem', color: 'var(--text-main)' }}>
                Daftar Hari Libur Terkonfigurasi ({Object.keys(holidaysMap).length} Hari)
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                {Object.keys(holidaysMap).length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '1rem', textAlign: 'center' }}>
                    Belum ada hari libur yang ditambahkan. Gunakan tombol Auto-Sync atau tambah manual di atas.
                  </div>
                ) : (
                  Object.values(holidaysMap)
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((h) => (
                      <div
                        key={h.date}
                        style={{
                          padding: '0.65rem 0.85rem',
                          borderRadius: '10px',
                          background: 'rgba(0,0,0,0.02)',
                          border: '1px solid rgba(0,0,0,0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            📅 {h.date}
                          </span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '6px', background: h.type === 'cuti_bersama' ? 'rgba(0,180,216,0.12)' : 'rgba(255,149,0,0.12)', color: h.type === 'cuti_bersama' ? '#00b4d8' : '#ff9500' }}>
                            {h.type === 'cuti_bersama' ? '🏖️ Cuti Bersama' : '🎉 Libur Nasional'}
                          </span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                            {h.title}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={() => setHolidayForm({ date: h.date, title: h.title, type: h.type || 'national_holiday', description: h.description || '' })}
                            className="glass-btn"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                            title="Edit Hari Libur Ini"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteHoliday(h.date)}
                            className="glass-btn"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', color: '#ff3b30', borderColor: 'rgba(255,59,48,0.25)' }}
                            title="Hapus Tanggal Libur Ini"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
              <button onClick={() => setManageHolidaysModal(false)} className="glass-btn glass-btn-primary">
                Selesai & Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHIFT SWAP FORM MODAL */}
      {swapModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '580px', padding: '1.5rem', background: 'var(--card-bg, #ffffff)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(0,122,255,0.12)', color: '#007aff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowLeftRight size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Form Ajukan Tukar Jadwal Piket</h3>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Pengajuan tukar shift antar petugas (Memerlukan ACC Petugas & Admin)</span>
                </div>
              </div>
              <button onClick={() => setSwapModal(false)} className="glass-btn" style={{ padding: '0.4rem' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSwap}>
              {/* Select Swap Month */}
              <div style={{ marginBottom: '1.1rem', background: 'var(--card-sub-bg)', padding: '0.85rem', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Calendar size={18} style={{ color: '#007aff' }} />
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      Pilih Bulan Roster Jadwal yang Ingin Ditukar
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                      Anda dapat menukar shift bulan ini maupun bulan mendatang yang sudah di-generate
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CustomMonthPicker
                    value={swapMonth}
                    onChange={(newM) => {
                      setSwapMonth(newM);
                      // Reset shift selections when month changes
                      setSwapForm(prev => ({ ...prev, requester_date: '', target_date: '', password: '' }));
                    }}
                  />
                </div>
              </div>

              {/* Seksi 1: Pemohon (User 1) */}
              <div style={{ marginBottom: '1rem', background: 'rgba(0,122,255,0.04)', padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(0,122,255,0.12)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#007aff', marginBottom: '0.5rem' }}>
                  👤 1. Identitas & Jadwal Milik Anda (Petugas 1 / Pengaju)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Pilih Nama Anda *</label>
                    <select
                      required
                      value={swapForm.requester_id}
                      onChange={(e) => {
                        const offId = e.target.value;
                        const userShifts = getOfficerShifts(offId);
                        const firstShift = userShifts[0] || { date: '', role: 'k1' };
                        setSwapForm({
                          ...swapForm,
                          requester_id: offId,
                          requester_date: firstShift.date,
                          requester_role: firstShift.role
                        });
                      }}
                      className="glass-select"
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.5rem' }}
                    >
                      <option value="">-- Pilih Nama Petugas Pengaju --</option>
                      {officers.map(o => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Password Akun Petugas *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showSwapPassword ? 'text' : 'password'}
                        required
                        placeholder="Password akun Anda"
                        value={swapForm.password || ''}
                        onChange={(e) => setSwapForm({ ...swapForm, password: e.target.value })}
                        className="glass-input"
                        style={{ fontSize: '0.78rem', padding: '0.35rem 2rem 0.35rem 0.5rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSwapPassword(!showSwapPassword)}
                        style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px' }}
                      >
                        {showSwapPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Pilih Jadwal Piket Anda Ter-generate yang Mau Ditukar *</label>
                  {swapForm.requester_id ? (
                    (() => {
                      const reqShifts = getOfficerShifts(swapForm.requester_id);
                      return reqShifts.length > 0 ? (
                        <select
                          required
                          value={`${swapForm.requester_date}_${swapForm.requester_role}`}
                          onChange={(e) => {
                            const [d, r] = e.target.value.split('_');
                            setSwapForm({ ...swapForm, requester_date: d, requester_role: r });
                          }}
                          className="glass-select"
                          style={{ fontSize: '0.78rem', padding: '0.35rem 0.5rem', width: '100%' }}
                        >
                          {reqShifts.map((s, idx) => (
                            <option key={idx} value={`${s.date}_${s.role}`}>{s.label}</option>
                          ))}
                        </select>
                      ) : (
                        <div style={{ fontSize: '0.73rem', color: '#ff3b30', fontStyle: 'italic', padding: '0.2rem 0' }}>
                          ⚠️ Petugas ini belum memiliki jadwal piket ter-generate di bulan ini.
                        </div>
                      );
                    })()
                  ) : (
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '0.2rem 0' }}>
                      Silakan pilih nama Anda terlebih dahulu di atas.
                    </div>
                  )}
                </div>
              </div>

              {/* Seksi 2: Target (User 2) */}
              <div style={{ marginBottom: '1rem', background: 'rgba(255,149,0,0.04)', padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(255,149,0,0.12)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#ff9500', marginBottom: '0.5rem' }}>
                  👥 2. Jadwal Rekan yang Diajak Tukar (Petugas 2 / Target)
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Pilih Petugas Target *</label>
                  <select
                    required
                    value={swapForm.target_officer_id}
                    onChange={(e) => {
                      const offId = e.target.value;
                      const userShifts = getOfficerShifts(offId);
                      const firstShift = userShifts[0] || { date: '', role: 'k1' };
                      setSwapForm({
                        ...swapForm,
                        target_officer_id: offId,
                        target_date: firstShift.date,
                        target_role: firstShift.role
                      });
                    }}
                    className="glass-select"
                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.5rem', width: '100%' }}
                  >
                    <option value="">-- Pilih Rekan Piket Target --</option>
                    {officers.filter(o => o.id != swapForm.requester_id).map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Pilih Jadwal Piket Target Ter-generate yang Ingin Diajak Tukar *</label>
                  {swapForm.target_officer_id ? (
                    (() => {
                      const tarShifts = getOfficerShifts(swapForm.target_officer_id);
                      return tarShifts.length > 0 ? (
                        <select
                          required
                          value={`${swapForm.target_date}_${swapForm.target_role}`}
                          onChange={(e) => {
                            const [d, r] = e.target.value.split('_');
                            setSwapForm({ ...swapForm, target_date: d, target_role: r });
                          }}
                          className="glass-select"
                          style={{ fontSize: '0.78rem', padding: '0.35rem 0.5rem', width: '100%' }}
                        >
                          {tarShifts.map((s, idx) => (
                            <option key={idx} value={`${s.date}_${s.role}`}>{s.label}</option>
                          ))}
                        </select>
                      ) : (
                        <div style={{ fontSize: '0.73rem', color: '#ff3b30', fontStyle: 'italic', padding: '0.2rem 0' }}>
                          ⚠️ Rekan ini belum memiliki jadwal piket ter-generate di bulan ini.
                        </div>
                      );
                    })()
                  ) : (
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '0.2rem 0' }}>
                      Silakan pilih rekan piket target di atas.
                    </div>
                  )}
                </div>
              </div>

              {/* Seksi 3: Alasan */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Alasan Penukaran Jadwal *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Contoh: Ada keperluan keluarga mendadak / penugasan dinas lapangan"
                  value={swapForm.reason}
                  onChange={(e) => setSwapForm({ ...swapForm, reason: e.target.value })}
                  className="glass-input"
                  style={{ fontSize: '0.8rem', padding: '0.45rem 0.65rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setSwapModal(false)} className="glass-btn" style={{ fontSize: '0.75rem' }}>
                  Batal
                </button>
                <button type="submit" className="glass-btn glass-btn-primary" disabled={loading} style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                  Kirim Pengajuan Tukar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* VERIFICATION PASSWORD CONFIRMATION MODAL FOR ACC / REJECT */}
      {confirmRespondModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '440px', padding: '1.5rem', background: 'var(--card-bg, #ffffff)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={18} style={{ color: '#007aff' }} />
                <span>{confirmRespondModal.title}</span>
              </h3>
              <button onClick={() => setConfirmRespondModal(null)} className="glass-btn" style={{ padding: '0.35rem' }}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
              {confirmRespondModal.actionType?.includes('user2') ? (
                <span>
                  Silakan masukkan <strong>password akun Petugas Target ({confirmRespondModal.targetOfficerName || 'Petugas 2'})</strong> atau password Admin untuk mengonfirmasi ACC persetujuan tukar jadwal ini:
                </span>
              ) : (
                <span>
                  Silakan masukkan <strong>password akun Admin PST</strong> untuk mengonfirmasi dan mengeksekusi penukaran jadwal ini secara resmi:
                </span>
              )}
            </p>

            <form onSubmit={handleRespondSwapSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Password Akun Anda *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    placeholder="Masukkan password akun Anda"
                    value={confirmRespondModal.password || ''}
                    onChange={(e) => setConfirmRespondModal({ ...confirmRespondModal, password: e.target.value })}
                    className="glass-input"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 2.2rem 0.45rem 0.65rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                  >
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {confirmRespondModal.actionType?.includes('reject') && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Alasan Penolakan (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Catatan alasan penolakan..."
                    value={confirmRespondModal.rejectionReason || ''}
                    onChange={(e) => setConfirmRespondModal({ ...confirmRespondModal, rejectionReason: e.target.value })}
                    className="glass-input"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setConfirmRespondModal(null)} className="glass-btn" style={{ fontSize: '0.75rem' }}>
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="glass-btn glass-btn-primary"
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    background: confirmRespondModal.actionType?.includes('reject') ? '#ff3b30' : '#34c759',
                    borderColor: confirmRespondModal.actionType?.includes('reject') ? '#ff3b30' : '#2fb350'
                  }}
                >
                  Konfirmasi {confirmRespondModal.actionType?.includes('reject') ? 'Tolak' : 'ACC'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Auto-Generate Schedule */}
      {confirmGenModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.25rem'
        }}>
          <div 
            className="glass-card animate-scale-up" 
            style={{ 
              width: '100%', 
              maxWidth: '460px', 
              padding: '1.75rem', 
              borderRadius: '22px', 
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
              border: '1px solid var(--glass-border, rgba(255,255,255,0.15))'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(0,122,255,0.2) 0%, rgba(88,86,214,0.2) 100%)',
                  color: '#007aff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)'
                }}>
                  <RefreshCw size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                    Konfirmasi Auto-Rotasi
                  </h3>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#007aff' }}>
                    Sistem Roster Otomatis PST
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setConfirmGenModal(false)} 
                className="glass-btn" 
                style={{ width: '32px', height: '32px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              <p style={{ marginBottom: '0.85rem', fontWeight: 600 }}>
                Apakah Anda yakin ingin meng-generate (rotasi) ulang jadwal piket PST untuk bulan:
              </p>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '10px',
                background: 'rgba(0,122,255,0.12)',
                border: '1px solid rgba(0,122,255,0.25)',
                color: '#007aff',
                fontSize: '0.85rem',
                fontWeight: 800,
                marginBottom: '1rem'
              }}>
                <Calendar size={16} />
                <span>{new Date(`${currentMonth}-01`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
              </div>

              {/* Log Stats Card */}
              <div style={{
                background: 'rgba(0,122,255,0.06)',
                border: '1px solid rgba(0,122,255,0.2)',
                borderRadius: '14px',
                padding: '1rem',
                marginBottom: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.4rem', borderBottom: '1px dashed rgba(0,122,255,0.25)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 800, color: '#007aff' }}>
                    <Info size={16} />
                    <span>Log Riwayat Rotasi Bulan Ini</span>
                  </div>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    padding: '0.2rem 0.65rem',
                    borderRadius: '20px',
                    background: '#007aff',
                    color: '#ffffff',
                    boxShadow: '0 2px 6px rgba(0,122,255,0.4)'
                  }}>
                    {genCount || 1}x Di-generate
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Waktu Terakhir:</span>
                    <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                      {genInfo?.timestamp || 'Awal Bulan'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Sumber Pembuatan:</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      {genInfo?.type_label || 'Otomatis Sistem (Tanggal 1)'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Mode Urutan:</span>
                    <span style={{ fontWeight: 800, color: '#007aff' }}>
                      {genMode === 'random' ? 'Rotasi Acak (Random)' : 'Rotasi Urut (Sequential)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Warning Box */}
              <div style={{
                background: 'rgba(255,149,0,0.12)',
                border: '1px solid rgba(255,149,0,0.3)',
                color: '#ff9500',
                borderRadius: '12px',
                padding: '0.7rem 0.85rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'flex-start',
                lineHeight: 1.45
              }}>
                <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>⚠️</span>
                <span>
                  Meng-generate ulang akan memperbarui susunan penugasan seluruh petugas (K1, K2, P, R) pada bulan ini secara adil tanpa bentrok.
                </span>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setConfirmGenModal(false)}
                className="glass-btn"
                style={{ padding: '0.55rem 1.1rem', fontSize: '0.8rem', fontWeight: 700 }}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  setConfirmGenModal(false);
                  await executeAutoGenerate();
                }}
                className="glass-btn glass-btn-primary"
                style={{
                  padding: '0.55rem 1.25rem',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #007aff 0%, #0056b3 100%)',
                  boxShadow: '0 4px 14px rgba(0,122,255,0.35)',
                  color: '#ffffff'
                }}
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                <span>Ya, Generate Jadwal Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
