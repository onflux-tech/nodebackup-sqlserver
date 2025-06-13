import { apiFetch } from './api.js';
import { showToast } from './ui.js';

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
let lastCalculatedLimit = 0;
let historyDebounceTimer = null;
let isHistoryLoading = false;
let currentHistoryData = [];

async function loadHistoryStats() {
  try {
    const data = await apiFetch('/api/history/stats');
    if (!data) return;
    historyStats.total.textContent = data.total || 0;
    historyStats.success.textContent = data.success || 0;
    historyStats.failed.textContent = data.failed || 0;
    historyStats.avgDuration.textContent = `${(data.avgDuration || 0).toFixed(2)}s`;
    historyStats.totalSize.textContent = `${(data.totalSize || 0).toFixed(2)} MB`;
  } catch (error) {
  }
}

function calculateRowsPerPage() {
  try {
    const tableContainer = document.querySelector('.table-container');
    if (!tableContainer) return 6;

    const screenHeight = window.innerHeight;
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
      [minRows, maxRowsLimit] = [3, 6];
    } else if (window.innerWidth <= 768) {
      [minRows, maxRowsLimit] = [4, 8];
    } else {
      [minRows, maxRowsLimit] = [5, 12];
    }
    let finalRows = Math.max(Math.min(maxRows, maxRowsLimit), minRows);
    if (availableHeight < 300) finalRows = Math.min(finalRows, minRows);
    return finalRows;
  } catch (error) {
    console.warn('Erro no cálculo de linhas, usando fallback:', error);
    if (window.innerWidth <= 480) return 4;
    if (window.innerWidth <= 768) return 6;
    return 8;
  }
}

