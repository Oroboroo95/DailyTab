// DailyTab - Pagina locale per Firefox Android
// Mostra un feed di tab e segnalibri salvati in chrome.storage

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
  
  item.innerHTML = `
    <div class="dailytab-icon">
      <img src="${escapeHtml(faviconImg)}" alt="Favicon" onerror="this.src='${browser.runtime.getURL('icons/icon48.png')}'" />
    </div>
    <div class="dailytab-content">
      <a href="${escapeHtml(url)}" class="dailytab-title" target="_blank">${escapeHtml(title)}</a>
      <p class="dailytab-url">${escapeHtml(new URL(url).hostname.replace('www.', ''))}</p>
    </div>
    <div class="dailytab-actions">
      <button class="dailytab-button dailytab-button-open" title="Apri" data-url="${escapeHtml(url)}">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </button>
    </div>
  `;
  
  // Aggiungi event listener al pulsante Apri
  const openButton = item.querySelector('.dailytab-button-open');
  openButton.addEventListener('click', (e) => {
    e.preventDefault();
    const url = openButton.getAttribute('data-url');
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
    // Carica tab e segnalibri da chrome.storage
    const result = await browser.storage.local.get(['tabs', 'bookmarks']);
    
    const tabs = result.tabs || [];
    const bookmarks = result.bookmarks || [];
    
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
        tabsContainer.innerHTML = '<p class="dailytab-empty">Nessuna tab inattiva trovata</p>';
      } else {
        sortedTabs.forEach(tab => {
          tabsContainer.appendChild(createFeedItem(tab.title, tab.url, tab.favicon, 'tab'));
        });
      }
    }
    
    // Mostra i segnalibri
    const bookmarksContainer = document.getElementById('bookmarks-container');
    if (bookmarksContainer) {
      bookmarksContainer.innerHTML = '';
      if (bookmarks.length === 0) {
        bookmarksContainer.innerHTML = '<p class="dailytab-empty">Nessun segnalibro trovato</p>';
      } else {
        bookmarks.forEach(bm => {
          bookmarksContainer.appendChild(createFeedItem(bm.title, bm.url, bm.favicon, 'bookmark'));
        });
      }
    }
    
  } catch (error) {
    console.error('Errore nel caricamento dei dati:', error);
    document.getElementById('tabs-container').innerHTML = '<p class="dailytab-error">Errore nel caricamento delle tab</p>';
    document.getElementById('bookmarks-container').innerHTML = '<p class="dailytab-error">Errore nel caricamento dei segnalibri</p>';
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
