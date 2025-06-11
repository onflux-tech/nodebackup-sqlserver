document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('themeToggle');
  const sunIcon = document.querySelector('.sun-icon');
  const moonIcon = document.querySelector('.moon-icon');

  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeUI(savedTheme);

  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeUI(newTheme);

    themeToggle.style.transform = 'scale(0.95)';
    setTimeout(() => {
      themeToggle.style.transform = '';
    }, 150);
  });

  function updateThemeUI(theme) {
    if (theme === 'dark') {
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
    } else {
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
    }
  }

  const configForm = document.getElementById('configForm');
  const scheduleInputsDiv = document.getElementById('scheduleInputs');
  const addScheduleButton = document.getElementById('addSchedule');
  const toastContainer = document.getElementById('toast-container');
  const saveButton = document.getElementById('saveButton');
  const clientNameInput = document.getElementById('clientName');

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
  const btnCleanupLocal = document.getElementById('btnCleanupLocal');
  const btnCleanupFtp = document.getElementById('btnCleanupFtp');

  const navTabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');

  function switchTab(targetTab) {
    navTabs.forEach(tab => tab.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    const activeNavTab = document.querySelector(`[data-tab="${targetTab}"]`);
    const activeTabContent = document.getElementById(`tab-${targetTab}`);

    if (activeNavTab && activeTabContent) {
      activeNavTab.classList.add('active');
      activeTabContent.classList.add('active');

      localStorage.setItem('activeTab', targetTab);
    }
  }

  navTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = tab.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  const savedActiveTab = localStorage.getItem('activeTab') || 'database';
  switchTab(savedActiveTab);

  function showToast(message, type = 'success', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const toastContent = document.createElement('div');
    toastContent.className = 'toast-message';
    toastContent.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.innerHTML = '×';
    closeBtn.setAttribute('aria-label', 'Fechar');

    toast.appendChild(toastContent);
    toast.appendChild(closeBtn);
    toastContainer.appendChild(toast);

    const removeToast = () => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    };

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeToast();
    });

    setTimeout(() => toast.classList.add('show'), 10);

    let autoCloseTimer = setTimeout(removeToast, duration);
    let mouseLeaveTimer = null;

    toast.addEventListener('mouseenter', () => {
      clearTimeout(autoCloseTimer);
      clearTimeout(mouseLeaveTimer);
    });

    toast.addEventListener('mouseleave', () => {
      clearTimeout(mouseLeaveTimer);
      mouseLeaveTimer = setTimeout(removeToast, 1000);
    });
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
    clientNameInput.value = config.clientName || '';

    if (config.database) {
      dbServerInput.value = config.database.server || '';
      dbUserInput.value = config.database.user || '';
      dbPassInput.value = config.database.password || '';
    }

    if (config.ftp) {
      ftpHostInput.value = config.ftp.host || '';
      ftpPortInput.value = config.ftp.port || 21;
      ftpUserInput.value = config.ftp.user || '';
      ftpPassInput.value = config.ftp.password || '';
      ftpRemoteDirInput.value = config.ftp.remoteDir || '/';
    }

    const retentionConfig = config.retention || {};
    const retentionEnabledInput = document.getElementById('retentionEnabled');
    const localRetentionDaysInput = document.getElementById('localRetentionDays');
    const ftpRetentionDaysInput = document.getElementById('ftpRetentionDays');
    const autoCleanupInput = document.getElementById('autoCleanup');
    const modeClassicInput = document.getElementById('modeClassic');
    const modeRetentionInput = document.getElementById('modeRetention');

    if (retentionEnabledInput) retentionEnabledInput.checked = retentionConfig.enabled !== false;
    if (localRetentionDaysInput) localRetentionDaysInput.value = retentionConfig.localDays || 7;
    if (ftpRetentionDaysInput) ftpRetentionDaysInput.value = retentionConfig.ftpDays || 30;
    if (autoCleanupInput) autoCleanupInput.checked = retentionConfig.autoCleanup !== false;

    const retentionMode = retentionConfig.mode || 'retention';
    if (modeClassicInput && modeRetentionInput) {
      if (retentionMode === 'classic') {
        modeClassicInput.checked = true;
      } else {
        modeRetentionInput.checked = true;
      }
    }

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
    formGroup.className = 'form-group';

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

    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.innerHTML = '×';
    closeBtn.setAttribute('aria-label', 'Fechar');

    toast.appendChild(content);
    toast.appendChild(closeBtn);
    toastContainer.appendChild(toast);

    const removeToast = () => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    };

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeToast();
    });

    setTimeout(() => toast.classList.add('show'), 10);

    let autoCloseTimer = setTimeout(removeToast, 15000);
    let mouseLeaveTimer = null;

    toast.addEventListener('mouseenter', () => {
      clearTimeout(autoCloseTimer);
      clearTimeout(mouseLeaveTimer);
    });

    toast.addEventListener('mouseleave', () => {
      clearTimeout(mouseLeaveTimer);
      mouseLeaveTimer = setTimeout(removeToast, 2000);
    });
  }

  btnListDbs.addEventListener('click', listDatabases);

  async function testDatabaseConnection() {
    const server = dbServerInput.value.trim();
    const user = dbUserInput.value.trim();
    const pass = dbPassInput.value.trim();

    if (!server || !user) {
      showToast('Por favor, preencha o servidor e usuário.', 'error');
      return;
    }

    let btnTestDb = document.getElementById('btnTestDatabase');
    if (!btnTestDb) {
      btnTestDb = document.createElement('button');
      btnTestDb.id = 'btnTestDatabase';
      btnTestDb.type = 'button';
      btnTestDb.className = 'btn btn-secondary btn-full';
      btnTestDb.innerHTML = '<span class="btn-text">Testar Conexão Detalhada</span><div class="spinner"></div>';
      btnTestDb.style.marginTop = '10px';
      btnListDbs.parentNode.insertBefore(btnTestDb, btnListDbs.nextSibling);
      btnTestDb.addEventListener('click', testDatabaseConnection);
    }

    toggleButtonLoading(btnTestDb, true);

    try {
      const response = await fetch('/api/test-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server, user, password: pass })
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = `<strong>${data.error}</strong><br><br>`;
        errorMessage += `<em>${data.details}</em><br><br>`;

        if (data.diagnostics) {
          errorMessage += '<strong>Diagnóstico:</strong><br>';
          errorMessage += `Servidor: ${data.diagnostics.serverName}<br>`;
          errorMessage += `Código de erro: ${data.diagnostics.errorCode || 'N/A'}<br>`;
          errorMessage += `Tipo de erro: ${data.diagnostics.errorName || 'N/A'}<br>`;
        }

        if (data.suggestions && data.suggestions.length > 0) {
          errorMessage += '<br><strong>Sugestões:</strong><ul>';
          data.suggestions.forEach(suggestion => {
            errorMessage += `<li>${suggestion}</li>`;
          });
          errorMessage += '</ul>';
        }

        showDetailedMessage(errorMessage, 'error');
      } else {
        let successMessage = `<strong>${data.message}</strong><br><br>`;
        successMessage += '<strong>Informações do Servidor:</strong><br>';
        successMessage += `SQL Server: ${data.diagnostics.sqlVersion}<br>`;
        successMessage += `Método: ${data.diagnostics.connectionMethod}<br>`;
        successMessage += `Criptografia: ${data.diagnostics.encryptionEnabled ? 'Habilitada' : 'Desabilitada'}<br><br>`;
        successMessage += '<strong>Permissões:</strong><br>';
        successMessage += `Ver estado do servidor: ${data.diagnostics.permissions.canViewServerState ? '✓' : '✗'}<br>`;
        successMessage += `Ver bancos de dados: ${data.diagnostics.permissions.canViewDatabases ? '✓' : '✗'}`;

        showDetailedMessage(successMessage, 'success');
      }
    } catch (err) {
      console.error('Erro ao testar conexão:', err);
      showToast(`Falha na requisição: ${err.message}`, 'error');
    } finally {
      toggleButtonLoading(btnTestDb, false);
    }
  }

  function showDetailedMessage(htmlContent, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} toast-detailed`;
    toast.style.maxWidth = '600px';
    toast.style.whiteSpace = 'normal';

    const content = document.createElement('div');
    content.className = 'toast-content';
    content.innerHTML = htmlContent;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.innerHTML = '×';
    closeBtn.setAttribute('aria-label', 'Fechar');

    toast.appendChild(content);
    toast.appendChild(closeBtn);
    toastContainer.appendChild(toast);

    const removeToast = () => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    };

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeToast();
    });

    setTimeout(() => toast.classList.add('show'), 10);

    let autoCloseTimer = setTimeout(removeToast, 3000);
    let mouseLeaveTimer = null;

    toast.addEventListener('mouseenter', () => {
      clearTimeout(autoCloseTimer);
      clearTimeout(mouseLeaveTimer);
    });

    toast.addEventListener('mouseleave', () => {
      clearTimeout(mouseLeaveTimer);
      mouseLeaveTimer = setTimeout(removeToast, 2000);
    });
  }

  window.addEventListener('load', () => {
    const btnContainer = btnListDbs.parentNode;
    const btnTestDb = document.createElement('button');
    btnTestDb.id = 'btnTestDatabase';
    btnTestDb.type = 'button';
    btnTestDb.className = 'btn btn-secondary btn-full';
    btnTestDb.innerHTML = '<span class="btn-text">Testar Conexão Detalhada</span><div class="spinner"></div>';
    btnTestDb.style.marginTop = '10px';
    btnContainer.insertBefore(btnTestDb, btnListDbs.nextSibling);
    btnTestDb.addEventListener('click', testDatabaseConnection);
  });

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

  async function cleanupLocal() {
    const retentionEnabledInput = document.getElementById('retentionEnabled');

    if (!retentionEnabledInput || !retentionEnabledInput.checked) {
      showToast('Política de retenção não está habilitada.', 'error');
      return;
    }

    toggleButtonLoading(btnCleanupLocal, true);

    try {
      const response = await fetch('/api/cleanup-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.suggestions && data.suggestions.length > 0) {
          showDetailedErrorToast(data.error, data.details, data.suggestions);
        } else {
          throw new Error(data.error || 'Erro desconhecido na limpeza local.');
        }
        return;
      }

      const removed = data.data ? data.data.removed : 0;
      if (removed > 0) {
        showToast(`${data.message} (${data.data.retentionDays} dias de retenção)`, 'success');
      } else {
        showToast('Nenhum backup antigo encontrado para remoção local.', 'success');
      }
    } catch (err) {
      console.error('Erro na limpeza local:', err);
      showToast(`Erro na limpeza local: ${err.message}`, 'error');
    } finally {
      toggleButtonLoading(btnCleanupLocal, false);
    }
  }

  async function cleanupFtp() {
    const retentionEnabledInput = document.getElementById('retentionEnabled');

    if (!retentionEnabledInput || !retentionEnabledInput.checked) {
      showToast('Política de retenção não está habilitada.', 'error');
      return;
    }

    const ftpHost = ftpHostInput.value.trim();
    if (!ftpHost) {
      showToast('Configure o FTP antes de executar a limpeza remota.', 'error');
      return;
    }

    toggleButtonLoading(btnCleanupFtp, true);

    try {
      const response = await fetch('/api/cleanup-ftp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.suggestions && data.suggestions.length > 0) {
          showDetailedErrorToast(data.error, data.details, data.suggestions);
        } else {
          throw new Error(data.error || 'Erro desconhecido na limpeza FTP.');
        }
        return;
      }

      const removed = data.data ? data.data.removed : 0;
      if (removed > 0) {
        showToast(`${data.message} (${data.data.retentionDays} dias de retenção)`, 'success');
      } else {
        showToast('Nenhum backup antigo encontrado para remoção no FTP.', 'success');
      }
    } catch (err) {
      console.error('Erro na limpeza FTP:', err);
      showToast(`Erro na limpeza FTP: ${err.message}`, 'error');
    } finally {
      toggleButtonLoading(btnCleanupFtp, false);
    }
  }

  btnCleanupLocal.addEventListener('click', cleanupLocal);
  btnCleanupFtp.addEventListener('click', cleanupFtp);

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

    const retentionEnabledInput = document.getElementById('retentionEnabled');
    const localRetentionDaysInput = document.getElementById('localRetentionDays');
    const ftpRetentionDaysInput = document.getElementById('ftpRetentionDays');
    const autoCleanupInput = document.getElementById('autoCleanup');
    const modeClassicInput = document.getElementById('modeClassic');

    const localDays = parseInt(localRetentionDaysInput.value, 10);
    const ftpDays = parseInt(ftpRetentionDaysInput.value, 10);
    const retentionMode = modeClassicInput.checked ? 'classic' : 'retention';

    if (retentionEnabledInput.checked) {
      if (isNaN(localDays) || localDays < 1 || localDays > 365) {
        showToast('Retenção local deve ser entre 1 e 365 dias.', 'error');
        toggleButtonLoading(saveButton, false);
        localRetentionDaysInput.classList.add('error');
        setTimeout(() => localRetentionDaysInput.classList.remove('error'), 2000);
        return;
      }

      if (isNaN(ftpDays) || ftpDays < 1 || ftpDays > 365) {
        showToast('Retenção FTP deve ser entre 1 e 365 dias.', 'error');
        toggleButtonLoading(saveButton, false);
        ftpRetentionDaysInput.classList.add('error');
        setTimeout(() => ftpRetentionDaysInput.classList.remove('error'), 2000);
        return;
      }
    }

    if (dbConfig.databases.length === 0) {
      showToast('Selecione ao menos um banco de dados para backup.', 'error');
      toggleButtonLoading(saveButton, false);
      dbListSelect.classList.add('error');
      setTimeout(() => dbListSelect.classList.remove('error'), 2000);
      return;
    }

    const retentionConfig = {
      enabled: retentionEnabledInput.checked,
      localDays: localDays || 7,
      ftpDays: ftpDays || 30,
      autoCleanup: autoCleanupInput.checked,
      mode: retentionMode
    };

    const updatedConfig = {
      clientName: clientNameInput.value.trim(),
      ftp: ftpConfig,
      database: dbConfig,
      backupSchedule: scheduleTimes,
      retention: retentionConfig
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

  function toggleRetentionFields() {
    const retentionEnabled = document.getElementById('retentionEnabled').checked;
    const modeClassic = document.getElementById('modeClassic').checked;
    const localRetentionDays = document.getElementById('localRetentionDays');
    const ftpRetentionDays = document.getElementById('ftpRetentionDays');
    const autoCleanup = document.getElementById('autoCleanup');
    const cleanupButtons = document.querySelector('.cleanup-buttons');

    const enableFields = retentionEnabled;

    if (localRetentionDays) localRetentionDays.disabled = !enableFields;
    if (ftpRetentionDays) ftpRetentionDays.disabled = !enableFields;
    if (autoCleanup) autoCleanup.disabled = !enableFields;
    if (cleanupButtons) {
      cleanupButtons.style.opacity = enableFields ? '1' : '0.5';
      cleanupButtons.style.pointerEvents = enableFields ? 'auto' : 'none';
    }

    if (modeClassic && enableFields) {
      if (localRetentionDays) {
        localRetentionDays.disabled = true;
        localRetentionDays.title = 'No modo clássico, mantém apenas a versão mais recente';
      }
      if (ftpRetentionDays) {
        ftpRetentionDays.disabled = true;
        ftpRetentionDays.title = 'No modo clássico, sobrescreve automaticamente';
      }
      if (autoCleanup) {
        autoCleanup.disabled = true;
        autoCleanup.title = 'No modo clássico, limpeza é automática por sobrescrita';
      }
      if (cleanupButtons) {
        cleanupButtons.style.opacity = '0.5';
        cleanupButtons.style.pointerEvents = 'none';
      }
    } else {
      if (localRetentionDays) localRetentionDays.title = '';
      if (ftpRetentionDays) ftpRetentionDays.title = '';
      if (autoCleanup) autoCleanup.title = '';
    }
  }

  const retentionEnabled = document.getElementById('retentionEnabled');
  const modeClassic = document.getElementById('modeClassic');
  const modeRetention = document.getElementById('modeRetention');

  if (retentionEnabled) retentionEnabled.addEventListener('change', toggleRetentionFields);
  if (modeClassic) modeClassic.addEventListener('change', toggleRetentionFields);
  if (modeRetention) modeRetention.addEventListener('change', toggleRetentionFields);

  setTimeout(toggleRetentionFields, 100);
});

