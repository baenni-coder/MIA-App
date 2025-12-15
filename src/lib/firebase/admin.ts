import * as admin from "firebase-admin";

let initialized = false;

// Lazy initialization of Firebase Admin SDK
const initializeAdmin = () => {
  if (!initialized && !admin.apps.length) {
    if (
      !process.env.FIREBASE_ADMIN_PROJECT_ID ||
      !process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
      !process.env.FIREBASE_ADMIN_PRIVATE_KEY
    ) {
      throw new Error("Firebase Admin configuration is missing");
    }

    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(
      /\\n/g,
      "\n"
    );

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });

    initialized = true;
  }
};

export const getAdminAuth = () => {
  initializeAdmin();
  return admin.auth();
};

export const getAdminDb = () => {
  initializeAdmin();
  return admin.firestore();
};
