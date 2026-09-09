// wadoversteken.nl — inlogverplichting, account & favorieten (Supabase Auth
// + Postgres).
//
// De site is volledig achter een inlogscherm geplaatst: niemand ziet de
// getij-/vertrekberekening zonder in te loggen. Registreren gaat niet meer
// via de site zelf (uitnodiging-only) — nieuwe gebruikers worden door de
// beheerder handmatig toegevoegd via het Supabase-dashboard (Authentication
// > Users > Add user, met "Auto Confirm User" aangevinkt).
//
// Vereist, in deze volgorde vóór dit bestand geladen in index.html:
//   1. supabase-config.js   (SUPABASE_URL, SUPABASE_ANON_KEY)
//   2. de Supabase-JS-library (CDN, zie index.html)
//
// Als supabase-config.js nog placeholder-waarden bevat (SUPABASE_READY is
// dan false), blijft het inlogscherm permanent zichtbaar met een duidelijke
// melding — de site "faalt dicht", niet open, want anders zou een kapotte
// configuratie de inlogverplichting juist omzeilen.

const SUPABASE_READY =
  typeof SUPABASE_URL === 'string' &&
  typeof SUPABASE_ANON_KEY === 'string' &&
  SUPABASE_URL.startsWith('https://') &&
  !SUPABASE_URL.includes('JOUW-PROJECT') &&
  SUPABASE_ANON_KEY.length > 20

const supabaseClient = SUPABASE_READY
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

if (!SUPABASE_READY) {
  console.warn(
    'wadoversteken.nl: accountfunctie nog niet ingesteld — vul supabase-config.js in ' +
    '(zie README.md, sectie "Account & favorieten instellen"). Het inlogscherm blijft ' +
    'daarom zichtbaar; zonder werkende configuratie kan niemand inloggen.'
  )
}

// ---------------------------------------------------------------------------
// Iconen
// ---------------------------------------------------------------------------

const ICON_STAR =
  '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M10 2.3l2.32 4.7 5.18.76-3.75 3.66.89 5.16L10 14.1l-4.64 2.44.89-5.16-3.75-3.66 5.18-.76z"/></svg>'

const ICON_STAR_FILLED =
  '<svg viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M10 2.3l2.32 4.7 5.18.76-3.75 3.66.89 5.16L10 14.1l-4.64 2.44.89-5.16-3.75-3.66 5.18-.76z"/></svg>'

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

let currentUser = null
let currentFavorites = []
// Voorkomt dat boot() (getij/wind ophalen) telkens opnieuw draait bij elke
// onAuthStateChange-gebeurtenis (bijv. een stille token-refresh, die geen
// echte in-/uitlog-wissel is).
let appStarted = false

// ---------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------

const loginGate = document.getElementById('login-gate')
const appContent = document.getElementById('app-content')
const bootOverlay = document.getElementById('boot-overlay')

const accountToggleBtn = document.getElementById('account-toggle')
const accountPanel = document.getElementById('account-panel')
const accountStatus = document.getElementById('account-status')
const accountLogoutBtn = document.getElementById('account-logout')

const accountForm = document.getElementById('account-form')
const accountEmail = document.getElementById('account-email')
const accountPassword = document.getElementById('account-password')
const accountError = document.getElementById('account-error')
const accountLoginBtn = document.getElementById('account-login')

const favoritesList = document.getElementById('favorites-list')
const favoritesEmpty = document.getElementById('favorites-empty')

// ---------------------------------------------------------------------------
// Poort: inlogscherm tonen/verbergen, site tonen/verbergen
// ---------------------------------------------------------------------------

function hideBootOverlay() {
  if (bootOverlay) bootOverlay.classList.add('hidden')
}

function showApp() {
  if (loginGate) loginGate.hidden = true
  if (appContent) appContent.hidden = false

  if (!appStarted) {
    appStarted = true
    if (typeof window.startApp === 'function') window.startApp()
    else hideBootOverlay()
  }
}

function showGate() {
  if (appContent) appContent.hidden = true
  if (loginGate) loginGate.hidden = false
  hideBootOverlay()
}

// ---------------------------------------------------------------------------
// Account-paneel (rechtsboven, alleen zichtbaar/relevant als je al bent
// ingelogd — toont wie je bent en een uitlogknop, geen formulier meer).
// ---------------------------------------------------------------------------

function openAccountPanel() {
  if (accountPanel) accountPanel.hidden = false
  if (accountToggleBtn) accountToggleBtn.setAttribute('aria-expanded', 'true')
}

function closeAccountPanel() {
  if (accountPanel) accountPanel.hidden = true
  if (accountToggleBtn) accountToggleBtn.setAttribute('aria-expanded', 'false')
}

if (accountToggleBtn) {
  accountToggleBtn.addEventListener('click', () => {
    if (accountPanel.hidden) openAccountPanel()
    else closeAccountPanel()
  })

  document.addEventListener('click', (e) => {
    if (!accountPanel || accountPanel.hidden) return
    const container = document.getElementById('account')
    if (container && container.contains(e.target)) return
    closeAccountPanel()
  })
}

