import re
import os
import uuid
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models, schemas
from backend.auth import require_admin

router = APIRouter(prefix="/products", tags=["Productos"])

UPLOAD_DIR = os.path.join("frontend", "static", "uploads", "products")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    return re.sub(r'[-\s]+', '-', text)

# Subida directa de imagen
@router.post("/upload-image")
async def upload_product_image(
    file: UploadFile = File(...),
    admin: models.User = Depends(require_admin)
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Formato de imagen no permitido. Usa JPG, PNG, WEBP o GIF."
        )

    # Validar tamaño (máximo 5MB)
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Ruta web estática para el frontend
    web_url = f"/static/uploads/products/{unique_filename}"
    return {"image_url": web_url, "filename": unique_filename}

# Public & Admin endpoints
@router.get("/categories", response_model=List[schemas.CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).order_by(models.Category.id).all()

@router.post("/categories", response_model=schemas.CategoryResponse)
def create_category(
    cat_in: schemas.CategoryCreate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(require_admin)
):
    slug = cat_in.slug or slugify(cat_in.name)
    existing = db.query(models.Category).filter(models.Category.slug == slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="Esta categoría ya existe")
    cat = models.Category(name=cat_in.name, slug=slug, description=cat_in.description, icon=cat_in.icon)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat

@router.get("", response_model=List[schemas.ProductResponse])
def list_products(
    category_id: Optional[int] = None,
    active_only: bool = True,
    featured_only: bool = False,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Product)
    if active_only:
        query = query.filter(models.Product.is_active == True)
    if featured_only:
        query = query.filter(models.Product.is_featured == True)
    if category_id:
        query = query.filter(models.Product.category_id == category_id)
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(models.Product.name.ilike(search_fmt) | models.Product.description.ilike(search_fmt))
    
    return query.order_by(models.Product.id.desc()).all()

@router.get("/{product_id}", response_model=schemas.ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    prod = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return prod

# Admin endpoints
@router.post("", response_model=schemas.ProductResponse)
def create_product(
    prod_in: schemas.ProductCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    base_slug = prod_in.slug or slugify(prod_in.name)
    slug = base_slug
    counter = 1
    while db.query(models.Product).filter(models.Product.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    prod = models.Product(
        name=prod_in.name,
        slug=slug,
        category_id=prod_in.category_id,
        description=prod_in.description,
        price=prod_in.price,
        unit=prod_in.unit,
        stock=prod_in.stock,
        min_stock_alert=prod_in.min_stock_alert,
        image_url=prod_in.image_url,
        is_active=prod_in.is_active,
        is_featured=prod_in.is_featured
    )
    db.add(prod)
    db.commit()
    db.refresh(prod)

    # Registrar movimiento inicial en Kardex
    if prod.stock > 0:
        movement = models.InventoryMovement(
            product_id=prod.id,
            movement_type=models.MovementType.ENTRADA.value,
            quantity=prod.stock,
            previous_stock=0,
            new_stock=prod.stock,
            notes="Inventario inicial al crear nuevo producto en sistema"
        )
        db.add(movement)
        db.commit()

    return prod

@router.put("/{product_id}", response_model=schemas.ProductResponse)
def update_product(
    product_id: int,
    prod_update: schemas.ProductUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    prod = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    update_data = prod_update.model_dump(exclude_unset=True)
    
    # Si se actualiza el stock manualmente en la edición del producto
    if "stock" in update_data and update_data["stock"] != prod.stock:
        diff = update_data["stock"] - prod.stock
        m_type = models.MovementType.ENTRADA.value if diff > 0 else models.MovementType.AJUSTE.value
        movement = models.InventoryMovement(
            product_id=prod.id,
            movement_type=m_type,
            quantity=abs(diff),
            previous_stock=prod.stock,
            new_stock=update_data["stock"],
            notes="Ajuste de inventario desde modificación de producto"
        )
        db.add(movement)

    for key, value in update_data.items():
        setattr(prod, key, value)

    db.commit()
    db.refresh(prod)
    return prod

@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    prod = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    # Si tiene pedidos asociados, proteger integridad referencial desactivándolo
    if prod.order_items:
        prod.is_active = False
        db.commit()
        return {"detail": "El producto tiene órdenes en historial comercial. Ha sido retirado/desactivado de la tienda para mantener la integridad contable."}
    
    db.delete(prod)
    db.commit()
    return {"detail": "Producto eliminado exitosamente"}
