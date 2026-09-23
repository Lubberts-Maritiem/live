// wadoversteken.nl — Wantij-check: eigen rekentool voor het veilige
// oversteekvenster van één specifieke geul/wantij, op basis van diepgang
// en gewenste marge.
//
// Verwacht dat routes-data.js, wantijen-data.js en app.js hiervóór zijn
// geladen (REFERENCE_LABELS, WANTIJEN, WANTIJ_REFERENTIEPUNT_ONTBREEKT,
// formatTime/formatDateTime staan dan als globals klaar).
//
// ---------------------------------------------------------------------------
// Methode (zie ook de uitleg in het resultaat zelf, voor de bezoeker):
//
// 1. De Wadvaarders-dieptestaat geeft per geul een spring- en een doodtij-
//    kental (hoogwaterstand + verval, t.o.v. ALAT) — geen dagelijkse meting,
//    maar een gemiddelde. Zie wantijen-data.js.
// 2. Daaruit wordt met de klassieke 1/12e-regel een verwacht dieptepad
//    (HW → LW → volgend HW) opgebouwd, in stappen van 1/6e van de vloed-
//    resp. ebduur.
// 3. Springtij/doodtij wordt per datum geschat via de maanstand (geen live
//    cijfer beschikbaar bij RWS voor dit doel — geverifieerd: het
//    astronomisch-getij-eindpunt dat de site al gebruikt (GETETBRKD2) geeft
//    alleen HW/LW-tíjden, geen waterhoogtes).
// 4. Dat dieptepad wordt geschaald naar de WERKELIJKE HW/LW-tijden van de
//    gekozen dag (hetzelfde /api/getij-station als de rest van de site).
// 5. Het venster = het aaneengesloten stuk rond hoogwater waar de
//    verwachte diepte ≥ diepgang + marge is.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 1/12e-regel
// ---------------------------------------------------------------------------

// Cumulatieve fracties van het verval bij HW, HW+1u, HW+2u, H/LW+3u,
// LW+2u, LW+1u, LW (nominaal, uitgaande van een 6-uurs halve cyclus —
// zelfde vereenvoudiging als in de dieptestaat zelf).
const TWAALFDEN_FRACTIES = [0, 1 / 12, 3 / 12, 6 / 12, 9 / 12, 11 / 12, 1]

/** Diepte (tov ALAT, dm) op de 7 nominale momenten tussen HW en het volgende LW. */
function twaalfdenregelCurve(hwALAT_dm, verval_dm) {
  return TWAALFDEN_FRACTIES.map((frac) => hwALAT_dm - verval_dm * frac)
}

// ---------------------------------------------------------------------------
// Springtij/doodtij via de maanstand
// ---------------------------------------------------------------------------

const SYNODISCHE_MAAND_DAGEN = 29.530588853
const REFERENTIE_NIEUWE_MAAN_MS = Date.UTC(2000, 0, 6, 18, 14, 0)
// Springtij volgt 1 à 2 dagen ná nieuwe/volle maan (traagheid van het
// getijsysteem); doodtij idem ná de kwartieren. Vaste schatting, geen
// harde astronomische constante.
const SPRINGTIJ_VERTRAGING_DAGEN = 1.5

function maanleeftijdDagen(datum) {
  const dagenSindsRef = (datum.getTime() - REFERENTIE_NIEUWE_MAAN_MS) / 86400000
  const rest = dagenSindsRef % SYNODISCHE_MAAND_DAGEN
  return rest < 0 ? rest + SYNODISCHE_MAAND_DAGEN : rest
}

/** 1 = volledig springtij, 0 = volledig doodtij, ertussenin lineair-cosinus geïnterpoleerd. */
function springtijFactor(datum) {
  const leeftijd = maanleeftijdDagen(datum) - SPRINGTIJ_VERTRAGING_DAGEN
  // Springtij treedt tweemaal per synodische maand op (bij "nieuwe" en
  // "volle" maan), dus een cosinus met halve periode die daar op 1 piekt.
  const hoek = (4 * Math.PI * leeftijd) / SYNODISCHE_MAAND_DAGEN
  return (1 + Math.cos(hoek)) / 2
}

