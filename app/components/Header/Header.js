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
              href="https://instagram.com/friesianranchwear"
              className={styles.menuSocialLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram
            </a>
            <a
              href="https://tiktok.com/@friesianranchwear"
              className={styles.menuSocialLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              TikTok
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
