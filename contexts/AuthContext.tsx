
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { Session } from '@supabase/supabase-js';
import { Profile } from '../types';

interface AuthContextType {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
  isOperator: boolean;
  signIn: (userId: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  academicYear: string;
  semester: string;
  semesterStart: string;
  semesterEnd: string;
  activeScheduleVersion: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState<string>('2025/2026');
  const [semester, setSemester] = useState<string>('Genap');
  const [semesterStart, setSemesterStart] = useState<string>('');
  const [semesterEnd, setSemesterEnd] = useState<string>('');
  const [activeScheduleVersion, setActiveScheduleVersion] = useState<string>('Utama');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        if (!isSupabaseConfigured) return;
        const { data } = await supabase.from('app_settings').select('key, value').in('key', ['academic_year', 'semester', 'active_schedule_version', 'semester_start', 'semester_end']);
        if (data) {
           data.forEach(item => {
               if (item.key === 'academic_year' && item.value) setAcademicYear(item.value);
               if (item.key === 'semester' && item.value) setSemester(item.value);
               if (item.key === 'active_schedule_version' && item.value) setActiveScheduleVersion(item.value);
               if (item.key === 'semester_start' && item.value) setSemesterStart(item.value);
               if (item.key === 'semester_end' && item.value) setSemesterEnd(item.value);
           });
        }
      } catch (e) {
          console.error("Error fetching settings for auth context", e);
      }
    };

    const initAuth = async () => {
      // Prevent fetching if config is missing (avoids 404/Network Error loops)
      if (!isSupabaseConfigured) {
        setIsLoading(false);
        return;
      }
      
      await fetchSettings(); // Wait for settings first

      try {
        // Check active session safely
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        setSession(session);
        if (session) {
          await fetchProfile(session.user.id);
        } else {
          setIsLoading(false);
        }
      } catch (error: any) {
        console.warn("Auth initialization failed:", error);
        if (error?.message?.includes('Refresh Token') || error?.message?.includes('refresh token')) {
            await supabase.auth.signOut().catch(() => {});
        }
        setIsLoading(false);
      }
    };

    initAuth();

    if (!isSupabaseConfigured) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      if (!isSupabaseConfigured) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (data) setProfile(data);
    } catch (error) {
      console.error("Error fetching profile", error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (userId: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: { message: "Konfigurasi Supabase belum diset. Hubungi Admin." } };
    }

    // LOGIKA USER ID:
    // Supabase membutuhkan email. Kita memanipulasi input User ID menjadi format email palsu.
    // Contoh: Input "234567" -> dikirim sebagai "234567@sekolah.id"
    
    // 1. Bersihkan input (hapus spasi)
    const cleanId = userId.trim();
    
    // 2. Jika user tidak sengaja memasukkan email lengkap, kita ambil depannya saja
    const idOnly = cleanId.split('@')[0];
    
    // 3. Gabungkan dengan domain internal aplikasi
    const email = `${idOnly}@sekolah.id`;

    // AUTO-CREATE ADMIN IF NOT EXISTS (requires Email Confirmations to be disabled in Supabase)
    if (cleanId === '112233' && password === 'admin8') {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        
        if (signInError && signInError.message.includes('Invalid login credentials')) {
            // Try to sign up
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: 'Administrator' } }
            });
            
            if (signUpData?.session) {
                // Auto create profile
                // await supabase.from('profiles').update({ role: 'admin', nip: '112233' }).eq('id', signUpData.user?.id);
                setSession(signUpData.session);
                setIsLoading(true);
                await fetchProfile(signUpData.user?.id || "");
                return { data: signUpData, error: null };
            } else if (signUpError) {
                return { data: null, error: signUpError };
            } else {
                return { data: null, error: new Error('Harap matikan "Confirm email" di pengaturan Supabase Auth (Authentication -> Providers -> Email) agar admin dapat dibuat otomatis.') };
            }
        }
        
        if (signInData?.session) {
            // Make sure profile is admin
            // await supabase.from('profiles').update({ role: 'admin', nip: '112233' }).eq('id', signInData.user.id);
            setSession(signInData.session);
            setIsLoading(true);
            await fetchProfile(signInData.user.id);
            return { data: signInData, error: null };
        }
        
        if (signInError && signInError.message.includes('Email not confirmed')) {
             return { data: null, error: new Error('Harap matikan "Confirm email" di pengaturan Supabase Auth (Authentication -> Providers -> Email) lalu hapus user di menu Users Supabase dan coba login lagi.') };
        }
        
        return { data: signInData, error: signInError };
    }
 
    
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.data?.session) {
       setSession(result.data.session);
       setIsLoading(true); // set loading so ProtectedRoute waits for profile
       await fetchProfile(result.data.session.user.id);
    }
    return result;
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      try {
          await supabase.auth.signOut();
      } catch (err) {
          console.warn("Sign out error", err);
      }
    }
    setProfile(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ 
      session, 
      profile, 
      isLoading, 
      signIn,
      signOut,
      isAdmin: profile?.role === 'admin' || session?.user?.email === '112233@sekolah.id',
      isOperator: profile?.role === 'operator',
      academicYear,
        semester,
        semesterStart,
        semesterEnd,
        activeScheduleVersion
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
