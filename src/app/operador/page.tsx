'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { MapPin, TrendingUp, Clock, PlusCircle, Download, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function OperadorDashboard() {
  const router = useRouter();
  const [operador, setOperador] = useState<string | null>(null);
  const [censosRealizados, setCensosRealizados] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const storedOp = localStorage.getItem('operador_censo_auth');
    if (storedOp) {
      setOperador(storedOp);
      fetchStats(storedOp);
    }
  }, []);

  const fetchStats = async (opName: string) => {
    try {
      // Find all pre_registros where origen contains the operator's name
      const { count, error } = await supabase
        .from('pre_registros')
        .select('*', { count: 'exact', head: true })
        .like('origen', `%Censo - ${opName}%`);
        
      if (!error && count !== null) {
        setCensosRealizados(count);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (!operador) return;
    setIsExporting(true);
    try {
      const { data, error } = await supabase
        .from('pre_registros')
        .select('*')
        .like('origen', `%Censo - ${operador}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        alert('No hay datos de censos registrados por usted para exportar.');
        setIsExporting(false);
        return;
      }

      // Format data for excel
      const excelData = data.map((item: any) => {
        return {
          'Fecha de Registro': new Date(item.created_at).toLocaleString(),
          'Identificación (Cédula/RIF)': item.identidad,
          'Nombre / Razón Social': item.contribuyente,
          'Teléfono / Registro': item.registro,
          'Clasificación': item.tipo,
          'Actividad / Tipo Residencia': item.actividad,
          'Código / Metraje': item.codigo,
          'Fecha de Inicio de Actividad': item.fecha_inicio,
          'Domicilio Fiscal': item.domicilio_fiscal,
          'Dirección Exacta (Mapa)': item.direccion_exacta,
          'Coordenadas (Lat, Lng)': item.coordenadas ? `${item.coordenadas.lat}, ${item.coordenadas.lng}` : '',
          '¿Es Condominio?': item.is_condominio ? 'Sí' : 'No',
          'Cantidad de Inmuebles': item.cantidad_inmuebles || 0,
          'Notas y Catastro': item.nota || ''
        };
      });

      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Auto-size columns slightly
      const colWidths = [
        { wch: 20 }, // Fecha Registro
        { wch: 15 }, // Identidad
        { wch: 30 }, // Contribuyente
        { wch: 15 }, // Teléfono
        { wch: 15 }, // Clasificación
        { wch: 25 }, // Actividad
        { wch: 15 }, // Código
        { wch: 15 }, // Fecha Inicio
        { wch: 35 }, // Domicilio
        { wch: 35 }, // Dirección
        { wch: 20 }, // Coordenadas
        { wch: 15 }, // Condominio
        { wch: 20 }, // Inmuebles
        { wch: 40 }, // Notas
      ];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Mis Censos');

      const fileName = `Censos_${operador.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error(err);
      alert('Hubo un error al exportar los datos.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!operador) return null; // handled by layout

  return (
    <div className="p-4 space-y-6">
      
      {/* Welcome Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mt-2">
        <h2 className="text-xl font-bold text-slate-800">¡Hola, {operador}!</h2>
        <p className="text-sm text-slate-500 mt-1">¿Listo para comenzar la jornada de hoy?</p>
        
        <button 
          onClick={() => router.push('/operador/censo')}
          className="w-full mt-6 bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-orange-500/25 transition-transform active:scale-95"
        >
          <PlusCircle className="w-6 h-6" /> 
          <span className="text-lg">Nuevo Censo</span>
        </button>

        <button 
          onClick={handleExportExcel}
          disabled={isExporting}
          className="w-full mt-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow shadow-emerald-500/25 transition-transform active:scale-95 disabled:opacity-50"
        >
          {isExporting ? <Clock className="w-5 h-5 animate-spin" /> : <FileSpreadsheet className="w-5 h-5" />}
          <span>{isExporting ? 'Exportando...' : 'Descargar Mi Data (Excel)'}</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
          <div className="bg-orange-100 p-3 rounded-full mb-3 text-orange-600">
            <TrendingUp size={24} />
          </div>
          <span className="text-3xl font-black text-slate-800">
            {loading ? '...' : censosRealizados}
          </span>
          <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">Censos Enviados</span>
        </div>
        
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center opacity-70">
          <div className="bg-blue-100 p-3 rounded-full mb-3 text-blue-600">
            <Clock size={24} />
          </div>
          <span className="text-3xl font-black text-slate-800">0</span>
          <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">Horas en Ruta</span>
        </div>
      </div>

      <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex gap-4 mt-8 items-start">
        <MapPin className="w-6 h-6 text-orange-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-orange-900 text-sm">Recordatorio</h3>
          <p className="text-xs text-orange-800/80 mt-1">
            Asegúrate de colocar correctamente el pin en el mapa y tomar nota del tipo de actividad comercial en cada local.
          </p>
        </div>
      </div>
      
    </div>
  );
}
