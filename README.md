# swap'd – App Dev

> **Swap, don't shop.** SoLoMo-Tausch-App ohne Geld (Uni-Projekt Marketing/UX).
> Diese README ist der **Arbeitskontext für Claude**: Entscheidungen, Architektur, Regeln.
> Vor jeder Session lesen, nach wichtigen Entscheidungen aktualisieren.
> Lars codet nicht selbst → Claude baut, erklärt kurz, auf Deutsch, locker, per Du.

---

## 1. Ziel & Rahmen

- **Funktionierende Web-App** (läuft im Browser), **kein** App Store für jetzt.
- Als **PWA** installierbar (Homescreen-Icon), mobile-first.
- App Store später optional via **Capacitor** (gleicher React-Code). Achtung: Apple lehnt reine Web-Wrapper gern ab → dann native Features (Push, Kamera) nutzen. iOS-Build braucht Mac + Xcode.
- **Nicht** React Native (wäre UI-Rewrite).

## 2. Tech-Stack (entschieden)

| Bereich | Wahl |
|---|---|
| Build | **Vite + React + TypeScript** (kein Next.js, Overkill) |
| Styling | **Tailwind CSS**, CD als Theme-Tokens |
| UI-Bausteine | **shadcn/ui** (an CD angepasst) |
| Icons | **Lucide** (runde Line-Icons, 2 px) |
| Karte | **Leaflet 1.9 + react-leaflet 4** (entschieden 2026-11-26), OSM-Kacheln gedämpft |
| PWA | **vite-plugin-pwa** |
| Daten Phase 1 | **Mock-Adapter**: `test.json` + localStorage |
| Daten Phase 2 | **Supabase Cloud** (Free Plan): Auth, Postgres, Realtime-Chat, Storage |

## 3. Architektur: Daten-Wrapper (Adapter-Pattern) ⭐

**Kernregel: Die UI importiert NIE direkt `test.json` oder Supabase – nur `api` aus `src/data`.**

```
UI (React-Komponenten)
      ↓  api.getListings()
  src/data/index.ts  →  export const api = mockAdapter   // später: supabaseAdapter
      ↓                          ↓
 mockAdapter.ts            supabaseAdapter.ts
 (test.json + localStorage)  (Phase 2)
```

Struktur (umgesetzt):

```
src/data/
  types.ts            # User, Address, Listing, Swipe, Match, Chat, Message, Review, DataAdapter ("Vertrag")
  index.ts            # wählt Adapter (eine Zeile tauschen)
  mockAdapter.ts      # liest test.json, schreibt Änderungen in localStorage (Key swapd:mock:v2)
  supabaseAdapter.ts  # Phase 2: Stubs + geplantes SQL für Swipes, Matches, Adressen
  test.json           # Stuttgart-Demo: 14 User, 15 Adressen, 41 Inserate, Seed-Swipes, 2 Chats, Reviews
```

```ts
export interface DataAdapter {
  getListings(filter?: ListingFilter): Promise<Listing[]>
  getListing(id: string): Promise<Listing | null>
  createListing(data: NewListing): Promise<CreateListingResult>   // { listing, xp_earned }
  getCurrentUser(): Promise<User | null>
  getMyAddresses(): Promise<Address[]>                             // nur eigene
  createAddress(data: NewAddress): Promise<Address>
  getUser(id: string): Promise<User | null>
  getUserInteraction(userId): Promise<{ can_rate, my_review, reported }>
  submitReview({ reviewee_id, rating, text }): Promise<{ review, xp_earned }>
  reportUser({ reported_user_id, reason, details }): Promise<Report>
  getReviews(userId: string): Promise<Review[]>
  getChats(): Promise<Chat[]>
  getChat(id: string): Promise<Chat | null>
  startChat(listingId: string): Promise<Chat>                      // Tauschanfrage
  getMessages(chatId: string): Promise<Message[]>
  sendMessage(chatId: string, text: string): Promise<Message>
  subscribeToMessages(chatId, onMessage): () => void               // später Supabase Realtime
  getSwipeDeck({ radius_km, include_passed? }): Promise<Listing[]>
  recordSwipe(listingId, 'like' | 'pass'): Promise<{ match, xp_earned }>
  undoLastSwipe(): Promise<Listing | null>
  getMatches(): Promise<Match[]>
  updateSearchRadius(km): Promise<User>
  resetDemoData?(): Promise<void>                                  // nur Mock
}
```