/** Het dieptepad (HW → LW) voor deze geul, op deze datum, spring/dood-geïnterpoleerd. */
function geulCurveOpDatum(wantij, datum) {
  const factor = springtijFactor(datum)
  // wantij.spring/dood.hwALAT_dm + verval_dm beschrijven de getijHOOGTE (tov
  // ALAT) op het referentiepunt, niet de diepte op déze geul zelf. De 1/12e-
  // regel toegepast op die twee getallen geeft dus eerst een hoogtepad.
  const springHoogte = twaalfdenregelCurve(wantij.spring.hwALAT_dm, wantij.spring.verval_dm)
  const doodHoogte = twaalfdenregelCurve(wantij.dood.hwALAT_dm, wantij.dood.verval_dm)
  // De werkelijke bevaarbare diepte op déze geul is die getijhoogte plus de
  // eigen gelode diepte van de geul (tov NAP, omgerekend naar ALAT) — zelfde
  // formule als kolom I e.v. in het tabblad "Dieptes met 1/12e regel" van de
  // brontabel: diepte = HW_tov_ALAT(referentiepunt) + diepteNAP(geul) − alatNapVerschil(geul).
  const offset_dm = wantij.diepteNAP_dm - wantij.alatNapVerschil_dm
  return springHoogte.map((v, i) => doodHoogte[i] + (v - doodHoogte[i]) * factor + offset_dm)
}

// ---------------------------------------------------------------------------
// Dieptepad over meerdere getijcycli, geschaald naar echte HW/LW-tijden
// ---------------------------------------------------------------------------

/**
 * Bouwt uit de RWS-extremen (afwisselend hoogwater/laagwater) een lijst
 * segmenten, elk met een functie diepte(tijdstipMs) voor dat stuk van de
 * curve. Een segment loopt altijd van het ene extreem naar het volgende.
 */
function bouwDieptepad(wantij, extremen) {
  const sorted = extremen
    .map((e) => ({ type: e.type, tijd: new Date(e.tijdstip) }))
    .sort((a, b) => a.tijd - b.tijd)

  const segmenten = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i]
    const eind = sorted[i + 1]
    if (start.type === eind.type) continue // twee keer hetzelfde type na elkaar: overslaan

    const hw = start.type === 'hoogwater' ? start : eind
    const curve = geulCurveOpDatum(wantij, hw.tijd)
    // curve[0..6] loopt van HW naar LW. Bij een HW→LW-segment gebruiken we
    // 'm zo; bij een LW→HW-segment is het dezelfde vorm, maar in omgekeerde
    // volgorde (symmetrische opkomst/afgaand-aanname — zelfde vereenvoudiging
    // als de 1/12e-regel zelf al maakt).
    const punten = start.type === 'hoogwater' ? curve : curve.slice().reverse()

    const duurMs = eind.tijd - start.tijd
    const stapMs = duurMs / 6
    const tijden = punten.map((_, idx) => new Date(start.tijd.getTime() + idx * stapMs))

    segmenten.push({
      startTijd: start.tijd,
      eindTijd: eind.tijd,
      hwTijd: hw.tijd,
      tijden,
      dieptes: punten,
    })
  }
  return segmenten
}

/** Lineaire interpolatie van de diepte (dm tov ALAT) op een willekeurig tijdstip binnen een segment. */
function diepteOpTijdstip(segment, tijdstipMs) {
  const { tijden, dieptes } = segment
  for (let i = 0; i < tijden.length - 1; i++) {
    const t0 = tijden[i].getTime()
    const t1 = tijden[i + 1].getTime()
    if (tijdstipMs >= t0 && tijdstipMs <= t1) {
      const frac = t1 === t0 ? 0 : (tijdstipMs - t0) / (t1 - t0)
      return dieptes[i] + (dieptes[i + 1] - dieptes[i]) * frac
    }
  }
  return null
}

