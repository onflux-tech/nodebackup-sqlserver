import { showToast, showConfirmationModal } from './ui.js';

let socket = null;
let logsContainer = null;
let isPaused = false;
let autoScroll = true;
let isConnected = false;
let reconnectAttempts = 0;
let maxReconnectAttempts = 5;
let reconnectDelay = 1000;
let isLogsInterfaceInitialized = false;

let currentFilters = {
  levels: ['info', 'warn', 'error'],
  maxEntries: 1000
};

const logLevelColors = {
  error: '#dc2626',
  warn: '#d97706',
  info: '#2563eb',
  debug: '#059669'
};

const logLevelIcons = {
  error: 'alert-circle',
  warn: 'alert-triangle',
  info: 'info',
  debug: 'bug'
};

function updateConnectionStatus(status) {
  const statusElement = document.getElementById('connectionStatus');
  if (!statusElement) return;

  statusElement.className = `status-indicator status-${status}`;

  switch (status) {
    case 'connected':
      statusElement.innerHTML = '<i data-lucide="circle"></i> Conectado';
      isConnected = true;
      reconnectAttempts = 0;
      break;
    case 'disconnected':
      statusElement.innerHTML = '<i data-lucide="circle"></i> Desconectado';
      isConnected = false;
      break;
    case 'connecting':
      statusElement.innerHTML = '<i data-lucide="circle"></i> Conectando...';
      isConnected = false;
      break;
    case 'error':
      statusElement.innerHTML = '<i data-lucide="circle"></i> Erro de Conexão';
      isConnected = false;
      break;
  }

  setTimeout(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, 50);
}

function checkSocketIOAvailability() {
  return typeof window.io !== 'undefined';
}

function initSocketConnection() {
  if (socket && socket.connected) {
    return;
  }

  if (!checkSocketIOAvailability()) {
    console.error('Socket.IO não está disponível');
    updateConnectionStatus('error');
    showToast('Socket.IO não carregado. Verifique a conexão.', 'error', 5000);
    return;
  }

  try {
    updateConnectionStatus('connecting');

    if (socket) {
      socket.disconnect();
    }

    socket = io({
      timeout: 10000,
      forceNew: true,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      updateConnectionStatus('connected');
      socket.emit('logs:setFilters', currentFilters);
    });

    socket.on('disconnect', (reason) => {
      updateConnectionStatus('disconnected');

      if (reason === 'io server disconnect') {
        showToast('Servidor desconectou. Tentando reconectar...', 'warning', 3000);
        attemptReconnect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('🔴 Erro de conexão WebSocket:', error);
      updateConnectionStatus('error');

      if (reconnectAttempts < maxReconnectAttempts) {
        showToast(`Erro de conexão. Tentativa ${reconnectAttempts + 1}/${maxReconnectAttempts}`, 'error', 3000);
        attemptReconnect();
      } else {
        showToast('Não foi possível conectar aos logs em tempo real', 'error', 5000);
      }
    });

    socket.on('logs:history', (logs) => {
      displayLogs(logs, true);
    });

    socket.on('logs:new', (logEntry) => {
      if (!isPaused && logEntry) {
        appendLog(logEntry);
      }
    });

    socket.on('logs:cleared', () => {
      clearLogsDisplay();
      showToast('Buffer de logs limpo', 'info', 3000);
    });

  } catch (error) {
    console.error('🔴 Erro ao inicializar WebSocket:', error);
    updateConnectionStatus('error');
    showToast('Erro ao inicializar conexão WebSocket', 'error', 5000);
  }
}

function attemptReconnect() {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.error('❌ Máximo de tentativas de reconexão atingido');
    return;
  }

  reconnectAttempts++;
  const delay = reconnectDelay * reconnectAttempts;

  setTimeout(() => {
    if (!isConnected) {
      initSocketConnection();
    }
  }, delay);
}

function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    isConnected = false;
    reconnectAttempts = 0;
  }
}

function displayLogs(logs, clearFirst = false) {
  if (!logsContainer) return;

  if (clearFirst) {
    logsContainer.innerHTML = '';
  }

  const placeholder = logsContainer.querySelector('.logs-placeholder');
  if (placeholder) {
    placeholder.remove();
  }

  if (logs && logs.length > 0) {
    logs.forEach(log => appendLog(log, false));

    if (autoScroll) {
      scrollToBottom();
    }
  } else {
  }
}

function appendLog(logEntry, shouldScroll = true) {
  if (!logsContainer || !logEntry) return;

  const placeholder = logsContainer.querySelector('.logs-placeholder');
  if (placeholder) {
    placeholder.remove();
  }

  const logElement = createLogElement(logEntry);
  logsContainer.appendChild(logElement);

  const maxEntries = currentFilters.maxEntries || 1000;
  while (logsContainer.children.length > maxEntries) {
    logsContainer.removeChild(logsContainer.firstChild);
  }

  if (shouldScroll && autoScroll && !isPaused) {
    scrollToBottom();
  }
}

