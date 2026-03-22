'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Header from '../components/Header/Header';
import styles from './admin.module.css';

export default function AdminLayout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin?callbackUrl=/admin');
      return;
    }

    if (!session.user.isAdmin) {
      router.push('/');
      return;
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <span>Loading...</span>
      </div>
    );
  }

  if (!session?.user?.isAdmin) {
    return null;
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: 'grid' },
    { href: '/admin/products', label: 'Products', icon: 'package' },
    { href: '/admin/orders', label: 'Orders', icon: 'truck' },
    { href: '/admin/reviews', label: 'Reviews', icon: 'star' },
    { href: '/admin/emails', label: 'Emails', icon: 'mail' },
  ];

  return (
    <div className={styles.adminLayout}>
      {/* SVG Wave Background */}
      <div className={styles.waveBg} aria-hidden="true">
        <svg viewBox="0 0 1440 900" preserveAspectRatio="none" className={styles.waveSvg}>
          <path d="M0,200 C360,100 720,350 1440,180 L1440,0 L0,0 Z" fill="#141414" />
          <path d="M0,300 C300,200 600,400 1440,250 L1440,0 L0,0 Z" fill="#111111" opacity="0.6" />
          <path d="M0,400 C400,300 800,500 1440,350 L1440,0 L0,0 Z" fill="#0F0F0F" opacity="0.3" />
        </svg>
        <svg viewBox="0 0 1440 400" preserveAspectRatio="none" className={styles.waveBottom}>
          <path d="M0,100 C480,250 960,50 1440,150 L1440,400 L0,400 Z" fill="#141414" opacity="0.4" />
          <path d="M0,200 C360,300 900,100 1440,220 L1440,400 L0,400 Z" fill="#111111" opacity="0.25" />
        </svg>
      </div>

      {/* Main Site Header */}
      <Header alwaysVisible={true} />

      {/* Admin Navigation Bar */}
      <nav className={styles.adminNav}>
        <div className={styles.adminNavInner}>
          <div className={styles.adminNavLinks}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.adminNavItem} ${pathname === item.href ? styles.adminNavItemActive : ''}`}
              >
                <span className={styles.navIcon}>
                  {item.icon === 'grid' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                    </svg>
                  )}
                  {item.icon === 'package' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                      <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                  )}
                  {item.icon === 'truck' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="1" y="3" width="15" height="13" />
                      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                      <circle cx="5.5" cy="18.5" r="2.5" />
                      <circle cx="18.5" cy="18.5" r="2.5" />
                    </svg>
                  )}
                  {item.icon === 'star' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  )}
                  {item.icon === 'mail' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  )}
                </span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className={styles.adminMain}>
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
