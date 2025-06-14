import { setupThemeToggle, setupMobileMenu, setupTabs } from './js/ui.js';
import { setupLogout } from './js/auth.js';
import { loadConfig, setupConfigForm } from './js/config.js';
import { setupDatabaseSection } from './js/database.js';
import { setupScheduling } from './js/schedule.js';
import { setupStorage } from './js/storage.js';
import { loadHistoryTab, setupHistory } from './js/history.js';
import { initializeLogs } from './js/logs.js';

document.addEventListener('DOMContentLoaded', async () => {

  setupThemeToggle();
  setupMobileMenu();

  setupTabs((activeTab) => {
    if (activeTab === 'history') {
      loadHistoryTab();
    } else if (activeTab === 'logs') {
      initializeLogs();
    }
  });

  setupLogout();

  setupConfigForm();
  setupDatabaseSection();
  setupScheduling();
  setupStorage();
  setupHistory();

  loadConfig();

  setTimeout(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    } else {
      console.warn('⚠️ Lucide não está disponível');
    }
  }, 100);

});
