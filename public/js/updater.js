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
        <button id="start-update-btn" class="btn btn-primary" onclick="window.updateManager.startUpdate('${updateInfo.downloadUrl}', '${updateInfo.downloadType || 'installer'}')">
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

export async function startUpdate(downloadUrl, downloadType = 'installer') {
  try {
    document.getElementById('cancel-update-btn').style.display = 'none';
    document.getElementById('start-update-btn').style.display = 'none';
    document.getElementById('update-progress').style.display = 'block';

    await apiFetch('/api/updates/install', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ downloadUrl, downloadType })
    });

    let retryCount = 0;
    const maxRetries = 180;

    updateProgress = setInterval(async () => {
      try {
        const progress = await apiFetch('/api/updates/progress');

        updateProgressDisplay(progress);
        retryCount = 0;

        if (progress.status === 'completed') {
          clearInterval(updateProgress);
          showUpdateCompleted();
        } else if (progress.status === 'error') {
          clearInterval(updateProgress);
          showUpdateError(progress.message);
        }
      } catch (error) {
        console.error('Erro ao verificar progresso:', error);
        retryCount++;

        if (retryCount > 10 && retryCount < maxRetries) {
          updateProgressDisplay({
            status: 'restarting',
            message: 'Aguardando serviço reiniciar...',
            percentage: 85
          });
        } else if (retryCount >= maxRetries) {
          clearInterval(updateProgress);
          showUpdateTimeout();
        }
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

  let displayMessage = progress.message;

  switch (progress.status) {
    case 'starting':
      displayMessage = 'Iniciando processo de atualização...';
      break;
    case 'downloading':
      displayMessage = progress.message || 'Baixando nova versão...';
      break;
    case 'preparing':
      displayMessage = 'Preparando atualização...';
      break;
    case 'stopping-service':
      displayMessage = 'Parando serviço...';
      break;
    case 'backing-up':
      displayMessage = 'Criando backup da versão atual...';
      break;
    case 'updating-files':
      displayMessage = 'Substituindo arquivos...';
      break;
    case 'installing':
      displayMessage = 'Instalando nova versão...';
      break;
    case 'restarting-service':
    case 'restarting':
      displayMessage = 'Reiniciando serviço...';
      break;
    case 'cleaning':
      displayMessage = 'Finalizando atualização...';
      break;
    case 'completed':
      displayMessage = 'Atualização concluída com sucesso!';
      break;
    case 'error':
      displayMessage = progress.message || 'Erro durante a atualização';
      break;
  }

  if (messageElement) messageElement.textContent = displayMessage;
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

function showUpdateTimeout() {
  const modalBody = document.querySelector('.update-modal .modal-body');
  modalBody.innerHTML = `
    <div class="update-timeout">
      <i data-lucide="clock" class="warning-icon"></i>
      <h3>Atualização em Andamento</h3>
      <p>A atualização está demorando mais que o esperado. O serviço pode estar reiniciando.</p>
      <p>Por favor, aguarde alguns minutos e recarregue a página.</p>
      <button class="btn btn-primary" onclick="window.location.reload()">
        <i data-lucide="refresh-cw" class="btn-icon"></i>
        Recarregar Página
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

  let connectionErrors = 0;
  let lastKnownPercentage = 0;
  const maxRetries = 180;

  try {
    await apiFetch('/api/updates/install', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        downloadUrl: window.currentUpdateInfo.downloadUrl,
        downloadType: window.currentUpdateInfo.downloadType || 'installer'
      })
    });

    updateProgress = setInterval(async () => {
      try {
        const progress = await apiFetch('/api/updates/progress');

        updateProgressDisplay(progress);
        lastKnownPercentage = progress.percentage;
        connectionErrors = 0;

        if (progress.status === 'completed') {
          clearInterval(updateProgress);
          showUpdateCompleted();
        } else if (progress.status === 'error') {
          clearInterval(updateProgress);
          showUpdateError(progress.message);
        }
      } catch (error) {
        console.error('Erro ao verificar progresso:', error);
        connectionErrors++;

        if (lastKnownPercentage >= 60 && connectionErrors > 5) {
          updateProgressDisplay({
            status: 'restarting',
            message: 'Aguardando serviço reiniciar...',
            percentage: Math.max(lastKnownPercentage, 85)
          });

          if (connectionErrors >= maxRetries) {
            clearInterval(updateProgress);
            showServiceRestarting();
          }
        }
      }
    }, 1000);

  } catch (error) {
    clearInterval(updateProgress);
    modal.remove();
    showToast('Erro ao iniciar atualização: ' + error.message, 'error');
  }
}

function showServiceRestarting() {
  const modalBody = document.querySelector('.update-modal .modal-body');
  modalBody.innerHTML = `
    <div class="update-restarting">
      <i data-lucide="refresh-cw" class="progress-spinner"></i>
      <h3>Serviço Reiniciando...</h3>
      <p>A atualização foi aplicada e o serviço está sendo reiniciado.</p>
      <p>Por favor, aguarde alguns segundos e recarregue a página.</p>
      <div style="margin-top: 20px;">
        <button class="btn btn-primary" onclick="setTimeout(() => window.location.reload(), 3000); this.disabled = true; this.innerHTML = '<i data-lucide=\\'loader\\' class=\\'progress-spinner\\'></i> Aguardando...'">
          <i data-lucide="refresh-cw" class="btn-icon"></i>
          Recarregar em 10s
        </button>
      </div>
    </div>
  `;

  if (window.lucide) {
    window.lucide.createIcons();
  }

  setTimeout(() => {
    window.location.reload();
  }, 10000);
}

window.updateManager = {
  closeUpdateModal,
  startUpdateProcess,
  startUpdate,
  dismissNotification
}; 