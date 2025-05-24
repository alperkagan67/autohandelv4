import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fetch from 'node-fetch';
import Anthropic from '@anthropic-ai/sdk';
import puppeteer from 'puppeteer';
import jwt from 'jsonwebtoken';
import { loginHandler } from './middlewares/auth.js';
import morgan from 'morgan';
import AWS from 'aws-sdk';

// Konfiguration
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Korrekte Pfad-Konfiguration
const projectRoot = path.resolve(__dirname, '..', '..');
const uploadDir = path.join(projectRoot, 'uploads', 'vehicles');

// CORS Konfiguration
const corsOptions = {
    origin: ['http://3.69.65.53'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 204
};

    

// Express und Middleware
const app = express();
app.use(morgan('dev'));
const port = process.env.PORT || 3001;

  


// JWT-Konfiguration
if (!process.env.JWT_SECRET) {
  console.error('WARNUNG: JWT_SECRET nicht konfiguriert. Bitte in .env-Datei einen sicheren Schlüssel festlegen.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'dein-super-geheimer-schluessel-fuer-jwt';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

app.use(cors(corsOptions));
app.use(express.json());

// Middleware zur Überprüfung des JWT
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({ error: 'Token ungültig oder abgelaufen' });
            }
            req.user = user;
            next();
        });
    } else {
        res.status(401).json({ error: 'Keine Authentifizierung' });
    }
};

// Wichtig: Statisches Verzeichnis korrekt einbinden
app.use('/uploads/vehicles', express.static(path.join(projectRoot, 'uploads', 'vehicles')));

// Upload-Verzeichnis erstellen
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('Created upload directory:', uploadDir);
}

// PostgreSQL Pool
const { Pool } = pkg;







// Check for missing DB configuration
if (!process.env.DB_PASSWORD || process.env.DB_PASSWORD === 'REPLACE_WITH_STRONG_PASSWORD') {
  console.error('WARNUNG: DB_PASSWORD nicht konfiguriert oder nicht geändert. Bitte in .env-Datei einen sicheren Wert festlegen.');
}

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'dbkfz',
  password: process.env.DB_PASSWORD || '12345678',
  port: process.env.DB_PORT || 5432,
  ssl: false

});

// Test-Endpunkt für DB-Verbindung
app.get('/api/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ success: true, time: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin Login Route
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    const adminUsername = process.env.ADMIN_USERNAME || 'root';
    const adminPassword = process.env.ADMIN_PASSWORD || '123456';

    // Debug-Logging
    console.log('ENV:', process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD);
    console.log('POST:', username, password);

    if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
        console.error('WARNUNG: Admin-Zugangsdaten nicht in Umgebungsvariablen konfiguriert. Verwende unsichere Standardwerte.');
    }

    if (username === adminUsername && password === adminPassword) {
        const token = jwt.sign(
            {
                username: username,
                role: 'admin'
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.status(200).json({
            token,
            user: {
                username,
                role: 'admin'
            }
        });
    } else {
        res.status(401).json({ error: 'Ungültige Zugangsdaten' });
    }
});

// Geschützte Admin-Route für Profil
app.get('/api/admin/profile', authenticateJWT, (req, res) => {
    res.json({ user: req.user });
});

// AWS S3 Konfiguration
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
const S3_BUCKET = process.env.S3_BUCKET_NAME;
const S3_FOLDER = process.env.S3_BUCKET_FOLDER || '';

// Multer Konfiguration (nur im RAM, nicht auf Platte)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// DELETE Fahrzeug
app.delete('/api/vehicles/:id', authenticateJWT, async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query('DELETE FROM vehicles WHERE id = $1 RETURNING *', [id]);
        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Fahrzeug nicht gefunden' });
        }
        await client.query('DELETE FROM vehicle_features WHERE vehicle_id = $1', [id]);
        await client.query('DELETE FROM vehicle_images WHERE vehicle_id = $1', [id]);
        await client.query('COMMIT');
        res.status(200).json({ message: 'Fahrzeug erfolgreich gelöscht' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Fehler beim Löschen des Fahrzeugs:', error);
        res.status(500).json({ error: 'Fehler beim Löschen des Fahrzeugs' });
    } finally {
        client.release();
    }
});

// Alle Fahrzeuge abrufen
app.get('/api/vehicles', async (req, res) => {
    console.log(req.body);
    try {
        const { rows } = await pool.query(`
            SELECT v.*, 
            string_agg(DISTINCT vf.feature, ',') as features,
            string_agg(DISTINCT vi.image_url, ',') as images
            FROM vehicles v
            LEFT JOIN vehicle_features vf ON v.id = vf.vehicle_id
            LEFT JOIN vehicle_images vi ON v.id = vi.vehicle_id
            GROUP BY v.id
            ORDER BY v.created_at DESC
        `);
        console.log(rows);
        const vehicles = rows.map(vehicle => ({
            ...vehicle,
            features: vehicle.features ? vehicle.features.split(',') : [],
            images: vehicle.images ? vehicle.images.split(',').map(url => {
                if (url.startsWith('http')) return url;
                // Get host from request or use a base URL from environment
                const baseUrl = req.headers.origin || process.env.API_BASE_URL || `http://localhost:${port}`;
                return `${baseUrl}${url}`;
            }) : []
        }));
        console.log(vehicles);
        res.json(vehicles);
    } catch (error) {
        console.error('Error fetching vehicles:', error);
        res.status(500).json({ error: error.message });
    }
});

