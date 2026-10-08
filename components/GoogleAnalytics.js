'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { COOKIE_CONSENT_EVENT } from './CookieConsent';

export default function GoogleAnalytics() {
  const [consentGiven, setConsentGiven] = useState(false);
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  useEffect(() => {
    const readConsent = () => {
      setConsentGiven(localStorage.getItem('cookie-consent') === 'accepted');
    };
    readConsent();
    window.addEventListener(COOKIE_CONSENT_EVENT, readConsent);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, readConsent);
  }, []);

  if (!gaId || !consentGiven) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  );
}
