import { apiFetch } from './api.js';
import { showToast, toggleButtonLoading, showDetailedErrorToast } from './ui.js';
import { getSelectedDatabases, setSelectedDatabases, renderSelectedDatabasesTags } from './database.js';
import { addScheduleInput, getScheduleTimes } from './schedule.js';

const elements = {
  saveButton: document.getElementById('saveButton'),
  configForm: document.getElementById('configForm'),
  clientName: document.getElementById('clientName'),
  dbServer: document.getElementById('dbServer'),
  dbUser: document.getElementById('dbUser'),
  dbPass: document.getElementById('dbPass'),
  ftpEnabled: document.getElementById('ftpEnabled'),
  ftpForm: document.getElementById('ftpForm'),
  ftpHost: document.getElementById('ftpHost'),
  ftpPort: document.getElementById('ftpPort'),
  ftpUser: document.getElementById('ftpUser'),
  ftpPass: document.getElementById('ftpPass'),
  ftpRemoteDir: document.getElementById('ftpRemoteDir'),
  networkPathEnabled: document.getElementById('networkPathEnabled'),
  networkPathForm: document.getElementById('networkPathForm'),
  networkPath: document.getElementById('networkPath'),
  retentionEnabled: document.getElementById('retentionEnabled'),
  localRetentionDays: document.getElementById('localRetentionDays'),
  ftpRetentionDays: document.getElementById('ftpRetentionDays'),
  autoCleanup: document.getElementById('autoCleanup'),
  modeClassic: document.getElementById('modeClassic'),
  modeRetention: document.getElementById('modeRetention'),
  scheduleInputsDiv: document.getElementById('scheduleInputs'),
  selectedDatabasesContainer: document.getElementById('selectedDatabasesTags')
};

function populateForm(config) {
  elements.clientName.value = config.clientName || '';
  if (config.database) {
    elements.dbServer.value = config.database.server || '';
    elements.dbUser.value = config.database.user || '';
    elements.dbPass.value = config.database.password || '';
    setSelectedDatabases(config.database.databases || []);
    renderSelectedDatabasesTags();
  }
  if (config.storage) {
    if (config.storage.ftp) {
      const { enabled, host, port, user, password, remoteDir } = config.storage.ftp;
      elements.ftpEnabled.checked = !!enabled;
      elements.ftpHost.value = host || '';
      elements.ftpPort.value = port || 21;
      elements.ftpUser.value = user || '';
      elements.ftpPass.value = password || '';
      elements.ftpRemoteDir.value = remoteDir || '/';
      toggleStorageForm(elements.ftpEnabled, elements.ftpForm);
    }
    if (config.storage.networkPath) {
      elements.networkPathEnabled.checked = !!config.storage.networkPath.enabled;
      elements.networkPath.value = config.storage.networkPath.path || '';
      toggleStorageForm(elements.networkPathEnabled, elements.networkPathForm);
    }
  }
  if (config.retention) {
    const { enabled, localDays, ftpDays, autoCleanup, mode } = config.retention;
    elements.retentionEnabled.checked = enabled !== false;
    elements.localRetentionDays.value = localDays || 7;
    elements.ftpRetentionDays.value = ftpDays || 30;
    elements.autoCleanup.checked = autoCleanup !== false;
    if (mode === 'classic') {
      elements.modeClassic.checked = true;
    } else {
      elements.modeRetention.checked = true;
    }
  }

  elements.scheduleInputsDiv.innerHTML = '';
  const schedules = config.backupSchedule || [];
  if (schedules.length > 0) {
    schedules.forEach(time => addScheduleInput(time));
  } else {
    addScheduleInput("00:00");
  }

  toggleRetentionFields();
}

export async function loadConfig() {
  try {
    toggleButtonLoading(elements.saveButton, true);
    const config = await apiFetch('/api/config');
    setTimeout(() => {
      populateForm(config);
      toggleButtonLoading(elements.saveButton, false);
    }, 600);
  } catch (error) {
    showToast('Erro ao carregar configurações.', 'error');
    toggleButtonLoading(elements.saveButton, false);
  }
}

