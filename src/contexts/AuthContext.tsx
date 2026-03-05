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

// Usuário fake para consistência visual em modo dev
const MOCK_USER_DATA = {
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
      // Se for um usuário anônimo (Modo Dev), mesclamos com os dados fakes para o UI
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

  const skipLogin = async () => {
    if (!firebase.auth) return;
    try {
      // Realiza login anônimo real para que o Firestore aceite as requisições
      await signInAnonymously(firebase.auth);
      localStorage.setItem('sellers_pulse_dev_mode', 'true');
      toast.success('Modo Desenvolvedor Ativo (Sessão Anônima)');
    } catch (error) {
      console.error("Erro ao entrar em modo dev:", error);
      toast.error("Erro ao ativar modo dev.");
    }
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
