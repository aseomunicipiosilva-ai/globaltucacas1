import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const loadImage = (url: string): Promise<string> => {
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
        reject(new Error('Canvas ctx null'));
      }
    };
    img.onerror = () => resolve('');
    img.src = url;
  });
};

export const generarSolvenciaPDF = async (
  contribuyente: any,
  inmuebleSpec: string,
  addCertificadoToContext?: (cert: any) => void
) => {
  try {
    const doc = new jsPDF();
    
    let logoIsma = '', logoAlcaldia = '';
    try {
      logoAlcaldia = await loadImage('/logo_alcaldia.png');
      logoIsma = await loadImage('/logo_isma.png');
    } catch(e) {}
    
    if (logoIsma) doc.addImage(logoIsma, 'PNG', 14, 10, 20, 20);
    if (logoAlcaldia) doc.addImage(logoAlcaldia, 'PNG', 176, 10, 20, 20);

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("CERTIFICADO DE SOLVENCIA MUNICIPAL", 105, 45, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    
    const fechaEmision = new Date();
    const fechaActualStr = fechaEmision.toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' });
    
    // Vencimiento (ej. 30 días después o fin de mes, por defecto 30 días para certificados)
    const fechaVencimiento = new Date(fechaEmision);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
    
    let texto = '';
    if (inmuebleSpec && inmuebleSpec !== 'general') {
      texto = `Se hace constar por medio de la presente que el contribuyente "${contribuyente.Contribuyente}" (RIF/CI: ${contribuyente.Identidad}), respecto a su inmueble identificado como "${inmuebleSpec}", se encuentra SOLVENTE con sus obligaciones referentes a la prestación del servicio de Aseo Urbano hasta la fecha de emisión de este documento.\n\nEste certificado se expide a petición de la parte interesada, a los ${fechaActualStr}.`;
    } else {
      texto = `Se hace constar por medio de la presente que el contribuyente "${contribuyente.Contribuyente}" (RIF/CI: ${contribuyente.Identidad}), se encuentra SOLVENTE con todas sus obligaciones referentes a la prestación del servicio de Aseo Urbano hasta la fecha de emisión de este documento.\n\nEste certificado se expide a petición de la parte interesada, a los ${fechaActualStr}.`;
    }
      
    const splitText = doc.splitTextToSize(texto, 170);
    doc.text(splitText, 20, 70);

    const codigoUnico = `SOL-${contribuyente.Identidad}-${Date.now().toString().slice(-6)}`;
    const qrData = `Certificado: ${codigoUnico} - Solvencia - ${contribuyente.Identidad} - Fecha: ${fechaActualStr}`;
    const qrDataUrl = await QRCode.toDataURL(qrData, { margin: 1, width: 100 });
    doc.addImage(qrDataUrl, 'PNG', 80, 130, 50, 50);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`CÓDIGO: ${codigoUnico}`, 105, 125, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Escanear para verificar validez", 105, 185, { align: 'center' });
    
    doc.line(40, 230, 90, 230);
    doc.text("Firma Autorizada", 65, 235, { align: 'center' });
    
    doc.line(120, 230, 170, 230);
    doc.text("Sello de la Institución", 145, 235, { align: 'center' });

    // Download locally
    doc.save(`Solvencia_${contribuyente.Identidad}_${new Date().getTime()}.pdf`);

    // Register in database
    const dbRecord = {
      codigo: codigoUnico,
      contribuyente: contribuyente.Contribuyente,
      identidad: contribuyente.Identidad,
      tipo: 'Solvencia Municipal',
      emision: fechaEmision.toISOString(),
      vencimiento: fechaVencimiento.toISOString(),
      estado: 'Vigente'
    };

    const { error } = await supabase.from('certificados').insert(dbRecord);
    if (error) {
      console.error("No se pudo registrar el certificado en la base de datos", error);
    } else {
      if (addCertificadoToContext) {
        addCertificadoToContext(dbRecord);
      }
    }

    return dbRecord;
  } catch (e: any) {
    alert("Error al generar PDF de Solvencia: " + e.message);
    throw e;
  }
};
