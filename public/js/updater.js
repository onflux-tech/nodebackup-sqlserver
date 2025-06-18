import { apiFetch } from './api.js';
import { showToast } from './ui.js';

let updateCheckInterval = null;
let updateProgress = null;

export function setupUpdater() {

  loadCurrentVersion();

  checkForUpdates();

  updateCheckInterval = setInterval(checkForUpdates, 6 * 60 * 60 * 1000);

  const versionInfo = document.getElementById('version-info');
  if (versionInfo) {
    versionInfo.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      checkForUpdates();
      showToast('Verificando atualizações...', 'info');
    });
  }

  window.addEventListener('beforeunload', () => {
    if (updateCheckInterval) {
      clearInterval(updateCheckInterval);
    }
  });
}

async function loadCurrentVersion() {
  try {
    const response = await fetch('/api/updates/version');
    const data = await response.json();
    updateVersionDisplay(data);
  } catch (error) {
  }
}

export async function checkForUpdates() {
  try {
    const data = await apiFetch('/api/updates/check');

    updateVersionDisplay(data);

    if (data.updateAvailable) {
      showUpdateNotification(data);
    }

    return data;
  } catch (error) {
    console.error('❌ Erro ao verificar atualizações:', error);
    if (error.message && error.message.includes('autorizado')) {
      console.log('⚠️ Usuário não autenticado, pulando verificação de atualizações');
      return;
    }
  }
}