// Zoekstap voor het bepalen van de randen van het venster binnen een segment.
const VENSTER_ZOEKSTAP_MS = 60 * 1000 // 1 minuut nauwkeurig

/**
 * Zoekt, voor één hoogwatermoment, het aaneengesloten venster rond dat HW
 * waar de verwachte diepte >= vereisteDiepte_dm is. Doorzoekt het segment
 * vóór (opkomend water) en ná (afgaand water) het HW.
 */
function berekenVensterRondHw(segmentDavoor, segmentDaarna, hwTijd, vereisteDiepte_dm) {
  const diepteBijHw =
    (segmentDavoor ? diepteOpTijdstip(segmentDavoor, hwTijd.getTime()) : null) ??
    (segmentDaarna ? diepteOpTijdstip(segmentDaarna, hwTijd.getTime()) : null)

  if (diepteBijHw === null || diepteBijHw < vereisteDiepte_dm) {
    return { mogelijk: false, diepteBijHw }
  }

  let vensterStart = hwTijd
  if (segmentDavoor) {
    for (let t = hwTijd.getTime(); t >= segmentDavoor.startTijd.getTime(); t -= VENSTER_ZOEKSTAP_MS) {
      const d = diepteOpTijdstip(segmentDavoor, t)
      if (d === null || d < vereisteDiepte_dm) break
      vensterStart = new Date(t)
    }
  }

  let vensterEind = hwTijd
  if (segmentDaarna) {
    for (let t = hwTijd.getTime(); t <= segmentDaarna.eindTijd.getTime(); t += VENSTER_ZOEKSTAP_MS) {
      const d = diepteOpTijdstip(segmentDaarna, t)
      if (d === null || d < vereisteDiepte_dm) break
      vensterEind = new Date(t)
    }
  }

  return { mogelijk: true, diepteBijHw, vensterStart, vensterEind }
}

/**
 * Hoofdfunctie: voor elk hoogwatermoment in `extremen` het oversteekvenster
 * voor deze geul, diepgang en marge.
 */
