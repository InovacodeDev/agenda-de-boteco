import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-[630px] px-4 pb-20 pt-6 md:pb-8">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
