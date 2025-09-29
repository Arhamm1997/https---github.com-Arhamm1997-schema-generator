import { useState, useEffect } from 'react';
// Removed bcrypt as we don't need complex hashing for client-side auth

const SETTINGS_PASSWORD = '27774426';
const AUTH_KEY = 'settings-authenticated';
const AUTH_EXPIRY = 'settings-auth-expiry';

export function useSettingsAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    try {
      const isAuth = localStorage.getItem(AUTH_KEY) === 'true';
      const expiry = localStorage.getItem(AUTH_EXPIRY);
      
      if (isAuth && expiry) {
        const expiryTime = parseInt(expiry);
        const now = Date.now();
        
        if (now < expiryTime) {
          setIsAuthenticated(true);
        } else {
          // Auth expired, clear it
          logout();
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const authenticate = async (password: string): Promise<boolean> => {
    try {
      console.log('Attempting authentication with password:', password);
      if (password === SETTINGS_PASSWORD) {
        const expiryTime = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
        
        localStorage.setItem(AUTH_KEY, 'true');
        localStorage.setItem(AUTH_EXPIRY, expiryTime.toString());
        
        console.log('Authentication successful, setting state');
        setIsAuthenticated(true);
        return true;
      }
      console.log('Password mismatch');
      return false;
    } catch (error) {
      console.error('Authentication error:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_EXPIRY);
    setIsAuthenticated(false);
  };

  return {
    isAuthenticated,
    isLoading,
    authenticate,
    logout
  };
}