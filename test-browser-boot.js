// Test simulation of browser DOM load
global.window = global;
global.document = {
  readyState: 'complete',
  addEventListener: (event, handler) => {
    if (event === 'DOMContentLoaded') handler();
  },
  querySelectorAll: () => [],
  getElementById: (id) => {
    if (id === 'main-content') {
      return {
        innerHTML: '',
        appendChild: () => {},
        classList: { add: () => {}, remove: () => {} }
      };
    }
    return {
      innerHTML: '',
      textContent: '',
      classList: { add: () => {}, remove: () => {} },
      addEventListener: () => {}
    };
  }
};
global.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

try {
  require('./js/data/sample-data.js');
  require('./js/engines/distance-engine.js');
  require('./js/engines/risk-engine.js');
  require('./js/engines/eta-engine.js');
  require('./js/engines/sustainability-engine.js');
  require('./js/engines/matching-engine.js');
  require('./js/engines/recovery-engine.js');
  require('./js/validation.js');
  require('./js/supabase-client.js');
  require('./js/store.js');
  require('./js/components/dashboard.js');
  require('./js/components/fleet.js');
  require('./js/components/shipments.js');
  require('./js/components/analysis.js');
  require('./js/components/matching.js');
  require('./js/components/explainability.js');
  require('./js/components/recovery.js');
  require('./js/components/routes.js');
  require('./js/components/sustainability.js');
  require('./js/components/analytics.js');
  require('./js/components/data-management.js');
  require('./js/components/settings.js');
  require('./js/app.js');
  console.log('ALL SCRIPTS LOADED AND BOOTED CLEANLY!');
  setTimeout(() => process.exit(0), 100);
} catch (err) {
  console.error('ERROR DURING BROWSER BOOT:', err);
  process.exit(1);
}
