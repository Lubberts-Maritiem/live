// wadoversteken.nl — applicatielogica.
// Verwacht dat routes-data.js hiervóór is geladen (ROUTES, REFERENCE_LABELS,
// REFERENCE_COORDS, PLACES, en de constantes staan dan als globals klaar).

// ---------------------------------------------------------------------------
// Kleine SVG-iconen (i.p.v. emoji, voor consistente stijl op elk platform).
// ---------------------------------------------------------------------------

const ICON_WARNING =
  '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M10 2.5 18 17H2Z"/><path d="M10 8v4"/><circle cx="10" cy="14.5" r="0.4" fill="currentColor"/></svg>'

const ICON_WIND =
  '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">' +
  '<path d="M2 7h9.5a2.25 2.25 0 1 0-2.1-3"/><path d="M2 13h12.5a2.25 2.25 0 1 1-2.1 3"/></svg>'

// Klein en subtiel: iconen voor de deel-/agendaknoppen per vertrekmoment.
const ICON_SHARE =
  '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M10 3v9"/><path d="M6.5 6.5 10 3l3.5 3.5"/><path d="M4 11v4a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-4"/></svg>'

const ICON_CALENDAR =
  '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<rect x="3" y="4.5" width="14" height="12" rx="1.5"/><path d="M3 8h14"/><path d="M7 2.5v3M13 2.5v3"/><path d="M10 10.5v4M8 12.5h4"/></svg>'

const ICON_CHECK =
  '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M4 10.5 8 14l8-8"/></svg>'

// ---------------------------------------------------------------------------
// Tijd- en datumformattering
// ---------------------------------------------------------------------------

