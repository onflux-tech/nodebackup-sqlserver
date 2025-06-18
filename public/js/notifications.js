import { apiFetch } from './api.js';
import { showToast, showDetailedErrorToast, toggleButtonLoading } from './ui.js';

let notificationConfig = {
  smtp: {
    enabled: false,
    host: '',
    port: 587,
    secure: false,
    user: ''
  },
  schedule: {
    sendOnSuccess: false,
    sendOnFailure: true,
    recipients: []
  }
};

export function setupNotifications() {
  setupSMTPForm();
  setupTestButtons();
  setupRecipientsManager();
}

function setupSMTPForm() {
  const smtpEnabled = document.getElementById('smtpEnabled');
  const smtpForm = document.getElementById('smtpForm');
  const portInput = document.getElementById('smtpPort');
  const secureCheckbox = document.getElementById('smtpSecure');

  if (smtpEnabled && smtpForm) {
    smtpEnabled.addEventListener('change', () => {
      if (smtpEnabled.checked) {
        smtpForm.classList.add('visible');
        smtpForm.style.display = 'block';
      } else {
        smtpForm.classList.remove('visible');
        smtpForm.style.display = 'none';
      }
      notificationConfig.smtp.enabled = smtpEnabled.checked;
    });
  }

  if (portInput && secureCheckbox) {
    portInput.addEventListener('change', () => {
      const port = parseInt(portInput.value);
      if (port === 465) {
        secureCheckbox.checked = true;
        notificationConfig.smtp.secure = true;
      } else if (port === 587 || port === 25) {
        secureCheckbox.checked = false;
        notificationConfig.smtp.secure = false;
      }
    });

    secureCheckbox.addEventListener('change', () => {
      notificationConfig.smtp.secure = secureCheckbox.checked;
    });
  }

  const smtpFields = ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPassword'];
  smtpFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.addEventListener('change', updateSMTPConfig);
    }
  });
}

function updateSMTPConfig() {
  const smtpEnabled = document.getElementById('smtpEnabled');
  const smtpHost = document.getElementById('smtpHost');
  const smtpPort = document.getElementById('smtpPort');
  const smtpSecure = document.getElementById('smtpSecure');
  const smtpUser = document.getElementById('smtpUser');
  const smtpPassword = document.getElementById('smtpPassword');

  notificationConfig.smtp = {
    enabled: smtpEnabled ? smtpEnabled.checked : false,
    host: smtpHost ? smtpHost.value.trim() : '',
    port: smtpPort ? parseInt(smtpPort.value) || 587 : 587,
    secure: smtpSecure ? smtpSecure.checked : false,
    user: smtpUser ? smtpUser.value.trim() : '',
    password: smtpPassword ? smtpPassword.value.trim() : ''
  };
}

function setupTestButtons() {
  const testConnectionBtn = document.getElementById('btnTestSMTP');
  const testEmailBtn = document.getElementById('btnTestEmail');

  if (testConnectionBtn) {
    testConnectionBtn.addEventListener('click', testSMTPConnection);
  }

  if (testEmailBtn) {
    testEmailBtn.addEventListener('click', sendTestEmail);
  }
}

async function testSMTPConnection() {
  const button = document.getElementById('btnTestSMTP');

  try {
    updateSMTPConfig();

    if (!notificationConfig.smtp.host || !notificationConfig.smtp.user || !notificationConfig.smtp.password) {
      showToast('Preencha todos os campos SMTP obrigatórios', 'error');
      return;
    }

    toggleButtonLoading(button, true);

    const response = await apiFetch('/api/notifications/test-smtp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(notificationConfig.smtp)
    });

    showToast('✅ Conexão SMTP testada com sucesso!', 'success');

  } catch (error) {
    console.error('Erro ao testar SMTP:', error);

    if (error.suggestions) {
      showDetailedErrorToast(
        error.error || error.message || 'Falha no teste SMTP',
        null,
        error.suggestions
      );
    } else {
      showToast(error.error || error.message || 'Erro ao testar conexão SMTP', 'error');
    }
  } finally {
    toggleButtonLoading(button, false);
  }
}

async function sendTestEmail() {
  const button = document.getElementById('btnTestEmail');
  const testRecipientInput = document.getElementById('testRecipient');

  try {
    const testRecipient = testRecipientInput?.value;

    if (!testRecipient) {
      showToast('Informe um email para teste', 'error');
      testRecipientInput?.focus();
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testRecipient)) {
      showToast('Informe um email válido', 'error');
      testRecipientInput?.focus();
      return;
    }

    toggleButtonLoading(button, true);

    const response = await apiFetch('/api/notifications/test-email', {
      method: 'POST',
      body: JSON.stringify({ testRecipient })
    });

    showToast(`📧 Email de teste enviado para ${testRecipient}`, 'success');

  } catch (error) {
    console.error('Erro ao enviar email de teste:', error);
    showToast(error.error || 'Erro ao enviar email de teste', 'error');
  } finally {
    toggleButtonLoading(button, false);
  }
}

