// DailyTab - Background Script
// Gestisce la logica per selezionare e aggiornare la DailyTab

// Variabili globali
let currentDailyTab = null;
let lastUpdateTime = null;

// Carica la configurazione dal file config.json
async function loadConfig() {
  try {
    const response = await fetch(browser.runtime.getURL('config.json'));
    return await response.json();
  } catch (error) {
    console.error('Errore nel caricamento della configurazione:', error);
    // Configurazione predefinita in caso di errore
    return {
      blacklist: { bookmark_folders: [], tab_categories: [] },
      whitelist: { bookmark_folders: [], tab_categories: ["inactive_tabs"] },
      daily_tab_settings: { enabled: true, update_frequency_hours: 24, notification_time: "18:00" }
    };
  }
}

// Salva la DailyTab corrente nello storage
async function saveDailyTab(tab) {
  try {
    await browser.storage.local.set({
      dailyTab: tab,
      lastUpdateTime: Date.now()
    });
    currentDailyTab = tab;
    lastUpdateTime = Date.now();
    console.log('DailyTab salvata:', tab);
  } catch (error) {
    console.error('Errore nel salvataggio della DailyTab:', error);
  }
}

// Carica la DailyTab corrente dallo storage
async function loadDailyTab() {
  try {
    const result = await browser.storage.local.get(['dailyTab', 'lastUpdateTime']);
    currentDailyTab = result.dailyTab;
    lastUpdateTime = result.lastUpdateTime;
    console.log('DailyTab caricata:', currentDailyTab);
  } catch (error) {
    console.error('Errore nel caricamento della DailyTab:', error);
  }
}

// Ottiene le tab non attive (aperte ma non attive)
async function getInactiveTabs() {
  try {
    const tabs = await browser.tabs.query({ active: false, currentWindow: false });
    // Filtra le tab valide (con URL e titolo)
    const validTabs = tabs.filter(tab => tab.url && tab.title && !tab.url.startsWith('about:'));
    console.log('Tab non attive trovate:', validTabs.length);
    return validTabs;
  } catch (error) {
    console.error('Errore nel recupero delle tab non attive:', error);
    return [];
  }
}

// Seleziona la tab più vecchia tra quelle non attive
async function selectOldestInactiveTab() {
  const inactiveTabs = await getInactiveTabs();
  
  if (inactiveTabs.length === 0) {
    console.log('Nessuna tab non attiva trovata');
    return null;
  }

  // Ordina per lastAccessed (più vecchia prima)
  inactiveTabs.sort((a, b) => {
    const timeA = a.lastAccessed || 0;
    const timeB = b.lastAccessed || 0;
    return timeA - timeB;
  });

  // Seleziona la più vecchia
  const oldestTab = inactiveTabs[0];
  console.log('Tab più vecchia selezionata:', oldestTab);
  
  return {
    id: oldestTab.id,
    title: oldestTab.title,
    url: oldestTab.url,
    favicon: oldestTab.favIconUrl || browser.runtime.getURL('icons/icon48.png'),
    category: 'inactive_tabs',
    lastAccessed: oldestTab.lastAccessed
  };
}

// Aggiorna la DailyTab
async function updateDailyTab() {
  const config = await loadConfig();
  
  if (!config.daily_tab_settings.enabled) {
    console.log('DailyTab disabilitata');
    return;
  }

  const newTab = await selectOldestInactiveTab();
  
  if (newTab) {
    await saveDailyTab(newTab);
    // Invia messaggio ai content script per aggiornare l'UI
    await sendMessageToContentScripts({ type: 'UPDATE_DAILY_TAB', data: newTab });
  }
}

// Invia messaggio a tutti i content script
async function sendMessageToContentScripts(message) {
  try {
    const tabs = await browser.tabs.query({ url: ["about:home", "about:newtab"] });
    for (const tab of tabs) {
      try {
        await browser.tabs.sendMessage(tab.id, message);
      } catch (e) {
        console.log('Content script non caricato in tab:', tab.id);
      }
    }
  } catch (error) {
    console.error('Errore nell\'invio del messaggio ai content script:', error);
  }
}

// Verifica se è il momento di aggiornare la DailyTab
async function checkAndUpdateDailyTab() {
  const config = await loadConfig();
  const now = Date.now();
  const updateFrequencyMs = config.daily_tab_settings.update_frequency_hours * 60 * 60 * 1000;

  // Se non c'è una DailyTab salvata o è passato il tempo di aggiornamento
  if (!lastUpdateTime || (now - lastUpdateTime) >= updateFrequencyMs) {
    await updateDailyTab();
  }
}

// Gestisce i messaggi dai content script e dalla pagina dailytab
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_DAILY_TAB') {
    sendResponse({ tab: currentDailyTab });
  } else if (message.type === 'OPEN_TAB') {
    if (currentDailyTab && currentDailyTab.url) {
      browser.tabs.create({ url: currentDailyTab.url });
    }
    sendResponse({ success: true });
  } else if (message.type === 'DELETE_TAB') {
    if (currentDailyTab && currentDailyTab.id) {
      browser.tabs.remove(currentDailyTab.id);
      updateDailyTab();
    }
    sendResponse({ success: true });
  } else if (message.type === 'SAVE_CONFIG') {
    sendResponse({ success: true });
  } else if (message.type === 'REFRESH_DATA') {
    saveTabs();
    sendResponse({ success: true });
  }
});

// Funzione per salvare le tab aperte in chrome.storage
async function saveTabs() {
  try {
    const tabs = await browser.tabs.query({});
    const validTabs = tabs.filter(tab => tab.url && tab.title && !tab.url.startsWith('about:') && !tab.url.startsWith('moz-extension:'));
    await browser.storage.local.set({ 
      tabs: validTabs.map(t => ({ 
        title: t.title, 
        url: t.url, 
        favicon: t.favIconUrl,
        lastAccessed: t.lastAccessed 
      })) 
    });
    console.log('Tab salvate:', validTabs.length);
  } catch (error) {
    console.error('Errore nel salvataggio delle tab:', error);
  }
}



// Inizializzazione
async function init() {
  await loadDailyTab();
  await checkAndUpdateDailyTab();
  
  // Salva i dati iniziali (solo tab)
  await saveTabs();
  
  // Imposta un allarme per aggiornare la DailyTab ogni 24 ore
  const config = await loadConfig();
  browser.alarms.create('updateDailyTab', { 
    delayInMinutes: 0, 
    periodInMinutes: config.daily_tab_settings.update_frequency_hours * 60 
  });
  
  // Imposta un allarme per sincronizzare le tab ogni 10 minuti
  browser.alarms.create('syncTabs', { 
    delayInMinutes: 0, 
    periodInMinutes: 10 
  });
}

// Listener per l'allarme
browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'updateDailyTab') {
    updateDailyTab();
  } else if (alarm.name === 'syncTabs') {
    saveTabs();
  }
});

// Avvia l'inizializzazione
init();

// Aggiorna la DailyTab quando viene aperta una nuova finestra
browser.windows.onFocusChanged.addListener(async () => {
  await checkAndUpdateDailyTab();
});
