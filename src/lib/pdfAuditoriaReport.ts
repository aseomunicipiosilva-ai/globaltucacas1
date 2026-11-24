import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { logos } from '@/lib/logosBase64';

export const generarReporteAuditoriaPDF = (
  logs: any[],
  filtros: {
    nivelAlerta: string;
    usuario: string;
    fechaDesde: string;
    fechaHasta: string;
    omitirSesiones: boolean;
  }
) => {
  if (!logs || logs.length === 0) {
    alert('No hay registros de auditoría para generar el reporte con los filtros seleccionados.');
    return;
  }

  const doc = new jsPDF('landscape', 'pt', 'letter');
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Header
  try {
    if (logos.isma) {
      doc.addImage(logos.isma, 'JPEG', 40, 25, 110, 45);
    }
  } catch (e) {}

  // Título Institucional
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text('ALCALDÍA DEL MUNICIPIO SILVA - ISMA', 170, 42);

  doc.setFontSize(12);
  doc.setTextColor(99, 102, 241);
  doc.text('INFORME TÉCNICO DE AUDITORÍA Y CONTROL OPERATIVO', 170, 58);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const now = new Date();
  doc.text(
    `Fecha de Emisión: ${now.toLocaleDateString('es-VE')} - ${now.toLocaleTimeString('es-VE')}`,
    170,
    72
  );

  // Línea separadora
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(1);
  doc.line(40, 85, pageWidth - 40, 85);

  // Recuadro de Parámetros del Reporte
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(40, 95, pageWidth - 80, 45, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const filtroUsuarioStr = filtros.usuario || 'Todos los Operadores';
  const filtroNivelStr = filtros.nivelAlerta === 'TODAS' ? 'Todos los Niveles' : `Nivel ${filtros.nivelAlerta}`;
  const periodoStr =
    filtros.fechaDesde || filtros.fechaHasta
      ? `${filtros.fechaDesde || 'Inicio'} hasta ${filtros.fechaHasta || 'Hoy'}`
      : 'Histórico Completo';
  const sesionStr = filtros.omitirSesiones ? 'Sí (Excluidos logins/logouts)' : 'No (Incluye accesos)';

  doc.text(`Operador / Usuario: ${filtroUsuarioStr}`, 52, 112);
  doc.text(`Nivel de Severidad: ${filtroNivelStr}`, 52, 128);
  doc.text(`Período Consultado: ${periodoStr}`, 280, 112);
  doc.text(`Omitir Inicios de Sesión: ${sesionStr}`, 280, 128);
  doc.text(`Total Acciones Auditadas: ${logs.length}`, 520, 112);

  // Resumen estadístico por severidad
  const criticos = logs.filter(l => l.nivelAlerta === 'CRITICA').length;
  const altos = logs.filter(l => l.nivelAlerta === 'ALTA').length;
  const medios = logs.filter(l => l.nivelAlerta === 'MEDIA').length;
  const bajos = logs.filter(l => l.nivelAlerta === 'BAJA').length;

  doc.text(
    `Alertas: ${criticos} Críticas | ${altos} Altas | ${medios} Medias | ${bajos} Bajas`,
    520,
    128
  );

  // Mapear datos a la tabla
  const tableData = logs.map((l, index) => {
    const fecha = new Date(l.created_at);
    const fechaStr = `${fecha.toLocaleDateString('es-VE')} ${fecha.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}`;
    const det = typeof l.detalles === 'object' ? l.detalles : {};
    
    let resumenDetalle = '';
    if (det.texto) resumenDetalle = det.texto;
    else if (det.details) resumenDetalle = det.details;
    else if (det.identidad || det.contribuyente) {
      resumenDetalle = `Contribuyente: ${det.identidad || det.contribuyente}`;
      if (det.monto_bs) resumenDetalle += ` | Monto: Bs. ${Number(det.monto_bs).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;
      if (det.metodo) resumenDetalle += ` | Método: ${det.metodo}`;
      if (det.referencia_pago) resumenDetalle += ` | Ref: ${det.referencia_pago}`;
    } else {
      resumenDetalle = JSON.stringify(det).slice(0, 120);
    }

    return [
      String(index + 1),
      fechaStr,
      l.usuario || 'SISTEMA',
      l.nivelAlerta || 'BAJA',
      l.categoria || 'OPERACION',
      l.accion || 'Acción del sistema',
      resumenDetalle
    ];
  });

  autoTable(doc, {
    startY: 150,
    head: [['#', 'FECHA / HORA', 'OPERADOR', 'SEVERIDAD', 'CATEGORÍA', 'ACCIÓN EJECUTADA', 'DESCRIPCIÓN Y DETALLES TÉCNICOS']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 3.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.5
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8
    },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center' },
      1: { cellWidth: 80, halign: 'center' },
      2: { cellWidth: 70, fontStyle: 'bold' },
      3: { cellWidth: 65, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 65, halign: 'center' },
      5: { cellWidth: 120, fontStyle: 'bold' },
      6: { cellWidth: 'auto' }
    },
    didParseCell: (data) => {
      // Colorear celda de severidad
      if (data.section === 'body' && data.column.index === 3) {
        const val = String(data.cell.raw);
        if (val === 'CRITICA') {
          data.cell.styles.fillColor = [254, 226, 226];
          data.cell.styles.textColor = [185, 28, 28];
        } else if (val === 'ALTA') {
          data.cell.styles.fillColor = [255, 237, 213];
          data.cell.styles.textColor = [194, 65, 12];
        } else if (val === 'MEDIA') {
          data.cell.styles.fillColor = [254, 249, 195];
          data.cell.styles.textColor = [161, 98, 7];
        } else {
          data.cell.styles.fillColor = [241, 245, 249];
          data.cell.styles.textColor = [71, 85, 105];
        }
      }
    },
    didDrawPage: (data) => {
      // Pie de página institucional
      const str = `Página ${data.pageNumber} de ${doc.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'Documento Oficial de Auditoría y Fiscalización - Sistema de Gestión Tributaria Aseo Silva',
        40,
        pageHeight - 20
      );
      doc.text(str, pageWidth - 40 - doc.getTextWidth(str), pageHeight - 20);
    }
  });

  const timeStamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  doc.save(`Informe_Auditoria_${filtros.usuario || 'General'}_${timeStamp}.pdf`);
};
