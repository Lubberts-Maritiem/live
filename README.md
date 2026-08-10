# wadoversteken.nl

Vertrekvensters voor de oversteek naar de Waddeneilanden, op basis van live
getijdata van Rijkswaterstaat.

## Bestanden

- **`index.html`** — de site zelf (route-kiezer met van/naar-velden).
- **`api/getij.js`** — server-functie die getijdata ophaalt bij Rijkswaterstaat.
  Verplicht: zonder dit bestand kan de site geen data laden, want de RWS-API
  staat geen rechtstreekse aanroepen vanuit de browser toe.
- **`devserver.mjs`** — alleen voor lokaal testen op je eigen computer (zie hieronder).

## Lokaal testen (op je eigen computer)

1. Installeer [Node.js](https://nodejs.org) (LTS-versie), als dat nog niet is gebeurd.
2. Open een terminal in deze map.
3. Typ: `node devserver.mjs`
4. Open in je browser: **http://localhost:3001**
5. Stoppen: Ctrl+C in de terminal.

Let op: de HTML rechtstreeks openen (dubbelklikken, `file://...`) werkt niet.
Er moet altijd een server tussen zitten, hetzij `devserver.mjs` lokaal, hetzij
Vercel straks live.

## Live zetten via GitHub + Vercel

1. Maak een nieuwe GitHub-repository aan en upload deze hele map (inclusief de `api`-map).
2. Ga naar [vercel.com/new](https://vercel.com/new) en importeer die repository.
3. Geen extra instellingen nodig — Vercel herkent automatisch dat `api/getij.js`
   een serverless function is en serveert `index.html` als startpagina.
4. Na deployen krijg je een `.vercel.app`-adres dat meteen werkt.
5. Koppel daarna het domein wadoversteken.nl via Vercel's domeininstellingen.

## Routes aanpassen

De vijf routes staan in `index.html`, in het `<script>`-blok, in de `ROUTES`-lijst
bovenaan. Elke route ziet er zo uit:

```js
{
  id: 'unieke-id',
  van: 'Vertrekplaats',
  naar: 'Aankomstplaats',
  via: 'Optionele vaargeul-naam of null',
  referentiepunt: 'texel' | 'kornwerderzand' | 'harlingen' | 'vlieland',
  event: 'hoogwater' | 'laagwater',
  offsetMinuten: -120,   // negatief = voor het event, positief = erna
  advies: 'Leestekst, bijv. "2 uur voor hoogwater Texel"',
}
```

Voor een nieuw referentiepunt moet ook `REFERENCE_POINTS` in `api/getij.js`
worden uitgebreid met de juiste RWS-locatiecode.

## Databron

Rijkswaterstaat WaterWebservices, astronomisch getij (CC0-licentie, vrij te
gebruiken, geen garantie op uptime vanuit RWS). De vertrektijden zijn
vuistregels, geen diepgang- of weerberekening.
