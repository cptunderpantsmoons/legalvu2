import React from 'react';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './components/auth/LoginPage';
import { AppShell } from './components/layout/AppShell';

function App() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-white text-lg">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <AppShell userEmail={user.email} onLogout={logout} />;
}

export default App;
