import AgentNavbar from '@/components/layout/AgentNavbar';
import AgentFooter from '@/components/layout/AgentFooter';

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#f8fafc]">

      <AgentNavbar />

      <main className="flex-1 min-h-0 overflow-hidden">
        {children}
      </main>

      <AgentFooter />

    </div>
  );
}