// ---------------------------------------------------------------------------
// UI-status
// ---------------------------------------------------------------------------

function setAccountError(msg) {
  if (!accountError) return
  accountError.textContent = msg || ''
  accountError.hidden = !msg
}

function setBusy(busy) {
  ;[accountLoginBtn, accountEmail, accountPassword].forEach((el) => {
    if (el) el.disabled = busy
  })
}

function renderAccountUI() {
  if (!accountStatus) return
  if (currentUser) {
    accountStatus.textContent = `Ingelogd als ${currentUser.email}`
    if (accountLogoutBtn) accountLogoutBtn.hidden = false
  } else {
    accountStatus.textContent = 'Niet ingelogd'
    if (accountLogoutBtn) accountLogoutBtn.hidden = true
  }
}

function vertaalAuthError(error) {
  const msg = (error && error.message) || ''
  if (msg.includes('Invalid login credentials')) return 'E-mail of wachtwoord onjuist.'
  if (msg.includes('Email not confirmed')) return 'Dit account is nog niet bevestigd. Vraag de beheerder dit na te kijken.'
  if (msg.includes('rate limit')) return 'Te veel pogingen. Probeer het over een minuut opnieuw.'
  return msg || 'Er ging iets mis. Probeer het opnieuw.'
}

// ---------------------------------------------------------------------------
// Inloggen / uitloggen (registreren gaat niet meer via de site)
// ---------------------------------------------------------------------------

if (accountForm) {
  accountForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (!supabaseClient) return
    setAccountError('')
    const email = accountEmail.value.trim()
    const password = accountPassword.value
    if (!email || !password) return

    setBusy(true)
    try {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password })
      if (error) { setAccountError(vertaalAuthError(error)); return }
      accountPassword.value = ''
    } catch (err) {
      // Als signInWithPassword zelf een fout gooit (netwerk, CORS, een
      // onverwachte reactie van Supabase) in plaats van netjes een
      // { error }-object terug te geven, bleef de knop hiervoor stil
      // uitgeschakeld staan zonder enige melding. Dit vangt dat op.
      console.error('Inloggen mislukt met een onverwachte fout:', err)
      setAccountError('Inloggen lukte niet door een technisch probleem. Probeer het opnieuw, of kijk in de browserconsole (F12) voor details.')
    } finally {
      setBusy(false)
    }
  })
}

if (accountLogoutBtn) {
  accountLogoutBtn.addEventListener('click', () => {
    if (!supabaseClient) return
    supabaseClient.auth.signOut()
  })
}

// ---------------------------------------------------------------------------
// Favorieten laden & tonen
// ---------------------------------------------------------------------------

async function loadFavorites() {
  if (!supabaseClient || !currentUser) return
  const { data, error } = await supabaseClient
    .from('favorites')
    .select('*')
    .order('vertrek', { ascending: true })

  if (error) {
    console.error('Kon favorieten niet laden:', error.message)
    return
  }

  currentFavorites = data || []
  renderFavoritesList()
  refreshFavoriteButtons()
}

function findFavorite(routeId, vertrekISO) {
  const target = new Date(vertrekISO).getTime()
  return currentFavorites.find((f) => f.route_id === routeId && new Date(f.vertrek).getTime() === target)
}

function renderFavoritesList() {
  if (!favoritesList) return

  if (currentFavorites.length === 0) {
    favoritesList.innerHTML = ''
    if (favoritesEmpty) favoritesEmpty.hidden = false
    return
  }

  if (favoritesEmpty) favoritesEmpty.hidden = true

  favoritesList.innerHTML = currentFavorites.map((f) => {
    const vertrek = new Date(f.vertrek)
    const tijdLabel = f.vertrek_eind
      ? `${formatDateTime(vertrek)} tot ${formatTime(new Date(f.vertrek_eind))}`
      : formatDateTime(vertrek)
    return `
      <li class="favorites__item">
        <div class="favorites__route">
          <span>${f.van} → ${f.naar}</span>
          <span class="favorites__time">${tijdLabel}</span>
        </div>
        <button class="favorites__remove" type="button" data-id="${f.id}" aria-label="Verwijder favoriet">×</button>
      </li>
    `
  }).join('')
}

if (favoritesList) {
  favoritesList.addEventListener('click', (e) => {
    const btn = e.target.closest('.favorites__remove')
    if (!btn) return
    removeFavoriteById(btn.dataset.id, btn)
  })
}

async function removeFavoriteById(id, btn) {
  if (!supabaseClient) return
  if (btn) btn.disabled = true
  const { error } = await supabaseClient.from('favorites').delete().eq('id', id)
  if (!error) {
    currentFavorites = currentFavorites.filter((f) => f.id !== id)
    renderFavoritesList()
    refreshFavoriteButtons()
  } else {
    console.error('Verwijderen favoriet mislukt:', error.message)
    if (btn) btn.disabled = false
  }
}

