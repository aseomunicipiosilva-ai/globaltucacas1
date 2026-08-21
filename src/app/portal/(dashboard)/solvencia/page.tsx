'use client';
import { Award, Download, Printer, AlertTriangle } from 'lucide-react';
import Image from 'next/image';

export default function SolvenciaPage() {
  const solvencia = {
    certificado: 'S-000062',
    fecha: '06/07/2026',
    razonSocial: 'Ricardo Jose Nolasco Castillo',
    rif: 'V27140507',
    telefono: '04126475475',
    codigo: 'C-000254',
    inmueble: 'I-000252',
    patente: 'S/N',
    direccion: 'Avenida Hugo Chavez Casa 05 El Calvario Municipio Silva, Falcón Zona Postal 2055',
    periodoHasta: '07-2026',
    validoHasta: '31/07/2026',
    vencida: true // Cambiar a false para ver la versión solvente
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div>
          <h2 className="font-semibold text-slate-700 uppercase flex items-center gap-2 text-sm">
            <Award className="w-5 h-5 text-blue-500" />
            CERTIFICADO DE SOLVENCIA MUNICIPAL
          </h2>
          <p className="text-xs text-slate-500 mt-1">Consulte o descargue su certificado de solvencia de aseo urbano.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-50 transition-colors text-sm font-medium">
            <Printer className="w-4 h-4" /> Imprimir
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium">
            <Download className="w-4 h-4" /> Descargar PDF
          </button>
        </div>
      </div>

      {solvencia.vencida && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-800">Certificado Vencido</h3>
            <p className="text-sm text-red-700 mt-1">Su certificado actual ha expirado. Por favor, diríjase a la sección de Estado de Cuenta para verificar sus pagos pendientes.</p>
          </div>
        </div>
      )}

      {/* Visor del Certificado */}
      <div className="bg-white rounded-lg shadow-lg border border-slate-200 max-w-4xl mx-auto overflow-hidden relative">
        {solvencia.vencida && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none opacity-20 overflow-hidden">
            <span className="text-[150px] font-bold text-red-600 -rotate-45 tracking-widest" style={{ textShadow: '2px 2px 0 #fff, -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff' }}>
              VENCIDA
            </span>
          </div>
        )}

        <div className="p-8 sm:p-12 relative z-0">
          {/* Header del Certificado */}
          <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
            <div className="flex items-center gap-4">
              {/* Logo Placeholder */}
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-inner">
                GG
              </div>
              <div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tighter">GLOBAL GREEN</h1>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Un ambiente limpio para todos</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-slate-700 tracking-wide">CERTIFICADO DE SOLVENCIA</h2>
              <p className="text-sm text-slate-600 mt-1">Certificado: <span className="font-mono font-semibold">{solvencia.certificado}</span></p>
              <p className="text-sm text-slate-600">Fecha: <span className="font-semibold">{solvencia.fecha}</span></p>
            </div>
          </div>

          {/* Datos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-8">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase mb-3 border-b border-slate-200 pb-1">Datos del Contribuyente</h3>
              <div className="space-y-2 text-sm">
                <div className="flex"><span className="w-24 text-slate-500">Razón Social:</span> <strong className="text-slate-800">{solvencia.razonSocial}</strong></div>
                <div className="flex"><span className="w-24 text-slate-500">RIF / C.I.:</span> <strong className="text-slate-800">{solvencia.rif}</strong></div>
                <div className="flex"><span className="w-24 text-slate-500">Teléfono:</span> <strong className="text-slate-800">{solvencia.telefono}</strong></div>
                <div className="flex"><span className="w-24 text-slate-500">Código:</span> <strong className="text-slate-800">{solvencia.codigo}</strong></div>
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase mb-3 border-b border-slate-200 pb-1">Detalles del Inmueble</h3>
              <div className="space-y-2 text-sm">
                <div className="flex"><span className="w-24 text-slate-500">Código:</span> <strong className="text-slate-800">{solvencia.inmueble}</strong></div>
                <div className="flex"><span className="w-24 text-slate-500">Patente:</span> <strong className="text-slate-800">{solvencia.patente}</strong></div>
                <div className="flex"><span className="w-24 text-slate-500">Dirección:</span> <strong className="text-slate-800 leading-tight">{solvencia.direccion}</strong></div>
              </div>
            </div>
          </div>

          {/* Periodo */}
          <div className="mb-8">
            <h3 className="text-xs font-bold text-slate-800 uppercase mb-3 bg-slate-100 px-3 py-1.5">Período de Solvencia</h3>
            <div className="bg-slate-50 border border-slate-200 p-6 text-center rounded">
              <div className="text-2xl font-bold text-blue-600 tracking-wide uppercase">SOLVENTE HASTA: {solvencia.periodoHasta}</div>
              <div className="text-sm font-semibold text-slate-600 mt-2">CERTIFICADO VÁLIDO HASTA: {solvencia.validoHasta}</div>
            </div>
          </div>

          {/* Declaración */}
          <div className="mb-12">
            <h3 className="text-xs font-bold text-slate-800 uppercase mb-3 bg-slate-100 px-3 py-1.5">Declaración</h3>
            <p className="text-sm text-slate-700 text-justify leading-relaxed">
              Hacemos constar que el inmueble referenciado ha cumplido con las obligaciones de pago señaladas en la 
              <strong> Ordenanza Municipal</strong> por concepto de <strong>ASEO URBANO</strong>, encontrándose solvente hasta el período 
              indicado.
            </p>
          </div>

          {/* Footer QR */}
          <div className="flex justify-end items-end gap-4 border-t border-slate-200 pt-6">
            <div className="text-right text-[10px] text-slate-500 max-w-xs">
              <p>Escanee este código QR para validar la autenticidad de este certificado de solvencia.</p>
              <p className="mt-1">La validación en línea estará disponible hasta: {solvencia.validoHasta}</p>
            </div>
            {/* Fake QR */}
            <div className="w-24 h-24 bg-slate-800 rounded p-1 flex flex-wrap gap-1 opacity-80">
               {/* Pattern to look like a QR code */}
               {Array.from({length: 64}).map((_, i) => (
                 <div key={i} className={`w-2 h-2 ${Math.random() > 0.5 ? 'bg-white' : 'bg-transparent'}`}></div>
               ))}
            </div>
          </div>

          {/* Nota */}
          <div className="mt-8 text-center text-[10px] text-slate-400 italic">
            Nota: Este documento es válido únicamente para los fines establecidos por la normativa municipal vigente y pierde su validez una vez vencida la fecha de expiración indicada. Cualquier alteración o modificación invalida el presente certificado.
          </div>
        </div>
      </div>
    </div>
  );
}
