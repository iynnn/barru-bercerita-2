import React, { useState } from 'react';
import { fetchInsight } from '../api';
import { Lightbulb, Sparkles, AlertCircle, Info, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

export default function InsightGenerator({ chartData, isParentLoading }) {
  const [isOpen, setIsOpen] = useState(false); // Ditutup secara default
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState('');
  const [error, setError] = useState('');

  const hasChartData = chartData && chartData.datasets && chartData.datasets.length > 0;

  const handleGenerate = async () => {
    if (!hasChartData || loading || isParentLoading) return;
    setLoading(true);
    setInsight('');
    setError('');

    try {
      const data = await fetchInsight(chartData);
      setInsight(data.insight);
    } catch (err) {
      setError(
        err.response?.data?.error || 
        'Gagal menghubungi server atau mendapatkan insight AI. Pastikan backend server MAMP Anda aktif.'
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Header Bar dengan Toggle Expand/Collapse */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          cursor: 'pointer',
          userSelect: 'none',
          padding: '0.2rem 0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={16} style={{ color: '#af52de' }} className="animate-pulse" />
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
            Analisis AI untuk Data Indikator
          </h4>
          <span style={{ 
            fontSize: '0.65rem', 
            fontWeight: 700, 
            padding: '0.15rem 0.5rem', 
            borderRadius: '99px', 
            background: isOpen ? 'rgba(52, 199, 89, 0.12)' : 'rgba(142, 142, 147, 0.15)',
            color: isOpen ? '#248a3d' : '#8e8e93'
          }}>
            {isOpen ? 'Terbuka' : 'Tertutup'}
          </span>
        </div>
        
        <button 
          type="button"
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: 'var(--text-secondary)', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.25rem'
          }}
        >
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Konten Insight AI jika Terbuka */}
      {isOpen && (
        <div style={{ paddingTop: '0.75rem', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: '1rem' }} className="animate-fade-in">
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, flex: 1 }}>
              Gunakan AI (Gemini) untuk mendapatkan wawasan tren dan fenomena data ini secara otomatis.
            </p>
            <button
              onClick={handleGenerate}
              disabled={loading || isParentLoading || !hasChartData}
              className="glass-btn glass-btn-primary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Lightbulb size={14} />
              )}
              {loading ? 'Menganalisis...' : 'Dapatkan Insight AI'}
            </button>
          </div>

          {insight && !loading && (
            <div className="glass-card animate-fade-in" style={{ background: 'rgba(255, 255, 255, 0.5)', padding: '1rem', borderRadius: '12px', marginBottom: 0 }}>
              <h5 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#af52de', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Lightbulb size={14} style={{ color: '#ffcc00', fill: '#ffcc00' }} />
                Insight dari Gemini AI:
              </h5>
              <div style={{ fontSize: '0.75rem', lineHeight: '1.6', color: 'var(--text-main)', whitespace: 'pre-wrap' }}>
                {insight}
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="animate-fade-in" style={{ background: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.2)', color: '#ff3b30', borderRadius: '12px', padding: '0.85rem', display: 'flex', gap: '0.5rem', fontSize: '0.75rem' }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Terjadi Kesalahan: </strong>
                {error}
              </div>
            </div>
          )}

          {!hasChartData && (
            <div className="animate-fade-in" style={{ background: 'rgba(0, 122, 255, 0.08)', border: '1px solid rgba(0, 122, 255, 0.15)', color: '#007aff', borderRadius: '12px', padding: '0.85rem', display: 'flex', gap: '0.5rem', fontSize: '0.75rem' }}>
              <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                Pilih indikator terlebih dahulu untuk mendapatkan analisis insight AI.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
