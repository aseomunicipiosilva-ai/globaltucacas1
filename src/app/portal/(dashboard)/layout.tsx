'use client';
import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PortalSidebar from '@/components/PortalSidebar';
import PortalHeader from '@/components/PortalHeader';

export default function PortalDashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const portalUser = localStorage.getItem('portal_user');
    if (!portalUser) {
      router.push('/portal');
    }
  }, [router]);

  if (!isClient) return null; // Evitar hidratación incorrecta

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex">
      {/* Sidebar Fijo a la Izquierda */}
      <PortalSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Contenido Principal con margen en md: para el sidebar */}
      <div className="flex-1 flex flex-col md:ml-64 w-full">
        {/* Cabecera Superior Fija */}
        <PortalHeader onMenuClick={() => setIsSidebarOpen(true)} />

        {/* Área de trabajo */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
