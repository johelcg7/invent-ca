# InventaTI — Sistema de Gestión de Activos TI
> Stack: Node.js · Express · MongoDB · Vanilla JS · Google OAuth2

---

## 📁 Estructura del proyecto

```
asset-manager/
├── backend/
│   ├── models/
│   │   ├── Asset.js          # Modelo de activos
│   │   └── Colaborador.js    # Modelo de colaboradores
│   ├── routes/
│   │   ├── assets.js         # CRUD de activos
│   │   └── colaboradores.js  # CRUD de colaboradores
│   ├── middleware/
│   │   └── auth.js           # Middleware de autenticación
│   ├── server.js             # Servidor principal
│   ├── seed.js               # Importar datos desde Excel
│   ├── .env.example          # Variables de entorno (template)
│   └── package.json
└── frontend/
    └── index.html            # App frontend (SPA)
```

---

## ⚙️ Configuración paso a paso

### 1. Prerrequisitos
- Node.js 18+
- MongoDB local o MongoDB Atlas
- Cuenta de Google Cloud Console
- (Deploy) Railway para backend y Vercel para frontend

### 2. Instalar dependencias del backend
```bash
cd backend
npm install
# Para seed también necesitas:
npm install xlsx
```

### 3. Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con tus valores
```

### 4. Crear credenciales Google OAuth2

1. Ir a https://console.cloud.google.com/apis/credentials
2. Crear proyecto (o usar uno existente)
3. Habilitar **Google+ API** o **People API**
4. Crear credencial → **OAuth 2.0 Client ID** → tipo **Web Application**
5. Agregar URI de redirección autorizado:
   - `http://localhost:3001/auth/google/callback` (desarrollo por defecto)
   - `https://tudominio.com/auth/google/callback` (producción)

> Si cambias el puerto (`PORT`) o dominio (`APP_BASE_URL`), actualiza también el callback en Google.
6. Copiar **Client ID** y **Client Secret** al `.env`

### 5. Configurar correos autorizados en `.env`
```env
ALLOWED_EMAILS=admin@tuempresa.com,ti@tuempresa.com
```
Solo estos correos podrán iniciar sesión. Cualquier otro recibirá "Acceso denegado".

### 6. Importar datos del Excel (opcional)
```bash
cd backend
node seed.js ../Inventario_de_Activos_TI___CA.xlsx
```

### 7. Iniciar backend (local)
```bash
cd backend
npm run dev
# o
npm start
```

### 8. Iniciar frontend (local)
Abre `frontend/index.html` o sírvelo en otro puerto:
```bash
cd frontend && python3 -m http.server 5173
```

Visita: http://localhost:5173

---


## 🧯 Solución rápida: error 404

Si te aparece **404**, revisa esto:

1. `http://localhost:3001` es el backend (API).
2. El frontend local normalmente va en `http://localhost:5173` (o el puerto que uses).
3. Verifica backend con `http://localhost:3001/health` (debe responder JSON).

## 🔐 Flujo de autenticación

```
Usuario → Clic "Continuar con Google"
       → Redirige a Google OAuth
       → Google devuelve email
       → Backend verifica si email está en ALLOWED_EMAILS
       → Si sí: sesión creada, redirige al dashboard
       → Si no: redirige al login con error "acceso denegado"
```

La sesión dura **7 días** y se guarda en MongoDB.

---

## 🗄️ API Endpoints

### Assets
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/assets` | Lista con filtros: `?estado=&tipoEquipo=&area=&ubicacion=&search=` |
| GET | `/api/assets/stats` | Estadísticas para dashboard |
| GET | `/api/assets/:id` | Detalle de un activo |
| POST | `/api/assets` | Crear activo |
| PUT | `/api/assets/:id` | Editar activo |
| DELETE | `/api/assets/:id` | Eliminar activo |
| PATCH | `/api/assets/:id/constancias` | Actualizar solo links de constancias |

### Colaboradores
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/colaboradores` | Lista con filtros: `?area=&estado=&search=` |
| GET | `/api/colaboradores/:id` | Detalle + equipos asignados |
| POST | `/api/colaboradores` | Crear colaborador |
| PUT | `/api/colaboradores/:id` | Editar colaborador |
| DELETE | `/api/colaboradores/:id` | Eliminar colaborador |

