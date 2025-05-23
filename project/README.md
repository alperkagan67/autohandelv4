# KFZ Abaci Trading Portal

## Überblick
Das KFZ Abaci Portal ist eine moderne Webanwendung für den Handel und die Verwaltung von Fahrzeugen. Sie bietet einen öffentlichen Bereich für Interessenten sowie einen geschützten Admin-Bereich für die Verwaltung des Fahrzeugbestands und der Kundenanfragen.

---

## Features
- **Fahrzeugübersicht & -suche** (Filter, Sortierung, Detailansicht)
- **Responsive Bildergalerie** (S3-Integration)
- **Dark/Light Mode** (umschaltbar, persistent)
- **Kontakt- & Anfrageformulare**
- **Admin-Login & geschützter Bereich**
- **Fahrzeugverwaltung (CRUD)**
- **Bildupload direkt nach S3**
- **Kundenanfragen-Management**
- **Automatische Exposé-Generierung (Anthropic/Claude, Fallback-Text)**
- **Cloud-Deployment: EC2, S3, RDS**

---

## Tech-Stack
- **Frontend:** React, Vite, Material-UI, Tailwind CSS
- **Backend:** Node.js, Express
- **Datenbank:** PostgreSQL (RDS)
- **Cloud:** AWS EC2 (Backend), S3 (Bilder), RDS (DB)
- **KI-Integration:** Anthropic Claude API (Exposé)

---

## Implementierungsplan (10 Tage)

1. **Tag 1:** Projektstruktur, Git, Grundsetup (Frontend/Backend)
2. **Tag 2:** Datenbankmodell, Backend-API (Fahrzeuge, User, Anfragen)
3. **Tag 3:** Frontend-Basis, Routing, erste Seiten
4. **Tag 4:** Fahrzeugliste & Detailansicht, Bildanzeige
5. **Tag 5:** Admin-Login, Protected Routes, Admin-Dashboard
6. **Tag 6:** CRUD für Fahrzeuge, Bildupload (lokal)
7. **Tag 7:** S3-Integration, Bild-URLs, Cloud-Deployment (Test)
8. **Tag 8:** Kundenanfragen, Anfrageverwaltung, E-Mail-Template (optional)
9. **Tag 9:** Exposé-Generierung (Claude-API, Fallback), Dark/Light-Mode
10. **Tag 10:** Testing, Bugfixes, Doku, finale Cloud-Migration

---

## Praxisbeispiel: Migration & Debugging in der Cloud

Im Rahmen der Entwicklung wurde das gesamte System erfolgreich von einer lokalen Umgebung in die AWS-Cloud migriert. Hier ein Überblick über die wichtigsten Schritte, Architekturentscheidungen und Lessons Learned:

- **Cloud-Infrastruktur:**
  - **EC2:** Das Backend läuft auf einer EC2-Instanz (Node.js/Express, pm2), Ports und Security Groups wurden korrekt konfiguriert.
  - **S3:** Alle Fahrzeugbilder werden direkt in einen S3-Bucket hochgeladen. Die Bucket-Policy erlaubt nur öffentliches Lesen im Bilder-Ordner. ACLs wurden entfernt, da sie vom Bucket nicht unterstützt werden.
  - **RDS:** Die relationale Datenbank läuft als AWS RDS-Instanz mit PostgreSQL. Ursprünglich wurde lokal MySQL verwendet, später erfolgte die Migration auf PostgreSQL für bessere Cloud-Kompatibilität und Skalierbarkeit.

- **Migration & Anpassungen:**
  - **.env-Management:** Alle Umgebungsvariablen (DB, S3, API-Keys) wurden zentral gepflegt und nie im Code hinterlegt.
  - **Frontend-API-URLs:** Die API-URL im Frontend wird dynamisch aus der Umgebungsvariable bezogen, sodass zwischen lokal und Cloud gewechselt werden kann.
  - **CORS:** Das Backend erlaubt CORS für die S3-Website-URL, damit Frontend und Backend sicher kommunizieren können.
  - **S3-Integration:** Der Bildupload wurde von lokaler Speicherung auf direkten S3-Upload umgestellt. Die Bild-URLs werden in der Datenbank gespeichert und im Frontend angezeigt.
  - **Fehlerbehebung:** Typische Fehlerquellen wie ACL-Probleme, falsche API-URLs, nicht gesetzte Pflichtfelder (z.B. fuel_type), oder fehlerhafte Features-Formate wurden systematisch gelöst.
  - **JWT-Authentifizierung:** Der Admin-Bereich ist durch ein sicheres Login mit JWT geschützt. Nach dem Login wird das Token für alle geschützten Backend-Requests verwendet.

