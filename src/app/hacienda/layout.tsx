'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Building2, 
  Calculator, 
  CreditCard, 
  FileText, 
  FileSpreadsheet, 
  Users, 
  Mail, 
  BarChart3, 
  LogOut, 
  Home, 
  ShieldCheck, 
  CheckCircle2, 
  Briefcase 
} from 'lucide-react';

interface HaciendaLayoutProps {
  children: React.ReactNode;
}

export default function HaciendaLayout({ children }: HaciendaLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Omitir sidebar y header si estamos en la pantalla de login
  if (pathname === '/hacienda/login') {
    return <>{children}</>;
  }

  const handleLogout = () => {
    sessionStorage.removeItem('hacienda_auth');
    router.push('/hacienda/login');
  };

  const navItems = [
    { name: 'Inicio Hacienda', href: '/hacienda', icon: Home },
    { name: 'Caja de Hacienda', href: '/hacienda/caja', icon: CreditCard, highlight: true },
    { name: 'Censo Comercial / Ind.', href: '/hacienda/censo', icon: Users },
    { name: 'Declaraciones ISAE', href: '/hacienda/declaraciones', icon: Calculator },
    { name: 'Licencias / Patentes', href: '/hacienda/licencias', icon: FileCheckIcon },
    { name: 'Documentos / Patentes', href: '/hacienda/documentos', icon: FileSpreadsheet },
    { name: 'Verificador Solvencias', href: '/hacienda/solvencias', icon: ShieldCheck },
    { name: 'Emisión de Correos', href: '/hacienda/correos', icon: Mail },
    { name: 'Reportes y Cierres', href: '/hacienda/reportes', icon: BarChart3 },
  ];

  function FileCheckIcon(props: any) {
    return <FileText {...props} />;
  }

  return (
    <div className="min-h-screen flex bg-slate-900 text-slate-100 font-sans">
      {/* ── SIDEBAR HACIENDA ── */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col fixed inset-y-0 z-40">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-lg shadow-sky-600/30">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-black text-sm tracking-tight text-white">Hacienda Municipal</h1>
            <p className="text-[10px] text-sky-400 font-medium uppercase tracking-wider">Municipio Silva • Falcón</p>
          </div>
        </div>

        {/* Estado y Perfil */}
        <div className="px-4 py-3 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 font-medium">David Zara (Master)</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-mono font-bold">
            HACIENDA
          </span>
        </div>

        {/* Navegación */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : item.highlight
                    ? 'text-sky-300 hover:bg-slate-900 hover:text-white border border-sky-500/20'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-sky-400' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Sidebar con Logout y Volver a Aseo */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          <Link
            href="/admin"
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg text-xs font-medium text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/50 transition-colors"
          >
            ← Ir a Módulo de Aseo Urbano
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-950/40 border border-red-900/30 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ── CONTENIDO PRINCIPAL ── */}
      <div className="flex-1 pl-64 flex flex-col min-w-0">
        <header className="h-14 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Módulo de Hacienda</span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-sky-400 font-semibold">Tributos, Patentes e ISAE</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs">
              <span className="text-slate-400">Unidad de Cuenta:</span>
              <strong className="text-sky-300 font-mono">TCMMV (Euro BCV)</strong>
            </div>
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
            >
              Inicio Global
            </Link>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
