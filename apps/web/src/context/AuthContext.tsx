import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { apiAuth } from '../services/api';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  patientToken: string | null;
  setPatientToken: (token: string | null) => void;
  loginAs: (key: string) => Promise<void>;
  logout: () => void;
  activeDoctorId: number;
  setActiveDoctorId: (id: number) => void;
}

const DEMO_USERS: Record<string, { email: string; pass: string; role: UserRole; name: string; doctorId?: number }> = {
  admin: { email: 'admin@queuesense.demo', pass: 'Admin@123', role: 'ADMIN', name: 'Admin Staff' },
  reception: { email: 'reception@queuesense.demo', pass: 'Reception@123', role: 'RECEPTION', name: 'Reception Desk' },
  sharma: { email: 'dr.sharma@queuesense.demo', pass: 'Doctor@123', role: 'DOCTOR', name: 'Dr. Priya Sharma', doctorId: 1 },
  mehta: { email: 'dr.mehta@queuesense.demo', pass: 'Doctor@123', role: 'DOCTOR', name: 'Dr. Raj Mehta', doctorId: 2 },
  patel: { email: 'dr.patel@queuesense.demo', pass: 'Doctor@123', role: 'DOCTOR', name: 'Dr. Anita Patel', doctorId: 3 },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('queuesense_user');
    return saved ? JSON.parse(saved) : { id: 1, email: 'admin@queuesense.demo', name: 'Admin Staff', role: 'ADMIN' };
  });
  const [patientToken, setPatientToken] = useState<string | null>(() => {
    return localStorage.getItem('queuesense_patient_token') || 'A-1';
  });
  const [activeDoctorId, setActiveDoctorId] = useState<number>(() => {
    return user?.doctor_id || 1;
  });

  const role: UserRole = user?.role || 'PATIENT';

  useEffect(() => {
    if (patientToken) {
      localStorage.setItem('queuesense_patient_token', patientToken);
    } else {
      localStorage.removeItem('queuesense_patient_token');
    }
  }, [patientToken]);

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

  const logout = () => {
    setUser(null);
    localStorage.removeItem('queuesense_token');
    localStorage.removeItem('queuesense_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        patientToken,
        setPatientToken,
        loginAs,
        logout,
        activeDoctorId,
        setActiveDoctorId,
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
