/**
 * @param {number} bytes 
 * @returns {string}
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * @param {number} ms 
 * @returns {string}
 */
function formatDuration(ms) {
  if (ms < 1000) return ms + 'ms';

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return seconds + 's';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds === 0 ?
      `${minutes}min` :
      `${minutes}min ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes === 0 ?
    `${hours}h` :
    `${hours}h ${remainingMinutes}min`;
}

module.exports = {
  formatFileSize,
  formatDuration
}; 