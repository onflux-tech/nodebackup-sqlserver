import { apiFetch } from './api.js';
import { showToast, showDetailedErrorToast, toggleButtonLoading } from './ui.js';
import { isValidPhoneNumber } from './utils/validation.js';

let whatsappConfig = {
  api: {
    enabled: false,
    baseUrl: '',
    token: ''
  },
  schedule: {
    sendOnSuccess: false,
    sendOnFailure: true,
    recipients: []
  }
};

export function setupWhatsApp() {
  setupAPIForm();
  setupTestButtons();
  setupRecipientsManager();
  setupPhoneValidation();
}

function setupAPIForm() {
  const whatsappEnabled = document.getElementById('whatsappEnabled');
  const whatsappForm = document.getElementById('whatsappForm');

  if (whatsappEnabled && whatsappForm) {
    whatsappEnabled.addEventListener('change', () => {
      if (whatsappEnabled.checked) {
        whatsappForm.classList.add('visible');
      } else {
        whatsappForm.classList.remove('visible');
      }
      updateWhatsAppConfig();
    });
  }
}

function setupTestButtons() {
  const testConnectionBtn = document.getElementById('btnTestWhatsApp');
  const testMessageBtn = document.getElementById('btnTestMessage');

  if (testConnectionBtn) {
    testConnectionBtn.addEventListener('click', testWhatsAppConnection);
  }

  if (testMessageBtn) {
    testMessageBtn.addEventListener('click', sendTestMessage);
  }
}

async function testWhatsAppConnection() {
  const button = document.getElementById('btnTestWhatsApp');

  try {
    updateWhatsAppConfig();

    if (!whatsappConfig.api.baseUrl || !whatsappConfig.api.token) {
      showToast('Preencha a URL da API e o token', 'error');
      return;
    }

    toggleButtonLoading(button, true);

    const response = await apiFetch('/api/whatsapp/test-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(whatsappConfig.api)
    });

    showToast('Conexão conectada!', 'success');

  } catch (error) {
    console.error('Erro ao testar WhatsApp:', error);

    if (error.suggestions) {
      showDetailedErrorToast(
        error.error || error.message || 'Falha no teste WhatsApp',
        null,
        error.suggestions
      );
    } else {
      showToast(error.error || error.message || 'Erro ao testar conexão WhatsApp', 'error');
    }
  } finally {
    toggleButtonLoading(button, false);
  }
}

async function sendTestMessage() {
  const button = document.getElementById('btnTestMessage');
  const testRecipientInput = document.getElementById('testRecipientWhatsApp');
  const formGroup = testRecipientInput.closest('.form-group');

  try {
    const testRecipient = testRecipientInput?.value;
    formGroup.classList.remove('is-valid', 'is-invalid', 'is-validating');

    if (!testRecipient) {
      showToast('Informe um número para teste', 'error');
      testRecipientInput?.focus();
      return;
    }

    const cleanPhone = isValidPhoneNumber(testRecipient);
    if (!cleanPhone) {
      showToast('Informe um número válido (apenas números, 10-15 dígitos)', 'error');
      testRecipientInput?.focus();
      formGroup.classList.add('is-invalid');
      return;
    }

    toggleButtonLoading(button, true);

    const checkResponse = await apiFetch('/api/whatsapp/check-number', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber: cleanPhone })
    });

    if (!checkResponse.isValid) {
      showToast('O número informado não é um usuário válido do WhatsApp.', 'error');
      formGroup.classList.add('is-invalid');
      toggleButtonLoading(button, false);
      return;
    }

    const response = await apiFetch('/api/whatsapp/test-message', {
      method: 'POST',
      body: JSON.stringify({ testRecipient: cleanPhone })
    });

    showToast(`Mensagem de teste enviada para ${cleanPhone}`, 'success');

  } catch (error) {
    console.error('Erro ao enviar mensagem de teste:', error);
    showToast(error.error || 'Erro ao enviar mensagem de teste', 'error');
  } finally {
    toggleButtonLoading(button, false);
  }
}

