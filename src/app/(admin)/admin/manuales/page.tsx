'use client';
import React, { useState } from 'react';
import { BookOpen, Download, Search, CheckCircle, FileText, Smartphone, DollarSign, Users, ShieldAlert, Award, ChevronRight, HelpCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ManualSection {
  id: string;
  title: string;
  icon: string;
  category: string;
  summary: string;
  steps: string[];
  tips: string[];
}

const MANUALES: ManualSection[] = [
  {
    id: 'caja',
    title: 'Manual de Caja, Cobro Móvil y Emisión de Recibos',
    icon: '💵',
    category: 'Recaudación y Finanzas',
    summary: 'Procedimiento operativo para recaudadores, taquilla y cobradores en calle. Reglas de cobro, conciliación y recibos.',
    steps: [
      'Búsqueda del contribuyente por cédula, RIF o nombre.',
      'Selección de meses a cobrar: se pueden seleccionar deudas corrientes o agregar períodos anteriores retroactivos con el botón "➕ Mes Anterior".',
      'Selección de Método de Pago: Débito (Punto de Venta), Transferencia Bancaria, Pago Móvil o Saldo a Favor.',
      'Control de Comprobante Obligatorio: En transferencias y pago móvil es obligatorio adjuntar el archivo/foto de la constancia bancaria.',
      'Bloqueo Automático de Referencias: El sistema bloquea de manera estricta cualquier referencia o número de comprobante previamente registrado en el sistema para evitar desfases de conciliación.',
      'Formato de Recibo: Seleccione "Recibo Consolidado" (agrupa varios meses en 1 solo recibo con desglose) o "Recibos Individuales" (un recibo independiente por cada mes) según solicitud del usuario.'
    ],
    tips: [
      'Al terminar el turno diario, ingrese al módulo Reportes > Cuadre de Caja para verificar ingresos por punto y transferencias.',
      'Nunca reutilice referencias de prueba en transferencias reales.'
    ]
  },
  {
    id: 'censo',
    title: 'Manual de Censo, Inscripciones y Prevención de Duplicados',
    icon: '📋',
    category: 'Padrón y Catastro',
    summary: 'Guía para empadronamiento de nuevos contribuyentes y actualización de datos catastrales sin duplicidad.',
    steps: [
      'Seleccione la modalidad: "➕ Nuevo Registro" para contribuyentes no inscritos o "🔄 Actualización de Datos" si ya existe en el sistema.',
      'En Actualización: Escriba el RIF o nombre para autocompletar automáticamente todos los datos del inmueble.',
      'En Nuevo Registro: El sistema valida automáticamente si la cédula/RIF ya existe; si existe, alerta al operador y sugiere pasar a modo actualización para proteger la integridad del padrón.',
      'Defina la clasificación (Residencial, Comercial o Industrial) y asocie la actividad económica según el catálogo de la Ordenanza Municipal.',
      'En condominios: indique el número de locales/apartamentos y registre la discriminación de unidades.'
    ],
    tips: [
      'Verifique que la dirección exacta incluya puntos de referencia claros para facilitar las rutas de aseo urbano.',
      'Para comercios con múltiples actividades, asigne la actividad comercial principal.'
    ]
  },
  {
    id: 'conciliacion',
    title: 'Manual de Conciliación Bancaria y Verificación Web',
    icon: '🏦',
    category: 'Administración y Tesorería',
    summary: 'Proceso de revisión, verificación de transferencias reportadas por el portal y conciliación bancaria.',
    steps: [
      'Acceda a "Caja > Conciliación Bancaria" o "Emisión de Recibos > Por Verificar".',
      'Haga clic sobre el comprobante adjunto para visualizar el capture en alta resolución.',
      'Verifique en el extracto bancario de la cuenta recaudadora que el monto y la fecha coincidan exactamente con la referencia.',
      'Haga clic en "Aprobar": El pago cambia automáticamente a Pagado y se liquidan los recibos correspondientes.',
      'Si el pago no coincide o la referencia es falsa, haga clic en "Rechazar" indicando el motivo en el cuadro de texto.'
    ],
    tips: [
      'El sistema notifica al contribuyente en su portal cuando su pago ha sido aprobado o rechazado.',
      'Los pagos por Punto de Venta se aprueban automáticamente en tiempo real.'
    ]
  },
  {
    id: 'servicios_especiales',
    title: 'Manual de Servicios Especiales, Visto Bueno y Tala/Poda',
    icon: '🔧',
    category: 'Servicios Ambientales',
    summary: 'Emisión, cálculo ordenanza y generación de planillas oficiales para servicios extraordinarios e inspecciones.',
    steps: [
      'Seleccione la pestaña del trámite: Servicios Especiales, Extraordinarios, Inspecciones, Visto Bueno Ambiental o Tala y Poda.',
      'Haga clic en "Nuevo Servicio": busque al contribuyente e ingrese los parámetros técnicos (volumen m³, viajes de camión, altura de árboles en metros o unidades).',
      'El sistema calcula automáticamente la tarifa en TCMV / UMMV y su conversión oficial en Bolívares según la tasa del BCV.',
      'Haga clic en "Planilla": Se genera inmediatamente el documento oficial en PDF con encabezado municipal, desglose de cálculo, sellos y firmas.'
    ],
    tips: [
      'Entregue una copia firmada de la planilla al solicitante y archive el duplicado en el expediente físico.',
      'Los trámites habilitados de Visto Bueno incluyen un recargo de 100 TCMV según ordenanza.'
    ]
  },
  {
    id: 'envios_masivos',
    title: 'Manual de Automatización de Envíos Masivos (Crons)',
    icon: '📧',
    category: 'Comunicaciones y Tecnología',
    summary: 'Instrucciones para la ejecución de correos masivos automáticos y recordatorios de solvencia a contribuyentes.',
    steps: [
      'La plataforma cuenta con un Cron automatizado en Vercel programado para ejecutarse los Lunes a las 9:00 AM (13:00 UTC).',
      'El cron recopila a todos los contribuyentes con correo electrónico válido y genera el resumen oficial de solvencia y facturas pendientes.',
      'Para ejecutar envíos manuales o pruebas: Ingrese a "Correos Informativos".',
      'Seleccione "Prueba Controlada" e ingrese su correo para validar el diseño visual antes de lanzar a todo el padrón.',
      'Al enviar masivamente, el sistema procesa los correos en lotes escalonados para evitar bloqueos de servidores.'
    ],
    tips: [
      'Verifique que la variable de entorno RESEND_API_KEY esté configurada correctamente en el despliegue.',
      'Todos los envíos quedan registrados en la Bitácora de Auditoría.'
    ]
  },
  {
    id: 'portal',
    title: 'Manual del Contribuyente y Trazabilidad en Perfil',
    icon: '👤',
    category: 'Atención al Ciudadano',
    summary: 'Operación del portal web para consulta de solvencia, pago digital y visualización del historial.',
    steps: [
      'El contribuyente ingresa con su Cédula/RIF y contraseña en /portal.',
      'En el Dashboard principal puede ver su solvencia, deudas pendientes y la nueva sección "Historial de Trazabilidad".',
      'En Pagos: selecciona los recibos a pagar, adjunta obligatoriamente la captura de la transferencia e ingresa la referencia.',
      'En Solvencia: si el contribuyente no posee deudas, puede generar y descargar su Certificado Oficial de Solvencia Ambiental con código QR.'
    ],
    tips: [
      'Cualquier cambio de correo, teléfono o solicitud de convenio queda registrado con fecha y hora tanto para el ciudadano como para la administración.',
      'Los recibos de pago quedan disponibles permanentemente en el portal.'
    ]
  }
];

export default function ManualesPage() {
  const [selectedId, setSelectedId] = useState<string>('caja');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const selectedManual = MANUALES.find(m => m.id === selectedId) || MANUALES[0];

  const filteredManuales = MANUALES.filter(m => 
    m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const descargarManualPDF = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'letter' });
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;

    // Header
    doc.setFillColor(10, 74, 42);
    doc.rect(margin, 12, pageWidth - margin * 2, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('INSTITUTO AUTÓNOMO MUNICIPAL DE GESTIÓN AMBIENTAL (ISMA)', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(9);
    doc.text('MANUAL OPERATIVO Y GUÍA DE PROCEDIMIENTOS DEL SISTEMA DIGITAL', pageWidth / 2, 24, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Alcaldía del Municipio Silva, Estado Falcón - Edición Oficial ${new Date().getFullYear()}`, pageWidth / 2, 29, { align: 'center' });

    let currentY = 42;

    MANUALES.forEach((m, idx) => {
      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(21, 128, 61);
      doc.text(`${idx + 1}. ${m.title}`, margin, currentY);
      currentY += 5;

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Categoría: ${m.category}`, margin, currentY);
      currentY += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(m.summary, margin, currentY, { maxWidth: pageWidth - margin * 2 });
      currentY += 8;

      const stepsTable = m.steps.map((st, i) => [`Paso ${i + 1}`, st]);

      autoTable(doc, {
        startY: currentY,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
        head: [['Paso', 'Procedimiento Operativo']],
        body: stepsTable,
        columnStyles: {
          0: { cellWidth: 20, fontStyle: 'bold', fillColor: [248, 250, 252] },
          1: { cellWidth: 'auto' }
        },
        margin: { left: margin, right: margin }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    });

    doc.save(`Manual_Operativo_Plataforma_ISMA_${new Date().getFullYear()}.pdf`);
  };

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto p-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-600" />
            Manuales y Guías Operativas de la Plataforma
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Documentación técnica y operativa para cajeros, operadores de censo, fiscalización y contribuyentes.
          </p>
        </div>
        <button
          onClick={descargarManualPDF}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm self-start sm:self-auto"
        >
          <Download className="w-4 h-4" /> Descargar Manual Completo (PDF)
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* SIDEBAR DE MODULOS */}
        <div className="w-full lg:w-1/3 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar en manuales..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-700 outline-none focus:border-emerald-500 shadow-sm"
            />
          </div>

          <div className="space-y-2">
            {filteredManuales.map(m => (
              <div
                key={m.id}
                onClick={() => setSelectedId(m.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  selectedId === m.id
                    ? 'bg-emerald-50/80 border-emerald-300 shadow-sm'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-2xl mt-0.5">{m.icon}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                    {m.category}
                  </span>
                  <h3 className="font-bold text-slate-800 text-sm mt-1.5 truncate">{m.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{m.summary}</p>
                </div>
                <ChevronRight className={`w-4 h-4 mt-2 shrink-0 ${selectedId === m.id ? 'text-emerald-600' : 'text-slate-300'}`} />
              </div>
            ))}
          </div>
        </div>

        {/* DETALLE DEL MANUAL SELECCIONADO */}
        <div className="w-full lg:w-2/3">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="pb-4 border-b border-slate-100">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                {selectedManual.category}
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-2 flex items-center gap-2">
                <span>{selectedManual.icon}</span> {selectedManual.title}
              </h2>
              <p className="text-sm text-slate-600 mt-1">{selectedManual.summary}</p>
            </div>

            {/* PASO A PASO */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" /> Protocolo Operativo Paso a Paso
              </h3>
              <div className="space-y-2.5">
                {selectedManual.steps.map((st, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{st}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* RECOMENDACIONES Y CONTROLES */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-amber-900 uppercase flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-amber-700" /> Puntos Críticos y Recomendaciones de Seguridad
              </h4>
              <ul className="space-y-1.5 text-xs text-amber-800">
                {selectedManual.tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold">&bull;</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
