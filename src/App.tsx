import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

function ConfigError() {
  const { error } = useAuth();
  
  if (!error) return null;
  
  return (
    <div className="min-h-screen bg-slate-clean-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 border border-red-100">
        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-clean-900 mb-2">Configuration Required</h2>
        <p className="text-slate-clean-600 text-sm mb-4">{error}</p>
        <div className="bg-slate-clean-50 rounded-lg p-4 text-xs font-mono text-slate-clean-700">
          <p className="mb-2">Create a <code className="bg-slate-clean-200 px-1.5 py-0.5 rounded">.env</code> file:</p>
          <code className="block text-slate-clean-600">
            VITE_SUPABASE_URL=https://...<br/>
            VITE_SUPABASE_ANON_KEY=eyJ...
          </code>
        </div>
        <p className="text-xs text-slate-clean-400 mt-4">
          Get credentials from your Supabase dashboard
        </p>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { error } = useAuth();
  
  if (error) {
    return <ConfigError />;
  }
  
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
