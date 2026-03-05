'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut, type User, onAuthStateChanged } from 'firebase/auth';
import { useFirebase } from '@/firebase';
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
  const { auth, user: firebaseUser, isUserLoading } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) return;

    // Sincroniza o estado do usuário com o listener do Firebase
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  // Fallback caso useFirebase ainda esteja carregando
  useEffect(() => {
    if (!isUserLoading) {
      setUser(firebaseUser);
      setLoading(false);
    }
  }, [firebaseUser, isUserLoading]);

  const signInWithGoogle = async () => {
    if (!auth) {
      toast.error('O serviço de autenticação não está disponível. Verifique as chaves do Firebase.');
      return;
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      await signInWithPopup(auth, provider);
      toast.success('Bem-vindo ao Sellers Pulse!');
    } catch (error: any) {
      console.error("Erro de login:", error);
      if (error.code === 'auth/operation-not-allowed') {
        toast.error('O login com Google não está ativado no Firebase Console.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        toast.error('Login cancelado.');
      } else if (error.code === 'auth/unauthorized-domain') {
        toast.error('Este domínio não está autorizado no Firebase Console.');
      } else {
        toast.error('Erro ao autenticar: ' + (error.message || 'Erro desconhecido'));
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
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isConfigured: !!auth, 
      signInWithGoogle, 
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
