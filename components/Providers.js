'use client';

import { SessionProvider } from 'next-auth/react';
import { CartProvider } from '@/lib/cart-context';
import CartDrawer from '@/components/CartDrawer/CartDrawer';

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <CartProvider>
        {children}
        <CartDrawer />
      </CartProvider>
    </SessionProvider>
  );
}
