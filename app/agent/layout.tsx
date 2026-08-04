import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/authOptions';
import AgentNavbar from '@/components/layout/AgentNavbar';
import AgentFooter from '@/components/layout/AgentFooter';
import PendingAgentGate from '@/components/agent/PendingAgentGate';

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string; status?: string | null } | undefined;

  if (!session || user?.role !== 'agent') {
    redirect('/login/agent');
  }

  const isPending = (user?.status || 'pending') === 'pending';

  return (
    <div className="h-screen flex flex-col bg-[#f8fafc]">

      <AgentNavbar />

      <main className="flex-1 min-h-0 overflow-y-auto">
        {isPending ? <PendingAgentGate /> : children}
      </main>

      <AgentFooter />

    </div>
  );
}
