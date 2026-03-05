'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

// Singleton para armazenar os SDKs inicializados
let sdks: ReturnType<typeof getSdks> | null = null;

export function initializeFirebase() {
  // Se já inicializamos nesta sessão/janela, retorna o cache
  if (sdks) return sdks;

  let firebaseApp: FirebaseApp;

  if (!getApps().length) {
    try {
      // Tenta inicialização automática do App Hosting (apenas em produção/servidor)
      firebaseApp = initializeApp();
    } catch (e) {
      // Fallback para a configuração manual (desenvolvimento e build)
      firebaseApp = initializeApp(firebaseConfig);
    }
  } else {
    firebaseApp = getApp();
  }

  sdks = getSdks(firebaseApp);
  return sdks;
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
