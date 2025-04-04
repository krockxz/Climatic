/**
 * Options page script for Weather App Chrome Extension
 */

// DOM Elements
const unitsRadios = document.querySelectorAll('input[name="units"]');
const refreshRadios = document.querySelectorAll('input[name="refresh"]');
const saveButton = document.getElementById('save');
const resetButton = document.getElementById('reset');
const statusEl = document.getElementById('status');

// Default settings
const DEFAULT_SETTINGS = {
  units: 'metric',
  refreshInterval: 30 // minutes
};

/**
 * Save options to storage
 */
const saveOptions = () => {
  const units = document.querySelector('input[name="units"]:checked')?.value || DEFAULT_SETTINGS.units;
  const refreshInterval = parseInt(document.querySelector('input[name="refresh"]:checked')?.value || DEFAULT_SETTINGS.refreshInterval);
  
  chrome.storage.local.set({ 
    units, 
    refreshInterval 
  }, () => {
    showStatus('Settings saved successfully!', 'success');
    
    // Notify background script to update alarm if needed
    if (refreshInterval > 0) {
      chrome.runtime.sendMessage({ 
        type: 'UPDATE_REFRESH_INTERVAL', 
        interval: refreshInterval 
      });
    }
  });
};

/**
 * Reset options to defaults
 */
const resetOptions = () => {
  const { units, refreshInterval } = DEFAULT_SETTINGS;
  
  // Set radio buttons to default values
  document.querySelector(`input[name="units"][value="${units}"]`).checked = true;
  document.querySelector(`input[name="refresh"][value="${refreshInterval}"]`).checked = true;
  
  // Save defaults to storage
  chrome.storage.local.set({ 
    units, 
    refreshInterval 
  }, () => {
    showStatus('Settings reset to defaults!', 'success');
    
    // Notify background script to update alarm
    chrome.runtime.sendMessage({ 
      type: 'UPDATE_REFRESH_INTERVAL', 
      interval: refreshInterval 
    });
  });
};

/**
 * Load saved options
 */
const loadOptions = () => {
  chrome.storage.local.get(['units', 'refreshInterval'], (items) => {
    // Set units radio button
    const units = items.units || DEFAULT_SETTINGS.units;
    const unitsRadio = document.querySelector(`input[name="units"][value="${units}"]`);
    if (unitsRadio) unitsRadio.checked = true;
    
    // Set refresh interval radio button
    const refreshInterval = items.refreshInterval ?? DEFAULT_SETTINGS.refreshInterval;
    const refreshRadio = document.querySelector(`input[name="refresh"][value="${refreshInterval}"]`);
    if (refreshRadio) refreshRadio.checked = true;
  });
};

/**
 * Show status message
 * @param {string} message - Message to display
 * @param {string} type - Message type (success, error)
 */
const showStatus = (message, type) => {
  statusEl.textContent = message;
  statusEl.className = `status show ${type}`;
  
  setTimeout(() => {
    statusEl.className = 'status';
  }, 2000);
};

// Event listeners
saveButton.addEventListener('click', saveOptions);
resetButton.addEventListener('click', resetOptions);

// Load options when page opens
document.addEventListener('DOMContentLoaded', loadOptions); 