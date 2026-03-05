
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Verificação básica para evitar erro de inicialização sem chaves
const isConfigValid = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== 'SUA_API_KEY_AQUI';

const app = !getApps().length 
  ? (isConfigValid ? initializeApp(firebaseConfig) : null)
  : getApp();

export const auth = app ? getAuth(app) : null as any;
export const db = app ? getFirestore(app) : null as any;
export const storage = app ? getStorage(app) : null as any;
export const googleProvider = new GoogleAuthProvider();

if (googleProvider) {
  googleProvider.setCustomParameters({ prompt: 'select_account' });
}

export default app;
