'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { MapPin, TrendingUp, Clock, PlusCircle } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function OperadorDashboard() {
  const router = useRouter();
  const [operador, setOperador] = useState<string | null>(null);
  const [censosRealizados, setCensosRealizados] = useState(0);
  const [loading, setLoading] = useState(true);

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
