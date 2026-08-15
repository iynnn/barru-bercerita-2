import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Line, Bar, Radar, Pie, Doughnut, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Download, FileDown, FileSpreadsheet, ArrowUp, ArrowDown, MoveRight, ExternalLink, Loader2, RefreshCw, X, FileText, CheckCircle2, AlertCircle, Sparkles, Bot, Copy, RotateCw, BookOpen, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchSnapshots, fetchDataTables, fetchSeries, syncBpsData, fetchAiInterpretation } from '../api';
import SearchableMultiSelect from '../components/SearchableMultiSelect';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const THEMES = {
  default: ['#007aff','#34c759','#ff9500','#ff3b30','#00b4d8','#af52de','#1c1c1e'],
  viridis: ['#440154','#3b528b','#21918c','#5ec962','#fde725','#fd7f6f','#b2e061'],
  sunset:  ['#f94144','#f3722c','#f8961e','#f9c74f','#90be6d','#43aa8b','#577590'],
  ocean:   ['#03045e','#0077b6','#00b4d8','#90e0ef','#caf0f8','#48cae4','#023e8a'],
  mono:    ['#111111','#333333','#555555','#777777','#999999','#bbbbbb','#dddddd'],
};

const datasetColors = THEMES.default;

const deltaIcons = {
  up: <ArrowUp size={12} style={{ color: '#248a3d' }} />,
  down: <ArrowDown size={12} style={{ color: '#ff3b30' }} />,
  flat: <MoveRight size={12} style={{ color: '#ff9500' }} />,
  null: '—',
};

