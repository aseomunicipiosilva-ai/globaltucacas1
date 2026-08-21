'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  MessageCircle, 
  Building2, 
  FileText, 
  CreditCard, 
  History, 
  Award,
  CalendarDays,
  MessageSquareWarning,
  Wrench,
  ShieldCheck,
  SearchCheck,
  User as UserIcon,
  LogOut
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface PortalSidebarProps {
  isOpen?: boolean;
  setIsOpen?: (val: boolean) => void;
}

export default function PortalSidebar({ isOpen = false, setIsOpen }: PortalSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<string>('Contribuyente');

  useEffect(() => {
    const portalUser = localStorage.getItem('portal_user');
    if (portalUser) {
      setUser(portalUser);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('portal_user');
    router.push('/portal');
  };

  const menuSections = [
    {
      title: 'CONTRIBUYENTE',
      items: [
        { name: 'Datos', icon: Home, href: '/portal/dashboard' },
        { name: 'Chat en línea', icon: MessageCircle, href: '/portal/chat' },
      ]
    },
    {
      title: 'INMUEBLES',
      items: [
        { name: 'Mis Inmuebles', icon: Building2, href: '/portal/inmuebles' },
      ]
    },
    {
      title: 'PAGOS',
      items: [
        { name: 'Estado de Cuenta', icon: FileText, href: '/portal/estado-cuenta' },
        { name: 'Pagar', icon: CreditCard, href: '/portal/pagos' },
        { name: 'Historial Documentos', icon: History, href: '/portal/documentos' },
        { name: 'Historial Certificados', icon: Award, href: '/portal/solvencia' },
      ]
    },
    {
      title: 'SERVICIOS Y SOLICITUDES',
      items: [
        { name: 'Horarios de Rutas', icon: CalendarDays, href: '/portal/rutas' },
        { name: 'Reclamos / Sugerencias', icon: MessageSquareWarning, href: '/portal/denuncias' },
        { name: 'Servicios Extraordinarios', icon: Wrench, href: '/portal/servicios-extraordinarios' },
        { name: 'Visto Bueno Ambiental', icon: ShieldCheck, href: '/portal/visto-bueno' },
        { name: 'Inspección', icon: SearchCheck, href: '/portal/inspeccion' },
      ]
    }
  ];

  return (
    <>
      {/* Overlay on Mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setIsOpen && setIsOpen(false)} 
        />
      )}
      
      {/* Sidebar container */}
      <div className={`w-64 bg-[#1e293b] h-screen text-slate-300 flex flex-col fixed left-0 top-0 overflow-y-auto z-50 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        {/* Profile Section */}
      <div className="flex flex-col items-center pt-8 pb-6 border-b border-slate-700/50">
        <div className="w-20 h-20 rounded-full bg-slate-700 mb-3 overflow-hidden border-2 border-slate-600 flex items-center justify-center">
          <UserIcon className="w-10 h-10 text-slate-400" />
        </div>
        <h3 className="text-white font-semibold text-sm uppercase tracking-wider px-4 text-center">
          {user}
        </h3>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        {menuSections.map((section, idx) => (
          <div key={idx} className="mb-6">
            <h4 className="px-6 text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
              {section.title}
            </h4>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen && setIsOpen(false)}
                      className={`flex items-center px-6 py-2.5 text-sm transition-colors relative ${
                        isActive 
                          ? 'text-white bg-slate-800' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-md"></div>
                      )}
                      <item.icon className={`w-4 h-4 mr-3 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer Logo and Logout */}
      <div className="p-6 border-t border-slate-700/50 space-y-4">
        <button 
          onClick={handleLogout}
          className="flex items-center text-sm text-slate-400 hover:text-white transition-colors w-full"
        >
          <LogOut className="w-4 h-4 mr-3" />
          Cerrar Sesión
        </button>
        <div className="flex items-center justify-center gap-2 opacity-80 pt-4">
          <Building2 className="w-6 h-6 text-green-500" />
          <span className="text-white font-bold tracking-wider text-sm">
            <span className="text-green-500">GLOBAL</span> GREEN
          </span>
        </div>
      </div>
    </div>
    </>
  );
}
