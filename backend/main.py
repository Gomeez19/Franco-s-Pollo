import os
from pathlib import Path
from fastapi import FastAPI, Depends, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings
from backend.database import engine, Base
from backend.routers import auth, products, orders, inventory, calculator, admin

# Resolve base directory (compatible local y Vercel)
BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
STATIC_DIR = FRONTEND_DIR / "static"

# Ensure directories exist (handling read-only serverless environment safely)
try:
    os.makedirs(str(STATIC_DIR / "css"), exist_ok=True)
    os.makedirs(str(STATIC_DIR / "js"), exist_ok=True)
    os.makedirs(str(STATIC_DIR / "images"), exist_ok=True)
    os.makedirs(str(STATIC_DIR / "uploads" / "products"), exist_ok=True)
except Exception:
    pass

# Ensure tables exist safely
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Database init notice: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="Plataforma Web Integral para FRANCO'S POLLO: Tienda Online, Panel Administrativo y Calculadora Inteligente de Precios"
)

# CORS middleware for secure integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(products.router, prefix=settings.API_V1_STR)
app.include_router(orders.router, prefix=settings.API_V1_STR)
app.include_router(inventory.router, prefix=settings.API_V1_STR)
app.include_router(calculator.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

# Mount static files
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.get("/", response_class=HTMLResponse)
async def serve_store_home():
    return FileResponse(str(FRONTEND_DIR / "index.html"))

@app.get("/admin", response_class=HTMLResponse)
@app.get("/admin/{path:path}", response_class=HTMLResponse)
async def serve_admin_panel():
    return FileResponse(str(FRONTEND_DIR / "admin.html"))

@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.PROJECT_NAME, "version": settings.PROJECT_VERSION}
