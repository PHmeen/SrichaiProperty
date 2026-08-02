'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { AppProvider } from '@/context/AppContext';

import FloatingChatWidget from '@/components/common/FloatingChatWidget';
import AdminTopBar from '@/components/common/AdminTopBar';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AppProvider>
        <AdminTopBar />
        {children}
        <FloatingChatWidget />
      </AppProvider>
    </SessionProvider>
  );
}