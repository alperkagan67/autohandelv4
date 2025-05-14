import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'kfz-abaci-jwt-geheimer-schluessel';

export function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ error: 'Token ungültig oder abgelaufen' });
      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ error: 'Keine Authentifizierung' });
  }
}

export function loginHandler(req, res) {
  const { username, password } = req.body;
  const adminUsername = 'root';
  const adminPassword = '123456';
  if (username === adminUsername && password === adminPassword) {
    const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    res.status(200).json({ token, user: { username, role: 'admin' } });
  } else {
    res.status(401).json({ error: 'Ungültige Zugangsdaten' });
  }
} 