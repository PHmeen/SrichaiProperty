'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { AppProvider } from '@/context/AppContext';

import FloatingChatWidget from '@/components/common/FloatingChatWidget';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AppProvider>
        {children}
        <FloatingChatWidget />
      </AppProvider>
    </SessionProvider>
  );
}