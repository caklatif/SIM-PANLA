import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

interface AppContextType {
  academicYear: string;
  setAcademicYear: (year: string) => void;
  availableYears: string[];
  refreshYears: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [academicYear, setAcademicYear] = useState<string>('2024/2025'); // Default
  const [availableYears, setAvailableYears] = useState<string[]>(['2024/2025']);

  const refreshYears = async () => {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'academic_year').single();
      if (data?.value) {
        setAcademicYear(data.value);
        const { data: yearsData } = await supabase.from('app_settings').select('value').eq('key', 'available_years').single();
        if (yearsData?.value) {
            try {
                const parsed = JSON.parse(yearsData.value);
                setAvailableYears(parsed);
                if (!parsed.includes(data.value)) {
                     setAvailableYears([...parsed, data.value]);
                }
            } catch (e) {
                setAvailableYears([data.value]);
            }
        } else {
             setAvailableYears([data.value]);
        }
      }
  };

  useEffect(() => {
    refreshYears();
  }, []);

  return (
    <AppContext.Provider value={{ academicYear, setAcademicYear, availableYears, refreshYears }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
