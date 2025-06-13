import { apiFetch } from './api.js';
import { showToast, toggleButtonLoading, showDetailedErrorToast } from './ui.js';

const elements = {
  // FTP
  ftpEnabledCheckbox: document.getElementById('ftpEnabled'),
  ftpHostInput: document.getElementById('ftpHost'),
  ftpPortInput: document.getElementById('ftpPort'),
  ftpUserInput: document.getElementById('ftpUser'),
  ftpPassInput: document.getElementById('ftpPass'),
  ftpRemoteDirInput: document.getElementById('ftpRemoteDir'),
  btnTestFtp: document.getElementById('btnTestFtp'),
  // Network
  networkPathInput: document.getElementById('networkPath'),
  browsePathBtn: document.getElementById('browsePathBtn'),
  // Cleanup
  retentionEnabled: document.getElementById('retentionEnabled'),
  btnCleanupLocal: document.getElementById('btnCleanupLocal'),
  btnCleanupFtp: document.getElementById('btnCleanupFtp'),
  // Folder Browser
  folderBrowserModal: document.getElementById('folderBrowserModal'),
  closeFolderBrowserBtn: document.getElementById('closeFolderBrowser'),
  levelUpBtn: document.getElementById('levelUpBtn'),
  homeDrivesBtn: document.getElementById('homeDrivesBtn'),
  currentPathInput: document.getElementById('currentPathInput'),
  folderListDiv: document.getElementById('folderList'),
  selectFolderBtn: document.getElementById('selectFolderBtn'),
  newFolderNameInput: document.getElementById('newFolderNameInput'),
  createNewFolderBtn: document.getElementById('createNewFolderBtn')
};

async function testFtpConnection() {
  if (!elements.ftpEnabledCheckbox.checked) {
    showToast('Para testar, habilite primeiro o armazenamento FTP.', 'error');
    return;
  }
  const ftpConfig = {
    host: elements.ftpHostInput.value.trim(),
    port: parseInt(elements.ftpPortInput.value, 10) || 21,
    user: elements.ftpUserInput.value.trim(),
    password: elements.ftpPassInput.value.trim(),
    remoteDir: elements.ftpRemoteDirInput.value.trim() || '/',
  };
  if (!ftpConfig.host || !ftpConfig.user || !ftpConfig.password) {
    showToast('Preencha Host, Usuário e Senha do FTP.', 'error');
    return;
  }
  toggleButtonLoading(elements.btnTestFtp, true);
  try {
    const data = await apiFetch('/api/test-ftp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ftpConfig)
    });
    showToast(data.message || 'Conexão FTP testada com sucesso!', 'success');
  } catch (err) {
    showDetailedErrorToast(err.error, err.details, err.suggestions);
  } finally {
    toggleButtonLoading(elements.btnTestFtp, false);
  }
}

async function cleanupLocal() {
  if (!elements.retentionEnabled || !elements.retentionEnabled.checked) {
    showToast('Política de retenção não está habilitada.', 'error');
    return;
  }
  toggleButtonLoading(elements.btnCleanupLocal, true);
  try {
    const data = await apiFetch('/api/cleanup-local', { method: 'POST' });
    const removed = data.data ? data.data.removed : 0;
    showToast(removed > 0 ? `${data.message} (${data.data.retentionDays} dias)` : 'Nenhum backup antigo para remoção local.', 'success');
  } catch (err) {
    showDetailedErrorToast(err.error, err.details, err.suggestions);
  } finally {
    toggleButtonLoading(elements.btnCleanupLocal, false);
  }
}

async function cleanupFtp() {
  if (!elements.retentionEnabled || !elements.retentionEnabled.checked) {
    showToast('Política de retenção não está habilitada.', 'error');
    return;
  }
  if (!elements.ftpEnabledCheckbox.checked) {
    showToast('Armazenamento FTP não habilitado.', 'error');
    return;
  }
  toggleButtonLoading(elements.btnCleanupFtp, true);
  try {
    const data = await apiFetch('/api/cleanup-ftp', { method: 'POST' });
    const removed = data.data ? data.data.removed : 0;
    showToast(removed > 0 ? `${data.message} (${data.data.retentionDays} dias)` : 'Nenhum backup antigo para remoção no FTP.', 'success');
  } catch (err) {
    showDetailedErrorToast(err.error, err.details, err.suggestions);
  } finally {
    toggleButtonLoading(elements.btnCleanupFtp, false);
  }
}

// --- Folder Browser Logic ---
function closeFolderBrowser() {
  elements.folderBrowserModal.classList.remove('show');
}

