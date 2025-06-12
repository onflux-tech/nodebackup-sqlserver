document.addEventListener('DOMContentLoaded', () => {

  const stats = {
    total: document.getElementById('stats-total'),
    success: document.getElementById('stats-success'),
    failed: document.getElementById('stats-failed'),
    avgDuration: document.getElementById('stats-avg-duration'),
    totalSize: document.getElementById('stats-total-size'),
  };

  const tableBody = document.querySelector('#history-table tbody');
  const statusFilter = document.getElementById('status-filter');

  const pagination = {
    prev: document.getElementById('prev-page'),
    next: document.getElementById('next-page'),
    info: document.getElementById('page-info'),
  };

  const modal = document.getElementById('errorModal');
  const modalContent = document.getElementById('error-details');
  const closeBtn = document.querySelector('.modal .close-btn');

  let currentPage = 1;
  let totalPages = 1;

  async function apiFetch(endpoint) {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login.html';
        }
        throw new Error(`Erro na API: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Falha na requisição API:', error);
      throw error;
    }
  }

  async function loadStats() {
    const data = await apiFetch('/api/history/stats');
    stats.total.textContent = data.total || 0;
    stats.success.textContent = data.success || 0;
    stats.failed.textContent = data.failed || 0;
    stats.avgDuration.textContent = `${(data.avgDuration || 0).toFixed(2)}s`;
    stats.totalSize.textContent = `${(data.totalSize || 0).toFixed(2)} MB`;
  }

  async function loadHistory(page = 1) {
    currentPage = page;
    const status = statusFilter.value;
    const url = `/api/history?page=${page}&limit=10${status ? '&status=' + status : ''}`;

    const result = await apiFetch(url);

    tableBody.innerHTML = '';
    if (result.data.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6">Nenhum registro encontrado.</td></tr>';
    }

    result.data.forEach(item => {
      const row = document.createElement('tr');
      const statusClass = item.status === 'success' ? 'status-success' : 'status-failed';

      row.innerHTML = `
                <td>${new Date(item.timestamp).toLocaleString('pt-BR')}</td>
                <td>${item.databases.join(', ')}</td>
                <td><span class="status-badge ${statusClass}">${item.status}</span></td>
                <td>${item.duration.toFixed(2)}s</td>
                <td>${item.fileSize} MB</td>
                <td>
                    ${item.status === 'failed' ? `<button class="btn-details" data-error="${escapeHtml(item.errorMessage)}">Ver Erro</button>` : (item.details || 'N/A')}
                </td>
            `;
      tableBody.appendChild(row);
    });

    setupModalButtons();
    updatePagination(result.pagination);
  }

  function updatePagination({ page, totalPages: newTotalPages }) {
    totalPages = newTotalPages;
    pagination.info.textContent = `Página ${page} de ${totalPages}`;
    pagination.prev.disabled = page <= 1;
    pagination.next.disabled = page >= totalPages;
  }

  function setupModalButtons() {
    document.querySelectorAll('.btn-details').forEach(button => {
      button.addEventListener('click', (e) => {
        const errorMsg = e.target.dataset.error;
        modalContent.textContent = errorMsg;
        modal.style.display = 'block';
      });
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  statusFilter.addEventListener('change', () => loadHistory(1));
  pagination.prev.addEventListener('click', () => {
    if (currentPage > 1) loadHistory(currentPage - 1);
  });
  pagination.next.addEventListener('click', () => {
    if (currentPage < totalPages) loadHistory(currentPage + 1);
  });
  closeBtn.addEventListener('click', () => modal.style.display = 'none');
  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  loadStats();
  loadHistory();
}); 