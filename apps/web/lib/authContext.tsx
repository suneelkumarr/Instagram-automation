'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  affiliateCode: string;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
  usage?: Record<string, number>;
  limits?: Record<string, number>;
}

interface AuthContextType {
  user: User | null;
  workspace: Workspace | null;
  workspaces: Workspace[];
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string; workspaceName?: string }) => Promise<void>;
  logout: () => void;
  switchWorkspace: (workspaceId: string) => void;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('rsushop_token');
    const storedUser = localStorage.getItem('rsushop_user');
    const storedWorkspace = localStorage.getItem('rsushop_workspace');
    const storedWorkspaces = localStorage.getItem('rsushop_workspaces');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        if (storedWorkspace) setWorkspace(JSON.parse(storedWorkspace));
        if (storedWorkspaces) setWorkspaces(JSON.parse(storedWorkspaces));
      } catch {
        localStorage.removeItem('rsushop_token');
        localStorage.removeItem('rsushop_user');
        localStorage.removeItem('rsushop_workspace');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password });
    const { data: authData } = response.data;

    setToken(authData.accessToken);
    setUser(authData.user);
    setWorkspace(authData.workspace);
    setWorkspaces([authData.workspace]);

    localStorage.setItem('rsushop_token', authData.accessToken);
    localStorage.setItem('rsushop_user', JSON.stringify(authData.user));
    localStorage.setItem('rsushop_workspace', JSON.stringify(authData.workspace));
    localStorage.setItem('rsushop_refresh_token', authData.refreshToken);
  };

  const register = async (data: { email: string; password: string; firstName: string; lastName: string; workspaceName?: string }) => {
    const response = await axios.post(`${API_URL}/auth/register`, data);
    const { data: authData } = response.data;

    setToken(authData.accessToken);
    setUser(authData.user);
    setWorkspace(authData.workspace);
    setWorkspaces([authData.workspace]);

    localStorage.setItem('rsushop_token', authData.accessToken);
    localStorage.setItem('rsushop_user', JSON.stringify(authData.user));
    localStorage.setItem('rsushop_workspace', JSON.stringify(authData.workspace));
    localStorage.setItem('rsushop_refresh_token', authData.refreshToken);
  };

  const logout = () => {
    setUser(null);
    setWorkspace(null);
    setToken(null);
    localStorage.removeItem('rsushop_token');
    localStorage.removeItem('rsushop_user');
    localStorage.removeItem('rsushop_workspace');
    localStorage.removeItem('rsushop_refresh_token');
  };

  const switchWorkspace = async (workspaceId: string) => {
    const ws = workspaces.find(w => w.id === workspaceId);
    if (ws) {
      setWorkspace(ws);
      localStorage.setItem('rsushop_workspace', JSON.stringify(ws));
    }
  };

  const refreshToken = async () => {
    const refreshToken = localStorage.getItem('rsushop_refresh_token');
    if (!refreshToken) {
      logout();
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
      const { data } = response.data;
      setToken(data.accessToken);
      localStorage.setItem('rsushop_token', data.accessToken);
    } catch {
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{
      user, workspace, workspaces, token, loading,
      login, register, logout, switchWorkspace, refreshToken
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// API helper with auth
export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rsushop_token');
  const workspace = localStorage.getItem('rsushop_workspace');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (workspace) {
    const ws = JSON.parse(workspace);
    config.headers['X-Workspace-Id'] = ws.id;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('rsushop_refresh_token');
      if (refreshToken && !error.config._retry) {
        error.config._retry = true;
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          const newToken = response.data.data.accessToken;
          localStorage.setItem('rsushop_token', newToken);
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return api(error.config);
        } catch {
          localStorage.removeItem('rsushop_token');
          localStorage.removeItem('rsushop_user');
          localStorage.removeItem('rsushop_workspace');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
