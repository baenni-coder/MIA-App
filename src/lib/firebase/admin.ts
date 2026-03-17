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

    // Handle private key newlines robustly:
    // - Vercel stores literal \n in env vars → replace needed
    // - dotenv v17 with double quotes converts \n to real newlines → already ok
    // - Some configs strip newlines entirely → we re-add them
    let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    // Replace literal \n sequences with real newlines
    privateKey = privateKey.replace(/\\n/g, "\n");
    // If the key still doesn't have proper PEM structure, try to fix it
    if (privateKey.includes("-----BEGIN") && !privateKey.includes("\n-----")) {
      // Key is all on one line - split the PEM header/footer from the base64 body
      privateKey = privateKey
        .replace(/-----BEGIN (.*?)-----\s*/, "-----BEGIN $1-----\n")
        .replace(/\s*-----END (.*?)-----/, "\n-----END $1-----\n");
    }

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

export const getAdminApp = () => {
  initializeAdmin();
  return admin.apps[0]!;
};

export const getAdminStorage = () => {
  initializeAdmin();
  return admin.storage();
};
