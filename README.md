# wadoversteken.nl

Vertrekvensters voor de oversteek tussen Den Helder, Texel, Vlieland,
Terschelling, Ameland, Schiermonnikoog, Harlingen, Kornwerderzand,
Lauwersoog, Den Oever, IJmuiden en Scheveningen, op basis van live
getijdata van Rijkswaterstaat.

## Bestanden

- **`index.html`** — de pagina-structuur (markup) van de site.
- **`styles.css`** — alle vormgeving.
- **`routes-data.js`** — de 67 routes, referentiepunten, coördinaten en
  instelbare drempelwaarden (wind, nacht).
- **`app.js`** — de applicatielogica: dropdowns vullen, getij ophalen,
  vertrekvensters berekenen, wind/weer tonen.
- **`logo.png`**, **`favicon.png`**, **`apple-touch-icon.png`** — het beeldmerk
  in drie formaten (header/boot-animatie, paginaicoon, iOS/social-preview).
  `favicon.svg` staat nog in de map maar wordt nergens meer naar verwezen.
- **`api/getij.js`** — server-functie die getijdata ophaalt bij Rijkswaterstaat
  voor 12 referentiepunten. Verplicht: zonder dit bestand kan de site geen
  data laden, want de RWS-API staat geen rechtstreekse aanroepen vanuit de
  browser toe.
- **`devserver.mjs`** — alleen voor lokaal testen op je eigen computer (zie hieronder).

Deze bestanden horen allemaal in de hoofdmap van de repository, naast elkaar
(dus niet in submappen) — met uitzondering van `api/getij.js`, die per se in
de map `api/` moet staan omdat Vercel dat pad gebruikt om de serverless
function te herkennen.

## Lokaal testen (op je eigen computer)

1. Installeer Node.js (nodejs.org, LTS-versie), als dat nog niet is gebeurd.
2. Open een terminal in deze map.
3. Typ: `node devserver.mjs`
4. Open in je browser: **http://localhost:3001**
5. Stoppen: Ctrl+C in de terminal.

Let op: de HTML rechtstreeks openen (dubbelklikken, `file://...`) werkt niet.
Er moet altijd een server tussen zitten, hetzij `devserver.mjs` lokaal, hetzij
Vercel straks live.

## Live zetten via GitHub + Vercel

1. Maak een nieuwe GitHub-repository aan en upload deze hele map (inclusief de `api`-map,
   met `getij.js` op het pad `api/getij.js` — via "Create new file" met die volledige
   naam, niet via "Upload files" per los bestand, of gebruik git/GitHub Desktop
   om de hele map in één keer te pushen).
2. Ga naar vercel.com/new en importeer die repository.
3. Geen extra instellingen nodig — Vercel herkent automatisch dat `api/getij.js`
   een serverless function is en serveert `index.html`, `styles.css`, `app.js`,
   `routes-data.js`, `logo.png`, `favicon.png` en `apple-touch-icon.png` als
   statische bestanden.
4. Na deployen krijg je een `.vercel.app`-adres dat meteen werkt.
5. Koppel daarna het domein wadoversteken.nl via Vercel's domeininstellingen.

## Routes aanpassen

De routes staan in `routes-data.js`, in de `ROUTES`-lijst, gegroepeerd per
bestemmingseiland/vertrekpunt. Elke route ziet er zo uit:

```js
{
  id: 'unieke-id',
  van: 'Vertrekplaats',
  naar: 'Aankomstplaats',
  via: 'Optionele vaargeul-naam of null',
  referentiepunt: 'texel' | 'kornwerderzand' | 'harlingen' | 'vlieland' |
                   'denoever' | 'denhelder' | 'terschelling' | 'ameland' |
                   'schiermonnikoog' | 'lauwersoog' | 'ijmuiden' | 'scheveningen',
  event: 'hoogwater' | 'laagwater',
  offsetMinuten: -120,          // vast moment: negatief = voor, positief = na het event
  // OF, voor een vensterbreedte:
  offsetMinuten: [60, 180],     // bijv. "1-3 uur na" het event
  advies: 'Leestekst, bijv. "2 uur voor hoogwater Texel"',
  opmerking: 'Optionele extra toelichting',  // optioneel
}
```

Voor een nieuw referentiepunt moet ook `REFERENCE_POINTS` in `api/getij.js`
worden uitgebreid met de juiste RWS-locatiecode (op te zoeken via
METADATASERVICES/OphalenCatalogus, filter op `Groepering.Code === 'GETETBRKD2'`),
én `REFERENCE_LABELS` en `REFERENCE_COORDS` in `routes-data.js`.

Bij het toevoegen van routes: controleer altijd op duplicaten en op de
van/naar-matrix — dat waren de twee soorten fouten die eerder zijn misgegaan
(zie PROJECT-OVERZICHT.md, sectie 4.2).

## Databronnen

- **Getij:** Rijkswaterstaat WaterWebservices, astronomisch getij (CC0-licentie,
  vrij te gebruiken, geen garantie op uptime vanuit RWS).
- **Vertrekadviezen:** Waddenhavens.nl (56 routes) en Watersportalmanak.nl
  (11 aanvullende routes, aug. 2026: Den Helder-vertrekken en de
  IJmuiden/Scheveningen-verbindingen). Dit zijn vuistregels, geen diepgang-
  of weerberekening, en geen garantie op bevaarbaarheid.

© Lubberts Maritiem 2026

## Features

- **Van/naar-kiezer** met wisselknop, "naar"-lijst filtert automatisch op
  basis van "van" zodat je nooit een niet-bestaande route kunt kiezen.
- **Datum kiezen**: vink "Specifieke datum kiezen" aan om alle vertrekmomenten
  van één dag te zien, in plaats van alleen het eerstvolgende moment.
- **Windvoorspelling**: opgehaald bij Open-Meteo (gratis, geen API-key, geen
  CORS-restrictie — werkt rechtstreeks vanuit de browser, in tegenstelling
  tot de RWS-getijdata). Telt niet mee in het vertrekadvies zelf, maar
  verschijnt als losse regel per vertrekmoment.
- **Waarschuwingen**: verschijnen los van het advies bij (a) windkracht 6+ of
  harde windstoten (drempels in `WIND_WAARSCHUWING_KNOPEN` en
  `WIND_STOTEN_WAARSCHUWING_KNOPEN` in `routes-data.js`), en (b) een
  vertrekmoment tussen 22:00 en 05:00 (in te stellen via `NACHT_START_UUR`
  / `NACHT_EIND_UUR`).
- **Actueel weer & zon**: live blok met huidig weer en zon op/onder voor het
  gekozen vertrekpunt (Open-Meteo). Ververst automatisch bij het wisselen
  van "van".
- **Opstartanimatie**: korte merkanimatie bij het laden van de pagina,
  gekoppeld aan de daadwerkelijke gereedheid van de eerste getij- en
  winddata (met een vangnet-timeout van 3s).
- **Golfhoogte**: opgehaald bij de Open-Meteo Marine API, naast de wind per
  vertrekmoment en in het "Actueel weer & zon"-blok.
- **Delen & agenda**: twee kleine knopjes bij het prominent getoonde
  vertrekmoment om het te delen (Web Share API / klembord) of als `.ics`
  toe te voegen aan een agenda-app.

E-mailherinnering, een visuele routekaart, en een astronomische
nacht-waarschuwing zijn bewust nog niet gebouwd — zie PROJECT-OVERZICHT.md
secties 5, 6 en 11.5 voor de status en het benodigde vervolgwerk.
