import { MapPin, Phone, Mail, FileText, Download } from 'lucide-react';
import MapWrapper from '@/components/MapWrapper';

async function getExchangeRates() {
  try {
    const [usdRes, eurRes] = await Promise.all([
      fetch('https://ve.dolarapi.com/v1/dolares/oficial', { next: { revalidate: 3600 } }),
      fetch('https://ve.dolarapi.com/v1/euros/oficial', { next: { revalidate: 3600 } })
    ]);
    
    const usd = await usdRes.json();
    const eur = await eurRes.json();
    
    return {
      usd: usd.promedio,
      eur: eur.promedio,
      tcmmv: Math.max(usd.promedio, eur.promedio),
      fecha: new Date(eur.fechaActualizacion || usd.fechaActualizacion).toLocaleDateString('es-VE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    };
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    return { usd: 757.54, eur: 875.22, tcmmv: 875.22, fecha: 'N/A' };
  }
}

export default async function AdminHome() {
  const rates = await getExchangeRates();

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center gap-2 pb-4 border-b border-slate-200">
        <MapPin className="w-6 h-6 text-slate-700" />
        <h1 className="text-2xl font-semibold text-slate-800 uppercase tracking-wide">Inicio</h1>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Tasa de Cambio */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
            <span className="font-semibold text-slate-700">Tasa de Cambio BCV</span>
          </div>
          <div className="p-6">
            <div className="flex flex-wrap gap-4 text-sm text-slate-700 items-center justify-center">
              <span className="flex items-center gap-1">
                TCMMV (Moneda de Mayor Valor): 
                <strong className="text-blue-700 text-lg font-bold">Bs. {rates.tcmmv.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span>Euro: <strong className="text-green-600 font-semibold">Bs. {rates.eur.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong></span>
              <span className="text-slate-300">|</span>
              <span>Dólar: <strong className="text-slate-900 font-semibold">Bs. {rates.usd.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong></span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500 capitalize">Fecha Valor: {rates.fecha}</span>
            </div>
          </div>
        </div>

        {/* Cuentas Bancarias */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-700">Cuentas Bancarias</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <span className="font-semibold w-24">Banco:</span>
              <span>BANESCO (0134)</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <span className="font-semibold w-24">Cta Corriente:</span>
              <span>01340415144151031715</span>
              <button className="text-red-500 hover:text-red-700 ml-2" title="Copiar">
                <FileText className="w-4 h-4" />
              </button>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 text-sm text-slate-600">
              Todos los pagos a nombre de: <strong className="text-slate-800">GLOBAL GREEN TUCACAS R.I.F.: J-123456789</strong>
            </div>
          </div>
        </div>

        {/* Contacto y Ubicación */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-700">Contacto y Ubicación</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <div className="font-semibold text-sm text-slate-700 mb-1">Oficinas de Atención al Usuario:</div>
                  <div className="text-sm text-slate-600">Avenida Libertador, frente a la Plaza Bolívar. Tucacas Edo. Falcón Zona Postal 2055</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <div className="font-semibold text-sm text-slate-700 mb-1">Teléfonos:</div>
                  <div className="text-sm text-slate-600">0424-9258559 / 0412-8495941</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <div className="font-semibold text-sm text-slate-700 mb-1">Correo Electrónico:</div>
                  <a href="mailto:info@globalgreentucacas.com" className="text-sm text-blue-600 hover:underline">info@globalgreentucacas.com</a>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 overflow-hidden" style={{ height: '300px' }}>
              <MapWrapper 
                position={{ lat: 10.795, lng: -68.318 }} 
                readOnly={true} 
              />
            </div>
          </div>
        </div>

        {/* Descarga */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-700">Descarga de Documentos Legales</h2>
          </div>
          <div className="p-6">
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                <div>
                  Ordenanza Sobre la Gestión y Prestación del Servicio de Manejo integral de Residuos y Desechos Sólidos del Municipio.
                  <a href="https://aseodesilva.sirid.net/ordenanza.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1 inline-flex items-center gap-1">
                    Clic aquí para Descargar
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                <div>
                  Gaceta Municipal 19. Exoneración del 100% en multas, recargos e intereses correspondientes a los años 2024 y 2025.
                  <a href="https://aseodesilva.sirid.net/gaceta_municipal.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1 inline-flex items-center gap-1">
                    Clic aquí para Descargar
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                <div>
                  Gaceta Municipal 23. Plan de Saneamiento y Regularización de Deudas para Conjuntos Residenciales (50% desc. capital).
                  <a href="https://aseodesilva.sirid.net/gaceta23.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1 inline-flex items-center gap-1">
                    Clic aquí para Descargar
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                <div>
                  Gaceta Municipal 31. Plan de Saneamiento y Regularización de Deudas para Comercios e Industrias.
                  <a href="https://aseodesilva.sirid.net/gaceta31.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1 inline-flex items-center gap-1">
                    Clic aquí para Descargar
                  </a>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