function setupRecipientsManager() {
  const addRecipientBtn = document.getElementById('addRecipientWhatsApp');
  const newRecipientInput = document.getElementById('newRecipientWhatsApp');

  if (addRecipientBtn && newRecipientInput) {
    addRecipientBtn.addEventListener('click', addRecipient);

    newRecipientInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addRecipient();
      }
    });
  }

  const sendOnSuccess = document.getElementById('sendOnSuccessWhatsApp');
  const sendOnFailure = document.getElementById('sendOnFailureWhatsApp');

  if (sendOnSuccess) {
    sendOnSuccess.addEventListener('change', () => {
      whatsappConfig.schedule.sendOnSuccess = sendOnSuccess.checked;
    });
  }

  if (sendOnFailure) {
    sendOnFailure.addEventListener('change', () => {
      whatsappConfig.schedule.sendOnFailure = sendOnFailure.checked;
    });
  }
}

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

function setupPhoneValidation() {
  const newRecipientInput = document.getElementById('newRecipientWhatsApp');
  const testRecipientInput = document.getElementById('testRecipientWhatsApp');

  const validate = async (event) => {
    const input = event.target;
    const formGroup = input.closest('.form-group');
    const phone = input.value;

    formGroup.classList.remove('is-valid', 'is-invalid', 'is-validating');

    if (!phone) {
      return;
    }

    if (!isValidPhoneNumber(phone)) {
      formGroup.classList.add('is-invalid');
      return;
    }

    formGroup.classList.add('is-validating');

    try {
      const response = await apiFetch('/api/whatsapp/check-number', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: phone })
      });

      formGroup.classList.remove('is-validating');

      if (response.isValid) {
        formGroup.classList.add('is-valid');
        formGroup.classList.remove('is-invalid');
      } else {
        formGroup.classList.add('is-invalid');
        formGroup.classList.remove('is-valid');
      }
    } catch (error) {
      console.error('Erro ao verificar número:', error);
      formGroup.classList.remove('is-validating');
      formGroup.classList.add('is-invalid');
    }
  };

  const debouncedValidate = debounce(validate, 500);

  if (newRecipientInput) {
    newRecipientInput.addEventListener('input', debouncedValidate);
  }
  if (testRecipientInput) {
    testRecipientInput.addEventListener('input', debouncedValidate);
  }
}

async function addRecipient() {
  const newRecipientInput = document.getElementById('newRecipientWhatsApp');
  const formGroup = newRecipientInput.closest('.form-group');
  const phone = newRecipientInput?.value?.trim();
  formGroup.classList.remove('is-valid', 'is-invalid', 'is-validating');

  if (!phone) {
    showToast('Informe um número de telefone', 'error');
    return;
  }

  const cleanPhone = isValidPhoneNumber(phone);
  if (!cleanPhone) {
    showToast('Informe um número válido (apenas números, 10-15 dígitos)', 'error');
    formGroup.classList.add('is-invalid');
    return;
  }

  if (whatsappConfig.schedule.recipients.includes(cleanPhone)) {
    showToast('Este número já está na lista', 'error');
    return;
  }

  try {
    const checkResponse = await apiFetch('/api/whatsapp/check-number', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber: cleanPhone })
    });

    if (!checkResponse.isValid) {
      showToast('O número informado não é um usuário válido do WhatsApp.', 'error');
      formGroup.classList.add('is-invalid');
      return;
    }
  } catch (error) {
    showToast('Erro ao verificar o número. Tente novamente.', 'error');
    console.error('API check failed:', error);
    return;
  }

  whatsappConfig.schedule.recipients.push(cleanPhone);
  updateRecipientsDisplay();

  newRecipientInput.value = '';
  formGroup.classList.remove('is-valid', 'is-invalid');

  showToast(`Número ${cleanPhone} adicionado à lista`, 'success');
}

