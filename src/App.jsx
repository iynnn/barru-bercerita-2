import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import SidebarLayout from './components/SidebarLayout';
import LandingPage from './views/LandingPage';
import Dashboard from './views/Dashboard';
import IntegratedPST from './views/IntegratedPST';
import PstSchedule from './views/PstSchedule';
import HelpPage from './views/HelpPage';
import ManageServices from './views/ManageServices';
import Login from './views/Login';

function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Layout wrapper */}
        <Route element={<SidebarLayout />}>
          <Route path="/" element={<Navigate to="/landing-page" replace />} />
          <Route path="/landing-page" element={<LandingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/IntegratedPST" element={<IntegratedPST />} />
          <Route path="/PstSchedule" element={<PstSchedule />} />
          <Route path="/Help" element={<HelpPage />} />
          <Route path="/ManageServices" element={<ManageServices />} />
          <Route path="/login" element={<Login />} />
        </Route>
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/landing-page" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
