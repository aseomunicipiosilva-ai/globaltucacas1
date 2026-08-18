'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';
import mockData from '@/data/mock_db.json';

type AppState = {
  inmuebles: any[];
  contribuyentes: any[];
  preRegistros: any[];
  updateContribuyente: (id: string, data: any) => void;
  addContribuyente: (data: any) => void;
  aprobarPreRegistro: (item: number) => void;
};

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [inmuebles, setInmuebles] = useState(mockData);

  // Extract unique contribuyentes initially
  const [contribuyentes, setContribuyentes] = useState(() => {
    const map = new Map();
    mockData.forEach((row: any) => {
      if (row.Identidad && !map.has(row.Identidad)) {
        map.set(row.Identidad, {
          Identidad: row.Identidad,
          Contribuyente: row.Contribuyente,
          Telefono: row.Telefono || 'No registrado',
          Correo: row['Correo Electronico'] || 'No registrado',
          CodCont: row['Cod Cont'],
          Direccion: row['Direccion']
        });
      }
    });
    return Array.from(map.values());
  });

  const [preRegistros, setPreRegistros] = useState(() => {
    return mockData.slice(0, 30).map((row: any, index: number) => ({
      item: index + 1,
      codigo: row['Cod Cont'],
      identidad: row['Identidad'],
      contribuyente: row['Contribuyente'],
      registro: '18-03-2026',
      tipo: 'Local / Oficina',
      actividad: row['Actividad Principal'],
      registrado: 'WEB',
      fiscalizado: Math.random() > 0.5 ? 1 : 0
    }));
  });

  const updateContribuyente = (id: string, data: any) => {
    setContribuyentes(prev => prev.map(c => c.Identidad === id ? { ...c, ...data } : c));
  };

  const addContribuyente = (data: any) => {
    setContribuyentes(prev => [{ ...data, CodCont: `N-${Math.floor(Math.random() * 10000)}` }, ...prev]);
  };

  const aprobarPreRegistro = (item: number) => {
    setPreRegistros(prev => prev.filter(pr => pr.item !== item));
  };

  return (
    <AppContext.Provider value={{
      inmuebles,
      contribuyentes,
      preRegistros,
      updateContribuyente,
      addContribuyente,
      aprobarPreRegistro
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
