'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

type AppState = {
  inmuebles: any[];
  contribuyentes: any[];
  preRegistros: any[];
  facturas: any[];
  documentos: any[];
  certificados: any[];
  condominios: any[];
  reclamos: any[];
  convenios: any[];
  preLiquidaciones: any[];
  isLoading: boolean;
  updateContribuyente: (id: string, data: any) => void;
  addContribuyente: (data: any) => void;
  aprobarPreRegistro: (item: number) => void;
  addFactura: (factura: any) => Promise<void>;
  addAuditLog: (action: string, details: string) => Promise<void>;
};

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [inmuebles, setInmuebles] = useState<any[]>([]);
  const [contribuyentes, setContribuyentes] = useState<any[]>([]);
  const [preRegistros, setPreRegistros] = useState<any[]>([]);
  const [facturas, setFacturas] = useState<any[]>([]);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [certificados, setCertificados] = useState<any[]>([]);
  const [condominios, setCondominios] = useState<any[]>([]);
  const [reclamos, setReclamos] = useState<any[]>([]);
  const [convenios, setConvenios] = useState<any[]>([]);
  const [preLiquidaciones, setPreLiquidaciones] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      const [
        { data: dbInmuebles },
        { data: dbPreRegistros },
        { data: dbFacturas },
        { data: dbDocumentos },
        { data: dbCertificados },
        { data: dbCondominios },
        { data: dbReclamos },
        { data: dbConvenios },
        { data: dbPreLiquidaciones }
      ] = await Promise.all([
        supabase.from('inmuebles').select('*'),
        supabase.from('pre_registros').select('*'),
        supabase.from('facturas').select('*'),
        supabase.from('documentos').select('*'),
        supabase.from('certificados').select('*'),
        supabase.from('condominios').select('*'),
        supabase.from('reclamos').select('*'),
        supabase.from('convenios').select('*'),
        supabase.from('pre_liquidaciones').select('*')
      ]);

      if (dbInmuebles) {
        const mappedInmuebles = dbInmuebles.map(row => ({
          ...row,
          'Inmueble': row.inmueble || row.cod_cont,
          'Clasificacion': row.clasificacion || 'Residencial',
          'Tipo': 'Urbano',
          'Saldo': 0,
          'Cant Inmuebles': 1,
          'Actividad Principal': row.actividad || 'No aplica',
          'Direccion': row.direccion
        }));
        setInmuebles(mappedInmuebles);
        
        const map = new Map();
        dbInmuebles.forEach((row: any) => {
          if (row.identidad && !map.has(row.identidad)) {
            map.set(row.identidad, {
              Identidad: row.identidad,
              Contribuyente: row.contribuyente,
              Telefono: row.telefono || 'No registrado',
              Correo: row.correo_electronico || row.correo || 'No registrado',
              CodCont: row.cod_cont,
              Direccion: row.direccion
            });
          }
        });
        setContribuyentes(Array.from(map.values()));
      }

      if (dbPreRegistros) setPreRegistros(dbPreRegistros);
      if (dbFacturas) setFacturas(dbFacturas);
      if (dbDocumentos) setDocumentos(dbDocumentos);
      if (dbCertificados) setCertificados(dbCertificados);
      if (dbCondominios) setCondominios(dbCondominios);
      if (dbReclamos) setReclamos(dbReclamos);
      if (dbConvenios) setConvenios(dbConvenios);
      if (dbPreLiquidaciones) setPreLiquidaciones(dbPreLiquidaciones);

    } catch (error) {
      console.error("Error loading data from Supabase:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const addAuditLog = async (action: string, details: string) => {
    try {
      const { error } = await supabase.from('audit_logs').insert([{
        user_id: 'Administrador', // Placeholder hasta tener Auth
        action,
        ip_address: 'Registrado por Sistema',
        details
      }]);
      if (error) console.error("Error logging audit:", error);
    } catch (e) {
      console.error(e);
    }
  };

  const updateContribuyente = async (id: string, data: any) => {
    try {
      const { error } = await supabase
        .from('inmuebles')
        .update({
          contribuyente: data.Contribuyente,
          telefono: data.Telefono,
          correo_electronico: data.Correo,
          direccion: data.Direccion,
        })
        .eq('identidad', id);
        
      if (error) throw error;
      
      // Update local state immediately for better UX
      setContribuyentes(prev => prev.map(c => c.Identidad === id ? { ...c, ...data } : c));
      
      await addAuditLog('ACTUALIZAR_CONTRIBUYENTE', `Se actualizaron los datos del contribuyente: ${data.Contribuyente} (Identidad: ${id})`);
    } catch (e) {
      console.error("Error updating contribuyente in Supabase:", e);
      throw e;
    }
  };

  const addContribuyente = async (data: any) => {
    try {
      // Create random ID for cod_cont if it doesn't exist
      const codCont = data.CodCont || `N-${Math.floor(Math.random() * 100000)}`;
      
      // We must insert into 'inmuebles' because that's our master table
      const rowsToInsert = [];
      
      if (data.isCondominio && data.locales && data.locales.length > 0) {
        data.locales.forEach((local: any) => {
          rowsToInsert.push({
            identidad: data.Identidad,
            contribuyente: data.Contribuyente,
            telefono: data.Telefono,
            correo_electronico: data.Correo,
            direccion: data.Direccion,
            cod_cont: codCont,
            clasificacion: local.uso === 'Comercial' ? 'Comercial' : 'Residencial',
            actividad: local.uso === 'Comercial' ? local.actividad : (local.tipoResidencia || 'No aplica'),
            inmueble: local.numeracion
          });
        });
      } else {
        rowsToInsert.push({
          identidad: data.Identidad,
          contribuyente: data.Contribuyente,
          telefono: data.Telefono,
          correo_electronico: data.Correo,
          direccion: data.Direccion,
          cod_cont: codCont,
          clasificacion: data.Clasificacion || 'Residencial',
          actividad: data.Clasificacion === 'Residencial' ? data.TipoResidencia : data.ActividadComercial,
          inmueble: 'Principal'
        });
      }
      
      const { error } = await supabase.from('inmuebles').insert(rowsToInsert);
      
      if (error) throw error;
      
      // Update local state
      await loadAllData();
      await addAuditLog('NUEVO_CONTRIBUYENTE', `Se registró un nuevo contribuyente: ${data.Contribuyente} (Identidad: ${data.Identidad})`);
    } catch (e) {
      console.error("Error adding contribuyente to Supabase:", e);
      throw e;
    }
  };

  const aprobarPreRegistro = async (item: number) => {
    try {
      const { error } = await supabase
        .from('pre_registros')
        .delete()
        .eq('id', item);
        
      if (error) throw error;
      setPreRegistros(prev => prev.filter(r => r.id !== item));
      await addAuditLog('APROBAR_PREREGISTRO', `Se procesó el pre-registro ID: ${item}`);
    } catch (e) {
      console.error("Error approving pre-registro:", e);
      throw e;
    }
  };

  const addFactura = async (data: any) => {
    try {
      const { data: result, error } = await supabase
        .from('facturas')
        .insert([{
          referencia: data.referencia || `FACT-${Math.floor(Math.random() * 1000000)}`,
          contribuyente: data.contribuyente,
          monto: data.monto.toString(),
          emision: data.emision || new Date().toISOString().split('T')[0],
          vencimiento: data.vencimiento || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          estado: 'Pendiente'
        }])
        .select()
        .single();
        
      if (error) throw error;
      if (result) {
        setFacturas(prev => [result, ...prev]);
        await addAuditLog('GENERAR_FACTURA', `Se generó la factura ${result.referencia} para ${result.contribuyente} por Bs. ${result.monto}`);
      }
    } catch (e) {
      console.error("Error adding factura:", e);
      throw e;
    }
  };

  return (
    <AppContext.Provider value={{
      inmuebles,
      contribuyentes,
      preRegistros,
      facturas,
      documentos,
      certificados,
      condominios,
      reclamos,
      convenios,
      preLiquidaciones,
      isLoading,
      updateContribuyente,
      addContribuyente,
      aprobarPreRegistro,
      addFactura,
      addAuditLog
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
