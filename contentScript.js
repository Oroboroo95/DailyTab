// DailyTab - Content Script
// Inietta l'UI nella homepage di Firefox Mobile

// Funzione per creare l'elemento DailyTab
function createDailyTabElement(tab) {
  const dailyTabContainer = document.createElement('div');
  dailyTabContainer.id = 'dailytab-container';
  dailyTabContainer.className = 'dailytab-container';

  if (!tab) {
    dailyTabContainer.innerHTML = `
      <div class="dailytab-card">
        <p class="dailytab-empty">Nessuna tab non attiva trovata</p>
      </div>
    `;
    return dailyTabContainer;
  }

  // Estrai il dominio dall'URL per mostrare come categoria
  let domain = 'Web';
  try {
    const url = new URL(tab.url);
    domain = url.hostname.replace('www.', '');
  } catch (e) {
    console.error('Errore nel parsing dell\'URL:', e);
  }

  dailyTabContainer.innerHTML = `
    <div class="dailytab-header">
      <h2>DailyTab</h2>
      <p class="dailytab-date">${new Date().toLocaleDateString('it-IT')}</p>
    </div>
    <div class="dailytab-card">
      <div class="dailytab-icon">
        <img src="${tab.favicon || browser.runtime.getURL('icons/icon48.png')}" alt="Favicon" />
      </div>
      <div class="dailytab-content">
        <h3 class="dailytab-title">${escapeHtml(tab.title)}</h3>
        <p class="dailytab-category">${escapeHtml(domain)}</p>
      </div>
      <div class="dailytab-actions">
        <button class="dailytab-button dailytab-button-open" title="Apri">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </button>
        <button class="dailytab-button dailytab-button-delete" title="Elimina">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  // Aggiungi event listener ai pulsanti
  const openButton = dailyTabContainer.querySelector('.dailytab-button-open');
  const deleteButton = dailyTabContainer.querySelector('.dailytab-button-delete');

  openButton.addEventListener('click', () => {
    browser.runtime.sendMessage({ type: 'OPEN_TAB' });
  });

  deleteButton.addEventListener('click', () => {
    if (confirm('Sei sicuro di voler eliminare questa tab?')) {
      browser.runtime.sendMessage({ type: 'DELETE_TAB' });
    }
  });

  return dailyTabContainer;
}

// Funzione per iniettare l'UI nella homepage
function injectDailyTabUI(tab) {
  // Rimuovi eventuali elementi DailyTab esistenti
  const existingContainer = document.getElementById('dailytab-container');
  if (existingContainer) {
    existingContainer.remove();
  }

  // Crea il nuovo elemento
  const container = createDailyTabElement(tab);

  // Trova il punto di iniezione nella homepage di Firefox Mobile
  // Cerchiamo la sezione "Continua" o le scorciatoie
  const continueSection = document.querySelector('section[data-l10n-id="topSitesSection"]') ||
                         document.querySelector('section[data-l10n-id="continueSection"]') ||
                         document.querySelector('.top-sites') ||
                         document.querySelector('.continue-section');

  if (continueSection) {
    // Inserisci prima della sezione trovata
    continueSection.parentNode.insertBefore(container, continueSection);
  } else {
    // Se non troviamo la sezione, aggiungi in cima al body
    document.body.prepend(container);
  }
}

// Funzione per escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Richiede la DailyTab corrente al background
async function requestDailyTab() {
  try {
    const response = await browser.runtime.sendMessage({ type: 'GET_DAILY_TAB' });
    return response.tab;
  } catch (error) {
    console.error('Errore nella richiesta della DailyTab:', error);
    return null;
  }
}

// Listener per i messaggi dal background
browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'UPDATE_DAILY_TAB') {
    injectDailyTabUI(message.data);
  }
});

// Inizializzazione
async function init() {
  const tab = await requestDailyTab();
  injectDailyTabUI(tab);
  
  // Verifica periodicamente se ci sono aggiornamenti
  setInterval(async () => {
    const newTab = await requestDailyTab();
    if (newTab && (!currentTab || newTab.id !== currentTab.id)) {
      currentTab = newTab;
      injectDailyTabUI(newTab);
    }
  }, 60000); // Controlla ogni minuto
}

// Avvia l'inizializzazione quando il DOM è pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
