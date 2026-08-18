import { ReactNode } from 'react';

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
