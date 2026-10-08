'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './CookieConsent.module.css';

export const COOKIE_CONSENT_EVENT = 'cookie-consent-change';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const bannerRef = useRef(null);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  // Reserve space at the bottom of the page so the banner never covers buttons.
  useEffect(() => {
    if (!showBanner || !bannerRef.current) return;

    const banner = bannerRef.current;
    const reserve = () => {
      document.body.style.paddingBottom = `${banner.offsetHeight}px`;
    };
    reserve();
    const observer = new ResizeObserver(reserve);
    observer.observe(banner);

    return () => {
      observer.disconnect();
      document.body.style.paddingBottom = '';
    };
  }, [showBanner]);

  const choose = (value) => {
    localStorage.setItem('cookie-consent', value);
    setShowBanner(false);
    window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div ref={bannerRef} className={styles.banner} role="region" aria-label="Cookie consent">
      <p className={styles.text}>
        We use cookies to analyze site traffic.
      </p>
      <div className={styles.actions}>
        <button onClick={() => choose('accepted')} className={styles.accept}>
          Accept
        </button>
        <button onClick={() => choose('declined')} className={styles.decline}>
          Decline
        </button>
      </div>
    </div>
  );
}
