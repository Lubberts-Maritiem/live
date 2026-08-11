// wadoversteken.nl — routedata en constanten.
// Bron van de meeste routes: door de gebruiker aangeleverde tekst
// "WADDENZEE VERTREKADVIEZEN, Bron: Waddenhavens.nl" (2026).
// Aangevuld (aug. 2026) met routes vanaf Den Helder en vanaf IJmuiden/
// Scheveningen uit de "ADVIES VERTREKTIJDEN"-tabel op watersportalmanak.nl
// (zie de sectie "AANGEVULD" hieronder) — dezelfde klassieke vertrektijden-
// tabel die op meerdere watersportsites circuleert.
//
// Elke route heeft een offsetMinuten t.o.v. een HW- of LW-moment op een
// referentiepunt:
// - Vast moment: offsetMinuten: -120 betekent "2 uur voor" het event
//   (negatief = voor, positief = na).
// - Vensterbreedte: offsetMinuten: [60, 180] betekent "1-3 uur na" het
//   event — de site toont dan "12:37 tot 14:37" i.p.v. één tijdstip.

const ROUTES = [
  // ===== TEXEL / OUDESCHILD =====
  {
    id: 'denoever-oudeschild',
    van: 'Den Oever', naar: 'Oudeschild', via: 'Gat van de Stier',
    referentiepunt: 'denoever', event: 'laagwater', offsetMinuten: -90,
    advies: '1,5 uur voor laagwater Den Oever',
  },
  {
    id: 'denhelder-oudeschild',
    van: 'Den Helder', naar: 'Oudeschild', via: 'Texelstroom',
    referentiepunt: 'denhelder', event: 'laagwater', offsetMinuten: [60, 180],
    advies: '1–3 uur na laagwater Den Helder',
  },
  {
    id: 'kornwerderzand-oudeschild',
    van: 'Kornwerderzand', naar: 'Oudeschild', via: 'Texelstroom',
    referentiepunt: 'kornwerderzand', event: 'hoogwater', offsetMinuten: [0, 120],
    advies: '0–2 uur na hoogwater Kornwerderzand',
  },
  {
    id: 'harlingen-oudeschild',
    van: 'Harlingen', naar: 'Oudeschild', via: 'Boontjes',
    referentiepunt: 'harlingen', event: 'hoogwater', offsetMinuten: 0,
    advies: 'Rond hoogwater Harlingen',
  },
  {
    id: 'vlieland-oudeschild-inschot',
    van: 'Vlieland', naar: 'Oudeschild', via: 'Inschot',
    referentiepunt: 'vlieland', event: 'hoogwater', offsetMinuten: -120,
    advies: '2 uur voor hoogwater Vlieland',
  },
  {
    id: 'vlieland-oudeschild-noordzee',
    van: 'Vlieland', naar: 'Oudeschild', via: 'Noordzee',
    referentiepunt: 'vlieland', event: 'hoogwater', offsetMinuten: 30,
    advies: '0,5 uur na hoogwater Vlieland',
  },
  {
    id: 'terschelling-oudeschild-schuitengat-noordzee',
    van: 'Terschelling', naar: 'Oudeschild', via: 'Schuitengat via Noordzee',
    referentiepunt: 'terschelling', event: 'hoogwater', offsetMinuten: -60,
    advies: '1 uur voor hoogwater West-Terschelling',
  },
  {
    id: 'terschelling-oudeschild-slenk-noordzee',
    van: 'Terschelling', naar: 'Oudeschild', via: 'Slenk via Noordzee',
    referentiepunt: 'terschelling', event: 'hoogwater', offsetMinuten: -120,
    advies: '2 uur voor hoogwater West-Terschelling',
  },
  {
    id: 'terschelling-oudeschild-schuitengat',
    van: 'Terschelling', naar: 'Oudeschild', via: 'Schuitengat',
    referentiepunt: 'terschelling', event: 'hoogwater', offsetMinuten: -180,
    advies: '3 uur voor hoogwater West-Terschelling',
  },
  {
    id: 'terschelling-oudeschild-slenk',
    van: 'Terschelling', naar: 'Oudeschild', via: 'Slenk',
    referentiepunt: 'terschelling', event: 'hoogwater', offsetMinuten: -180,
    advies: '3 uur voor hoogwater West-Terschelling',
  },
  {
    id: 'oudeschild-ijmuiden',
    van: 'Oudeschild', naar: 'IJmuiden', via: 'Schulpengat',
    referentiepunt: 'texel', event: 'hoogwater', offsetMinuten: -30,
    advies: '0,5 uur voor hoogwater Oudeschild',
  },
  {
    id: 'oudeschild-scheveningen',
    van: 'Oudeschild', naar: 'Scheveningen', via: 'Schulpengat',
    referentiepunt: 'texel', event: 'hoogwater', offsetMinuten: -30,
    advies: '0,5 uur voor hoogwater Oudeschild',
  },
  {
    id: 'oudeschild-denoever',
    van: 'Oudeschild', naar: 'Den Oever', via: 'Gat van de Stier',
    referentiepunt: 'texel', event: 'laagwater', offsetMinuten: -30,
    advies: '0,5 uur voor laagwater Oudeschild',
  },
  {
    id: 'oudeschild-kornwerderzand',
    van: 'Oudeschild', naar: 'Kornwerderzand', via: 'Texelstroom',
    referentiepunt: 'texel', event: 'laagwater', offsetMinuten: [60, 180],
    advies: '1–3 uur na laagwater Oudeschild',
  },
  {
    id: 'oudeschild-harlingen',
    van: 'Oudeschild', naar: 'Harlingen', via: 'Texelstroom',
    referentiepunt: 'texel', event: 'laagwater', offsetMinuten: [60, 120],
    advies: '1–2 uur na laagwater Oudeschild',
  },
  {
    id: 'oudeschild-terschelling-scheurrak-2',
    van: 'Oudeschild', naar: 'Terschelling', via: 'Scheurrak',
    referentiepunt: 'texel', event: 'hoogwater', offsetMinuten: -120,
    advies: '2 uur voor hoogwater Oudeschild',
  },
  {
    id: 'oudeschild-terschelling-molengat',
    van: 'Oudeschild', naar: 'Terschelling', via: 'Molengat via Noordzee',
    referentiepunt: 'texel', event: 'laagwater', offsetMinuten: -60,
    advies: '1 uur voor laagwater Oudeschild',
  },
  {
    id: 'oudeschild-denhelder',
    van: 'Oudeschild', naar: 'Den Helder', via: 'Texelstroom',
    referentiepunt: 'texel', event: 'hoogwater', offsetMinuten: [0, 240],
    advies: '0–4 uur na hoogwater Oudeschild',
  },

  // ===== VLIELAND =====
  {
    id: 'oudeschild-vlieland-scheurrak',
    van: 'Oudeschild', naar: 'Vlieland', via: 'Scheurrak',
    referentiepunt: 'texel', event: 'hoogwater', offsetMinuten: -120,
    advies: '2 uur voor hoogwater Texel',
  },
  {
    id: 'oudeschild-vlieland-noordzee',
    van: 'Oudeschild', naar: 'Vlieland', via: 'Noordzee',
    referentiepunt: 'texel', event: 'laagwater', offsetMinuten: -60,
    advies: '1 uur voor laagwater Texel',
  },
  {
    id: 'harlingen-vlieland',
    van: 'Harlingen', naar: 'Vlieland', via: null,
    referentiepunt: 'harlingen', event: 'hoogwater', offsetMinuten: 120,
    advies: '2 uur na hoogwater Harlingen',
  },
  {
    id: 'kornwerderzand-vlieland-inschot',
    van: 'Kornwerderzand', naar: 'Vlieland', via: 'Inschot',
    referentiepunt: 'kornwerderzand', event: 'hoogwater', offsetMinuten: -60,
    advies: '1 uur voor hoogwater Kornwerderzand',
  },
  {
    id: 'kornwerderzand-vlieland-boontjes',
    van: 'Kornwerderzand', naar: 'Vlieland', via: 'Boontjes',
    referentiepunt: 'kornwerderzand', event: 'hoogwater', offsetMinuten: 0,
    advies: 'Rond hoogwater Kornwerderzand',
  },
  {
    id: 'terschelling-vlieland-schuitengat',
    van: 'Terschelling', naar: 'Vlieland', via: 'Schuitengat',
    referentiepunt: 'terschelling', event: 'laagwater', offsetMinuten: -60,
    advies: '1 uur voor laagwater Terschelling',
  },
  {
    id: 'terschelling-vlieland-slenk',
    van: 'Terschelling', naar: 'Vlieland', via: 'Slenk',
    referentiepunt: 'terschelling', event: 'laagwater', offsetMinuten: -120,
    advies: '2 uur voor laagwater Terschelling',
  },
  {
    id: 'ameland-vlieland-noordzee',
    van: 'Ameland', naar: 'Vlieland', via: 'Noordzee',
    referentiepunt: 'ameland', event: 'hoogwater', offsetMinuten: -120,
    advies: '2 uur voor hoogwater Ameland',
  },
  {
    id: 'vlieland-harlingen',
    van: 'Vlieland', naar: 'Harlingen', via: null,
    referentiepunt: 'vlieland', event: 'laagwater', offsetMinuten: 120,
    advies: '2 uur na laagwater Vlieland',
  },
  {
    id: 'vlieland-kornwerderzand-boontjes',
    van: 'Vlieland', naar: 'Kornwerderzand', via: 'Boontjes',
    referentiepunt: 'vlieland', event: 'hoogwater', offsetMinuten: -60,
    advies: '1 uur voor hoogwater Vlieland',
  },
  {
    id: 'vlieland-kornwerderzand-inschot',
    van: 'Vlieland', naar: 'Kornwerderzand', via: 'Inschot / Zuidoostrak',
    referentiepunt: 'vlieland', event: 'hoogwater', offsetMinuten: -180,
    advies: '3 uur voor hoogwater Vlieland',
  },
  {
    id: 'vlieland-terschelling',
    van: 'Vlieland', naar: 'Terschelling', via: 'Slenk / Schuitengat',
    referentiepunt: 'vlieland', event: 'hoogwater', offsetMinuten: -60,
    advies: '1 uur voor hoogwater Vlieland',
  },
  {
    id: 'vlieland-ameland',
    van: 'Vlieland', naar: 'Ameland', via: 'Noordzee',
    referentiepunt: 'vlieland', event: 'laagwater', offsetMinuten: -60,
    advies: '1 uur voor laagwater Vlieland',
  },

  // ===== TERSCHELLING =====
  {
    id: 'texel-terschelling-scheurrak',
    van: 'Oudeschild', naar: 'Terschelling', via: 'Scheurrak / Slenk',
    referentiepunt: 'texel', event: 'hoogwater', offsetMinuten: -120,
    advies: '2 uur voor hoogwater Texel',
  },
  {
    id: 'texel-terschelling-noordzee',
    van: 'Oudeschild', naar: 'Terschelling', via: 'Noordzee',
    referentiepunt: 'texel', event: 'laagwater', offsetMinuten: -60,
    advies: '1 uur voor laagwater Texel',
  },
  {
    id: 'kornwerderzand-terschelling',
    van: 'Kornwerderzand', naar: 'Terschelling', via: 'Boontjes',
    referentiepunt: 'kornwerderzand', event: 'hoogwater', offsetMinuten: 0,
    advies: 'Rond hoogwater Kornwerderzand',
  },
  {
    id: 'harlingen-terschelling',
    van: 'Harlingen', naar: 'Terschelling', via: null,
    referentiepunt: 'harlingen', event: 'hoogwater', offsetMinuten: 120,
    advies: '2 uur na hoogwater Harlingen',
  },
  {
    id: 'terschelling-texel-slenk-omdraai',
    van: 'Terschelling', naar: 'Oudeschild', via: 'Slenk, via Scheurrak / Omdraai',
    referentiepunt: 'terschelling', event: 'hoogwater', offsetMinuten: -180,
    advies: '3 uur voor hoogwater Terschelling',
  },
  {
    id: 'terschelling-texel-slenk-meep',
    van: 'Terschelling', naar: 'Oudeschild', via: 'Slenk – Meep – Stortemelk',
    referentiepunt: 'terschelling', event: 'hoogwater', offsetMinuten: -60,
    advies: '1 uur voor hoogwater Terschelling',
  },
  {
    id: 'terschelling-vlieland',
    van: 'Terschelling', naar: 'Vlieland', via: null,
    referentiepunt: 'terschelling', event: 'laagwater', offsetMinuten: -120,
    advies: '2 uur voor laagwater Terschelling',
  },
  {
    id: 'terschelling-ameland',
    van: 'Terschelling', naar: 'Ameland', via: null,
    referentiepunt: 'terschelling', event: 'hoogwater', offsetMinuten: -180,
    advies: '3 uur voor hoogwater Terschelling',
  },
  {
    id: 'terschelling-ameland-noordzee',
    van: 'Terschelling', naar: 'Ameland', via: 'Noordzee via Schuitengat',
    referentiepunt: 'terschelling', event: 'laagwater', offsetMinuten: -240,
    advies: '4 uur voor laagwater Terschelling',
  },
  {
    id: 'terschelling-harlingen',
    van: 'Terschelling', naar: 'Harlingen', via: null,
    referentiepunt: 'terschelling', event: 'laagwater', offsetMinuten: -60,
    advies: 'Vanaf 1 uur voor laagwater tot uiterlijk 3 uur voor hoogwater Terschelling',
    opmerking: 'Venster loopt van laagwater tot het daaropvolgende hoogwater; hier getoond vanaf het vroegste vertrekmoment.',
  },
  {
    id: 'terschelling-kornwerderzand-inschot',
    van: 'Terschelling', naar: 'Kornwerderzand', via: 'Inschot',
    referentiepunt: 'terschelling', event: 'hoogwater', offsetMinuten: -180,
    advies: '3 uur voor hoogwater Terschelling',
  },
  {
    id: 'terschelling-kornwerderzand-harlingen',
    van: 'Terschelling', naar: 'Kornwerderzand', via: 'via Harlingen / Boontjes',
    referentiepunt: 'terschelling', event: 'laagwater', offsetMinuten: -60,
    advies: 'Vanaf 1 uur voor laagwater tot uiterlijk 3 uur voor hoogwater Terschelling',
    opmerking: 'Venster loopt van laagwater tot het daaropvolgende hoogwater; hier getoond vanaf het vroegste vertrekmoment.',
  },

  // ===== AMELAND =====
  {
    id: 'ameland-schiermonnikoog',
    van: 'Ameland', naar: 'Schiermonnikoog', via: null,
    referentiepunt: 'ameland', event: 'hoogwater', offsetMinuten: -180,
    advies: '3 uur voor hoogwater Ameland',
  },
  {
    id: 'ameland-lauwersoog',
    van: 'Ameland', naar: 'Lauwersoog', via: null,
    referentiepunt: 'ameland', event: 'hoogwater', offsetMinuten: -180,
    advies: '3 uur voor hoogwater Ameland',
  },
  {
    id: 'ameland-terschelling',
    van: 'Ameland', naar: 'Terschelling', via: null,
    referentiepunt: 'ameland', event: 'hoogwater', offsetMinuten: -180,
    advies: '3 uur voor hoogwater Ameland',
  },
  {
    id: 'ameland-harlingen',
    van: 'Ameland', naar: 'Harlingen', via: 'Kimstergat',
    referentiepunt: 'ameland', event: 'hoogwater', offsetMinuten: -240,
    advies: '4 uur voor hoogwater Ameland',
  },
  {
    id: 'ameland-terschelling-noordzee',
    van: 'Ameland', naar: 'Terschelling', via: 'Noordzee',
    referentiepunt: 'ameland', event: 'hoogwater', offsetMinuten: -120,
    advies: '2 uur voor hoogwater Ameland',
  },
  {
    id: 'ameland-lauwersoog-noordzee',
    van: 'Ameland', naar: 'Lauwersoog', via: 'Noordzee',
    referentiepunt: 'ameland', event: 'laagwater', offsetMinuten: -180,
    advies: '3 uur voor laagwater Ameland',
  },
  {
    id: 'schiermonnikoog-ameland',
    van: 'Schiermonnikoog', naar: 'Ameland', via: null,
    referentiepunt: 'schiermonnikoog', event: 'hoogwater', offsetMinuten: -180,
    advies: '3 uur voor hoogwater Schiermonnikoog',
  },
  {
    id: 'lauwersoog-ameland',
    van: 'Lauwersoog', naar: 'Ameland', via: null,
    referentiepunt: 'lauwersoog', event: 'hoogwater', offsetMinuten: -180,
    advies: '3 uur voor hoogwater Ameland',
  },
  {
    id: 'harlingen-ameland',
    van: 'Harlingen', naar: 'Ameland', via: 'Kimstergat',
    referentiepunt: 'harlingen', event: 'hoogwater', offsetMinuten: -120,
    advies: '2 uur voor hoogwater Harlingen',
  },
  {
    id: 'lauwersoog-ameland-noordzee',
    van: 'Lauwersoog', naar: 'Ameland', via: 'Noordzee',
    referentiepunt: 'lauwersoog', event: 'hoogwater', offsetMinuten: -60,
    advies: '1 uur voor hoogwater Lauwersoog',
  },

  // ===== SCHIERMONNIKOOG =====
  {
    id: 'ameland-schiermonnikoog-noordzee',
    van: 'Ameland', naar: 'Schiermonnikoog', via: 'Noordzee',
    referentiepunt: 'schiermonnikoog', event: 'hoogwater', offsetMinuten: 60,
    advies: '1 uur na hoogwater Schiermonnikoog',
  },
  {
    id: 'lauwersoog-schiermonnikoog',
    van: 'Lauwersoog', naar: 'Schiermonnikoog', via: null,
    referentiepunt: 'lauwersoog', event: 'hoogwater', offsetMinuten: -120,
    advies: '2 uur voor hoogwater Lauwersoog',
  },
  {
    id: 'schiermonnikoog-lauwersoog',
    van: 'Schiermonnikoog', naar: 'Lauwersoog', via: null,
    referentiepunt: 'schiermonnikoog', event: 'hoogwater', offsetMinuten: -60,
    advies: '1 uur voor hoogwater Schiermonnikoog',
  },

  // ===== DEN HELDER (aangevuld aug. 2026, bron: watersportalmanak.nl) =====
  // Was voorheen alleen "Den Helder -> Oudeschild"; deze 7 routes stonden
  // wel in de bron maar ontbraken nog op de site.
  {
    id: 'denhelder-ijmuiden',
    van: 'Den Helder', naar: 'IJmuiden', via: 'Schulpengat',
    referentiepunt: 'denhelder', event: 'hoogwater', offsetMinuten: 60,
    advies: '1 uur na hoogwater Den Helder',
  },
  {
    id: 'denhelder-scheveningen',
    van: 'Den Helder', naar: 'Scheveningen', via: 'Schulpengat',
    referentiepunt: 'denhelder', event: 'hoogwater', offsetMinuten: 60,
    advies: '1 uur na hoogwater Den Helder',
  },
  {
    id: 'denhelder-denoever',
    van: 'Den Helder', naar: 'Den Oever', via: 'Visjagersgaatje',
    referentiepunt: 'denhelder', event: 'hoogwater', offsetMinuten: [-240, -120],
    advies: '4–2 uur voor hoogwater Den Helder',
  },
  {
    id: 'denhelder-kornwerderzand',
    van: 'Den Helder', naar: 'Kornwerderzand', via: 'Texelstroom',
    referentiepunt: 'denhelder', event: 'hoogwater', offsetMinuten: -300,
    advies: '5 uur voor hoogwater Den Helder',
  },
  {
    id: 'denhelder-harlingen',
    van: 'Den Helder', naar: 'Harlingen', via: 'Texelstroom',
    referentiepunt: 'denhelder', event: 'hoogwater', offsetMinuten: -300,
    advies: '5 uur voor hoogwater Den Helder',
  },
  {
    id: 'denhelder-vlieland-scheurrak',
    van: 'Den Helder', naar: 'Vlieland', via: 'Scheurrak',
    referentiepunt: 'denhelder', event: 'hoogwater', offsetMinuten: -120,
    advies: '2 uur voor hoogwater Den Helder',
  },
  {
    id: 'denhelder-vlieland-molengat',
    van: 'Den Helder', naar: 'Vlieland', via: 'Molengat',
    referentiepunt: 'denhelder', event: 'hoogwater', offsetMinuten: -360,
    advies: '6 uur voor hoogwater Den Helder',
  },

  // ===== IJMUIDEN / SCHEVENINGEN (aangevuld aug. 2026) =====
  // Voorheen doodlopende aankomstpunten zonder retourroute. Deze 4 routes
  // maken de Noordzee-oversteek naar/van de Wadden in beide richtingen
  // bevaarbaar via de site. Nieuwe referentiepunten: 'ijmuiden'
  // (RWS-locatiecode ijmuiden.buitenhaven) en 'scheveningen'
  // (RWS-locatiecode scheveningen) — beide geverifieerd op ondersteuning
  // van de GETETBRKD2-groepering (getij-extremen).
  {
    id: 'ijmuiden-oudeschild',
    van: 'IJmuiden', naar: 'Oudeschild', via: 'Noordzee / Schulpengat',
    referentiepunt: 'ijmuiden', event: 'hoogwater', offsetMinuten: -120,
    advies: '2 uur voor hoogwater IJmuiden',
  },
  {
    id: 'ijmuiden-denhelder',
    van: 'IJmuiden', naar: 'Den Helder', via: 'Noordzee / Schulpengat',
    referentiepunt: 'ijmuiden', event: 'hoogwater', offsetMinuten: -120,
    advies: '2 uur voor hoogwater IJmuiden',
  },
  {
    id: 'ijmuiden-scheveningen',
    van: 'IJmuiden', naar: 'Scheveningen', via: 'Noordzee',
    referentiepunt: 'ijmuiden', event: 'hoogwater', offsetMinuten: 180,
    advies: '3 uur na hoogwater IJmuiden',
  },
  {
    id: 'scheveningen-ijmuiden',
    van: 'Scheveningen', naar: 'IJmuiden', via: 'Noordzee',
    referentiepunt: 'scheveningen', event: 'hoogwater', offsetMinuten: -120,
    advies: '2 uur voor hoogwater Scheveningen',
  },
]

