/* ============================================================
   RISKHELPER.AI — SHARED COMPONENTS (JavaScript)
   Nav hamburger, cookie consent, shared logic
   Include at bottom of <body> on all pages
   ============================================================ */

(function() {
  'use strict';

  /* ---- Mobile nav hamburger ---- */
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobileNav');
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      const isOpen = mobileNav.classList.toggle('is-open');
      hamburger.setAttribute('aria-expanded', isOpen);
    });
    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !mobileNav.contains(e.target)) {
        mobileNav.classList.remove('is-open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---- Cookie Consent ---- */
  const CONSENT_KEY = 'riskhelper_cookie_consent';
  const banner = document.getElementById('cookie-banner');

  function getConsent() {
    try { return localStorage.getItem(CONSENT_KEY); } catch(e) { return null; }
  }
  function setConsent(value) {
    try {
      localStorage.setItem(CONSENT_KEY, value);
      localStorage.setItem(CONSENT_KEY + '_date', new Date().toISOString());
    } catch(e) {}
  }

  function hideBanner() {
    if (banner) {
      banner.classList.add('hidden');
      // Remove from DOM after transition
      setTimeout(() => { if (banner.parentNode) banner.parentNode.removeChild(banner); }, 350);
    }
  }

  // Only show banner if no consent recorded
  if (banner && !getConsent()) {
    banner.classList.remove('hidden');

    const acceptBtn = document.getElementById('cookie-accept');
    const rejectBtn = document.getElementById('cookie-reject');
    const manageBtn = document.getElementById('cookie-manage');

    if (acceptBtn) {
      acceptBtn.addEventListener('click', () => {
        setConsent('accepted');
        hideBanner();
        // Future: initialise analytics here after consent
      });
    }
    if (rejectBtn) {
      rejectBtn.addEventListener('click', () => {
        setConsent('rejected');
        hideBanner();
      });
    }
    if (manageBtn) {
      manageBtn.addEventListener('click', () => {
        window.location.href = 'privacy-policy.html#cookies';
      });
    }
  } else if (banner) {
    // Consent already given — hide immediately
    banner.classList.add('hidden');
  }

  /* Expose consent check for analytics use */
  window.RH = window.RH || {};
  window.RH.hasAnalyticsConsent = function() {
    return getConsent() === 'accepted';
  };
  window.RH.resetConsent = function() {
    try { localStorage.removeItem(CONSENT_KEY); } catch(e) {}
    window.location.reload();
  };

})();
