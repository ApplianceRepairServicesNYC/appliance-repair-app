import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminTechnicians from './pages/admin/Technicians';
import AdminCalls from './pages/admin/Calls';
import AdminServiceRecords from './pages/admin/ServiceRecords';
import AdminAuditLogs from './pages/admin/AuditLogs';
import TechnicianDashboard from './pages/technician/Dashboard';
import TechnicianServiceRecords from './pages/technician/ServiceRecords';
import TechnicianSchedule from './pages/technician/Schedule';
import Layout from './components/shared/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            user?.role === 'ADMIN' ? (
              <AdminDashboard />
            ) : (
              <TechnicianDashboard />
            )
          }
        />
        
        <Route
          path="technicians"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AdminTechnicians />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="calls"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AdminCalls />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="service-records"
          element={
            user?.role === 'ADMIN' ? (
              <AdminServiceRecords />
            ) : (
              <TechnicianServiceRecords />
            )
          }
        />
        
        <Route
          path="audit-logs"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AdminAuditLogs />
            </ProtectedRoute>
          }
        />
        
        <Route path="schedule" element={<TechnicianSchedule />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
