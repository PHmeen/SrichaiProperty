import AgentNavbar from '@/components/layout/AgentNavbar';
import AgentFooter from '@/components/layout/AgentFooter';

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col bg-[#f8fafc]">

      <AgentNavbar />

      <main className="flex-1 min-h-0 overflow-y-auto">
        {children}
      </main>

      <AgentFooter />

    </div>
  );
}
