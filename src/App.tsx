import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { ProfilePage } from './pages/ProfilePage';
import { DashboardPage } from './pages/DashboardPage';
import { DirectoryPage } from './pages/DirectoryPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Landing page */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Auth page (multi-step) */}
          <Route path="/auth" element={<AuthPage />} />
          
          {/* Profile page (after OTP verification) */}
          <Route path="/profile" element={<ProfilePage />} />
          
          {/* Alumni Directory */}
          <Route path="/directory" element={<DirectoryPage />} />
          
          {/* Protected dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
