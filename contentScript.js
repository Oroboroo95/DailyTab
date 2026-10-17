// DailyTab - Content Script
// Inietta l'UI nella homepage di Firefox Mobile

// Funzione per escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Funzione per creare l'elemento DailyTab
function createDailyTabElement(tab) {
  const dailyTabContainer = document.createElement('div');
  dailyTabContainer.id = 'dailytab-container';
  dailyTabContainer.className = 'dailytab-container';

  if (!tab) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'dailytab-card';
    const emptyP = document.createElement('p');
    emptyP.className = 'dailytab-empty';
    emptyP.textContent = 'Nessuna tab non attiva trovata';
    cardDiv.appendChild(emptyP);
    dailyTabContainer.appendChild(cardDiv);
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

  // Crea gli elementi in modo sicuro senza innerHTML
  const headerDiv = document.createElement('div');
  headerDiv.className = 'dailytab-header';
  const titleH2 = document.createElement('h2');
  titleH2.textContent = 'DailyTab';
  const dateP = document.createElement('p');
  dateP.className = 'dailytab-date';
  dateP.textContent = new Date().toLocaleDateString('it-IT');
  headerDiv.appendChild(titleH2);
  headerDiv.appendChild(dateP);

  const cardDiv = document.createElement('div');
  cardDiv.className = 'dailytab-card';

  const iconDiv = document.createElement('div');
  iconDiv.className = 'dailytab-icon';
  const img = document.createElement('img');
  img.src = tab.favicon || browser.runtime.getURL('icons/icon48.png');
  img.alt = 'Favicon';
  iconDiv.appendChild(img);

  const contentDiv = document.createElement('div');
  contentDiv.className = 'dailytab-content';
  const titleH3 = document.createElement('h3');
  titleH3.className = 'dailytab-title';
  titleH3.textContent = tab.title;
  const categoryP = document.createElement('p');
  categoryP.className = 'dailytab-category';
  categoryP.textContent = domain;
  contentDiv.appendChild(titleH3);
  contentDiv.appendChild(categoryP);

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'dailytab-actions';

  const openButton = document.createElement('button');
  openButton.className = 'dailytab-button dailytab-button-open';
  openButton.title = 'Apri';
  openButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>`;

  const deleteButton = document.createElement('button');
  deleteButton.className = 'dailytab-button dailytab-button-delete';
  deleteButton.title = 'Elimina';
  deleteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </svg>`;

  actionsDiv.appendChild(openButton);
  actionsDiv.appendChild(deleteButton);

  cardDiv.appendChild(iconDiv);
  cardDiv.appendChild(contentDiv);
  cardDiv.appendChild(actionsDiv);

  dailyTabContainer.appendChild(headerDiv);
  dailyTabContainer.appendChild(cardDiv);

  // Aggiungi event listener ai pulsanti
  const containerOpenButton = dailyTabContainer.querySelector('.dailytab-button-open');
  const containerDeleteButton = dailyTabContainer.querySelector('.dailytab-button-delete');

  containerOpenButton.addEventListener('click', () => {
    browser.runtime.sendMessage({ type: 'OPEN_TAB' });
  });

  containerDeleteButton.addEventListener('click', () => {
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
