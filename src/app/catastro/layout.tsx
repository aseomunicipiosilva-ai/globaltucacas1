'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Building2, 
  MapPin, 
  CreditCard, 
  FileText, 
  Users, 
  Mail, 
  BarChart3, 
  LogOut, 
  Home, 
  ShieldCheck, 
  Calculator, 
  Compass,
  Radio
} from 'lucide-react';

interface CatastroLayoutProps {
  children: React.ReactNode;
}

export default function CatastroLayout({ children }: CatastroLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Omitir sidebar y header si estamos en la pantalla de login
  if (pathname === '/catastro/login') {
    return <>{children}</>;
  }

  const handleLogout = () => {
    sessionStorage.removeItem('catastro_auth');
    router.push('/catastro/login');
  };

  const navItems = [
    { name: 'Inicio Catastro', href: '/catastro', icon: Home },
    { name: 'Caja de Catastro', href: '/catastro/caja', icon: CreditCard, highlight: true },
    { name: 'Fichas Catastrales', href: '/catastro/fichas', icon: FileText },
    { name: 'Fichas / Documentos', href: '/catastro/documentos', icon: Compass },
    { name: 'Cálculo Derecho Frente', href: '/catastro/calculo', icon: Calculator },
    { name: 'Sala Situacional GPS', href: '/catastro/sala-situacional', icon: Radio, highlight: true },
    { name: 'Censo Inmobiliario', href: '/catastro/censo', icon: Users },
    { name: 'Verificador Solvencias', href: '/catastro/solvencias', icon: ShieldCheck },
    { name: 'Emisión de Correos', href: '/catastro/correos', icon: Mail },
    { name: 'Reportes y Avalúos', href: '/catastro/reportes', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen flex bg-stone-900 text-stone-100 font-sans">
      {/* ── SIDEBAR CATASTRO ── */}
      <aside className="w-64 bg-stone-950 border-r border-stone-800 flex flex-col fixed inset-y-0 z-40">
        {/* Brand Header */}
        <div className="p-4 border-b border-stone-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-600/30">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-black text-sm tracking-tight text-white">Catastro Municipal</h1>
            <p className="text-[10px] text-orange-400 font-medium uppercase tracking-wider">Municipio Silva • Falcón</p>
          </div>
        </div>

        {/* Estado y Perfil */}
        <div className="px-4 py-3 bg-stone-900/60 border-b border-stone-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-stone-300 font-medium">David Zara (Master)</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-800 font-mono font-bold">
            CATASTRO
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
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                    : item.highlight
                    ? 'text-orange-300 hover:bg-stone-900 hover:text-white border border-orange-500/20'
                    : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-orange-400' : 'text-stone-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Sidebar con Logout y Volver a Aseo */}
        <div className="p-3 border-t border-stone-800 space-y-2">
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
        <header className="h-14 bg-stone-950/80 backdrop-blur-md border-b border-stone-800 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Módulo de Catastro</span>
            <span className="text-stone-600">•</span>
            <span className="text-xs text-orange-400 font-semibold">Inmuebles Urbanos y Derecho de Frente</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-stone-900 border border-stone-700 text-xs">
              <span className="text-stone-400">Unidad de Cuenta:</span>
              <strong className="text-orange-300 font-mono">TCMMV (Euro BCV)</strong>
            </div>
            <Link
              href="/"
              className="text-xs text-stone-400 hover:text-white px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 transition-colors"
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