export default function Dashboard() {
  const chartRef = useRef(null);

  // States
  const [loading, setLoading] = useState(false);
  const [dataTables, setDataTables] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  
  const [selectedTable, setSelectedTable] = useState('');
  const [selectedIndicators, setSelectedIndicators] = useState([]);
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');
  const [allYears, setAllYears] = useState([]); // Full unfiltered year range
  const [chartType, setChartType] = useState('Line');
  const [chartTheme, setChartTheme] = useState('default');
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });

  const [toast, setToast] = useState(null); // { message: '', type: 'error'|'success' }
  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const [aiText, setAiText] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [copiedAi, setCopiedAi] = useState(false);
  const [isAiCollapsed, setIsAiCollapsed] = useState(false);

  const handleGenerateAiInterpretation = async () => {
    setLoadingAi(true);
    try {
      let activeIndicatorName = chartData.datasets && chartData.datasets[0] ? chartData.datasets[0].label : 'Indikator Utama';
      activeIndicatorName = activeIndicatorName.replace(/\s*-\s*-\s*$/, '').replace(/\s*-\s*$/, '');

      const activeUnit = chartData.datasets && chartData.datasets[0] ? (chartData.datasets[0].unit || '') : '';
      
      const timeSeries = (chartData.labels || []).map((year, idx) => ({
        year: year,
        value: chartData.datasets?.[0]?.data?.[idx] !== undefined && chartData.datasets?.[0]?.data?.[idx] !== null 
          ? fmt(chartData.datasets[0].data[idx]) 
          : null
      })).filter(item => item.value !== null);

      const res = await fetchAiInterpretation({
        indicator_name: activeIndicatorName,
        unit: activeUnit,
        min: fmt(summary.min),
        max: fmt(summary.max),
        avg: fmt(summary.avg),
        q1: fmt(summary.q1),
        median: fmt(summary.median),
        mode: summary.mode ? fmt(summary.mode) : '-',
        count: summary.count,
        trend_dir: trend ? trend.dir : 'stagnan',
        trend_year: trend ? trend.year : new Date().getFullYear(),
        trend_diff: trend ? fmt(trend.diff) : 0,
        trend_pct: trend ? trend.pct : 0,
        time_series: timeSeries
      });

      if (res && res.interpretation) {
        const cleanText = res.interpretation.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '');
        setAiText(cleanText);
        setIsAiCollapsed(false);
        showToast('Interpretasi AI Google Gemini berhasil dibuat!', 'success');
      }
    } catch (err) {
      console.error('AI Interpretation error:', err);
      showToast(err.response?.data?.error || err.message || 'Gagal memuat interpretasi AI.', 'error');
    } finally {
      setLoadingAi(false);
    }
  };

  const handleCopyAiText = () => {
    if (!aiText) return;
    navigator.clipboard.writeText(aiText);
    setCopiedAi(true);
    showToast('Teks narasi AI berhasil disalin!', 'success');
    setTimeout(() => setCopiedAi(false), 2500);
  };

  const renderFormattedAiText = (text) => {
    if (!text) return null;
    
    // Clean any remaining markdown asterisks
    const cleaned = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '');

    // Check if text has recommendation section
    const hasRecommendationSection = /REKOMENDASI KEBIJAKAN/i.test(cleaned);
    
    let narrativePart = cleaned;
    let recommendationPart = '';

    if (hasRecommendationSection) {
      const parts = cleaned.split(/REKOMENDASI KEBIJAKAN[^\n:]*[:\n]*/i);
      narrativePart = parts[0].replace(/NARASI BARRU BERCERITA[^\n:]*[:\n]*/i, '').trim();
      recommendationPart = parts[1] ? parts[1].trim() : '';
    } else {
      narrativePart = cleaned.replace(/NARASI BARRU BERCERITA[^\n:]*[:\n]*/i, '').trim();
    }

    // Split narrative into paragraphs
    const paragraphs = narrativePart.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

    // Parse recommendation items (1., 2., 3., etc)
    const recItems = recommendationPart
      ? recommendationPart.split(/(?=\d+\.\s)/).map(r => r.trim()).filter(Boolean)
      : [];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* SECTION 1: NARASI BARRU BERCERITA */}
        <div className="ai-narrative-card">
          <div className="ai-narrative-title">
            <BookOpen size={18} style={{ color: '#9333ea' }} />
            <span>Kisah Analisis "Barru Bercerita"</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {paragraphs.map((para, idx) => (
              <p key={idx} className="ai-narrative-para">
                {para}
              </p>
            ))}
          </div>
        </div>

        {/* SECTION 2: REKOMENDASI KEBIJAKAN & LANGKAH STRATEGIS */}
        {recItems.length > 0 && (
          <div className="ai-recommendation-card">
            <div className="ai-rec-title">
              <Lightbulb size={18} style={{ color: '#6366f1' }} />
              <span>Rekomendasi Kebijakan & Langkah Strategis Pemkab Barru</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recItems.map((rec, idx) => {
                const match = rec.match(/^(\d+\.\s*)(.*)/s);
                const bodyStr = match ? match[2] : rec;
                
                return (
                  <div key={idx} className="ai-rec-item">
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#6366f1', color: '#fff', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                      {idx + 1}
                    </div>
                    <div className="ai-rec-text">
                      {bodyStr}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    );
  };

  // Load initial configurations
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const snapshotsData = await fetchSnapshots();
      setSnapshots(snapshotsData || []);

      const tablesData = await fetchDataTables();
      setDataTables(tablesData || []);

      if (tablesData && tablesData.length > 0) {
        const firstTable = tablesData[0];
        setSelectedTable(firstTable.id.toString());
        if (firstTable.indicators && firstTable.indicators.length > 0) {
          setSelectedIndicators([firstTable.indicators[0].id.toString()]);
        }
      }
    } catch (err) {
      console.error('Error loading dashboard setup:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);


  const filteredIndicators = useMemo(() => {
    const table = dataTables.find(t => t.id.toString() === selectedTable);
    return table ? table.indicators : [];
  }, [selectedTable, dataTables]);

  const handleTableChange = (e) => {
    const tableId = e.target.value;
    setSelectedTable(tableId);
    const table = dataTables.find(t => t.id.toString() === tableId);
    if (table && table.indicators && table.indicators.length > 0) {
      setSelectedIndicators([table.indicators[0].id.toString()]);
    } else {
      setSelectedIndicators([]);
      setChartData({ labels: [], datasets: [] });
    }
  };

  const handleAddIndicator = (e) => {
    const id = e.target.value;
    if (!id) return;
    if (!selectedIndicators.includes(id)) {
      setSelectedIndicators([...selectedIndicators, id]);
    }
    e.target.value = '';
  };

  const handleRemoveIndicator = (id) => {
    if (selectedIndicators.length <= 1) {
      showToast('Minimal harus memilih satu indikator utama.', 'error');
      return;
    }
    setSelectedIndicators(selectedIndicators.filter(item => item !== id));
  };

  const handleClearComparison = () => {
    if (selectedIndicators.length > 0) {
      setSelectedIndicators([selectedIndicators[0]]);
    }
  };

  const refreshDetail = async () => {
    if (selectedIndicators.length === 0) return;
    setLoading(true);
    try {
      const params = {
        indicator_ids: selectedIndicators.map(Number),
        start_year: startYear ? Number(startYear) : undefined,
        end_year: endYear ? Number(endYear) : undefined,
      };
      
      const data = await fetchSeries(params);
      
      if (data && data.datasets) {
        const colors = THEMES[chartTheme] || THEMES.default;
        data.datasets = data.datasets.map((ds, index) => ({
          ...ds,
          data: ds.data.map(v => v !== null ? Number(v) : null),
          borderColor: colors[index % colors.length],
          backgroundColor: colors[index % colors.length] + '1A',
          pointBackgroundColor: colors[index % colors.length],
          pointBorderColor: '#fff',
          pointHoverRadius: 6,
          pointRadius: 4,
          borderWidth: 2.5,
          fill: chartType === 'Radar' || chartType === 'Area',
          tension: chartType === 'Area' ? 0.4 : 0.25,
        }));
      }
      setChartData(data);
      // Update full year list only when no filter is active (i.e. full data loaded)
      if (!startYear && !endYear && data?.labels?.length > 0) {
        setAllYears(data.labels);
      } else if (allYears.length === 0 && data?.labels?.length > 0) {
        // First load — capture whatever we get as the base
        setAllYears(data.labels);
      }
    } catch (err) {
      console.error('Error fetching series details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshDetail();
  }, [selectedIndicators, selectedTable, startYear, endYear]);

  // Reset full year cache when indicator/table changes (not when year filter changes)
  useEffect(() => {
    setAllYears([]);
  }, [selectedIndicators, selectedTable]);

  const availableYears = useMemo(() => {
    // For dropdowns: always use allYears (full range) so user can always navigate back
    if (allYears.length > 0) return allYears;
    if (chartData.labels && chartData.labels.length > 0) return chartData.labels;
    const years = [];
    for (let i = 2018; i <= new Date().getFullYear(); i++) {
      years.push(i);
    }
    return years;
  }, [allYears, chartData]);

  const pickIndicator = (indicatorId) => {
    for (const table of dataTables) {
      const found = table.indicators.find(ind => ind.id === indicatorId);
      if (found) {
        setSelectedTable(table.id.toString());
        setSelectedIndicators([indicatorId.toString()]);
        break;
      }
    }
  };

  const fmt = (v) => (v == null || isNaN(v)) ? '–' : new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(v);

  const getShortLabel = (label, datasets = []) => {
    if (!label) return '';
    if (!datasets || datasets.length <= 1) return label;

    if (label.includes(' - ')) {
      const parts = label.split(' - ');
      const prefix = parts[0] + ' - ';
      const allSharePrefix = datasets.every(ds => ds.label && ds.label.startsWith(prefix));
      if (allSharePrefix && parts.slice(1).join(' - ').trim()) {
        return parts.slice(1).join(' - ').trim();
      }
    }
    return label;
  };

  const summary = useMemo(() => {
    const vals = (chartData.datasets?.[0]?.data ?? [])
      .filter(v => v !== null && !isNaN(v))
      .slice()
      .sort((a, b) => a - b);
    const n = vals.length;
    if (!n) return { min: null, q1: null, median: null, q3: null, max: null, avg: null, mode: 'Tidak ada', count: 0 };
    
    const q = (p) => {
      const pos = (n - 1) * p;
      const base = Math.floor(pos);
      const rest = pos - base;
      const val = rest ? vals[base] + rest * (vals[base + 1] - vals[base]) : vals[base];
      return isNaN(val) ? null : Number(val.toFixed(2));
    };

    const freq = {};
    let maxF = 0;
    let modes = [];
    vals.forEach(v => {
      freq[v] = (freq[v] || 0) + 1;
      if (freq[v] > maxF) maxF = freq[v];
    });
    for (const k in freq) {
      if (freq[k] === maxF) modes.push(Number(k));
    }
    const validModes = modes.filter(v => !isNaN(v));
    const modeStr = (maxF === 1 && n > 1) || !validModes.length ? 'Tidak ada' : validModes.map(fmt).join(', ');
    
    const avgVal = vals.reduce((s, v) => s + v, 0) / n;

    return {
      min: vals[0],
      q1: q(0.25),
      median: q(0.5),
      q3: q(0.75),
      max: vals[n - 1],
      avg: isNaN(avgVal) ? null : Number(avgVal.toFixed(2)),
      mode: modeStr,
      count: n,
    };
  }, [chartData]);

  const trend = useMemo(() => {
    const ds = (chartData.datasets?.[0]?.data ?? []).filter(v => v !== null && !isNaN(v));
    const lbl = chartData.labels ?? [];
    const n = ds.length;
    if (n < 2) return null;
    const diff = ds[n - 1] - ds[n - 2];
    const pct = ds[n - 2] ? (diff / ds[n - 2]) * 100 : null;
    return {
      dir: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat',
      diff: Number(diff.toFixed(2)),
      pct: pct == null ? null : Number(pct.toFixed(1)),
      year: lbl[lbl.length - 1],
    };
  }, [chartData]);

  const relatedPublications = useMemo(() => {
    if (!chartData || !chartData.datasets) return [];
    return chartData.datasets.flatMap(dataset => dataset.publications || []);
  }, [chartData]);

  const downloadChartAsPng = async () => {
    if (!chartRef.current) return;

    const datasets = chartData.datasets || [];
    const labels = chartData.labels || [];
    const selectedTableObj = dataTables.find(t => t.id.toString() === selectedTable);
    const tableTitle = selectedTableObj?.name || 'Data BPS Kabupaten Barru';

    // --- Layout constants ---
    const W = 1200;
    const HEADER_H = 120;
    const CHART_H = 480;
    const STATS_ROW_H = Math.max(100, 60 + datasets.length * 38);
    const FOOTER_H = 56;
    const TOTAL_H = HEADER_H + CHART_H + STATS_ROW_H + FOOTER_H;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = TOTAL_H;
    const ctx = canvas.getContext('2d');

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const BG = isDark ? '#0f1a0f' : '#f0f4f0';
    const CARD = isDark ? '#1a2e1a' : '#ffffff';
    const TEXT_PRI = isDark ? '#e8fcea' : '#0a1a0d';
    const TEXT_SEC = isDark ? '#88c89a' : '#3a6644';
    const ACCENT = '#22c55e';
    const ACCENT2 = '#16a34a';

    // === HEADER ===
    const grad = ctx.createLinearGradient(0, 0, W, HEADER_H);
    grad.addColorStop(0, isDark ? '#0a2e15' : '#1a4731');
    grad.addColorStop(1, isDark ? '#1a4731' : '#2d6a4f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, HEADER_H);

    // Accent bar
    ctx.fillStyle = ACCENT;
    ctx.fillRect(0, HEADER_H - 4, W, 4);

    // Logo dot
    ctx.beginPath();
    ctx.arc(52, HEADER_H / 2, 26, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fill();
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('📊', 52, HEADER_H / 2 + 8);

    ctx.textAlign = 'left';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Barru Bercerita', 92, HEADER_H / 2 - 8);

    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    const cleanTitle = tableTitle.length > 80 ? tableTitle.slice(0, 77) + '...' : tableTitle;
    ctx.fillText(cleanTitle, 92, HEADER_H / 2 + 14);

    // Date on right
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    ctx.textAlign = 'right';
    ctx.font = '13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillText(dateStr, W - 24, HEADER_H / 2 + 6);

    // === CHART AREA ===
    ctx.fillStyle = BG;
    ctx.fillRect(0, HEADER_H, W, CHART_H);

    const chartImgSrc = chartRef.current.toBase64Image('image/png', 1.0);
    await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const PAD = 24;
        ctx.drawImage(img, PAD, HEADER_H + PAD, W - PAD * 2, CHART_H - PAD * 2);
        resolve();
      };
      img.src = chartImgSrc;
    });

    // === STATS SUMMARY AREA ===
    const statsY = HEADER_H + CHART_H;
    ctx.fillStyle = CARD;
    ctx.fillRect(0, statsY, W, STATS_ROW_H);

    // Top border accent
    ctx.fillStyle = ACCENT;
    ctx.fillRect(0, statsY, W, 2);

    // Section label
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = TEXT_SEC;
    ctx.fillText('RINGKASAN DATA', 32, statsY + 28);

    const colW = (W - 64) / Math.max(datasets.length, 1);
    datasets.forEach((ds, i) => {
      const x = 32 + i * colW;
      const y = statsY + 44;
      const color = ds.borderColor || datasetColors[i % datasetColors.length];

      // Color indicator bar
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 4, 56);

      // Indicator label
      const shortLabel = getShortLabel(ds.label, datasets);
      const maxChars = Math.floor(colW / 8);
      const dispLabel = shortLabel.length > maxChars ? shortLabel.slice(0, maxChars - 3) + '...' : shortLabel;
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = TEXT_SEC;
      ctx.fillText(dispLabel, x + 12, y + 16);

      // Latest value
      const validData = ds.data.map((v, idx) => ({ v, lbl: labels[idx] })).filter(d => d.v !== null && !isNaN(d.v));
      const latest = validData[validData.length - 1];
      const earliestVal = validData[0];

      if (latest) {
        const fmtVal = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(latest.v);
        ctx.font = `bold 22px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle = color;
        ctx.fillText(fmtVal, x + 12, y + 42);

        // Unit
        if (ds.unit) {
          ctx.font = '11px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = TEXT_SEC;
          ctx.fillText(ds.unit, x + 12, y + 58);
        }

        // Year label
        ctx.font = '11px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = TEXT_SEC;
        ctx.textAlign = 'right';
        ctx.fillText(`Tahun ${latest.lbl}`, x + colW - 8, y + 58);
        ctx.textAlign = 'left';

        // Delta vs first
        if (earliestVal && earliestVal.v !== latest.v && earliestVal.v !== 0) {
          const delta = ((latest.v - earliestVal.v) / Math.abs(earliestVal.v) * 100).toFixed(1);
          const isUp = latest.v > earliestVal.v;
          ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = isUp ? '#22c55e' : '#ef4444';
          ctx.fillText((isUp ? '▲' : '▼') + ' ' + Math.abs(delta) + '%', x + 12 + (fmtVal.length * 13), y + 30);
        }
      } else {
        ctx.font = '14px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = TEXT_SEC;
        ctx.fillText('Tidak ada data', x + 12, y + 38);
      }

      // Divider (not after last)
      if (i < datasets.length - 1) {
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + colW - 4, statsY + 36);
        ctx.lineTo(x + colW - 4, statsY + STATS_ROW_H - 16);
        ctx.stroke();
      }
    });

    // === FOOTER ===
    const footerY = statsY + STATS_ROW_H;
    const footerGrad = ctx.createLinearGradient(0, footerY, W, footerY + FOOTER_H);
    footerGrad.addColorStop(0, isDark ? '#071209' : '#1a4731');
    footerGrad.addColorStop(1, isDark ? '#0a1a0d' : '#2d6a4f');
    ctx.fillStyle = footerGrad;
    ctx.fillRect(0, footerY, W, FOOTER_H);

    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.textAlign = 'left';
    ctx.fillText('Sumber: BPS Kabupaten Barru (barrukab.bps.go.id)  |  Diolah oleh: Barru Bercerita', 24, footerY + FOOTER_H / 2 + 5);

    ctx.textAlign = 'right';
    ctx.fillText(`barrukab.bps.go.id`, W - 24, footerY + FOOTER_H / 2 + 5);

    // --- Export ---
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png', 1.0);
    link.download = `barru_visualisasi_${tableTitle.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadCsv = () => {
    if (!chartData.labels || !chartData.labels.length) return;
    const header = ['Tahun', ...chartData.datasets.map(ds => ds.label)].join(';') + '\n';
    const rows = chartData.labels.map((year, index) => {
      const dataValues = chartData.datasets.map(ds => ds.data[index] ?? '').join(';');
      return `${year};${dataValues}`;
    }).join('\n');
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(header + rows);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `data_barru_bercerita_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadExcel = () => {
    if (!chartData.labels || !chartData.labels.length) return;
    const headers = ['Tahun', ...chartData.datasets.map(ds => ds.label)];
    
    let tableHtml = '<table border="1"><thead><tr>';
    headers.forEach(h => {
      tableHtml += `<th style="background-color: #007aff; color: #ffffff; font-weight: bold; padding: 8px;">${h}</th>`;
    });
    tableHtml += '</tr></thead><tbody>';

    chartData.labels.forEach((year, index) => {
      tableHtml += `<tr><td style="font-weight: bold; text-align: center; padding: 6px;">${year}</td>`;
      chartData.datasets.forEach(ds => {
        const val = ds.data[index] !== null && ds.data[index] !== undefined ? ds.data[index] : '';
        tableHtml += `<td style="text-align: right; padding: 6px;">${val}</td>`;
      });
      tableHtml += '</tr>';
    });

    tableHtml += '</tbody></table>';

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Data Statistik Barru</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      </head>
      <body>${tableHtml}</body>
      </html>
    `;

    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `data_barru_bercerita_${Date.now()}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderChart = () => {
    const colors = THEMES[chartTheme] || THEMES.default;
    let data = chartData;

    const needsPie = chartType === 'Pie' || chartType === 'Doughnut';

    if (!needsPie) {
      const isMixed = chartType === 'Mixed';
      const isStacked = chartType === 'Stacked';
      const isHBar = chartType === 'HBar';
      const isArea = chartType === 'Area';

      data = {
        labels: chartData.labels || [],
        datasets: (chartData.datasets || []).map((ds, index) => {
          const color = colors[index % colors.length];
          const isBarInMixed = isMixed && index > 0;
          return {
            ...ds,
            type: isMixed ? (index === 0 ? 'line' : 'bar') : undefined,
            borderColor: color,
            backgroundColor: isArea
              ? color + '33'
              : isStacked || isHBar || isBarInMixed
                ? color + 'cc'
                : color + '20',
            borderWidth: isStacked || isHBar ? 0 : 2.5,
            fill: isArea,
            tension: isArea ? 0.4 : 0.25,
            pointRadius: (isStacked || isHBar) ? 0 : 4,
            pointHoverRadius: (isStacked || isHBar) ? 0 : 6,
            stack: (isStacked) ? 'stacked' : undefined,
          };
        }),
      };
    } else {
      const availableYears = chartData.labels || [];
      let refYear = endYear ? parseInt(endYear) : null;
      if (!refYear || !availableYears.includes(refYear)) {
        refYear = availableYears.length > 0 ? availableYears[availableYears.length - 1] : null;
      }

      if (!refYear) {
        data = { labels: [], datasets: [] };
      } else {
        const yearIndex = availableYears.indexOf(refYear);
        const pieLabels = (chartData.datasets || []).map(ds => getShortLabel(ds.label, chartData.datasets));
        const pieDataValues = (chartData.datasets || []).map(ds => {
          return ds.data[yearIndex] !== undefined ? ds.data[yearIndex] : null;
        });

        const sliceColors = (chartData.datasets || []).map((_, idx) => colors[idx % colors.length]);
        const hoverColors = (chartData.datasets || []).map((_, idx) => colors[idx % colors.length] + 'e0');

        data = {
          labels: pieLabels,
          datasets: [
            {
              label: `Tahun ${refYear}`,
              data: pieDataValues,
              backgroundColor: sliceColors,
              borderColor: '#ffffff',
              borderWidth: 2,
              hoverBackgroundColor: hoverColors,
            }
          ]
        };
      }
    }

    const isHBar = chartType === 'HBar';
    const isStacked = chartType === 'Stacked';
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
    const tickColor = isDark ? '#88c89a' : '#555';

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: isHBar ? 'y' : 'x',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { 
            font: { family: 'Plus Jakarta Sans', size: 10, weight: '600' }, 
            usePointStyle: true,
            boxWidth: 8,
            padding: 8,
            color: tickColor,
            generateLabels: (chart) => {
              const datasets = chart.data.datasets;
              if (!datasets || !datasets.length) return [];
              
              if (chartType === 'Pie' || chartType === 'Doughnut') {
                const labels = chart.data.labels || [];
                const meta = chart.getDatasetMeta(0);
                return labels.map((label, i) => ({
                  text: label,
                  fillStyle: datasets[0].backgroundColor[i],
                  strokeStyle: '#ffffff',
                  lineWidth: 1,
                  hidden: isNaN(datasets[0].data[i]) || meta.data[i]?.hidden,
                  index: i
                }));
              }

              return datasets.map((ds, i) => {
                const shortName = getShortLabel(ds.label, datasets);
                return {
                  text: shortName,
                  fillStyle: ds.borderColor || ds.backgroundColor,
                  strokeStyle: ds.borderColor,
                  lineWidth: 0,
                  hidden: !chart.isDatasetVisible(i),
                  datasetIndex: i
                };
              });
            }
          }
        },
        tooltip: { 
          padding: 10,
          callbacks: {
            title: (items) => items[0]?.label ? `Tahun ${items[0].label}` : '',
            label: (context) => {
              const ds = context.dataset;
              const rawLabel = ds.label || context.label || '';
              const val = fmt(context.parsed.y !== undefined ? context.parsed.y : context.parsed);
              return ` ${rawLabel}: ${val}`;
            }
          }
        }
      },
      scales: (chartType === 'Radar' || chartType === 'Pie' || chartType === 'Doughnut') ? undefined : {
        x: {
          stacked: isStacked,
          grid: { color: gridColor },
          ticks: { font: { family: 'Plus Jakarta Sans', size: 10 }, color: tickColor }
        },
        y: {
          stacked: isStacked,
          beginAtZero: isStacked || isHBar,
          grid: { color: gridColor },
          ticks: { font: { family: 'Plus Jakarta Sans', size: 10 }, color: tickColor }
        }
      }
    };

    switch (chartType) {
      case 'Line':
        return <Line ref={chartRef} data={data} options={options} />;
      case 'Bar':
      case 'Stacked':
        return <Bar ref={chartRef} data={data} options={options} />;
      case 'HBar':
        return <Bar ref={chartRef} data={data} options={options} />;
      case 'Mixed':
        return <Bar ref={chartRef} data={data} options={options} />;
      case 'Radar':
        return <Radar ref={chartRef} data={data} options={options} />;
      case 'Pie':
        return <Pie ref={chartRef} data={data} options={options} />;
      case 'Doughnut':
        return <Doughnut ref={chartRef} data={data} options={options} />;
      case 'Area':
      default:
        return <Line ref={chartRef} data={data} options={options} />;
    }
  };

  return (
    <div className="animate-fade-in text-gray-800">
      
      {/* 1. Snapshots Row */}
      <div className="snapshot-grid no-print">
        {snapshots.map((card) => (
          <div key={card.indicatorId} onClick={() => pickIndicator(card.indicatorId)} className="snapshot-card">
            <span className="snapshot-title" title={card.title}>{card.title}</span>
            <div className="snapshot-val">
              {fmt(card.latestValue)}
              <span className="snapshot-unit">{card.unit}</span>
            </div>
            <div className="snapshot-meta">
              <span>Tahun {card.latestYear ?? '–'}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                {card.delta !== null ? (
                  <>
                    {deltaIcons[card.direction ?? 'null']}
                    <span style={{ 
                      color: card.direction === 'up' ? '#248a3d' : card.direction === 'down' ? '#ff3b30' : '#ff9500' 
                    }}>{fmt(card.delta)}</span>
                  </>
                ) : '—'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 2. Custom Filter Bar */}
      <div className="glass-card no-print" style={{ position: 'relative', overflow: 'visible', zIndex: 999, backdropFilter: 'none', WebkitBackdropFilter: 'none' }}>
        <div className="filter-row" style={{ position: 'relative', zIndex: 40 }}>
          {/* Table Select */}
          <div className="filter-item">
            <span className="filter-label">Rumpun Kategori</span>
            <select value={selectedTable} onChange={handleTableChange} className="glass-select">
              <option value="" disabled>Pilih rumpun data</option>
              {dataTables.map(t => (
                <option key={t.id} value={t.id.toString()}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Indicator Multi Select */}
          <div className="filter-item" style={{ flex: '1.4' }}>
            <span className="filter-label">Bandingkan Indikator Tambahan</span>
            <SearchableMultiSelect 
              options={filteredIndicators}
              selectedValues={selectedIndicators}
              onChange={(newValues) => {
                if (newValues.length === 0) {
                  showToast('Minimal harus memilih satu indikator utama.', 'error');
                  return;
                }
                setSelectedIndicators(newValues);
              }}
            />
          </div>

          {/* Year Range / Single Year Selection */}
          <div className="filter-item" style={{ maxWidth: '180px' }}>
            <span className="filter-label">
              {chartType === 'Pie' || chartType === 'Doughnut' ? 'Tahun Data' : 'Rentang Waktu'}
            </span>
            {chartType === 'Pie' || chartType === 'Doughnut' ? (
              <select 
                value={endYear || (chartData.labels && chartData.labels[chartData.labels.length - 1]?.toString()) || ''} 
                onChange={(e) => {
                  setEndYear(e.target.value);
                  setStartYear(''); // Clear startYear for single year mapping
                }} 
                className="glass-select"
              >
                {availableYears.map(y => (
                  <option key={y} value={y.toString()}>{y}</option>
                ))}
              </select>
            ) : (
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <select value={startYear} onChange={(e) => setStartYear(e.target.value)} className="glass-select" style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                  <option value="">Mulai</option>
                  {availableYears.map(y => (
                    <option key={y} value={y.toString()}>{y}</option>
                  ))}
                </select>
                <select value={endYear} onChange={(e) => setEndYear(e.target.value)} className="glass-select" style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                  <option value="">Akhir</option>
                  {availableYears.map(y => (
                    <option key={y} value={y.toString()}>{y}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Chart Type & Theme */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <div className="filter-item" style={{ maxWidth: '140px' }}>
              <span className="filter-label">Jenis Grafik</span>
              <select value={chartType} onChange={(e) => setChartType(e.target.value)} className="glass-select">
                <option value="Line">Line</option>
                <option value="Area">Area</option>
                <option value="Bar">Bar</option>
                <option value="HBar">Bar Horizontal</option>
                <option value="Stacked">Stacked Bar</option>
                <option value="Mixed">Line + Bar</option>
                <option value="Radar">Radar</option>
                <option value="Pie">Pie</option>
                <option value="Doughnut">Doughnut</option>
              </select>
            </div>
            <div className="filter-item" style={{ maxWidth: '120px' }}>
              <span className="filter-label">Tema Warna</span>
              <select value={chartTheme} onChange={(e) => setChartTheme(e.target.value)} className="glass-select">
                <option value="default">Default</option>
                <option value="viridis">Viridis</option>
                <option value="sunset">Sunset</option>
                <option value="ocean">Ocean</option>
                <option value="mono">Mono</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={downloadChartAsPng} className="glass-btn glass-btn-primary">
              <Download size={14} />
              PNG
            </button>
            <button onClick={() => window.print()} className="glass-btn glass-btn-secondary">
              <FileText size={14} />
              PDF
            </button>
          </div>
        </div>

        {/* Selected tag pills */}
        {selectedIndicators.length > 0 && (
          <div className="comparison-pill-box" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {selectedIndicators.map((id, index) => {
              const indMeta = filteredIndicators.find(i => i.id.toString() === id) || 
                              dataTables.flatMap(t => t.indicators || []).find(i => i.id.toString() === id);
              const fullName = indMeta ? indMeta.name : `Indikator ${id}`;
              const displayName = getShortLabel(fullName, chartData.datasets);
              const color = datasetColors[index % datasetColors.length];
              return (
                <div key={id} className="comparison-pill" style={{ borderLeft: `3.5px solid ${color}` }} title={fullName}>
                  <span>{displayName}</span>
                  <button onClick={() => handleRemoveIndicator(id)} className="comparison-pill-close">
                    <X size={12} />
                  </button>
                </div>
              );
            })}

            {/* Clear All comparison indicator button */}
            {selectedIndicators.length > 1 && (
              <button 
                onClick={handleClearComparison}
                className="glass-btn animate-fade-in"
                style={{
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.7rem',
                  borderRadius: '99px',
                  color: '#ff3b30',
                  borderColor: 'rgba(255, 59, 48, 0.2)',
                  background: 'rgba(255, 59, 48, 0.05)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  transition: 'all 0.2s',
                  marginLeft: '0.5rem'
                }}
              >
                ✗ Bersihkan Pembanding
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. Main Chart Box */}
      <div className="glass-card chart-container-box">
        <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span className="chart-header-title">
            {chartData.datasets && chartData.datasets.length > 0 
              ? (selectedIndicators.length > 1 ? 'Perbandingan Tren Perkembangan Indikator' : chartData.datasets[0].label) 
              : 'Visualisasi Data'} {chartData.datasets?.[0]?.unit && `(${chartData.datasets[0].unit})`}
          </span>
          <a 
            href="https://barrukab.bps.go.id" 
            target="_blank" 
            rel="noreferrer" 
            style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            title="Kunjungi Portal Resmi BPS Kabupaten Barru"
          >
            <span>Sumber: BPS Barru (barrukab.bps.go.id)</span>
            <ExternalLink size={12} />
          </a>
        </div>

        <div className="chart-wrapper">
          {loading && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: '14px' }}>
              <div style={{ textAlign: 'center' }}>
                <Loader2 size={32} className="animate-spin" style={{ color: '#007aff', marginBottom: '0.5rem' }} />
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Memuat data...</div>
              </div>
            </div>
          )}
          {renderChart()}
        </div>
      </div>

      {/* 4. Full-Width AI Interpretation Box (Directly below Chart) */}
      <div className="glass-card animate-fade-in ai-interpretation-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid rgba(168, 85, 247, 0.15)', paddingBottom: '0.85rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)' }}>
              <Bot size={22} />
            </div>
            <div>
              <div className="ai-header-title">
                <span>Interpretasi & Narasi Statistik oleh AI</span>
                <span style={{ fontSize: '0.65rem', background: '#9333ea', color: '#fff', padding: '0.15rem 0.55rem', borderRadius: '99px', fontWeight: 700 }}>Google Gemini AI</span>
              </div>
              <div className="ai-header-subtitle">
                Analisis tren data otomatis berbasis AI untuk mendukung penyusunan narasi laporan dan perumusan kebijakan daerah
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {aiText ? (
              <>
                <button
                  onClick={() => setIsAiCollapsed(!isAiCollapsed)}
                  className="glass-btn ai-action-btn"
                  title={isAiCollapsed ? "Buka Narasi AI" : "Tutup Narasi AI"}
                >
                  {isAiCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  <span>{isAiCollapsed ? 'Buka Narasi' : 'Tutup'}</span>
                </button>
                <button
                  onClick={handleCopyAiText}
                  className="glass-btn ai-action-btn"
                  title="Salin Narasi AI"
                >
                  {copiedAi ? <CheckCircle2 size={14} style={{ color: '#34c759' }} /> : <Copy size={14} />}
                  <span>{copiedAi ? 'Tersalin!' : 'Salin Narasi'}</span>
                </button>
                <button
                  onClick={handleGenerateAiInterpretation}
                  disabled={loadingAi}
                  className="glass-btn ai-action-btn"
                  title="Generate Ulang Narasi AI"
                >
                  <RotateCw size={14} className={loadingAi ? 'animate-spin' : ''} />
                  <span>Regenerate</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleGenerateAiInterpretation}
                disabled={loadingAi}
                className="glass-btn glass-btn-primary"
                style={{
                  padding: '0.45rem 1.1rem',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  borderRadius: '99px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  border: 'none',
                  color: '#ffffff',
                  boxShadow: '0 4px 14px rgba(168, 85, 247, 0.35)',
                  cursor: loadingAi ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                title="Generate Analisis Interpretasi dengan Google Gemini AI"
              >
                {loadingAi ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Menyusun Narasi AI...</span>
                  </>
                ) : (
                  <>
                    <Bot size={16} />
                    <span>Generate Interpretasi AI (Google Gemini)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        {aiText ? (
          isAiCollapsed ? (
            <div 
              onClick={() => setIsAiCollapsed(false)}
              style={{ 
                padding: '0.75rem 1.25rem', 
                borderRadius: '10px', 
                border: '1px dashed rgba(168, 85, 247, 0.3)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                fontSize: '0.82rem',
                fontWeight: 600,
                transition: 'all 0.2s',
                marginBottom: 0
              }}
              className="ai-narrative-title"
              title="Klik untuk membuka kembali narasi AI"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={16} />
                <span>Hasil Interpretasi AI Ditutup (Klik untuk Membuka Kembali)</span>
              </div>
              <ChevronDown size={16} />
            </div>
          ) : (
            renderFormattedAiText(aiText)
          )
        ) : (
          <div style={{ padding: '1.25rem 1rem', textAlign: 'center' }} className="ai-header-subtitle">
            <Bot size={24} style={{ opacity: 0.6, marginBottom: '0.35rem' }} />
            <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Klik tombol <b>"Generate Interpretasi AI (Google Gemini)"</b> di atas untuk menyusun narasi interpretasi statistik berbasis AI untuk data grafik ini.</div>
          </div>
        )}
      </div>

      {/* 5. Detail Info Row (Table & Stats Summary) */}
      <div className="detail-info-row">
        {/* Left: Table */}
        <div className="data-table-box">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h4 className="table-title" style={{ marginBottom: 0 }}>Deret Waktu Data Terpilih</h4>
              <a 
                href="https://barrukab.bps.go.id" 
                target="_blank" 
                rel="noreferrer"
                style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', background: 'rgba(0,122,255,0.08)', padding: '0.25rem 0.65rem', borderRadius: '99px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <span>BPS Barru • barrukab.bps.go.id</span>
              </a>
            </div>
            <div className="table-scroll">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>No</th>
                    <th>Tahun</th>
                    {chartData.datasets?.map((ds, idx) => (
                      <th key={idx} style={{ textAlign: 'right' }} title={ds.label}>
                        {getShortLabel(ds.label, chartData.datasets)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(chartData.labels || []).map((year, idx) => (
                    <tr key={year}>
                      <td>{idx + 1}</td>
                      <td style={{ fontWeight: 700 }}>{year}</td>
                      {chartData.datasets?.map((ds, dsIdx) => (
                        <td key={dsIdx} style={{ textAlign: 'right', fontWeight: 800 }}>
                          {fmt(ds.data[idx])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }} className="no-print">
            <button 
              onClick={downloadExcel} 
              className="glass-btn glass-btn-primary" 
              style={{ flex: 1, background: '#21a366', borderColor: '#1e965d', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              title="Unduh Data Format Microsoft Excel (.xls)"
            >
              <FileSpreadsheet size={15} />
              <span>Unduh Excel (.xls)</span>
            </button>
            <button 
              onClick={downloadCsv} 
              className="glass-btn glass-btn-secondary" 
              style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              title="Unduh Data Format Semikolon CSV (.csv)"
            >
              <FileDown size={15} />
              <span>Unduh CSV (.csv)</span>
            </button>
          </div>
        </div>

        {/* Right: Summary Metrics */}
        <div className="glass-card stats-summary-card">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.04)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <h4 className="table-title" style={{ marginBottom: 0 }}>Statistik Deskriptif</h4>
              {trend && (
                <span style={{ 
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '0.25rem 0.5rem',
                  borderRadius: '6px',
                  background: trend.dir === 'up' ? 'rgba(52,199,89,0.1)' : trend.dir === 'down' ? 'rgba(255,59,48,0.1)' : 'rgba(255,149,0,0.1)',
                  color: trend.dir === 'up' ? '#248a3d' : trend.dir === 'down' ? '#ff3b30' : '#ff9500'
                }}>
                  {trend.dir === 'up' ? '▲' : trend.dir === 'down' ? '▼' : '■'} {fmt(trend.diff)} ({trend.pct}%) vs {trend.year - 1}
                </span>
              )}
            </div>

            <div className="metrics-grid">
              {[
                { label: 'Minimum', val: summary.min },
                { label: 'Maximum', val: summary.max },
                { label: 'Rata-rata', val: summary.avg },
                { label: 'Kuartil 1', val: summary.q1 },
                { label: 'Median', val: summary.median },
                { label: 'Modus', val: summary.mode }
              ].map(item => (
                <div key={item.label} className="metric-pill">
                  <div className="metric-label">{item.label}</div>
                  <div className="metric-val">{fmt(item.val)}</div>
                </div>
              ))}
            </div>

            <div className="descriptive-panel" style={{ marginTop: '1.25rem' }}>
              <h5 className="descriptive-title">Ringkasan Analisis Deskriptif:</h5>
              <p style={{ lineHeight: '1.6', fontSize: '0.85rem' }}>
                Berdasarkan pengamatan terhadap {summary.count} tahun data, nilai rata-rata tercatat sebesar <b>{fmt(summary.avg)}</b>. 
                Nilai data bergerak dari tingkat minimum <b>{fmt(summary.min)}</b> hingga tingkat puncak <b>{fmt(summary.max)}</b>. 
                {summary.mode && summary.mode !== 'Tidak ada' && <span> Indikator ini mencatatkan nilai modus sebesar <b>{summary.mode}</b>.</span>}
                {trend && <span> Dibandingkan tahun sebelumnya, perkembangan terakhir pada tahun {trend.year} terpantau mengalami <b>{trend.dir === 'up' ? 'peningkatan' : trend.dir === 'down' ? 'penurunan' : 'stagnasi'}</b> sebesar <b>{fmt(trend.diff)}</b>.</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Publications Section */}
      {relatedPublications.length > 0 && (
        <div style={{ marginTop: '2.5rem', textAlign: 'center' }} className="no-print">
          <h4 className="table-title" style={{ marginBottom: '1rem' }}>Rujukan Publikasi Resmi BPS</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem' }}>
            {relatedPublications.map((pub, idx) => (
              <a 
                key={idx} 
                href={pub.link && pub.link.startsWith('http') ? pub.link : `https://barrukab.bps.go.id/id/statistics-table${pub.link}`} 
                target="_blank" 
                rel="noreferrer" 
                className="glass-btn" 
                style={{ fontSize: '0.75rem', borderRadius: '99px', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.5)' }}
              >
                <ExternalLink size={12} />
                <span>{pub.title}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Premium Toast Notification */}
      {toast && (
        <div className="toast-container" style={{ position: 'fixed', bottom: '2rem', top: 'auto', right: '2rem', zIndex: 99999 }}>
          <div className={`toast-card ${toast.type}`}>
            {toast.type === 'error' ? (
              <AlertCircle size={20} style={{ color: '#ff3b30', flexShrink: 0 }} />
            ) : (
              <CheckCircle2 size={20} style={{ color: '#34c759', flexShrink: 0 }} />
            )}
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{toast.message}</span>
            <button 
              onClick={() => setToast(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'currentColor',
                marginLeft: 'auto',
                cursor: 'pointer',
                padding: '0.2rem',
                opacity: 0.6
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
