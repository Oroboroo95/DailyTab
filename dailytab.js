// DailyTab - Pagina locale per Firefox Android
// Mostra un feed di tab salvate in chrome.storage

// Funzione per escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Funzione per creare un elemento del feed
function createFeedItem(title, url, favicon, type) {
  const item = document.createElement('div');
  item.className = `dailytab-item ${type}`;
  
  const faviconImg = favicon || browser.runtime.getURL('icons/icon48.png');
  
  // Crea la struttura DOM in modo sicuro
  const iconDiv = document.createElement('div');
  iconDiv.className = 'dailytab-icon';
  const img = document.createElement('img');
  img.src = faviconImg;
  img.alt = 'Favicon';
  img.onerror = function() { this.src = browser.runtime.getURL('icons/icon48.png'); };
  iconDiv.appendChild(img);

  const contentDiv = document.createElement('div');
  contentDiv.className = 'dailytab-content';
  const link = document.createElement('a');
  link.href = url;
  link.className = 'dailytab-title';
  link.target = '_blank';
  link.textContent = title;
  contentDiv.appendChild(link);
  
  const urlP = document.createElement('p');
  urlP.className = 'dailytab-url';
  try {
    urlP.textContent = new URL(url).hostname.replace('www.', '');
  } catch (e) {
    urlP.textContent = 'Web';
  }
  contentDiv.appendChild(urlP);

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'dailytab-actions';
  
  const openButton = document.createElement('button');
  openButton.className = 'dailytab-button dailytab-button-open';
  openButton.title = 'Apri';
  openButton.setAttribute('data-url', url);
  openButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>`;
  actionsDiv.appendChild(openButton);

  item.appendChild(iconDiv);
  item.appendChild(contentDiv);
  item.appendChild(actionsDiv);
  
  // Aggiungi event listener al pulsante Apri
  const containerOpenButton = item.querySelector('.dailytab-button-open');
  containerOpenButton.addEventListener('click', (e) => {
    e.preventDefault();
    const url = containerOpenButton.getAttribute('data-url');
    browser.tabs.create({ url: url });
  });
  
  return item;
}

// Funzione per aggiornare la data
function updateDate() {
  const dateElement = document.getElementById('current-date');
  if (dateElement) {
    dateElement.textContent = new Date().toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

// Funzione per caricare e mostrare i dati
async function loadAndDisplayData() {
  try {
    // Carica tab da chrome.storage
    const result = await browser.storage.local.get(['tabs']);
    
    const tabs = result.tabs || [];
    
    // Ordina le tab per lastAccessed (più vecchie prima)
    const sortedTabs = tabs.sort((a, b) => {
      const timeA = a.lastAccessed || 0;
      const timeB = b.lastAccessed || 0;
      return timeA - timeB;
    });
    
    // Mostra le tab
    const tabsContainer = document.getElementById('tabs-container');
    if (tabsContainer) {
      tabsContainer.innerHTML = '';
      if (sortedTabs.length === 0) {
        const emptyP = document.createElement('p');
        emptyP.className = 'dailytab-empty';
        emptyP.textContent = 'Nessuna tab inattiva trovata';
        tabsContainer.appendChild(emptyP);
      } else {
        sortedTabs.forEach(tab => {
          tabsContainer.appendChild(createFeedItem(tab.title, tab.url, tab.favicon, 'tab'));
        });
      }
    }
    
  } catch (error) {
    console.error('Errore nel caricamento dei dati:', error);
    const tabsContainer = document.getElementById('tabs-container');
    if (tabsContainer) {
      const errorP = document.createElement('p');
      errorP.className = 'dailytab-error';
      errorP.textContent = 'Errore nel caricamento delle tab';
      tabsContainer.appendChild(errorP);
    }
  }
}

// Funzione per aggiornare i dati
async function refreshData() {
  try {
    // Invia messaggio a background per aggiornare i dati
    await browser.runtime.sendMessage({ type: 'REFRESH_DATA' });
    await loadAndDisplayData();
  } catch (error) {
    console.error('Errore nell\'aggiornamento dei dati:', error);
  }
}

// Listener per i messaggi dal background
browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'DATA_UPDATED') {
    loadAndDisplayData();
  }
});

// Inizializzazione
async function init() {
  updateDate();
  await loadAndDisplayData();
  
  // Aggiorna ogni 5 minuti
  setInterval(loadAndDisplayData, 5 * 60 * 1000);
  
  // Aggiungi pulsante di refresh (opzionale)
  const header = document.querySelector('.dailytab-header');
  if (header) {
    const refreshButton = document.createElement('button');
    refreshButton.className = 'dailytab-refresh-button';
    refreshButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M20.5 15a9 9 0 1 0-13.8 5.3"/><circle cx="12" cy="12" r="1"/></svg>';
    refreshButton.addEventListener('click', refreshData);
    header.appendChild(refreshButton);
  }
}

// Avvia l'inizializzazione quando il DOM è pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
