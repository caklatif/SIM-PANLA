import InstallPWA from './components/InstallPWA';

import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { CustomAlertProvider } from './components/CustomAlertProvider'; // Import ThemeProvider
import PublicDashboard from './pages/PublicDashboard';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AppsMenu from './pages/AppsMenu';
import JurnalForm from './pages/JurnalForm';
import ImportData from './pages/ImportData';
import InputJadwal from './pages/InputJadwal';
import InputManual from './pages/InputManual';
import UsersData from './pages/UsersData';
import StudentsData from './pages/StudentsData';
import ProfilePage from './pages/ProfilePage';
import MySchedule from './pages/MySchedule';
import SettingsPage from './pages/SettingsPage';
import Penyimpanan from './pages/Penyimpanan';
import RekapAbsensi from './pages/RekapAbsensi';
import LaporanJurnal from './pages/LaporanJurnal';
import Kedisiplinan from './pages/Kedisiplinan';
import AbsensiRapor from './pages/AbsensiRapor'; 
import OperatorDashboard from './pages/OperatorDashboard';
import KinerjaGuru from './pages/KinerjaGuru';
import RekapDhuha from './pages/RekapDhuha';
import PresensiQR from './pages/PresensiQR';
import { Loader2 } from 'lucide-react';
import AppSplash from './components/AppSplash';

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { session, isLoading, isOperator } = useAuth();

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Operator redirect to their dashboard if they try to access main dashboard
  if (isOperator) {
      return <Navigate to="/operator-dashboard" replace />;
  }

  return children;
};

const AdminRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
    const { session, isLoading, isAdmin } = useAuth();
  
    if (isLoading) {
      return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
    }
  
    if (!session || !isAdmin) {
      return <Navigate to="/dashboard" replace />;
    }
  
    return children;
  };

const RestrictedKbmRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isKbmRestricted } = useAuth();

  if (isKbmRestricted) {
    return <Navigate to="/qr" replace />;
  }

  return children;
};

const App: React.FC = () => {

  return (
    <ThemeProvider>
      <AppSplash /> 
      <AuthProvider>
        <CustomAlertProvider>
        <HashRouter>

          <Routes>
            <Route path="/" element={<PublicDashboard />} />
            <Route path="/login" element={<Login />} />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/operator-dashboard" element={
               <OperatorDashboard />
            } />
            
            <Route path="/apps" element={
              <ProtectedRoute>
                <AppsMenu />
              </ProtectedRoute>
            } />
            
            <Route path="/profile" element={
               <React.Fragment>
                  <SharedProfileWrapper />
               </React.Fragment>
            } />
            
            <Route path="/jurnal" element={
               <ProtectedRoute>
                  <RestrictedKbmRoute>
                     <JurnalForm />
                  </RestrictedKbmRoute>
               </ProtectedRoute>
            } />
            
            <Route path="/jadwal" element={
               <ProtectedRoute>
                  <RestrictedKbmRoute>
                     <MySchedule />
                  </RestrictedKbmRoute>
               </ProtectedRoute>
            } />

            <Route path="/rekap-absensi" element={
               <ProtectedRoute>
                  <RestrictedKbmRoute>
                     <RekapAbsensi />
                  </RestrictedKbmRoute>
               </ProtectedRoute>
            } />

            <Route path="/absensi-rapor" element={
               <ProtectedRoute>
                  <RestrictedKbmRoute>
                     <AbsensiRapor />
                  </RestrictedKbmRoute>
               </ProtectedRoute>
            } />

            <Route path="/laporan" element={
               <ProtectedRoute>
                  <RestrictedKbmRoute>
                     <LaporanJurnal />
                  </RestrictedKbmRoute>
               </ProtectedRoute>
            } />

             <Route path="/kedisiplinan" element={
               <ProtectedRoute>
                  <RestrictedKbmRoute>
                     <Kedisiplinan />
                  </RestrictedKbmRoute>
               </ProtectedRoute>
            } />

            <Route path="/kinerja" element={
               <ProtectedRoute>
                  <RestrictedKbmRoute>
                     <KinerjaGuru />
                  </RestrictedKbmRoute>
               </ProtectedRoute>
            } />

            <Route path="/rekap-dhuha" element={
               <ProtectedRoute>
                  <RestrictedKbmRoute>
                     <RekapDhuha />
                  </RestrictedKbmRoute>
               </ProtectedRoute>
            } />

            <Route path="/import-data" element={
               <AdminRoute>
                  <ImportData />
               </AdminRoute>
            } />

            <Route path="/input-jadwal" element={
               <AdminRoute>
                  <InputJadwal />
               </AdminRoute>
            } />

            <Route path="/input-manual" element={
               <AdminRoute>
                  <InputManual />
               </AdminRoute>
            } />

             <Route path="/users" element={
               <AdminRoute>
                  <UsersData />
               </AdminRoute>
            } />

            <Route path="/students" element={
               <AdminRoute>
                  <StudentsData />
               </AdminRoute>
            } />

             <Route path="/penyimpanan" element={
               <AdminRoute>
                 <Penyimpanan />
               </AdminRoute>
             } />
             <Route path="/settings" element={
               <AdminRoute>
                  <SettingsPage />
               </AdminRoute>
            } />

            {/* Presensi QR Route */}
            <Route path="/qr" element={<ProtectedRoute><PresensiQR /></ProtectedRoute>} />

          </Routes>
          <InstallPWA />
        </HashRouter>
        </CustomAlertProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

// Helper for Profile Route
const SharedProfileWrapper = () => {
    const { session, isLoading } = useAuth();
    if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
    if (!session) return <Navigate to="/login" replace />;
    return <ProfilePage />;
}

export default App;
