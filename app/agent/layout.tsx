import React from 'react';
import AgentNavbar from '@/components/agent/Navbar';
import AgentFooter from '@/components/agent/Footer';

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="font-sans bg-[#f8fafc] min-h-screen text-slate-800 text-xs antialiased flex flex-col">
      {/* 🧭 Agent Navbar ครอบทุกหน้าใน /agent/* อัตโนมัติ */}
      <AgentNavbar />

      {/* เนื้อหาหน้าจอของนายหน้า */}
      <div className="flex-grow w-full">
        {children}
      </div>

      {/* ⚓ Agent Footer ครอบทุกหน้าใน /agent/* อัตโนมัติ */}
      <AgentFooter />
    </div>
  );
}
