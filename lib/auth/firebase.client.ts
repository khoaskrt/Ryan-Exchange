"use client";

import { initializeApp, getApps } from "firebase/app";
import { getAuth, onAuthStateChanged, type User } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp() {
  const existing = getApps()[0];
  if (existing) {
    return existing;
  }

  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId || !firebaseConfig.appId) {
    throw new Error("Firebase web env vars are missing.");
  }

  return initializeApp(firebaseConfig);
}

export function getFirebaseAuthClient() {
  return getAuth(getFirebaseApp());
}

export function observeFirebaseAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(getFirebaseAuthClient(), callback);
}
