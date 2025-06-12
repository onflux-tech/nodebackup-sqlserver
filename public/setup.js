document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('themeToggle');

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
  });

  const setupForm = document.getElementById('setupForm');
  const setupButton = document.getElementById('setupButton');
  const toastContainer = document.getElementById('toast-container');

  function showToast(message, type = 'error', duration = 4000) {
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