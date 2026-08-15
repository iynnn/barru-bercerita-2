import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Compass, HelpCircle, BookOpen, MessageSquare } from 'lucide-react';

export default function HelpPage() {
  const waNumber = '6282190439816';
  const waMessage = 'Halo BPS Kabupaten Barru, saya ingin bertanya mengenai layanan Barru Bercerita 2.';
  const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`;

  return (
    <div className="animate-fade-in text-gray-800" style={{ maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Help header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ 
          width: '52px', 
          height: '52px', 
          borderRadius: '50%', 
          background: 'var(--primary-light)', 
          color: 'var(--primary)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          margin: '0 auto 1rem' 
        }}>
          <BookOpen size={24} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Panduan & Bantuan Pengguna</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Petunjuk lengkap fungsionalitas visualisasi data dan layanan statistik di portal Barru Bercerita 2.
        </p>
      </div>

      {/* Intro info card */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
          Mengenal Barru Bercerita 2
        </h3>
        <p style={{ fontSize: '0.8rem', color: '#48484a', lineHeight: '1.6' }}>
          Portal ini dirancang oleh BPS Kabupaten Barru untuk menyajikan data statistik daerah secara interaktif. 
          Website ini dilengkapi dengan modul visualisasi deret waktu multi-series, ringkasan metrics deskriptif 
          (Mean, Median, Modus), analisis narasi, serta dukungan interpretasi data cerdas berbasis kecerdasan buatan (AI Gemini).
        </p>
      </div>

      {/* Step by step lists */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Langkah Menggunakan Dashboard
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {[
            {
              step: '1',
              title: 'Memilih Rumpun Kategori',
              desc: 'Klik select-box "Rumpun Kategori" untuk memuat rumpun data yang ingin Anda lihat (contoh: PDRB, Kemiskinan, Tenaga Kerja).'
            },
            {
              step: '2',
              title: 'Membandingkan Indikator',
              desc: 'Setelah indikator utama tampil di grafik, klik select-box "Bandingkan Indikator Tambahan" untuk menambahkan indikator pembanding. Anda dapat menampilkan hingga 7 indikator sekaligus dalam grafik yang sama.'
            },
            {
              step: '3',
              title: 'Menyesuaikan Rentang & Jenis Visualisasi',
              desc: 'Ubah jenis visualisasi (Line Chart, Bar Chart, Radar Chart) dan batasi rentang waktu tahun data pada bar filter untuk menyesuaikan grafik sesuai kebutuhan.'
            },
            {
              step: '4',
              title: 'Mengekspor & Mencetak Data',
              desc: 'Klik tombol "PNG" untuk mengunduh gambar grafik secara instan. Klik tombol "PDF" untuk memicu dialog print browser; halaman akan dicetak dalam format tata letak dokumen laporan resmi yang bersih.'
            },
            {
              step: '5',
              title: 'Menggunakan Analisis Gemini AI',
              desc: 'Klik tombol "Dapatkan Insight AI" pada panel analisis. Sistem AI akan menganalisis data deret waktu yang sedang tampil di grafik dan menuliskan kesimpulan interpretasi fenomena statistik yang tajam secara otomatis.'
            }
          ].map(item => (
            <div key={item.step} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ 
                width: '24px', 
                height: '24px', 
                borderRadius: '50%', 
                background: 'var(--primary)', 
                color: 'white', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '0.75rem', 
                fontWeight: 700,
                flexShrink: 0 
              }}>
                {item.step}
              </div>
              <div style={{ fontSize: '0.8rem', lineHeight: '1.5' }}>
                <h4 style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.15rem' }}>{item.title}</h4>
                <p style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>



      {/* WhatsApp Help Card */}
      <div className="glass-card" style={{ textAlign: 'center', padding: '2rem 1.5rem', background: 'rgba(255,255,255,0.25)' }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.5rem' }}>Hubungi Layanan BPS Barru</h4>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', maxWidth: '400px', margin: '0 auto 1.25rem' }}>
          Apabila Anda memiliki pertanyaan seputar data statistik Kabupaten Barru atau mengalami kendala operasional web, silakan hubungi tim kami via WhatsApp.
        </p>
        <a href={waLink} target="_blank" rel="noreferrer" className="glass-btn glass-btn-primary">
          <MessageSquare size={14} />
          Hubungi Admin via WhatsApp
        </a>
      </div>

    </div>
  );
}
