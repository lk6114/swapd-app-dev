# swap'd – App Dev

> **Tauschen statt kaufen.** SoLoMo-Tausch-App ohne Geld (Uni-Projekt Marketing/UX).
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
| Karte | **MapLibre** oder **Leaflet** (noch offen) |
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
  types.ts            # Listing, User, Chat, Message, Review, DataAdapter-Interface ("Vertrag")
  index.ts            # wählt Adapter (eine Zeile tauschen)
  mockAdapter.ts      # liest test.json, schreibt Änderungen in localStorage (Key swapd:mock:v1)
  supabaseAdapter.ts  # Phase 2 (noch leer)
  test.json           # Beispieldaten (5 User, 12 Inserate, 2 Chats, Reviews) – Berlin-Kieze
```

```ts
export interface DataAdapter {
  getListings(filter?: ListingFilter): Promise<Listing[]>
  getListing(id: string): Promise<Listing | null>
  createListing(data: NewListing): Promise<CreateListingResult>   // { listing, xp_earned }
  getCurrentUser(): Promise<User | null>
  getUser(id: string): Promise<User | null>
  getReviews(userId: string): Promise<Review[]>
  getChats(): Promise<Chat[]>
  getChat(id: string): Promise<Chat | null>
  startChat(listingId: string): Promise<Chat>                      // Tauschanfrage
  getMessages(chatId: string): Promise<Message[]>
  sendMessage(chatId: string, text: string): Promise<Message>
  subscribeToMessages(chatId, onMessage): () => void               // später Supabase Realtime
}
```

- Joins kommen als optionale Felder (`listing.owner`, `chat.other_user`, `chat.last_message`) – genau die Form, die Supabase mit `select('*, owner:users(*)')` liefert.
- Mock-Chat antwortet automatisch nach 1,5–3 s (Demo für Realtime).
- Demo-Daten zurücksetzen: in der Browser-Konsole `swapdReset()`.

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
- **Tonalität:** Alles auf Englisch, persönlich, kurz. Feature-Namen englisch. Belohnen statt belehren („+20 XP für dein erstes Foto“ als Beispiel).

## 6. Hosting

- **Noch nicht entschieden**, kommt später (spätestens ca. 1 Woche vor der Präsi).
- Beim Bauen nur beachten: App bleibt **rein statisch** (`npm run build` → `dist/`), **keine Server-Features**. Backend später = Supabase Cloud.

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
  screens/       # Feed, Map (Platzhalter), Listing, NewListing, Chats, Chat, Profile
  hooks/         # useAsync (Lade-/Fehlerzustand)
  lib/           # Formatierung, Distanz, Level/XP, Foto-Verkleinerung
```

- CD-Farben/Radien/Schriften stehen in `tailwind.config.js`. Die Tailwind-Standardfarben sind **bewusst entfernt** → nur CD-Farben nutzbar. Pop-Effekt = Klasse `pop`.
- Routing: React Router 6. Bottom-Nav: Feed · Map · (+) · Chats · Profile.
- **Node-Version:** Lars' Rechner hat Node 16 → deshalb Vite 4, Tailwind 3, `workbox-build` per `overrides` auf 7.0.0 gepinnt, shadcn-Komponenten von Hand statt CLI. Nach Update auf Node LTS (22/24) können Vite & Co. hochgezogen werden.

## 7. Tools & Plugins

- Lars hat in Claude installiert: **Supabase**, **Design**, **UI Design Review**, **frontend-design**.
- Bevorzugt mit **Claude Code** (Terminal / VS Code) im Ordner arbeiten.
- Lokal nötig: Node.js LTS, Git (+ GitHub für Team & Deploy).

## 8. Status / Log

- **2026-11-25:** Stack, Adapter-Architektur, Hosting entschieden. README angelegt. Nächster Schritt: Grundgerüst (Vite + React + TS + Tailwind, CD-Theme, Navigation, Screens Feed/Inserat/Profil, `src/data` mit Mock-Adapter + `test.json`).
- **2026-11-25:** Grundgerüst gebaut: Vite 4 + React 18 + TS + Tailwind 3 (CD-Theme), PWA (vite-plugin-pwa, Platzhalter-Icon „s'“), Mock-Adapter mit localStorage-Overlay. Screens: Feed (Offering/Looking for, Suche, Kategorien), Inserat-Detail mit „Request swap“ → Chat, Inserat einstellen (Foto + XP-Belohnung), Chats + Chat (Fake-Realtime), Profil (Level/XP, Listings, Reviews). Map-Tab = Platzhalter. Interface um `getUser`, `getReviews`, `getChat`, `startChat`, `subscribeToMessages` erweitert. Build + Typecheck grün.
  Nächste Schritte: Node auf LTS updaten · echte Logo-SVGs nach `public/` · Map-Lib entscheiden · Badges im Profil echt machen (aktuell Platzhalter) · Git-Repo anlegen.

## 9. Offene Fragen

- MapLibre vs. Leaflet
- Wer im Team arbeitet mit am Code / GitHub-Repo?
