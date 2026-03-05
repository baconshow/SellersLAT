'use client';
/**
 * Este arquivo atua como uma ponte para a inicialização centralizada do Firebase.
 * Isso evita a inicialização dupla que causa o erro "authorizedDomains is not iterable".
 */
import { initializeFirebase } from '@/firebase';

const sdks = initializeFirebase();

export const auth = sdks.auth;
export const db = sdks.firestore;
