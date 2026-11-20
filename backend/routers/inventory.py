from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.database import get_db
from backend import models, schemas
from backend.auth import require_admin

router = APIRouter(prefix="/inventory", tags=["Inventario"])

@router.get("/status")
def get_inventory_status(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    products = db.query(models.Product).order_by(models.Product.stock.asc()).all()
    total_items = len(products)
    low_stock = [p for p in products if p.stock <= p.min_stock_alert]
    out_of_stock = [p for p in products if p.stock <= 0]
    total_valuation = sum(p.stock * p.price for p in products)

    return {
        "total_products": total_items,
        "low_stock_count": len(low_stock),
        "out_of_stock_count": len(out_of_stock),
        "total_valuation": round(total_valuation, 2),
        "low_stock_products": [
            {
                "id": p.id,
                "name": p.name,
                "stock": p.stock,
                "unit": p.unit,
                "min_stock_alert": p.min_stock_alert
            } for p in low_stock
        ]
    }

@router.get("/movements", response_model=List[schemas.InventoryMovementResponse])
def get_movements(
    limit: int = 100,
    product_id: Optional[int] = None,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    query = db.query(models.InventoryMovement)
    if product_id:
        query = query.filter(models.InventoryMovement.product_id == product_id)
    movements = query.order_by(models.InventoryMovement.id.desc()).limit(limit).all()

    # Append product names
    res = []
    for m in movements:
        item = schemas.InventoryMovementResponse.model_validate(m)
        item.product_name = m.product.name if m.product else "N/A"
        res.append(item)
    return res

@router.post("/movements", response_model=schemas.InventoryMovementResponse)
def register_movement(
    mov_in: schemas.InventoryMovementCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    prod = db.query(models.Product).filter(models.Product.id == mov_in.product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    if mov_in.quantity <= 0:
        raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a 0")

    previous_stock = prod.stock
    if mov_in.movement_type in [models.MovementType.PERDIDA.value, "Salida"]:
        if prod.stock < mov_in.quantity:
            raise HTTPException(status_code=400, detail=f"Existencias insuficientes para realizar la salida. Stock actual: {prod.stock}")
        new_stock = previous_stock - mov_in.quantity
    elif mov_in.movement_type == models.MovementType.ENTRADA.value:
        new_stock = previous_stock + mov_in.quantity
    elif mov_in.movement_type == models.MovementType.AJUSTE.value:
        new_stock = mov_in.quantity  # In ajuste, quantity sets the absolute new stock
        delta = new_stock - previous_stock
        mov_in.quantity = abs(delta)
    else:
        new_stock = previous_stock + mov_in.quantity

    prod.stock = new_stock
    
    movement = models.InventoryMovement(
        product_id=prod.id,
        movement_type=mov_in.movement_type,
        quantity=mov_in.quantity,
        previous_stock=previous_stock,
        new_stock=new_stock,
        notes=mov_in.notes
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)

    res = schemas.InventoryMovementResponse.model_validate(movement)
    res.product_name = prod.name
    return res