async function saveConfig(e) {
  e.preventDefault();
  toggleButtonLoading(elements.saveButton, true);

  const localDays = parseInt(elements.localRetentionDays.value, 10);
  const ftpDays = parseInt(elements.ftpRetentionDays.value, 10);

  if (elements.retentionEnabled.checked) {
    if (isNaN(localDays) || localDays < 1 || localDays > 365) {
      showToast('Retenção local deve ser entre 1 e 365 dias.', 'error');
      toggleButtonLoading(elements.saveButton, false);
      return;
    }
    if (isNaN(ftpDays) || ftpDays < 1 || ftpDays > 365) {
      showToast('Retenção FTP deve ser entre 1 e 365 dias.', 'error');
      toggleButtonLoading(elements.saveButton, false);
      return;
    }
  }

  if (getSelectedDatabases().length === 0) {
    showToast('Selecione ao menos um banco de dados para backup.', 'error');
    toggleButtonLoading(elements.saveButton, false);
    elements.selectedDatabasesContainer.classList.add('error');
    setTimeout(() => elements.selectedDatabasesContainer.classList.remove('error'), 2000);
    return;
  }

  const updatedConfig = {
    clientName: elements.clientName.value.trim(),
    storage: {
      ftp: {
        enabled: elements.ftpEnabled.checked,
        host: elements.ftpHost.value.trim(),
        port: parseInt(elements.ftpPort.value, 10) || 21,
        user: elements.ftpUser.value.trim(),
        password: elements.ftpPass.value.trim(),
        remoteDir: elements.ftpRemoteDir.value.trim(),
      },
      networkPath: {
        enabled: elements.networkPathEnabled.checked,
        path: elements.networkPath.value.trim()
      }
    },
    database: {
      server: elements.dbServer.value.trim(),
      user: elements.dbUser.value.trim(),
      password: elements.dbPass.value.trim(),
      databases: getSelectedDatabases(),
    },
    backupSchedule: getScheduleTimes(),
    retention: {
      enabled: elements.retentionEnabled.checked,
      localDays: localDays || 7,
      ftpDays: ftpDays || 30,
      autoCleanup: elements.autoCleanup.checked,
      mode: elements.modeClassic.checked ? 'classic' : 'retention'
    }
  };

  try {
    const result = await apiFetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedConfig)
    });
    showToast(result.message, 'success');
  } catch (error) {
    showToast(error.message || `Erro ao salvar: ${error.message}`, 'error');
  } finally {
    toggleButtonLoading(elements.saveButton, false);
  }
}

function toggleStorageForm(checkbox, form) {
  if (!checkbox || !form) return;
  form.classList.toggle('visible', checkbox.checked);
}

function toggleRetentionFields() {
  const isEnabled = elements.retentionEnabled.checked;
  const isClassic = elements.modeClassic.checked;
  const cleanupButtons = document.querySelector('.cleanup-buttons');

  elements.localRetentionDays.disabled = !isEnabled || isClassic;
  elements.ftpRetentionDays.disabled = !isEnabled || isClassic;
  elements.autoCleanup.disabled = !isEnabled || isClassic;

  if (cleanupButtons) {
    const manualCleanupEnabled = isEnabled && !isClassic;
    cleanupButtons.style.opacity = manualCleanupEnabled ? '1' : '0.5';
    cleanupButtons.style.pointerEvents = manualCleanupEnabled ? 'auto' : 'none';
  }
}

export function setupConfigForm() {
  elements.configForm?.addEventListener('submit', saveConfig);
  elements.ftpEnabled?.addEventListener('change', () => toggleStorageForm(elements.ftpEnabled, elements.ftpForm));
  elements.networkPathEnabled?.addEventListener('change', () => toggleStorageForm(elements.networkPathEnabled, elements.networkPathForm));

  [elements.retentionEnabled, elements.modeClassic, elements.modeRetention].forEach(el => {
    el?.addEventListener('change', toggleRetentionFields);
  });
} 