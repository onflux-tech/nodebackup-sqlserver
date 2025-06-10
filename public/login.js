document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('themeToggle');
  const sunIcon = document.querySelector('.sun-icon');
  const moonIcon = document.querySelector('.moon-icon');

  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeUI(savedTheme);

  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeUI(newTheme);

    themeToggle.style.transform = 'scale(0.95)';
    setTimeout(() => {
      themeToggle.style.transform = '';
    }, 150);
  });

  function updateThemeUI(theme) {
    if (theme === 'dark') {
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
    } else {
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
    }
  }

  const loginForm = document.getElementById('loginForm');
  const loginButton = document.getElementById('loginButton');
  const toastContainer = document.getElementById('toast-container');

  const modal = document.getElementById('changePasswordModal');
  const openModalButton = document.getElementById('openChangePasswordModal');
  const closeModalButton = document.getElementById('closeModal');
  const changePasswordForm = document.getElementById('changePasswordForm');
  const changePasswordButton = document.getElementById('changePasswordButton');

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

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    toggleButtonLoading(loginButton, true);

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        window.location.href = '/';
      } else {
        const result = await response.json();
        showToast(result.message || 'Usuário ou senha inválidos.');
      }
    } catch (error) {
      console.error('Erro ao tentar fazer login:', error);
      showToast('Erro de conexão ao tentar fazer login.');
    } finally {
      toggleButtonLoading(loginButton, false);
    }
  });

  openModalButton.onclick = () => {
    modal.classList.add('show');
  };

  closeModalButton.onclick = () => {
    modal.classList.remove('show');
  };

  window.onclick = (event) => {
    if (event.target == modal) {
      modal.classList.remove('show');
    }
  };

  changePasswordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    toggleButtonLoading(changePasswordButton, true);

    const username = document.getElementById('cp-username').value;
    const oldPassword = document.getElementById('cp-oldPassword').value;
    const newPassword = document.getElementById('cp-newPassword').value;
    const confirmNewPassword = document.getElementById('cp-confirmNewPassword').value;

    if (newPassword !== confirmNewPassword) {
      showToast('As novas senhas não coincidem.');
      return toggleButtonLoading(changePasswordButton, false);
    }

    try {
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, oldPassword, newPassword, confirmNewPassword })
      });

      const result = await response.json();
      if (response.ok) {
        showToast(result.message, 'success');
        setTimeout(() => modal.classList.remove('show'), 1500);
      } else {
        showToast(result.message || 'Ocorreu um erro.');
      }

    } catch (error) {
      showToast('Erro de conexão ao alterar a senha.');
    } finally {
      toggleButtonLoading(changePasswordButton, false);
    }
  });
}); 