////////////////////////////////////

// hier muss get request auf endpunkt /api/vehicles id angepasst werden in den frontend
/////////////////////


// Einzelnes Fahrzeug abruf
app.get('/api/vehicles/:id', async (req, res) => {
    console.log('wir sind grade hier:');
    try {
        const { rows } = await pool.query(`
            SELECT v.*, 
            string_agg(vf.feature, ',') as features,
            string_agg(vi.image_url, ',' ORDER BY vi.sort_order) as images
            FROM vehicles v
            LEFT JOIN vehicle_features vf ON v.id = vf.vehicle_id
            LEFT JOIN vehicle_images vi ON v.id = vi.vehicle_id
            WHERE v.id = $1
            GROUP BY v.id
        `, [req.params.id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        
        console.log('Rohes Datenbankresultat:', rows[0]);
        
        const vehicle = {
            ...rows[0],
            features: rows[0].features ? rows[0].features.split(',').filter(f => f && f.trim()) : [],
            images: rows[0].images 
                ? rows[0].images.split(',').filter(url => url && url.trim()).map(url => {
                    const trimmedUrl = url.trim();
                    if (trimmedUrl.startsWith('http')) {
                        return trimmedUrl;
                    }
                    // Get host from request or use a base URL from environment
                    const baseUrl = req.headers.origin || process.env.API_BASE_URL || `http://localhost:${port}`;
                    return `${baseUrl}${trimmedUrl}`;
                })
                : []
        };
        
        console.log('Verarbeitete Bilder:', JSON.stringify(vehicle.images));
        
        res.json(vehicle);
    } catch (error) {
        console.error('Error fetching vehicle:', error);
        res.status(500).json({ error: error.message });
    }
});

// Fahrzeug erstellen mit Bildupload
app.post('/api/vehicles', authenticateJWT, upload.array('images', 10), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Detailliertes Logging der empfangenen Daten
        console.log('=== Bildupload Start ===');
        console.log('Request Body:', req.body);
        console.log('Request Files:', req.files ? {
            count: req.files.length,
            files: req.files.map(f => ({
                fieldname: f.fieldname,
                originalname: f.originalname,
                filename: f.filename,
                mimetype: f.mimetype,
                size: f.size
            }))
        } : 'Keine Dateien');

        // Felder auslesen und korrekt parsen
        const { brand, model, year, price, mileage, transmission, power, description, status } = req.body;
        const fuel_type = req.body.fuel_type || req.body.fuelType || 'Benzin';
        // Features robust parsen (Array oder String)
        let features = [];
        if (Array.isArray(req.body.features)) {
            features = req.body.features;
        } else if (typeof req.body.features === 'string' && req.body.features.trim() !== '') {
            try {
                features = JSON.parse(req.body.features);
            } catch (e) {
                // Falls kein JSON, dann als Komma-getrennte Liste behandeln
                features = req.body.features.split(',').map(f => f.trim()).filter(Boolean);
            }
        }

        // Fahrzeug einfügen
        const vehicleResult = await client.query(
            'INSERT INTO vehicles (brand, model, year, price, mileage, fuel_type, transmission, power, description, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id',
            [
                brand,
                model,
                year ? parseInt(year) : null,
                price ? parseFloat(price) : null,
                mileage ? parseInt(mileage) : null,
                fuel_type,
                transmission,
                power,
                description,
                status || 'available'
            ]
        );
        const vehicleId = vehicleResult.rows[0].id;
        console.log('Fahrzeug erstellt mit ID:', vehicleId);

        // Features einfügen
        if (features.length > 0) {
            for (const feature of features) {
                await client.query(
                    'INSERT INTO vehicle_features (vehicle_id, feature) VALUES ($1, $2)',
                    [vehicleId, feature]
                );
            }
        }

        // Bilder speichern
        const savedImages = [];
        if (req.files && req.files.length > 0) {
            console.log(`Speichere ${req.files.length} Bilder in der Datenbank...`);
            for (const [index, file] of req.files.entries()) {
                try {
                    // S3-Key bauen
                    const fileExt = file.originalname.split('.').pop();
                    const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExt}`;
                    const s3Key = `${S3_FOLDER ? S3_FOLDER + '/' : ''}${fileName}`;
                    // Upload zu S3
                    await s3.putObject({
                        Bucket: S3_BUCKET,
                        Key: s3Key,
                        Body: file.buffer,
                        ContentType: file.mimetype
                    }).promise();
                    // S3-URL bauen
                    const imageUrl = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
                    savedImages.push(imageUrl);
                    // In DB speichern
                    await client.query(
                        'INSERT INTO vehicle_images (vehicle_id, image_url, sort_order) VALUES ($1, $2, $3)',
                        [vehicleId, imageUrl, index]
                    );
                    console.log(`Bild ${index+1} erfolgreich in DB gespeichert:`, imageUrl);
                } catch (error) {
                    console.error(`Fehler beim Speichern von Bild ${index+1}:`, error);
                    throw error;
                }
            }
        }

        await client.query('COMMIT');
        console.log('=== Bildupload erfolgreich abgeschlossen ===');
        // Rückgabe: S3-URLs direkt
        res.status(201).json({
            message: 'Vehicle created successfully',
            id: vehicleId,
            images: savedImages,
            imageCount: savedImages.length
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Fehler beim Bildupload:', error);
        res.status(500).json({ 
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    } finally {
        client.release();
    }
});

// Fahrzeug aktualisieren
app.put('/api/vehicles/:id', authenticateJWT, upload.array('images', 10), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const vehicleId = req.params.id;
        const { brand, model, year, price, mileage, transmission, power, description, status } = req.body;
        const fuel_type = req.body.fuel_type || req.body.fuelType;
        let features = [];
        if (Array.isArray(req.body.features)) {
            features = req.body.features;
        } else if (typeof req.body.features === 'string' && req.body.features.trim() !== '') {
            try {
                features = JSON.parse(req.body.features);
            } catch (e) {
                features = req.body.features.split(',').map(f => f.trim()).filter(Boolean);
            }
        }
        // Pflichtfeld-Validierung
        if (!brand || !model || !year || !price || !mileage) {
            throw new Error('Pflichtfelder fehlen!');
        }
        await client.query(
            `UPDATE vehicles 
             SET brand = $1, model = $2, year = $3, price = $4, mileage = $5, 
                 fuel_type = $6, transmission = $7, power = $8, description = $9, 
                 status = $10
             WHERE id = $11`,
            [
                brand,
                model,
                year ? parseInt(year) : null,
                price ? parseFloat(price) : null,
                mileage ? parseInt(mileage) : null,
                fuel_type,
                transmission,
                power,
                description,
                status || 'available',
                vehicleId
            ]
        );
        await client.query('DELETE FROM vehicle_features WHERE vehicle_id = $1', [vehicleId]);
        if (features.length > 0) {
            for (const feature of features) {
                await client.query(
                    'INSERT INTO vehicle_features (vehicle_id, feature) VALUES ($1, $2)',
                    [vehicleId, feature]
                );
            }
        }
        // Neue Bilder zu S3 hochladen
        const savedImages = [];
        if (req.files && req.files.length > 0) {
            for (const [index, file] of req.files.entries()) {
                try {
                    const fileExt = file.originalname.split('.').pop();
                    const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExt}`;
                    const s3Key = `${S3_FOLDER ? S3_FOLDER + '/' : ''}${fileName}`;
                    await s3.putObject({
                        Bucket: S3_BUCKET,
                        Key: s3Key,
                        Body: file.buffer,
                        ContentType: file.mimetype
                    }).promise();
                    const imageUrl = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
                    savedImages.push(imageUrl);
                    await client.query(
                        'INSERT INTO vehicle_images (vehicle_id, image_url, sort_order) VALUES ($1, $2, $3)',
                        [vehicleId, imageUrl, index]
                    );
                } catch (error) {
                    console.error(`Fehler beim S3-Upload (PUT):`, error);
                    throw error;
                }
            }
        }
        await client.query('COMMIT');
        // TODO: Fahrzeugliste im Frontend nachladen
        res.json({
            message: 'Vehicle updated successfully',
            images: savedImages
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating vehicle:', error);
        res.status(500).json({
            error: 'Failed to update vehicle',
            details: error.message
        });
    } finally {
        client.release();
    }
});

// Kundenformular speichern
app.post('/api/customer-forms', upload.array('images', 10), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Pflichtfeld-Validierung
        const requiredFields = [
            'customer_name', 'email', 'phone',
            'vehicle_brand', 'vehicle_model', 'vehicle_year',
            'vehicle_mileage', 'vehicle_price'
        ];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
        // Insert form
        const result = await client.query(`
            INSERT INTO customer_forms (
                customer_name, 
                email, 
                phone, 
                vehicle_brand, 
                vehicle_model, 
                vehicle_year, 
                vehicle_mileage, 
                vehicle_price, 
                vehicle_fuel_type, 
                vehicle_transmission, 
                vehicle_power, 
                vehicle_description, 
                status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id
            `,
            [
                req.body.customer_name,
                req.body.email,
                req.body.phone,
                req.body.vehicle_brand,
                req.body.vehicle_model,
                req.body.vehicle_year,
                req.body.vehicle_mileage,
                req.body.vehicle_price,
                req.body.vehicle_fuel_type || null,
                req.body.vehicle_transmission || null,
                req.body.vehicle_power || null,
                req.body.vehicle_description || null,
                'neu'
            ]
        );
        const formId = result.rows[0].id;
        // S3-Upload für Bilder
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                try {
                    const fileExt = file.originalname.split('.').pop();
                    const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExt}`;
                    const s3Key = `${S3_FOLDER ? S3_FOLDER + '/' : ''}${fileName}`;
                    await s3.putObject({
                        Bucket: S3_BUCKET,
                        Key: s3Key,
                        Body: file.buffer,
                        ContentType: file.mimetype
                    }).promise();
                    const imageUrl = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
                    await client.query(
                        'INSERT INTO customer_form_images (form_id, image_url) VALUES ($1, $2)',
                        [formId, imageUrl]
                    );
                } catch (error) {
                    console.error('Fehler beim S3-Upload (Kundenformular):', error);
                    throw error;
                }
            }
        }
        await client.query('COMMIT');
        res.status(201).json({
            success: true,
            message: 'Formular erfolgreich gespeichert',
            formId: formId
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in /api/customer-forms:', error);
        res.status(500).json({
            error: 'Server Error',
            message: error.message
        });
    } finally {
        client.release();
    }
});

// GET-Endpoint zum Abrufen aller Kundenformulare
app.get('/api/customer-forms', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT cf.*, string_agg(cfi.image_url, ',') as images
            FROM customer_forms cf
            LEFT JOIN customer_form_images cfi ON cf.id = cfi.form_id
            GROUP BY cf.id
            ORDER BY cf.created_at DESC
        `);
        const forms = rows.map(form => ({
            ...form,
            images: form.images ? 
                form.images.split(',').map(url => url.trim()) : 
                []
        }));
        res.json(forms);
    } catch (error) {
        console.error('Error fetching customer forms:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET-Endpoint zum Abrufen eines einzelnen Kundenformulars
app.get('/api/customer-forms/:id', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT cf.*, string_agg(cfi.image_url, ',') as images
            FROM customer_forms cf
            LEFT JOIN customer_form_images cfi ON cf.id = cfi.form_id
            WHERE cf.id = $1
            GROUP BY cf.id
        `, [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Form not found' });
        }
        const form = {
            ...rows[0],
            images: rows[0].images ? 
                rows[0].images.split(',').map(url => url.trim()) : 
                []
        };
        res.json(form);
    } catch (error) {
        console.error('Error fetching customer form:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT-Endpoint zum Aktualisieren des Formularstatus
app.put('/api/customer-forms/:id/status', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { status } = req.body;
        const formId = req.params.id;
        await client.query(
            'UPDATE customer_forms SET status = $1 WHERE id = $2',
            [status, formId]
        );
        await client.query('COMMIT');
        res.json({ message: 'Status updated successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating form status:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Anthropic Konfiguration
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

async function generateExposeWithAnthropic(vehicleData, features) {
    try {
        const prompt = `Du bist ein kreativer, künstlerischer Texter und Autoverkäufer. Erstelle ein außergewöhnliches, emotionales und künstlerisch hochwertiges Fahrzeug-Exposé für einen ${vehicleData.brand} ${vehicleData.model} aus dem Jahr ${vehicleData.year}, das sich an den besten Immobilienexposés orientiert.

        WICHTIG: Das Exposé soll künstlerisch und exklusiv wirken – wie ein hochwertiges Immobilienexposé. Die Struktur soll abwechselnd BILD / TEXT / BILD / TEXT sein. Gehe davon aus, dass zu jedem Bild ein passender Textabschnitt gehört, der das Bild beschreibt und die Emotionen verstärkt.

        Das Logo des Unternehmens (KFZ Abaci) soll als zentrales, wiederkehrendes Element im Exposé erwähnt und in die Geschichte eingebunden werden.

        TECHNISCHE DETAILS:
        - Kilometerstand: ${vehicleData.mileage} km
        - Preis: ${vehicleData.price} €
        - Farbe: ${vehicleData.color}
        - Kraftstoff: ${vehicleData.fuel_type}
        - Leistung: ${vehicleData.power} PS
        - Getriebe: ${vehicleData.transmission}
        - Ausstattung: ${features.join(', ')}

        STRUKTUR:
        1. Logo und Überschrift (KFZ Abaci prominent)
        2. Bild 1: Außenansicht – dazu ein künstlerischer, emotionaler Text
        3. Bild 2: Rückansicht oder Seitenansicht – dazu ein Text über Design und Eleganz
        4. Bild 3: Innenraum – dazu ein Text über Komfort und Atmosphäre
        5. Bild 4: Details oder Motorraum – dazu ein Text über Technik und Besonderheiten
        6. Bild 5: Besonderes Ausstattungsmerkmal – dazu ein Text über Exklusivität
        7. Abschluss: Zusammenfassung, Call-to-Action, Logo erneut erwähnen

        STIL:
        - Künstlerisch, emotional, exklusiv, wie ein Immobilienexposé
        - Bildhafte Sprache, Metaphern, Storytelling
        - Positive, begeisternde Adjektive
        - Gefühl von Luxus, Einzigartigkeit und Wert
        - Markdown-Formatierung (Bilder als ![Bildbeschreibung](Bildlink), Überschriften mit #, ##)

        !!!!!!DAS EXPOSÉ SOLL VOM KÜNSTERISCHEN HER EINEM EXPOSE EINER IMMOBILIE ÄHNLICH SEIN!!!!
        !!!!!!STRUKTUR: BILD / TEXT / BILD / TEXT / ... UND LOGO VOM UNTERNEHMEN!!!!
        
        Erstelle einen Text, der diese Vorgaben optimal umsetzt und die visuellen Eindrücke verstärkt.`;

        // Debug-Logging
        const key = process.env.ANTHROPIC_API_KEY || '';
        console.log('--- Anthropic API Call ---');
        console.log('API-Key:', key ? key.slice(0, 4) + '...' + key.slice(-4) : 'NICHT GESETZT');
        console.log('Modell:', "claude-3-sonnet-20240229");
        console.log('Prompt:', prompt.slice(0, 300) + '...');

        const response = await anthropic.messages.create({
            model: "claude-3-sonnet-20240229",
            max_tokens: 1800,
            messages: [{
                role: "user",
                content: prompt
            }]
        });

        return response.content[0].text;
    } catch (error) {
        console.error('Fehler bei der Generierung des Exposés:', error);
        if (error.response) {
          console.error('Anthropic-Response:', error.response.data);
        }
        throw error;
    }
}

// Hilfsfunktion: Fahrzeugbeschreibung mit Claude verbessern
async function improveVehicleDescription(description, vehicle) {
  if (!description || !description.trim()) return '';
  try {
    const prompt = `Verbessere die folgende Fahrzeugbeschreibung für ein hochwertiges Premium-Exposé. Schreibe stilistisch ansprechend, klar, emotional und mit Fokus auf Qualität, Exklusivität und Fahrgefühl. Vermeide Wiederholungen, baue aber die wichtigsten Informationen ein. Die Beschreibung soll maximal 120 Wörter lang sein und für anspruchsvolle Kunden attraktiv wirken.\n\nFahrzeug: ${vehicle.brand} ${vehicle.model} (${vehicle.year})\n\nOriginaltext:\n${description}`;
    const response = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }]
    });
    return response.content[0].text.trim();
  } catch (e) {
    console.error('Fehler bei der Verbesserung der Fahrzeugbeschreibung:', e);
    return description;
  }
}

// Neues Logo für das Exposé verwenden
const defaultLogo = 'http://localhost:3001/uploads/pdflogo.png'; // Lokaler Pfad zum neuen PDF-Logo

// Hilfsfunktion: HTML-Exposé-Template
function generateExposeHtml({ vehicle, features, exposeText, imageUrls, logoUrl, improvedDescription }) {
  const logo = logoUrl || defaultLogo;
  // Premium-Design und Struktur
  return `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${vehicle.brand} ${vehicle.model} (${vehicle.year}) - Exklusives Angebot</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=Montserrat:wght@300;400;500;600&display=swap');
        :root {
            --primary-color: #1a365d;
            --secondary-color: #c9a55c;
            --light-gray: #f8f9fa;
            --dark-gray: #343a40;
        }
        body {
            font-family: 'Montserrat', sans-serif;
            margin: 0;
            padding: 0;
            color: #333;
            line-height: 1.7;
            background-color: white;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0;
        }
        .header {
            position: relative;
            background-color: var(--primary-color);
            color: white;
            overflow: hidden;
            padding: 4rem 2rem;
            text-align: center;
            background-image: url('${imageUrls[0] || ''}');
            background-size: cover;
            background-position: center;
        }
        .header::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 100%);
            z-index: 1;
        }
        .header-content {
            position: relative;
            z-index: 2;
        }
        .logo {
            max-width: 220px;
            height: auto;
            margin-bottom: 1.5rem;
        }
        h1 {
            font-family: 'Playfair Display', serif;
            font-size: 3em;
            font-weight: 700;
            margin: 0;
            letter-spacing: -0.5px;
            color: white;
        }
        .tagline {
            font-size: 1.4em;
            font-weight: 300;
            margin-top: 0.5rem;
            color: rgba(255,255,255,0.9);
        }
        .intro-section {
            padding: 3rem 2rem;
            text-align: center;
            background-color: white;
        }
        .intro-text {
            max-width: 800px;
            margin: 0 auto;
            font-size: 1.2em;
            line-height: 1.8;
        }
        .specs {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 1.5rem;
            padding: 2.5rem;
            background-color: var(--light-gray);
            border-radius: 8px;
            margin: 2rem 0;
        }
        .spec-item {
            text-align: center;
            padding: 1rem;
            background-color: white;
            border-radius: 6px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            transition: transform 0.3s, box-shadow 0.3s;
        }
        .spec-item:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .spec-label {
            font-weight: 600;
            color: var(--primary-color);
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 0.5rem;
        }
        .spec-value {
            font-size: 1.2em;
            font-weight: 500;
        }
        .section {
            margin: 4rem 0;
            padding: 0 2rem;
        }
        h2 {
            font-family: 'Playfair Display', serif;
            font-size: 2.2em;
            color: var(--primary-color);
            text-align: center;
            margin-bottom: 2rem;
            position: relative;
            padding-bottom: 1rem;
        }
        h2::after {
            content: "";
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 80px;
            height: 3px;
            background-color: var(--secondary-color);
        }
        .row {
            display: flex;
            margin: 2.5rem 0;
            align-items: center;
            gap: 3rem;
        }
        .row-reverse {
            flex-direction: row-reverse;
        }
        .column {
            flex: 1;
        }
        .image-container {
            flex: 1;
            box-shadow: 0 5px 20px rgba(0,0,0,0.15);
            border-radius: 8px;
            overflow: hidden;
            position: relative;
        }
        .image-container::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            box-shadow: inset 0 0 20px rgba(0,0,0,0.1);
            pointer-events: none;
        }
        .image-container img {
            width: 100%;
            height: auto;
            vertical-align: middle;
            transition: transform 0.5s;
        }
        .image-container:hover img {
            transform: scale(1.03);
        }
        .expose-text {
            font-size: 1.1em;
            line-height: 1.8;
        }
        .expose-text p {
            margin-bottom: 1.2rem;
        }
        .features {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 0.8rem;
            margin: 2rem 0;
        }
        .features span {
            display: inline-block;
            background-color: var(--light-gray);
            color: var(--primary-color);
            border: 1px solid rgba(0,0,0,0.1);
            border-radius: 30px;
            padding: 0.5rem 1.2rem;
            font-size: 0.95em;
            transition: all 0.3s;
        }
        .features span:hover {
            background-color: var(--primary-color);
            color: white;
        }
        .gallery {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-top: 2rem;
        }
        .gallery-image {
            width: 100%;
            height: 220px;
            object-fit: cover;
            border-radius: 8px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.1);
            transition: transform 0.3s, box-shadow 0.3s;
        }
        .gallery-image:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        }
        .cta-section {
            text-align: center;
            padding: 5rem 2rem;
            background: linear-gradient(to right, var(--primary-color), #2c5282);
            color: white;
            margin-top: 4rem;
        }
        .cta-title {
            font-family: 'Playfair Display', serif;
            font-size: 2.4em;
            margin-bottom: 1.5rem;
            color: white;
        }
        .cta-text {
            max-width: 800px;
            margin: 0 auto 2rem;
            font-size: 1.2em;
            opacity: 0.9;
        }
        .download-btn {
            display: inline-block;
            background-color: var(--secondary-color);
            color: var(--dark-gray);
            padding: 1rem 2.5rem;
            font-size: 1.1em;
            font-weight: 600;
            border-radius: 50px;
            text-decoration: none;
            transition: all 0.3s;
            border: 2px solid transparent;
        }
        .download-btn:hover {
            background-color: transparent;
            color: white;
            border-color: white;
        }
        .footer {
            text-align: center;
            padding: 3rem 2rem;
            background-color: var(--light-gray);
            color: var(--dark-gray);
            font-size: 0.9em;
        }
        .footer img {
            max-width: 150px;
            margin-bottom: 1.5rem;
        }
        @media (max-width: 768px) {
            .row, .row-reverse {
                flex-direction: column;
                gap: 2rem;
            }
            .header {
                padding: 3rem 1rem;
            }
            h1 {
                font-size: 2.2em;
            }
            .specs {
                grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                padding: 1.5rem;
            }
            .section {
                padding: 0 1rem;
                margin: 3rem 0;
            }
            .gallery {
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header mit Logo und Titel -->
        <div class="header">
            <div class="header-content">
                <img src="${logo}" alt="KFZ Abaci Logo" class="logo">
                <h1>${vehicle.brand} ${vehicle.model} (${vehicle.year})</h1>
                <p class="tagline">Ihr Schlüssel zu Eleganz und Dynamik</p>
            </div>
        </div>
        <!-- Einleitungstext -->
        <div class="intro-section">
            <div class="intro-text">
                <p>Wir präsentieren Ihnen stolz diesen exquisiten ${vehicle.brand} ${vehicle.model} aus dem Jahr ${vehicle.year} - ein Fahrzeug, das Performance und Stil perfekt vereint. Dieser hervorragend gepflegte Wagen verbindet kraftvolle Dynamik mit zeitloser Eleganz und bietet Ihnen ein Fahrerlebnis der Extraklasse.</p>
            </div>
        </div>
        <!-- Technische Daten -->
        <div class="section">
            <h2>Fahrzeugdetails</h2>
            <div class="specs">
                <div class="spec-item">
                    <div class="spec-label">Marke</div>
                    <div class="spec-value">${vehicle.brand}</div>
                </div>
                <div class="spec-item">
                    <div class="spec-label">Modell</div>
                    <div class="spec-value">${vehicle.model}</div>
                </div>
                <div class="spec-item">
                    <div class="spec-label">Baujahr</div>
                    <div class="spec-value">${vehicle.year}</div>
                </div>
                <div class="spec-item">
                    <div class="spec-label">Kilometerstand</div>
                    <div class="spec-value">${Number(vehicle.mileage).toLocaleString('de-DE')} km</div>
                </div>
                <div class="spec-item">
                    <div class="spec-label">Preis</div>
                    <div class="spec-value">${Number(vehicle.price).toLocaleString('de-DE')} €</div>
                </div>
                <div class="spec-item">
                    <div class="spec-label">Kraftstoff</div>
                    <div class="spec-value">${vehicle.fuel_type}</div>
                </div>
                <div class="spec-item">
                    <div class="spec-label">Getriebe</div>
                    <div class="spec-value">${vehicle.transmission}</div>
                </div>
                <div class="spec-item">
                    <div class="spec-label">Leistung</div>
                    <div class="spec-value">${vehicle.power}</div>
                </div>
            </div>
        </div>
        <!-- Originale Fahrzeugbeschreibung -->
        ${improvedDescription && improvedDescription.trim() ? `
        <div class="section" style="background: #f8f9fa; border-radius: 10px; margin: 2rem 0; padding: 2.5rem 2rem 2rem 2rem; box-shadow: 0 2px 10px rgba(0,0,0,0.04);">
            <h2 style="font-size:2em; font-family:'Playfair Display',serif; color:#1a365d; text-align:center; margin-bottom:1.5rem;">Originale Fahrzeugbeschreibung</h2>
            <blockquote style="font-style:italic; color:#444; border-left:4px solid #c9a55c; margin:0 auto; max-width:800px; background:rgba(255,255,255,0.7); padding:1.2em 2em;">
                <span style="font-size:1.15em;">"${improvedDescription.replace(/([\r\n]+)/g, '<br>')}"</span>
            </blockquote>
        </div>
        ` : ''}
        <!-- Haupttext mit Bildern -->
        ${generateContentSections(exposeText, imageUrls)}
        <!-- Ausstattungsmerkmale -->
        <div class="section">
            <h2>Ausstattungsmerkmale</h2>
            <div class="features">
                ${features && features.length > 0 
                    ? features.map(feature => `<span>${feature}</span>`).join('\n') 
                    : '<p>Keine spezifischen Ausstattungsmerkmale angegeben</p>'}
            </div>
        </div>
        <!-- Weitere Bilder als Galerie -->
        ${generateGallerySection(imageUrls)}
        <!-- Call to Action -->
        <div class="cta-section">
            <h2 class="cta-title">Erleben Sie dieses Fahrzeug persönlich</h2>
            <p class="cta-text">Kontaktieren Sie uns noch heute für eine Probefahrt und überzeugen Sie sich selbst von diesem außergewöhnlichen ${vehicle.brand} ${vehicle.model}.</p>
            <a href="tel:+4915123456789" class="download-btn">Jetzt Kontakt aufnehmen</a>
        </div>
        <!-- Footer -->
        <div class="footer">
            <img src="${logo}" alt="KFZ Abaci Logo">
            <p>© ${new Date().getFullYear()} KFZ Abaci | Fahrzeug-ID: ${vehicle.id} | Erstellt am: ${new Date().toLocaleDateString('de-DE')}</p>
            <p>Tel: +49 151 23456789 | E-Mail: info@kfz-abaci.de | Adresse: Musterstraße 123, 45678 Gelsenkirchen</p>
        </div>
    </div>
</body>
</html>`;
}

// Hilfsfunktion zum Generieren von Inhaltsabschnitten
function generateContentSections(exposeText, imageUrls) {
  // Teile den Text in Abschnitte auf Basis der Überschriften
  const sections = [];
  const regex = /<h2>(.*?)<\/h2>/g;
  let match;
  let lastIndex = 0;
  while ((match = regex.exec(exposeText)) !== null) {
    const sectionTitle = match[1];
    const startIndex = match.index;
    if (lastIndex > 0) {
      const sectionContent = exposeText.substring(lastIndex, startIndex);
      sections.push({ title: sections[sections.length - 1].title, content: sectionContent });
    }
    sections.push({ title: sectionTitle, content: '' });
    lastIndex = startIndex + match[0].length;
  }
  // Füge den letzten Abschnitt hinzu
  if (lastIndex > 0 && lastIndex < exposeText.length) {
    const sectionContent = exposeText.substring(lastIndex);
    sections.push({ title: sections[sections.length - 1].title, content: sectionContent });
    sections.shift(); // Entferne den ersten leeren Abschnitt
  }
  // Wenn keine Abschnitte gefunden wurden, erstelle Standard-Abschnitte
  if (sections.length === 0) {
    sections.push(
      { title: "Außendesign", content: "<p>Dieses Fahrzeug besticht durch sein elegantes Außendesign mit fließenden Linien und kraftvoller Präsenz auf der Straße. Die Proportionen sind perfekt ausbalanciert und verleihen dem Wagen eine sportliche, aber zugleich elegante Erscheinung.</p>" },
      { title: "Innenraum & Komfort", content: "<p>Im Innenraum erwartet Sie hochwertige Verarbeitung und durchdachte Ergonomie. Die Materialauswahl und Verarbeitung entsprechen höchsten Qualitätsstandards. Jedes Detail wurde sorgfältig gestaltet, um maximalen Komfort und Funktionalität zu gewährleisten.</p>" },
      { title: "Fahrdynamik & Motor", content: "<p>Das Herzstück dieses Fahrzeugs ist der leistungsstarke und effiziente Motor, der beeindruckende Fahrleistungen bietet. Die ausgewogene Fahrwerksabstimmung sorgt für ein sportliches Fahrgefühl bei gleichzeitig hohem Komfort.</p>" },
      { title: "Technologie & Innovation", content: "<p>Ausgestattet mit modernster Technologie bietet dieses Fahrzeug innovative Funktionen für Sicherheit, Unterhaltung und Konnektivität. Die intuitive Bedienung macht jede Fahrt zum Vergnügen.</p>" }
    );
  }
  // Generiere HTML für jeden Abschnitt
  return sections.map((section, index) => {
    const isEven = index % 2 === 0;
    const imageIndex = Math.min(index + 1, imageUrls.length - 1); // Erstes Bild ist bereits im Header
    const hasImage = imageIndex >= 0 && imageIndex < imageUrls.length;
    return `
    <div class="section">
        <h2>${section.title}</h2>
        <div class="row ${isEven ? '' : 'row-reverse'}">
            <div class="column expose-text">
                ${section.content}
            </div>
            ${hasImage ? `<div class="image-container">
                <img src="${imageUrls[imageIndex]}" alt="${section.title}" />
            </div>` : ''}
        </div>
    </div>`;
  }).join('');
}

// Hilfsfunktion zum Generieren der Bildergalerie
function generateGallerySection(imageUrls) {
  // Skip the images already used in content sections (first image + number of content sections)
  const usedImageCount = Math.min(5, imageUrls.length);
  const remainingImages = imageUrls.slice(usedImageCount);
  if (remainingImages.length === 0) return '';
  return `
  <div class="section">
      <h2>Bildergalerie</h2>
      <div class="gallery">
          ${remainingImages.map(img => 
              `<img src="${img}" alt="Fahrzeugdetail" class="gallery-image">`
          ).join('\n')}
      </div>
  </div>`;
}

// Neue Route: Exposé als HTML-Onepager und PDF-Download
app.get('/api/vehicles/:id/expose', async (req, res) => {
  try {
    const { id } = req.params;
    // Fahrzeugdaten aus der Datenbank holen
    const { rows } = await pool.query(`
      SELECT v.*, 
        string_agg(vf.feature, ',') as features,
        string_agg(vi.image_url, ',' ORDER BY vi.sort_order) as images
      FROM vehicles v
      LEFT JOIN vehicle_features vf ON v.id = vf.vehicle_id
      LEFT JOIN vehicle_images vi ON v.id = vi.vehicle_id
      WHERE v.id = $1
      GROUP BY v.id
    `, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Fahrzeug nicht gefunden' });
    }
    const vehicle = rows[0];
    const features = (typeof vehicle.features === 'string' && vehicle.features)
      ? vehicle.features.split(',').filter(f => f && f.trim())
      : [];
    const imageUrls = (typeof vehicle.images === 'string' && vehicle.images)
      ? vehicle.images.split(',').filter(f => f && f.trim()).map(url => url.trim())
      : [];
    const logoUrl = 'https://kfz-abaci.de/wp-content/uploads/2023/11/Logo-KFZ-Abaci.png';
    // Exposé-Text generieren
    let exposeText = '';
    try {
      exposeText = await generateExposeWithAnthropic(vehicle, features || []);
    } catch (error) {
      console.error('Anthropic-Fehler, nutze statischen Fallback-Text:', error);
      exposeText = `# Exposé für ${vehicle.brand} ${vehicle.model} (${vehicle.year})\n\nDieses Fahrzeug überzeugt durch seine Ausstattung, seinen Zustand und seine Einzigartigkeit.\n\n- Marke: ${vehicle.brand}\n- Modell: ${vehicle.model}\n- Baujahr: ${vehicle.year}\n- Kilometerstand: ${vehicle.mileage} km\n- Preis: ${vehicle.price} €\n- Kraftstoff: ${vehicle.fuel_type}\n- Getriebe: ${vehicle.transmission}\n- Leistung: ${vehicle.power}\n\nKontaktieren Sie uns für weitere Informationen!`;
    }
    // Fahrzeugbeschreibung verbessern (falls vorhanden)
    let improvedDescription = '';
    if (vehicle.description && vehicle.description.trim()) {
      improvedDescription = await improveVehicleDescription(vehicle.description, vehicle);
    }
    // HTML-Onepager erzeugen
    const html = generateExposeHtml({ vehicle, features, exposeText, imageUrls, logoUrl, improvedDescription });
    // Wenn ?html=1, dann HTML direkt anzeigen
    if (req.query.html === '1') {
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    }
    // Sonst: PDF aus HTML generieren
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="fahrzeug_expose_${vehicle.brand}_${vehicle.model}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Fehler beim Erstellen des Exposé-PDFs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Minimaler Test-Endpunkt für PDF-Generierung
app.get('/api/pdf-test', async (req, res) => {
  try {
    // Erstelle einfaches PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    
    // Text hinzufügen ohne komplexe Formatierung
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText("Test PDF", {
      x: 50,
      y: 750,
      size: 30,
      font: font,
      color: rgb(0, 0, 0)
    });
    
    // PDF speichern und senden
    const pdfBytes = await pdfDoc.save();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="test.pdf"');
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('PDF-Fehler:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error Handling Middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    if (error instanceof multer.MulterError) {
        return res.status(400).json({
            error: 'File upload error',
            message: error.message
        });
    }
    res.status(500).json({
        error: 'Internal server error',
        message: error.message
    });
});

// Server starten
const startServer = async () => {
    try {
        // Teste Schreibzugriff
        fs.accessSync(uploadDir, fs.constants.W_OK);
        console.log('Upload directory is writable:', uploadDir);

        // Teste Datenbankverbindung (PostgreSQL-Version) - überspringen, wenn DB nicht erreichbar
        try {
            const client = await pool.connect();
            console.log('Database connection successful');
            client.release();
        } catch (dbError) {
            console.warn('Database connection failed, continuing without database:', dbError.message);
        }

        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
            console.log('Upload directory:', uploadDir);
            console.log('CORS enabled for:', corsOptions.origin);
            console.log('Environment:', {
                DB_HOST: process.env.DB_HOST || 'localhost',
                DB_PORT: process.env.DB_PORT || 5432
            });
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
