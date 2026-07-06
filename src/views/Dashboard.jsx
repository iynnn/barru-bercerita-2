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
  Legend
} from 'chart.js';
import { Download, FileDown, ArrowUp, ArrowDown, MoveRight, ExternalLink, Loader2, RefreshCw, X, FileText } from 'lucide-react';
import { fetchSnapshots, fetchDataTables, fetchSeries, syncBpsData } from '../api';
import InsightGenerator from '../components/InsightGenerator';
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
  Legend
);

const datasetColors = [
  '#007aff', // primary blue
  '#34c759', // success green
  '#ff9500', // warning orange
  '#ff3b30', // danger red
  '#00b4d8', // teal
  '#af52de', // purple
  '#1c1c1e'  // dark gray
];

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
  const [chartType, setChartType] = useState('Line');
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });

  const [toast, setToast] = useState(null); // { message: '', type: 'error'|'success' }
  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
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
        data.datasets = data.datasets.map((ds, index) => ({
          ...ds,
          data: ds.data.map(v => v !== null ? Number(v) : null),
          borderColor: datasetColors[index % datasetColors.length],
          backgroundColor: datasetColors[index % datasetColors.length] + '1A',
          pointBackgroundColor: datasetColors[index % datasetColors.length],
          pointBorderColor: '#fff',
          pointHoverRadius: 6,
          pointRadius: 4,
          borderWidth: 2.5,
          fill: chartType === 'Radar',
          tension: 0.25,
        }));
      }
      setChartData(data);
    } catch (err) {
      console.error('Error fetching series details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshDetail();
  }, [selectedIndicators, selectedTable, startYear, endYear, chartType]);

  const availableYears = useMemo(() => {
    if (chartData.labels && chartData.labels.length > 0) {
      return chartData.labels;
    }
    const years = [];
    for (let i = 2018; i <= new Date().getFullYear(); i++) {
      years.push(i);
    }
    return years;
  }, [chartData]);

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

  const fmt = (v) => v == null ? '–' : new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(v);

  const summary = useMemo(() => {
    const vals = (chartData.datasets?.[0]?.data ?? [])
      .filter(v => v !== null)
      .slice()
      .sort((a, b) => a - b);
    const n = vals.length;
    if (!n) return { min: null, q1: null, median: null, q3: null, max: null, avg: null, mode: null, count: 0 };
    
    const q = (p) => {
      const pos = (n - 1) * p;
      const base = Math.floor(pos);
      const rest = pos - base;
      return Number((rest ? vals[base] + rest * (vals[base + 1] - vals[base]) : vals[base]).toFixed(2));
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
    const modeStr = (maxF === 1 && n > 1) ? 'Tidak ada' : modes.map(fmt).join(', ');
    
    return {
      min: vals[0],
      q1: q(0.25),
      median: q(0.5),
      q3: q(0.75),
      max: vals[n - 1],
      avg: Number((vals.reduce((s, v) => s + v, 0) / n).toFixed(2)),
      mode: modeStr,
      count: n,
    };
  }, [chartData]);

  const trend = useMemo(() => {
    const ds = (chartData.datasets?.[0]?.data ?? []).filter(v => v !== null);
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

  const downloadChartAsPng = () => {
    if (!chartRef.current) return;
    const base64 = chartRef.current.toBase64Image();
    const link = document.createElement('a');
    link.href = base64;
    link.download = `barru_visualisasi_${Date.now()}.png`;
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

  const renderChart = () => {
    const isPieOrDoughnut = chartType === 'Pie' || chartType === 'Doughnut';
    
    // 1. Format the chart data dynamically
    let data;
    if (!isPieOrDoughnut) {
      // Standard Line/Bar/Radar/Scatter formatting: Labels are years, Datasets are indicators
      data = {
        labels: chartData.labels || [],
        datasets: (chartData.datasets || []).map((ds, index) => ({
          ...ds,
          borderColor: datasetColors[index % datasetColors.length],
          backgroundColor: datasetColors[index % datasetColors.length] + '20',
          borderWidth: 3,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
        })),
      };
    } else {
      // Pie / Doughnut formatting: Compare selected indicators side-by-side for a single year!
      const availableYears = chartData.labels || [];
      let refYear = endYear ? parseInt(endYear) : null;
      if (!refYear || !availableYears.includes(refYear)) {
        refYear = availableYears.length > 0 ? availableYears[availableYears.length - 1] : null;
      }

      if (!refYear) {
        data = { labels: [], datasets: [] };
      } else {
        const yearIndex = availableYears.indexOf(refYear);
        const pieLabels = (chartData.datasets || []).map(ds => ds.label);
        const pieDataValues = (chartData.datasets || []).map(ds => {
          return ds.data[yearIndex] !== undefined ? ds.data[yearIndex] : null;
        });

        const sliceColors = (chartData.datasets || []).map((_, idx) => datasetColors[idx % datasetColors.length]);
        const hoverColors = (chartData.datasets || []).map((_, idx) => datasetColors[idx % datasetColors.length] + 'e0');

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

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { family: 'Plus Jakarta Sans', size: 10, weight: '600' }, usePointStyle: true }
        },
        tooltip: { padding: 10 }
      },
      scales: (chartType === 'Radar' || chartType === 'Pie' || chartType === 'Doughnut') ? undefined : {
        x: { grid: { color: 'rgba(0,0,0,0.02)' }, ticks: { font: { family: 'Plus Jakarta Sans', size: 10 } } },
        y: { beginAtZero: false, grid: { color: 'rgba(0,0,0,0.02)' }, ticks: { font: { family: 'Plus Jakarta Sans', size: 10 } } }
      }
    };

    switch (chartType) {
      case 'Bar': return <Bar ref={chartRef} data={data} options={options} />;
      case 'Radar': return <Radar ref={chartRef} data={data} options={options} />;
      case 'Pie': return <Pie ref={chartRef} data={data} options={options} />;
      case 'Doughnut': return <Doughnut ref={chartRef} data={data} options={options} />;
      case 'Scatter': return <Scatter ref={chartRef} data={data} options={options} />;
      default: return <Line ref={chartRef} data={data} options={options} />;
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
      <div className="glass-card no-print" style={{ position: 'relative', overflow: 'visible', zIndex: 999, backdropFilter: 'none', WebkitBackdropFilter: 'none', background: 'rgba(255, 255, 255, 0.9)' }}>
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

          {/* Chart Type */}
          <div className="filter-item" style={{ maxWidth: '140px' }}>
            <span className="filter-label">Jenis Grafik</span>
            <select value={chartType} onChange={(e) => setChartType(e.target.value)} className="glass-select">
              <option value="Line">Line Chart</option>
              <option value="Bar">Bar Chart</option>
              <option value="Radar">Radar Chart</option>
              <option value="Pie">Pie Chart</option>
              <option value="Doughnut">Doughnut</option>
            </select>
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
              const name = indMeta ? indMeta.name : `Indikator ${id}`;
              const color = datasetColors[index % datasetColors.length];
              return (
                <div key={id} className="comparison-pill" style={{ borderLeft: `3.5px solid ${color}` }}>
                  <span>{name}</span>
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
        <div className="chart-header">
          <span className="chart-header-title">
            {chartData.datasets && chartData.datasets.length > 0 
              ? (selectedIndicators.length > 1 ? 'Perbandingan Tren Perkembangan Indikator' : chartData.datasets[0].label) 
              : 'Visualisasi Data'} {chartData.datasets?.[0]?.unit && `(${chartData.datasets[0].unit})`}
          </span>
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

      {/* 4. AI Insight Box */}
      <div className="glass-card ai-insight-card no-print">
        <InsightGenerator chartData={chartData} isParentLoading={loading} />
      </div>

      {/* 5. Detail Info Row (Table & Stats Summary) */}
      <div className="detail-info-row">
        {/* Left: Table */}
        <div className="data-table-box">
          <div>
            <h4 className="table-title">Deret Waktu Data Terpilih</h4>
            <div className="table-scroll">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>No</th>
                    <th>Tahun</th>
                    {chartData.datasets?.map((ds, idx) => (
                      <th key={idx} style={{ textAlign: 'right' }}>{ds.label}</th>
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
          <button onClick={downloadCsv} className="glass-btn glass-btn-primary no-print" style={{ width: '100%', marginTop: '1.5rem' }}>
            <FileDown size={14} />
            Unduh Berkas Data (CSV)
          </button>
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

            <div className="descriptive-panel">
              <h5 className="descriptive-title">Ringkasan Analisis Deskriptif:</h5>
              <p>
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
        <div 
          className="glass-card animate-slide-up"
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.85rem 1.15rem',
            borderRadius: '16px',
            background: toast.type === 'error' ? 'rgba(255, 59, 48, 0.95)' : 'rgba(52, 199, 89, 0.95)',
            color: '#ffffff',
            boxShadow: '0 20px 48px rgba(0, 0, 0, 0.18)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            maxWidth: '350px',
            fontSize: '0.8rem',
            fontWeight: 600,
            transition: 'all 0.3s ease'
          }}
        >
          {toast.type === 'error' ? (
            <svg style={{ width: '16px', height: '16px', fill: 'currentColor', flexShrink: 0 }} viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg style={{ width: '16px', height: '16px', fill: 'currentColor', flexShrink: 0 }} viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
          <span>{toast.message}</span>
          <button 
            onClick={() => setToast(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              marginLeft: '1rem',
              cursor: 'pointer',
              fontSize: '1.2rem',
              lineHeight: 1,
              padding: 0,
              opacity: 0.8
            }}
          >
            &times;
          </button>
        </div>
      )}

    </div>
  );
}
