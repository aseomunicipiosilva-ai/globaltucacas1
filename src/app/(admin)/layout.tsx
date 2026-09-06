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
          <main className="flex-1 p-8 mt-16 relative overflow-hidden">
            {/* Marcas de agua - logos institucionales */}
            <div className="pointer-events-none fixed inset-0 ml-64 mt-16 z-0 overflow-hidden">
              <img src="/logos/alcaldia.jpg" alt="" className="absolute top-6 right-6 h-24 w-auto object-contain opacity-[0.07]" />
              <img src="/logos/isma.jpg" alt="" className="absolute bottom-6 right-6 h-24 w-auto object-contain opacity-[0.07]" />
              <img src="/logos/basura_cero.jpg" alt="" className="absolute bottom-6 left-6 h-24 w-auto object-contain opacity-[0.07]" />
              <img src="/logos/global_rec.jpg" alt="" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-48 w-auto object-contain opacity-[0.05]" />
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

