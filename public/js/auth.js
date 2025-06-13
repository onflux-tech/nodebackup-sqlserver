import { apiFetch } from './api.js';
import { showToast } from './ui.js';

export function setupLogout() {
  const logoutButton = document.getElementById('logoutButton');
  if (!logoutButton) return;

  logoutButton.addEventListener('click', async () => {
    try {
      await apiFetch('/api/logout', { method: 'POST' });
      window.location.href = '/login.html';
    } catch (error) {
      showToast(error.message || 'Erro de conexão ao tentar sair.', 'error');
    }
  });
} 