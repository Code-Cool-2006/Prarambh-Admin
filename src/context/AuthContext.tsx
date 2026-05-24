import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import client from '../api/client';

export interface AdminUser {
  id: string | number;
  name: string;
  email: string;
  role: string;
}

interface AuthContextProps {
  admin: AdminUser | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStoredAuth() {
      try {
        const storedToken = await SecureStore.getItemAsync('adminToken');
        const storedUser = await SecureStore.getItemAsync('adminUser');
        if (storedToken && storedUser) {
          setToken(storedToken);
          setAdmin(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Failed to load auth data from SecureStore:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadStoredAuth();
  }, []);

  const login = async (username: string, password: string) => {
    // Make request to sign in endpoint
    const res = await client.post('/auth/login', { username, password });
    const { token: receivedToken, user } = res.data;

    // Check user role
    if (user.role !== 'admin') {
      throw new Error('Not an admin account');
    }

    // Persist session details
    await SecureStore.setItemAsync('adminToken', receivedToken);
    await SecureStore.setItemAsync('adminUser', JSON.stringify(user));
    
    setToken(receivedToken);
    setAdmin(user);
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('adminToken');
      await SecureStore.deleteItemAsync('adminUser');
    } catch (error) {
      console.error('Failed to clear auth storage:', error);
    } finally {
      setToken(null);
      setAdmin(null);
    }
  };

  return (
    <AuthContext.Provider value={{ admin, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
