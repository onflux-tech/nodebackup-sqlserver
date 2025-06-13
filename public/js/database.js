import { apiFetch } from './api.js';
import { showToast, showDetailedErrorToast } from './ui.js';

const elements = {
  dbServer: document.getElementById('dbServer'),
  dbUser: document.getElementById('dbUser'),
  dbPass: document.getElementById('dbPass'),
  btnListDbs: document.getElementById('btnListDatabases'),
  selectedDatabasesContainer: document.getElementById('selectedDatabasesTags'),
  databaseSelectorModal: document.getElementById('databaseSelectorModal'),
  closeDatabaseSelectorBtn: document.getElementById('closeDatabaseSelector'),
  databaseList: document.getElementById('databaseList'),
  selectionCount: document.getElementById('selectionCount'),
  selectAllDbsBtn: document.getElementById('selectAllDbs'),
  clearAllDbsBtn: document.getElementById('clearAllDbs'),
  cancelDatabaseSelectionBtn: document.getElementById('cancelDatabaseSelection'),
  confirmDatabaseSelectionBtn: document.getElementById('confirmDatabaseSelection'),
};

let availableDatabases = [];
let selectedDatabases = [];

export function getSelectedDatabases() {
  return [...selectedDatabases];
}

export function setSelectedDatabases(databases) {
  selectedDatabases = [...databases];
}

export function renderSelectedDatabasesTags() {
  if (selectedDatabases.length === 0) {
    elements.selectedDatabasesContainer.innerHTML = `
        <div class="empty-selection">
          <i data-lucide="database"></i>
          <span>Nenhum banco selecionado</span>
          <p>Clique em "Listar Bancos" para selecionar</p>
        </div>`;
    elements.selectedDatabasesContainer.classList.remove('has-selection');
  } else {
    elements.selectedDatabasesContainer.innerHTML = `
        <div class="database-tags">
          ${selectedDatabases.map(dbName => `
            <div class="database-tag">
              <i data-lucide="database"></i>
              <span>${dbName}</span>
              <button type="button" class="tag-remove" data-db="${dbName}" title="Remover ${dbName}">
                <i data-lucide="x"></i>
              </button>
            </div>`).join('')}
        </div>`;
    elements.selectedDatabasesContainer.classList.add('has-selection');
    elements.selectedDatabasesContainer.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        removeSelectedDatabase(e.currentTarget.dataset.db);
      });
    });
  }
  if (window.lucide) window.lucide.createIcons();
}

function removeSelectedDatabase(dbName) {
  selectedDatabases = selectedDatabases.filter(db => db !== dbName);
  renderSelectedDatabasesTags();
}

function openDatabaseSelectorModal() {
  elements.databaseSelectorModal.classList.add('show');
  loadDatabasesInModal();
}

function closeDatabaseSelectorModal() {
  elements.databaseSelectorModal.classList.remove('show');
}

async function loadDatabasesInModal() {
  const server = elements.dbServer.value.trim();
  const user = elements.dbUser.value.trim();
  const pass = elements.dbPass.value.trim();

  if (!server || !user) {
    elements.databaseList.innerHTML = `<div class="loading-databases"><i data-lucide="alert-circle" style="color: var(--error-500);"></i><p>Preencha servidor e usuário primeiro</p></div>`;
    if (window.lucide) window.lucide.createIcons();
    return;
  }
  elements.databaseList.innerHTML = `<div class="loading-databases"><div class="spinner" style="display: block; margin: 2rem auto;"></div><p>Carregando bancos de dados...</p></div>`;

  try {
    const url = `/api/list-databases?server=${encodeURIComponent(server)}&user=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`;
    const data = await apiFetch(url);
    if (data.databases && data.databases.length > 0) {
      availableDatabases = data.databases;
      renderDatabaseList();
      showToast('Bancos listados com sucesso!', 'success');
    } else {
      elements.databaseList.innerHTML = `<div class="loading-databases"><i data-lucide="database" style="color: var(--text-muted);"></i><p>Nenhum banco de dados encontrado</p></div>`;
    }
  } catch (err) {
    showDetailedErrorToast(err.error, err.details, err.suggestions);
    elements.databaseList.innerHTML = `<div class="loading-databases"><i data-lucide="alert-circle" style="color: var(--error-500);"></i><p>Erro ao carregar bancos</p></div>`;
  } finally {
    if (window.lucide) window.lucide.createIcons();
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
        </div>`;
  }).join('');

  elements.databaseList.innerHTML = listHtml;
  updateSelectionCount();

  elements.databaseList.querySelectorAll('.database-list-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.type !== 'checkbox') {
        const checkbox = item.querySelector('.database-checkbox');
        checkbox.checked = !checkbox.checked;
        toggleDatabaseSelection(checkbox);
      }
    });
  });
  elements.databaseList.querySelectorAll('.database-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', () => toggleDatabaseSelection(checkbox));
  });
  if (window.lucide) window.lucide.createIcons();
}

function toggleDatabaseSelection(checkbox) {
  const dbName = checkbox.dataset.db;
  const item = checkbox.closest('.database-list-item');
  if (checkbox.checked) {
    if (!selectedDatabases.includes(dbName)) selectedDatabases.push(dbName);
    item.classList.add('selected');
  } else {
    selectedDatabases = selectedDatabases.filter(db => db !== dbName);
    item.classList.remove('selected');
  }
  updateSelectionCount();
}

function updateSelectionCount() {
  const count = selectedDatabases.length;
  elements.selectionCount.textContent = `${count} banco${count !== 1 ? 's' : ''} selecionado${count !== 1 ? 's' : ''}`;
}

function confirmDatabaseSelection() {
  renderSelectedDatabasesTags();
  closeDatabaseSelectorModal();
  showToast(`${selectedDatabases.length} banco(s) selecionado(s)`, 'success');
}

export function setupDatabaseSection() {
  elements.btnListDbs?.addEventListener('click', () => {
    openDatabaseSelectorModal();
  });
  elements.closeDatabaseSelectorBtn?.addEventListener('click', closeDatabaseSelectorModal);
  elements.cancelDatabaseSelectionBtn?.addEventListener('click', closeDatabaseSelectorModal);
  elements.confirmDatabaseSelectionBtn?.addEventListener('click', confirmDatabaseSelection);
  elements.selectAllDbsBtn?.addEventListener('click', () => {
    selectedDatabases = [...availableDatabases];
    renderDatabaseList();
  });
  elements.clearAllDbsBtn?.addEventListener('click', () => {
    selectedDatabases = [];
    renderDatabaseList();
  });
  window.addEventListener('click', (e) => {
    if (e.target === elements.databaseSelectorModal) {
      closeDatabaseSelectorModal();
    }
  });
} 