# wadoversteken.nl — projectoverzicht

Dit document vat samen wat er tot nu toe is gebouwd, welke keuzes zijn
gemaakt en waarom, en wat de eerstvolgende stap is. Bedoeld om dit project
in een nieuwe omgeving (Cowork) te kunnen voortzetten zonder de hele
geschiedenis opnieuw te hoeven doornemen.

**Eigenaar:** Lubberts Maritiem
**Doel van de site:** gasten van wadoversteken.nl duidelijk maken wanneer
het qua getij ideaal/mogelijk is om met een zeilboot over te steken tussen
Waddenzee-havens (bijv. Harlingen → Terschelling), op basis van
vertrekadviezen t.o.v. hoog- en laagwater.

---

## 1. Architectuur — wat draait waar

Dit is **geen** React/Vite-project (die opzet is vroeg in het traject
verlaten). De huidige, actuele versie is een **statische site (HTML/CSS/JS,
geen build-stap) plus één serverless function**, bedoeld voor deployment op
**Vercel**.

**Update aug. 2026:** wat eerder één `index.html`-bestand was (HTML, CSS en
JS allemaal inline) is opgesplitst in aparte bestanden voor onderhoudbaarheid
— zie sectie 9. Er is nog steeds geen bundler/build-stap nodig; de browser
laadt gewoon meerdere `<script>`/`<link>`-tags.

```
wadoversteken-github/
├── index.html           ← pagina-structuur (markup)
├── styles.css            ← alle vormgeving
├── routes-data.js        ← ROUTES (67), referentiepunten, coördinaten, drempelwaarden
├── app.js                 ← applicatielogica
├── favicon.svg            ← paginaicoon
├── api/getij.js          ← Vercel serverless function (Node), proxyt Rijkswaterstaat
├── devserver.mjs         ← lokale ontwikkelserver (speelt de Vercel-function na,
│                            serveert nu ook de statische .css/.js/.svg-bestanden)
├── package.json           ← minimaal, alleen een "dev"-script
└── README.md              ← technische documentatie (bestaat al, zie hieronder)
```

Alle bestanden horen naast elkaar in de hoofdmap — met uitzondering van
`api/getij.js`, dat per se in `api/` moet staan (zie de valkuil hieronder).
Dat blijft dus hetzelfde risico als voorheen; het is niet groter geworden
door de bestandssplitsing, omdat de nieuwe bestanden (`styles.css`, `app.js`,
`routes-data.js`, `favicon.svg`) allemaal op het hoofdniveau blijven staan.

**Waarom een serverless function nodig is:** de Rijkswaterstaat
WaterWebservices-API (voor getij) staat **geen CORS toe**, dus de browser
mag die niet rechtstreeks aanroepen. `api/getij.js` draait op Vercel,
haalt de data server-side op, en geeft ze door aan de browser.

De windvoorspelling (Open-Meteo) heeft dit probleem niet — die staat wél
CORS toe — en wordt daarom **rechtstreeks vanuit de browser** aangeroepen,
zonder proxy.

**Hosting:** Vercel, gratis Hobby-tier is voldoende. Gekoppeld aan een
GitHub-repo (`Lubberts-Maritiem` was de repo-naam in eerdere sessies).
Live deployment-voorbeeld uit dit traject: `https://live-blush-six.vercel.app`
(kan inmiddels een ander domein zijn als het domein wadoversteken.nl is
gekoppeld).

**Belangrijke valkuil die al één keer misging:** bestanden los uploaden via
GitHub's "Add file" → "Upload files" plaatst `getij.js` per ongeluk in de
hoofdmap i.p.v. in `api/`. Vercel herkent de function dan niet en je krijgt
een `NOT_FOUND`-fout op `/api/getij`, wat in de browser verschijnt als
`SyntaxError: The string did not match the expected pattern` (want de
browser probeert HTML-foutpagina als JSON te parsen). Oplossing: gebruik
"Create new file" en typ het volledige pad `api/getij.js` in het
bestandsnaamveld, of gebruik git/GitHub Desktop om de hele map in één keer
te pushen.

**Referentiepunten (Rijkswaterstaat):** `REFERENCE_POINTS` in `api/getij.js`
bevat nu 12 punten (was 10) — `ijmuiden` (locatiecode
`ijmuiden.buitenhaven`) en `scheveningen` (locatiecode `scheveningen`) zijn
in aug. 2026 toegevoegd, beide geverifieerd via de RWS-metadatacatalogus op
ondersteuning van de `GETETBRKD2`-groepering én getest met een live call.

---

## 2. Databronnen

