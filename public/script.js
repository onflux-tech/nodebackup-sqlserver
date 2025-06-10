document.addEventListener('DOMContentLoaded', () => {
  const configForm = document.getElementById('configForm');
  const scheduleInputsDiv = document.getElementById('scheduleInputs');
  const addScheduleButton = document.getElementById('addSchedule');
  const toastContainer = document.getElementById('toast-container');
  const saveButton = document.getElementById('saveButton');

  const ftpHostInput = document.getElementById('ftpHost');
  const ftpPortInput = document.getElementById('ftpPort');
  const ftpUserInput = document.getElementById('ftpUser');
  const ftpPassInput = document.getElementById('ftpPass');
  const ftpRemoteDirInput = document.getElementById('ftpRemoteDir');

  const dbServerInput = document.getElementById('dbServer');
  const dbUserInput = document.getElementById('dbUser');
  const dbPassInput = document.getElementById('dbPass');
  const btnListDbs = document.getElementById('btnListDatabases');
  const dbListSelect = document.getElementById('dbList');
  const btnTestFtp = document.getElementById('btnTestFtp');
  const logoutButton = document.getElementById('logoutButton');

  document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('mousedown', function (e) {
      const x = e.clientX - this.getBoundingClientRect().left;
      const y = e.clientY - this.getBoundingClientRect().top;

      const ripple = document.createElement('span');
      ripple.style.position = 'absolute';
      ripple.style.width = '1px';
      ripple.style.height = '1px';
      ripple.style.borderRadius = '50%';
      ripple.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
      ripple.style.transform = 'scale(0)';
      ripple.style.animation = 'ripple 0.6s linear';
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;

      this.style.position = 'relative';
      this.style.overflow = 'hidden';
      this.appendChild(ripple);

      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  });

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => toast.remove());
    }, 4000);
  }

  function toggleButtonLoading(button, isLoading) {
    button.disabled = isLoading;
    const textElement = button.querySelector('.btn-text');
    if (textElement) textElement.style.display = isLoading ? 'none' : 'inline-block';
    const spinnerElement = button.querySelector('.spinner');
    if (spinnerElement) spinnerElement.style.display = isLoading ? 'inline-block' : 'none';
  }

  function updateScheduleLabels() {
    const allScheduleGroups = scheduleInputsDiv.querySelectorAll('.form-group');
    allScheduleGroups.forEach((group, index) => {
      const label = group.querySelector('label');
      if (label) {
        label.textContent = `Horário ${index + 1}`;
      }
    });
  }

  async function loadConfig() {
    try {
      toggleButtonLoading(saveButton, true);

      const response = await fetch('/api/config');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const config = await response.json();

      setTimeout(() => {
        populateForm(config);
        toggleButtonLoading(saveButton, false);
      }, 600);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      showToast('Erro ao carregar configurações.', 'error');
      toggleButtonLoading(saveButton, false);
    }
  }

  function populateForm(config) {
    ftpHostInput.value = (config.ftp && config.ftp.host) || '';
    ftpPortInput.value = (config.ftp && config.ftp.port) || 21;
    ftpUserInput.value = (config.ftp && config.ftp.user) || '';
    ftpPassInput.value = (config.ftp && config.ftp.password) || '';
    ftpRemoteDirInput.value = (config.ftp && config.ftp.remoteDir) || '';

    dbServerInput.value = (config.database && config.database.server) || '';
    dbUserInput.value = (config.database && config.database.user) || '';
    dbPassInput.value = (config.database && config.database.password) || '';

    const selectedDbs = (config.database && config.database.databases) || [];
    dbListSelect.innerHTML = '';
    selectedDbs.forEach(dbName => {
      const opt = document.createElement('option');
      opt.value = dbName;
      opt.textContent = dbName;
      opt.selected = true;
      dbListSelect.appendChild(opt);
    });

    if (selectedDbs.length === 0 && config.database && config.database.server && config.database.user) {
      listDatabases();
    }

    scheduleInputsDiv.innerHTML = '';
    const schedules = config.backupSchedule || [];
    if (schedules.length > 0) {
      schedules.forEach(addScheduleInput);
    } else {
      addScheduleInput("00:00");
    }
  }

  function addScheduleInput(value = '') {
    const scheduleCount = scheduleInputsDiv.querySelectorAll('.form-group').length + 1;
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group new-item';

    const label = document.createElement('label');
    label.textContent = `Horário ${scheduleCount}`;
    const inputId = `schedule-time-${Date.now()}`;
    label.htmlFor = inputId;

    const inputContainer = document.createElement('div');
    inputContainer.className = 'schedule-input-group';

    const input = document.createElement('input');
    input.type = 'text';
    input.id = inputId;
    input.className = 'schedule-time';
    input.value = value;
    input.placeholder = 'HH:MM';
    input.maxLength = 5;
    input.addEventListener('input', formatTimeInput);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-icon remove';
    removeBtn.title = 'Remover horário';
    removeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#f56565" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8z"/></svg>`;

    removeBtn.addEventListener('click', function () {
      if (scheduleInputsDiv.querySelectorAll('.form-group').length <= 1) {
        showToast('É necessário ter pelo menos um horário.', 'error');
        return;
      }

      formGroup.classList.add('removing');

      setTimeout(() => {
        formGroup.remove();
        updateScheduleLabels();
      }, 300);
    });

    formGroup.appendChild(label);

    inputContainer.appendChild(input);
    inputContainer.appendChild(removeBtn);

    formGroup.appendChild(inputContainer);

    scheduleInputsDiv.appendChild(formGroup);

    if (value === '') {
      setTimeout(() => input.focus(), 100);
    }
  }

  function formatTimeInput(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 2) {
      value = value.substring(0, 2) + ':' + value.substring(2, 4);
    }
    e.target.value = value;

    if (value.length === 5) {
      const [hours, minutes] = value.split(':').map(Number);

      if (hours > 23) {
        e.target.value = '23:' + minutes.toString().padStart(2, '0');
      }

      if (minutes > 59) {
        e.target.value = hours.toString().padStart(2, '0') + ':59';
      }
    }
  }

  addScheduleButton.addEventListener('click', () => {
    addScheduleInput();
    addScheduleButton.style.transform = 'scale(0.95)';
    setTimeout(() => {
      addScheduleButton.style.transform = '';
    }, 150);
  });

  async function listDatabases() {
    const server = dbServerInput.value.trim();
    const user = dbUserInput.value.trim();
    const pass = dbPassInput.value.trim();

    if (!server || !user) {
      showToast('Preencha Servidor e Usuário do banco.', 'error');
      return;
    }

    toggleButtonLoading(btnListDbs, true);
    dbListSelect.innerHTML = '';

    try {
      const response = await fetch(`/api/list-databases?server=${encodeURIComponent(server)}&user=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`);
      const data = await response.json();
      if (!response.ok) {
        if (data.suggestions && data.suggestions.length > 0) {
          showDetailedErrorToast(data.error, data.details, data.suggestions);
        } else {
          throw new Error(data.error || 'Erro desconhecido ao listar bancos.');
        }
        return;
      }
      if (data.databases && data.databases.length > 0) {
        renderDatabaseList(data.databases);
        showToast('Bancos listados com sucesso!', 'success');
      } else {
        showToast('Nenhum banco de dados encontrado.', 'success');
      }
    } catch (err) {
      console.error('Erro ao listar bancos:', err);
      showToast(`Falha: ${err.message}`, 'error');
    } finally {
      toggleButtonLoading(btnListDbs, false);
    }
  }

  function renderDatabaseList(dbArray) {
    dbListSelect.innerHTML = '';
    dbArray.forEach((dbName, index) => {
      const opt = document.createElement('option');
      opt.value = dbName;
      opt.textContent = dbName;

      opt.style.opacity = '0';
      opt.style.transform = 'translateY(10px)';

      dbListSelect.appendChild(opt);

      setTimeout(() => {
        opt.style.transition = 'all 0.2s ease';
        opt.style.opacity = '1';
        opt.style.transform = 'translateY(0)';
      }, index * 30);
    });
  }

  function showDetailedErrorToast(mainError, details, suggestions) {
    const toast = document.createElement('div');
    toast.className = 'toast toast-error toast-detailed';

    const content = document.createElement('div');
    content.className = 'toast-content';

    const title = document.createElement('div');
    title.className = 'toast-title';
    title.textContent = mainError;
    content.appendChild(title);

    if (details) {
      const detailsDiv = document.createElement('div');
      detailsDiv.className = 'toast-details';
      detailsDiv.textContent = details;
      content.appendChild(detailsDiv);
    }

    if (suggestions && suggestions.length > 0) {
      const suggestionsDiv = document.createElement('div');
      suggestionsDiv.className = 'toast-suggestions';
      suggestionsDiv.innerHTML = '<strong>Sugestões:</strong>';
      const ul = document.createElement('ul');
      suggestions.forEach(suggestion => {
        const li = document.createElement('li');
        li.textContent = suggestion;
        ul.appendChild(li);
      });
      suggestionsDiv.appendChild(ul);
      content.appendChild(suggestionsDiv);
    }

    toast.appendChild(content);
    toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => toast.remove());
    }, 10000);
  }

  btnListDbs.addEventListener('click', listDatabases);

  async function testFtpConnection() {
    const host = ftpHostInput.value.trim();
    const port = parseInt(ftpPortInput.value, 10) || 21;
    const user = ftpUserInput.value.trim();
    const password = ftpPassInput.value.trim();
    const remoteDir = ftpRemoteDirInput.value.trim() || '/';

    if (!host || !user || !password) {
      showToast('Preencha Host, Usuário e Senha do FTP.', 'error');
      return;
    }

    toggleButtonLoading(btnTestFtp, true);

    try {
      const response = await fetch('/api/test-ftp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port, user, password, remoteDir })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.suggestions && data.suggestions.length > 0) {
          showDetailedErrorToast(data.error, data.details, data.suggestions);
        } else {
          throw new Error(data.error || 'Erro desconhecido ao testar FTP.');
        }
        return;
      }

      showToast(data.message || 'Conexão FTP testada com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao testar FTP:', err);
      showToast(`Falha: ${err.message}`, 'error');
    } finally {
      toggleButtonLoading(btnTestFtp, false);
    }
  }

  btnTestFtp.addEventListener('click', testFtpConnection);

  logoutButton.addEventListener('click', async () => {
    try {
      const response = await fetch('/api/logout', { method: 'POST' });
      if (response.ok) {
        window.location.href = '/login.html';
      } else {
        showToast('Falha ao tentar sair.', 'error');
      }
    } catch (error) {
      showToast('Erro de conexão ao tentar sair.', 'error');
    }
  });

  const inputs = document.querySelectorAll('input[type="text"], input[type="password"], input[type="number"]');
  inputs.forEach(input => {
    input.addEventListener('blur', function () {
      if (this.hasAttribute('required') && !this.value.trim()) {
        this.classList.add('error');
      } else {
        this.classList.remove('error');
      }
    });
  });

  configForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    toggleButtonLoading(saveButton, true);

    const ftpConfig = {
      host: ftpHostInput.value.trim(),
      port: parseInt(ftpPortInput.value, 10) || 21,
      user: ftpUserInput.value.trim(),
      password: ftpPassInput.value.trim(),
      remoteDir: ftpRemoteDirInput.value.trim(),
    };

    const selectedOptions = Array.from(dbListSelect.selectedOptions);
    const dbConfig = {
      server: dbServerInput.value.trim(),
      user: dbUserInput.value.trim(),
      password: dbPassInput.value.trim(),
      databases: selectedOptions.map(opt => opt.value),
    };

    const scheduleTimes = Array.from(document.querySelectorAll('.schedule-time'))
      .map(input => input.value.trim())
      .filter(value => /^\d{2}:\d{2}$/.test(value));

    if (dbConfig.databases.length === 0) {
      showToast('Selecione ao menos um banco de dados para backup.', 'error');
      toggleButtonLoading(saveButton, false);
      dbListSelect.classList.add('error');
      setTimeout(() => dbListSelect.classList.remove('error'), 2000);
      return;
    }

    const updatedConfig = {
      ftp: ftpConfig,
      database: dbConfig,
      backupSchedule: scheduleTimes,
    };

    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Erro desconhecido ao salvar.');
      }
      showToast(result.message, 'success');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      showToast(`Erro ao salvar: ${error.message}`, 'error');
    } finally {
      toggleButtonLoading(saveButton, false);
    }
  });

  const style = document.createElement('style');
  style.textContent = `
    @keyframes ripple {
      from {
        transform: scale(0);
        opacity: 1;
      }
      to {
        transform: scale(300);
        opacity: 0;
      }
    }
    
    @keyframes removing {
      to {
        opacity: 0;
        transform: translateX(30px);
      }
    }
    
    .removing {
      animation: removing 0.3s ease forwards;
    }
    
    .error {
      border-color: var(--error-color) !important;
      animation: shake 0.5s linear;
    }
    
    @keyframes shake {
      0% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      50% { transform: translateX(5px); }
      75% { transform: translateX(-5px); }
      100% { transform: translateX(0); }
    }
  `;
  document.head.appendChild(style);

  loadConfig();
});

