// wadoversteken.nl — account & favorieten (Supabase Auth + Postgres).
//
// Vereist, in deze volgorde vóór dit bestand geladen in index.html:
//   1. supabase-config.js   (SUPABASE_URL, SUPABASE_ANON_KEY)
//   2. de Supabase-JS-library (CDN, zie index.html)
//
// Zolang supabase-config.js nog de placeholder-waarden bevat, blijft de
// account-knop zichtbaar maar inactief — de rest van de site (getij, wind,
// vertrekvenster) blijft gewoon werken. Zie README.md, sectie
// "Account & favorieten instellen".

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
    '(zie README.md, sectie "Account & favorieten instellen").'
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

// ---------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------

const accountToggleBtn = document.getElementById('account-toggle')
const accountPanel = document.getElementById('account-panel')
const accountStatus = document.getElementById('account-status')
const accountForm = document.getElementById('account-form')
const accountEmail = document.getElementById('account-email')
const accountPassword = document.getElementById('account-password')
const accountError = document.getElementById('account-error')
const accountLoginBtn = document.getElementById('account-login')
const accountSignupBtn = document.getElementById('account-signup')
const accountLogoutBtn = document.getElementById('account-logout')
const favoritesSection = document.getElementById('favorites-section')
const favoritesList = document.getElementById('favorites-list')
const favoritesEmpty = document.getElementById('favorites-empty')

// ---------------------------------------------------------------------------
// Account-paneel: openen/sluiten
// ---------------------------------------------------------------------------

function openAccountPanel() {
  accountPanel.hidden = false
  accountToggleBtn.setAttribute('aria-expanded', 'true')
  if (!currentUser) accountEmail.focus()
}

function closeAccountPanel() {
  accountPanel.hidden = true
  accountToggleBtn.setAttribute('aria-expanded', 'false')
}

if (accountToggleBtn) {
  accountToggleBtn.addEventListener('click', () => {
    if (accountPanel.hidden) openAccountPanel()
    else closeAccountPanel()
  })

  document.addEventListener('click', (e) => {
    if (accountPanel.hidden) return
    if (document.getElementById('account').contains(e.target)) return
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
  ;[accountLoginBtn, accountSignupBtn, accountEmail, accountPassword].forEach((el) => {
    if (el) el.disabled = busy
  })
}

function renderAccountUI() {
  if (!SUPABASE_READY) {
    accountStatus.textContent = 'Accountfunctie nog niet ingesteld (zie supabase-config.js).'
    accountForm.hidden = true
    accountLogoutBtn.hidden = true
    accountToggleBtn.textContent = 'Account'
    if (favoritesSection) favoritesSection.hidden = true
    return
  }

  if (currentUser) {
    accountStatus.textContent = `Ingelogd als ${currentUser.email}`
    accountForm.hidden = true
    accountLogoutBtn.hidden = false
    accountToggleBtn.textContent = 'Account'
    if (favoritesSection) favoritesSection.hidden = false
  } else {
    accountStatus.textContent = 'Niet ingelogd'
    accountForm.hidden = false
    accountLogoutBtn.hidden = true
    accountToggleBtn.textContent = 'Inloggen'
    if (favoritesSection) favoritesSection.hidden = true
  }
}

function vertaalAuthError(error) {
  const msg = (error && error.message) || ''
  if (msg.includes('Invalid login credentials')) return 'E-mail of wachtwoord onjuist.'
  if (msg.includes('User already registered')) return 'Er bestaat al een account met dit e-mailadres.'
  if (msg.includes('Password should be at least')) return 'Wachtwoord moet minimaal 6 tekens zijn.'
  if (msg.includes('Email not confirmed')) return 'Bevestig eerst je e-mail via de link die je hebt ontvangen.'
  if (msg.includes('rate limit')) return 'Te veel pogingen. Probeer het over een minuut opnieuw.'
  return msg || 'Er ging iets mis. Probeer het opnieuw.'
}

// ---------------------------------------------------------------------------
// Inloggen / registreren / uitloggen
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
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password })
    setBusy(false)

    if (error) { setAccountError(vertaalAuthError(error)); return }
    accountPassword.value = ''
  })
}

if (accountSignupBtn) {
  accountSignupBtn.addEventListener('click', async () => {
    if (!supabaseClient) return
    setAccountError('')
    const email = accountEmail.value.trim()
    const password = accountPassword.value

    if (!email || !password) { setAccountError('Vul e-mail en wachtwoord in.'); return }
    if (password.length < 6) { setAccountError('Wachtwoord moet minimaal 6 tekens zijn.'); return }

    setBusy(true)
    const { data, error } = await supabaseClient.auth.signUp({ email, password })
    setBusy(false)

    if (error) { setAccountError(vertaalAuthError(error)); return }

    if (!data.session) {
      accountStatus.textContent = 'Account aangemaakt. Bevestig je e-mail via de link die je hebt ontvangen, log daarna in.'
    }
    accountPassword.value = ''
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
  if (!supabaseClient) return

  if (!currentUser) {
    openAccountPanel()
    setAccountError('')
    accountStatus.textContent = 'Log in of maak een account aan om favorieten op te slaan.'
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
// Auth-status bijhouden
// ---------------------------------------------------------------------------

if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    currentUser = session ? session.user : null
    renderAccountUI()
    if (currentUser) {
      loadFavorites()
    } else {
      currentFavorites = []
      renderFavoritesList()
    }
    refreshFavoriteButtons()
  })
}

renderAccountUI()

// ---------------------------------------------------------------------------
// Publieke API voor app.js
// ---------------------------------------------------------------------------

window.Favorites = {
  buildButtonHtml: buildFavoriteButtonHtml,
  toggle: toggleFavorite,
  refreshButtons: refreshFavoriteButtons,
}
