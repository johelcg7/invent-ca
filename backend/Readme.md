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
   - `http://localhost:3001/auth/google/callback` (desarrollo)
   - `https://tudominio.com/auth/google/callback` (producción)
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

### 7. Iniciar el backend
```bash
cd backend
npm run dev    # desarrollo (nodemon)
# o
npm start      # producción
```

### 8. Abrir el frontend
Abre `frontend/index.html` en tu navegador, o sirve con cualquier servidor estático:
```bash
# Con Python
cd frontend && python3 -m http.server 5173

# Con npx
npx serve frontend -p 5173
```

Visita: http://localhost:5173

---

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

## 🚀 Deploy en producción

1. Cambiar `FRONTEND_URL` y `GOOGLE_CALLBACK_URL` al dominio real
2. Agregar `secure: true` en cookies (requiere HTTPS)
3. Usar `NODE_ENV=production`
4. Servir el frontend con Nginx o similar
5. Usar MongoDB Atlas para la base de datos