'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Download, RefreshCw, Filter, Calendar, FileSpreadsheet, FileText, 
  Wrench, FlaskConical, ClipboardCheck, ShieldCheck, TreePine, Eye, CheckCircle2, Clock
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { logos } from '@/lib/logosBase64';
import { generarPlanillaEspecialPDF } from '@/lib/pdfPlanillaEspecial';

interface ServicioRecord {
  id: number;
  tipo: string;
  identidad: string;
  contribuyente: string;
  descripcion: string;
  monto: number;
  fecha: string;
  notas: string;
  estado: string;
  referencia: string;
  creado_por?: string;
  created_at: string;
  origen?: string;
}

export default function ServiciosEspecialesReportView({ onBack }: { onBack: () => void }) {
  const [servicios, setServicios] = useState<ServicioRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewTitulo, setPreviewTitulo] = useState<string>('');

  const cargarServicios = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('servicios_especiales')
        .select('*')
        .order('fecha', { ascending: false });
      if (data) setServicios(data as ServicioRecord[]);
    } catch (e) {
      console.error('Error al cargar servicios:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarServicios();
  }, []);

  const parseTasaFromNotes = (notas?: string): number => {
    if (!notas) return 0;
    const match = notas.match(/Tasa\s*BCV\s*:\s*([\d.]+)/i);
    return match ? parseFloat(match[1]) : 0;
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'extraordinario': return 'Servicio Extraordinario';
      case 'especial': return 'Servicio Especial';
      case 'visto_bueno': return 'Visto Bueno Ambiental';
      case 'inspeccion': return 'Inspección Técnica';
      case 'tala_poda': return 'Tala y Poda';
      default: return tipo?.toUpperCase() || 'SERVICIO';
    }
  };

  const filtered = useMemo(() => {
    return servicios.filter(s => {
      if (filtroTipo !== 'TODOS' && s.tipo !== filtroTipo) return false;
      if (filtroEstado !== 'TODOS' && s.estado !== filtroEstado) return false;
      
      const fecha = (s.fecha || s.created_at || '').slice(0, 10);
      if (fechaDesde && fecha < fechaDesde) return false;
      if (fechaHasta && fecha > fechaHasta) return false;

      return true;
    });
  }, [servicios, filtroTipo, filtroEstado, fechaDesde, fechaHasta]);

  const totalBs = useMemo(() => {
    return filtered.reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0);
  }, [filtered]);

  const totalAprobados = useMemo(() => {
    return filtered.filter(s => s.estado === 'Pagado' || s.estado === 'Aprobado').length;
  }, [filtered]);

  const totalPendientes = useMemo(() => {
    return filtered.filter(s => s.estado === 'Pendiente').length;
  }, [filtered]);

  // ==========================================
  // EXPORTAR A EXCEL PROFESIONAL CON LOGOS
  // ==========================================
  const exportarExcel = async () => {
    if (filtered.length === 0) {
      alert('No hay registros en el rango seleccionado.');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Servicios Especiales');

    const addLogo = (base64Str: string, col: number, row: number, width: number, height: number) => {
      try {
        if (!base64Str) return;
        const cleanBase64 = base64Str.includes(',') ? base64Str.split(',')[1] : base64Str;
        const imageId = workbook.addImage({
          base64: cleanBase64,
          extension: 'png',
        });
        worksheet.addImage(imageId, {
          tl: { col: col, row: row },
          ext: { width, height }
        });
      } catch (e) {
        console.warn('No se pudo agregar logo a excel', e);
      }
    };

    // Logos institucionales
    addLogo(logos.alcaldia, 0, 0, 75, 75);
    addLogo(logos.isma, 2, 0, 85, 75);
    addLogo(logos.global_rec, 4, 0, 80, 75);

    for (let i = 0; i < 5; i++) worksheet.addRow([]);

    // Título institucional
    const titleRow = worksheet.addRow(['INSTITUTO AUTÓNOMO MUNICIPAL DE GESTIÓN AMBIENTAL - MUNICIPIO SILVA (ISMA)']);
    titleRow.font = { size: 13, bold: true, color: { argb: 'FF0A4A2A' } };
    
    const subTitleRow = worksheet.addRow(['REPORTE CONSOLIDADO DE SERVICIOS ESPECIALES Y EXTRAORDINARIOS']);
    subTitleRow.font = { size: 11, bold: true, color: { argb: 'FF333333' } };

    const filterText = `Período: ${fechaDesde || 'Inicio'} hasta ${fechaHasta || 'Presente'} | Tipo: ${filtroTipo} | Estado: ${filtroEstado} | Emisión: ${new Date().toLocaleDateString('es-VE')}`;
    const metaRow = worksheet.addRow([filterText]);
    metaRow.font = { size: 9, italic: true, color: { argb: 'FF666666' } };

    worksheet.addRow([]);

    // Encabezados de tabla
    const headers = [
      'N°',
      'N° CONTROL / REF',
      'FECHA',
      'TIPO DE SERVICIO',
      'RIF / IDENTIDAD',
      'CONTRIBUYENTE / RAZÓN SOCIAL',
      'DESCRIPCIÓN OPERATIVA',
      'TASA BCV APLICADA',
      'ESTADO',
      'MONTO (Bs.)'
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0A4A2A' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Filas de datos
    filtered.forEach((s, idx) => {
      const tasa = parseTasaFromNotes(s.notas);
      const row = worksheet.addRow([
        idx + 1,
        s.referencia || `SRV-${s.id}`,
        s.fecha || (s.created_at ? s.created_at.slice(0, 10) : '—'),
        getTipoLabel(s.tipo),
        s.identidad || '—',
        s.contribuyente || '—',
        s.descripcion || '—',
        tasa > 0 ? `Bs. ${tasa.toFixed(2)}` : 'Oficial BCV',
        s.estado || 'Pendiente',
        Number(s.monto || 0)
      ]);

      row.alignment = { vertical: 'middle' };
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(2).alignment = { horizontal: 'center' };
      row.getCell(3).alignment = { horizontal: 'center' };
      row.getCell(8).alignment = { horizontal: 'center' };
      row.getCell(9).alignment = { horizontal: 'center' };
      row.getCell(10).alignment = { horizontal: 'right' };
      row.getCell(10).numFmt = '#,##0.00';

      // Colores de estado
      const estadoCell = row.getCell(9);
      if (s.estado === 'Pagado' || s.estado === 'Aprobado') {
        estadoCell.font = { color: { argb: 'FF15803D' }, bold: true };
      } else {
        estadoCell.font = { color: { argb: 'FFB45309' }, bold: true };
      }

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        };
      });
    });

    // Fila total
    worksheet.addRow([]);
    const totalRow = worksheet.addRow([
      '', '', '', '', '', '', '', 'TOTAL GENERAL:', '', totalBs
    ]);
    totalRow.font = { bold: true, size: 11 };
    totalRow.getCell(8).alignment = { horizontal: 'right' };
    totalRow.getCell(10).alignment = { horizontal: 'right' };
    totalRow.getCell(10).numFmt = '#,##0.00';
    totalRow.getCell(10).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0FDF4' }
    };
    totalRow.getCell(10).font = { bold: true, color: { argb: 'FF15803D' } };

    // Ancho de columnas
    worksheet.columns = [
      { width: 6 },
      { width: 22 },
      { width: 14 },
      { width: 25 },
      { width: 16 },
      { width: 34 },
      { width: 42 },
      { width: 18 },
      { width: 14 },
      { width: 20 },
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Reporte_Servicios_Especiales_${fechaDesde || 'inicio'}_al_${fechaHasta || 'corte'}.xlsx`);
  };

  // ==========================================
  // EXPORTAR A PDF INSTITUCIONAL CON LOGOS
  // ==========================================
  const exportarPDF = () => {
    if (filtered.length === 0) {
      alert('No hay registros en el rango seleccionado.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'letter'
    });

    const pageWidth = doc.internal.pageSize.width; // 279.4 mm
    const pageHeight = doc.internal.pageSize.height; // 215.9 mm
    const margin = 12;

    // Header institucional con logos
    let headerHeight = 26;
    try {
      if (logos.alcaldia) doc.addImage(logos.alcaldia, 'PNG', margin, 8, 22, 22);
      if (logos.isma) doc.addImage(logos.isma, 'PNG', margin + 26, 8, 26, 22);
      if (logos.global_rec) doc.addImage(logos.global_rec, 'PNG', pageWidth - margin - 28, 8, 26, 22);
    } catch (e) {
      console.warn('Error renderizando logos en PDF', e);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(10, 74, 42);
    doc.text('REPÚBLICA BOLIVARIANA DE VENEZUELA - ESTADO FALCÓN', pageWidth / 2, 13, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text('ALCALDÍA DEL MUNICIPIO SILVA - INSTITUTO AUTÓNOMO MUNICIPAL DE GESTIÓN AMBIENTAL (ISMA)', pageWidth / 2, 18, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('REPORTE CONSOLIDADO DE SERVICIOS ESPECIALES Y EXTRAORDINARIOS', pageWidth / 2, 24, { align: 'center' });

    // Barra de metadatos y filtros
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, 32, pageWidth - margin * 2, 7, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    const periodoStr = `PERÍODO: ${fechaDesde || 'DESDE EL INICIO'} HASTA ${fechaHasta || 'EL PRESENTE'}`;
    const filtroStr = `CATEGORÍA: ${filtroTipo}  |  ESTATUS: ${filtroEstado}  |  REGISTROS: ${filtered.length}`;
    doc.text(periodoStr, margin + 4, 36.5);
    doc.text(filtroStr, pageWidth - margin - 4, 36.5, { align: 'right' });

    const tableRows = filtered.map((s, idx) => {
      const tasa = parseTasaFromNotes(s.notas);
      return [
        idx + 1,
        s.referencia || `SRV-${s.id}`,
        s.fecha || (s.created_at ? s.created_at.slice(0, 10) : '—'),
        getTipoLabel(s.tipo),
        s.identidad || '—',
        s.contribuyente || '—',
        s.descripcion || '—',
        tasa > 0 ? `Bs. ${tasa.toFixed(2)}` : 'Oficial BCV',
        s.estado || 'Pendiente',
        `Bs. ${Number(s.monto || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ];
    });

    autoTable(doc, {
      startY: 41,
      head: [['#', 'REFERENCIA', 'FECHA', 'TIPO', 'RIF/CI', 'CONTRIBUYENTE', 'DESCRIPCIÓN', 'TASA BCV', 'ESTADO', 'MONTO (Bs.)']],
      body: tableRows,
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 1.8,
        textColor: [30, 41, 59]
      },
      headStyles: {
        fillColor: [10, 74, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 28 },
        4: { cellWidth: 20 },
        5: { cellWidth: 42 },
        6: { cellWidth: 'auto' },
        7: { cellWidth: 20, halign: 'center' },
        8: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
        9: { cellWidth: 26, halign: 'right', fontStyle: 'bold' }
      },
      foot: [
        [
          { content: `TOTAL GENERAL: ${filtered.length} SERVICIOS (Aprobados: ${totalAprobados} | Pendientes: ${totalPendientes})`, colSpan: 8, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: '', styles: { halign: 'center' } },
          { content: `Bs. ${totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 253, 244], textColor: [21, 128, 61] } }
        ]
      ],
      didDrawPage: (data) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(7);
        doc.setTextColor(140);
        doc.text(`Página ${data.pageNumber} de ${pageCount} — Generado por Sistema ISMA el ${new Date().toLocaleString('es-VE')}`, margin, pageHeight - 6);
      },
      margin: { left: margin, right: margin, bottom: 12 }
    });

    doc.save(`Reporte_Servicios_Especiales_${fechaDesde || 'inicio'}_al_${fechaHasta || 'corte'}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Barra superior */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-semibold cursor-pointer">
            ← Regresar
          </button>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-orange-600" />
            <h1 className="text-lg font-bold text-slate-800">Reporte de Servicios Especiales y Extraordinarios</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cargarServicios}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualizar
          </button>
          <button
            onClick={exportarExcel}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" /> Exportar a Excel
          </button>
          <button
            onClick={exportarPDF}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4" /> Exportar a PDF
          </button>
        </div>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <span className="text-slate-500 text-xs font-medium block">Total Servicios</span>
          <span className="text-2xl font-black text-slate-800 mt-1 block">{filtered.length}</span>
        </div>
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 shadow-sm">
          <span className="text-emerald-700 text-xs font-medium block">Pagados / Aprobados</span>
          <span className="text-2xl font-black text-emerald-800 mt-1 block">{totalAprobados}</span>
        </div>
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 shadow-sm">
          <span className="text-amber-700 text-xs font-medium block">Pendientes de Pago</span>
          <span className="text-2xl font-black text-amber-800 mt-1 block">{totalPendientes}</span>
        </div>
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 shadow-sm">
          <span className="text-blue-700 text-xs font-medium block">Monto Total Liquidado</span>
          <span className="text-xl font-black text-blue-900 mt-1 block">Bs. {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Filtros de Rango de Fecha y Categoría */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-700">Rango de Fecha:</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Desde:</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={e => setFechaDesde(e.target.value)}
            className="border border-slate-200 rounded px-2.5 py-1 text-xs outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Hasta:</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={e => setFechaHasta(e.target.value)}
            className="border border-slate-200 rounded px-2.5 py-1 text-xs outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-700">Categoría:</span>
          <select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
            className="border border-slate-200 rounded px-2 py-1 text-xs bg-white outline-none focus:border-blue-500"
          >
            <option value="TODOS">Todos los Servicios</option>
            <option value="extraordinario">Servicio Extraordinario</option>
            <option value="especial">Servicio Especial</option>
            <option value="visto_bueno">Visto Bueno Ambiental</option>
            <option value="inspeccion">Inspección Técnica</option>
            <option value="tala_poda">Tala y Poda</option>
          </select>

          <span className="text-xs font-bold text-slate-700 ml-2">Estado:</span>
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className="border border-slate-200 rounded px-2 py-1 text-xs bg-white outline-none focus:border-blue-500"
          >
            <option value="TODOS">Todos</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Pagado">Pagado</option>
          </select>

          {(fechaDesde || fechaHasta || filtroTipo !== 'TODOS' || filtroEstado !== 'TODOS') && (
            <button
              onClick={() => { setFechaDesde(''); setFechaHasta(''); setFiltroTipo('TODOS'); setFiltroEstado('TODOS'); }}
              className="text-xs text-blue-600 hover:text-blue-800 underline ml-2 cursor-pointer"
            >
              Limpiar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla de registros */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="px-3 py-3">#</th>
                <th className="px-3 py-3">Referencia</th>
                <th className="px-3 py-3">Fecha</th>
                <th className="px-3 py-3">Tipo</th>
                <th className="px-3 py-3">RIF / C.I.</th>
                <th className="px-3 py-3">Contribuyente</th>
                <th className="px-3 py-3">Descripción</th>
                <th className="px-3 py-3 text-center">Tasa BCV</th>
                <th className="px-3 py-3 text-center">Estado</th>
                <th className="px-3 py-3 text-right">Monto (Bs.)</th>
                <th className="px-3 py-3 text-center">Planilla</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">Cargando registros...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">No se encontraron servicios en este período.</td>
                </tr>
              ) : (
                filtered.map((s, idx) => {
                  const tasa = parseTasaFromNotes(s.notas);
                  return (
                    <tr key={s.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-2.5 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="px-3 py-2.5 font-bold text-slate-700 whitespace-nowrap">{s.referencia || `SRV-${s.id}`}</td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{s.fecha || (s.created_at ? s.created_at.slice(0, 10) : '—')}</td>
                      <td className="px-3 py-2.5">
                        <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-700 whitespace-nowrap">
                          {getTipoLabel(s.tipo)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-600 whitespace-nowrap">{s.identidad || '—'}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-800 max-w-[200px] truncate" title={s.contribuyente}>{s.contribuyente || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-600 max-w-[240px] truncate" title={s.descripcion}>{s.descripcion || '—'}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-slate-700 whitespace-nowrap">
                        {tasa > 0 ? (
                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Bs. {tasa.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">Oficial</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${s.estado === 'Pagado' || s.estado === 'Aprobado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {s.estado || 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-black text-slate-800 whitespace-nowrap">
                        Bs. {Number(s.monto || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            const tasaAplicada = tasa > 0 ? tasa : undefined;
                            const uri = (generarPlanillaEspecialPDF as any)({ ...s, tasaBcv: tasaAplicada }, { previewOnly: true });
                            if (uri) {
                              setPreviewPdfUrl(uri);
                              setPreviewTitulo(`Planilla ${s.referencia || s.id} - ${s.contribuyente}`);
                            }
                          }}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded border border-indigo-200 font-bold flex items-center gap-1 mx-auto cursor-pointer"
                          title="Ver Planilla Oficial con Tasa del Momento"
                        >
                          <Eye className="w-3.5 h-3.5" /> Ver
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-700">
                <tr>
                  <td colSpan={9} className="px-3 py-2.5 text-right font-black uppercase">
                    Total Liquidado ({filtered.length} servicios):
                  </td>
                  <td className="px-3 py-2.5 text-right font-black text-emerald-700 text-sm">
                    Bs. {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal Previsualización de Planilla */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden border border-slate-300">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800 text-white border-b border-slate-700">
              <h3 className="font-bold text-sm md:text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" /> {previewTitulo || 'Planilla Oficial'}
              </h3>
              <div className="flex items-center gap-2">
                <a 
                  href={previewPdfUrl} 
                  download="Planilla_Servicio.pdf" 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> Descargar PDF
                </a>
                <button 
                  onClick={() => setPreviewPdfUrl(null)} 
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors ml-2"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="flex-1 w-full bg-slate-100 p-2">
              <iframe 
                src={previewPdfUrl} 
                className="w-full h-full rounded border border-slate-300 shadow-inner bg-white" 
                title="Visor de Planilla Oficial"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
