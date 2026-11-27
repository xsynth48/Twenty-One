'use strict';
// Unlocked local paywall stub for Twenty-One
(function paywall() {
  const locked = () => false;
  window.__twocodePaywallOn = locked;
  window.__twocodePro = Object.freeze({
    locked,
    pro: () => ({
      on: false,
      allowed: true,
      founder: true,
      bought: true,
      trialAt: 0,
      trialEnds: 0,
      price: 'Free'
    })
  });
})();
