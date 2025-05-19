# KFZ Abaci Trading Portal

Ein modernes Fahrzeughandels-Portal mit Admin-Dashboard und Kundenbereich.

## 10-Tage Implementierungsplan

### Tag 3: Projektsetup & Grundstruktur
- [x] Projekt initialisieren mit Vite und React
- [x] Material-UI und notwendige Abhängigkeiten installieren
- [x] Grundlegende Projektstruktur erstellen
- [x] Routing-System implementieren
- [x] Basis-Layout mit Navigation erstellen

### Tag 4: Fahrzeugverwaltung (Admin)
- [x] Ordner Struktur verbesserung
- [x] Admin-Dashboard Grundstruktur
- [x] Fahrzeugverwaltungs-Interface
- [x] CRUD-Operationen für Fahrzeuge
- [x] Formular für Fahrzeugdetails
- [x] Bildupload-Funktionalität

### Tag 5: Fahrzeugliste & Detailansicht
- [x] Öffentliche Fahrzeugübersicht                   große probleme gehabt mit dem Importieren von funktionen, kein funktionstüchtiger code vorhanden. jedoch in die Branch Committet erstmal. Dennoch wurde das Problem vorhin gelöst, jedoch  zu spät geworden.
- [x] Filterung und Sortierung
- [x] Detailansicht für einzelne Fahrzeuge
- [x] Responsive Grid-Layout
- [x] Bildergalerie mit Vorschau

### Tag 6: Kundenanfragen
- [x] Anfrage-Formular für Fahrzeuge
- [x] Speichersystem für Anfragen
- [x] Admin-Interface für Anfragenverwaltung
- [x] Status-Management für Anfragen
- [] E-Mail-Benachrichtigungen AWS   Leiderkeine Zeit mehr.

### Tag 7: Benutzeroberfläche & Design
- [x] Einheitliches Designsystem
- [x] Responsive Navigation
- [x] Custom Theme-Konfiguration
- [x] Fehlermeldungen und Feedback

### Tag 8: Bildverwaltung & Optimierung
- [x] Bildupload-System
- [x] Bildkomprimierung
- [x] Lazy Loading für Bilder
- [x] Bildergalerie-Komponente
- [x] Fallback für fehlerhafte Bilder

### Tag 9: Admin-Dashboard Erweiterungen
- [x] Statistiken und Übersichten
- [x] Fortgeschrittene Filterfunktionen
- [ ] Bulk-Aktionen   Beim nächsten mal als erweiterung
- [x] Export-Funktionen


### Tag 10: Öffentlicher Bereich
- [x] Suchfunktion verbessern
- [x] Filter-System optimieren
- [x] Bug Fixxing Crud API operationen
- [x] Lösch funktion verbessert.
- [x] copy paste für Admin-Dashboard

### Tag 11: Datenverwaltung & Persistenz
- [x] LocalStorage Integration
- [x] Datenvalidierung
- [x] Error Handling
- [x] Datenmigration

### Tag 12: Testing & Optimierung
- [x] Unit Tests
- [x] Integration Tests
- [x] Performance-Optimierung
- [x] SEO-Optimierung
- [x] Dokumentation vervollständigen
- [x] DarkMode Addet!
- [x] Some Bug Fixing

#################################################

## Praxisbeispiel: Lokale Entwicklung und spätere Cloud-Migration

Im Rahmen der Entwicklung wurde das gesamte System zunächst vollständig lokal entwickelt und implementiert. Erst nach Abschluss der lokalen Entwicklungsphase erfolgte die Migration in die AWS-Cloud.

### Tag 1: Grundlegende Funktionalitäten
- [x] Benutzeroberfläche mit React und Material-UI erweitern
- [x] Buttons für Kernfunktionen hinzufügen
- [x] Formular-Validierung implementieren
- [x] Responsive Design verbessern

### Tag 2: Authentifizierung & Sicherheit
- [x] JWT-Authentifizierung für Admin-Bereich einrichten
- [x] Token-Validierung im Backend implementieren
- [x] Geschützte Routen definieren
- [x] Login-System testen und optimieren

### Tag 3: Datenbankoptimierung
- [x] Datenbankschema anpassen und erweitern
- [x] Neue Tabellen für erweiterte Funktionen anlegen
- [x] Beziehungen zwischen Tabellen optimieren
- [x] Datenmigrationsscripts erstellen

### Tag 4: Exposé-System Version 1
- [x] Grundlegende Exposé-Generierung implementieren
- [x] PDF-Export für Exposés einrichten
- [x] Layout und Design der PDFs gestalten
- [x] Bildintegration in PDFs umsetzen