function setupRecipientsManager() {
  const addRecipientBtn = document.getElementById('addRecipient');
  const newRecipientInput = document.getElementById('newRecipient');

  if (addRecipientBtn && newRecipientInput) {
    addRecipientBtn.addEventListener('click', addRecipient);

    newRecipientInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addRecipient();
      }
    });
  }

  const sendOnSuccess = document.getElementById('sendOnSuccess');
  const sendOnFailure = document.getElementById('sendOnFailure');

  if (sendOnSuccess) {
    sendOnSuccess.addEventListener('change', () => {
      notificationConfig.schedule.sendOnSuccess = sendOnSuccess.checked;
    });
  }

  if (sendOnFailure) {
    sendOnFailure.addEventListener('change', () => {
      notificationConfig.schedule.sendOnFailure = sendOnFailure.checked;
    });
  }
}

function addRecipient() {
  const newRecipientInput = document.getElementById('newRecipient');
  const email = newRecipientInput?.value?.trim();

  if (!email) {
    showToast('Informe um email', 'error');
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showToast('Informe um email válido', 'error');
    return;
  }

  if (notificationConfig.schedule.recipients.includes(email)) {
    showToast('Este email já está na lista', 'error');
    return;
  }

  notificationConfig.schedule.recipients.push(email);
  updateRecipientsDisplay();

  newRecipientInput.value = '';

  showToast(`Email ${email} adicionado à lista`, 'success');
}

function removeRecipient(email) {
  const index = notificationConfig.schedule.recipients.indexOf(email);
  if (index > -1) {
    notificationConfig.schedule.recipients.splice(index, 1);
    updateRecipientsDisplay();
    showToast(`Email ${email} removido da lista`, 'success');
  }
}

function updateRecipientsDisplay() {
  const recipientsList = document.getElementById('recipientsList');
  if (!recipientsList) return;

  if (notificationConfig.schedule.recipients.length === 0) {
    recipientsList.innerHTML = `
      <div class="empty-recipients">
        <i data-lucide="mail"></i>
        <span>Nenhum destinatário configurado</span>
        <p>Adicione emails para receber notificações</p>
      </div>
    `;
  } else {
    recipientsList.innerHTML = notificationConfig.schedule.recipients.map(email => `
      <div class="recipient-item">
        <div class="recipient-email">
          <i data-lucide="mail"></i>
          ${email}
        </div>
        <button type="button" class="remove-recipient" onclick="window.removeRecipient('${email}')" title="Remover">
          <i data-lucide="x"></i>
        </button>
      </div>
    `).join('');
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

export async function loadNotificationConfig() {
  try {
    const response = await apiFetch('/api/notifications/config');
    notificationConfig = response;

    const smtpEnabled = document.getElementById('smtpEnabled');
    const smtpForm = document.getElementById('smtpForm');
    const smtpHost = document.getElementById('smtpHost');
    const smtpPort = document.getElementById('smtpPort');
    const smtpSecure = document.getElementById('smtpSecure');
    const smtpUser = document.getElementById('smtpUser');

    if (smtpEnabled) {
      smtpEnabled.checked = notificationConfig.smtp.enabled;
      if (smtpForm) {
        if (notificationConfig.smtp.enabled) {
          smtpForm.classList.add('visible');
          smtpForm.style.display = 'block';
        } else {
          smtpForm.classList.remove('visible');
          smtpForm.style.display = 'none';
        }
      }
    }

    if (smtpHost) smtpHost.value = notificationConfig.smtp.host;
    if (smtpPort) smtpPort.value = notificationConfig.smtp.port;
    if (smtpSecure) smtpSecure.checked = notificationConfig.smtp.secure;
    if (smtpUser) smtpUser.value = notificationConfig.smtp.user;

    const smtpPassword = document.getElementById('smtpPassword');
    if (smtpPassword && notificationConfig.smtp.password) {
      smtpPassword.value = notificationConfig.smtp.password;
    }

    const sendOnSuccess = document.getElementById('sendOnSuccess');
    const sendOnFailure = document.getElementById('sendOnFailure');

    if (sendOnSuccess) sendOnSuccess.checked = notificationConfig.schedule.sendOnSuccess;
    if (sendOnFailure) sendOnFailure.checked = notificationConfig.schedule.sendOnFailure;

    updateRecipientsDisplay();

  } catch (error) {
    console.error('Erro ao carregar configurações de notificação:', error);
  }
}

export async function saveNotificationConfig() {
  try {
    updateSMTPConfig();

    const sendOnSuccess = document.getElementById('sendOnSuccess');
    const sendOnFailure = document.getElementById('sendOnFailure');

    if (sendOnSuccess) {
      notificationConfig.schedule.sendOnSuccess = sendOnSuccess.checked;
    }

    if (sendOnFailure) {
      notificationConfig.schedule.sendOnFailure = sendOnFailure.checked;
    }

    const response = await apiFetch('/api/notifications/config', {
      method: 'POST',
      body: JSON.stringify(notificationConfig)
    });

    return true;
  } catch (error) {
    console.error('Erro ao salvar configurações de notificação:', error);
    throw error;
  }
}

window.removeRecipient = removeRecipient; 