### Auth
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/auth/google` | Iniciar login con Google |
| GET | `/auth/google/callback` | Callback OAuth |
| GET | `/auth/me` | Verificar sesión actual |
| POST | `/auth/logout` | Cerrar sesión |

---

## 🖥️ Vistas del sistema

| Vista | Descripción |
|-------|-------------|
| **Dashboard** | Estadísticas, totales por estado/tipo/área |
| **Inventario** | Tabla completa con filtros y búsqueda |
| **Por Colaborador** | Equipos agrupados/ordenados por usuario |
| **Equipos Remotos** | Solo activos en Casa (Remoto) |
| **Equipos en Oficina** | Solo activos en Oficina |
| **Por Área** | Filtro por área de la empresa |
| **Colaboradores** | CRUD de personas |

---

## 🔗 Links de constancias

Cada activo puede tener hasta 3 URLs:
- **Constancia de Entrega** → cuando se entrega el equipo al colaborador
- **Constancia de Cambio** → cuando se realiza un cambio de equipo
- **Constancia de Devolución** → cuando el equipo es devuelto

Se recomienda usar **Google Drive** con links compartidos de solo lectura. El sistema guarda y muestra el link como botón clicable en todas las vistas.

---

## 🚀 Deploy recomendado: Railway (backend) + Vercel (frontend)

### Backend en Railway
1. Crear servicio desde la carpeta `backend/`.
2. Variables de entorno mínimas:
   - `MONGODB_URI`
   - `SESSION_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `ALLOWED_EMAILS`
   - `ADMIN_EMAIL`
   - `FRONTEND_URLS=https://TU-FRONTEND.vercel.app`
   - `APP_BASE_URL=https://TU-BACKEND.up.railway.app`
   - `GOOGLE_CALLBACK_URL=https://TU-BACKEND.up.railway.app/auth/google/callback`
3. Railway inyecta `PORT`; no lo fijes manualmente.
4. Confirmar `https://TU-BACKEND.up.railway.app/health`.
5. Si el repo se despliega desde la raíz (sin Root Directory), este proyecto ya ejecuta `postinstall` para instalar `backend/node_modules` automáticamente.


### Si Railway muestra "Application failed to respond"
Revisa en orden:
1. El servicio está apuntando a la carpeta `backend/` (Root Directory).
2. Variables mínimas configuradas: `MONGODB_URI`, `SESSION_SECRET`, `FRONTEND_URLS`, `APP_BASE_URL`.
3. Si aún no configuras Google OAuth, el backend igual debe levantar; `/health` responderá con `oauth: "missing_credentials"`.
4. Valida logs de arranque en Railway para detectar variables vacías o URI inválidas.
5. Si `MONGODB_URI` falla, el backend seguirá arriba con `MemoryStore` temporal (solo para diagnóstico, no recomendado para producción).

### Frontend en Vercel
1. Crear proyecto con **Root Directory** en `frontend/`.
2. Publicar como sitio estático (sin build command).
3. Configurar base API en producción con alguna de estas opciones:
   - Definir `window.__API_BASE__` antes del script principal, o
   - Completar `<meta name="api-base-url" content="https://TU-BACKEND.up.railway.app">`, o
   - Guardar en navegador: `localStorage.setItem('API_BASE_URL','https://TU-BACKEND.up.railway.app')`.
4. En Google OAuth agrega estos URLs autorizados:
   - Origen JS: `https://TU-FRONTEND.vercel.app`
   - Callback: `https://TU-BACKEND.up.railway.app/auth/google/callback`

### Cookies y sesión cross-domain
Cuando frontend y backend están en dominios distintos (Vercel + Railway), el backend usa en producción:
- `cookie.secure=true`
- `cookie.sameSite='none'`

Esto es necesario para que la sesión funcione con `credentials: 'include'`.
