'use client';
import React, { useState } from 'react';
import { FileText, FileSpreadsheet, Download, Settings2, ShieldAlert, RefreshCw } from 'lucide-react';
import { useAppContext } from '@/store/AppContext';
import { supabase } from '@/lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function ReportesPage() {
  const { facturas } = useAppContext();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);

  // Helper to load image as base64
  const loadImage = async (src: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject('No 2d context');
        }
      };
      img.onerror = reject;
      img.src = src;
    });
  };

  const generarFacturasAnuladas = async () => {
    setIsGeneratingPdf(true);
    try {
      const anuladas = (facturas || []).filter((f: any) => f.estado === 'Anulado' || f.estado === 'Reversado');
      
      const doc = new jsPDF('landscape');
      
      // Load logos
      let logoAlcaldia = '';
      let logoIsma = '';
      try {
        logoAlcaldia = await loadImage('/logo_alcaldia.png');
        logoIsma = await loadImage('/logo_isma.png');
      } catch(e) {
        console.warn('Could not load logos', e);
      }
      
      if (logoAlcaldia) doc.addImage(logoAlcaldia, 'PNG', 14, 10, 30, 30);
      if (logoIsma) doc.addImage(logoIsma, 'PNG', 245, 10, 40, 30);

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("FACTURAS ANULADAS Y REVERSADAS", 140, 25, { align: 'center' });
      
      const tableData = anuladas.map((f: any) => [
        f.identidad || '---',
        f.contribuyente || '---',
        f.referencia || '---',
        f.emision || '---',
        f.estado || '---',
        f.nota || 'Sin comentarios'
      ]);

      autoTable(doc, {
        startY: 45,
        headStyles: { fillColor: [30, 41, 59] },
        head: [['Código/RIF', 'Nombre / Razón Social', 'Nro. Factura', 'Fecha Emisión', 'Estatus', 'Comentarios']],
        body: tableData,
        theme: 'striped'
      });

      doc.save(`Facturas_Anuladas_${new Date().getTime()}.pdf`);
    } catch (error: any) {
      alert("Error al generar el PDF: " + error.message);
      console.error(error);
    }
    setIsGeneratingPdf(false);
  };

  const generarConciliacionBancaria = async () => {
    setIsGeneratingExcel(true);
    try {
      // Fetch pagos_reportados
      const { data: pagos, error } = await supabase
        .from('pagos_reportados')
        .select('*')
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      const excelData = (pagos || []).map((p: any) => {
        let detalles: any = {};
        try { detalles = JSON.parse(p.detalles); } catch(e){}
        
        return {
          "FECHA": p.created_at ? new Date(p.created_at).toLocaleDateString() : '---',
          "BANCO": p.banco,
          "REFERENCIA": p.referencia,
          "TIPO": "Transferencia",
          "MONTO BS": p.monto,
          "FECHA PAGO": p.created_at ? new Date(p.created_at).toLocaleDateString() : '---',
          "RECIBO NRO": detalles.recibos ? detalles.recibos.join(', ') : '---',
          "CÓDIGO/RIF": p.identidad,
          "NOMBRE": p.contribuyente || '---',
          "MONTO FACTURA": p.monto,
          "TASA BCV": detalles.tcmmv || 16, // example
          "IGTF": 0,
          "RET ISLR": 0,
          "RET IVA": 0,
          "TOTAL A DEPOSITAR": p.monto,
          "MONTO DEPOSITADO": p.monto
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Conciliación");
      
      XLSX.writeFile(workbook, `Conciliacion_Bancaria_${new Date().getTime()}.xlsx`);
    } catch (error) {
      alert("Error al generar Excel");
      console.error(error);
    }
    setIsGeneratingExcel(false);
  };

  const generarMontoRecaudado = async () => {
    setIsGeneratingExcel(true);
    try {
      const { data: pagos, error } = await supabase
        .from('pagos_reportados')
        .select('*')
        .eq('estado', 'Aprobado')
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      const excelData = (pagos || []).map((p: any) => {
        let detalles: any = {};
        try { detalles = JSON.parse(p.detalles); } catch(e){}
        const tcmmvRate = detalles.tcmmv || 1;
        const montoBs = parseFloat(p.monto) || 0;
        const montoEuro = (montoBs / tcmmvRate).toFixed(2);
        
        return {
          "MES": p.created_at ? new Date(p.created_at).toLocaleDateString('es-ES', { month: 'long' }).toUpperCase() : '---',
          "FECHA PAGO": p.created_at ? new Date(p.created_at).toLocaleDateString() : '---',
          "EURO (TCMMV)": tcmmvRate,
          "RECAUDADO Bs.": montoBs,
          "CONCILIADO TRANSFERENCIA/DEPOSITO (Bs)": p.metodo !== 'Punto' ? montoBs : 0,
          "CONCILIADO TRANSFERENCIA/DEPOSITO (€)": p.metodo !== 'Punto' ? Number(montoEuro) : 0,
          "CONCILIADO PUNTO (Bs)": p.metodo === 'Punto' ? montoBs : 0,
          "CONCILIADO PUNTO (€)": p.metodo === 'Punto' ? Number(montoEuro) : 0,
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Monto Recaudado");
      
      XLSX.writeFile(workbook, `Monto_Recaudado_${new Date().getTime()}.xlsx`);
    } catch (error) {
      alert("Error al generar Excel");
      console.error(error);
    }
    setIsGeneratingExcel(false);
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto p-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-700" />
          <h1 className="text-lg font-semibold text-slate-800 uppercase tracking-wide">
            Módulo de Reportes
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Tarjeta Facturas Anuladas */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-red-50 rounded-lg">
              <ShieldAlert className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Facturas Anuladas</h3>
          <p className="text-slate-500 text-sm mb-6 flex-grow">
            Genera un reporte en PDF con todas las facturas anuladas o reversadas.
          </p>
          <button 
            onClick={generarFacturasAnuladas}
            disabled={isGeneratingPdf}
            className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {isGeneratingPdf ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Generar PDF
          </button>
        </div>

        {/* Tarjeta Conciliación Bancaria */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-emerald-50 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Conciliación Bancaria</h3>
          <p className="text-slate-500 text-sm mb-6 flex-grow">
            Exporta pagos reportados y conciliados cruzados con las facturas (Excel).
          </p>
          <button 
            onClick={generarConciliacionBancaria}
            disabled={isGeneratingExcel}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {isGeneratingExcel ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Descargar Excel
          </button>
        </div>

        {/* Tarjeta Monto Recaudado */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Settings2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Monto Recaudado €</h3>
          <p className="text-slate-500 text-sm mb-6 flex-grow">
            Exporta el consolidado de montos recaudados con conversiones a Euros basadas en TCMMV.
          </p>
          <button 
            onClick={generarMontoRecaudado}
            disabled={isGeneratingExcel}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {isGeneratingExcel ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Descargar Excel
          </button>
        </div>

      </div>
    </div>
  );
}
