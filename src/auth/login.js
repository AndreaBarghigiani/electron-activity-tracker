const { ipcRenderer } = require('electron');

const form = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('loginButton');
const buttonText = document.querySelector('.button-text');
const spinner = document.querySelector('.spinner');
const errorMessage = document.getElementById('errorMessage');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError('Please enter both email and password');
    return;
  }

  // Show loading state
  setLoading(true);
  hideError();

  try {
    // Send login request to main process
    const result = await ipcRenderer.invoke('auth:login', { email, password });

    if (result.success) {
      // Login successful - main process will close the window
      console.log('Login successful!');
    } else {
      // Show error message
      showError(result.error || 'Login failed. Please try again.');
      setLoading(false);
    }
  } catch (error) {
    showError('An unexpected error occurred. Please try again.');
    setLoading(false);
    console.error('Login error:', error);
  }
});

function setLoading(isLoading) {
  loginButton.disabled = isLoading;
  buttonText.style.display = isLoading ? 'none' : 'inline';
  spinner.style.display = isLoading ? 'inline-block' : 'none';
  
  if (isLoading) {
    emailInput.disabled = true;
    passwordInput.disabled = true;
  } else {
    emailInput.disabled = false;
    passwordInput.disabled = false;
  }
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
}

function hideError() {
  errorMessage.style.display = 'none';
}

// Focus email input on load
window.addEventListener('DOMContentLoaded', () => {
  emailInput.focus();
});
