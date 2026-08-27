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
            Sistema Integrado de AdministraciÃ³n PÃºblica Municipal. Seleccione su mÃ³dulo para acceder.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-6">
            {/* Tarjeta Contribuyente */}
            <Link href="/portal" className="group bg-white/10 hover:bg-white/20 border border-white/20 p-8 rounded-xl backdrop-blur-sm transition-all duration-300 flex flex-col items-center hover:scale-105">
              <div className="bg-green-500/20 p-4 rounded-full mb-4 group-hover:bg-green-500/40 transition-colors">
                <Users className="w-10 h-10 text-green-400" />
                {/* Administracion Publica */}
              <Link href="/admin/administracion" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-500 transition-all flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <LayoutDashboard className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Administración Pública</h3>
                <p className="text-slate-500 text-sm">
                  Módulo de ERP interno: RRHH, Nómina, Presupuesto, Compras, Almacén y Licitaciones.
                </p>
              </Link>
            </div>
              <h2 className="text-xl font-bold text-white mb-2">Soy Contribuyente</h2>
              <p className="text-xs text-slate-300 mb-6 text-center">
                Paga tus servicios, tramita solvencias y reporta incidencias de manera rÃ¡pida y segura.
              </p>
              <div className="mt-auto flex items-center gap-2 text-green-400 font-semibold group-hover:gap-3 transition-all text-sm">
                Ingresar al Portal <ArrowRight className="w-4 h-4" />
                {/* Administracion Publica */}
              <Link href="/admin/administracion" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-500 transition-all flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <LayoutDashboard className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Administración Pública</h3>
                <p className="text-slate-500 text-sm">
                  Módulo de ERP interno: RRHH, Nómina, Presupuesto, Compras, Almacén y Licitaciones.
                </p>
              </Link>
            </div>
            </Link>

            {/* Tarjeta Funcionario */}
            <Link href="/admin" className="group bg-white/10 hover:bg-white/20 border border-white/20 p-8 rounded-xl backdrop-blur-sm transition-all duration-300 flex flex-col items-center hover:scale-105">
              <div className="bg-cyan-500/20 p-4 rounded-full mb-4 group-hover:bg-cyan-500/40 transition-colors">
                <Building2 className="w-10 h-10 text-cyan-400" />
                {/* Administracion Publica */}
              <Link href="/admin/administracion" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-500 transition-all flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <LayoutDashboard className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Administración Pública</h3>
                <p className="text-slate-500 text-sm">
                  Módulo de ERP interno: RRHH, Nómina, Presupuesto, Compras, Almacén y Licitaciones.
                </p>
              </Link>
            </div>
              <h2 className="text-xl font-bold text-white mb-2">Soy Funcionario</h2>
              <p className="text-xs text-slate-300 mb-6 text-center">
                Acceso al sistema administrativo para gestiÃ³n de recaudaciÃ³n, auditorÃ­a y reportes de aseo.
              </p>
              <div className="mt-auto flex items-center gap-2 text-cyan-400 font-semibold group-hover:gap-3 transition-all text-sm">
                Acceder al Sistema <ArrowRight className="w-4 h-4" />
                {/* Administracion Publica */}
              <Link href="/admin/administracion" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-500 transition-all flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <LayoutDashboard className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Administración Pública</h3>
                <p className="text-slate-500 text-sm">
                  Módulo de ERP interno: RRHH, Nómina, Presupuesto, Compras, Almacén y Licitaciones.
                </p>
              </Link>
            </div>
            </Link>

            {/* Tarjeta Operador MÃ³vil */}
            <Link href="/operador/login" className="group bg-white/10 hover:bg-white/20 border border-white/20 p-8 rounded-xl backdrop-blur-sm transition-all duration-300 flex flex-col items-center hover:scale-105">
              <div className="bg-orange-500/20 p-4 rounded-full mb-4 group-hover:bg-orange-500/40 transition-colors">
                <Users className="w-10 h-10 text-orange-400" />
                {/* Administracion Publica */}
              <Link href="/admin/administracion" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-500 transition-all flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <LayoutDashboard className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Administración Pública</h3>
                <p className="text-slate-500 text-sm">
                  Módulo de ERP interno: RRHH, Nómina, Presupuesto, Compras, Almacén y Licitaciones.
                </p>
              </Link>
            </div>
              <h2 className="text-xl font-bold text-white mb-2 text-center">Operador de Censo</h2>
              <p className="text-xs text-slate-300 mb-6 text-center">
                MÃ³dulo mÃ³vil exclusivo para trabajadores en jornada de empadronamiento de calle.
              </p>
              <div className="mt-auto flex items-center gap-2 text-orange-400 font-semibold group-hover:gap-3 transition-all text-sm">
                Ingresar MÃ³vil <ArrowRight className="w-4 h-4" />
                {/* Administracion Publica */}
              <Link href="/admin/administracion" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-500 transition-all flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <LayoutDashboard className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Administración Pública</h3>
                <p className="text-slate-500 text-sm">
                  Módulo de ERP interno: RRHH, Nómina, Presupuesto, Compras, Almacén y Licitaciones.
                </p>
              </Link>
            </div>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Tarjeta RecaudaciÃ³n de Impuestos */}
            <Link href="/admin/recaudacion" className="group bg-white/10 hover:bg-white/20 border border-yellow-500/30 p-8 rounded-xl backdrop-blur-sm transition-all duration-300 flex flex-col items-center hover:scale-105 shadow-[0_0_15px_rgba(234,179,8,0.15)]">
              <div className="bg-yellow-500/20 p-4 rounded-full mb-4 group-hover:bg-yellow-500/40 transition-colors">
                <Building2 className="w-12 h-12 text-yellow-400" />
                {/* Administracion Publica */}
              <Link href="/admin/administracion" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-500 transition-all flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <LayoutDashboard className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Administración Pública</h3>
                <p className="text-slate-500 text-sm">
                  Módulo de ERP interno: RRHH, Nómina, Presupuesto, Compras, Almacén y Licitaciones.
                </p>
              </Link>
            </div>
              <h2 className="text-2xl font-black text-yellow-400 mb-3 text-center uppercase tracking-wide">RecaudaciÃ³n de Impuestos</h2>
              <ul className="text-xs text-slate-300 mb-6 text-left space-y-1 w-full max-w-xs list-disc pl-4">
                <li>Actividades EconÃ³micas y Declaraciones</li>
                <li>Catastro y Propiedad</li>
                <li>VehÃ­culos (Registro y Patente)</li>
                <li>Ordenamiento Territorial y Vialidad</li>
                <li>Terminal, Servicios PÃºblicos y Ambiente</li>
                <li>PolicÃ­a Municipal (Multas)</li>
              </ul>
              <div className="mt-auto flex items-center gap-2 text-yellow-400 font-bold group-hover:gap-3 transition-all text-sm">
                Ingresar a RecaudaciÃ³n <ArrowRight className="w-4 h-4" />
                {/* Administracion Publica */}
              <Link href="/admin/administracion" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-500 transition-all flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <LayoutDashboard className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Administración Pública</h3>
                <p className="text-slate-500 text-sm">
                  Módulo de ERP interno: RRHH, Nómina, Presupuesto, Compras, Almacén y Licitaciones.
                </p>
              </Link>
            </div>
            </Link>

            {/* Tarjeta AdministraciÃ³n PÃºblica */}
            <Link href="/admin/erp" className="group bg-white/10 hover:bg-white/20 border border-blue-500/30 p-8 rounded-xl backdrop-blur-sm transition-all duration-300 flex flex-col items-center hover:scale-105 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <div className="bg-blue-500/20 p-4 rounded-full mb-4 group-hover:bg-blue-500/40 transition-colors">
                <Building2 className="w-12 h-12 text-blue-400" />
                {/* Administracion Publica */}
              <Link href="/admin/administracion" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-500 transition-all flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <LayoutDashboard className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Administración Pública</h3>
                <p className="text-slate-500 text-sm">
                  Módulo de ERP interno: RRHH, Nómina, Presupuesto, Compras, Almacén y Licitaciones.
                </p>
              </Link>
            </div>
              <h2 className="text-2xl font-black text-blue-400 mb-3 text-center uppercase tracking-wide">AdministraciÃ³n PÃºblica</h2>
              <ul className="text-xs text-slate-300 mb-6 text-left space-y-1 w-full max-w-xs list-disc pl-4">
                <li>Ingresos y Egresos Presupuestarios</li>
                <li>FormulaciÃ³n y Control de EjecuciÃ³n</li>
                <li>ProgramaciÃ³n y Pagos</li>
                <li>Plan de Contrataciones y Compras</li>
                <li>Bienes Nacionales e Inventario</li>
                <li>NÃ³mina y Control de Personal (RRHH)</li>
              </ul>
              <div className="mt-auto flex items-center gap-2 text-blue-400 font-bold group-hover:gap-3 transition-all text-sm">
                Ingresar a AdministraciÃ³n <ArrowRight className="w-4 h-4" />
                {/* Administracion Publica */}
              <Link href="/admin/administracion" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-500 transition-all flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <LayoutDashboard className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Administración Pública</h3>
                <p className="text-slate-500 text-sm">
                  Módulo de ERP interno: RRHH, Nómina, Presupuesto, Compras, Almacén y Licitaciones.
                </p>
              </Link>
            </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

