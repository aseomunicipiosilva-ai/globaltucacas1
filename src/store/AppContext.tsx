'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { ordenanzaData } from '@/data/ordenanza';

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
  ordenanzasConfig: typeof ordenanzaData;
  addCertificado: (cert: any) => void;
  tcmmv: number;
  isLoading: boolean;
  setInmuebles: (inmuebles: any[]) => void;
  updateContribuyente: (id: string, data: any) => void;
  addContribuyente: (data: any) => void;
  aprobarPreRegistro: (item: number) => void;
  addFactura: (factura: any) => Promise<void>;
  addAuditLog: (action: string, details: string) => Promise<void>;
  auditLogs: any[];
  setPreRegistros: React.Dispatch<React.SetStateAction<any[]>>;
  setFacturas: React.Dispatch<React.SetStateAction<any[]>>;
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
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [ordenanzasConfig, setOrdenanzasConfig] = useState<any>(ordenanzaData);
  const [tcmmv, setTcmmv] = useState<number>(0);
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
        { data: dbPreLiquidaciones },
        { data: dbConfig },
        apiBcv
      ] = await Promise.all([
        supabase.from('inmuebles').select('*'),
        supabase.from('pre_registros').select('*'),
        supabase.from('facturas').select('*'),
        supabase.from('documentos').select('*'),
        supabase.from('certificados').select('*'),
        supabase.from('condominios').select('*'),
        supabase.from('reclamos').select('*'),
        supabase.from('convenios').select('*'),
        supabase.from('pre_liquidaciones').select('*'),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }),
        supabase.from('sistema_config').select('valor').eq('id', 'tarifas_ordenanza').single(),
        fetch(`/api/bcv?t=${Date.now()}`, { cache: 'no-store' }).then(res => res.json()).catch(() => ({ tcmmv: 0 }))
      ]);

      if (dbConfig && (dbConfig as any).valor) {
        setOrdenanzasConfig((dbConfig as any).valor);
      } else {
        setOrdenanzasConfig(ordenanzaData); // fallback
      }

      const bcvData = apiBcv as any;
      const currentTcmmv = bcvData?.tcmmv || 0;
      setTcmmv(currentTcmmv);
      
      const dbAuditLogsResult = arguments[2] ? arguments[2][9] : null; // It's index 9 in Promise.all actually
      // Let's just fetch it normally since I can't guarantee arguments:
      const { data: fetchAuditLogs } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
      setAuditLogs(fetchAuditLogs || []);

      if (dbInmuebles) {
        const mappedInmuebles = dbInmuebles.map(row => ({
          ...row,
          'Inmueble': row.inmueble || row.cod_cont,
          'Clasificacion': row.clasificacion || 'Residencial',
          'Tipo': 'Urbano',
          'Saldo': (parseFloat(row.deuda_congelada_bs || 0) + (parseFloat(row.deuda_mmv || 0) * currentTcmmv)).toFixed(2),
          'DeudaMMV': parseFloat(row.deuda_mmv || 0),
          'DeudaCongelada': parseFloat(row.deuda_congelada_bs || 0),
          'Cant Inmuebles': 1,
          'Actividad Principal': row.actividad || 'No aplica',
          'Direccion': row.direccion
        }));
        setInmuebles(mappedInmuebles);
        
        const map = new Map();
        dbInmuebles.forEach((row: any) => {
          if (row.identidad && !map.has(row.identidad)) {
            let clase = 'Residencial';
            const act = row.actividad_principal || '';
            if (ordenanzaData.actividadesIndustriales.some(a => a.label === act)) {
              clase = 'Industrial';
            } else if (ordenanzaData.actividadesComerciales.some(a => a.label === act)) {
              clase = 'Comercial';
            } else if (act && act !== 'No aplica') {
              if (!act.toLowerCase().includes('condominio') && !act.toLowerCase().includes('residencial')) {
                 clase = 'Comercial';
              }
            }

            map.set(row.identidad, {
              Identidad: row.identidad,
              Contribuyente: row.contribuyente,
              Telefono: row.telefono || 'No registrado',
              Correo: row.correo_electronico || row.correo || 'No registrado',
              CodCont: row.cod_cont,
              Direccion: row.direccion,
              Actividad: act || 'No aplica',
              Clasificacion: clase,
              SaldoFavor: parseFloat(row.saldo_favor_bs || '0'),
              Estado: row.estado || 'Activo'
            });
          } else if (row.identidad && map.has(row.identidad)) {
            // Si ya existe, sumar saldo a favor
            const existing = map.get(row.identidad);
            existing.SaldoFavor += parseFloat(row.saldo_favor_bs || '0');
            // Mantener el estado más severo si hay múltiples (Eliminado > Inactivo > Activo)
            if (row.estado === 'Eliminado' || (row.estado === 'Inactivo' && existing.Estado !== 'Eliminado')) {
              existing.Estado = row.estado;
            }
            map.set(row.identidad, existing);
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
      else {
        // Refetch audit logs ideally, but we can just reload them in the component or rely on DB
      }
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
          direccion: data.DireccionExacta ? `${data.Direccion} | Exacta: ${data.DireccionExacta}` : data.Direccion,
          clasificacion: data.Clasificacion || 'Residencial',
          actividad_principal: data.Clasificacion === 'Residencial' ? data.TipoResidencia : data.ActividadComercial,
          mmv_mes: calcularMmvMes(data, ordenanzasConfig)
        })
        .eq('identidad', id);
        
      if (error) throw error;
      
      // Update local state immediately for better UX
      setContribuyentes(prev => prev.map(c => c.Identidad === id ? { ...c, ...data } : c));
      
      let logMsg = `Se actualizaron los datos del contribuyente: ${data.Contribuyente} (Identidad: ${id})`;
      if (data.Nota?.trim()) logMsg += ` | Nota Simple: ${data.Nota}`;
      if (data.Notas_Adicionales?.trim()) logMsg += ` | Notas Adicionales: ${data.Notas_Adicionales}`;
      
      await addAuditLog('ACTUALIZAR_CONTRIBUYENTE', logMsg);
    } catch (e) {
      console.error("Error updating contribuyente in Supabase:", e);
      throw e;
    }
  };

  const calcularMmvMes = (localOrData: any, config: any) => {
    let mmv = 0;
    const clasificacion = localOrData.uso || localOrData.Clasificacion || 'Residencial';
    
    if (clasificacion === 'Residencial') {
      const tipo = localOrData.tipoResidencia || localOrData.TipoResidencia;
      const tarifa = config.tiposResidenciales?.find((t: any) => t.label === tipo);
      if (tarifa) mmv = tarifa.factor;
    } else {
      const act = localOrData.actividad || localOrData.ActividadComercial;
      const tarifa = config.actividadesComerciales?.find((t: any) => t.label === act) || 
                     config.actividadesIndustriales?.find((t: any) => t.label === act);
      
      if (tarifa && tarifa.factores) {
        const nivel = localOrData.nivel || localOrData.NivelMetraje;
        const index = config.nivelesMetraje?.indexOf(nivel) ?? 0;
        if (index >= 0 && index < tarifa.factores.length) {
          mmv = tarifa.factores[index];
        } else {
          mmv = tarifa.factores[0];
        }
      }
    }
    return mmv;
  };

  const addContribuyente = async (data: any) => {
    try {
      const codCont = data.CodCont || `N-${Math.floor(Math.random() * 100000)}`;
      const rowsToInsert = [];
      
      if (data.isCondominio && data.locales && data.locales.length > 0) {
        data.locales.forEach((local: any) => {
          rowsToInsert.push({
            identidad: data.Identidad,
            contribuyente: data.Contribuyente,
            telefono: data.Telefono,
            correo_electronico: data.Correo,
            direccion: data.DireccionExacta ? `${data.Direccion} | Exacta: ${data.DireccionExacta}` : data.Direccion,
            cod_cont: codCont,
            clasificacion: local.uso === 'Comercial' ? 'Comercial' : 'Residencial',
            actividad_principal: local.uso === 'Comercial' ? local.actividad : (local.tipoResidencia || 'No aplica'),
            inmueble: local.numeracion,
            mmv_mes: calcularMmvMes(local, ordenanzasConfig)
          });
        });
      } else {
        rowsToInsert.push({
          identidad: data.Identidad,
          contribuyente: data.Contribuyente,
          telefono: data.Telefono,
          correo_electronico: data.Correo,
          direccion: data.DireccionExacta ? `${data.Direccion} | Exacta: ${data.DireccionExacta}` : data.Direccion,
          cod_cont: codCont,
          clasificacion: data.Clasificacion || 'Residencial',
          actividad_principal: data.Clasificacion === 'Residencial' ? data.TipoResidencia : data.ActividadComercial,
          inmueble: 'Principal',
          mmv_mes: calcularMmvMes(data, ordenanzasConfig)
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

  const addCertificado = (cert: any) => {
    setCertificados(prev => [cert, ...prev]);
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
      ordenanzasConfig,
      addCertificado,
      addAuditLog,
      auditLogs,
      tcmmv,
      isLoading,
      setInmuebles,
      updateContribuyente,
      addContribuyente,
      aprobarPreRegistro,
      addFactura,
      setPreRegistros,
      setFacturas
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
