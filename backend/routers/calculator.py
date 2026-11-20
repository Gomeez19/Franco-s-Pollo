import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models, schemas
from backend.services.calculator import calculate_breeding, calculate_commercial
from backend.auth import require_admin

router = APIRouter(prefix="/calculator", tags=["Calculadora Inteligente de Precios"])

@router.post("/breeding", response_model=schemas.BreedingCalcResults)
def run_breeding_calculation(inputs: schemas.BreedingCalcInputs):
    return calculate_breeding(inputs)

@router.post("/commercial", response_model=schemas.CommercialCalcResults)
def run_commercial_calculation(inputs: schemas.CommercialCalcInputs):
    return calculate_commercial(inputs)

@router.post("/save", response_model=schemas.SavedCalculationResponse)
def save_calculation(
    calc_in: schemas.SavedCalculationCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    saved = models.PriceCalculation(
        title=calc_in.title,
        mode=calc_in.mode,
        inputs_json=json.dumps(calc_in.inputs, default=str),
        results_json=json.dumps(calc_in.results, default=str)
    )
    db.add(saved)
    db.commit()
    db.refresh(saved)
    return saved

@router.get("/saved", response_model=List[schemas.SavedCalculationResponse])
def get_saved_calculations(
    mode: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    query = db.query(models.PriceCalculation)
    if mode:
        query = query.filter(models.PriceCalculation.mode == mode)
    return query.order_by(models.PriceCalculation.id.desc()).all()

@router.delete("/saved/{calc_id}")
def delete_saved_calculation(
    calc_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    item = db.query(models.PriceCalculation).filter(models.PriceCalculation.id == calc_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cálculo no encontrado")
    db.delete(item)
    db.commit()
    return {"detail": "Cálculo eliminado correctamente"}

@router.post("/apply-price/{product_id}")
def apply_calculated_price(
    product_id: int,
    price_data: dict,  # {"new_price": float}
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    prod = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    new_price = float(price_data.get("new_price", 0))
    if new_price <= 0:
        raise HTTPException(status_code=400, detail="El precio debe ser superior a 0")
    
    old_price = prod.price
    prod.price = new_price
    db.commit()
    db.refresh(prod)

    return {
        "success": True,
        "product_id": prod.id,
        "product_name": prod.name,
        "old_price": old_price,
        "new_price": new_price,
        "message": f"Precio de '{prod.name}' actualizado con éxito a ${new_price:,.2f} COP"
    }
