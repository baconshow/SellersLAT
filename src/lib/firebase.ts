'use client';
/**
 * Este arquivo atua como uma ponte para a inicialização centralizada do Firebase.
 * Redireciona para o sistema central para evitar inicialização dupla.
 */
import { initializeFirebase } from '@/firebase';

// Inicializa apenas uma vez e exporta as instâncias
const sdks = initializeFirebase();

export const auth = sdks.auth;
export const db = sdks.firestore;
