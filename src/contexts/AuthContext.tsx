"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User } from "firebase/auth";
import { observeAuthState, loginUser, logoutUser, registerUser } from "@/lib/firebase/auth";
import { Teacher, Student, UserRole } from "@/types";

// Vereinigter Benutzertyp
type UserProfile = Teacher | Student | null;

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile;
  userRole: UserRole | null;
  loading: boolean;
  profileLoading: boolean;
  login: (email: string, password: string) => Promise<{ user: User | null; error: string | null }>;
  register: (email: string, password: string) => Promise<{ user: User | null; error: string | null }>;
  logout: () => Promise<{ error: string | null }>;
  getAuthToken: () => Promise<string | null>;
  refreshProfile: () => Promise<void>;
  isStudent: boolean;
  isTeacher: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  userRole: null,
  loading: true,
  profileLoading: true,
  login: async () => ({ user: null, error: null }),
  register: async () => ({ user: null, error: null }),
  logout: async () => ({ error: null }),
  getAuthToken: async () => null,
  refreshProfile: async () => {},
  isStudent: false,
  isTeacher: false,
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  // Profil des Benutzers laden (Teacher oder Student)
  const loadUserProfile = useCallback(async (firebaseUser: User) => {
    setProfileLoading(true);
    try {
      const token = await firebaseUser.getIdToken();

      // Zuerst in teachers Collection suchen
      const teacherResponse = await fetch(`/api/teachers?userId=${firebaseUser.uid}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (teacherResponse.ok) {
        const teacherData = await teacherResponse.json();
        if (teacherData && teacherData.email) {
          setUserProfile(teacherData as Teacher);
          setUserRole(teacherData.role || "teacher");
          setProfileLoading(false);
          return;
        }
      }

      // Dann in students Collection suchen
      const studentResponse = await fetch(`/api/students?userId=${firebaseUser.uid}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (studentResponse.ok) {
        const studentData = await studentResponse.json();
        if (studentData && studentData.email) {
          setUserProfile(studentData as Student);
          setUserRole("student");
          setProfileLoading(false);
          return;
        }
      }

      // Kein Profil gefunden - könnte ein neuer Benutzer sein
      setUserProfile(null);
      setUserRole(null);
    } catch (error) {
      console.error("Error loading user profile:", error);
      setUserProfile(null);
      setUserRole(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // Auth State Observer
  useEffect(() => {
    const unsubscribe = observeAuthState(async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      if (firebaseUser) {
        await loadUserProfile(firebaseUser);
      } else {
        setUserProfile(null);
        setUserRole(null);
        setProfileLoading(false);
      }
    });

    return () => unsubscribe();
  }, [loadUserProfile]);

  const getAuthToken = async (): Promise<string | null> => {
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch (error) {
      console.error("Error getting auth token:", error);
      return null;
    }
  };

  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadUserProfile(user);
    }
  }, [user, loadUserProfile]);

  // Hilfsvariablen für Rollenprüfung
  const isStudent = userRole === "student";
  const isTeacher = userRole === "teacher" || userRole === "picts_admin" || userRole === "super_admin";
  const isAdmin = userRole === "picts_admin" || userRole === "super_admin";

  const value = {
    user,
    userProfile,
    userRole,
    loading,
    profileLoading,
    login: loginUser,
    register: registerUser,
    logout: logoutUser,
    getAuthToken,
    refreshProfile,
    isStudent,
    isTeacher,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
