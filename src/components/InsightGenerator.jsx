import React, { useState } from 'react';
import { fetchInsight } from '../api';
import { Lightbulb, Sparkles, AlertCircle, Info, Loader2 } from 'lucide-react';

export default function InsightGenerator({ chartData, isParentLoading }) {
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Sparkles size={16} className="text-purple-600 animate-pulse" />
            Analisis AI untuk Data Indikator
          </h4>
          <p className="text-xs text-gray-500">
            Gunakan AI (Gemini) untuk mendapatkan wawasan tren dan fenomena data ini secara otomatis.
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading || isParentLoading || !hasChartData}
          className="glass-btn glass-btn-primary self-start md:self-center py-2 px-4 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Lightbulb size={16} />
          )}
          {loading ? 'Menganalisis...' : 'Dapatkan Insight AI'}
        </button>
      </div>

      {insight && !loading && (
        <div className="glass-card bg-white/30 border border-white/20 rounded-xl p-4 animate-fade-in">
          <h5 className="text-xs font-bold text-purple-800 mb-2 flex items-center gap-1.5">
            <Lightbulb size={14} className="text-yellow-500 fill-yellow-500" />
            Insight dari Gemini AI:
          </h5>
          <div className="text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">
            {insight}
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="glass-card bg-red-500/10 border border-red-500/20 text-red-700 rounded-xl p-4 flex gap-2.5 items-start text-xs animate-fade-in">
          <AlertCircle size={16} className="flex-shrink-0 text-red-600 mt-0.5" />
          <div>
            <span className="font-bold">Terjadi Kesalahan: </span>
            {error}
          </div>
        </div>
      )}

      {!hasChartData && (
        <div className="glass-card bg-blue-500/10 border border-blue-500/20 text-blue-700 rounded-xl p-4 flex gap-2.5 items-start text-xs animate-fade-in">
          <Info size={16} className="flex-shrink-0 text-blue-600 mt-0.5" />
          <div>
            Pilih indikator terlebih dahulu untuk mendapatkan analisis insight AI.
          </div>
        </div>
      )}
    </div>
  );
}
