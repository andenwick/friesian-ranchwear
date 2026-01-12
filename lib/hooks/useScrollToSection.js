'use client';

import { useCallback } from 'react';
import { gsap } from '@/lib/gsap';

/**
 * Hook for smooth scrolling to a section with optional CTA activation effect
 * @param {Object} options
 * @param {number} options.offset - Offset from top (default: 120)
 * @param {number} options.duration - Animation duration in seconds (default: 1.5)
 * @param {boolean} options.activateCta - Whether to trigger CTA button effect (default: false)
 */
export function useScrollToSection({
  offset = 120,
  duration = 1.5,
  activateCta = false
} = {}) {
  const scrollTo = useCallback((targetId) => {
    const target = document.getElementById(targetId);
    if (!target) return;

    gsap.to(window, {
      duration,
      scrollTo: { y: target, offsetY: offset },
      ease: "power2.inOut",
      onComplete: activateCta ? () => {
        const ctaButton = document.getElementById('shop-cta-button');
        if (ctaButton) {
          ctaButton.classList.add('ctaActivated');
          setTimeout(() => {
            ctaButton.classList.remove('ctaActivated');
          }, 2000);
        }
      } : undefined
    });
  }, [offset, duration, activateCta]);

  return scrollTo;
}
