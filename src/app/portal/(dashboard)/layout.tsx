'use client';
import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PortalSidebar from '@/components/PortalSidebar';
import PortalHeader from '@/components/PortalHeader';

export default function PortalDashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

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
      <PortalSidebar />

      {/* Contenido Principal con margen izquierdo igual al ancho del Sidebar (w-64 = 16rem = 256px) */}
      <div className="flex-1 flex flex-col ml-64">
        {/* Cabecera Superior Fija */}
        <PortalHeader />

        {/* Área de trabajo */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
