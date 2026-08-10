// Serverless function (Vercel) — proxy naar Rijkswaterstaat WaterWebservices.
// Nodig omdat de RWS-API geen CORS toestaat, dus de browser mag dit niet
// rechtstreeks aanroepen. Deze functie haalt de HW/LW-tijden op voor een
// referentiepunt en geeft ze schoon terug aan de frontend.

const RWS_URL =
  'https://ddapi20-waterwebservices.rijkswaterstaat.nl/ONLINEWAARNEMINGENSERVICES/OphalenWaarnemingen'

// Referentiepunten die de RWS-groepering GETETBRKD2 (getij-extremen) ondersteunen.
export const REFERENCE_POINTS = {
  harlingen: 'harlingen.waddenzee',
  kornwerderzand: 'kornwerderzand.waddenzee.buitenhaven',
  vlieland: 'vlieland.haven',
  texel: 'texel.oudeschild',
}

function pad(n) {
  return String(n).padStart(2, '0')
}

// RWS verwacht een naive local-time string met expliciete offset, bv.
// 2026-08-10T00:00:00.000+02:00. We bouwen 'm handmatig zodat we niet
// afhankelijk zijn van de tijdzone-instelling van de serverless runtime.
function toRwsDateString(date, offsetHours) {
  const sign = offsetHours >= 0 ? '+' : '-'
  const offAbs = Math.abs(offsetHours)
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}` +
    `T00:00:00.000${sign}${pad(offAbs)}:00`
  )
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const { punt, van, tot } = req.query

  const locatieCode = REFERENCE_POINTS[punt]
  if (!locatieCode) {
    res.status(400).json({
      error: `Onbekend referentiepunt "${punt}". Kies uit: ${Object.keys(REFERENCE_POINTS).join(', ')}`,
    })
    return
  }

  if (!van || !tot) {
    res.status(400).json({ error: 'Parameters "van" en "tot" (YYYY-MM-DD) zijn verplicht.' })
    return
  }

  // Nederland: CET = +01:00, CEST = +02:00. We benaderen dit simpel op
  // basis van de maand; voor exacte DST-grenzen zou je een tz-library
  // gebruiken, maar RWS accepteert deze offset-notatie sowieso.
  const vanDate = new Date(`${van}T00:00:00Z`)
  const totDate = new Date(`${tot}T00:00:00Z`)
  const offset = (d) => {
    const m = d.getUTCMonth() + 1 // 1-12
    return m >= 4 && m <= 10 ? 2 : 1
  }

  const body = {
    Locatie: { Code: locatieCode },
    AquoPlusWaarnemingMetadata: {
      AquoMetadata: { Groepering: { Code: 'GETETBRKD2' } },
    },
    Periode: {
      Begindatumtijd: toRwsDateString(vanDate, offset(vanDate)),
      Einddatumtijd: toRwsDateString(totDate, offset(totDate)),
    },
  }

  try {
    const rwsRes = await fetch(RWS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (rwsRes.status === 204) {
      res.status(200).json({ extremen: [] })
      return
    }

    if (!rwsRes.ok) {
      res.status(502).json({ error: `RWS-service gaf status ${rwsRes.status}` })
      return
    }

    const data = await rwsRes.json()
    const metingen = data?.WaarnemingenLijst?.[0]?.MetingenLijst ?? []

    const extremen = metingen
      .map((m) => ({
        tijdstip: m.Tijdstip,
        type: m.Meetwaarde?.Waarde_Alfanumeriek, // "hoogwater" | "laagwater"
      }))
      .filter((e) => e.type === 'hoogwater' || e.type === 'laagwater')
      .sort((a, b) => new Date(a.tijdstip) - new Date(b.tijdstip))

    res.status(200).json({ extremen })
  } catch (err) {
    res.status(502).json({ error: 'Kon getijdata niet ophalen bij Rijkswaterstaat.', detail: String(err) })
  }
}