### Getij — Rijkswaterstaat WaterWebservices
- Endpoint: `https://ddapi20-waterwebservices.rijkswaterstaat.nl/ONLINEWAARNEMINGENSERVICES/OphalenWaarnemingen`
- Groepering `GETETBRKD2` geeft direct HW/LW-extremen (tijdstip + type) terug,
  in het veld `Meetwaarde.Waarde_Alfanumeriek` ("hoogwater" / "laagwater").
- Gratis, CC0-licentie, geen API-key nodig.
- **Geen CORS** — moet via de serverless proxy (`api/getij.js`).
- Niet elk RWS-locatiecode-punt ondersteunt deze groepering (bijv.
  `harlingen.havenmond` niet, `harlingen.waddenzee` wel) — dit kostte tijd
  om uit te zoeken via de RWS-catalogus (`METADATASERVICES/OphalenCatalogus`).

**Referentiepunten en hun RWS-locatiecode** (in `api/getij.js`,
`REFERENCE_POINTS`):
```
harlingen        → harlingen.waddenzee
kornwerderzand   → kornwerderzand.waddenzee.buitenhaven
vlieland         → vlieland.haven
texel            → texel.oudeschild
denoever         → denoever.waddenzee.voorhaven
denhelder        → denhelder.marsdiep
terschelling     → terschelling.west
ameland          → ameland.nes
schiermonnikoog  → schiermonnikoog.waddenzee
lauwersoog       → lauwersoog.waddenzee
```

### Wind + huidig weer + zon op/onder — Open-Meteo
- Endpoint: `https://api.open-meteo.com/v1/forecast`
- Gratis, **geen API-key**, geen account, CORS wél toegestaan
  (`access-control-allow-origin: *`), dus rechtstreeks vanuit de browser.
- Non-commercial gebruik tot 10.000 calls/dag gratis — past ruim.
- Gebruikte parameters: `hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m`
  (voor per-vertrekmoment windwaarschuwing) en
  `current=...&daily=sunrise,sunset,...` (voor het "Actueel weer & zon"-blok).
- `wind_speed_unit=kn` (knopen), `timezone=Europe/Amsterdam`.

### Vertrekadviezen (de vuistregels zelf) — Waddenhavens.nl
- Door de gebruiker aangeleverd als platte tekst (niet via een API), zie
  sectie 4. Dit zijn **vuistregels**, geen live berekening — een vast
  aantal uren voor/na HW of LW op een referentiepunt.

### Overwogen maar bewust NIET gebruikt: Waddendata.nl
- De gebruiker vroeg of deze site als databron kon dienen. Onderzoek wees
  uit dat Waddendata.nl zelf ook maar een dashboard is bovenop RWS-data
  (gecombineerd met KNMI/Windguru), zonder eigen gedocumenteerde API en
  zonder duidelijke hergebruikslicentie. Advies was om bij RWS te blijven.
  Gebruiker ging hiermee akkoord.

---

## 3. Kernlogica — hoe een vertrekvenster wordt berekend

Elke route heeft een `offsetMinuten` t.o.v. een HW- of LW-moment op een
referentiepunt:
- **Vast moment**: `offsetMinuten: -120` betekent "2 uur vóór" het event
  (negatief = voor, positief = na).
- **Vensterbreedte**: `offsetMinuten: [60, 180]` betekent "1–3 uur na" het
  event — de site toont dan "12:37 tot 14:37" i.p.v. één tijdstip.