const REFERENCE_LABELS = {
  texel: 'Texel, Oudeschild',
  kornwerderzand: 'Kornwerderzand',
  harlingen: 'Harlingen, Waddenzee',
  vlieland: 'Vlieland, haven',
  denoever: 'Den Oever, Waddenzee',
  denhelder: 'Den Helder, Marsdiep',
  terschelling: 'West-Terschelling',
  ameland: 'Ameland, Nes',
  schiermonnikoog: 'Schiermonnikoog, Waddenzee',
  lauwersoog: 'Lauwersoog, Waddenzee',
  ijmuiden: 'IJmuiden, buitenhaven',
  scheveningen: 'Scheveningen, buitenhaven',
}

// Coördinaten per referentiepunt, voor de windvoorspelling en het
// weer/zon-blok (Open-Meteo).
const REFERENCE_COORDS = {
  texel: { lat: 53.0364, lon: 4.8486 },
  kornwerderzand: { lat: 53.0757, lon: 5.3395 },
  harlingen: { lat: 53.1758, lon: 5.4142 },
  vlieland: { lat: 53.2986, lon: 5.0908 },
  denoever: { lat: 52.9356, lon: 5.0344 },
  denhelder: { lat: 52.9633, lon: 4.7500 },
  terschelling: { lat: 53.3617, lon: 5.2231 },
  ameland: { lat: 53.4453, lon: 5.7681 },
  schiermonnikoog: { lat: 53.4794, lon: 6.1653 },
  lauwersoog: { lat: 53.4067, lon: 6.2022 },
  ijmuiden: { lat: 52.4636, lon: 4.5548 },
  scheveningen: { lat: 52.1057, lon: 4.2736 },
}

// Drempels voor de windwaarschuwing. Windkracht 6 Bft (~22 knopen
// gemiddeld) is op de Waddenzee het punt waarop het KNMI een
// windwaarschuwing afgeeft voor de scheepvaart. Windstoten wegen zwaarder
// mee, want die zijn het gevaarlijkst voor kleine zeilboten.
const WIND_WAARSCHUWING_KNOPEN = 22
const WIND_STOTEN_WAARSCHUWING_KNOPEN = 28

// Vertrekmomenten tussen deze uren gelden als "in het donker" voor de
// combinatiewaarschuwing (ruwe schatting, geen astronomische berekening).
const NACHT_START_UUR = 22
const NACHT_EIND_UUR = 5

// Plaatsen voor de dropdowns: alle unieke "van" en "naar" waarden uit ROUTES.
const PLACES = Array.from(new Set(ROUTES.flatMap((r) => [r.van, r.naar]))).sort()