### Datenmodell (= spätere Postgres-Tabellen)

| Tabelle / Feld | Inhalt |
|---|---|
| `users` | + `search_radius_km` (Default 5), `last_address_id` (zuletzt gewählte Adresse → Vorauswahl beim Einstellen). `district`/`lat`/`lng` = Profil-Standort, Basis für Entfernungen |
| `addresses` | `id, user_id, label ("Dorm", "Uni campus"), street, postal_code, district, city, lat, lng, created_at`. Mehrere pro User. **Nur für den Owner sichtbar** |
| `listings` | + `address_id`. `district`/`lat`/`lng` werden beim Anlegen aus der Adresse übernommen (Snapshot) |
| `swipes` | `id, user_id, listing_id, direction ('like' \| 'pass'), created_at`. Ein Swipe pro User + Listing (Upsert: aus „pass“ kann „like“ werden) |
| `matches` | `id, user_ids[], listing_ids[] ([ihr Item, mein Item]), chat_id, created_at` |
| `reviews` | `id, reviewer_id, reviewee_id, rating (1–5), text, created_at`. Eine Bewertung pro Paar, änderbar (Upsert). Bewerten nur nach gemeinsamem Chat |
| `reports` | `id, reporter_id, reported_user_id, reason ('no_show' \| 'scam' \| 'offensive' \| 'fake_listing' \| 'other'), details, created_at`. Nur einfügen, lesen später nur das Team |
| `users.rating_avg / rating_count` | **berechnet** aus `reviews` (Durchschnitt auf 1 Nachkommastelle, später View `user_ratings`), nicht in test.json gespeichert |
| berechnet | `listing.distance_km`, `listing.matches_my_search` (kommt aus der API, nicht gespeichert; später PostGIS / earthdistance) |

- **Bewertungen:** Öffentliches Profil `/users/:id` (aus dem Chat-Header, vom Owner auf der Inserat-Seite, von Bewertungen). „Rate {Name}“ erst nach gemeinsamem Chat, sonst Hinweis. Erste Bewertung einer Person = **+5 XP**, Ändern gibt keine XP. „Report“ ganz unten auf dem Profil, Gemeldete erfahren nichts. Demo: Mika hat Lea und Noah (offene Chats) noch nicht bewertet.
- **Match-Regel:** Ich like ein Item von X **und** X hat eins meiner aktiven Items geliked → Match + Chat (mit Begrüßung von X) + **25 XP**. Pro Personen-Paar nur ein Match. Undo nimmt Match, Chat und XP wieder zurück.
- **Swipe-Deck:** nur fremde, aktive Offering-Inserate im Radius, ohne meine Likes (Passes nur mit `include_passed`). Zuerst Items, die zu meinem „Looking for“ passen (gleiche Kategorie + Stichwort → Badge „On your list“, nur Kategorie → leicht vorgezogen), dann nach Nähe.
- **Datenschutz:** Exakte Adressen verlassen die API nur für den Owner (`getMyAddresses`). Fremde Inserate kommen ohne `address_id`. UI zeigt nur „1.2 km · Vaihingen“. Karten-Pins werden in `src/lib/geo.ts` (`fuzzLocation`) um 60–150 m versetzt und gerundet.
- **Neue Adresse:** Geocoding im Client über OpenStreetMap **Nominatim** (`src/lib/geocode.ts`, kostenlos, ohne Key, nur beim Speichern, max. 1 Anfrage/s). Später evtl. per Supabase Edge Function.
- Demo-Seed: Jonas, Nina (< 5 km), Kai (5–10 km) und Luca (> 10 km) haben schon Sachen von Mika (User 1) geliked → rechts swipen auf deren Items = Match.

