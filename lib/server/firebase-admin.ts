import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function readEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for Firebase Admin integration.`);
  }
  return value;
}

function getFirebaseAdminApp(): App {
  const existing = getApps()[0];
  if (existing) {
    return existing;
  }

  const projectId = readEnv("FIREBASE_PROJECT_ID");
  const clientEmail = readEnv("FIREBASE_CLIENT_EMAIL");
  const privateKey = readEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export async function verifyFirebaseIdToken(idToken: string) {
  const app = getFirebaseAdminApp();
  return getAuth(app).verifyIdToken(idToken, true);
}

export async function getFirebaseUserByUid(uid: string) {
  const app = getFirebaseAdminApp();
  return getAuth(app).getUser(uid);
}