function createLogElement(logEntry) {
  const logDiv = document.createElement('div');
  logDiv.className = `log-entry log-${logEntry.level}`;

  const timestamp = new Date(logEntry.timestamp).toLocaleString('pt-BR');

  logDiv.innerHTML = `
    <div class="log-timestamp">${timestamp}</div>
    <div class="log-level">
      <i data-lucide="${logLevelIcons[logEntry.level] || 'info'}"></i>
      <span>${logEntry.level.toUpperCase()}</span>
    </div>
    <div class="log-message">${escapeHtml(logEntry.message)}</div>
  `;

  return logDiv;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function scrollToBottom() {
  if (logsContainer) {
    logsContainer.scrollTop = logsContainer.scrollHeight;
  }
}

function clearLogsDisplay() {
  if (logsContainer) {
    logsContainer.innerHTML = '<div class="logs-placeholder"><i data-lucide="terminal"></i><h4>Logs limpos</h4><p>Novos logs aparecerão aqui</p></div>';

    setTimeout(() => {
      if (window.lucide) {
        window.lucide.createIcons();
      }
    }, 50);
  }
}

function togglePause() {
  isPaused = !isPaused;
  const pauseBtn = document.getElementById('pauseLogsBtn');
  if (!pauseBtn) return;

  if (isPaused) {
    pauseBtn.innerHTML = `
      <i data-lucide="play"></i>
      <span class="btn-text">Play</span>
    `;
    pauseBtn.classList.add('paused');
  } else {
    pauseBtn.innerHTML = `
      <i data-lucide="pause"></i>
      <span class="btn-text">Pausar</span>
    `;
    pauseBtn.classList.remove('paused');
    scrollToBottom();
  }

  setTimeout(() => window.lucide?.createIcons(), 50);
}

function toggleAutoScroll() {
  autoScroll = !autoScroll;
  const scrollBtn = document.getElementById('autoScrollBtn');
  if (!scrollBtn) return;

  const scrollText = scrollBtn.querySelector('.btn-text');

  if (autoScroll) {
    scrollText.textContent = 'Auto-scroll: On';
    scrollBtn.classList.add('active');
    scrollToBottom();
  } else {
    scrollText.textContent = 'Auto-scroll: Off';
    scrollBtn.classList.remove('active');
  }
}

function updateFilters() {
  const checkboxes = document.querySelectorAll('.log-level-filter input[type="checkbox"]');
  const selectedLevels = [];

  checkboxes.forEach(checkbox => {
    if (checkbox.checked) {
      selectedLevels.push(checkbox.value);
    }
  });

  currentFilters.levels = selectedLevels;

  if (socket && socket.connected) {
    socket.emit('logs:setFilters', currentFilters);
    socket.emit('logs:getHistory', { levels: selectedLevels, count: 200 });
  }
}

function clearLogs() {
  if (socket && socket.connected) {
    socket.emit('logs:clear');
  } else {
    showToast('Não conectado ao servidor', 'warning', 3000);
  }
}

function downloadLogs() {
  if (!logsContainer) return;

  const logs = Array.from(logsContainer.children).map(logEl => {
    const timestamp = logEl.querySelector('.log-timestamp')?.textContent || '';
    const level = logEl.querySelector('.log-level span')?.textContent || '';
    const message = logEl.querySelector('.log-message')?.textContent || '';
    return `[${timestamp}] [${level}] ${message}`;
  }).join('\n');

  if (!logs) {
    showToast('Nenhum log para download', 'warning', 3000);
    return;
  }

  const blob = new Blob([logs], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nodebackup-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function initializeLogs() {
  if (isLogsInterfaceInitialized) {
    if (!socket || !socket.connected) {
      initSocketConnection();
    }
    return;
  }

  logsContainer = document.getElementById('logsContainer');

  if (!logsContainer) {
    console.error('❌ Container de logs não encontrado');
    return;
  }

  const logControls = document.getElementById('logControls');

  if (logControls) {
    logControls.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;

      switch (button.id) {
        case 'pauseLogsBtn':
          togglePause();
          break;
        case 'autoScrollBtn':
          toggleAutoScroll();
          break;
        case 'downloadLogsBtn':
          downloadLogs();
          break;
        case 'clearLogsBtn':
          showConfirmationModal(
            'Limpar Logs',
            'Tem certeza que deseja limpar todos os logs do buffer do servidor? Esta ação não pode ser desfeita.',
            () => clearLogs()
          );
          break;
      }
    });
  } else {
    console.error('❌ Container de controles de log (#logControls) não encontrado.');
  }

  const filterCheckboxes = document.querySelectorAll('.log-level-filter input[type="checkbox"]');
  filterCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', updateFilters);
  });

  isLogsInterfaceInitialized = true;
  initSocketConnection();
}

export function cleanupLogs() {
  disconnectSocket();
  isPaused = false;
  autoScroll = true;
  isConnected = false;
  reconnectAttempts = 0;
} 