function berekenWantijVensters(wantij, extremen, diepgang_m, marge_m) {
  const vereisteDiepte_dm = (diepgang_m + marge_m) * 10
  const segmenten = bouwDieptepad(wantij, extremen)

  const hwMomenten = extremen
    .filter((e) => e.type === 'hoogwater')
    .map((e) => new Date(e.tijdstip))
    .sort((a, b) => a - b)

  return hwMomenten.map((hwTijd) => {
    const segmentDavoor = segmenten.find(
      (s) => s.eindTijd.getTime() === hwTijd.getTime() && s.startTijd < s.eindTijd
    )
    const segmentDaarna = segmenten.find((s) => s.startTijd.getTime() === hwTijd.getTime())
    const resultaat = berekenVensterRondHw(segmentDavoor, segmentDaarna, hwTijd, vereisteDiepte_dm)
    return { hwTijd, vereisteDiepte_dm, ...resultaat }
  })
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

function vulWantijSelect() {
  const select = document.getElementById('wantij-select')
  if (!select) return

  const perRegio = { westelijk: [], oostelijk: [] }
  WANTIJEN.slice()
    .sort((a, b) => a.naam.localeCompare(b.naam, 'nl'))
    .forEach((w) => perRegio[w.regio].push(w))

  const optgroupHtml = (label, lijst) =>
    `<optgroup label="${label}">` +
    lijst
      .map((w) => {
        const disabled = w.referentiepunt ? '' : 'disabled'
        const label = w.referentiepunt ? w.naam : `${w.naam} (nog niet beschikbaar)`
        return `<option value="${w.id}" ${disabled}>${label}</option>`
      })
      .join('') +
    '</optgroup>'

  select.innerHTML =
    '<option value="" disabled selected>Kies een wantij…</option>' +
    optgroupHtml('Westelijk Wad', perRegio.westelijk) +
    optgroupHtml('Oostelijk Wad', perRegio.oostelijk)
}

function toonWantijToelichting(wantij) {
  const el = document.getElementById('wantij-toelichting')
  if (!el || !wantij) return
  const referentieLabel = wantij.referentiepunt ? REFERENCE_LABELS[wantij.referentiepunt] : null
  const zekerheidTekst =
    wantij.zekerheid === 'schatting'
      ? ' Let op: deze koppeling aan een getijstation is een inschatting op basis van ligging, niet 1-op-1 bevestigd.'
      : ''
  el.innerHTML = referentieLabel
    ? `<strong>${wantij.naam}</strong> (${wantij.betonning ?? 'geen betonning bekend'}) — getij gebaseerd op ${referentieLabel}. Peildatum diepte: ${wantij.peildatum}.${zekerheidTekst}`
    : `<strong>${wantij.naam}</strong> — ${WANTIJ_REFERENTIEPUNT_ONTBREEKT}`
}

function formatDm(dm) {
  return (dm / 10).toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function renderWantijResultaat(wantij, resultaten, gekozenDatum) {
  const el = document.getElementById('wantij-resultaat')
  if (!el) return

  if (resultaten.length === 0) {
    el.innerHTML = `<p class="result__status">Geen hoogwatermoment gevonden${
      gekozenDatum ? ' op de gekozen datum' : ' in de komende dagen'
    }.</p>`
    return
  }

  const items = resultaten
    .map((r) => {
      const hwLabel = formatDateTime(r.hwTijd)
      if (!r.mogelijk) {
        const diepteTekst =
          r.diepteBijHw === null
            ? 'onbekend'
            : `${formatDm(r.diepteBijHw)} m bij hoogwater`
        return `
          <div class="wantij-check__result-item wantij-check__result-item--geen">
            <p class="wantij-check__result-hw">Rond hoogwater ${hwLabel}</p>
            <p class="result__status result__status--error">
              Geen veilig venster: verwachte diepte (${diepteTekst}) haalt de vereiste ${formatDm(r.vereisteDiepte_dm)} m niet.
            </p>
          </div>`
      }

      const ideaalStart = new Date(r.hwTijd.getTime() - 90 * 60000)
      const ideaalEind = new Date(r.hwTijd.getTime() - 60 * 60000)
      const ideaalBinnenVenster = ideaalStart <= r.vensterEind && ideaalEind >= r.vensterStart

      return `
        <div class="wantij-check__result-item">
          <p class="wantij-check__result-hw">Hoogwater ${hwLabel} · verwachte diepte ${formatDm(r.diepteBijHw)} m</p>
          <p class="wantij-check__result-venster">
            Venster: <strong>${formatTime(r.vensterStart)} – ${formatTime(r.vensterEind)}</strong>
          </p>
          ${
            ideaalBinnenVenster
              ? '<p class="wantij-check__result-ideaal">Dit venster dekt de Gouden Regel (1 à 1,5 uur vóór hoogwater).</p>'
              : '<p class="wantij-check__result-ideaal wantij-check__result-ideaal--let-op">Let op: dit venster dekt niet het ideale moment van de Gouden Regel (1 à 1,5 uur vóór hoogwater) — pas nooit ná hoogwater passeren.</p>'
          }
        </div>`
    })
    .join('')

  el.innerHTML = `
    <div class="wantij-check__results">${items}</div>
    <p class="wantij-check__disclaimer">
      Schatting op basis van de 1/12e-regel toegepast op de spring-/doodtij-kentallen uit de
      Wadvaarders-dieptestaat (peildatum per geul, zie hierboven) en de maanstand als benadering
      voor spring-/doodtij — geen live peiling. Wind kan de waterstand op een wantij nog eens 30 tot
      50 cm extra laten zakken. Controleer voor vertrek altijd de actuele dieptestaat, QuickTide en
      het weerbericht.
    </p>`
}

function parseKommaGetal(waarde) {
  if (!waarde) return null
  const n = Number(String(waarde).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

async function berekenWantijVenster() {
  const el = document.getElementById('wantij-resultaat')
  const select = document.getElementById('wantij-select')
  const diepgangInput = document.getElementById('wantij-diepgang')
  const margeInput = document.getElementById('wantij-marge')
  const dateToggle = document.getElementById('wantij-date-toggle')
  const dateInput = document.getElementById('wantij-date-input')
  if (!el || !select) return

  const wantij = WANTIJEN.find((w) => w.id === select.value)
  if (!wantij) {
    el.innerHTML = '<p class="result__status">Kies eerst een wantij.</p>'
    return
  }
  if (!wantij.referentiepunt) {
    el.innerHTML = `<p class="result__status result__status--error">${WANTIJ_REFERENTIEPUNT_ONTBREEKT}</p>`
    return
  }

  const diepgang_m = parseKommaGetal(diepgangInput.value)
  const marge_m = parseKommaGetal(margeInput.value) ?? 0.3
  if (diepgang_m === null || diepgang_m < 0) {
    el.innerHTML = '<p class="result__status result__status--error">Vul een geldige diepgang in (in meters).</p>'
    return
  }

  el.innerHTML = '<p class="result__status">Getij ophalen…</p>'

  const gekozenDatum = dateToggle && dateToggle.checked ? dateInput.value : null
  const basis = gekozenDatum ? new Date(gekozenDatum + 'T00:00:00') : new Date()
  const van = new Date(basis)
  van.setDate(van.getDate() - 1)
  const tot = new Date(basis)
  tot.setDate(tot.getDate() + (gekozenDatum ? 2 : 6))
  const fmt = (d) => d.toISOString().slice(0, 10)

  try {
    const accessToken = window.Auth ? await window.Auth.getAccessToken() : null
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
    const res = await fetch(`/api/getij?punt=${wantij.referentiepunt}&van=${fmt(van)}&tot=${fmt(tot)}`, { headers })
    const data = await res.json()

    if (data.error) {
      el.innerHTML = `<p class="result__status result__status--error">Kon getij niet ophalen (${data.error})</p>`
      return
    }

    const extremen = data.extremen ?? []
    const alleVensters = berekenWantijVensters(wantij, extremen, diepgang_m, marge_m)

    const now = new Date()
    const teTonen = gekozenDatum
      ? alleVensters.filter((r) => isZelfdeDag(r.hwTijd, gekozenDatum))
      : alleVensters.filter((r) => r.hwTijd >= now).slice(0, 3)

    renderWantijResultaat(wantij, teTonen, gekozenDatum)
  } catch (err) {
    el.innerHTML = '<p class="result__status result__status--error">Kon getij niet ophalen. Probeer het later opnieuw.</p>'
  }
}

function initWantijCheck() {
  const select = document.getElementById('wantij-select')
  const button = document.getElementById('wantij-bereken')
  const dateToggle = document.getElementById('wantij-date-toggle')
  const dateInput = document.getElementById('wantij-date-input')
  if (!select || !button) return // sectie niet aanwezig op deze pagina

  vulWantijSelect()

  select.addEventListener('change', () => {
    const wantij = WANTIJEN.find((w) => w.id === select.value)
    toonWantijToelichting(wantij)
    document.getElementById('wantij-resultaat').innerHTML = ''
  })

  if (dateToggle && dateInput) {
    dateToggle.addEventListener('change', () => {
      dateInput.disabled = !dateToggle.checked
    })
  }

  button.addEventListener('click', (e) => {
    e.preventDefault()
    berekenWantijVenster()
  })
}

// De .wantij-check-sectie zit binnen #app-content, dat pas zichtbaar wordt
// ná inloggen (zie auth.js) — de dropdown zelf vult meteen bij het laden
// van de pagina (geen data nodig), het ophalen van getij gebeurt pas op
// klik, met dezelfde token-aanpak als de rest van de site.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWantijCheck)
} else {
  initWantijCheck()
}
