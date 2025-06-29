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

    // Verificar se há conteúdo na resposta
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    
    if (!contentType || !contentType.includes('application/json') || contentLength === '0') {
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      return {}; // Retornar objeto vazio se não houver conteúdo
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('Erro ao fazer parse do JSON:', jsonError);
      throw new Error('Resposta inválida do servidor');
    }

    if (!response.ok) {
      throw data;
    }

    return data;
  } catch (error) {
    console.error('Falha na requisição API:', error);
    throw error;
  }
} 