**Bekende beperking**: sommige brontekst-regels beschrijven een venster dat
loopt van het ene event-type naar het volgende (bijv. "vanaf 1 uur vóór LW
tot uiterlijk 3 uur vóór HW"). Dat past niet in het `[start, eind]`-model
(dat gaat uit van hetzelfde event). Voor deze 2 routes
(`terschelling-harlingen`, `terschelling-kornwerderzand-harlingen`) toont de
site daarom alleen het vroegste vertrekmoment plus een tekstuele
`opmerking` die dit toelicht.

De route/naar-dropdown is **afhankelijk**: de "naar"-lijst filtert live op
basis van de gekozen "van", zodat je nooit een niet-bestaande combinatie
kunt kiezen (bijv. vanaf Terschelling kun je niet naar IJmuiden, want die
route bestaat niet in de brondata — dat is geen bug, IJmuiden/Scheveningen
hebben simpelweg geen retourroute in de bron).

---

## 4. Volledige routedata (67 routes)

Basis (56 routes): door de gebruiker aangeleverde tekst "WADDENZEE
VERTREKADVIEZEN, Bron: Waddenhavens.nl". De ruwe brontekst stond letterlijk
in de chat en is 1-op-1 verwerkt in `ROUTES` (nu in `routes-data.js`, was
eerder inline in `index.html`), met een paar correcties tijdens het bouwen
(zie 4.2).

**Aanvulling aug. 2026 (+11 routes, zie sectie 9):** gecontroleerd tegen de
"ADVIES VERTREKTIJDEN"-tabel op watersportalmanak.nl (dezelfde klassieke
tabel als op hydraat.nl). Dit leverde twee concrete gaten op t.o.v. de
Waddenhavens.nl-data: Den Helder had alleen een route naar Oudeschild
terwijl de bron 7 vertrekroutes vanaf Den Helder geeft, en IJmuiden/
Scheveningen stonden als "doodlopend" genoteerd terwijl de bron wél
retourroutes geeft. Zie sectie 9 voor de volledige toelichting en een
geconstateerde afwijking die *niet* is doorgevoerd.

### 4.1 Overzicht van/naar-matrix (bijgewerkt aug. 2026)

| Van | Naar (mogelijk) |
|---|---|
| Ameland | Harlingen, Lauwersoog, Schiermonnikoog, Terschelling, Vlieland |
| Den Helder | Den Oever, Harlingen, IJmuiden, Kornwerderzand, Oudeschild, Scheveningen, Vlieland |
| Den Oever | Oudeschild |
| Harlingen | Ameland, Oudeschild, Terschelling, Vlieland |
| IJmuiden | Den Helder, Oudeschild, Scheveningen |
| Kornwerderzand | Oudeschild, Terschelling, Vlieland |
| Lauwersoog | Ameland, Schiermonnikoog |
| Oudeschild | Den Helder, Den Oever, Harlingen, IJmuiden, Kornwerderzand, Scheveningen, Terschelling, Vlieland |
| Scheveningen | IJmuiden |
| Schiermonnikoog | Ameland, Lauwersoog |
| Terschelling | Ameland, Harlingen, Kornwerderzand, Oudeschild, Vlieland |
| Vlieland | Ameland, Harlingen, Kornwerderzand, Oudeschild, Terschelling |

Er zijn geen doodlopende vertrekpunten meer — Den Helder, IJmuiden en
Scheveningen hadden voorheen geen of nauwelijks routes als "van"-punt, dat is
met de aanvulling van aug. 2026 opgelost (zie sectie 9).

Elke route in `routes-data.js` (`const ROUTES = [...]`, was eerder inline in
`index.html`) heeft dit veldformaat:
```js
{
  id: 'unieke-id',
  van: 'Vertrekplaats',
  naar: 'Aankomstplaats',
  via: 'Vaargeulnaam of null',
  referentiepunt: 'texel' | 'kornwerderzand' | 'harlingen' | 'vlieland' |
                   'denoever' | 'denhelder' | 'terschelling' | 'ameland' |
                   'schiermonnikoog' | 'lauwersoog' | 'ijmuiden' | 'scheveningen',
  event: 'hoogwater' | 'laagwater',
  offsetMinuten: -120,        // of [start, eind] voor een venster
  advies: 'Leestekst voor de gebruiker',
  opmerking: 'Optioneel: extra toelichting',
}
```

### 4.2 Correcties die tijdens het bouwen zijn gemaakt op de brondata

1. **"Texel" vs "Oudeschild"** — de brontekst gebruikt soms "Texel" als
   HW/LW-referentiepunt-naam en soms "Oudeschild" als havennaam voor
   dezelfde plek. Alle plaatsnaam-velden (`van`/`naar`) zijn consistent
   naar **"Oudeschild"** genormaliseerd; het referentiepunt heet intern nog
   `texel` (dat is alleen de RWS-locatiecode-sleutel, niet zichtbaar voor
   de gebruiker).

2. **"Vlieland/Terschelling" als samengestelde bestemming** — de brontekst
   had 3 routes met deze dubbele naam als één bestemmingsveld (bijv.
   "Oudeschild → Vlieland/Terschelling"). Dat matchte met niets in de
   dropdown, dus deze routes waren **onvindbaar** voor de gebruiker als die
   "Vlieland" of "Terschelling" apart als bestemming koos. Gecorrigeerd
   door elke van deze 3 routes op te splitsen in een aparte Vlieland- en
   Terschelling-variant, met dedup tegen al bestaande equivalente routes
   (2 van de 3 hadden al een aparte tegenhanger elders in de bron).

3. **Exacte duplicaten verwijderd** — de brontekst vermeldt dezelfde route
   soms letterlijk twee keer (bijv. "Ameland → Schiermonnikoog" komt 3x
   voor met identieke tijd). 7 duplicaten verwijderd zodat de site niet
   meerdere identieke kaarten toont voor dezelfde route.

**Belangrijk voor Cowork:** als je de routedata verder aanpast, controleer
opnieuw op duplicaten en op de "naar"-matrix (zie 4.1) — dat waren de twee
soorten fouten die eerder zijn misgegaan.

---

## 5. Gebouwde features (chronologisch)

1. **V1 — vijf vaste routekaarten** (Texel/Kornwerderzand/Harlingen/
   Vlieland → Terschelling), met live HW/LW-tijden van RWS.
2. **Standalone HTML-variant** — omdat de gebruiker dit ook los van React
   wilde kunnen draaien.
3. **Van/naar-kiezer** ("Google Maps-stijl") — dropdowns i.p.v. vaste
   kaarten, met een wisselknop.
4. **Bugfix: `/api/getij` NOT_FOUND** — zie sectie 1, valkuil met los
   uploaden naar GitHub.
5. **56 routes uitgebreid** vanuit de Waddenhavens.nl-brontekst, incl.
   6 nieuwe referentiepunten (Den Oever, Den Helder, West-Terschelling,
   Ameland, Schiermonnikoog, Lauwersoog), vensterbreedte-ondersteuning
   ("1–3 uur na..."), en een (later vervangen) "diepgang & vaartijd"-tabel.
   Copyright "© Lubberts Maritiem 2026" toegevoegd.
6. **Bugfix: routes zonder match** — zie 4.2, punt 2 en 3.
7. **Afhankelijke "naar"-dropdown** — filtert op basis van "van", toont
   nette melding bij doodlopende vertrekpunten (IJmuiden, Scheveningen).
8. **Datum kiezen** — checkbox + date-input, toont bij een gekozen datum
   *alle* vertrekmomenten van die dag (i.p.v. alleen het eerstvolgende).
9. **Windvoorspelling per vertrekmoment** — Open-Meteo, telt **niet** mee
   in het advies zelf, is puur informatief naast elk moment.
10. **Combinatiewaarschuwing** — twee onafhankelijke, samen te tonen
    triggers:
    - Windkracht 6+ (≥22 knopen gemiddeld) of harde windstoten
      (≥28 knopen) — drempel is gebaseerd op het punt waarop het KNMI
      windwaarschuwingen afgeeft voor de Waddenzee-scheepvaart.
    - Vertrekmoment tussen 22:00–05:00 ("in het donker").
    Instelbaar via `WIND_WAARSCHUWING_KNOPEN`, `WIND_STOTEN_WAARSCHUWING_KNOPEN`,
    `NACHT_START_UUR`, `NACHT_EIND_UUR` bovenaan het script in `index.html`.
11. **"Actueel weer & zon"-blok** — verving het oude, statische
    diepgang/vaartijd-tabelletje. Toont live weertype, temperatuur, wind,
    zonsopkomst/-ondergang en dagmin/max voor de **gekozen vertreklocatie**;
    ververst automatisch bij het wisselen van "van".

12. **Code opgesplitst in bestanden, a11y- en visuele polish, +11 routes**
    (aug. 2026) — zie sectie 9 voor de volledige toelichting.

### Bewust NIET gebouwd
- **E-mailherinnering** (kies vooraf hoe lang van tevoren, site mailt
  automatisch): besproken en technisch uitgezocht (zie sectie 6), maar de
  gebruiker koos expliciet om dit voor nu weg te laten — vereist een
  database (Vercel KV/Upstash) én een mailservice-account (bijv. Resend),
  beide nieuwe registraties die de gebruiker nu niet wilde doen.

---

## 6. Onderzoek gedaan maar (nog) niet geïmplementeerd

### E-mailherinnering — bevindingen voor als dit later terugkomt
- **Zonder eigen server kán het**, via Vercel als host:
  - **EmailJS**: verstuurt mail rechtstreeks vanuit de browser-JS, geen
    backend nodig, gratis tier beschikbaar. Eenvoudigste optie voor een
    "stuur dit direct naar mij"-knop zonder opslag.
  - **Resend + Vercel serverless function**: robuuster, key blijft
    server-side. Nodig voor de *geplande* variant die de gebruiker koos.
- **Voor de door de gebruiker gekozen "volledige" variant** (vooraf
  instellen hoe lang van tevoren, site onthoudt en mailt automatisch) is
  drie dingen nodig:
  1. Een kleine database om reminders op te slaan (e-mailadres + gewenst
     moment) — voorstel was **Vercel KV / Upstash Redis** (gratis tier).
  2. Een **cron job** (Vercel Cron, ook gratis) die periodiek checkt of er
     een reminder verstuurd moet worden.
  3. Een mailservice-account (**Resend** voorgesteld) om de mail
     daadwerkelijk te versturen.
- Gebruiker moet dus nog: een Resend-account aanmaken, en akkoord geven op
  een Vercel KV/Upstash-integratie, voordat dit gebouwd kan worden.

### Route-kaart — in ontwikkeling, hieronder de status
De gebruiker vroeg om de route ook visueel weer te geven. Gekozen aanpak
(bevestigd door gebruiker): **kaart met een lijn die de vaargeul bij
benadering volgt** — dus niet alleen markers voor vertrek/aankomst.

**Belangrijke beperking, al met de gebruiker gedeeld:** er zijn geen vrij
beschikbare, officiële vaargeul-coördinaten. Elke lijn is dus een eigen
benadering op basis van bekende havenposities + geulnamen uit de brondata,
niet iets om op te navigeren. Dit moet duidelijk in de UI blijven staan
(bijv. als kleine notitie bij de kaart).

**Onderzoek afgerond:**
- **Leaflet.js + OpenStreetMap-tiles** is de te gebruiken techniek: geen
  API-key, geen account, geen kosten, volledig client-side. Ondersteunt
  markers, polylines (voor de route-lijn), popups.
- Attributie "© OpenStreetMap contributors" is verplicht en zichtbaar te
  houden op de kaart (standaard Leaflet-gedrag, niet aanpassen).

**Nog te doen (volgende sessie):**
1. `PLACE_COORDS` toevoegen — coördinaten per **plaatsnaam** (dus ook voor
   IJmuiden, Scheveningen, Oudeschild etc., niet alleen de 10
   referentiepunten die er als `REFERENCE_COORDS` al zijn voor de wind).
   Er was net een `REFERENCE_COORDS`-object voor de windvoorspelling
   aanwezig — die kan als basis dienen maar moet uitgebreid worden naar
   alle 13 plaatsnamen uit `PLACES`.
2. Een klein aantal **karakteristieke tussenpunten per vaargeul-naam**
   bepalen (bijv. voor Boontjes, Scheurrak, Slenk, Vliestroom, Inschot,
   etc.) zodat de lijn niet zomaar recht over een droogvallende plaat
   loopt. Dit hoeft geen navigatiekwaliteit te hebben, wel een redelijke
   visuele indicatie.
3. Leaflet CDN-script + CSS toevoegen aan `index.html`
   (`https://unpkg.com/leaflet@.../dist/leaflet.js` + bijbehorende CSS,
   exacte versie nog te kiezen — laatste stabiele Leaflet 1.9.x is prima).
4. Een kaart-container toevoegen aan elke resultaatkaart (`.result__card`),
   die ná het laden van de route wordt geïnitialiseerd met:
   - marker op vertrekpunt, marker op aankomstpunt
   - polyline via eventuele tussenpunten
   - `fitBounds()` zodat de route mooi in beeld staat
5. Testen: dit was nog niet gebouwd toen de sessie werd afgesloten voor de
   hand-off naar dit document — er is dus nog **niets** van de kaart in
   `index.html` terechtgekomen. De huidige `index.html` in deze repo bevat
   nog geen kaart-code.

---

## 7. Bekende gevoelige punten / dingen om in de gaten te houden

- **Enkel `index.html` hoeft geüpload te worden** bij toekomstige
  content-only wijzigingen (routedata, styling, tekst) — `api/getij.js`
  verandert alleen als er een nieuw referentiepunt bijkomt.
- **DST/tijdzone-afhandeling in `api/getij.js`** is een simpele
  maand-gebaseerde benadering (april–oktober = +2, rest = +1), geen
  exacte DST-berekening. Werkt in de praktijk prima omdat RWS de
  offset-notatie zelf verwerkt, maar is niet 100% astronomisch correct
  rond de exacte omschakelmomenten.
- **`isNachtVenster` is een vaste 22:00–05:00 klok-schatting**, geen
  astronomische zonsopkomst/-ondergangsberekening — terwijl het nieuwe
  "Actueel weer & zon"-blok wél de echte zonsopkomst/-ondergang toont.
  Deze twee zijn dus (bewust, voor eenvoud) niet aan elkaar gekoppeld; zou
  een latere verbetering kunnen zijn om de nachtwaarschuwing te baseren op
  de echte zon-tijden per dag/locatie i.p.v. een vaste klok.
- **Testomgeving-beperking**: in de Claude-sandbox faalt een directe
  browser-`fetch` naar externe domeinen (Open-Meteo) door een
  sandbox-specifieke certificaatbeperking (`ERR_CERT_AUTHORITY_INVALID`),
  terwijl `curl` in diezelfde sandbox het domein prima bereikt. Dit is
  **geen bug in de site** — op een echte Vercel-deployment, in een normale
  browser, werkt de Open-Meteo-call gewoon (al het overige testen bevestigt
  dat de responsverwerking en rendering-logica correct zijn). Houd hier
  rekening mee als toekomstige sandbox-tests hetzelfde laten zien: eerst
  met `curl` verifiëren of de databron zelf bereikbaar is voordat je een
  "bug" aanneemt.

---

## 8. Snelle links / referentie voor Cowork

- **RWS metadata-catalogus opvragen** (voor nieuwe locatiecodes):
  `POST https://ddapi20-waterwebservices.rijkswaterstaat.nl/METADATASERVICES/OphalenCatalogus`
  met body `{"CatalogusFilter": {"Locaties": true, "Groeperingen": true}}`
  — filter daarna op metadata-entries met `Groepering.Code === 'GETETBRKD2'`
  om te zien welke locaties getij-extremen ondersteunen.
- **Open-Meteo forecast endpoint**:
  `https://api.open-meteo.com/v1/forecast?latitude=...&longitude=...&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m&current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code,precipitation&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min&wind_speed_unit=kn&timezone=Europe/Amsterdam`
- **Lokaal testen**: `node devserver.mjs` in de projectmap, dan
  `http://localhost:3001` openen. Werkt alleen als Node.js geïnstalleerd is.
- **Deployen**: wijzigingen op GitHub committen (hele map) → Vercel deployt
  automatisch. Bij content-only wijzigingen (routedata, tekst) hoeft alleen
  `routes-data.js` opnieuw geüpload; bij stijlwijzigingen `styles.css`.

---

## 9. Sessie aug. 2026 (Cowork) — code-kwaliteit, visuele polish, +11 routes

Deze sessie had twee opdrachten van de gebruiker: (1) de site "naar een
hoger level tillen" qua code-kwaliteit en visuele afwerking, en (2) drie
extern aangeleverde links analyseren op bruikbare aanvullingen.

### 9.1 Code-kwaliteit & structuur

- **`index.html` opgesplitst** in `index.html` (markup), `styles.css`
  (alle CSS), `routes-data.js` (routedata + constanten) en `app.js`
  (applicatielogica). Dit was bewust **niet** eerder gedaan omdat het
  simpel-één-bestand-uploaden een expliciete keuze was (zie sectie 1) — de
  nieuwe bestanden staan daarom nog steeds allemaal op het hoofdniveau van
  de map, niet in submappen, zodat het upload-risico niet terugkomt.
- **Dode code verwijderd**: `otherDestinationsFrom()` was een 1-op-1
  duplicaat van `destinationsFrom()`; samengevoegd.
- **`devserver.mjs` uitgebreid** zodat die ook `.css`/`.js`/`.svg` kan
  serveren (voorheen alleen `.html` en `/api/getij`) — nodig omdat de
  bestandssplitsing anders lokaal getest niet zou werken.
- Toegevoegd: JSDoc-commentaar op de kernfuncties, een sectie-indeling met
  `// ---` scheidingslijnen in `app.js`.

### 9.2 Toegankelijkheid

- `aria-live="polite"` op de resultaat- en meteo-secties, zodat
  schermlezers updates automatisch voorlezen.
- Zichtbare `:focus-visible`-stijl toegevoegd (was `outline: none` zonder
  alternatief — een a11y-probleem).
- `aria-label` op de van/naar-selects en de datuminvoer; een "Ga direct naar
  het resultaat"-skiplink vóór de header.
- Foutstatussen (`.result__status--error`) hebben nu een zichtbaar
  waarschuwingsicoon i.p.v. alleen kleur, voor mensen die geen kleur
  onderscheiden.

### 9.3 Visuele polish

- Skeleton-loading (subtiele shimmer-animatie) i.p.v. platte "Getij
  laden…"-tekst, voor resultaatkaarten én het meteoblok.
- Fade-in-animatie op nieuwe resultaatkaarten; korte draai-animatie op de
  wissel-knop bij gebruik.
- Emoji (⚠️) vervangen door SVG-iconen (wind, waarschuwing) die met
  `currentColor` meekleuren met de rest van het thema.
- `favicon.svg` toegevoegd (hergebruikt het bestaande golf/mast-beeldmerk).
- Open Graph / Twitter-metatags en `theme-color` toegevoegd voor betere
  linkpreviews en mobiele adresbalkkleur.
- `prefers-reduced-motion` gerespecteerd: animaties vallen weg voor mensen
  die dat in hun besturingssysteem hebben ingesteld.
- Extra breakpoint op 600px (naast de bestaande 480px) voor een rustigere
  overgang op tablet-formaat.

### 9.4 Analyse van drie aangeleverde bronnen

De gebruiker gaf drie links om te onderzoeken op bruikbare aanvullingen:

1. **hydraat.nl/getij/vertrektijden** en **watersportalmanak.nl/artikel/
   vertrektijden-jachthavens** — bevatten dezelfde klassieke "ADVIES
   VERTREKTIJDEN"-tabel (Hydraat heeft 'm letterlijk overgenomen van
   Watersportalmanak). Deze tabel is een **andere, onafhankelijke bron**
   dan de Waddenhavens.nl-tekst die de bestaande 56 routes vormt, en is
   gebruikt om de site te controleren én aan te vullen:
   - **Den Helder** had op de site alleen een route naar Oudeschild, terwijl
     deze tabel 7 vertrekroutes vanaf Den Helder geeft (naar IJmuiden,
     Scheveningen, Den Oever, Kornwerderzand, Harlingen, en Vlieland via
     twee vaargeulen). Alle 7 zijn toegevoegd.
   - **IJmuiden en Scheveningen** stonden genoteerd als "doodlopend, bron
     heeft geen retourroute" (zie de oude sectie 4.1). Deze tabel geeft wél
     retourroutes: IJmuiden → Den Helder/Oudeschild/Scheveningen, en
     Scheveningen → IJmuiden. Hiervoor waren **twee nieuwe RWS-
     referentiepunten** nodig — opgezocht via de metadatacatalogus en
     bevestigd met een live testcall (zie sectie 1): `ijmuiden` (locatiecode
     `ijmuiden.buitenhaven`) en `scheveningen` (locatiecode `scheveningen`).
   - De tabel bevat ook een Delfzijl ↔ Borkum-route (Eems) en volledige
     Oosterschelde/Westerschelde-tabellen. **Bewust niet toegevoegd** — dat
     valt buiten het doel van de site (Waddeneiland-oversteken); Delfzijl-
     Borkum zou bovendien een nieuw referentiepunt en nader onderzoek naar
     Duitse/RWS-dekking vereisen.
   - **Geconstateerde afwijking, niet doorgevoerd**: de bestaande route
     `denhelder-oudeschild` gebruikt `offsetMinuten: [60, 180]` ("1–3 uur na
     laagwater Den Helder", uit Waddenhavens.nl), terwijl deze nieuwe bron
     "1 voor tot 3 uur na LW Den Helder" aangeeft (venster `[-60, 180]`). Dit
     is bewust **niet** overschreven, omdat de bestaande waarde uit een
     andere, eerder gekozen bron komt met eigen correcties. Aanbevolen om dit
     bij gelegenheid te verifiëren (bijv. met een vaste stroomatlas) voordat
     het wordt aangepast.
2. **zeilersforum.nl** (draadje "advies vertrektijd Lauwersoog naar Borkum",
   7-9 aug. 2026) — bevestigt dat de vaste-offset-aanpak van de site de
   juiste basisgedachte is, maar laat ook de grens ervan zien: op routes
   zonder vaste vuistregel rekenen ervaren zeilers met een stroomatlas en
   boot-snelheid-door-het-water, en wordt de Westerems aangeraden boven het
   Hubertgat (slecht betond) voor de vaart naar Borkum. Voor Lauwersoog–
   Borkum zelf staat nergens een harde vertrekregel, dus die route is niet
   toegevoegd — zou een aparte, kleinere feature kunnen worden (bijv. een
   "geavanceerde modus" met stroomsterkte i.p.v. vaste offset), maar is nu
   niet opgepakt.

### 9.5 Routedata: 56 → 67 routes

11 routes toegevoegd (zie `routes-data.js`, secties "DEN HELDER" en
"IJMUIDEN / SCHEVENINGEN" onderaan `ROUTES`). Gecontroleerd op duplicaten,
unieke ids, geldige referentiepunten en aanwezige coördinaten (zie sectie
9.1-verificatiestap hieronder) — geen problemen gevonden.

### 9.6 Verificatie uitgevoerd

- `node -c` op alle nieuwe/gewijzigde `.js`-bestanden (syntax-check).
- `devserver.mjs` lokaal gestart; alle statische bestanden (`index.html`,
  `styles.css`, `app.js`, `routes-data.js`, `favicon.svg`) en `/api/getij`
  (inclusief de twee nieuwe referentiepunten `ijmuiden` en `scheveningen`)
  gaven een geldige `200`-respons met live RWS-data, en een programmatische
  check op `routes-data.js`: 67 routes, 0
  duplicaten, 0 dubbele ids, alle referentiepunten bekend, alle
  referentiepunten hebben coördinaten.
- Simulatie van `computeDepartures()` met echte, actuele getijdata voor de
  4 nieuwe/twijfelgevallen-routes (`denhelder-kornwerderzand`,
  `denhelder-denoever` (venster), `ijmuiden-oudeschild`,
  `scheveningen-ijmuiden`) — resultaten zijn plausibel (tijdstippen kloppen
  met de offset t.o.v. het getoonde HW/LW-moment).
- Alle `id="..."`-referenties die `app.js` verwacht, bestaan in `index.html`
  (en vice versa geen ontbrekende).
- Er was geen headless browser beschikbaar in deze omgeving om de site
  visueel te renderen; de verificatie hierboven dekt syntax, dataverwerking
  en netwerkgedrag, maar niet het daadwerkelijke pixel-resultaat. Aanbevolen
  om bij een volgende sessie (of door de gebruiker zelf, via
  `node devserver.mjs`) een visuele check te doen.

### 9.7 Nog openstaand na deze sessie

- **Route-kaart** (Leaflet, zie sectie 6) — nog steeds niet gebouwd, blijft
  de eerstvolgende grotere feature.
- **Discrepantie `denhelder-oudeschild`** (zie 9.4, punt 1) — nader te
  verifiëren, niet aangepast.
- **Lauwersoog–Borkum en verdere Duitse Wadden** — bewust buiten scope
  gehouden, zou een aparte beslissing vergen (nieuw referentiepunt, en een
  andere aanpak dan vaste-offset-vuistregels omdat daar geen bron voor is).

## 10. Boot-overlay (vervolgsessie, zelfde dag)

De gebruiker had op een ander project (`lubberts-maritiem.github.io/marifoon`,
een VHF-marifoon-scanner-site) een opstartanimatie: een fullscreen overlay
met merknaam, een groot kanaalnummer dat oploopt (01 → 16) en een subtekst,
die na een vaste tijd (~2,2s) wegfadet en dan de echte features start
(audio/camera's/datafeeds). Bron bekeken via de GitHub-repo
(`raw.githubusercontent.com/Lubberts-Maritiem/marifoon/main/index.html`) en
het door de gebruiker geüploade `lubberts-maritiem.html` (een eerdere versie
van dezelfde site, bevestigt hetzelfde patroon).

**Toegepast op wadoversteken.nl**, maar thematisch aangepast i.p.v. letterlijk
gekopieerd:
- Nieuwe `.boot-overlay` in `index.html` (direct na `<body>`): het bestaande
  golf/mast-beeldmerk (hergebruikt uit de header), de merknaam
  "wadoversteken.nl", en een statusregel die wisselt tussen "Getij
  ophalen…", "Wind controleren…" en "Vertrekvenster berekenen…".
- CSS in `styles.css`: de golven in het icoon krijgen `stroke-dasharray` +
  een `stroke-dashoffset`-animatie (`boot-wave-flow`) zodat het lijkt of het
  water "stroomt"; het hele icoon bobt licht op en neer (`boot-bob`).
  `prefers-reduced-motion` schakelt beide animaties uit.
- **Belangrijk verschil met het marifoon-voorbeeld**: daar is de wachttijd
  een vaste timer, losgekoppeld van of de echte data al binnen is. Hier is
  de overlay **gekoppeld aan echte gereedheid**: `refreshMeteo()` en
  `renderResult()` zijn aangepast zodat ze hun fetch-promise teruggeven
  i.p.v. "fire and forget" te zijn, en een nieuwe `boot()`-functie in
  `app.js` wacht via `Promise.race()` op zowel die twee samen (`Promise.all`)
  als een vaste vangnet-timeout van `BOOT_MAX_WACHTTIJD_MS` (4000 ms) — wat
  eerder is. Zo verdwijnt de overlay zo snel als de data het toelaat, maar
  hangt de gebruiker nooit vast als een fetch traag is of faalt.
- Geverifieerd: syntax-check op `app.js`, geen dubbele `refreshMeteo()`/
  `renderResult()`/`boot()`-aanroepen meer, alle `id`-referenties kloppen,
  `styles.css` heeft evenveel openende als sluitende accolades, en de
  site + `/api/getij` reageren nog gewoon via `devserver.mjs`. Er was ook nu
  geen headless browser beschikbaar (en de Chrome-extensie was niet
  verbonden) om de animatie daadwerkelijk te zien bewegen — visuele controle
  door de gebruiker zelf (of een volgende sessie) is aan te raden.

---

*Dit document is gegenereerd als hand-off tussen werksessies. De huidige
bestanden dekken alle features t/m punt 12 in sectie 5 plus de boot-overlay
uit sectie 10, maar nog geen route-kaart (sectie 6, "Route-kaart" is de
eerstvolgende openstaande taak).*
