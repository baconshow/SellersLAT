'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut, type User } from 'firebase/auth';
import { useFirebase } from '@/firebase';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  skipLogin: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Usuário fake para desenvolvimento
const MOCK_USER = {
  uid: 'dev-user-123',
  displayName: 'Alexandre Sellers (Dev)',
  email: 'alexandre@sellers.com.br',
  photoURL: 'https://picsum.photos/seed/dev/200/200',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const firebase = useFirebase();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (firebase.isUserLoading) return;

    if (firebase.user) {
      setUser(firebase.user);
    } else {
      // Verifica se existe um usuário "skip" no localStorage para manter a sessão dev
      const savedDevUser = localStorage.getItem('sellers_pulse_dev_mode');
      if (savedDevUser) {
        setUser(MOCK_USER);
      }
    }
    setLoading(false);
  }, [firebase.user, firebase.isUserLoading]);

  const signInWithGoogle = async () => {
    if (!firebase.auth) {
      toast.error('Firebase Auth não inicializado.');
      return;
    }

    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(firebase.auth, provider);
      setUser(result.user);
      localStorage.removeItem('sellers_pulse_dev_mode');
      toast.success('Bem-vindo!');
    } catch (error: any) {
      console.error("Erro de login:", error);
      toast.error('Erro ao autenticar: ' + (error.message || 'Erro desconhecido'));
    }
  };

  const skipLogin = () => {
    setUser(MOCK_USER);
    localStorage.setItem('sellers_pulse_dev_mode', 'true');
    toast.success('Modo Desenvolvedor Ativo');
  };

  const logout = async () => {
    localStorage.removeItem('sellers_pulse_dev_mode');
    if (firebase.auth) {
      await signOut(firebase.auth);
    }
    setUser(null);
    toast.success('Até logo!');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isConfigured: !!firebase.auth, 
      signInWithGoogle, 
      skipLogin,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
