"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useCart } from "@/lib/cart-context";
import styles from "./Header.module.css";

export default function Header({ alwaysVisible = false }) {
  const [isVisible, setIsVisible] = useState(alwaysVisible);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { data: session, status } = useSession();
  const { itemCount, openCart } = useCart();
  const pathname = usePathname();

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut({ redirect: false });
    window.location.href = '/';
  };

  useEffect(() => {
    if (alwaysVisible) return;

    const handleScroll = () => {
      setIsVisible(window.scrollY > 100);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [alwaysVisible]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  const solid = isVisible || menuOpen;

  return (
    <header className={`${styles.header} ${alwaysVisible ? styles.alwaysVisible : ''} ${solid ? styles.visible : ""}`}>
      <div className={styles.container}>
        <a href="/" className={styles.brand} tabIndex={solid ? undefined : -1} aria-hidden={solid ? undefined : true}>
          <Image
            src="/friesian-logo-chrome.png"
            alt="Friesian Ranchwear"
            width={32}
            height={32}
            className={styles.logo}
          />
          <span className={styles.wordmark}>FRIESIAN</span>
        </a>

        <nav className={styles.nav} aria-label="Main">
          <Link href="/products" className={styles.shopLink}>
            Shop
          </Link>
          {status === 'loading' ? null : session ? (
            <div className={styles.authMenu}>
              <button
                onClick={handleSignOut}
                className={styles.iconButton}
                disabled={signingOut}
                aria-label="Sign out"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
              {session.user.isAdmin && (
                <Link href="/admin" className={styles.adminLink}>
                  Admin
                </Link>
              )}
            </div>
          ) : (
            <Link href="/auth/signin" className={styles.iconButton} aria-label="Sign in">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </Link>
          )}
          <button
            onClick={openCart}
            className={styles.iconButton}
            aria-label={`Shopping cart with ${itemCount} items`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {itemCount > 0 && (
              <span className={styles.cartCount}>{itemCount}</span>
            )}
          </button>
          <button
            onClick={() => setMenuOpen((open) => !open)}
            className={styles.iconButton}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
          >
            {menuOpen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="7" x2="21" y2="7" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="17" x2="21" y2="17" />
              </svg>
            )}
          </button>
        </nav>
      </div>

      {menuOpen && (
        <div id="site-menu" className={styles.menu} onClick={() => setMenuOpen(false)}>
          <nav className={styles.menuLinks} aria-label="Site">
            <Link href="/products" className={styles.menuLink}>Shop</Link>
            <Link href="/track-order" className={styles.menuLink}>Track Order</Link>
            {session ? (
              <Link href="/account/orders" className={styles.menuLink}>My Orders</Link>
            ) : (
              <Link href="/auth/signin" className={styles.menuLink}>Sign In</Link>
            )}
          </nav>
          <div className={styles.menuSocial}>
            <a
              href="https://tiktok.com/@friesianranchwear"
              className={styles.menuSocialLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow us on TikTok"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
              </svg>
            </a>
            <a
              href="https://instagram.com/friesianranchwear"
              className={styles.menuSocialLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow us on Instagram"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
              </svg>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