- Joins kommen als optionale Felder (`listing.owner`, `chat.other_user`, `chat.last_message`) – genau die Form, die Supabase mit `select('*, owner:users(*)')` liefert.
- Mock-Chat antwortet automatisch nach 1,5–3 s (Demo für Realtime).
- Demo-Daten zurücksetzen: Profil → ganz unten „Reset demo“ (oder Konsole: `swapdReset()`).

**Regeln, damit der Wechsel zu Supabase billig bleibt:**
- Alles **async / Promise**, auch im Mock (gern mit kleinem Fake-Delay) → Ladezustände von Anfang an in der UI.
- `test.json` ist im Browser **read-only** → neue/geänderte Daten im Mock via **localStorage** (Overlay über JSON).
- JSON-Struktur = **spätere DB-Tabellen**: IDs als String (UUID-artig), `snake_case`-Felder wie in Postgres (`created_at`, `user_id`), ISO-Datum.
- Mock-Login = „du bist User 1“. Echter Login + **Echtzeit-Chat** erst mit Supabase → das ist der aufwendigste Teil beim Wechsel.
- Erwarteter Aufwand für den Wechsel: ca. 1–2 Sessions.

## 4. MVP-Scope (erst das, dann Fun-Features)

1. Feed / Karte mit Angeboten in der Nähe (Biete & Suche)
2. Inserat ansehen + **einstellen** (Foto, Titel, Kategorie, Zustand)
3. Tauschanfrage → Chat
4. Profil (Inserate, Bewertungen, XP)

Später (USP): Swipe-to-Swap, Smart Matching, Ringtausch (A→B→C→A), Gamification (Badges, Level, XP, CO₂-Zähler), Mystery-Swap, Kiez-Events.
Volle Projektinfos: `swapd-projektwissen.md` im claude.ai-Projekt „Swap'd Appp“.

## 5. Corporate Design (verbindlich)

Gamified, frisch, selbstbewusst. Knallig aber kontrolliert, **nicht girly**.
**60/30/10**: 60 % Surface, 30 % Ink + Tints, 10 % volle Farbe.

| Token | Hex | Rolle |
|---|---|---|
| `pink` | `#D13A6B` (dark: `#F06A95`) | Aktion & Marke, Schrift darauf **weiß** |
| `green` | `#2FB37A` (dark: `#45CF92`) | Match & Erfolg, Schrift darauf **immer Ink** |
| `gold` | `#FFC83D` | **nur** Belohnungen/XP |
| `ink` | `#1C1A2B` | Text |
| `ink-muted` | `#5E5B70` | Sekundärtext |
| `pink-tint` | `#FCE4EC` | ruhige Pink-Flächen |
| `green-tint` | `#DDF5EA` | Match-Hinweise, XP-Spur |
| `surface` | `#FAFAF7` | App-Hintergrund |

- **Verboten:** Pink + Grün als große Vollflächen nebeneinander · weiße Schrift auf Grün · Neon · Verläufe · Pastell-Rosa als Hauptfarbe.
- **Typo:** Bricolage Grotesque (Headlines, Zahlen, XP, Logo) · DM Sans (Text & UI) – Google Fonts.
- **Pop-Button:** harter Schatten `0 4px 0 #1C1A2B`, beim Drücken einsinken (`translateY(4px)`, Schatten 0).
- **Radien:** 8 / 16 / 24 / Pill. Badges = Pills. XP-Balken grün auf Green Tint.
- **Logo:** `swap'd` klein, Bricolage ExtraBold, Ink, **Apostroph pink**. App-Icon: „s'“ weiß/pink auf Ink. SVGs im claude.ai-Projekt (`swapd-logo.svg`, `swapd-logo-weiss.svg`).
- **Tonalität / Sprache:** App komplett auf **Englisch** (UI-Texte, Fake-Daten, Feature-Namen). Kurz, locker, direkt. Belohnen statt belehren („+20 XP for your first photo“). Claim: „Swap, don't shop.“

## 6. Hosting