function updateVersionDisplay(updateInfo) {
  const versionElement = document.getElementById('version-info');
  if (!versionElement) {
    console.warn('⚠️ Elemento version-info não encontrado');
    return;
  }

  window.currentUpdateInfo = updateInfo;

  versionElement.innerHTML = `
    <div class="version-display" title="Clique com botão direito para verificar atualizações">
      <div class="version-text">
        <i data-lucide="package" class="version-icon"></i>
        <span>v${updateInfo.currentVersion}</span>
      </div>
      ${updateInfo.updateAvailable ? `
        <span class="update-badge">
          <i data-lucide="download" class="update-icon"></i>
          Nova versão disponível
        </span>
      ` : `
        <span class="latest-badge">
          <i data-lucide="check-circle" class="check-icon"></i>
          Versão mais recente
        </span>
      `}
    </div>
    ${updateInfo.updateAvailable ? `
      <div class="update-notification-sidebar">
        <div class="update-notification-header">
          <i data-lucide="download-cloud" class="notification-icon"></i>
          <span>Nova versão v${updateInfo.latestVersion} disponível</span>
        </div>
        <p>Clique para atualizar automaticamente.</p>
        <div class="update-notification-actions">
          <button class="btn btn-sm btn-primary" onclick="window.updateManager.startUpdateProcess()">
            <i data-lucide="download"></i>
            Atualizar Agora
          </button>
        </div>
      </div>
    ` : ''}
  `;

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function showUpdateNotification(updateInfo) {
  console.log(`Nova versão v${updateInfo.latestVersion} disponível!`);
}

export function showUpdateModal(updateInfoStr) {
  const updateInfo = JSON.parse(decodeURIComponent(updateInfoStr));

  const modal = document.createElement('div');
  modal.className = 'modal update-modal';
  modal.innerHTML = `
    <div class="modal-backdrop" onclick="window.updateManager.closeUpdateModal()"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>
          <i data-lucide="download-cloud" class="modal-icon"></i>
          Atualização Disponível
        </h3>
        <button class="modal-close" onclick="window.updateManager.closeUpdateModal()">
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="update-info">
          <div class="version-comparison">
            <div class="version-current">
              <span class="version-label">Versão Atual</span>
              <span class="version-number">v${updateInfo.currentVersion}</span>
            </div>
            <i data-lucide="arrow-right" class="version-arrow"></i>
            <div class="version-new">
              <span class="version-label">Nova Versão</span>
              <span class="version-number">v${updateInfo.latestVersion}</span>
            </div>
          </div>
          
          ${updateInfo.releaseNotes ? `
            <div class="release-notes">
              <h4>Novidades desta versão:</h4>
              <div class="release-notes-content">${formatReleaseNotes(updateInfo.releaseNotes)}</div>
            </div>
          ` : ''}
          
          <div class="update-warning">
            <i data-lucide="alert-triangle" class="warning-icon"></i>
            <p>
              <strong>Atenção:</strong> A aplicação será reiniciada durante a atualização. 
              Certifique-se de que não há backups em andamento.
            </p>
          </div>
        </div>
        
        <div id="update-progress" class="update-progress" style="display: none;">
          <div class="progress-status">
            <i data-lucide="loader" class="progress-spinner"></i>
            <span id="progress-message">Iniciando atualização...</span>
          </div>
          <div class="progress-bar">
            <div id="progress-bar-fill" class="progress-bar-fill" style="width: 0%"></div>
          </div>
          <div class="progress-percentage">
            <span id="progress-percentage">0%</span>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button id="cancel-update-btn" class="btn btn-secondary" onclick="window.updateManager.closeUpdateModal()">
          Cancelar
        </button>
        <button id="start-update-btn" class="btn btn-primary" onclick="window.updateManager.startUpdate('${updateInfo.downloadUrl}')">
          <i data-lucide="download" class="btn-icon"></i>
          <span>Atualizar Agora</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function formatReleaseNotes(notes) {
  if (!notes) return '';

  return notes
    .replace(/### (.*)/g, '<h5>$1</h5>')
    .replace(/## (.*)/g, '<h4>$1</h4>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/- (.*)/g, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

export async function startUpdate(downloadUrl) {
  try {
    document.getElementById('cancel-update-btn').style.display = 'none';
    document.getElementById('start-update-btn').style.display = 'none';
    document.getElementById('update-progress').style.display = 'block';

    await apiFetch('/api/updates/install', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ downloadUrl })
    });

    updateProgress = setInterval(async () => {
      try {
        const progress = await apiFetch('/api/updates/progress');

        updateProgressDisplay(progress);

        if (progress.status === 'completed') {
          clearInterval(updateProgress);
          showUpdateCompleted();
        } else if (progress.status === 'error') {
          clearInterval(updateProgress);
          showUpdateError(progress.message);
        }
      } catch (error) {
        console.error('Erro ao verificar progresso:', error);
      }
    }, 1000);

  } catch (error) {
    showToast('Erro ao iniciar atualização: ' + error.message, 'error');
    closeUpdateModal();
  }
}

function updateProgressDisplay(progress) {
  const messageElement = document.getElementById('progress-message');
  const barElement = document.getElementById('progress-bar-fill');
  const percentageElement = document.getElementById('progress-percentage');

  if (messageElement) messageElement.textContent = progress.message;
  if (barElement) barElement.style.width = `${progress.percentage}%`;
  if (percentageElement) percentageElement.textContent = `${progress.percentage}%`;
}

function showUpdateCompleted() {
  const modalBody = document.querySelector('.update-modal .modal-body');
  modalBody.innerHTML = `
    <div class="update-completed">
      <i data-lucide="check-circle" class="success-icon"></i>
      <h3>Atualização Concluída!</h3>
      <p>O NodeBackup foi atualizado com sucesso e o serviço foi reiniciado.</p>
      <button class="btn btn-primary" onclick="window.location.reload()">
        <i data-lucide="refresh-cw" class="btn-icon"></i>
        Recarregar Página
      </button>
    </div>
  `;

  if (window.lucide) {
    window.lucide.createIcons();
  }

  setTimeout(() => {
    window.location.reload();
  }, 3000);
}

function showUpdateError(errorMessage) {
  const modalBody = document.querySelector('.update-modal .modal-body');
  modalBody.innerHTML = `
    <div class="update-error">
      <i data-lucide="x-circle" class="error-icon"></i>
      <h3>Erro na Atualização</h3>
      <p>${errorMessage || 'Ocorreu um erro durante a atualização.'}</p>
      <button class="btn btn-secondary" onclick="window.updateManager.closeUpdateModal()">
        Fechar
      </button>
    </div>
  `;

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

export function closeUpdateModal() {
  const modal = document.querySelector('.update-modal');
  if (modal) {
    modal.remove();
  }

  if (updateProgress) {
    clearInterval(updateProgress);
    updateProgress = null;
  }
}

export function dismissNotification(button) {
  const notification = button.closest('.update-notification');
  if (notification) {
    notification.remove();
  }
}

export function showUpdateModalFromSidebar() {
  if (window.currentUpdateInfo && window.currentUpdateInfo.updateAvailable) {
    showUpdateModal(encodeURIComponent(JSON.stringify(window.currentUpdateInfo)));
  }
}

export function dismissSidebarNotification() {
  const notification = document.querySelector('.update-notification-sidebar');
  if (notification) {
    notification.style.display = 'none';
  }
}

export async function startUpdateProcess() {
  if (!window.currentUpdateInfo || !window.currentUpdateInfo.updateAvailable) {
    showToast('Nenhuma atualização disponível', 'warning');
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'modal update-modal active';
  modal.innerHTML = `
    <div class="modal-backdrop" onclick="event.stopPropagation()"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>
          <i data-lucide="download-cloud" class="modal-icon"></i>
          Atualizando NodeBackup
        </h3>
      </div>
      <div class="modal-body">
        <div id="update-progress" class="update-progress">
          <div class="progress-status">
            <i data-lucide="loader" class="progress-spinner"></i>
            <span id="progress-message">Iniciando atualização...</span>
          </div>
          <div class="progress-bar">
            <div id="progress-bar-fill" class="progress-bar-fill" style="width: 0%"></div>
          </div>
          <div class="progress-percentage">
            <span id="progress-percentage">0%</span>
          </div>
        </div>
        <p style="margin-top: 20px; text-align: center; color: var(--text-secondary); font-size: 0.875rem;">
          A atualização será instalada automaticamente e o serviço será reiniciado.
        </p>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  if (window.lucide) {
    window.lucide.createIcons();
  }

  try {
    await apiFetch('/api/updates/install', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        downloadUrl: window.currentUpdateInfo.downloadUrl
      })
    });

    updateProgress = setInterval(async () => {
      try {
        const progress = await apiFetch('/api/updates/progress');

        updateProgressDisplay(progress);

        if (progress.status === 'completed') {
          clearInterval(updateProgress);
          showUpdateCompleted();
        } else if (progress.status === 'error') {
          clearInterval(updateProgress);
          showUpdateError(progress.message);
        }
      } catch (error) {
        console.error('Erro ao verificar progresso:', error);
      }
    }, 1000);

  } catch (error) {
    clearInterval(updateProgress);
    modal.remove();
    showToast('Erro ao iniciar atualização: ' + error.message, 'error');
  }
}

window.updateManager = {
  closeUpdateModal,
  startUpdateProcess,
  dismissNotification
}; 