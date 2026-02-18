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
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;
const FRONTEND_URLS = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(url => url.trim())
  .filter(Boolean);
const PRIMARY_FRONTEND_URL = FRONTEND_URLS[0] || 'http://localhost:5173';
const isProduction = process.env.NODE_ENV === 'production';

// ─── Correos permitidos ──────────────────────────────────────────────────────
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

// Admin email (puedes configurar ADMIN_EMAIL en .env). Si no está, usamos el primer email permitido.
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || ALLOWED_EMAILS[0] || '').toLowerCase();

// ─── MongoDB ─────────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/inventario_ti';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB conectado'))
  .catch(err => {
    console.error('❌ MongoDB error al iniciar:', err.message);
    console.error('⚠️ El servidor seguirá arriba para responder /health; revisa MONGODB_URI en el deploy.');
  });

// ─── Middlewares ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || FRONTEND_URLS.includes(origin)) return callback(null, true);
    return callback(new Error(`Origen no permitido por CORS: ${origin}`));
  },
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
    secure: isProduction,
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

// ─── Passport / Google OAuth ─────────────────────────────────────────────────
const hasGoogleOAuth = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

if (hasGoogleOAuth) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || `${APP_BASE_URL}/auth/google/callback`
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
} else {
  console.warn('⚠️ Google OAuth deshabilitado: faltan GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET');
}

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.use(passport.initialize());
app.use(passport.session());

// --- Dev helpers: sesión de prueba (solo fuera de producción) -----------------
if (process.env.NODE_ENV !== 'production') {
  app.get('/dev/login', (req, res) => {
    const email = (req.query.email || ADMIN_EMAIL || ALLOWED_EMAILS[0] || 'dev@local').toLowerCase();
    const role = req.query.role || (email === ADMIN_EMAIL ? 'admin' : 'admin');
    const user = {
      id: `dev-${Date.now()}`,
      name: 'Usuario Dev',
      email,
      photo: null,
      role
    };
    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: 'No se pudo crear sesión de prueba' });
      return res.json({ message: 'Sesión de prueba creada', user });
    });
  });

  app.get('/dev/logout', (req, res) => {
    req.logout(() => res.json({ message: 'Sesión de prueba cerrada' }));
  });
}

// ─── Auth Routes ─────────────────────────────────────────────────────────────
app.get('/auth/google', (req, res, next) => {
  if (!hasGoogleOAuth) return res.status(503).json({ error: 'Google OAuth no configurado en el backend' });
  return passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

app.get('/auth/google/callback', (req, res, next) => {
  if (!hasGoogleOAuth) return res.status(503).json({ error: 'Google OAuth no configurado en el backend' });
  return passport.authenticate('google', { failureRedirect: `${PRIMARY_FRONTEND_URL}/?error=acceso_denegado` })(req, res, next);
}, (req, res) => res.redirect(`${PRIMARY_FRONTEND_URL}/`));

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
app.get('/health', (req, res) => {
  const mongoState = ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown';
  res.json({ status: 'ok', timestamp: new Date(), mongo: mongoState, oauth: hasGoogleOAuth ? 'configured' : 'missing_credentials' });
});

// ─── Root route ───────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    app: 'InventaTI backend',
    status: 'ok',
    frontend: FRONTEND_URLS,
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

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🌐 Frontends permitidos (CORS): ${FRONTEND_URLS.join(', ')}`);
  console.log(`📧 Correos autorizados: ${ALLOWED_EMAILS.join(', ') || 'NINGUNO - configura ALLOWED_EMAILS en .env'}`);
  console.log(`🔑 Admin definido: ${ADMIN_EMAIL || 'NINGUNO (set ADMIN_EMAIL en .env si quieres uno explícito)'}`);
  console.log(`🔐 Google OAuth: ${hasGoogleOAuth ? 'configurado' : 'NO configurado'}`);
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`❌ Error: puerto ${PORT} en uso.`);
    console.error(`Sugerencia: mata el proceso que usa ese puerto o ejecuta: npx kill-port ${PORT}`);
    process.exit(1);
  }
  console.error('Server error:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at Promise', p, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
  process.exit(1);
});