- **GitHub Pages:** https://lk6114.github.io/swapd-app-dev/ (Repo `lk6114/swapd-app-dev`).
- Deploy automatisch bei Push auf `main` via [.github/workflows/deploy.yml](.github/workflows/deploy.yml): `npm ci` → `npm run build` → `dist/index.html` als `404.html` kopieren (SPA-Fallback für Deep-Links) → `upload-pages-artifact` + `deploy-pages`.
- App läuft unter Unterpfad → `base: '/swapd-app-dev/'` in `vite.config.ts`, Router mit `basename={import.meta.env.BASE_URL}`, PWA `start_url`/`scope` = `./`.
- **Regel:** Dateien aus `public/` nie mit festem `/` verlinken. Im Code `asset('datei.png')` aus `src/lib/asset.ts`, in `index.html` `%BASE_URL%datei.png`.
- Wird das Repo umbenannt → `base` in `vite.config.ts` anpassen.
- App bleibt **rein statisch** (`npm run build` → `dist/`), **keine Server-Features**. Backend später = Supabase Cloud.

## 6b. Entwickeln & Starten

```bash
npm install        # einmalig
npm run dev        # Dev-Server → http://localhost:5173 (auch im WLAN fürs Handy, URL steht im Terminal)
npm run build      # statischer Build nach dist/ (inkl. PWA/Service Worker)
npm run preview    # Build lokal ansehen
```

Code-Aufbau:

```
src/
  data/          # siehe Abschnitt 3 – einziger Datenzugang
  components/    # App-Bausteine (BottomNav, ListingCard, XpBar, Toast, …)
  components/ui/ # shadcn-artige Basis (Button, Badge, Card, Input, Chip, Skeleton) im CD
  components/swipe/ # SwipeDeck (Drag per Pointer Events), SwipeCard, MatchOverlay, DeckEmpty
  components/map/   # ListingMap (Leaflet, per React.lazy nachgeladen)
  screens/       # Swipe, Explore (Map | List), Listing, NewListing, Chats, Chat, Profile, User (fremdes Profil)
  hooks/         # useAsync (Lade-/Fehlerzustand), useReducedMotion
  lib/           # format, geo (Haversine, Pin-Verrauschung, Radius-Stufen), geocode (Nominatim), Level/XP, Foto
```

- CD-Farben/Radien/Schriften stehen in `tailwind.config.js`. Die Tailwind-Standardfarben sind **bewusst entfernt** → nur CD-Farben nutzbar. Pop-Effekt = Klasse `pop`.
- Routing: React Router 6. Bottom-Nav: **Swipe** (`/`) · **Explore** (`/explore`, `?view=map` für die Karte, `/map` leitet dorthin um) · (+) · Chats · Profile.
- Explore-Filter (Typ, Kategorie, Suche, Radius) stehen in der URL (`type`, `cat`, `q`, `r`) und gelten für Karte **und** Liste.
- Swipe: keine Animations-Lib, nur Pointer Events + CSS. Pfeiltasten ←/→, Backspace = Undo. `prefers-reduced-motion` → Überblenden statt Fliegen.
- Karte: Marker sind `L.divIcon` mit CSS (`index.css`), **keine Marker-PNGs** → kein Ärger mit dem GitHub-Pages-Unterpfad. Pins: Offering = Pink, Looking for = Ink-Outline, gematcht = Grün. Überlappende Pins (je nach Zoom, < 30 px Abstand) werden zu einem **Sammel-Pin mit Anzahl** zusammengefasst, Klick → Liste aller Inserate darin (eigene Gruppierung in `ListingMap.tsx`, kein Plugin). Typ-Filter: Karte startet mit **Offering**, Liste mit **All**. Kacheln = OSM-Standard, per CSS-Filter entsättigt (CARTO Positron braucht inzwischen einen API-Key). Für echten Betrieb mit viel Traffic: Kachel-Anbieter mit Key (z. B. MapTiler), OSM-Kachelregeln beachten.
- **Node-Version:** Lars' Rechner hat Node 16 → deshalb Vite 4, Tailwind 3, `workbox-build` per `overrides` auf 7.0.0 gepinnt, shadcn-Komponenten von Hand statt CLI. Nach Update auf Node LTS (22/24) können Vite & Co. hochgezogen werden.

