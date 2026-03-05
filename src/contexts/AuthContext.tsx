'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Como agora usamos a config direta, isConfigured é sempre true se o auth existir
  const isConfigured = !!auth;

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signInWithGoogle = async () => {
    if (!auth) {
      toast.error('Erro de inicialização do Firebase.');
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Bem-vindo ao Sellers Pulse!');
    } catch (error: any) {
      console.error("Erro de login:", error);
      if (error.code === 'auth/operation-not-allowed') {
        toast.error('O login com Google não está ativado no Firebase Console.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        toast.error('Login cancelado.');
      } else {
        toast.error('Erro ao autenticar: ' + error.message);
      }
    }
  };

  const logout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      toast.success('Até logo!');
    } catch (error) {
      toast.error('Erro ao sair.');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isConfigured, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