async function loadAndDisplayPath(path = '') {
  try {
    elements.folderListDiv.innerHTML = '<div class="spinner" style="display: block; margin: 2rem auto;"></div>';
    elements.currentPathInput.value = path;
    elements.levelUpBtn.disabled = !path || /^[A-Z]:\\?$/.test(path);
    elements.homeDrivesBtn.disabled = !path;
    elements.homeDrivesBtn.style.opacity = path ? '1' : '0.5';

    const url = path ? `/api/browse/list?path=${encodeURIComponent(path)}` : '/api/browse/drives';
    const data = await apiFetch(url);

    elements.folderListDiv.innerHTML = '';
    const items = path ? data.directories : data;
    if (items.length === 0) {
      elements.folderListDiv.innerHTML = '<p style="text-align:center; color: var(--text-muted);">Nenhuma subpasta encontrada.</p>';
    }

    items.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'folder-list-item';
      const newPath = path ? (path.endsWith('\\') ? path + item : path + '\\' + item) : item;
      itemEl.dataset.path = newPath;
      itemEl.innerHTML = `<i data-lucide="${path ? 'folder' : 'hard-drive'}" class="folder-item-icon"></i><span>${item}</span>`;
      itemEl.addEventListener('click', () => loadAndDisplayPath(itemEl.dataset.path));
      elements.folderListDiv.appendChild(itemEl);
    });
    if (window.lucide) window.lucide.createIcons();
  } catch (error) {
    elements.folderListDiv.innerHTML = `<p style="text-align:center; color: var(--toast-error-bg);">${error.message}</p>`;
  }
}

async function createNewFolder() {
  const basePath = elements.currentPathInput.value;
  const newFolderName = elements.newFolderNameInput.value.trim();
  if (!basePath) {
    showToast('Navegue até um drive ou pasta primeiro.', 'error');
    return;
  }
  if (!newFolderName) {
    showToast('Digite um nome para a nova pasta.', 'error');
    elements.newFolderNameInput.focus();
    return;
  }
  toggleButtonLoading(elements.createNewFolderBtn, true);
  try {
    await apiFetch('/api/browse/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ basePath, newFolderName })
    });
    showToast(`Pasta "${newFolderName}" criada com sucesso!`, 'success');
    elements.newFolderNameInput.value = '';
    loadAndDisplayPath(basePath);
  } catch (error) {
    showToast(`Erro ao criar pasta: ${error.error || error.message}`, 'error');
  } finally {
    toggleButtonLoading(elements.createNewFolderBtn, false);
  }
}

function setupFolderBrowser() {
  elements.browsePathBtn?.addEventListener('click', () => {
    elements.folderBrowserModal.classList.add('show');
    loadAndDisplayPath();
    if (window.lucide) window.lucide.createIcons();
  });
  elements.closeFolderBrowserBtn?.addEventListener('click', closeFolderBrowser);
  elements.selectFolderBtn?.addEventListener('click', () => {
    const finalPath = elements.currentPathInput.value;
    if (finalPath) {
      elements.networkPathInput.value = finalPath;
      showToast('Pasta selecionada!', 'success');
    } else {
      showToast('Selecione uma pasta válida.', 'error');
    }
    closeFolderBrowser();
  });
  elements.levelUpBtn?.addEventListener('click', () => {
    let currentPath = elements.currentPathInput.value;
    if (!currentPath) return;
    if (/^[A-Z]:\\$/.test(currentPath) || (currentPath.startsWith('\\\\') && currentPath.split('\\').filter(Boolean).length <= 2)) {
      loadAndDisplayPath('');
      return;
    }
    let parentPath = currentPath.substring(0, currentPath.lastIndexOf('\\'));
    if (!parentPath || /^\\\\[^\\/]+$/.test(parentPath)) {
      loadAndDisplayPath('');
      return;
    }
    if (parentPath.endsWith(':')) parentPath += '\\';
    loadAndDisplayPath(parentPath);
  });
  elements.homeDrivesBtn?.addEventListener('click', () => loadAndDisplayPath(''));
  elements.currentPathInput?.addEventListener('keydown', (e) => e.key === 'Enter' && loadAndDisplayPath(elements.currentPathInput.value.trim()));
  elements.createNewFolderBtn?.addEventListener('click', createNewFolder);
  elements.newFolderNameInput?.addEventListener('keydown', (e) => e.key === 'Enter' && elements.createNewFolderBtn.click());
}

export function setupStorage() {
  elements.btnTestFtp?.addEventListener('click', testFtpConnection);
  elements.btnCleanupLocal?.addEventListener('click', cleanupLocal);
  elements.btnCleanupFtp?.addEventListener('click', cleanupFtp);
  setupFolderBrowser();
} 