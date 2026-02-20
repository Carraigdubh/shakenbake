'use client';

import React from 'react';
import type { ReactNode } from 'react';
import { ShakeNbakeProvider, ProxyAdapter } from '@shakenbake/web';

const adapter = new ProxyAdapter({ endpoint: '/api/shakenbake' });

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ShakeNbakeProvider
      config={{
        enabled: true,
        destination: adapter,
        ui: { showFAB: true, theme: 'auto' },
      }}
    >
      {children}
    </ShakeNbakeProvider>
  );
}