async function loadHistory(page = 1, forceRecalculate = false) {
  if (isHistoryLoading) return;
  if (historyDebounceTimer) clearTimeout(historyDebounceTimer);

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
          currentHistoryData = result.data.map((item, index) => ({ ...item, tempId: item.id || `temp_${page}_${index}` }));
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
                          <td><button class="btn-view-details" data-backup-id="${itemId}"><i data-lucide="eye"></i>Visualizar</button></td>`;
            historyTableBody.appendChild(row);
          });
        }
        setupDetailsModalButtons();
        updateHistoryPagination(result.pagination);
        if (window.lucide) window.lucide.createIcons();
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
        const backupData = currentHistoryData.find(item => (item.id && item.id.toString() === backupId) || (item.tempId && item.tempId === backupId));
        if (backupData) {
          showBackupDetails(backupData);
        } else {
          showToast('Dados do backup não encontrados', 'error');
        }
      } catch (error) {
        showToast('Erro ao carregar detalhes do backup', 'error');
      }
    });
  });
}

function showBackupDetails(backup) {
  const isSuccess = backup.status === 'success';
  backupDetailsTitle.innerHTML = `<i data-lucide="${isSuccess ? 'check-circle' : 'alert-circle'}"></i> Detalhes do Backup - ${isSuccess ? 'Sucesso' : 'Falha'}`;
  backupDetailsContent.innerHTML = generateBackupDetailsHTML(backup);
  backupDetailsModal.classList.add('show');
  if (window.lucide) window.lucide.createIcons();
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
      failedSteps.push(errorMessage.toLowerCase().includes('compactação') || errorMessage.toLowerCase().includes('7z') ? 'compression' : 'database');
    }
  }

  const headerHtml = `<div class="backup-info-header ${backup.status}"><div class="backup-status-icon ${backup.status}"><i data-lucide="${isSuccess ? 'check' : 'x'}"></i></div><div class="backup-info-text"><h4>${isSuccess ? 'Backup Realizado com Sucesso' : 'Falha no Backup'}</h4><p>Executado em ${timestamp}</p><div class="backup-databases">${backup.databases.map(db => `<span class="backup-database-tag"><i data-lucide="database"></i>${db}</span>`).join('')}</div></div></div>`;
  const metricsHtml = `<div class="backup-metrics"><div class="metric-item"><span class="metric-value">${backup.duration.toFixed(2)}s</span><span class="metric-label">Duração</span></div><div class="metric-item"><span class="metric-value">${backup.fileSize} MB</span><span class="metric-label">Tamanho</span></div><div class="metric-item"><span class="metric-value">${backup.databases.length}</span><span class="metric-label">Bancos</span></div></div>`;
  const stepsHtml = generateBackupStepsHTML(backup, failedSteps);

  return `${headerHtml}${metricsHtml}<div class="backup-steps">${stepsHtml}</div>`;
}

function getErrorMessageForStep(stepId, fullErrorMessage) {
  if (!fullErrorMessage) return '';
  const errors = fullErrorMessage.split(';').map(e => e.trim());
  const prefixMap = { network: 'cópia:', ftp: 'ftp:', cleanup: 'limpeza:', compression: 'falha ao limpar .bak:' };
  const prefix = prefixMap[stepId];
  if (prefix) {
    const stepErrors = errors.filter(e => e.toLowerCase().startsWith(prefix)).map(e => e.substring(prefix.length).trim());
    if (stepErrors.length > 0) return stepErrors.join('; ');
  }
  const generalError = errors.find(e => !Object.values(prefixMap).some(p => e.toLowerCase().startsWith(p)));
  return (stepId === 'database' && generalError) ? generalError : '';
}

function generateBackupStepsHTML(backup, failedSteps = []) {
  const details = backup.details || '';
  const getStepStatus = (stepId) => {
    if (failedSteps.includes(stepId)) return 'failed';
    if (['database', 'compression'].includes(stepId)) return 'success';
    const keywords = { ftp: 'ftp', network: 'local de rede', cleanup: 'limpeza' };
    return details.toLowerCase().includes(keywords[stepId]) ? 'success' : 'skipped';
  };

  const steps = [
    { id: 'database', title: 'Backup dos Bancos de Dados', description: `Geração dos arquivos .bak para ${backup.databases.length} banco(s)`, icon: 'database' },
    { id: 'compression', title: 'Compactação dos Arquivos', description: 'Criação do arquivo .7z compactado', icon: 'archive' },
    { id: 'ftp', title: 'Upload para Servidor FTP', description: 'Envio do backup para o servidor remoto', icon: 'cloud-upload' },
    { id: 'network', title: 'Cópia para Local de Rede', description: 'Envio para pasta configurada', icon: 'folder-sync' },
    { id: 'cleanup', title: 'Limpeza de Backups Antigos', description: 'Remoção automática de arquivos', icon: 'trash-2' }
  ].map(step => ({ ...step, status: getStepStatus(step.id) }));

  return steps.map(step => {
    let errorHtml = '';
    if (step.status === 'failed') {
      const stepErrorMessage = getErrorMessageForStep(step.id, backup.errorMessage);
      if (stepErrorMessage) {
        errorHtml = `<div class="step-error"><strong>Erro:</strong> ${escapeHtml(stepErrorMessage)}</div>`;
      }
    }
    const iconMap = { success: 'check', failed: 'x', skipped: 'minus' };
    return `<div class="backup-step ${step.status}"><div class="step-icon ${step.status}"><i data-lucide="${iconMap[step.status] || step.icon}"></i></div><div class="step-content"><span class="step-title">${step.title}</span><span class="step-description">${step.description}</span>${errorHtml}</div></div>`;
  }).join('');
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function setupHistoryResizeObserver() {
  let lastWidth = window.innerWidth;
  let lastHeight = window.innerHeight;
  const onResize = () => {
    const currentWidth = window.innerWidth;
    const currentHeight = window.innerHeight;
    const significantChange = Math.abs(currentWidth - lastWidth) > 50 || Math.abs(currentHeight - lastHeight) > 30;
    const historyTab = document.querySelector('[data-tab="history"]');
    if (significantChange && historyTab && historyTab.classList.contains('active')) {
      lastCalculatedLimit = 0;
      loadHistory(historyCurrentPage || 1, true);
      [lastWidth, lastHeight] = [currentWidth, currentHeight];
    }
  };
  window.addEventListener('resize', () => {
    clearTimeout(window.historyResizeTimeout);
    window.historyResizeTimeout = setTimeout(onResize, 500);
  });
  window.addEventListener('orientationchange', () => setTimeout(() => onResize(), 800));
}

export function loadHistoryTab() {
  if (isHistoryLoading) return;
  loadHistoryStats();
  setupHistoryResizeObserver();
  setTimeout(() => {
    lastCalculatedLimit = 0;
    loadHistory(1, true);
  }, 500);
}

export function setupHistory() {
  statusFilter?.addEventListener('change', () => !isHistoryLoading && loadHistory(1, false));
  historyPagination.prev?.addEventListener('click', () => historyCurrentPage > 1 && !isHistoryLoading && loadHistory(historyCurrentPage - 1, false));
  historyPagination.next?.addEventListener('click', () => historyCurrentPage < historyTotalPages && !isHistoryLoading && loadHistory(historyCurrentPage + 1, false));
  closeBackupDetailsModalBtn?.addEventListener('click', () => backupDetailsModal.classList.remove('show'));
  window.addEventListener('click', (e) => e.target === backupDetailsModal && backupDetailsModal.classList.remove('show'));

  window.reloadHistory = (force) => {
    lastCalculatedLimit = 0;
    loadHistory(historyCurrentPage || 1, force);
  };
}
