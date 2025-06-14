let activeTab = 'database';

export function setupThemeToggle() {
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;

  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    setTimeout(() => {
      if (window.lucide) window.lucide.createIcons();
    }, 50);

    setTimeout(() => {
      const historyTab = document.querySelector('[data-tab="history"]');
      if (historyTab && historyTab.classList.contains('active') && window.reloadHistory) {
        window.reloadHistory(true);
      }
    }, 400);
  });
}

export function setupMobileMenu() {
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const mobileOverlay = document.getElementById('mobile-overlay');

  if (!mobileMenuToggle || !sidebar || !mobileOverlay) return;

  function toggleMobileMenu() {
    sidebar.classList.toggle('show');
    mobileOverlay.classList.toggle('show');
  }

  function closeMobileMenu() {
    sidebar.classList.remove('show');
    mobileOverlay.classList.remove('show');
  }

  mobileMenuToggle.addEventListener('click', toggleMobileMenu);
  mobileOverlay.addEventListener('click', closeMobileMenu);

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        closeMobileMenu();
      }
    });
  });
}

export function setupTabs(onTabSwitch) {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(navItem => {
    navItem.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = navItem.getAttribute('data-tab');
      switchTab(targetTab, onTabSwitch);
    });
  });

  let savedActiveTab = localStorage.getItem('activeTab') || 'database';
  if (savedActiveTab === 'ftp') {
    savedActiveTab = 'storage';
  }
  switchTab(savedActiveTab, onTabSwitch);
}

export function switchTab(targetTab, onTabSwitch) {
  const navItems = document.querySelectorAll('.nav-item');
  const tabContents = document.querySelectorAll('.tab-content');

  navItems.forEach(nav => nav.classList.remove('active'));
  tabContents.forEach(content => content.classList.remove('active'));

  const activeNavItem = document.querySelector(`[data-tab="${targetTab}"]`);
  const activeTabContent = document.getElementById(`tab-${targetTab}`);

  if (activeNavItem && activeTabContent) {
    activeNavItem.classList.add('active');
    activeTabContent.classList.add('active');
    localStorage.setItem('activeTab', targetTab);
    activeTab = targetTab;
    if (onTabSwitch) {
      onTabSwitch(targetTab);
    }
  }
}

export function showToast(message, type = 'success', duration = 4000) {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
        <div class="toast-message">${message}</div>
        <button class="toast-close" aria-label="Fechar">&times;</button>
    `;
  toastContainer.appendChild(toast);

  const removeToast = () => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  };

  toast.querySelector('.toast-close').addEventListener('click', removeToast);
  setTimeout(() => toast.classList.add('show'), 10);

  const autoCloseTimer = setTimeout(removeToast, duration);
  toast.addEventListener('mouseenter', () => clearTimeout(autoCloseTimer));
  toast.addEventListener('mouseleave', () => setTimeout(removeToast, 1000));
}

export function showDetailedErrorToast(mainError, details, suggestions) {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) return;

  let suggestionsHtml = '';
  if (suggestions && suggestions.length > 0) {
    suggestionsHtml = `
            <div class="toast-suggestions">
                <strong>Sugestões:</strong>
                <ul>${suggestions.map(s => `<li>${s}</li>`).join('')}</ul>
            </div>
        `;
  }

  const toast = document.createElement('div');
  toast.className = 'toast toast-error toast-detailed';
  toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-title">${mainError}</div>
            ${details ? `<div class="toast-details">${details}</div>` : ''}
            ${suggestionsHtml}
        </div>
        <button class="toast-close" aria-label="Fechar">&times;</button>
    `;
  toastContainer.appendChild(toast);

  const removeToast = () => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  };

  toast.querySelector('.toast-close').addEventListener('click', removeToast);
  setTimeout(() => toast.classList.add('show'), 10);

  const autoCloseTimer = setTimeout(removeToast, 15000);
  toast.addEventListener('mouseenter', () => clearTimeout(autoCloseTimer));
  toast.addEventListener('mouseleave', () => setTimeout(removeToast, 2000));
}


export function toggleButtonLoading(button, isLoading) {
  if (!button) return;
  button.disabled = isLoading;
  const textElement = button.querySelector('.btn-text');
  const spinnerElement = button.querySelector('.spinner');
  if (textElement) textElement.style.display = isLoading ? 'none' : 'inline-block';
  if (spinnerElement) spinnerElement.style.display = isLoading ? 'inline-block' : 'none';
}

export function getActiveTab() {
  return activeTab;
}

/**
 * @param {string} title
 * @param {string} message
 * @param {function} onConfirm
 */
export function showConfirmationModal(title, message, onConfirm) {
  const modal = document.getElementById('confirmationModal');

  const titleEl = document.getElementById('confirmationModalTitle');
  const messageEl = document.getElementById('confirmationModalMessage');
  const confirmBtn = document.getElementById('confirmationModalConfirm');
  const cancelBtn = document.getElementById('confirmationModalCancel');
  const closeBtn = document.getElementById('confirmationModalClose');

  if (!modal || !titleEl || !messageEl || !confirmBtn || !cancelBtn || !closeBtn) {
    console.error('Elementos do modal de confirmação não encontrados.');
    return;
  }

  titleEl.innerHTML = `<i data-lucide="alert-triangle"></i> ${escapeHtml(title)}`;
  lucide.createIcons();

  messageEl.textContent = message;

  modal.classList.add('active');

  const handleConfirm = () => {
    onConfirm();
    closeModal();
  };

  const closeModal = () => {
    modal.classList.remove('active');
    confirmBtn.removeEventListener('click', handleConfirm);
    cancelBtn.removeEventListener('click', closeModal);
    closeBtn.removeEventListener('click', closeModal);
  };

  confirmBtn.addEventListener('click', handleConfirm);
  cancelBtn.addEventListener('click', closeModal);
  closeBtn.addEventListener('click', closeModal);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
} 