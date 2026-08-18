import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { AppProvider } from "@/store/AppContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <Sidebar />
      <div className="flex-1 flex flex-col ml-64">
        <Header />
        <main className="flex-1 p-8 mt-16">
          {children}
        </main>
      </div>
    </AppProvider>
  );
}