function formatTime(date) {
  return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

function formatDateTime(date) {
  return date.toLocaleString('nl-NL', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Kernlogica: vertrekmomenten berekenen uit getij-extremen
// ---------------------------------------------------------------------------

/**
 * Zet een lijst getij-extremen (HW/LW-tijdstippen) om in vertrekmomenten
 * voor een route, op basis van route.offsetMinuten (vast moment of venster).
 */
function computeDepartures(extremen, route) {
  const isWindow = Array.isArray(route.offsetMinuten)

  return extremen
    .filter((e) => e.type === route.event)
    .map((e) => {
      const eventTime = new Date(e.tijdstip)
      if (isWindow) {
        const [startOffset, eindOffset] = route.offsetMinuten
        const vertrekStart = new Date(eventTime.getTime() + startOffset * 60000)
        const vertrekEind = new Date(eventTime.getTime() + eindOffset * 60000)
        return {
          vertrek: vertrekStart < vertrekEind ? vertrekStart : vertrekEind,
          vertrekEind: vertrekStart < vertrekEind ? vertrekEind : vertrekStart,
          eventTime,
          eventType: e.type,
          isWindow: true,
        }
      }
      const vertrek = new Date(eventTime.getTime() + route.offsetMinuten * 60000)
      return { vertrek, eventTime, eventType: e.type, isWindow: false }
    })
}

function findRoutes(from, to) {
  return ROUTES.filter((r) => r.van === from && r.naar === to)
}

/** Alle bestemmingen die vanaf `from` bereikbaar zijn, alfabetisch. */
function destinationsFrom(from) {
  return Array.from(new Set(ROUTES.filter((r) => r.van === from).map((r) => r.naar))).sort()
}

// ---------------------------------------------------------------------------
// Wind (Open-Meteo, geen key nodig, rechtstreeks vanuit de browser)
// ---------------------------------------------------------------------------

const windCache = {}

async function getWindForecast(referentiepunt) {
  if (windCache[referentiepunt]) return windCache[referentiepunt]

  const coords = REFERENCE_COORDS[referentiepunt]
  if (!coords) return null

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m&wind_speed_unit=kn&timezone=Europe%2FAmsterdam&forecast_days=10`

  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    windCache[referentiepunt] = data.hourly
    return data.hourly
  } catch {
    return null
  }
}

/** Vindt het dichtstbijzijnde uur in de winddata voor een gegeven moment. */
function windAt(hourly, date) {
  if (!hourly) return null
  const target = date.getTime()
  let closestIdx = -1
  let closestDiff = Infinity
  hourly.time.forEach((t, i) => {
    const diff = Math.abs(new Date(t).getTime() - target)
    if (diff < closestDiff) {
      closestDiff = diff
      closestIdx = i
    }
  })
  if (closestIdx === -1) return null
  // Alleen bruikbaar als het dichtstbijzijnde punt binnen 90 min ligt.
  if (closestDiff > 90 * 60000) return null
  return {
    snelheid: hourly.wind_speed_10m[closestIdx],
    stoten: hourly.wind_gusts_10m[closestIdx],
    richting: hourly.wind_direction_10m[closestIdx],
  }
}

function windRichtingLabel(graden) {
  const richtingen = ['N', 'NNO', 'NO', 'ONO', 'O', 'OZO', 'ZO', 'ZZO', 'Z', 'ZZW', 'ZW', 'WZW', 'W', 'WNW', 'NW', 'NNW']
  return richtingen[Math.round(graden / 22.5) % 16]
}

function isNachtVenster(date) {
  const uur = date.getHours()
  return uur >= NACHT_START_UUR || uur < NACHT_EIND_UUR
}

// ---------------------------------------------------------------------------
// Golfhoogte (Open-Meteo Marine API — zelfde aanpak als de wind hierboven).
// Let op: dit is een golfmodel op ~25 km resolutie, dus voor beschutte
// Waddenzee-punten (bijv. Harlingen) is de waarde een benadering van de
// dichtstbijzijnde open-waterceel, niet een letterlijke meting in de haven.
// Getest en werkend bevonden voor alle 12 referentiepunten.
// ---------------------------------------------------------------------------

const waveCache = {}

async function getWaveForecast(referentiepunt) {
  if (waveCache[referentiepunt]) return waveCache[referentiepunt]

  const coords = REFERENCE_COORDS[referentiepunt]
  if (!coords) return null

  const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${coords.lat}&longitude=${coords.lon}&hourly=wave_height,wave_period&timezone=Europe%2FAmsterdam&forecast_days=10`

  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    waveCache[referentiepunt] = data.hourly
    return data.hourly
  } catch {
    return null
  }
}

/** Vindt het dichtstbijzijnde uur in de golfdata voor een gegeven moment. */
function waveAt(hourly, date) {
  if (!hourly) return null
  const target = date.getTime()
  let closestIdx = -1
  let closestDiff = Infinity
  hourly.time.forEach((t, i) => {
    const diff = Math.abs(new Date(t).getTime() - target)
    if (diff < closestDiff) {
      closestDiff = diff
      closestIdx = i
    }
  })
  if (closestIdx === -1) return null
  if (closestDiff > 90 * 60000) return null
  const hoogte = hourly.wave_height[closestIdx]
  if (hoogte == null) return null
  return {
    hoogte,
    periode: hourly.wave_period ? hourly.wave_period[closestIdx] : null,
  }
}

// Compacte NL-vertaling van de meest voorkomende WMO weather codes die
// Open-Meteo teruggeeft (0-99, standaard mapping).
const WMO_LABELS = {
  0: 'Helder', 1: 'Overwegend helder', 2: 'Gedeeltelijk bewolkt', 3: 'Bewolkt',
  45: 'Mist', 48: 'Aanvriezende mist',
  51: 'Lichte motregen', 53: 'Motregen', 55: 'Dichte motregen',
  56: 'IJzel (licht)', 57: 'IJzel',
  61: 'Lichte regen', 63: 'Regen', 65: 'Zware regen',
  66: 'IJzel (regen)', 67: 'IJzel (zware regen)',
  71: 'Lichte sneeuw', 73: 'Sneeuw', 75: 'Zware sneeuw', 77: 'Sneeuwkorrels',
  80: 'Lichte buien', 81: 'Buien', 82: 'Zware buien',
  85: 'Sneeuwbuien (licht)', 86: 'Sneeuwbuien',
  95: 'Onweer', 96: 'Onweer met hagel (licht)', 99: 'Onweer met hagel',
}
function weatherLabel(code) {
  return WMO_LABELS[code] ?? 'Onbekend'
}

// ---------------------------------------------------------------------------
// Huidig weer + astro (zon op/onder) voor het gekozen vertrekpunt
// ---------------------------------------------------------------------------

const meteoHeading = document.getElementById('meteo-heading')
const meteoBody = document.getElementById('meteo-body')

function meteoSkeletonHtml() {
  return `
    <div class="result__skeleton" role="status" aria-label="Weergegevens laden">
      <div class="result__skeleton-line result__skeleton-line--wide"></div>
      <div class="result__skeleton-line result__skeleton-line--narrow"></div>
      <div class="result__skeleton-line result__skeleton-line--mid"></div>
    </div>
  `
}

async function loadMeteoVoorVertrekpunt(referentiepunt, label) {
  meteoHeading.textContent = `Actueel weer & zon — ${label}`
  meteoBody.innerHTML = meteoSkeletonHtml()

  const coords = REFERENCE_COORDS[referentiepunt]
  if (!coords) {
    meteoBody.innerHTML = `<p class="meteo__status">Geen coördinaten bekend voor dit punt.</p>`
    return
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min&current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code,precipitation&wind_speed_unit=kn&timezone=Europe%2FAmsterdam&forecast_days=1`

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('status ' + res.status)
    const data = await res.json()
    const c = data.current
    const d = data.daily

    const windGevaar = c.wind_gusts_10m >= WIND_STOTEN_WAARSCHUWING_KNOPEN || c.wind_speed_10m >= WIND_WAARSCHUWING_KNOPEN

    // Golfhoogte is een bonus naast wind: als deze fetch faalt of geen data
    // teruggeeft, laat het tegeltje gewoon weg i.p.v. het hele blok te breken.
    const waveHourly = await getWaveForecast(referentiepunt)
    const waveNow = waveAt(waveHourly, new Date())

    meteoBody.innerHTML = `
      <div class="meteo__grid">
        <div class="meteo__item">
          <span class="meteo__label">Weer</span>
          <span class="meteo__value">${weatherLabel(c.weather_code)}</span>
          <span class="meteo__value--sub">${c.temperature_2m.toFixed(1)}°C</span>
        </div>
        <div class="meteo__item">
          <span class="meteo__label">Wind</span>
          <span class="meteo__value${windGevaar ? ' meteo__value--warn' : ''}">${windRichtingLabel(c.wind_direction_10m)} ${Math.round(c.wind_speed_10m)} kn</span>
          <span class="meteo__value--sub">stoten tot ${Math.round(c.wind_gusts_10m)} kn</span>
        </div>
        ${waveNow ? `
        <div class="meteo__item">
          <span class="meteo__label">Golfhoogte</span>
          <span class="meteo__value">${waveNow.hoogte.toFixed(1).replace('.', ',')} m</span>
          ${waveNow.periode != null ? `<span class="meteo__value--sub">periode ${Math.round(waveNow.periode)} s</span>` : ''}
        </div>` : ''}
        <div class="meteo__item">
          <span class="meteo__label">Zon op</span>
          <span class="meteo__value">${formatTime(new Date(d.sunrise[0]))}</span>
        </div>
        <div class="meteo__item">
          <span class="meteo__label">Zon onder</span>
          <span class="meteo__value">${formatTime(new Date(d.sunset[0]))}</span>
        </div>
        <div class="meteo__item">
          <span class="meteo__label">Min / max</span>
          <span class="meteo__value">${d.temperature_2m_min[0].toFixed(0)}° / ${d.temperature_2m_max[0].toFixed(0)}°</span>
        </div>
      </div>
    `
  } catch (err) {
    meteoBody.innerHTML = `<p class="meteo__status result__status--error">Kon weergegevens niet ophalen (${err.message}).</p>`
  }
}

// ---------------------------------------------------------------------------
// UI-elementen en dropdown-vulling
// ---------------------------------------------------------------------------

const fromSelect = document.getElementById('from')
const toSelect = document.getElementById('to')
const swapBtn = document.getElementById('swap')
const resultEl = document.getElementById('result')
const dateToggle = document.getElementById('date-toggle')
const dateInput = document.getElementById('date-input')

function fillSelect(select, options, selected) {
  select.innerHTML = options.map(
    (p) => `<option value="${p}" ${p === selected ? 'selected' : ''}>${p}</option>`
  ).join('')
}

// "Naar" toont alleen plaatsen waar vanaf de gekozen "van"-locatie ook
// daadwerkelijk een route bestaat. Voorkomt dat iemand een doodlopende
// combinatie kiest (bijv. Terschelling -> IJmuiden, die niet bestaat).
function refreshToOptions(preferredTo) {
  const from = fromSelect.value
  const options = destinationsFrom(from)

  if (options.length === 0) {
    toSelect.innerHTML = `<option value="">— geen bestemmingen vanaf ${from} —</option>`
    toSelect.disabled = true
    return
  }

  toSelect.disabled = false
  const selected = options.includes(preferredTo) ? preferredTo : options[0]
  fillSelect(toSelect, options, selected)
}

fillSelect(fromSelect, PLACES, 'Harlingen')
refreshToOptions('Terschelling')

// Datumkiezer: standaard vandaag, alleen actief als de toggle aan staat.
const todayStr = new Date().toISOString().slice(0, 10)
dateInput.value = todayStr
dateInput.min = todayStr

dateToggle.addEventListener('change', () => {
  dateInput.disabled = !dateToggle.checked
  renderResult()
})
dateInput.addEventListener('change', renderResult)

/**
 * Het "referentiepunt" van een plaatsnaam: het RWS/meteo-punt dat hoort bij
 * routes die vanaf die plaats vertrekken. Een plaats kan in meerdere routes
 * met hetzelfde referentiepunt voorkomen; we pakken de eerste match.
 */
function referentiepuntVoorPlaats(plaats) {
  const route = ROUTES.find((r) => r.van === plaats)
  return route ? route.referentiepunt : null
}

// Geeft de onderliggende fetch-promise terug (i.p.v. "fire and forget") zodat
// boot() hierop kan wachten bij de allereerste keer laden.
function refreshMeteo() {
  const from = fromSelect.value
  const punt = referentiepuntVoorPlaats(from)
  if (!punt) {
    meteoHeading.textContent = `Actueel weer & zon`
    meteoBody.innerHTML = `<p class="meteo__status">Geen weerpunt bekend voor ${from}.</p>`
    return Promise.resolve()
  }
  return loadMeteoVoorVertrekpunt(punt, from)
}

// ---------------------------------------------------------------------------
// Resultaatweergave
// ---------------------------------------------------------------------------

function cardSkeletonHtml() {
  return `
    <div class="result__card" role="status" aria-label="Getij laden">
      <div class="result__skeleton">
        <div class="result__skeleton-line result__skeleton-line--wide"></div>
        <div class="result__skeleton-line result__skeleton-line--narrow"></div>
        <div class="result__skeleton-line result__skeleton-line--mid"></div>
      </div>
    </div>
  `
}

async function renderResult() {
  const from = fromSelect.value
  const to = toSelect.value

  if (!to) {
    resultEl.innerHTML = `<div class="result__no-route">Vanaf <strong>${from}</strong> is geen vaarroute in het systeem bekend.</div>`
    return
  }

  if (from === to) {
    resultEl.innerHTML = `<div class="result__no-route">Vertrek- en aankomstpunt zijn gelijk. Kies twee verschillende plaatsen.</div>`
    return
  }

  const matches = findRoutes(from, to)

  if (matches.length === 0) {
    const alt = destinationsFrom(from)
    const altText = alt.length
      ? `Vanaf <strong>${from}</strong> is wel een route bekend naar: <strong>${alt.join(', ')}</strong>.`
      : `Voor <strong>${from}</strong> is nog geen route in het systeem.`
    resultEl.innerHTML = `<div class="result__no-route">Geen bekende vaarroute van <strong>${from}</strong> naar <strong>${to}</strong>. ${altText}</div>`
    return
  }

  resultEl.innerHTML = matches.map(() => cardSkeletonHtml()).join('')
  const cards = resultEl.querySelectorAll('.result__card')

  const gekozenDatum = dateToggle.checked ? dateInput.value : null
  // Promise.all i.p.v. "fire and forget": elke kaart update nog steeds zodra
  // ZIJN fetch klaar is, maar renderResult() zelf resolvet pas als alles
  // klaar is — dat signaal gebruikt boot() om de opstartanimatie te sluiten.
  await Promise.all(matches.map((route, i) => loadRoute(route, cards[i], gekozenDatum)))
}

function isZelfdeDag(date, isoDatum) {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const target = new Date(isoDatum + 'T00:00:00')
  return local.getTime() === target.getTime()
}

// Combineert windwaarschuwing en nachtvenster-waarschuwing tot leesbare tekst.
// Telt niet mee in het vertrekadvies zelf, is puur een extra signalering.
function buildWaarschuwingen(departure, wind) {
  const teksten = []
  let windGevaar = false

  if (wind) {
    if (wind.stoten >= WIND_STOTEN_WAARSCHUWING_KNOPEN) {
      windGevaar = true
      teksten.push(`Harde windstoten verwacht (tot ${Math.round(wind.stoten)} kn). Extra voorzichtigheid geboden.`)
    } else if (wind.snelheid >= WIND_WAARSCHUWING_KNOPEN) {
      windGevaar = true
      teksten.push(`Stevige wind verwacht (${Math.round(wind.snelheid)} kn, windkracht 6+). Overweeg dit vertrek te heroverwegen.`)
    }
  }

  if (isNachtVenster(departure.vertrek)) {
    teksten.push('Dit vertrekmoment valt in het donker. Extra oplettendheid gewenst.')
  }

  return { teksten, windGevaar }
}

async function loadRoute(route, card, gekozenDatum) {
  const van = new Date()
  van.setDate(van.getDate() - 1)
  const tot = new Date()
  if (gekozenDatum) {
    const target = new Date(gekozenDatum + 'T00:00:00')
    tot.setTime(target.getTime())
    tot.setDate(tot.getDate() + 2)
  } else {
    tot.setDate(tot.getDate() + 6)
  }
  const fmt = (d) => d.toISOString().slice(0, 10)

  const viaHtml = route.via ? `<p class="result__via">via ${route.via}</p>` : ''
  const opmerkingHtml = route.opmerking
    ? `<p class="result__opmerking">${route.opmerking}</p>`
    : ''
  const header = `
    <div class="result__route">
      <span>${route.van}</span>
      <span class="result__arrow" aria-hidden="true">→</span>
      <span>${route.naar}</span>
    </div>
    ${viaHtml}
    <p class="result__advies">${route.advies}</p>
    ${opmerkingHtml}
  `

  try {
    const [getijRes, windHourly, waveHourly] = await Promise.all([
      fetch(`/api/getij?punt=${route.referentiepunt}&van=${fmt(van)}&tot=${fmt(tot)}`),
      getWindForecast(route.referentiepunt),
      getWaveForecast(route.referentiepunt),
    ])
    const data = await getijRes.json()

    if (data.error) {
      card.removeAttribute('role')
      card.removeAttribute('aria-label')
      card.innerHTML = `${header}<p class="result__status result__status--error">Kon getij niet ophalen (${data.error})</p>`
      return
    }

    const departures = computeDepartures(data.extremen ?? [], route)
    const now = new Date()

    let upcoming
    if (gekozenDatum) {
      upcoming = departures
        .filter((d) => isZelfdeDag(d.vertrek, gekozenDatum))
        .sort((a, b) => a.vertrek - b.vertrek)
    } else {
      upcoming = departures
        .filter((d) => (d.isWindow ? d.vertrekEind >= now : d.vertrek >= now))
        .sort((a, b) => a.vertrek - b.vertrek)
    }

    card.removeAttribute('role')
    card.removeAttribute('aria-label')

    if (upcoming.length === 0) {
      const msg = gekozenDatum
        ? `Geen vertrekmoment gevonden op ${new Date(gekozenDatum + 'T00:00:00').toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}.`
        : 'Geen vertrekmoment gevonden in de komende dagen.'
      card.innerHTML = `${header}<p class="result__status">${msg}</p>`
      return
    }

    // Bij een gekozen datum: toon alle momenten van die dag als gelijkwaardige lijst.
    // Bij "eerstvolgende": toon er 1 groot, de rest als "daarna".
    const items = gekozenDatum ? upcoming : upcoming.slice(0, 1)
    const rest = gekozenDatum ? [] : upcoming.slice(1, 4)

    const renderMoment = (d, groot) => {
      const wind = windAt(windHourly, d.vertrek)
      const wave = waveAt(waveHourly, d.vertrek)
      const waarschuwingen = buildWaarschuwingen(d, wind)
      const timeLabel = d.isWindow
        ? `${formatDateTime(d.vertrek)} <span class="result__next-tot">tot</span> ${formatTime(d.vertrekEind)}`
        : formatDateTime(d.vertrek)
      const sizeClass = groot ? 'result__next-time' : 'result__moment-time'

      const golfTekst = wave ? `golfhoogte ${wave.hoogte.toFixed(1).replace('.', ',')} m` : ''
      const windHtml = wind
        ? `<span class="result__wind${waarschuwingen.windGevaar ? ' result__wind--warn' : ''}">
             ${ICON_WIND}${windRichtingLabel(wind.richting)} ${Math.round(wind.snelheid)} kn, stoten tot ${Math.round(wind.stoten)} kn${golfTekst ? ` · ${golfTekst}` : ''}
           </span>`
        : (golfTekst ? `<span class="result__wind">${golfTekst}</span>` : '')

      const waarschuwingHtml = waarschuwingen.teksten.length
        ? `<div class="result__warning">${waarschuwingen.teksten.map((t) => `<p>${ICON_WARNING}<span>${t}</span></p>`).join('')}</div>`
        : ''

      // Getijgrafiek en deel-/agendaknoppen alleen bij het prominent getoonde
      // moment (niet bij de compacte "Daarna"-lijst), om het overzicht rustig
      // te houden.
      const tideChartHtml = groot ? buildTideCurveSvg(data.extremen, d) : ''
      const actionsHtml = groot ? buildActionsHtml(route, d) : ''

      return `
        <div class="result__moment">
          <span class="${sizeClass}">${timeLabel}</span>
          <span class="result__next-ref">
            ${d.eventType === 'hoogwater' ? 'HW' : 'LW'} ${REFERENCE_LABELS[route.referentiepunt]} om ${formatTime(d.eventTime)}
          </span>
          ${windHtml}
          ${waarschuwingHtml}
          ${tideChartHtml}
          ${actionsHtml}
        </div>
      `
    }

    const label = gekozenDatum
      ? 'Vertrekmomenten op gekozen datum'
      : (items[0].isWindow ? 'Eerstvolgend vertrekvenster' : 'Eerstvolgende vertrek')

    const momentenHtml = items.map((d) => renderMoment(d, true)).join('')
    const listItems = rest.map((d) => {
      const label2 = d.isWindow ? `${formatDateTime(d.vertrek)} tot ${formatTime(d.vertrekEind)}` : formatDateTime(d.vertrek)
      return `<li>${label2}</li>`
    }).join('')

    card.innerHTML = `
      ${header}
      <div class="result__next">
        <span class="result__next-label">${label}</span>
        ${momentenHtml}
      </div>
      ${listItems ? `<div class="result__list-label">Daarna</div><ul class="result__list">${listItems}</ul>` : ''}
    `
  } catch (err) {
    card.removeAttribute('role')
    card.removeAttribute('aria-label')
    card.innerHTML = `${header}<p class="result__status result__status--error">Kon getij niet ophalen (${err})</p>`
  }
}

// ---------------------------------------------------------------------------
// Getijgrafiek — kleine SVG-curve rond een vertrekmoment.
// ---------------------------------------------------------------------------

/**
 * Bouwt een kleine SVG-getijcurve rond een vertrekmoment. De curve is een
 * cosinus-interpolatie tussen opeenvolgende HW/LW-tijdstippen, genormaliseerd
 * naar 0 (laagwater) - 1 (hoogwater). Er zijn geen NAP-waarden beschikbaar —
 * de RWS-groepering GETETBRKD2 geeft alleen tijdstip + type terug — dus dit
 * toont de vorm/fase van het getij rond het vertrek, geen letterlijke
 * waterstand in centimeters.
 */
function buildTideCurveSvg(extremen, departure) {
  if (!extremen || extremen.length < 2) return ''

  const sorted = extremen
    .map((e) => ({ tijdstip: new Date(e.tijdstip), type: e.type }))
    .sort((a, b) => a.tijdstip - b.tijdstip)

  const vertrekEind = departure.isWindow ? departure.vertrekEind : departure.vertrek
  const marge = 3 * 3600000 // 3 uur speling aan weerszijden voor context
  const vensterStart = new Date(Math.min(departure.vertrek.getTime(), departure.eventTime.getTime()) - marge)
  const vensterEind = new Date(Math.max(vertrekEind.getTime(), departure.eventTime.getTime()) + marge)

  let startIdx = sorted.findIndex((e) => e.tijdstip >= vensterStart)
  if (startIdx === -1) startIdx = sorted.length - 1
  startIdx = Math.max(0, startIdx - 1)
  let endIdx = sorted.length - 1
  for (let i = startIdx; i < sorted.length; i++) {
    if (sorted[i].tijdstip > vensterEind) { endIdx = i; break }
  }
  const punten = sorted.slice(startIdx, endIdx + 1)
  if (punten.length < 2) return ''

  const tMin = punten[0].tijdstip.getTime()
  const tMax = punten[punten.length - 1].tijdstip.getTime()
  if (tMax === tMin) return ''

  const W = 300, H = 56, padX = 3, padTop = 6, padBottom = 6
  const xFor = (t) => padX + ((t - tMin) / (tMax - tMin)) * (W - 2 * padX)
  const yFor = (amp) => padTop + (1 - amp) * (H - padTop - padBottom)
  const ampFor = (type) => (type === 'hoogwater' ? 1 : 0)

  // Curve samplen met een cosinus-ease tussen elk paar opeenvolgende extremen
  // (standaardbenadering voor een half-dagelijks getij zonder amplitudedata).
  const SAMPLES = 16
  let pathD = ''
  punten.forEach((p, i) => {
    if (i === 0) {
      pathD += `M ${xFor(p.tijdstip.getTime()).toFixed(1)} ${yFor(ampFor(p.type)).toFixed(1)}`
      return
    }
    const vorige = punten[i - 1]
    const t0 = vorige.tijdstip.getTime()
    const t1 = p.tijdstip.getTime()
    const a0 = ampFor(vorige.type)
    const a1 = ampFor(p.type)
    for (let s = 1; s <= SAMPLES; s++) {
      const frac = s / SAMPLES
      const amp = a0 + (a1 - a0) * (1 - Math.cos(Math.PI * frac)) / 2
      const t = t0 + (t1 - t0) * frac
      pathD += ` L ${xFor(t).toFixed(1)} ${yFor(amp).toFixed(1)}`
    }
  })

  const vlakD = `${pathD} L ${xFor(tMax).toFixed(1)} ${(H - padBottom).toFixed(1)} L ${xFor(tMin).toFixed(1)} ${(H - padBottom).toFixed(1)} Z`

  const markers = punten.map((p) => {
    const cx = xFor(p.tijdstip.getTime())
    const cy = yFor(ampFor(p.type))
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="2" class="tidechart__extreme" />`
  }).join('')

  // Vertrekmarkering: een band voor een venster, een lijn voor een vast moment.
  let vertrekMarker
  if (departure.isWindow) {
    const x0 = xFor(departure.vertrek.getTime())
    const x1 = xFor(departure.vertrekEind.getTime())
    vertrekMarker = `<rect x="${Math.min(x0, x1).toFixed(1)}" y="${padTop}" width="${Math.max(1, Math.abs(x1 - x0)).toFixed(1)}" height="${(H - padTop - padBottom).toFixed(1)}" class="tidechart__venster" />`
  } else {
    const x = xFor(departure.vertrek.getTime())
    vertrekMarker = `<line x1="${x.toFixed(1)}" y1="${padTop}" x2="${x.toFixed(1)}" y2="${(H - padBottom).toFixed(1)}" class="tidechart__vertreklijn" />`
  }

  return `
    <svg class="result__tidechart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Getijverloop rond het vertrekmoment">
      <path d="${vlakD}" class="tidechart__vlak" />
      ${vertrekMarker}
      <path d="${pathD}" fill="none" class="tidechart__lijn" />
      ${markers}
    </svg>
  `
}

// ---------------------------------------------------------------------------
// Delen & agenda — klein en subtiel, volledig client-side (geen server nodig).
// ---------------------------------------------------------------------------

function buildActionsHtml(route, d) {
  const vertrekAttr = `data-vertrek="${d.vertrek.toISOString()}"`
  const eindAttr = d.isWindow ? ` data-vertrek-eind="${d.vertrekEind.toISOString()}"` : ''
  return `
    <div class="result__actions">
      <button class="result__action" type="button" data-action="share" data-route-id="${route.id}" ${vertrekAttr}${eindAttr} aria-label="Deel dit vertrekmoment" title="Delen">${ICON_SHARE}</button>
      <button class="result__action" type="button" data-action="ics" data-route-id="${route.id}" ${vertrekAttr}${eindAttr} aria-label="Toevoegen aan agenda" title="Toevoegen aan agenda">${ICON_CALENDAR}</button>
    </div>
  `
}

function buildShareText(route, departure) {
  const tijd = departure.isWindow
    ? `${formatDateTime(departure.vertrek)} tot ${formatTime(departure.vertrekEind)}`
    : formatDateTime(departure.vertrek)
  return `Vertrek ${route.van} → ${route.naar}: ${tijd}. ${route.advies}. Bron: wadoversteken.nl`
}

function formatIcsDate(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function icsEscape(text) {
  return String(text).replace(/[\\;,]/g, (m) => '\\' + m).replace(/\n/g, '\\n')
}

function buildIcsContent(route, departure) {
  const start = departure.vertrek
  const eind = departure.isWindow ? departure.vertrekEind : new Date(departure.vertrek.getTime() + 30 * 60000)
  const uid = `${route.id}-${start.getTime()}@wadoversteken.nl`
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//wadoversteken.nl//vertrekvenster//NL',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(eind)}`,
    `SUMMARY:${icsEscape(`Vertrek ${route.van} → ${route.naar}`)}`,
    `DESCRIPTION:${icsEscape(`${route.advies}. Bron: wadoversteken.nl`)}`,
    `LOCATION:${icsEscape(route.van)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

// Plaatsnamen in ROUTES bevatten geen diakritische tekens, dus een simpele
// vervanging van niet-alfanumerieke tekens volstaat hier.
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** Toont kort een vinkje op de knop als bevestiging, herstelt daarna. */
function flashActionSuccess(btn) {
  const origineel = btn.innerHTML
  btn.innerHTML = ICON_CHECK
  btn.classList.add('result__action--done')
  setTimeout(() => {
    btn.innerHTML = origineel
    btn.classList.remove('result__action--done')
  }, 1500)
}

async function handleShare(route, departure, btn) {
  const text = buildShareText(route, departure)
  if (navigator.share) {
    try {
      await navigator.share({ title: 'wadoversteken.nl', text })
      flashActionSuccess(btn)
    } catch {
      // Gebruiker annuleerde het deel-dialoogvenster — geen foutmelding nodig.
    }
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    flashActionSuccess(btn)
  } catch {
    // Klembord niet beschikbaar (bv. geen HTTPS-context) — knop blijft
    // gewoon klikbaar voor een volgende poging.
  }
}

function handleIcs(route, departure, btn) {
  const ics = buildIcsContent(route, departure)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vertrek-${slugify(route.van)}-${slugify(route.naar)}-${departure.vertrek.toISOString().slice(0, 10)}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  flashActionSuccess(btn)
}

// Eén gedelegeerde listener i.p.v. per knop een handler: werkt ook na elke
// herrender van #result (de knoppen worden steeds opnieuw aangemaakt).
resultEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.result__action')
  if (!btn) return

  const route = ROUTES.find((r) => r.id === btn.dataset.routeId)
  if (!route) return

  const departure = {
    vertrek: new Date(btn.dataset.vertrek),
    vertrekEind: btn.dataset.vertrekEind ? new Date(btn.dataset.vertrekEind) : null,
    isWindow: Boolean(btn.dataset.vertrekEind),
  }

  if (btn.dataset.action === 'share') handleShare(route, departure, btn)
  else if (btn.dataset.action === 'ics') handleIcs(route, departure, btn)
})

// ---------------------------------------------------------------------------
// Event-afhandeling
// ---------------------------------------------------------------------------

fromSelect.addEventListener('change', () => {
  refreshToOptions(toSelect.value)
  refreshMeteo()
  renderResult()
})
toSelect.addEventListener('change', renderResult)
swapBtn.addEventListener('click', () => {
  const newFrom = toSelect.value
  const newTo = fromSelect.value
  fromSelect.value = newFrom
  refreshToOptions(newTo)
  refreshMeteo()
  renderResult()
  swapBtn.classList.add('is-spinning')
  swapBtn.addEventListener('animationend', () => swapBtn.classList.remove('is-spinning'), { once: true })
})

// ---------------------------------------------------------------------------
// Boot-overlay — verbergt de pagina achter een korte merkanimatie tot de
// eerste getij- én weergegevens binnen zijn, met een maximale wachttijd zodat
// een trage of falende fetch de gebruiker nooit blijvend blokkeert.
// ---------------------------------------------------------------------------

const BOOT_MAX_WACHTTIJD_MS = 4000
const BOOT_STATUSTEKSTEN = ['Getij ophalen…', 'Wind controleren…', 'Vertrekvenster berekenen…']

async function boot() {
  const overlay = document.getElementById('boot-overlay')
  const statusEl = document.getElementById('boot-status')

  let statusIdx = 0
  const statusIv = statusEl
    ? setInterval(() => {
        statusIdx = (statusIdx + 1) % BOOT_STATUSTEKSTEN.length
        statusEl.textContent = BOOT_STATUSTEKSTEN[statusIdx]
      }, 700)
    : null

  const klaar = Promise.all([refreshMeteo(), renderResult()])
  const timeout = new Promise((resolve) => setTimeout(resolve, BOOT_MAX_WACHTTIJD_MS))
  await Promise.race([klaar, timeout])

  if (statusIv) clearInterval(statusIv)
  if (overlay) overlay.classList.add('hidden')
}

boot()
