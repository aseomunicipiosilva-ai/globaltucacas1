'use client';
import Link from 'next/link';
import { Home, Search, FileText, UserPlus, Users, Home as HomeIcon, FileSpreadsheet, History, Award, Clock, Building2, AlertTriangle, Handshake, LayoutDashboard, Mail, User, PieChart } from 'lucide-react';

export default function Sidebar() {
  const menuItems = [
    { name: 'Inicio', icon: Home, href: '/admin' },
    { name: 'Administrativo', icon: PieChart, href: '/admin/administrativo' },
    { name: 'Búsqueda General', icon: Search, href: '/admin/inmuebles' },
    { name: 'Pre-Registro WEB', icon: FileText, href: '/admin/pre-registros' },
    { name: 'Nuevo Contribuyente', icon: UserPlus, href: '/admin/contribuyentes?action=new' },
    { name: 'Datos del Contribuyente', icon: Users, href: '/admin/contribuyentes' },
    { name: 'Listar Inmuebles', icon: HomeIcon, href: '/admin/inmuebles' },
    { name: 'Estado de Cuenta', icon: FileSpreadsheet, href: '/admin/estado-cuenta' },
    { name: 'Plan Saneamiento', icon: FileSpreadsheet, href: '/saneamiento' },
    { name: 'Historial Documentos', icon: History, href: '/admin/historial-documentos' },
    { name: 'Certificados', icon: Award, href: '/admin/certificados' },
    { name: 'Por Facturar', icon: Clock, href: '/admin/por-facturar' },
    { name: 'Condominios COB', icon: Building2, href: '/admin/condominios-cob' },
    { name: 'Reclamos', icon: AlertTriangle, href: '/admin/reclamos' },
    { name: 'Convenios de Pago', icon: Handshake, href: '/admin/convenios-pago' },
  ];

  return (
    <aside className="w-64 bg-[#1e293b] min-h-screen text-slate-300 flex flex-col fixed left-0 top-0">
      <div className="h-16 flex items-center justify-center border-b border-slate-700 bg-[#0f172a]">
        <h1 className="text-xl font-bold text-green-500 tracking-wider">
          <span className="text-white">GLOBAL</span> GREEN
        </h1>
      </div>
      <div className="p-4 bg-[#0f172a] border-b border-slate-700 text-sm text-yellow-500 text-center uppercase tracking-wider font-semibold">
        Tucacas
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className="flex items-center gap-3 px-4 py-2 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <item.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
        
        {/* Submenus like the reference */}
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
      </nav>
    </aside>
  );
}
