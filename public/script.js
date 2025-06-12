document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('themeToggle');
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const mobileOverlay = document.getElementById('mobile-overlay');

  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    setTimeout(() => {
      lucide.createIcons();
    }, 50);

    setTimeout(() => {
      const historyTab = document.querySelector('[data-tab="history"]');
      if (historyTab && historyTab.classList.contains('active') && !isHistoryLoading) {
        lastCalculatedLimit = 0;
        loadHistory(historyCurrentPage || 1, true);
      }
    }, 400);
  });

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

  const configForm = document.getElementById('configForm');
  const scheduleInputsDiv = document.getElementById('scheduleInputs');
  const addScheduleButton = document.getElementById('addSchedule');
  const toastContainer = document.getElementById('toast-container');
  const saveButton = document.getElementById('saveButton');
  const clientNameInput = document.getElementById('clientName');

  const ftpEnabledCheckbox = document.getElementById('ftpEnabled');
  const ftpForm = document.getElementById('ftpForm');
  const networkPathEnabledCheckbox = document.getElementById('networkPathEnabled');
  const networkPathForm = document.getElementById('networkPathForm');
  const networkPathInput = document.getElementById('networkPath');
  const browsePathBtn = document.getElementById('browsePathBtn');

  const ftpHostInput = document.getElementById('ftpHost');
  const ftpPortInput = document.getElementById('ftpPort');
  const ftpUserInput = document.getElementById('ftpUser');
  const ftpPassInput = document.getElementById('ftpPass');
  const ftpRemoteDirInput = document.getElementById('ftpRemoteDir');

  const dbServerInput = document.getElementById('dbServer');
  const dbUserInput = document.getElementById('dbUser');
  const dbPassInput = document.getElementById('dbPass');
  const btnListDbs = document.getElementById('btnListDatabases');
  const selectedDatabasesContainer = document.getElementById('selectedDatabasesTags');
  const btnTestFtp = document.getElementById('btnTestFtp');
  const logoutButton = document.getElementById('logoutButton');
  const btnCleanupLocal = document.getElementById('btnCleanupLocal');
  const btnCleanupFtp = document.getElementById('btnCleanupFtp');

  const databaseSelectorModal = document.getElementById('databaseSelectorModal');
  const closeDatabaseSelectorBtn = document.getElementById('closeDatabaseSelector');
  const databaseList = document.getElementById('databaseList');
  const selectionCount = document.getElementById('selectionCount');
  const selectAllDbsBtn = document.getElementById('selectAllDbs');
  const clearAllDbsBtn = document.getElementById('clearAllDbs');
  const cancelDatabaseSelectionBtn = document.getElementById('cancelDatabaseSelection');
  const confirmDatabaseSelectionBtn = document.getElementById('confirmDatabaseSelection');

  let availableDatabases = [];
  let selectedDatabases = [];

  const navItems = document.querySelectorAll('.nav-item');
  const tabContents = document.querySelectorAll('.tab-content');

  const historyTab = document.querySelector('[data-tab="history"]');
  const historyStats = {
    total: document.getElementById('stats-total'),
    success: document.getElementById('stats-success'),
    failed: document.getElementById('stats-failed'),
    avgDuration: document.getElementById('stats-avg-duration'),
    totalSize: document.getElementById('stats-total-size'),
  };
  const historyTableBody = document.querySelector('#history-table tbody');
  const statusFilter = document.getElementById('status-filter');
  const historyPagination = {
    prev: document.getElementById('prev-page'),
    next: document.getElementById('next-page'),
    info: document.getElementById('page-info'),
  };
  const backupDetailsModal = document.getElementById('backupDetailsModal');
  const backupDetailsContent = document.getElementById('backupDetailsContent');
  const backupDetailsTitle = document.getElementById('backupDetailsTitle');
  const closeBackupDetailsModalBtn = document.getElementById('closeBackupDetailsModal');
  let historyCurrentPage = 1;
  let historyTotalPages = 1;
  let historyResizeObserver;
  let lastCalculatedLimit = 0;
  let historyDebounceTimer = null;
  let isHistoryLoading = false;
  let currentHistoryData = [];

  function switchTab(targetTab) {
    navItems.forEach(nav => nav.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    const activeNavItem = document.querySelector(`[data-tab="${targetTab}"]`);
    const activeTabContent = document.getElementById(`tab-${targetTab}`);

    if (activeNavItem && activeTabContent) {
      activeNavItem.classList.add('active');
      activeTabContent.classList.add('active');

      localStorage.setItem('activeTab', targetTab);

      if (targetTab === 'history') {
        loadHistoryTab();
      }
    }
  }

  navItems.forEach(navItem => {
    navItem.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = navItem.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  let savedActiveTab = localStorage.getItem('activeTab') || 'database';
  if (savedActiveTab === 'ftp') {
    savedActiveTab = 'storage';
    localStorage.setItem('activeTab', 'storage');
  }
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
    const allScheduleItems = scheduleInputsDiv.querySelectorAll('.schedule-item');
    allScheduleItems.forEach((item, index) => {
      const label = item.querySelector('.schedule-label');
      if (label) {
        label.textContent = `Horário ${index + 1}:`;
      }
    });
  }

  function renderSelectedDatabasesTags() {
    if (selectedDatabases.length === 0) {
      selectedDatabasesContainer.innerHTML = `
        <div class="empty-selection">
          <i data-lucide="database"></i>
          <span>Nenhum banco selecionado</span>
          <p>Clique em "Listar Bancos" para selecionar</p>
        </div>
      `;
      selectedDatabasesContainer.classList.remove('has-selection');
    } else {
      const tagsHtml = selectedDatabases.map(dbName => `
        <div class="database-tag">
          <i data-lucide="database"></i>
          <span>${dbName}</span>
          <button type="button" class="tag-remove" data-db="${dbName}" title="Remover ${dbName}">
            <i data-lucide="x"></i>
          </button>
        </div>
      `).join('');

      selectedDatabasesContainer.innerHTML = `
        <div class="database-tags">
          ${tagsHtml}
        </div>
      `;
      selectedDatabasesContainer.classList.add('has-selection');

      selectedDatabasesContainer.querySelectorAll('.tag-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const dbName = e.currentTarget.getAttribute('data-db');
          removeSelectedDatabase(dbName);
        });
      });
    }

    setTimeout(() => {
      lucide.createIcons();
    }, 50);
  }

  function removeSelectedDatabase(dbName) {
    selectedDatabases = selectedDatabases.filter(db => db !== dbName);
    renderSelectedDatabasesTags();
  }

  function openDatabaseSelectorModal() {
    databaseSelectorModal.classList.add('show');
    loadDatabasesInModal();
    setTimeout(() => {
      lucide.createIcons();
    }, 100);
  }

  function closeDatabaseSelectorModal() {
    databaseSelectorModal.classList.remove('show');
  }

  function loadDatabasesInModal() {
    const server = dbServerInput.value.trim();
    const user = dbUserInput.value.trim();
    const pass = dbPassInput.value.trim();

    if (!server || !user) {
      databaseList.innerHTML = `
        <div class="loading-databases">
          <i data-lucide="alert-circle" style="color: var(--error-500);"></i>
          <p>Preencha servidor e usuário primeiro</p>
        </div>
      `;
      setTimeout(() => lucide.createIcons(), 50);
      return;
    }

    databaseList.innerHTML = `
      <div class="loading-databases">
        <div class="spinner" style="display: block; margin: 2rem auto;"></div>
        <p>Carregando bancos de dados...</p>
      </div>
    `;

    listDatabasesForModal(server, user, pass);
  }

  async function listDatabasesForModal(server, user, pass) {
    try {
      const response = await fetch(`/api/list-databases?server=${encodeURIComponent(server)}&user=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`);
      const data = await response.json();

      if (!response.ok) {
        if (data.suggestions && data.suggestions.length > 0) {
          showDetailedErrorToast(data.error, data.details, data.suggestions);
        } else {
          throw new Error(data.error || 'Erro desconhecido ao listar bancos.');
        }

        databaseList.innerHTML = `
          <div class="loading-databases">
            <i data-lucide="alert-circle" style="color: var(--error-500);"></i>
            <p>Erro ao carregar bancos</p>
          </div>
        `;
        return;
      }

      if (data.databases && data.databases.length > 0) {
        availableDatabases = data.databases;
        renderDatabaseList();
        showToast('Bancos listados com sucesso!', 'success');
      } else {
        databaseList.innerHTML = `
          <div class="loading-databases">
            <i data-lucide="database" style="color: var(--text-muted);"></i>
            <p>Nenhum banco de dados encontrado</p>
          </div>
        `;
      }
    } catch (err) {
      console.error('Erro ao listar bancos:', err);
      databaseList.innerHTML = `
        <div class="loading-databases">
          <i data-lucide="alert-circle" style="color: var(--error-500);"></i>
          <p>Falha ao conectar: ${err.message}</p>
        </div>
      `;
    } finally {
      setTimeout(() => lucide.createIcons(), 50);
    }
  }

  function renderDatabaseList() {
    const listHtml = availableDatabases.map(dbName => {
      const isSelected = selectedDatabases.includes(dbName);
      return `
        <div class="database-list-item ${isSelected ? 'selected' : ''}" data-db="${dbName}">
          <input type="checkbox" class="database-checkbox" ${isSelected ? 'checked' : ''} data-db="${dbName}">
          <i data-lucide="database" class="database-icon"></i>
          <span class="database-name">${dbName}</span>
        </div>
      `;
    }).join('');

    databaseList.innerHTML = listHtml;
    updateSelectionCount();

    databaseList.querySelectorAll('.database-list-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.type !== 'checkbox') {
          const checkbox = item.querySelector('.database-checkbox');
          checkbox.checked = !checkbox.checked;
          toggleDatabaseSelection(checkbox);
        }
      });
    });

    databaseList.querySelectorAll('.database-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', () => toggleDatabaseSelection(checkbox));
    });

    setTimeout(() => lucide.createIcons(), 50);
  }

  function toggleDatabaseSelection(checkbox) {
    const dbName = checkbox.getAttribute('data-db');
    const item = checkbox.closest('.database-list-item');

    if (checkbox.checked) {
      if (!selectedDatabases.includes(dbName)) {
        selectedDatabases.push(dbName);
      }
      item.classList.add('selected');
    } else {
      selectedDatabases = selectedDatabases.filter(db => db !== dbName);
      item.classList.remove('selected');
    }

    updateSelectionCount();
  }

  function updateSelectionCount() {
    const count = selectedDatabases.length;
    selectionCount.textContent = `${count} banco${count !== 1 ? 's' : ''} selecionado${count !== 1 ? 's' : ''}`;
  }

  function selectAllDatabases() {
    selectedDatabases = [...availableDatabases];
    renderDatabaseList();
  }

  function clearAllDatabases() {
    selectedDatabases = [];
    renderDatabaseList();
  }

  function confirmDatabaseSelection() {
    renderSelectedDatabasesTags();
    closeDatabaseSelectorModal();
    showToast(`${selectedDatabases.length} banco(s) selecionado(s)`, 'success');
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
        setTimeout(() => {
          if (typeof toggleRetentionFields === 'function') {
            toggleRetentionFields();
          }
        }, 100);
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

    if (config.storage) {
      if (config.storage.ftp) {
        const ftpConfig = config.storage.ftp;
        ftpEnabledCheckbox.checked = !!ftpConfig.enabled;
        ftpHostInput.value = ftpConfig.host || '';
        ftpPortInput.value = ftpConfig.port || 21;
        ftpUserInput.value = ftpConfig.user || '';
        ftpPassInput.value = ftpConfig.password || '';
        ftpRemoteDirInput.value = ftpConfig.remoteDir || '/';
        toggleStorageForm(ftpEnabledCheckbox, ftpForm);
      }
      if (config.storage.networkPath) {
        const networkConfig = config.storage.networkPath;
        networkPathEnabledCheckbox.checked = !!networkConfig.enabled;
        if (networkPathInput) networkPathInput.value = networkConfig.path || '';
        toggleStorageForm(networkPathEnabledCheckbox, networkPathForm);
      }
    } else if (config.ftp && config.ftp.host) {
      ftpEnabledCheckbox.checked = true;
      ftpHostInput.value = config.ftp.host || '';
      ftpPortInput.value = config.ftp.port || 21;
      ftpUserInput.value = config.ftp.user || '';
      ftpPassInput.value = config.ftp.password || '';
      ftpRemoteDirInput.value = config.ftp.remoteDir || '/';
      toggleStorageForm(ftpEnabledCheckbox, ftpForm);
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
        modeRetentionInput.checked = false;
      } else {
        modeRetentionInput.checked = true;
        modeClassicInput.checked = false;
      }

      setTimeout(() => {
        toggleRetentionFields();
      }, 50);
    }

    const selectedDbs = (config.database && config.database.databases) || [];
    selectedDatabases = [...selectedDbs];
    renderSelectedDatabasesTags();

    scheduleInputsDiv.innerHTML = '';
    const schedules = config.backupSchedule || [];
    if (schedules.length > 0) {
      schedules.forEach(addScheduleInput);
    } else {
      addScheduleInput("00:00");
    }
  }

  function addScheduleInput(value = '') {
    const scheduleCount = scheduleInputsDiv.querySelectorAll('.schedule-item').length + 1;
    const scheduleItem = document.createElement('div');
    scheduleItem.className = 'schedule-item';

    const label = document.createElement('label');
    label.textContent = `Horário ${scheduleCount}:`;
    label.className = 'schedule-label';

    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'input-wrapper';

    const clockIcon = document.createElement('i');
    clockIcon.setAttribute('data-lucide', 'clock');
    clockIcon.className = 'input-icon';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'schedule-time';
    input.value = value;
    input.placeholder = 'HH:MM';
    input.maxLength = 5;
    input.addEventListener('input', formatTimeInput);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-outline btn-sm';
    removeBtn.title = 'Remover horário';

    const removeIcon = document.createElement('i');
    removeIcon.setAttribute('data-lucide', 'trash-2');
    removeBtn.appendChild(removeIcon);

    removeBtn.addEventListener('click', function () {
      if (scheduleInputsDiv.querySelectorAll('.schedule-item').length <= 1) {
        showToast('É necessário ter pelo menos um horário.', 'error');
        return;
      }

      scheduleItem.style.opacity = '0';
      scheduleItem.style.transform = 'translateX(20px)';

      setTimeout(() => {
        scheduleItem.remove();
        updateScheduleLabels();
      }, 300);
    });

    inputWrapper.appendChild(clockIcon);
    inputWrapper.appendChild(input);

    scheduleItem.appendChild(label);
    scheduleItem.appendChild(inputWrapper);
    scheduleItem.appendChild(removeBtn);

    scheduleInputsDiv.appendChild(scheduleItem);

    lucide.createIcons();

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

    try {
      openDatabaseSelectorModal();
    } catch (err) {
      console.error('Erro ao abrir modal de seleção:', err);
      showToast(`Falha: ${err.message}`, 'error');
    } finally {
      toggleButtonLoading(btnListDbs, false);
    }
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

  if (closeDatabaseSelectorBtn) {
    closeDatabaseSelectorBtn.addEventListener('click', closeDatabaseSelectorModal);
  }

  if (cancelDatabaseSelectionBtn) {
    cancelDatabaseSelectionBtn.addEventListener('click', closeDatabaseSelectorModal);
  }

  if (confirmDatabaseSelectionBtn) {
    confirmDatabaseSelectionBtn.addEventListener('click', confirmDatabaseSelection);
  }

  if (selectAllDbsBtn) {
    selectAllDbsBtn.addEventListener('click', selectAllDatabases);
  }

  if (clearAllDbsBtn) {
    clearAllDbsBtn.addEventListener('click', clearAllDatabases);
  }

  window.addEventListener('click', (e) => {
    if (e.target === databaseSelectorModal) {
      closeDatabaseSelectorModal();
    }
  });

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
    if (!ftpEnabledCheckbox.checked) {
      showToast('Para testar, habilite primeiro o armazenamento FTP.', 'error');
      return;
    }

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

    if (!ftpEnabledCheckbox.checked) {
      showToast('Armazenamento FTP não está habilitado. A limpeza remota não será executada.', 'error');
      return;
    }

    const ftpHost = ftpHostInput.value.trim();
    if (!ftpHost) {
      showToast('Configure o host do FTP antes de executar a limpeza remota.', 'error');
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
      enabled: ftpEnabledCheckbox.checked,
      host: ftpHostInput.value.trim(),
      port: parseInt(ftpPortInput.value, 10) || 21,
      user: ftpUserInput.value.trim(),
      password: ftpPassInput.value.trim(),
      remoteDir: ftpRemoteDirInput.value.trim(),
    };

    const networkPathConfig = {
      enabled: networkPathEnabledCheckbox.checked,
      path: networkPathInput.value.trim()
    };

    const storageConfig = {
      ftp: ftpConfig,
      networkPath: networkPathConfig
    };

    const dbConfig = {
      server: dbServerInput.value.trim(),
      user: dbUserInput.value.trim(),
      password: dbPassInput.value.trim(),
      databases: [...selectedDatabases],
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
      selectedDatabasesContainer.classList.add('error');
      setTimeout(() => selectedDatabasesContainer.classList.remove('error'), 2000);
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
      storage: storageConfig,
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

  setTimeout(() => {
    lucide.createIcons();
  }, 100);

  function toggleRetentionFields() {
    const retentionEnabledEl = document.getElementById('retentionEnabled');
    const modeClassicEl = document.getElementById('modeClassic');

    if (!retentionEnabledEl || !modeClassicEl) {
      console.debug('Elementos de retenção ainda não carregados');
      return;
    }

    const retentionEnabled = retentionEnabledEl.checked;
    const modeClassic = modeClassicEl.checked;
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
    } else if (enableFields) {
      if (localRetentionDays) {
        localRetentionDays.title = '';
        localRetentionDays.disabled = false;
      }
      if (ftpRetentionDays) {
        ftpRetentionDays.title = '';
        ftpRetentionDays.disabled = false;
      }
      if (autoCleanup) {
        autoCleanup.title = '';
        autoCleanup.disabled = false;
      }
      if (cleanupButtons) {
        cleanupButtons.style.opacity = '1';
        cleanupButtons.style.pointerEvents = 'auto';
      }
    }
  }

  const retentionEnabled = document.getElementById('retentionEnabled');
  const modeClassic = document.getElementById('modeClassic');
  const modeRetention = document.getElementById('modeRetention');

  if (retentionEnabled) retentionEnabled.addEventListener('change', toggleRetentionFields);
  if (modeClassic) modeClassic.addEventListener('change', toggleRetentionFields);
  if (modeRetention) modeRetention.addEventListener('change', toggleRetentionFields);

  setTimeout(() => {
    if (typeof toggleRetentionFields === 'function') {
      toggleRetentionFields();
    }
  }, 200);

  function toggleStorageForm(checkbox, form) {
    if (!checkbox || !form) return;
    if (checkbox.checked) {
      form.classList.add('visible');
    } else {
      form.classList.remove('visible');
    }
  }

  if (ftpEnabledCheckbox) {
    ftpEnabledCheckbox.addEventListener('change', () => toggleStorageForm(ftpEnabledCheckbox, ftpForm));
    toggleStorageForm(ftpEnabledCheckbox, ftpForm);
  }
  if (networkPathEnabledCheckbox) {
    networkPathEnabledCheckbox.addEventListener('change', () => toggleStorageForm(networkPathEnabledCheckbox, networkPathForm));
    toggleStorageForm(networkPathEnabledCheckbox, networkPathForm);
  }

  if (browsePathBtn) {
    browsePathBtn.addEventListener('click', () => {
      folderBrowserModal.classList.add('show');
      loadAndDisplayPath();
      setTimeout(() => {
        lucide.createIcons();
      }, 100);
    });
  }

  const folderBrowserModal = document.getElementById('folderBrowserModal');
  const closeFolderBrowserBtn = document.getElementById('closeFolderBrowser');
  const levelUpBtn = document.getElementById('levelUpBtn');
  const homeDrivesBtn = document.getElementById('homeDrivesBtn');
  const currentPathInput = document.getElementById('currentPathInput');
  const folderListDiv = document.getElementById('folderList');
  const selectFolderBtn = document.getElementById('selectFolderBtn');
  const newFolderNameInput = document.getElementById('newFolderNameInput');
  const createNewFolderBtn = document.getElementById('createNewFolderBtn');

  function closeFolderBrowser() {
    folderBrowserModal.classList.remove('show');
  }

  async function loadAndDisplayPath(path = '') {
    try {
      folderListDiv.innerHTML = '<div class="spinner" style="display: block; margin: 2rem auto;"></div>';
      currentPathInput.value = path;
      levelUpBtn.disabled = !path || /^[A-Z]:\\?$/.test(path);

      if (homeDrivesBtn) {
        if (!path) {
          homeDrivesBtn.disabled = true;
          homeDrivesBtn.style.opacity = '0.5';
        } else {
          homeDrivesBtn.disabled = false;
          homeDrivesBtn.style.opacity = '1';
        }
      }

      const url = path ? `/api/browse/list?path=${encodeURIComponent(path)}` : '/api/browse/drives';
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao carregar');
      }

      folderListDiv.innerHTML = '';
      const items = path ? data.directories : data;
      if (items.length === 0) {
        folderListDiv.innerHTML = '<p style="text-align:center; color: var(--text-muted);">Nenhuma subpasta encontrada.</p>';
      }

      items.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'folder-list-item';

        const icon = document.createElement('i');
        icon.setAttribute('data-lucide', path ? 'folder' : 'hard-drive');
        icon.className = 'folder-item-icon';

        const label = document.createElement('span');
        label.textContent = item;

        itemEl.appendChild(icon);
        itemEl.appendChild(label);

        const newPath = path ? (path.endsWith('\\') ? path + item : path + '\\' + item) : item;
        itemEl.dataset.path = newPath;

        itemEl.addEventListener('click', () => {
          loadAndDisplayPath(itemEl.dataset.path);
        });

        folderListDiv.appendChild(itemEl);
      });

      setTimeout(() => {
        lucide.createIcons();
      }, 50);

    } catch (error) {
      folderListDiv.innerHTML = `<p style="text-align:center; color: var(--toast-error-bg);">${error.message}</p>`;
    }
  }

  if (closeFolderBrowserBtn) closeFolderBrowserBtn.addEventListener('click', closeFolderBrowser);
  if (selectFolderBtn) {
    selectFolderBtn.addEventListener('click', () => {
      const finalPath = currentPathInput.value;
      if (finalPath) {
        networkPathInput.value = finalPath;
        showToast('Pasta selecionada!', 'success');
      } else {
        showToast('Selecione uma pasta válida.', 'error');
      }
      closeFolderBrowser();
    });
  }

  if (levelUpBtn) {
    levelUpBtn.addEventListener('click', () => {
      let currentPath = currentPathInput.value;
      if (!currentPath) return;

      if (/^[A-Z]:\\$/.test(currentPath)) {
        loadAndDisplayPath('');
        return;
      }

      if (currentPath.startsWith('\\\\')) {
        const slashes = currentPath.split('\\').filter(Boolean);
        if (slashes.length <= 2) {
          loadAndDisplayPath('');
          return;
        }
      }

      let parentPath = currentPath.substring(0, currentPath.lastIndexOf('\\'));

      if (!parentPath || /^\\\\[^\\/]+$/.test(parentPath)) {
        loadAndDisplayPath('');
        return;
      }

      if (parentPath.endsWith(':')) {
        parentPath += '\\';
      }

      loadAndDisplayPath(parentPath);
    });
  }

  if (homeDrivesBtn) {
    homeDrivesBtn.addEventListener('click', () => {
      loadAndDisplayPath('');
    });
  }

  if (currentPathInput) {
    currentPathInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const newPath = currentPathInput.value.trim();
        if (newPath) {
          loadAndDisplayPath(newPath);
        }
      }
    });
  }

  if (createNewFolderBtn) {
    createNewFolderBtn.addEventListener('click', async () => {
      const basePath = currentPathInput.value;
      const newFolderName = newFolderNameInput.value.trim();

      if (!basePath) {
        showToast('Navegue até um drive ou pasta primeiro.', 'error');
        return;
      }
      if (!newFolderName) {
        showToast('Digite um nome para a nova pasta.', 'error');
        newFolderNameInput.focus();
        return;
      }
      toggleButtonLoading(createNewFolderBtn, true);
      try {
        const response = await fetch('/api/browse/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ basePath, newFolderName })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Erro desconhecido');
        }
        showToast(`Pasta "${newFolderName}" criada com sucesso!`, 'success');
        newFolderNameInput.value = '';
        loadAndDisplayPath(basePath);
      } catch (error) {
        showToast(`Erro ao criar pasta: ${error.message}`, 'error');
      } finally {
        toggleButtonLoading(createNewFolderBtn, false);
      }
    });
  }

  if (newFolderNameInput) {
    newFolderNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        createNewFolderBtn.click();
      }
    });
  }

  async function apiFetch(endpoint) {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        if (response.status === 401) {
          showToast('Sessão expirada. Redirecionando para o login...', 'error');
          setTimeout(() => window.location.href = '/login.html', 2000);
        }
        const data = await response.json();
        throw new Error(data.error || `Erro na API: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Falha na requisição API:', error);
      showToast(error.message, 'error');
      throw error;
    }
  }

  async function loadHistoryStats() {
    const data = await apiFetch('/api/history/stats');
    historyStats.total.textContent = data.total || 0;
    historyStats.success.textContent = data.success || 0;
    historyStats.failed.textContent = data.failed || 0;
    historyStats.avgDuration.textContent = `${(data.avgDuration || 0).toFixed(2)}s`;
    historyStats.totalSize.textContent = `${(data.totalSize || 0).toFixed(2)} MB`;
  }

  function calculateRowsPerPage() {
    try {
      const tableContainer = document.querySelector('.table-container');
      if (!tableContainer) return 6;

      const screenHeight = window.innerHeight;
      const mainContent = document.querySelector('.main-content');

      if (!mainContent) return 6;

      const headerHeight = document.querySelector('.app-header')?.offsetHeight || 80;
      const pageHeaderHeight = document.querySelector('.page-header')?.offsetHeight || 100;
      const statsGridHeight = document.querySelector('.stats-grid')?.offsetHeight || 80;
      const tableHeaderHeight = 50;
      const paginationHeight = 70;
      const margins = 120;

      const availableHeight = screenHeight - headerHeight - pageHeaderHeight - statsGridHeight - tableHeaderHeight - paginationHeight - margins;

      const rowHeight = window.innerWidth <= 480 ? 42 : (window.innerWidth <= 768 ? 45 : 48);

      const maxRows = Math.max(Math.floor(availableHeight / rowHeight) - 1, 3);

      let minRows, maxRowsLimit;
      if (window.innerWidth <= 480) {
        minRows = 3;
        maxRowsLimit = 6;
      } else if (window.innerWidth <= 768) {
        minRows = 4;
        maxRowsLimit = 8;
      } else {
        minRows = 5;
        maxRowsLimit = 12;
      }

      let finalRows = Math.max(Math.min(maxRows, maxRowsLimit), minRows);

      if (availableHeight < 300) {
        finalRows = Math.min(finalRows, minRows);
      }

      return finalRows;
    } catch (error) {
      console.warn('Erro no cálculo de linhas, usando fallback:', error);
      if (window.innerWidth <= 480) return 4;
      if (window.innerWidth <= 768) return 6;
      return 8;
    }
  }

  async function loadHistory(page = 1, forceRecalculate = false) {
    if (isHistoryLoading) {
      return;
    }

    if (historyDebounceTimer) {
      clearTimeout(historyDebounceTimer);
    }

    return new Promise((resolve) => {
      historyDebounceTimer = setTimeout(async () => {
        try {
          isHistoryLoading = true;

          if (forceRecalculate || !lastCalculatedLimit) {
            lastCalculatedLimit = calculateRowsPerPage();
          }

          const limit = Math.max(lastCalculatedLimit || 8, 3);

          historyCurrentPage = page;
          const status = statusFilter.value;
          const url = `/api/history?page=${page}&limit=${limit}${status ? '&status=' + status : ''}`;

          const result = await apiFetch(url);

          historyTableBody.innerHTML = '';
          if (!result.data || result.data.length === 0) {
            historyTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Nenhum registro encontrado.</td></tr>';
            currentHistoryData = [];
          } else {
            currentHistoryData = result.data.map((item, index) => ({
              ...item,
              tempId: item.id || `temp_${page}_${index}`
            }));

            result.data.forEach((item, index) => {
              const row = document.createElement('tr');
              const statusClass = item.status === 'success' ? 'status-success' : 'status-failed';
              const itemId = item.id || `temp_${page}_${index}`;

              row.innerHTML = `
                      <td>${new Date(item.timestamp).toLocaleString('pt-BR')}</td>
                      <td>${item.databases.join(', ')}</td>
                      <td><span class="status-badge ${statusClass}">${item.status === 'success' ? 'Sucesso' : 'Falha'}</span></td>
                      <td>${item.duration.toFixed(2)}s</td>
                      <td>${item.fileSize} MB</td>
                      <td>
                          <button class="btn-view-details" data-backup-id="${itemId}">
                              <i data-lucide="eye"></i>
                              Visualizar
                          </button>
                      </td>
                  `;
              historyTableBody.appendChild(row);
            });
          }

          setupDetailsModalButtons();
          updateHistoryPagination(result.pagination);

          setTimeout(() => {
            lucide.createIcons();
          }, 50);

          resolve();
        } catch (error) {
          console.error('Erro ao carregar histórico:', error);
          resolve();
        } finally {
          isHistoryLoading = false;
        }
      }, 100);
    });
  }

  function updateHistoryPagination({ page, totalPages }) {
    historyTotalPages = totalPages;
    historyPagination.info.textContent = `Página ${page} de ${totalPages}`;
    historyPagination.prev.disabled = page <= 1;
    historyPagination.next.disabled = page >= totalPages;
  }

  function setupDetailsModalButtons() {
    historyTableBody.querySelectorAll('.btn-view-details').forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          const backupId = e.target.closest('button').dataset.backupId;
          const backupData = currentHistoryData.find(item =>
            (item.id && item.id.toString() === backupId) ||
            (item.tempId && item.tempId === backupId)
          );

          if (backupData) {
            showBackupDetails(backupData);
          } else {
            console.error('Dados do backup não encontrados para ID:', backupId);
            showToast('Dados do backup não encontrados', 'error');
          }
        } catch (error) {
          console.error('Erro ao processar dados do backup:', error);
          showToast('Erro ao carregar detalhes do backup', 'error');
        }
      });
    });
  }

  function showBackupDetails(backup) {
    const isSuccess = backup.status === 'success';

    backupDetailsTitle.innerHTML = `
          <i data-lucide="${isSuccess ? 'check-circle' : 'alert-circle'}"></i>
          Detalhes do Backup - ${isSuccess ? 'Sucesso' : 'Falha'}
      `;

    const detailsHtml = generateBackupDetailsHTML(backup);
    backupDetailsContent.innerHTML = detailsHtml;

    backupDetailsModal.classList.add('show');

    setTimeout(() => {
      lucide.createIcons();
    }, 50);
  }

  function generateBackupDetailsHTML(backup) {
    const isSuccess = backup.status === 'success';
    const timestamp = new Date(backup.timestamp).toLocaleString('pt-BR');

    const failedSteps = [];
    const errorMessage = backup.errorMessage || '';
    if (!isSuccess) {
      if (errorMessage.toLowerCase().includes('cópia:')) failedSteps.push('network');
      if (errorMessage.toLowerCase().includes('ftp:')) failedSteps.push('ftp');
      if (errorMessage.toLowerCase().includes('limpeza:')) failedSteps.push('cleanup');
      if (errorMessage.toLowerCase().includes('falha ao limpar .bak:')) failedSteps.push('compression');

      if (failedSteps.length === 0) {
        if (errorMessage.toLowerCase().includes('compactação') || errorMessage.toLowerCase().includes('7z')) {
          failedSteps.push('compression');
        } else {
          failedSteps.push('database');
        }
      }
    }

    const headerHtml = `
          <div class="backup-info-header ${backup.status}">
              <div class="backup-status-icon ${backup.status}">
                  <i data-lucide="${isSuccess ? 'check' : 'x'}"></i>
              </div>
              <div class="backup-info-text">
                  <h4>${isSuccess ? 'Backup Realizado com Sucesso' : 'Falha no Backup'}</h4>
                  <p>Executado em ${timestamp}</p>
                  <div class="backup-databases">
                      ${backup.databases.map(db => `
                          <span class="backup-database-tag">
                              <i data-lucide="database"></i>
                              ${db}
                          </span>
                      `).join('')}
                  </div>
              </div>
          </div>
      `;

    const metricsHtml = `
          <div class="backup-metrics">
              <div class="metric-item">
                  <span class="metric-value">${backup.duration.toFixed(2)}s</span>
                  <span class="metric-label">Duração</span>
              </div>
              <div class="metric-item">
                  <span class="metric-value">${backup.fileSize} MB</span>
                  <span class="metric-label">Tamanho</span>
              </div>
              <div class="metric-item">
                  <span class="metric-value">${backup.databases.length}</span>
                  <span class="metric-label">Bancos</span>
              </div>
          </div>
      `;

    const stepsHtml = generateBackupStepsHTML(backup, failedSteps);

    return `
          ${headerHtml}
          ${metricsHtml}
          <div class="backup-steps">
              ${stepsHtml}
          </div>
      `;
  }

  function getErrorMessageForStep(stepId, fullErrorMessage) {
    if (!fullErrorMessage) return '';

    const errors = fullErrorMessage.split(';').map(e => e.trim());
    const prefixMap = {
      network: 'cópia:',
      ftp: 'ftp:',
      cleanup: 'limpeza:',
      compression: 'falha ao limpar .bak:'
    };

    const prefix = prefixMap[stepId];
    let stepErrors = [];

    if (prefix) {
      stepErrors = errors
        .filter(e => e.toLowerCase().startsWith(prefix))
        .map(e => e.substring(prefix.length).trim());
    }

    if (stepErrors.length > 0) {
      return stepErrors.join('; ');
    }

    const generalError = errors.find(e =>
      !e.toLowerCase().startsWith('cópia:') &&
      !e.toLowerCase().startsWith('ftp:') &&
      !e.toLowerCase().startsWith('limpeza:') &&
      !e.toLowerCase().startsWith('falha ao limpar .bak:')
    );

    if (stepId === 'database' && generalError) {
      return generalError;
    }

    return (stepId === 'database') ? fullErrorMessage : '';
  }

  function generateBackupStepsHTML(backup, failedSteps = []) {
    const isSuccess = backup.status === 'success';
    const details = backup.details || '';

    const getStepStatus = (stepId) => {
      if (failedSteps.includes(stepId)) {
        return 'failed';
      }
      switch (stepId) {
        case 'database':
        case 'compression':
          return 'success';
        case 'ftp':
          return details.toLowerCase().includes('ftp') ? 'success' : 'skipped';
        case 'network':
          return details.toLowerCase().includes('local de rede') ? 'success' : 'skipped';
        case 'cleanup':
          return details.toLowerCase().includes('limpeza') ? 'success' : 'skipped';
        default:
          return 'success';
      }
    };

    const steps = [{
      id: 'database',
      title: 'Backup dos Bancos de Dados',
      description: `Geração dos arquivos .bak para ${backup.databases.length} banco(s)`,
      status: getStepStatus('database'),
      icon: 'database'
    }, {
      id: 'compression',
      title: 'Compactação dos Arquivos',
      description: 'Criação do arquivo .7z compactado',
      status: getStepStatus('compression'),
      icon: 'archive'
    }, {
      id: 'ftp',
      title: 'Upload para Servidor FTP',
      description: 'Envio do backup para o servidor remoto',
      status: getStepStatus('ftp'),
      icon: 'cloud-upload'
    }, {
      id: 'network',
      title: 'Cópia para Local de Rede',
      description: 'Envio para pasta local ou de rede configurada (se habilitado)',
      status: getStepStatus('network'),
      icon: 'folder-sync'
    }, {
      id: 'cleanup',
      title: 'Limpeza de Backups Antigos',
      description: 'Remoção automática de arquivos conforme política de retenção',
      status: getStepStatus('cleanup'),
      icon: 'trash-2'
    }];

    return steps.map(step => {
      let stepClass = step.status;
      let stepContent = `
              <div class="step-icon ${step.status}">
                  <i data-lucide="${getStepIcon(step.status, step.icon)}"></i>
              </div>
              <div class="step-content">
                  <span class="step-title">${step.title}</span><span class="step-description">${step.description}</span>
          `;

      if (step.status === 'failed') {
        const stepErrorMessage = getErrorMessageForStep(step.id, backup.errorMessage);
        if (stepErrorMessage) {
          stepContent += `
                  <div class="step-error">
                      <strong>Erro:</strong> ${escapeHtml(stepErrorMessage)}
                  </div>
              `;
        }
      }

      stepContent += '</div>';

      return `<div class="backup-step ${stepClass}">${stepContent}</div>`;
    }).join('');
  }

  function getStepIcon(status, defaultIcon) {
    switch (status) {
      case 'success': return 'check';
      case 'failed': return 'x';
      case 'skipped': return 'minus';
      default: return defaultIcon;
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function setupHistoryResizeObserver() {
    if (historyResizeObserver) {
      historyResizeObserver.disconnect();
    }

    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;

    window.addEventListener('resize', () => {
      clearTimeout(window.historyResizeTimeout);
      window.historyResizeTimeout = setTimeout(() => {
        const currentWidth = window.innerWidth;
        const currentHeight = window.innerHeight;

        const significantWidthChange = Math.abs(currentWidth - lastWidth) > 50;
        const significantHeightChange = Math.abs(currentHeight - lastHeight) > 30;

        if (significantWidthChange || significantHeightChange) {
          const historyTab = document.querySelector('[data-tab="history"]');
          if (historyTab && historyTab.classList.contains('active')) {
            lastCalculatedLimit = 0;
            loadHistory(historyCurrentPage || 1, true);

            lastWidth = currentWidth;
            lastHeight = currentHeight;
          }
        }
      }, 500);
    });

    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        const historyTab = document.querySelector('[data-tab="history"]');
        if (historyTab && historyTab.classList.contains('active')) {
          lastCalculatedLimit = 0;
          loadHistory(historyCurrentPage || 1, true);

          lastWidth = window.innerWidth;
          lastHeight = window.innerHeight;
        }
      }, 800);
    });
  }

  function loadHistoryTab() {
    if (isHistoryLoading) {
      return;
    }

    loadHistoryStats();
    setupHistoryResizeObserver();

    setTimeout(() => {
      lastCalculatedLimit = 0;
      loadHistory(1, true);
    }, 500);
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      if (!isHistoryLoading) {
        loadHistory(1, false);
      }
    });
  }
  if (historyPagination.prev) {
    historyPagination.prev.addEventListener('click', () => {
      if (historyCurrentPage > 1 && !isHistoryLoading) {
        loadHistory(historyCurrentPage - 1, false);
      }
    });
  }
  if (historyPagination.next) {
    historyPagination.next.addEventListener('click', () => {
      if (historyCurrentPage < historyTotalPages && !isHistoryLoading) {
        loadHistory(historyCurrentPage + 1, false);
      }
    });
  }
  if (closeBackupDetailsModalBtn) {
    closeBackupDetailsModalBtn.addEventListener('click', () => backupDetailsModal.classList.remove('show'));
  }
  window.addEventListener('click', (e) => {
    if (e.target === backupDetailsModal) {
      backupDetailsModal.classList.remove('show');
    }
  });

  setTimeout(() => {
    lucide.createIcons();
  }, 100);

});
