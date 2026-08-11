# wadoversteken.nl

Vertrekvensters voor de oversteek tussen Den Helder, Texel, Vlieland,
Terschelling, Ameland, Schiermonnikoog, Harlingen, Kornwerderzand,
Lauwersoog en Den Oever, op basis van live getijdata van Rijkswaterstaat.

## Bestanden

- **`index.html`** — de site zelf: route-kiezer met van/naar-velden, 56 routes,
  en een infoblok met diepgang/vaartijd.
- **`api/getij.js`** — server-functie die getijdata ophaalt bij Rijkswaterstaat
  voor 10 referentiepunten. Verplicht: zonder dit bestand kan de site geen
  data laden, want de RWS-API staat geen rechtstreekse aanroepen vanuit de
  browser toe.
- **`devserver.mjs`** — alleen voor lokaal testen op je eigen computer (zie hieronder).

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
   naam, niet via "Upload files" per los bestand).
2. Ga naar vercel.com/new en importeer die repository.
3. Geen extra instellingen nodig — Vercel herkent automatisch dat `api/getij.js`
   een serverless function is en serveert `index.html` als startpagina.
4. Na deployen krijg je een `.vercel.app`-adres dat meteen werkt.
5. Koppel daarna het domein wadoversteken.nl via Vercel's domeininstellingen.

## Routes aanpassen

De routes staan in `index.html`, in het `<script>`-blok, in de `ROUTES`-lijst
bovenaan, gegroepeerd per bestemmingseiland. Elke route ziet er zo uit:

```js
{
  id: 'unieke-id',
  van: 'Vertrekplaats',
  naar: 'Aankomstplaats',
  via: 'Optionele vaargeul-naam of null',
  referentiepunt: 'texel' | 'kornwerderzand' | 'harlingen' | 'vlieland' |
                   'denoever' | 'denhelder' | 'terschelling' | 'ameland' |
                   'schiermonnikoog' | 'lauwersoog',
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
METADATASERVICES/OphalenCatalogus).

Het diepgang/vaartijd-blok onderaan de site staat in dezelfde `<script>`-tag,
in de `VAARINFO`-lijst.

## Databronnen

- **Getij:** Rijkswaterstaat WaterWebservices, astronomisch getij (CC0-licentie,
  vrij te gebruiken, geen garantie op uptime vanuit RWS).
- **Vertrekadviezen:** Waddenhavens.nl. Dit zijn vuistregels, geen diepgang-
  of weerberekening, en geen garantie op bevaarbaarheid.

© Lubberts Maritiem 2026
