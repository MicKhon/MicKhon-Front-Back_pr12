import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const response = await authAPI.me();
        setUser(response.data);
      } catch (error) {
        localStorage.removeItem('accessToken');
      }
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    const { accessToken, user } = response.data;
    
    console.log('🔐 ACCESS TOKEN:', accessToken);
    console.log('👤 USER:', user);
    
    localStorage.setItem('accessToken', accessToken);
    setUser(user);
    return user;
  };

  const register = async (data) => {
    const response = await authAPI.register(data);
    return response.data;
  };

  const logout = async () => {
    try { await authAPI.logout(); } catch (error) { console.error('Logout error:', error); }
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  const hasRole = (roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const isAdmin = () => hasRole(['admin']);
  const isSeller = () => hasRole(['seller', 'admin']);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth, hasRole, isAdmin, isSeller }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};