'use client';

import { useEffect, useState } from 'react';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setShowBanner(false);
    window.location.reload();
  };

  const declineCookies = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#1a1a1a',
      color: '#fff',
      padding: '1rem',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '1rem',
      flexWrap: 'wrap',
      zIndex: 9999,
    }}>
      <p style={{ margin: 0 }}>
        We use cookies to analyze site traffic.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={acceptCookies}
          style={{
            backgroundColor: '#fff',
            color: '#1a1a1a',
            border: 'none',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Accept
        </button>
        <button
          onClick={declineCookies}
          style={{
            backgroundColor: 'transparent',
            color: '#fff',
            border: '1px solid #fff',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
          }}
        >
          Decline
        </button>
      </div>
    </div>
  );
}