### Tag 5: Lokale KI-Integration
- [x] Ollama für lokale Exposé-Generierung einrichten
- [x] Testumgebung für KI-Funktionen schaffen
- [x] Prompt-Engineering für Fahrzeugbeschreibungen
- [x] Fallback-Mechanismen implementieren

### Tag 6: Exposé-System Version 2
- [x] Anthropic Claude API lokal anbinden
- [x] Verbesserte Prompt-Templates entwickeln
- [x] Fehlerbehandlung für API-Ausfälle
- [x] A/B-Testing zwischen Ollama und Claude

### Tag 7: Bildverwaltung & Optimierung
- [x] Lokales Bildupload-System verbessern
- [x] Bildkomprimierung implementieren
- [x] Lazy Loading für Bilder einrichten
- [x] Bildergalerie-Komponente optimieren

### Tag 8: Fehlerbehandlung & Logging
- [x] Umfassendes Logging-System implementieren
- [x] Fehlerbehandlung für alle Komponenten
- [x] Benutzerfreundliche Fehlermeldungen
- [x] Debugging-Tools integrieren

### Tag 9: Performance-Optimierung
- [x] Frontend-Bundle optimieren
- [x] API-Caching einrichten
- [x] Datenbank-Abfragen verbessern
- [x] Ladezeiten reduzieren

### Tag 10: AWS-Konto & Grundkonfiguration
- [x] AWS-Konto einrichten
- [x] IAM-Benutzer mit eingeschränkten Rechten erstellen
- [x] Security-Best-Practices implementieren
- [x] AWS CLI konfigurieren

### Tag 11: EC2-Instanz Einrichtung
- [x] EC2-Instanz für Backend erstellen
- [x] Security Groups konfigurieren
- [x] SSH-Zugang einrichten
- [x] Node.js und PM2 installieren

### Tag 12: S3-Bucket & RDS-Datenbank
- [x] S3-Bucket für Fahrzeugbilder erstellen
- [x] RDS-Instanz mit PostgreSQL aufsetzen
- [x] Datenbank-Schema migrieren
- [x] Verbindungen testen und optimieren

### Tag 13: Cloud-Migration
- [x] Bildupload von lokaler Speicherung auf S3 umstellen
- [x] Datenbank von lokal auf RDS migrieren
- [x] API-Endpunkte anpassen
- [x] Umgebungsvariablen für Cloud-Umgebung konfigurieren

### Tag 14: Cloud KI-Integration
- [x] Anthropic Claude API in der Cloud anbinden
- [x] API-Key-Management einrichten
- [x] Skalierbarkeit der KI-Anfragen sicherstellen
- [x] Kostenoptimierung implementieren

### Tag 15: Zukunftssicherung & Dokumentation
- [x] AWS Bedrock-Integration vorbereiten
- [x] Architektur für zukünftige Erweiterungen dokumentieren
- [x] Deployment-Prozess automatisieren
- [x] Umfassende Dokumentation erstellen

Dieses Praxisbeispiel zeigt den typischen Entwicklungsprozess: Zunächst wurde die gesamte Anwendung lokal entwickelt und getestet, einschließlich der Integration lokaler KI-Lösungen (Ollama) und später Anthropic Claude für verbesserte Exposé-Generierung. Erst nach vollständiger lokaler Implementierung erfolgte die Migration in die AWS-Cloud mit entsprechenden Anpassungen für S3, RDS und Cloud-basierte KI-Dienste.
##########################################

## Projektstruktur

```
projekt/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   ├── shared/
│   │   │   └── public/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── App.jsx
│   └── package.json
└── backend/
    ├── index.js
    └── package.json
```




## Hauptfunktionen

### Öffentlicher Bereich
- Fahrzeugübersicht mit Filterfunktionen
- Detaillierte Fahrzeugansichten
- Anfrage-System
- Responsive Design

### Admin-Bereich
- Fahrzeugverwaltung (CRUD)
- Anfragenverwaltung
- Bilderverwaltung
- Statistiken und Übersichten

## Technologien

- React mit Vite
- Material-UI
- React Router
- LocalStorage für Datenpersistenz
- Express.js Backend
- Multer für Bildupload

## Installation

1. Repository klonen:
```bash
git clone [repository-url]
```

2. Abhängigkeiten installieren:
```bash
npm install
```

3. Entwicklungsserver starten:
```bash
node index.js
```

## Entwicklung

### Frontend starten:
```bash
cd frontend && npm run dev
```

### Backend starten:
```bash
cd backend && node index.js
```

## Deployment

1. Frontend build erstellen:
```bash
cd frontend && npm run build
```

2. Backend für Produktion vorbereiten:
```bash
cd backend && npm run build
```

## Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert.
