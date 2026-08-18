'use client';
import { CreditCard, FileText } from 'lucide-react';

export default function DondePagarPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden max-w-2xl mx-auto mt-8">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-center">
          <h2 className="font-semibold text-slate-700 uppercase flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#ff5722]" />
            INFORMACIÓN PARA PAGOS
          </h2>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-700">
              <span className="font-semibold w-36">Banco:</span>
              <span>BANESCO (0134)</span>
            </div>
            
            <div className="flex items-center gap-2 text-slate-700">
              <span className="font-semibold w-36">Cta Corriente Nro.:</span>
              <span className="font-mono bg-slate-100 px-2 py-1 rounded">01340415144151031715</span>
              <button className="text-red-500 hover:text-red-700 ml-1 transition-colors" title="Copiar número de cuenta">
                <FileText className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="pt-6 mt-4 border-t border-slate-200">
            <p className="text-slate-700">
              Todos los pagos a nombre de: <br/>
              <strong className="text-lg text-slate-900 mt-1 block">GLOBAL GREEN TUCACAS</strong> 
              <span className="text-sm font-medium block">R.I.F.: J-123456789</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
