'use client';
import { useState } from 'react';
import { CreditCard, FileText, Upload, Send, Building } from 'lucide-react';

export default function DondePagarPage() {
  const [formData, setFormData] = useState({
    bancoOrigen: '',
    referencia: '',
    monto: '',
    fecha: '',
    comprobante: null as File | null
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const bancos = [
    'BANESCO', 'BANCO DE VENEZUELA', 'MERCANTIL', 'PROVINCIAL', 
    'BANCAMIGA', 'BANCO NACIONAL DE CRÉDITO (BNC)', 'BANPLUS', 'BANCO DEL TESORO'
  ];

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      // Si no es imagen (ej. PDF), devolver el archivo original
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }
      
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1000;
          const MAX_HEIGHT = 1000;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Comprimir a JPEG con calidad reducida
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          }, 'image/jpeg', 0.6); // 60% de calidad
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simular envío a Supabase
    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccess(true);
      setFormData({
        bancoOrigen: '',
        referencia: '',
        monto: '',
        fecha: '',
        comprobante: null
      });
      setTimeout(() => setShowSuccess(false), 4000);
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lado izquierdo: Información del Banco */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden h-full">
            <div className="bg-indigo-50 px-4 py-4 border-b border-indigo-100 flex items-center justify-center">
              <h2 className="font-semibold text-indigo-900 uppercase flex items-center gap-2 text-sm">
                <Building className="w-4 h-4 text-indigo-600" />
                Cuentas Recaudadoras
              </h2>
            </div>
            
            <div className="p-6 space-y-5 text-sm">
              <div className="space-y-1">
                <span className="text-slate-500 font-medium block text-xs">Banco:</span>
                <span className="text-slate-800 font-bold block">BANESCO (0134)</span>
              </div>
              
              <div className="space-y-1">
                <span className="text-slate-500 font-medium block text-xs">Cta Corriente Nro.:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-slate-100 px-2 py-1.5 rounded text-slate-800 font-semibold border border-slate-200 w-full text-center">
                    01340415144151031715
                  </span>
                  <button className="text-blue-500 hover:text-blue-700 transition-colors p-2 bg-blue-50 hover:bg-blue-100 rounded border border-blue-100" title="Copiar número">
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="pt-5 mt-2 border-t border-slate-200">
                <span className="text-slate-500 font-medium block text-xs mb-1">A nombre de:</span>
                <strong className="text-slate-800 block text-lg">GLOBAL GREEN TUCACAS</strong> 
                <span className="text-slate-600 block mt-1 font-medium">R.I.F.: J-123456789</span>
              </div>
            </div>
          </div>
        </div>

        {/* Lado derecho: Formulario de Reporte */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-700 uppercase flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Reportar Pago / Transferencia
              </h2>
              <p className="text-xs text-slate-500 mt-1">Llene los datos de su transferencia para que sea validada por el departamento de cobranzas.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {showSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded mb-4 text-sm flex items-center gap-2 animate-in fade-in">
                  <span className="font-bold">¡Pago reportado!</span> Su comprobante está en proceso de validación.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Banco Origen <span className="text-red-500">*</span></label>
                  <select 
                    value={formData.bancoOrigen}
                    onChange={(e) => setFormData({...formData, bancoOrigen: e.target.value})}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500 bg-white"
                    required
                  >
                    <option value="">-- Seleccione el banco --</option>
                    {bancos.map(b => <option key={b} value={b}>{b}</option>)}
                    <option value="OTRO">OTRO BANCO</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nro. de Referencia <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    placeholder="Ej. 12345678"
                    value={formData.referencia}
                    onChange={(e) => setFormData({...formData, referencia: e.target.value.replace(/\D/g, '')})}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Monto Transferido (Bs) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">Bs.</span>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="Ej. 1500.50"
                      value={formData.monto}
                      onChange={(e) => setFormData({...formData, monto: e.target.value})}
                      className="w-full border border-slate-300 rounded pl-9 pr-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500 font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Fecha de la Transferencia <span className="text-red-500">*</span></label>
                  <input 
                    type="date" 
                    value={formData.fecha}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Comprobante de Pago (Imagen o PDF) <span className="text-red-500">*</span></label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
                  <input 
                    type="file" 
                    accept="image/*,.pdf"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={async (e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        try {
                          const compressedFile = await compressImage(file);
                          setFormData({...formData, comprobante: compressedFile});
                        } catch (err) {
                          console.error("Error al comprimir la imagen", err);
                          setFormData({...formData, comprobante: file});
                        }
                      }
                    }}
                    required={!formData.comprobante}
                  />
                  <Upload className={`w-8 h-8 mb-2 ${formData.comprobante ? 'text-emerald-500' : 'text-slate-400'}`} />
                  {formData.comprobante ? (
                    <>
                      <span className="text-sm font-semibold text-emerald-600 truncate max-w-full px-4">{formData.comprobante.name}</span>
                      <span className="text-xs text-slate-500 mt-1">Haz clic para cambiar el archivo</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-slate-700">Haz clic aquí o arrastra tu archivo</span>
                      <span className="text-xs text-slate-500 mt-1">Formatos soportados: JPG, PNG, PDF (Max. 5MB)</span>
                    </>
                  )}
                </div>
              </div>

              <div className="pt-5 border-t border-slate-200 flex justify-end">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-emerald-600 text-white px-8 py-2.5 rounded text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-70 shadow-sm"
                >
                  {isSubmitting ? (
                    'Enviando comprobante...'
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Reportar Pago
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
