import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Compass, HelpCircle, ArrowRight } from 'lucide-react';
import tuguImage from '../assets/tugu-payung.png';

export default function LandingPage() {
  return (
    <div className="landing-split animate-fade-in">
      {/* Left Column: Branding Description & Launchers */}
      <div className="landing-left">
        <h1 className="landing-title">
          BARRU<br />
          <span>BERCERITA</span>
        </h1>
        <p className="landing-desc">
          Sebuah portal integrasi visualisasi data statistik BPS Kabupaten Barru. 
          Membantu masyarakat bercerita tentang data, melacak tren indikator makro secara instan, 
          dan mengakses loket layanan statistik terpadu online secara mudah.
        </p>

        {/* Dashboard/PST Launch Cards */}
        <div className="launcher-grid">
          {/* Dashboard */}
          <Link to="/dashboard" className="launcher-card">
            <div className="launcher-icon-box bg-blue-grad">
              <LayoutDashboard size={22} />
            </div>
            <h3 className="launcher-title">Dashboard</h3>
            <p className="launcher-sub">Visualisasi Tren Makro & Grafik</p>
          </Link>

          {/* PST Services */}
          <Link to="/IntegratedPST" className="launcher-card">
            <div className="launcher-icon-box bg-green-grad">
              <Compass size={22} />
            </div>
            <h3 className="launcher-title">PST Services</h3>
            <p className="launcher-sub">Portal Layanan Terpadu Online</p>
          </Link>

          {/* Guide/Help */}
          <Link to="/Help" className="launcher-card">
            <div className="launcher-icon-box bg-yellow-grad">
              <HelpCircle size={22} />
            </div>
            <h3 className="launcher-title">Panduan</h3>
            <p className="launcher-sub">Petunjuk & Bantuan Pengguna</p>
          </Link>
        </div>
      </div>

      {/* Right Column: Floating Picture Frame */}
      <div className="landing-right">
        <div className="floating-frame">
          <div className="frame-inner">
            <img 
              src={tuguImage} 
              alt="Tugu Payung Barru" 
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://i.imgur.com/uR79Wk5.png";
              }}
            />
            <div className="frame-caption">Tugu Payung Barru</div>
          </div>
        </div>
      </div>
    </div>
  );
}
