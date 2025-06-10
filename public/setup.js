document.addEventListener('DOMContentLoaded', () => {
  const setupForm = document.getElementById('setupForm');
  const setupButton = document.getElementById('setupButton');
  const toastContainer = document.getElementById('toast-container');

  function showToast(message, type = 'error') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => toast.remove());
    }, 4000);
  }

  function toggleButtonLoading(button, isLoading) {
    button.disabled = isLoading;
    const textElement = button.querySelector('.btn-text');
    if (textElement) textElement.style.display = isLoading ? 'none' : 'inline-block';
    const spinnerElement = button.querySelector('.spinner');
    if (spinnerElement) spinnerElement.style.display = isLoading ? 'inline-block' : 'none';
  }

  setupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    toggleButtonLoading(setupButton, true);

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
      showToast('As senhas não coincidem.');
      toggleButtonLoading(setupButton, false);
      return;
    }

    if (password.length < 6) {
      showToast('A senha deve ter pelo menos 6 caracteres.');
      toggleButtonLoading(setupButton, false);
      return;
    }

    try {
      const response = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        showToast('Conta criada com sucesso! Redirecionando para o login...', 'success');
        setTimeout(() => {
          window.location.href = '/login.html';
        }, 2000);
      } else {
        const result = await response.json();
        showToast(result.message || 'Erro ao criar a conta.');
      }
    } catch (error) {
      console.error('Erro ao tentar criar conta:', error);
      showToast('Erro de conexão ao tentar criar a conta.');
    } finally {
      toggleButtonLoading(setupButton, false);
    }
  });
}); 