function removeRecipient(phone) {
  const index = whatsappConfig.schedule.recipients.indexOf(phone);
  if (index > -1) {
    whatsappConfig.schedule.recipients.splice(index, 1);
    updateRecipientsDisplay();
    showToast(`Número ${phone} removido da lista`, 'success');
  }
}

function updateRecipientsDisplay() {
  const recipientsList = document.getElementById('recipientsListWhatsApp');
  if (!recipientsList) return;

  if (whatsappConfig.schedule.recipients.length === 0) {
    recipientsList.innerHTML = `
      <div class="empty-recipients">
        <i data-lucide="smartphone"></i>
        <span>Nenhum número configurado</span>
        <p>Adicione números para receber notificações</p>
      </div>
    `;
  } else {
    recipientsList.innerHTML = whatsappConfig.schedule.recipients.map(phone => `
      <div class="recipient-item">
        <div class="recipient-email">
          <i data-lucide="smartphone"></i>
          ${phone}
        </div>
        <button type="button" class="remove-recipient" onclick="window.whatsappModule.removeRecipient('${phone}')" title="Remover">
          <i data-lucide="x"></i>
        </button>
      </div>
    `).join('');
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function updateWhatsAppConfig() {
  const whatsappEnabled = document.getElementById('whatsappEnabled');
  const baseUrlInput = document.getElementById('whatsappBaseUrl');
  const tokenInput = document.getElementById('whatsappToken');

  if (whatsappEnabled) {
    whatsappConfig.api.enabled = whatsappEnabled.checked;
  }

  if (baseUrlInput) {
    whatsappConfig.api.baseUrl = baseUrlInput.value;
  }

  if (tokenInput) {
    whatsappConfig.api.token = tokenInput.value;
  }
}

export async function loadWhatsAppConfig() {
  try {
    const response = await apiFetch('/api/whatsapp/config');
    whatsappConfig = response;

    const whatsappEnabled = document.getElementById('whatsappEnabled');
    const whatsappForm = document.getElementById('whatsappForm');
    const baseUrlInput = document.getElementById('whatsappBaseUrl');
    const tokenInput = document.getElementById('whatsappToken');
    const sendOnSuccess = document.getElementById('sendOnSuccessWhatsApp');
    const sendOnFailure = document.getElementById('sendOnFailureWhatsApp');

    if (whatsappEnabled) {
      whatsappEnabled.checked = whatsappConfig.api.enabled;

      if (whatsappConfig.api.enabled && whatsappForm) {
        whatsappForm.classList.add('visible');
      } else if (whatsappForm) {
        whatsappForm.classList.remove('visible');
      }
    }

    if (baseUrlInput) {
      baseUrlInput.value = whatsappConfig.api.baseUrl;
    }

    if (tokenInput) {
      tokenInput.value = whatsappConfig.api.token;
    }

    if (sendOnSuccess) {
      sendOnSuccess.checked = whatsappConfig.schedule.sendOnSuccess;
    }

    if (sendOnFailure) {
      sendOnFailure.checked = whatsappConfig.schedule.sendOnFailure;
    }

    updateRecipientsDisplay();

  } catch (error) {
    console.error('Erro ao carregar configurações WhatsApp:', error);
    showToast('Erro ao carregar configurações WhatsApp', 'error');
  }
}

export async function saveWhatsAppConfig() {
  try {
    updateWhatsAppConfig();

    await apiFetch('/api/whatsapp/config', {
      method: 'POST',
      body: JSON.stringify(whatsappConfig)
    });

    return true;
  } catch (error) {
    console.error('Erro ao salvar configurações WhatsApp:', error);
    showToast(error.error || 'Erro ao salvar configurações WhatsApp', 'error');
    return false;
  }
}

window.whatsappModule = {
  removeRecipient,
  saveWhatsAppConfig
}; 