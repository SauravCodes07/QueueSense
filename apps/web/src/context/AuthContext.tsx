import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../services/supabase';
import { apiAuth } from '../services/api';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface AuthContextType {
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  patientToken: string | null;
  setPatientToken: (token: string | null) => void;
  activeDoctorId: number;
  setActiveDoctorId: (id: number) => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null; user: SupabaseUser | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  loginAs: (key: string) => Promise<void>;
}

const DEMO_USERS: Record<string, { email: string; pass: string; role: UserRole; name: string; doctorId?: number }> = {
  admin: { email: 'admin@queuesense.demo', pass: 'Admin@123', role: 'ADMIN', name: 'Arjun Singh' },
  reception: { email: 'reception@queuesense.demo', pass: 'Reception@123', role: 'RECEPTION', name: 'Reception Front Desk' },
  sharma: { email: 'dr.sharma@queuesense.demo', pass: 'Doctor@123', role: 'DOCTOR', name: 'Dr. Priya Sharma', doctorId: 1 },
  mehta: { email: 'dr.mehta@queuesense.demo', pass: 'Doctor@123', role: 'DOCTOR', name: 'Dr. Raj Mehta', doctorId: 2 },
  patel: { email: 'dr.patel@queuesense.demo', pass: 'Doctor@123', role: 'DOCTOR', name: 'Dr. Anita Patel', doctorId: 3 },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapSupabaseUserToQueueSenseUser(sbUser: SupabaseUser): User {
  const metadata = sbUser.user_metadata || {};
  const name =
    metadata.full_name ||
    metadata.name ||
    metadata.user_name ||
    sbUser.email?.split('@')[0] ||
    'Authenticated User';

  const avatarUrl = metadata.avatar_url || metadata.picture || undefined;
  const role: UserRole = (metadata.role as UserRole) || (sbUser.email?.includes('dr.') ? 'DOCTOR' : sbUser.email?.includes('reception') ? 'RECEPTION' : 'ADMIN');

  return {
    id: sbUser.id,
    email: sbUser.email || '',
    name,
    role,
    avatar_url: avatarUrl,
    doctor_id: metadata.doctor_id || (role === 'DOCTOR' ? 1 : undefined),
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [patientToken, setPatientToken] = useState<string | null>(() => {
    return localStorage.getItem('queuesense_patient_token') || 'A-1';
  });

  const [activeDoctorId, setActiveDoctorId] = useState<number>(() => {
    return Number(localStorage.getItem('queuesense_active_doctor_id')) || 1;
  });

  // Keep patient token synced in local storage
  useEffect(() => {
    if (patientToken) {
      localStorage.setItem('queuesense_patient_token', patientToken);
    } else {
      localStorage.removeItem('queuesense_patient_token');
    }
  }, [patientToken]);

  useEffect(() => {
    localStorage.setItem('queuesense_active_doctor_id', String(activeDoctorId));
  }, [activeDoctorId]);

  // Initialize Supabase Auth Session & Subscribe to Auth State Changes
  useEffect(() => {
    let isMounted = true;

    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (!isMounted) return;
      if (initialSession?.user) {
        setSession(initialSession);
        setSupabaseUser(initialSession.user);
        const mapped = mapSupabaseUserToQueueSenseUser(initialSession.user);
        setUser(mapped);
        if (mapped.doctor_id) setActiveDoctorId(mapped.doctor_id);
      } else {
        // Fall back to saved local user session if any
        const saved = localStorage.getItem('queuesense_user');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setUser(parsed);
            if (parsed.doctor_id) setActiveDoctorId(parsed.doctor_id);
          } catch {
            // ignore
          }
        }
      }
      setIsLoading(false);
    }).catch(() => {
      if (isMounted) setIsLoading(false);
    });

    // 2. Real-time auth state listener (OAuth callbacks, token refreshes, sign in, sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        if (!isMounted) return;
        setSession(currentSession);
        if (currentSession?.user) {
          setSupabaseUser(currentSession.user);
          const mapped = mapSupabaseUserToQueueSenseUser(currentSession.user);
          setUser(mapped);
          localStorage.setItem('queuesense_user', JSON.stringify(mapped));
          if (mapped.doctor_id) setActiveDoctorId(mapped.doctor_id);
        } else {
          setSupabaseUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Email & Password Sign In
  const signInWithEmail = async (email: string, pass: string): Promise<{ error: Error | null }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });

      if (error) throw error;

      if (data.user) {
        setSupabaseUser(data.user);
        setSession(data.session);
        const mapped = mapSupabaseUserToQueueSenseUser(data.user);
        setUser(mapped);
        localStorage.setItem('queuesense_user', JSON.stringify(mapped));
        if (mapped.doctor_id) setActiveDoctorId(mapped.doctor_id);
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  // Email & Password Sign Up
  const signUpWithEmail = async (
    email: string,
    pass: string,
    fullName?: string
  ): Promise<{ error: Error | null; user: SupabaseUser | null }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pass,
        options: {
          data: {
            full_name: fullName?.trim(),
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        setSupabaseUser(data.user);
        setSession(data.session);
        const mapped = mapSupabaseUserToQueueSenseUser(data.user);
        setUser(mapped);
        localStorage.setItem('queuesense_user', JSON.stringify(mapped));
      }

      return { error: null, user: data.user };
    } catch (err: any) {
      return { error: err, user: null };
    }
  };

  // Google OAuth Sign In
  const signInWithGoogle = async (): Promise<{ error: Error | null }> => {
    try {
      const redirectTo = `${window.location.origin}/`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  // Sign Out
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    } finally {
      setSupabaseUser(null);
      setSession(null);
      setUser(null);
      localStorage.removeItem('queuesense_token');
      localStorage.removeItem('queuesense_user');
    }
  };

  // Password Reset
  const resetPassword = async (email: string): Promise<{ error: Error | null }> => {
    try {
      const redirectTo = `${window.location.origin}/`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  // Quick Persona / Role Switcher for Clinicians & Demo
  const loginAs = async (key: string) => {
    const demo = DEMO_USERS[key];
    if (!demo) return;
    try {
      const res = await apiAuth.login(demo.email, demo.pass);
      localStorage.setItem('queuesense_token', res.access_token);
      const u: User = {
        id: res.user.id,
        email: res.user.email,
        name: res.user.name,
        role: res.user.role as UserRole,
        doctor_id: res.user.doctor_id,
      };
      setUser(u);
      localStorage.setItem('queuesense_user', JSON.stringify(u));
      if (u.doctor_id) {
        setActiveDoctorId(u.doctor_id);
      }
    } catch (e) {
      console.warn('API login failed, using demo fallback state:', e);
      const u: User = {
        id: demo.doctorId || 1,
        email: demo.email,
        name: demo.name,
        role: demo.role,
        doctor_id: demo.doctorId,
      };
      setUser(u);
      localStorage.setItem('queuesense_user', JSON.stringify(u));
      if (u.doctor_id) {
        setActiveDoctorId(u.doctor_id);
      }
    }
  };

  const role: UserRole = user?.role || 'PATIENT';
  const isAuthenticated = Boolean(user || supabaseUser);

  return (
    <AuthContext.Provider
      value={{
        supabaseUser,
        session,
        user,
        role,
        isAuthenticated,
        isLoading,
        patientToken,
        setPatientToken,
        activeDoctorId,
        setActiveDoctorId,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        resetPassword,
        loginAs,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
