import { db, createAxiosClient } from '@/lib/api-client';

import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      const token = typeof window !== 'undefined'
        ? (localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token'))
        : null;

      if (import.meta.env.VITE_APP_ID) {
        const appClient = createAxiosClient({
          baseURL: `/api/apps/public`,
          headers: { 'X-App-Id': import.meta.env.VITE_APP_ID },
          token,
          interceptResponses: true,
        });

        try {
          const publicSettings = await appClient.get(`/prod/public-settings/by-id/${import.meta.env.VITE_APP_ID}`);
          setAppPublicSettings(publicSettings);
        } catch (appError) {
          console.error('App state check failed:', appError);
        }
      }

      if (token) {
        await checkUserAuth();
      } else {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        setAuthChecked(true);
      }
      setIsLoadingPublicSettings(false);
    } catch (error) {
      console.error('Unexpected error:', error);
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await db.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthChecked(true);
      console.debug(`%c✓ Auth: ${currentUser?.email || currentUser?.id}`, 'color:#22c55e');
    } catch (error) {
      console.debug(`%c✗ Auth failed: ${error.message}`, 'color:#f59e0b');
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);

      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required',
        });
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const loginSuccess = (userData, token) => {
    setUser(userData);
    setIsAuthenticated(true);
    if (token) {
      const storage = sessionStorage.getItem('remember_me') === 'true' ? localStorage : sessionStorage;
      storage.setItem('auth_token', token);
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      db.auth.logout(window.location.href);
    } else {
      db.auth.logout();
    }
  };

  const navigateToLogin = () => {
    db.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      loginSuccess,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
