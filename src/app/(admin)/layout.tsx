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
            <div className="relative z-10">
              {children}
            </div>
          </main>
        </div>
      </AppProvider>
    </AdminAuthWrapper>
  );
}

