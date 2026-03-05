'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut, signInAnonymously, type User } from 'firebase/auth';
import { useFirebase } from '@/firebase';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  skipLogin: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Dados fake para o modo anônimo (Guest)
const MOCK_USER_DATA = {
  displayName: 'Visitante (Sellers Pulse)',
  email: 'guest@sellerspulse.com.br',
  photoURL: 'https://picsum.photos/seed/guest/200/200',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const firebase = useFirebase();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (firebase.isUserLoading) return;

    if (firebase.user) {
      if (firebase.user.isAnonymous) {
        setUser({
          ...firebase.user,
          ...MOCK_USER_DATA,
        });
      } else {
        setUser(firebase.user);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, [firebase.user, firebase.isUserLoading]);

  const signInWithGoogle = async () => {
    if (!firebase.auth) {
      toast.error('Firebase Auth não inicializado.');
      return;
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      setLoading(true);
      const result = await signInWithPopup(firebase.auth, provider);
      setUser(result.user);
      localStorage.removeItem('sellers_pulse_dev_mode');
      toast.success(`Bem-vindo, ${result.user.displayName}!`);
    } catch (error: any) {
      console.error("Erro no login Google:", error);
      setLoading(false);
      
      if (error.code === 'auth/unauthorized-domain') {
        toast.error('Domínio não autorizado no Firebase!');
      } else if (error.code === 'auth/popup-closed-by-user') {
        toast.error('Login cancelado.');
      } else {
        toast.error('Erro ao entrar com Google.');
      }
    }
  };

  const skipLogin = async () => {
    if (!firebase.auth) return;
    try {
      setLoading(true);
      await signInAnonymously(firebase.auth);
      toast.success('Entrando como Visitante');
    } catch (error) {
      console.error("Erro no login anônimo:", error);
      setLoading(false);
      toast.error("Erro ao entrar como convidado.");
    }
  };

  const logout = async () => {
    if (firebase.auth) {
      await signOut(firebase.auth);
    }
    setUser(null);
    toast.success('Sessão encerrada.');
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
