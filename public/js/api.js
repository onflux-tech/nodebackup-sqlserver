import { showToast } from './ui.js';

export async function apiFetch(endpoint, options = {}) {
  try {
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