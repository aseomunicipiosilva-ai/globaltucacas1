'use client';
import { Home, Search, FileText, UserPlus, Users, FileSpreadsheet, History, Award, Clock, Building2, AlertTriangle, Handshake, LayoutDashboard, Mail, User, PieChart, Truck, Inbox, Calculator, Briefcase, Landmark, BookOpen, Car, Map, Bus, TreePine, ShieldAlert } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Sidebar() {
  const pathname = usePathname();
  const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/audit');
  
  if (!isAdminPath) {
    return null;
  }

  const isRecaudacion = pathname.startsWith('/admin/recaudacion');

  const menuAseo = [
    { icon: Home, name: 'Inicio Aseo', href: '/admin' },
    { icon: PieChart, name: 'Administrativo', href: '/admin/administrativo' },
    { icon: FileText, name: 'Tarifas / Ordenanza', href: '/admin/tarifas' },
    { icon: User, name: 'Contribuyentes', href: '/admin/contribuyentes' },
    { icon: Users, name: 'Condominios COB', href: '/admin/condominios-cob' },
    { icon: FileText, name: 'Pre-registros WEB', href: '/admin/pre-registros' },
    { icon: FileText, name: 'Censo de Contribuyentes', href: '/admin/censo' },
    { icon: Calculator, name: 'Cálculo y Proyección', href: '/admin/calculo' },
    { icon: Briefcase, name: 'Caja / Pagos', href: '/admin/caja' },
    { icon: FileSpreadsheet, name: 'Facturación / Edo Cuenta', href: '/admin/estado-cuenta' },
    { icon: PieChart, name: 'Reportes Generales', href: '/admin/reportes' },
    { icon: Clock, name: 'Cuentas Por Facturar', href: '/admin/por-facturar' },
    { icon: Handshake, name: 'Convenios de Pago', href: '/admin/convenios-pago' },
    { icon: Award, name: 'Certificados Emitidos', href: '/admin/certificados' },
    { icon: History, name: 'Historial Documentos', href: '/admin/historial-documentos' },
    { icon: Inbox, name: 'Buzón de Solicitudes', href: '/admin/buzon' },
    { icon: AlertTriangle, name: 'Reclamos / Atención', href: '/admin/reclamos' },
    { icon: AlertTriangle, name: 'Denuncias Ciudadanas', href: '/admin/denuncias' },
    { icon: Truck, name: 'Rutas Camiones', href: '/admin/rutas' },
    { icon: Mail, name: 'Correos Informativos', href: '/admin/correos' },
    { icon: UserPlus, name: 'Trabajadores Aseo', href: '/admin/trabajadores' }
  ];

  const menuRecaudacion = [
    { icon: Landmark, name: 'Dashboard Hacienda', href: '/admin/recaudacion' },
    { icon: Briefcase, name: 'Actividades Económicas', href: '/admin/recaudacion/actividades-economicas' },
    { icon: Building2, name: 'Catastro y Propiedad', href: '/admin/recaudacion/catastro' },
    { icon: Car, name: 'Vehículos y Patentes', href: '/admin/recaudacion/vehiculos' },
    { icon: Map, name: 'Ordenamiento Territorial', href: '/admin/recaudacion/ordenamiento' },
    { icon: Truck, name: 'Vialidad y Tránsito', href: '/admin/recaudacion/vialidad' },
    { icon: Bus, name: 'Terminal de Pasajeros', href: '/admin/recaudacion/terminal' },
    { icon: Users, name: 'Servicios Públicos', href: '/admin/recaudacion/servicios' },
    { icon: TreePine, name: 'Ambiente', href: '/admin/recaudacion/ambiente' },
    { icon: ShieldAlert, name: 'Policía Municipal', href: '/admin/recaudacion/policia' },
    { icon: Handshake, name: 'Convenios y Exoneraciones', href: '/admin/recaudacion/convenios' },
    { icon: Search, name: 'Fiscalización / Auditoría', href: '/admin/recaudacion/fiscalizacion' },
    { icon: FileSpreadsheet, name: 'Pasarela de Pagos', href: '/admin/recaudacion/pagos' }
  ];

  const activeMenu = isRecaudacion ? menuRecaudacion : menuAseo;

  return (
    <aside className="w-64 bg-[#1e293b] h-screen text-slate-300 flex flex-col fixed left-0 top-0 z-50">
      <div className="h-16 flex items-center justify-center border-b border-slate-700 bg-[#0f172a]">
        <h1 className="text-xl font-bold text-green-500 tracking-wider">
          <span className="text-white">GLOBAL</span> GREEN
        </h1>
      </div>
      <div className="p-4 bg-[#0f172a] border-b border-slate-700 text-sm text-yellow-500 text-center uppercase tracking-wider font-semibold">
        {isRecaudacion ? 'Hacienda Municipal' : 'Aseo Urbano'}
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1">
          {activeMenu.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2 hover:bg-slate-700 hover:text-white transition-colors ${pathname === item.href ? 'bg-slate-700 text-white border-l-4 border-green-500' : ''}`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
        
        {!isRecaudacion && (
          <>
            <div className="mt-6 px-4">
              <h3 className="text-xs uppercase text-slate-500 font-semibold mb-2">Administración</h3>
              <Link href="/admin/correos" className="flex items-center gap-3 py-2 text-sm text-slate-300 hover:text-white transition-colors">
                <Mail className="w-4 h-4" />
                Envío de Correos
              </Link>
            </div>
            <div className="mt-4 px-4">
              <h3 className="text-xs uppercase text-slate-500 font-semibold mb-2">Sistema</h3>
              <Link href="/audit" className="flex items-center gap-3 py-2 text-sm text-slate-300 hover:text-white transition-colors">
                <LayoutDashboard className="w-4 h-4" />
                Auditoría
              </Link>
              <Link href="/admin/trabajadores" className="flex items-center gap-3 py-2 text-sm text-slate-300 hover:text-white transition-colors">
                <Users className="w-4 h-4" />
                Trabajadores
              </Link>
              <Link href="/admin/perfil" className="flex items-center gap-3 py-2 text-sm text-slate-300 hover:text-white transition-colors">
                <User className="w-4 h-4" />
                Mi Cuenta
              </Link>
            </div>
          </>
        )}
      </nav>
      
      {/* Botón Volver al inicio general */}
      <div className="p-4 bg-[#0f172a] border-t border-slate-700">
        <Link href="/" className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
          <Home className="w-4 h-4" /> Volver al Inicio
        </Link>
      </div>
    </aside>
  );
}
