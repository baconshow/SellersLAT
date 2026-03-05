'use client';
/**
 * Este arquivo foi simplificado para evitar conflitos de inicialização.
 * Use os hooks de @/firebase (useFirebase, useAuth, useFirestore) em vez deste arquivo.
 */
import { getApps, getApp, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
export const googleProvider = new GoogleAuthProvider();
