import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  checkAuth: () => Promise<boolean>;
  logout: () => void;
}

  // Token validation cache
interface TokenCache {
  isValid: boolean;
  timestamp: number;
}

  const TOKEN_CACHE_DURATION = 5 * 60 * 1000; // 5 minute cache

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const tokenCacheRef = useRef<TokenCache | null>(null);

  const checkAuth = async (): Promise<boolean> => {
    const token = localStorage.getItem('token');
    const tokenExpiry = localStorage.getItem('tokenExpiry');

    if (!token || !tokenExpiry) {
      setIsAuthenticated(false);
      setLoading(false);
      return false;
    }

     // Check if token expired
    if (Date.now() > parseInt(tokenExpiry)) {
      localStorage.removeItem('token');
      localStorage.removeItem('tokenExpiry');
      setIsAuthenticated(false);
      setLoading(false);
      return false;
    }

     // Check cache
    const now = Date.now();
    if (tokenCacheRef.current && 
        now - tokenCacheRef.current.timestamp < TOKEN_CACHE_DURATION) {
       // Use cached result, avoid duplicate API requests
      const isValid = tokenCacheRef.current.isValid;
      setIsAuthenticated(isValid);
      setLoading(false);
      return isValid;
    }

     try {
       // Verify token validity
      const response = await axiosInstance.get('/auth/verify');
      if (response.data.success) {
        // Update cache
        tokenCacheRef.current = {
          isValid: true,
          timestamp: now
        };
        setIsAuthenticated(true);
        setLoading(false);
        return true;
      }
     } catch (error) {
       // Token invalid
      localStorage.removeItem('token');
      localStorage.removeItem('tokenExpiry');
      // 清除快取
      tokenCacheRef.current = {
        isValid: false,
        timestamp: now
      };
      setIsAuthenticated(false);
    }

    setLoading(false);
    return false;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('tokenExpiry');
    // 清除 token 快取
    tokenCacheRef.current = null;
    setIsAuthenticated(false);
    navigate('/login');
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Set up axios interceptor to handle 401 errors
  useEffect(() => {
    const interceptor = axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Clear token cache
          tokenCacheRef.current = null;
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axiosInstance.interceptors.response.eject(interceptor);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, checkAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
};