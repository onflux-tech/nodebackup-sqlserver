import { showToast } from './ui.js';

export async function apiFetch(endpoint, options = {}) {
  try {
    if (options.body && typeof options.body === 'string') {
      if (!options.headers || !options.headers['Content-Type']) {
        options.headers = Object.assign({
          'Content-Type': 'application/json'
        }, options.headers || {});
      }
    }

    const response = await fetch(endpoint, options);
    if (response.status === 401) {
      showToast('Sessão expirada. Redirecionando para o login...', 'error');
      setTimeout(() => window.location.href = '/login.html', 2000);
      throw new Error('Não autorizado');
    }

    const data = await response.json();

    if (!response.ok) {
      throw data;
    }

    return data;
  } catch (error) {
    console.error('Falha na requisição API:', error);
    throw error;
  }
} 