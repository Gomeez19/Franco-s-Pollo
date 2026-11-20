# 🍗 FRANCO'S POLLO – Plataforma Web Integral

**El Pollo de Cada Hogar** | Malambo · Soledad · Barranquilla (Atlántico, Colombia)

---

## 📋 Descripción

Plataforma web completa de comercio electrónico y gestión administrativa para **FRANCO'S POLLO**, empresa distribuidora de pollos y productos avícolas frescos.

## ⚙️ Tecnologías

| Capa | Tecnología |
|------|-----------|
| Backend | Python · FastAPI · SQLAlchemy |
| Base de Datos | PostgreSQL en Neon (cloud) |
| Frontend | HTML5 · Tailwind CSS · JavaScript (Vanilla) |
| Auth | JWT · bcrypt |
| Almacenamiento | Neon PostgreSQL + Filesystem para imágenes |

## 🚀 Levantar el Servidor

### Prerequisito
```bash
pip install -r requirements.txt
```

### Iniciar
```bash
python run_server.py
```
O hacer doble clic en `iniciar_servidor.bat` (Windows).

La app corre en: **http://127.0.0.1:8000**

## 🗂️ Estructura del Proyecto

```
Franco's Pollo/
├── backend/
│   ├── main.py           # App FastAPI principal
│   ├── models.py         # Modelos SQLAlchemy
│   ├── schemas.py        # Schemas Pydantic
│   ├── auth.py           # Autenticación JWT
│   ├── database.py       # Conexión Neon PostgreSQL
│   └── routers/          # Endpoints por módulo
├── frontend/
│   ├── index.html        # Tienda Virtual (Clientes)
│   ├── admin.html        # Panel Administrativo
│   └── static/
│       ├── css/styles.css
│       ├── js/app.js     # Lógica tienda
│       └── images/       # Logos e imágenes
├── run_server.py
├── iniciar_servidor.bat
├── requirements.txt
└── .env                  # Variables de entorno (NO subir a Git público)
```

## 🔑 Acceso Administrativo

Iniciar sesión en la tienda con cuenta de tipo **admin** → redirección automática a `/admin`.

## 📞 Contacto

- WhatsApp: **+57 320 656 5410**
- Sedes: Malambo · Soledad · Barranquilla

---

> © 2026 FRANCO'S POLLO. Todos los derechos reservados.
