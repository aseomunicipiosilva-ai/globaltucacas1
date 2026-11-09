'use client';
import { useState, useEffect, useMemo } from 'react';
import { History, Download, Eye, FileText, Search, Printer, X, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ReciboImprimible } from '@/components/ReciboImprimible';
import { useAppContext } from '@/store/AppContext';

export default function DocumentosPage() {
  const { inmuebles, tcmmv } = useAppContext();
  const [portalDoc, setPortalDoc] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [pagosAprobados, setPagosAprobados] = useState<any[]>([]);
  const [facturasPagadas, setFacturasPagadas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecibo, setSelectedRecibo] = useState<any>(null);

  const MESES_FULL = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

  const parseDetalles = (raw: any): any => {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(raw); } catch(e) { return {}; }
  };

  const fetchDocumentos = async () => {
    const fullDoc = localStorage.getItem('portal_doc') || '';
    setPortalDoc(fullDoc);
    if (!fullDoc) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const idLimpio = fullDoc.replace(/-/g, '').toUpperCase();
      const idFmt = idLimpio.charAt(0) + '-' + idLimpio.slice(1);
      const soloNum = fullDoc.replace(/\D/g, '');

      // 1. Cargar Pagos Aprobados
      const { data: pags } = await supabase.from('pagos_reportados')
        .select('*')
        .or('identidad.eq.' + idFmt + ',identidad.eq.' + idLimpio + ',identidad.eq.' + fullDoc.toUpperCase() + ',identidad.eq.' + soloNum)
        .eq('estado', 'Aprobado')
        .order('created_at', { ascending: false });

      setPagosAprobados(pags || []);

      // 2. Cargar Facturas con estado Pagado
      const { data: fact } = await supabase.from('facturas')
        .select('*')
        .or('identidad.eq.' + idFmt + ',identidad.eq.' + idLimpio + ',identidad.eq.' + fullDoc.toUpperCase() + ',identidad.eq.' + soloNum + ',contribuyente.ilike.%' + idLimpio + '%')
        .in('estado', ['Pagado', 'Pagada'])
        .order('emision', { ascending: false });

      setFacturasPagadas(fact || []);
    } catch (e) {
      console.error('Error cargando documentos:', e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDocumentos();
  }, []);

  const armarReciboData = (pago: any) => {
    const det = parseDetalles(pago.detalles);
    const refs: string[] = det.recibos || [];
    const montoTotal = Number(pago.monto || 0);

    const matchInm = (inmuebles || []).find((i: any) => 
      i.identidad === pago.identidad || 
      (i.identidad && pago.identidad && i.identidad.replace(/-/g,'').toUpperCase() === pago.identidad.replace(/-/g,'').toUpperCase())
    );

    const razonSocial = matchInm?.contribuyente || localStorage.getItem('portal_user') || pago.identidad;
    const domicilio = (matchInm?.direccion || 'TUCACAS, MUNICIPIO SILVA, FALCÓN').toUpperCase();
    const cajeroNombre = det.origen || det.cajero || pago.cajero || 'Taquilla Virtual';

    let conceptos: any[] = [];
    if (refs.length > 0) {
      conceptos = refs.map((ref: string) => {
        const parts = ref.split('-');
        let mesLabel = ref;
        if (parts.length >= 5) {
          const mm = parseInt(parts[parts.length - 2]);
          const yyyy = parts[parts.length - 1];
          if (!isNaN(mm) && mm >= 1 && mm <= 12) {
            mesLabel = `${MESES_FULL[mm - 1]} ${yyyy}`;
          }
        }
        const precioUnit = montoTotal / refs.length;
        return {
          descripcion: `Servicio Aseo Urbano - Período: ${mesLabel} (Ref: ${ref})`,
          precioUnit,
          total: precioUnit
        };
      });
    } else {
      conceptos = [{
        descripcion: det.concepto || 'Servicio de Recolección de Aseo Urbano y Domiciliario',
        precioUnit: montoTotal,
        total: montoTotal
      }];
    }

    const reciboNum = (pago.referencia || String(pago.id || '1')).replace(/\D/g, '').slice(-7).padStart(7, '0') || '0000001';

    return {
      reciboNo: reciboNum,
      controlWeb: `WEB-${reciboNum}`,
      fechaEmision: pago.created_at ? pago.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      codContribuyente: matchInm?.cod_cont || pago.identidad,
      razonSocial,
      domicilioFiscal: domicilio,
      rifCi: pago.identidad,
      caja: cajeroNombre,
      conceptos,
      subTotal: montoTotal,
      exento: montoTotal,
      iva: 0,
      total: montoTotal,
      formaPago: pago.tipo === 'Debito' ? 'PUNTO DE VENTA' : (pago.tipo || 'TRANSFERENCIA').toUpperCase(),
      banco: pago.banco || 'BANCO',
      referencia: pago.referencia || 'S/R',
      tasaBcv: det.tasa_bcv || tcmmv || undefined
    };
  };

  const handleVerRecibo = (pago: any) => {
    const rd = armarReciboData(pago);
    setSelectedRecibo(rd);
  };

  // Construir lista unificada de documentos
  const listadoDocumentos = useMemo(() => {
    const docs: any[] = [];

    // Pagos aprobados (recibos oficiales de cobro)
    pagosAprobados.forEach((p) => {
      const det = parseDetalles(p.detalles);
      const refs = det.recibos || [];
      const concepto = refs.length > 0 
        ? `Pago de Aseo (${refs.join(', ')})`
        : (det.concepto || `Pago de Aseo Urbano - Ref: ${p.referencia}`);

      docs.push({
        id: p.referencia ? `REC-${p.referencia}` : `PAG-${p.id}`,
        tipo: 'Recibo de Pago',
        fecha: p.created_at ? p.created_at.split('T')[0] : '',
        concepto,
        monto: Number(p.monto || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        estado: 'Pagado',
        pagoRaw: p
      });
    });

    // Facturas pagadas si no están contempladas directamente en un pago listado
    facturasPagadas.forEach((f) => {
      // verificar si la ref ya está en algún recibo
      const yaEnPago = pagosAprobados.some(p => {
        const d = parseDetalles(p.detalles);
        return (d.recibos || []).includes(f.referencia);
      });

      if (!yaEnPago) {
        docs.push({
          id: f.referencia || `FAC-${f.id}`,
          tipo: 'Factura Cancelada',
          fecha: f.emision || (f.created_at ? f.created_at.split('T')[0] : ''),
          concepto: `Servicio de Aseo Urbano - Período ${f.emision || ''}`,
          monto: Number(parseFloat(String(f.monto || '0').replace(/[^\d.]/g, '')) || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          estado: 'Pagado',
          pagoRaw: {
            id: f.id,
            referencia: f.referencia,
            monto: f.monto,
            identidad: f.identidad,
            created_at: f.emision,
            detalles: { recibos: [f.referencia], concepto: `Factura ${f.referencia}` }
          }
        });
      }
    });

    // Filtro de búsqueda
    if (!searchTerm.trim()) return docs;
    const term = searchTerm.toLowerCase();
    return docs.filter(d => 
      d.id.toLowerCase().includes(term) ||
      d.concepto.toLowerCase().includes(term) ||
      d.fecha.includes(term)
    );
  }, [pagosAprobados, facturasPagadas, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div className="relative w-full sm:w-96">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por Nro. de Recibo o período..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={fetchDocumentos}
          className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar Historial
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700 uppercase flex items-center gap-2 text-sm">
            <History className="w-4 h-4 text-emerald-600" />
            HISTORIAL DE DOCUMENTOS Y RECIBOS OFICIALES
          </h2>
          <span className="text-xs font-bold text-slate-500">
            {listadoDocumentos.length} documento{listadoDocumentos.length !== 1 ? 's' : ''} disponible{listadoDocumentos.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
              Cargando historial de documentos...
            </div>
          ) : listadoDocumentos.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No se encontraron recibos ni pagos registrados para este usuario.
            </div>
          ) : (
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="px-6 py-4 font-medium">Nro. Documento</th>
                  <th className="px-6 py-4 font-medium">Fecha</th>
                  <th className="px-6 py-4 font-medium">Concepto / Período</th>
                  <th className="px-6 py-4 font-medium text-right">Monto (Bs.)</th>
                  <th className="px-6 py-4 font-medium text-center">Estado</th>
                  <th className="px-6 py-4 font-medium text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listadoDocumentos.map((doc, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors text-sm">
                    <td className="px-6 py-4 text-slate-700 font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      {doc.id}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{doc.fecha}</td>
                    <td className="px-6 py-4 text-slate-700 font-medium max-w-md truncate" title={doc.concepto}>
                      {doc.concepto}
                    </td>
                    <td className="px-6 py-4 text-slate-800 font-bold text-right">Bs. {doc.monto}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {doc.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleVerRecibo(doc.pagoRaw)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-bold transition-colors flex items-center gap-1 border border-blue-200" 
                          title="Ver y Descargar Planilla de Recibo"
                        >
                          <Eye className="w-3.5 h-3.5" /> Ver Recibo
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal para Ver / Imprimir Recibo Oficial */}
      {selectedRecibo && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-800 flex items-center justify-between text-white border-b border-slate-700">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Planilla de Recibo de Pago N° {selectedRecibo.reciboNo}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Imprimir / PDF
                </button>
                <button
                  onClick={() => setSelectedRecibo(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Recibo Imprimible */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-100 flex justify-center">
              <div className="bg-white shadow-lg p-2 rounded max-w-full">
                <ReciboImprimible data={selectedRecibo} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
