import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { AppProvider } from "@/store/AppContext";
import AdminAuthWrapper from "@/components/AdminAuthWrapper";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthWrapper>
      <AppProvider>
        <Sidebar />
        <div className="flex-1 flex flex-col ml-64">
          <Header />
          <main className="flex-1 p-8 mt-20 relative min-h-screen">
            {/* Marcas de agua - logos institucionales en esquinas */}
            <div className="pointer-events-none fixed inset-0 ml-64 mt-20 z-0">
              {/* Superior izquierda - Alcaldía */}
              <img src="/logos/alcaldia.jpg" alt="" className="absolute top-4 left-4 h-28 w-auto object-contain opacity-20" />
              {/* Superior derecha - ISMA */}
              <img src="/logos/isma.jpg" alt="" className="absolute top-4 right-4 h-28 w-auto object-contain opacity-20" />
              {/* Inferior izquierda - Basura Cero */}
              <img src="/logos/basura_cero.jpg" alt="" className="absolute bottom-4 left-4 h-28 w-auto object-contain opacity-20" />
              {/* Inferior derecha - Global Rec */}
              <img src="/logos/global_rec.jpg" alt="" className="absolute bottom-4 right-4 h-28 w-auto object-contain opacity-20" />
            </div>
            <div className="relative z-10">
              {children}
            </div>
          </main>
        </div>
      </AppProvider>
    </AdminAuthWrapper>
  );
}

