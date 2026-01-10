import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User,
} from "firebase/auth";
import { auth } from "./config";

// Registrierung
export const registerUser = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};

// Login
export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};

// Logout
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

// Auth State Observer
export const observeAuthState = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Passwort zurücksetzen
export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, error: null };
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    // Benutzerfreundliche Fehlermeldungen
    let errorMessage = "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.";

    if (firebaseError.code === "auth/user-not-found") {
      errorMessage = "Es wurde kein Konto mit dieser E-Mail-Adresse gefunden.";
    } else if (firebaseError.code === "auth/invalid-email") {
      errorMessage = "Bitte geben Sie eine gültige E-Mail-Adresse ein.";
    } else if (firebaseError.code === "auth/too-many-requests") {
      errorMessage = "Zu viele Anfragen. Bitte warten Sie einige Minuten.";
    }

    return { success: false, error: errorMessage };
  }
};
