import { showToast } from './ui.js';

const scheduleInputsDiv = document.getElementById('scheduleInputs');
const addScheduleButton = document.getElementById('addSchedule');

function updateScheduleLabels() {
  scheduleInputsDiv.querySelectorAll('.schedule-item').forEach((item, index) => {
    const label = item.querySelector('.schedule-label');
    if (label) {
      label.textContent = `Horário ${index + 1}:`;
    }
  });
}

function formatTimeInput(e) {
  let value = e.target.value.replace(/\D/g, '');
  if (value.length > 2) {
    value = value.substring(0, 2) + ':' + value.substring(2, 4);
  }
  e.target.value = value;
  if (value.length === 5) {
    const [hours, minutes] = value.split(':').map(Number);
    if (hours > 23) e.target.value = '23:' + String(minutes).padStart(2, '0');
    if (minutes > 59) e.target.value = String(hours).padStart(2, '0') + ':59';
  }
}

export function addScheduleInput(value = '') {
  const scheduleItem = document.createElement('div');
  scheduleItem.className = 'schedule-item';
  scheduleItem.innerHTML = `
        <label class="schedule-label"></label>
        <div class="input-wrapper">
            <i data-lucide="clock" class="input-icon"></i>
            <input type="text" class="schedule-time" value="${value}" placeholder="HH:MM" maxlength="5">
        </div>
        <button type="button" class="btn btn-outline btn-sm remove-schedule" title="Remover horário">
            <i data-lucide="trash-2"></i>
        </button>
    `;

  scheduleItem.querySelector('.schedule-time').addEventListener('input', formatTimeInput);
  scheduleItem.querySelector('.remove-schedule').addEventListener('click', () => {
    if (scheduleInputsDiv.querySelectorAll('.schedule-item').length <= 1) {
      showToast('É necessário ter pelo menos um horário.', 'error');
      return;
    }
    scheduleItem.style.opacity = '0';
    scheduleItem.style.transform = 'translateX(20px)';
    setTimeout(() => {
      scheduleItem.remove();
      updateScheduleLabels();
    }, 300);
  });

  scheduleInputsDiv.appendChild(scheduleItem);
  updateScheduleLabels();
  if (window.lucide) window.lucide.createIcons();
  if (value === '') {
    setTimeout(() => scheduleItem.querySelector('input').focus(), 100);
  }
}

export function getScheduleTimes() {
  return Array.from(document.querySelectorAll('.schedule-time'))
    .map(input => input.value.trim())
    .filter(value => /^\d{2}:\d{2}$/.test(value));
}

export function setupScheduling() {
  if (addScheduleButton) {
    addScheduleButton.addEventListener('click', () => addScheduleInput());
  }
} 