- **KI-Integration & Exposé-Generierung:**
  - **Lokale KI (Ollama):** Zu Beginn wurde die Exposé-Generierung lokal mit Ollama getestet.
  - **Anthropic Claude API:** Für die Cloud wurde auf die Anthropic Claude API umgestellt, um hochwertige, KI-basierte Exposés zu generieren. Sollte die KI nicht erreichbar sein oder der API-Key ungültig sein, wird automatisch ein statischer Fallback-Text ausgeliefert.
  - **Zukunft:** Die Integration von AWS Bedrock ist bereits geplant, um noch flexibler zwischen verschiedenen KI-Anbietern wählen zu können.
  - **PDF-Export:** Das generierte Exposé kann als PDF exportiert und heruntergeladen werden. Die PDF-Ausgabe funktioniert zuverlässig und ist für den Endnutzer direkt verfügbar.

- **Debugging & Best Practices:**
  - **Backend-Logs:** Alle kritischen Aktionen und Fehler werden im Backend geloggt, um Fehlerquellen schnell zu identifizieren.
  - **Sicherheit:** Keine sensiblen Daten im Frontend, Admin-Endpunkte sind geschützt, S3-Bucket nur lesbar.
  - **Cloud-Standards:** Keine öffentlichen Schreibrechte, keine ACLs, alle Secrets in .env, Security Groups restriktiv.
  - **Fehlerbehandlung:** Alle Fehler (z.B. fehlende Felder, ungültige Tokens, S3-Fehler) werden sauber abgefangen und dem Nutzer verständlich angezeigt.

Dieses Praxisbeispiel zeigt, wie ein modernes Cloud-Projekt mit AWS-Komponenten (EC2, S3, RDS), JWT-Authentifizierung und flexibler KI-Integration (Ollama, Claude, Bedrock) erfolgreich umgesetzt und produktiv gemacht werden kann. Die Architektur ist so gestaltet, dass sie zukünftige Erweiterungen und Anbieterwechsel problemlos ermöglicht.

---

## Setup & Deployment

### 1. **Frontend**
```bash
cd frontend
npm install
npm run build
# Deployment nach S3:
aws s3 sync dist/ s3://<bucket-name> --delete
```

### 2. **Backend**
```bash
cd backend
npm install
# .env mit DB, S3, Anthropic-API-Key etc. anlegen
pm start # oder pm2 nutzen
```

### 3. **Datenbank (RDS)**
- PostgreSQL-Instanz in AWS RDS anlegen
- Tabellen laut Backend-Modell anlegen

### 4. **S3-Bucket**
- Bucket für Bilder anlegen (z.B. kfz-abaci-images)
- Policy: Nur Lesen für /bilder/* erlauben

### 5. **.env Beispiel (Backend)**
```
DB_HOST=...
DB_USER=...
DB_PASS=...
DB_NAME=...
S3_BUCKET=...
S3_REGION=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
ANTHROPIC_API_KEY=...
```

---

## Hinweise & Best Practices
- **Dark/Light-Mode:** Umschaltbar, Zustand wird im LocalStorage gespeichert
- **S3:** Keine ACLs setzen, nur öffentliche Leserechte für Bilder
- **Exposé:** Bei API-Fehlern wird immer ein statischer Fallback-Text geliefert
- **Sicherheit:** Keine sensiblen Daten im Frontend, Admin-Endpoints geschützt
- **Cloud:** Ports/Sicherheitsgruppen in AWS korrekt konfigurieren

---

## Zukunft & Erweiterungen
- E-Mail-Benachrichtigungen
- Erweiterte Statistiken
- Mobile App
- Mehrsprachigkeit

---

## Kontakt
Fragen & Feedback: info@kfz-abaci.de
