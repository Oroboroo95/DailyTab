// DailyTab - Popup Script
// Gestisce l'interfaccia delle impostazioni

// Carica la configurazione
async function loadConfig() {
  try {
    const response = await fetch(browser.runtime.getURL('config.json'));
    return await response.json();
  } catch (error) {
    console.error('Errore nel caricamento della configurazione:', error);
    return {
      blacklist: { bookmark_folders: [], tab_categories: [] },
      whitelist: { bookmark_folders: [], tab_categories: ["inactive_tabs"] },
      daily_tab_settings: { enabled: true, update_frequency_hours: 24, notification_time: "18:00" }
    };
  }
}

// Salva la configurazione
async function saveConfig(config) {
  try {
    // Invia la configurazione al background per il salvataggio
    await browser.runtime.sendMessage({
      type: 'SAVE_CONFIG',
      config: config
    });
    return true;
  } catch (error) {
    console.error('Errore nel salvataggio della configurazione:', error);
    return false;
  }
}

// Inizializza la popup
async function init() {
  const config = await loadConfig();
  
  // Imposta i valori nei campi del form
  document.getElementById('updateFrequency').value = config.daily_tab_settings.update_frequency_hours;
  document.getElementById('notificationTime').value = config.daily_tab_settings.notification_time;
  document.getElementById('blacklistFolders').value = config.blacklist.bookmark_folders.join('\n');
  document.getElementById('whitelistFolders').value = config.whitelist.bookmark_folders.join('\n');
  
  // Aggiungi event listener ai pulsanti
  document.getElementById('saveSettings').addEventListener('click', async () => {
    const updateFrequency = parseInt(document.getElementById('updateFrequency').value) || 24;
    const notificationTime = document.getElementById('notificationTime').value || '18:00';
    
    config.daily_tab_settings.update_frequency_hours = updateFrequency;
    config.daily_tab_settings.notification_time = notificationTime;
    
    const success = await saveConfig(config);
    if (success) {
      alert('Impostazioni salvate!');
    }
  });
  
  document.getElementById('saveBlacklist').addEventListener('click', async () => {
    const blacklistText = document.getElementById('blacklistFolders').value;
    config.blacklist.bookmark_folders = blacklistText.split('\n').filter(line => line.trim() !== '');
    
    const success = await saveConfig(config);
    if (success) {
      alert('Blacklist salvata!');
    }
  });
  
  document.getElementById('saveWhitelist').addEventListener('click', async () => {
    const whitelistText = document.getElementById('whitelistFolders').value;
    config.whitelist.bookmark_folders = whitelistText.split('\n').filter(line => line.trim() !== '');
    
    const success = await saveConfig(config);
    if (success) {
      alert('Whitelist salvata!');
    }
  });
}

// Avvia l'inizializzazione quando il DOM è pronto
document.addEventListener('DOMContentLoaded', init);
