'use client';
import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, RefreshCw, Landmark } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

export default function ConciliacionPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{ reference: string; status: 'success' | 'failed' | 'ignored'; message: string }[]>([]);
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const processReconciliation = async () => {
    if (!file) return;
    setIsProcessing(true);
    setResults([]);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);
      
      const resList: any[] = [];
      
      for (const row of rows) {
        // Asumimos que el banco da un excel con columnas "Referencia" y "Monto"
        // Intentaremos varias variaciones de la palabra Referencia
        const refRaw = row['Referencia'] || row['REFERENCIA'] || row['Ref'] || row['Reference'];
        const montoRaw = row['Monto'] || row['MONTO'] || row['Amount'];
        
        if (!refRaw) continue;
        
        const refStr = String(refRaw).slice(-4); // Usamos los ultimos 4 digitos
        const montoStr = parseFloat(String(montoRaw).replace(/,/g, '.'));
        
        // Buscar el pago por verificar
        const { data: pagos } = await supabase
          .from('pagos_reportados')
          .select('*')
          .eq('estado', 'Por Verificar')
          .like('referencia', `%${refStr}`);
          
        if (!pagos || pagos.length === 0) {
          resList.push({ reference: refStr, status: 'ignored', message: 'No se encontró pago "Por Verificar" que coincida.' });
          continue;
        }
        
        // Asumimos que toma el primero que coincida con el monto aproximadamente
        const pago = pagos.find(p => Math.abs(parseFloat(p.monto) - montoStr) < 2); // Margen de error 2 Bs
        
        if (pago) {
          // Aprobar el pago
          await supabase.from('pagos_reportados').update({ estado: 'Aprobado' }).eq('id', pago.id);
          
          // Actualizar facturas y cuotas
          let details: any = {};
          try { details = JSON.parse(pago.detalles); } catch(e){}
          
          if (details.recibos && details.recibos.length > 0) {
            await supabase.from('facturas').update({ estado: 'Pagado' }).in('referencia', details.recibos);
          }
          
          resList.push({ reference: pago.referencia, status: 'success', message: `Pago aprobado. (Monto: Bs ${montoStr})` });
        } else {
          resList.push({ reference: refStr, status: 'failed', message: `Referencia coincide pero monto es diferente (Banco: ${montoStr}).` });
        }
      }
      
      setResults(resList);
      
    } catch (e: any) {
      alert("Error procesando archivo: " + e.message);
    }
    
    setIsProcessing(false);
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto p-6">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <Landmark className="w-8 h-8 text-indigo-600" />
        <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">Conciliación Bancaria Automática</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <p className="text-slate-600 mb-6">
          Sube el archivo Excel (.xlsx) o CSV descargado de tu banco. El sistema cruzará automáticamente las referencias bancarias del archivo con los pagos reportados en estado <strong>Por Verificar</strong>, aprobándolos si los montos coinciden.
        </p>

        <div className="border-2 border-dashed border-slate-300 bg-slate-50 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors relative mb-6">
          <input 
            type="file" 
            accept=".xlsx,.xls,.csv"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileUpload}
          />
          <Upload className="w-10 h-10 text-indigo-400 mb-2" />
          {file ? (
            <div className="text-center">
              <span className="text-lg font-semibold text-indigo-600 block">{file.name}</span>
              <span className="text-sm text-slate-500 mt-1 block">Haz clic para cambiar el archivo</span>
            </div>
          ) : (
            <div className="text-center">
              <span className="text-lg font-medium text-slate-700 block">Haz clic o arrastra tu archivo aquí</span>
              <span className="text-sm text-slate-500 mt-1 block">Formatos: .xlsx, .csv</span>
              <span className="text-xs text-slate-400 mt-1 block">(El archivo debe tener las columnas "Referencia" y "Monto")</span>
            </div>
          )}
        </div>

        <button 
          onClick={processReconciliation}
          disabled={!file || isProcessing}
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 mx-auto w-full max-w-sm"
        >
          {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <FileSpreadsheet className="w-5 h-5" />}
          {isProcessing ? 'Conciliando...' : 'Iniciar Conciliación'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Resultados de Conciliación</h2>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className={`p-3 rounded-lg border flex items-start gap-3 ${r.status === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : r.status === 'failed' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                {r.status === 'success' ? <CheckCircle className="w-5 h-5 mt-0.5" /> : <AlertCircle className="w-5 h-5 mt-0.5" />}
                <div>
                  <p className="font-semibold text-sm">Referencia: {r.reference}</p>
                  <p className="text-xs mt-0.5">{r.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