// ---------------------------------------------------------------------------
// Favoriet-knop bij een vertrekmoment (gebruikt door app.js)
// ---------------------------------------------------------------------------

function buildFavoriteButtonHtml(route, d) {
  const vertrekISO = d.vertrek.toISOString()
  const actief = Boolean(findFavorite(route.id, vertrekISO))
  const eindAttr = d.isWindow && d.vertrekEind ? ` data-vertrek-eind="${d.vertrekEind.toISOString()}"` : ''
  const eventAttr = d.eventType ? ` data-event-type="${d.eventType}"` : ''
  return `<button class="result__action${actief ? ' result__action--fav-active' : ''}" type="button" data-action="favorite" data-route-id="${route.id}" data-vertrek="${vertrekISO}"${eindAttr}${eventAttr} aria-label="${actief ? 'Verwijder uit favorieten' : 'Bewaar als favoriet'}" aria-pressed="${actief}" title="Favoriet">${actief ? ICON_STAR_FILLED : ICON_STAR}</button>`
}

function refreshFavoriteButtons() {
  document.querySelectorAll('.result__action[data-action="favorite"]').forEach((btn) => {
    const actief = Boolean(findFavorite(btn.dataset.routeId, btn.dataset.vertrek))
    btn.classList.toggle('result__action--fav-active', actief)
    btn.setAttribute('aria-pressed', String(actief))
    btn.setAttribute('aria-label', actief ? 'Verwijder uit favorieten' : 'Bewaar als favoriet')
    btn.innerHTML = actief ? ICON_STAR_FILLED : ICON_STAR
  })
}

async function toggleFavorite(route, departure, btn) {
  if (!supabaseClient || !currentUser) {
    // Zou niet moeten kunnen gebeuren: de site zelf is alleen zichtbaar als
    // je bent ingelogd. Puur een vangnet, bijv. als een sessie net tussentijds
    // is verlopen.
    console.warn('Niet ingelogd, kan favoriet niet opslaan.')
    return
  }

  const vertrekISO = departure.vertrek.toISOString()
  const existing = findFavorite(route.id, vertrekISO)

  if (btn) btn.disabled = true
  try {
    if (existing) {
      const { error } = await supabaseClient.from('favorites').delete().eq('id', existing.id)
      if (error) throw error
      currentFavorites = currentFavorites.filter((f) => f.id !== existing.id)
    } else {
      const row = {
        user_id: currentUser.id,
        route_id: route.id,
        van: route.van,
        naar: route.naar,
        advies: route.advies,
        referentiepunt: route.referentiepunt,
        event_type: departure.eventType || null,
        vertrek: vertrekISO,
        vertrek_eind: departure.isWindow && departure.vertrekEind ? departure.vertrekEind.toISOString() : null,
      }
      const { data, error } = await supabaseClient.from('favorites').insert(row).select().single()
      if (error) throw error
      currentFavorites.push(data)
    }
    renderFavoritesList()
    refreshFavoriteButtons()
  } catch (err) {
    console.error('Favoriet opslaan/verwijderen mislukt:', err.message)
  } finally {
    if (btn) btn.disabled = false
  }
}

// ---------------------------------------------------------------------------
// Auth-status bijhouden: bepaalt of het inlogscherm of de site te zien is
// ---------------------------------------------------------------------------

function handleSession(session) {
  currentUser = session ? session.user : null
  renderAccountUI()

  if (currentUser) {
    showApp()
    loadFavorites()
  } else {
    appStarted = false
    currentFavorites = []
    renderFavoritesList()
    showGate()
  }
  refreshFavoriteButtons()
}

if (SUPABASE_READY) {
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    handleSession(session)
  })
} else {
  // Zonder werkende configuratie kan niemand ooit inloggen: toon het
  // inlogscherm met een duidelijke melding en zet het formulier op slot,
  // in plaats van de site per ongeluk open te laten staan.
  setAccountError('Inloggen is nog niet ingesteld (zie supabase-config.js).')
  if (accountLoginBtn) accountLoginBtn.disabled = true
  if (accountEmail) accountEmail.disabled = true
  if (accountPassword) accountPassword.disabled = true
  showGate()
}

// ---------------------------------------------------------------------------
// Publieke API voor app.js
// ---------------------------------------------------------------------------

window.Favorites = {
  buildButtonHtml: buildFavoriteButtonHtml,
  toggle: toggleFavorite,
  refreshButtons: refreshFavoriteButtons,
}

window.Auth = {
  // Geeft het huidige (geldige, eventueel net ververste) toegangstoken
  // terug, of null als er geen sessie is. Gebruikt door app.js om
  // /api/getij te authenticeren.
  getAccessToken: async function () {
    if (!supabaseClient) return null
    const { data } = await supabaseClient.auth.getSession()
    return data && data.session ? data.session.access_token : null
  },
}
