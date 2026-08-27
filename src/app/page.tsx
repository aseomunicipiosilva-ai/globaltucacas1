import { Building2, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {/* Hero Selection Gateway */}
      <div className="bg-[#0f172a] rounded-2xl overflow-hidden shadow-2xl relative w-full max-w-5xl">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="relative z-10 p-10 md:p-16 text-center">
          <div className="flex justify-center mb-6">
            <Building2 className="w-16 h-16 text-green-400" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white tracking-wider mb-4">
            <span className="text-green-500">GLOBAL</span> GREEN
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-12">
            Sistema Integrado de Administración Pública Municipal. Seleccione su módulo para acceder.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Tarjeta Contribuyente */}
            <Link href="/portal" className="group bg-white/10 hover:bg-white/20 border border-white/20 p-8 rounded-xl backdrop-blur-sm transition-all duration-300 flex flex-col items-center hover:scale-105">
              <div className="bg-green-500/20 p-4 rounded-full mb-4 group-hover:bg-green-500/40 transition-colors">
                <Users className="w-10 h-10 text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Portal del Contribuyente</h2>
              <p className="text-xs text-slate-300 mb-6 text-center">
                Pago de servicios, derecho de frente, solvencias e historial de propiedades.
              </p>
              <div className="mt-auto flex items-center gap-2 text-green-400 font-semibold group-hover:gap-3 transition-all text-sm">
                Ingresar al Portal <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

            {/* Tarjeta Hacienda Municipal */}
            <Link href="/admin" className="group bg-white/10 hover:bg-white/20 border border-white/20 p-8 rounded-xl backdrop-blur-sm transition-all duration-300 flex flex-col items-center hover:scale-105">
              <div className="bg-yellow-500/20 p-4 rounded-full mb-4 group-hover:bg-yellow-500/40 transition-colors">
                <Building2 className="w-10 h-10 text-yellow-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2 text-center">Recaudación y Hacienda</h2>
              <p className="text-xs text-slate-300 mb-6 text-center">
                Actividades económicas, patentes, catastro, vehículos, fiscalización y pagos.
              </p>
              <div className="mt-auto flex items-center gap-2 text-yellow-400 font-semibold group-hover:gap-3 transition-all text-sm">
                Acceder a Hacienda <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

            {/* Tarjeta ERP Presupuesto */}
            <Link href="/admin" className="group bg-white/10 hover:bg-white/20 border border-white/20 p-8 rounded-xl backdrop-blur-sm transition-all duration-300 flex flex-col items-center hover:scale-105">
              <div className="bg-blue-500/20 p-4 rounded-full mb-4 group-hover:bg-blue-500/40 transition-colors">
                <Building2 className="w-10 h-10 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2 text-center">Gestión Administrativa</h2>
              <p className="text-xs text-slate-300 mb-6 text-center">
                Presupuesto, RRHH, nómina, plan de compras, bienes nacionales y almacén.
              </p>
              <div className="mt-auto flex items-center gap-2 text-blue-400 font-semibold group-hover:gap-3 transition-all text-sm">
                Acceder a ERP <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

            {/* Tarjeta Servicios Públicos */}
            <Link href="/admin" className="group bg-white/10 hover:bg-white/20 border border-white/20 p-8 rounded-xl backdrop-blur-sm transition-all duration-300 flex flex-col items-center hover:scale-105">
              <div className="bg-purple-500/20 p-4 rounded-full mb-4 group-hover:bg-purple-500/40 transition-colors">
                <Building2 className="w-10 h-10 text-purple-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2 text-center">Servicios y Ordenamiento</h2>
              <p className="text-xs text-slate-300 mb-6 text-center">
                Ordenamiento territorial, vialidad, ambiente, terminal de pasajeros y policía.
              </p>
              <div className="mt-auto flex items-center gap-2 text-purple-400 font-semibold group-hover:gap-3 transition-all text-sm">
                Acceder a Servicios <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

            {/* Tarjeta Aseo Urbano (Original) */}
            <Link href="/admin" className="group bg-white/10 hover:bg-white/20 border border-white/20 p-8 rounded-xl backdrop-blur-sm transition-all duration-300 flex flex-col items-center hover:scale-105">
              <div className="bg-cyan-500/20 p-4 rounded-full mb-4 group-hover:bg-cyan-500/40 transition-colors">
                <Building2 className="w-10 h-10 text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2 text-center">Gestión de Aseo Urbano</h2>
              <p className="text-xs text-slate-300 mb-6 text-center">
                Recaudación de aseo, auditoría, reportes de servicios extraordinarios.
              </p>
              <div className="mt-auto flex items-center gap-2 text-cyan-400 font-semibold group-hover:gap-3 transition-all text-sm">
                Acceder a Sistema <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

            {/* Tarjeta Operador Móvil */}
            <Link href="/operador/login" className="group bg-white/10 hover:bg-white/20 border border-white/20 p-8 rounded-xl backdrop-blur-sm transition-all duration-300 flex flex-col items-center hover:scale-105">
              <div className="bg-orange-500/20 p-4 rounded-full mb-4 group-hover:bg-orange-500/40 transition-colors">
                <Users className="w-10 h-10 text-orange-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2 text-center">Operador de Censo</h2>
              <p className="text-xs text-slate-300 mb-6 text-center">
                Módulo móvil exclusivo para trabajadores en jornada de empadronamiento de calle.
              </p>
              <div className="mt-auto flex items-center gap-2 text-orange-400 font-semibold group-hover:gap-3 transition-all text-sm">
                Ingresar Móvil <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