## 7. Tools & Plugins

- Lars hat in Claude installiert: **Supabase**, **Design**, **UI Design Review**, **frontend-design**.
- Bevorzugt mit **Claude Code** (Terminal / VS Code) im Ordner arbeiten.
- Lokal nötig: Node.js LTS, Git (+ GitHub für Team & Deploy).

## 8. Status / Log

- **2026-11-25:** Stack, Adapter-Architektur, Hosting entschieden. README angelegt. Nächster Schritt: Grundgerüst (Vite + React + TS + Tailwind, CD-Theme, Navigation, Screens Feed/Inserat/Profil, `src/data` mit Mock-Adapter + `test.json`).
- **2026-11-25:** Grundgerüst gebaut: Vite 4 + React 18 + TS + Tailwind 3 (CD-Theme), PWA (vite-plugin-pwa, Platzhalter-Icon „s'“), Mock-Adapter mit localStorage-Overlay. Screens: Feed (Offering/Looking for, Suche, Kategorien), Inserat-Detail mit „Request swap“ → Chat, Inserat einstellen (Foto + XP-Belohnung), Chats + Chat (Fake-Realtime), Profil (Level/XP, Listings, Reviews). Map-Tab = Platzhalter. Interface um `getUser`, `getReviews`, `getChat`, `startChat`, `subscribeToMessages` erweitert. Build + Typecheck grün.
  Nächste Schritte: Node auf LTS updaten · echte Logo-SVGs nach `public/` · Map-Lib entscheiden · Badges im Profil echt machen (aktuell Platzhalter) · Git-Repo anlegen.
- **2026-11-25:** Hosting entschieden: **GitHub Pages** mit Actions-Deploy (siehe Abschnitt 6). Base-Pfad `/swapd-app-dev/`, 404.html-Fallback, `asset()`-Helper für public-Dateien. Einmalig im Repo nötig: Settings → Pages → Source = „GitHub Actions“.
- **2026-11-26:** **Swipe-to-Swap** ist jetzt die Startseite (Drag mit Rotation + „Want it“/„Nope“-Stamps, Pop-Buttons, Undo, Pfeiltasten, Match-Overlay mit +25 XP und Auto-Chat, Empty State mit Radius-Erweiterung „+N“ und „See passed again“). Feed + Karte zusammen unter **Explore** (Map | List, gemeinsame Filter inkl. Radius). Karte entschieden: **Leaflet** (eigene CD-Pins, Radius-Kreis, Pin → Vorschau → Detail, „Use my location“ mit Fallback). Demo-Daten komplett nach **Stuttgart** (User 1 Mika in Vaihingen am Campus, Radius-Stufen < 5 / 5–10 / 10–30 km). Neu: Tabellen `swipes`, `matches`, `addresses`; `users.search_radius_km`, `users.last_address_id`. **Gespeicherte Adressen:** beim Einstellen Adresse wählen oder neu anlegen (Geocoding via Nominatim), zuletzt gewählte ist vorausgewählt. „Reset demo“ im Profil. Sprache bleibt durchgehend Englisch (auch Fake-Daten).
- **2026-11-26:** Karte: Sammel-Pins mit Zahl für überlappende Inserate, Klick zeigt alle als Liste. Karte filtert standardmäßig auf „Offering“.
- **2026-11-26:** User-Rating funktional: `rating_avg`/`rating_count` werden aus `reviews` berechnet (41 Testbewertungen in test.json, z. B. Lea 5.0, Kai 3.5, Ben 2.0). Neues öffentliches Profil `/users/:id` mit „Rate“ (Sterne + Text, +5 XP) und „Report“ (Grund + Details, neue Tabelle `reports`). Chat-Header und Owner-Karte führen zum Profil.
  Nächste Schritte: echte Fotos für Demo-Inserate · Matches-Liste (z. B. im Chats-Tab) · Adressen im Profil verwalten (umbenennen/löschen) · Kachel-Anbieter mit Key vor echtem Launch.

## 9. Offene Fragen

- Wer im Team arbeitet mit am Code / GitHub-Repo?
