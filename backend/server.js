require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─── Correos permitidos ──────────────────────────────────────────────────────
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

// Admin email (puedes configurar ADMIN_EMAIL en .env). Si no está, usamos el primer email permitido.
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || ALLOWED_EMAILS[0] || '').toLowerCase();

// ─── MongoDB ─────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/inventario_ti')
  .then(() => console.log('✅ MongoDB conectado'))
  .catch(err => { console.error('❌ MongoDB error:', err); process.exit(1); });

// ─── Middlewares ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('trust proxy', 1);

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/inventario_ti',
    ttl: 7 * 24 * 60 * 60
  }),
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

// ─── Passport / Google OAuth ─────────────────────────────────────────────────
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
  const email = profile.emails?.[0]?.value?.toLowerCase();

  // Verificar si el correo está en la lista blanca
  if (!email || !ALLOWED_EMAILS.includes(email)) {
    return done(null, false, { message: `Acceso denegado para ${email}. Contacte al administrador.` });
  }

  // No se guarda en DB, solo se usa la sesión
  const user = {
    id: profile.id,
    name: profile.displayName,
    email,
    photo: profile.photos?.[0]?.value,
    // role: 'admin' o 'viewer'
    role: email === ADMIN_EMAIL ? 'admin' : 'viewer'
  };
  return done(null, user);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.use(passport.initialize());
app.use(passport.session());

// ─── Auth Routes ─────────────────────────────────────────────────────────────
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  // Redirigir al root del frontend para que el SPA procese el estado (usa /?error=... para mostrar errores)
  passport.authenticate('google', { failureRedirect: `${FRONTEND_URL}/?error=acceso_denegado` }),
  (req, res) => res.redirect(`${FRONTEND_URL}/`)
);

app.get('/auth/me', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ authenticated: false });
  res.json({ authenticated: true, user: req.user });
});

app.post('/auth/logout', (req, res) => {
  req.logout(() => res.json({ message: 'Sesión cerrada' }));
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/assets', require('./routes/assets'));
app.use('/api/colaboradores', require('./routes/colaboradores'));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ─── Root route (evita confusión con 404 en /) ───────────────────────────────
app.get('/', (req, res) => {
  res.json({
    app: 'InventaTI backend',
    status: 'ok',
    frontend: FRONTEND_URL,
    docs: {
      health: '/health',
      authMe: '/auth/me'
    }
  });
});

// ─── Error handler ───────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📧 Correos autorizados: ${ALLOWED_EMAILS.join(', ') || 'NINGUNO - configura ALLOWED_EMAILS en .env'}`);
  console.log(`🔑 Admin definido: ${ADMIN_EMAIL || 'NINGUNO (set ADMIN_EMAIL en .env si quieres uno explícito)'}`);
});