document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('themeToggle');

  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    setTimeout(() => {
      lucide.createIcons();
    }, 50);
  });

  const loginForm = document.getElementById('loginForm');
  const loginButton = document.getElementById('loginButton');
  const toastContainer = document.getElementById('toast-container');

  const modal = document.getElementById('changePasswordModal');
  const openModalButton = document.getElementById('openChangePasswordModal');
  const closeModalButton = document.getElementById('closeModal');
  const changePasswordForm = document.getElementById('changePasswordForm');
  const changePasswordButton = document.getElementById('changePasswordButton');

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