'use client';

import { useEffect } from 'react';
import { SessionProvider } from 'next-auth/react';
import { CartProvider } from '@/lib/cart-context';
import CartDrawer from '@/components/CartDrawer/CartDrawer';

export default function Providers({ children }) {
  // Mark hydration complete — CSS animations gate on this
  useEffect(() => {
    document.documentElement.setAttribute('data-hydrated', '');
  }, []);

  return (
    <SessionProvider>
      <CartProvider>
        {children}
        <CartDrawer />
      </CartProvider>
    </SessionProvider>
  );
}
