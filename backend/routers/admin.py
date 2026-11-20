from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.database import get_db
from backend import models, schemas
from backend.auth import require_admin

router = APIRouter(prefix="/admin", tags=["Administración y Métricas"])

# ==============================================================================
# SCHEMAS PARA CONTROL DE LOTES Y PESAJE (SCREENSHOTS AVÍCOLAS)
# ==============================================================================
class BatchWeightCreate(BaseModel):
    day_number: int
    avg_weight_grams: float
    ideal_weight_grams: Optional[float] = None
    status_label: Optional[str] = "Bien de peso"
    notes: Optional[str] = None

class BatchUpdate(BaseModel):
    chickens_initial: Optional[int] = None
    chickens_current: Optional[int] = None
    mortality_count: Optional[int] = None
    slaughtered_count: Optional[int] = None

@router.get("/dashboard-stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    today_orders = db.query(models.Order).filter(models.Order.created_at >= today_start).all()
    today_sales = sum(o.total for o in today_orders if o.status != models.OrderStatus.CANCELADO.value)
    
    month_orders = db.query(models.Order).filter(models.Order.created_at >= month_start).all()
    month_sales = sum(o.total for o in month_orders if o.status != models.OrderStatus.CANCELADO.value)

    total_orders_count = db.query(models.Order).count()
    pending_orders_count = db.query(models.Order).filter(models.Order.status == models.OrderStatus.PENDIENTE.value).count()
    delivered_orders_count = db.query(models.Order).filter(models.Order.status == models.OrderStatus.ENTREGADO.value).count()

    products = db.query(models.Product).all()
    available_products_count = sum(1 for p in products if p.is_active and p.stock > 0)
    low_stock_count = sum(1 for p in products if p.stock <= p.min_stock_alert)

    income_records = db.query(func.sum(models.FinanceRecord.amount)).filter(
        models.FinanceRecord.type == models.FinanceType.INGRESO.value
    ).scalar() or 0.0

    expense_records = db.query(func.sum(models.FinanceRecord.amount)).filter(
        models.FinanceRecord.type.in_([models.FinanceType.GASTO.value, models.FinanceType.COMPRA_MATERIA_PRIMA.value])
    ).scalar() or 0.0

    estimated_profit = income_records - expense_records

    sales_chart = []
    for i in range(6, -1, -1):
        day = (datetime.utcnow() - timedelta(days=i)).date()
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())
        
        day_total = db.query(func.sum(models.Order.total)).filter(
            models.Order.created_at >= day_start,
            models.Order.created_at <= day_end,
            models.Order.status != models.OrderStatus.CANCELADO.value
        ).scalar() or 0.0

        sales_chart.append({
            "date": day.strftime("%d/%m"),
            "total": float(day_total)
        })

    return {
        "today_sales": today_sales,
        "month_sales": month_sales,
        "total_orders": total_orders_count,
        "pending_orders": pending_orders_count,
        "delivered_orders": delivered_orders_count,
        "available_products": available_products_count,
        "low_stock_count": low_stock_count,
        "total_income": income_records,
        "total_expenses": expense_records,
        "estimated_profit": estimated_profit,
        "sales_chart": sales_chart
    }

# ==============================================================================
# ENDPOINTS PARA EL SISTEMA MÓVIL AVÍCOLA "CONTROL DE POLLOS EN GALPÓN"
# ==============================================================================
@router.get("/poultry-control")
def get_poultry_control_data(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    batch = db.query(models.PoultryBatch).first()
    if not batch:
        batch = models.PoultryBatch(name="Lote Principal", chickens_initial=50, chickens_current=47, mortality_count=3, slaughtered_count=0)
        db.add(batch)
        db.commit()
        db.refresh(batch)

    # Pesajes ordenados por día descendente
    weights = db.query(models.BatchWeightRecord).filter(
        models.BatchWeightRecord.batch_id == batch.id
    ).order_by(models.BatchWeightRecord.day_number.desc()).all()

    # Gastos consolidados
    expenses = db.query(models.FinanceRecord).filter(
        models.FinanceRecord.type.in_([models.FinanceType.GASTO.value, models.FinanceType.COMPRA_MATERIA_PRIMA.value])
    ).order_by(models.FinanceRecord.id.desc()).all()

    total_spent = sum(e.amount for e in expenses)
    cost_per_chicken = (total_spent / batch.chickens_current) if batch.chickens_current > 0 else 0.0

    # Ingresos consolidados
    incomes = db.query(models.FinanceRecord).filter(
        models.FinanceRecord.type == models.FinanceType.INGRESO.value
    ).order_by(models.FinanceRecord.id.desc()).all()
    total_income = sum(i.amount for i in incomes)

    # Ventas de tienda
    orders = db.query(models.Order).order_by(models.Order.id.desc()).all()
    total_sold = sum(o.total for o in orders if o.status != models.OrderStatus.CANCELADO.value)
    cobrado = sum(o.total for o in orders if o.is_paid and o.status != models.OrderStatus.CANCELADO.value)
    pendiente = total_sold - cobrado

    return {
        "batch": {
            "id": batch.id,
            "name": batch.name,
            "en_galpon": batch.chickens_current,
            "bajas": batch.mortality_count,
            "sacrificados": batch.slaughtered_count,
            "iniciados": batch.chickens_initial,
            "disponibles": batch.chickens_current
        },
        "weights": [
            {
                "id": w.id,
                "day_number": w.day_number,
                "avg_weight_grams": w.avg_weight_grams,
                "status_label": w.status_label,
                "notes": w.notes,
                "date": w.recorded_at.strftime("%d %b").upper()
            } for w in weights
        ],
        "expenses": {
            "total_spent": total_spent,
            "cost_per_chicken": round(cost_per_chicken, 2),
            "feed_bultos": "1,5 bultos",
            "items": [
                {
                    "id": e.id,
                    "category": e.category,
                    "amount": e.amount,
                    "description": e.description,
                    "date": e.created_at.strftime("%d %b")
                } for e in expenses
            ]
        },
        "incomes": {
            "total_income": total_income,
            "sales_income": total_sold,
            "other_income": max(0.0, total_income - total_sold),
            "balance_lote": total_income - total_spent,
            "items": [
                {
                    "id": i.id,
                    "category": i.category,
                    "amount": i.amount,
                    "description": i.description,
                    "date": i.created_at.strftime("%d %b")
                } for i in incomes
            ]
        },
        "sales_summary": {
            "total_vendido": total_sold,
            "cobrado": cobrado,
            "pendiente": pendiente,
            "pollos_vendidos": sum(sum(it.quantity for it in o.items) for o in orders if o.status != models.OrderStatus.CANCELADO.value),
            "entregados": sum(1 for o in orders if o.status == models.OrderStatus.ENTREGADO.value),
            "total_orders": len(orders)
        }
    }

@router.post("/poultry-control/weight")
def add_weight_record(
    weight_in: BatchWeightCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    batch = db.query(models.PoultryBatch).first()
    if not batch:
        batch = models.PoultryBatch()
        db.add(batch)
        db.commit()
        db.refresh(batch)

    # Determinar status automático si no viene fijado
    status_label = weight_in.status_label or "Bien de peso"
    if weight_in.avg_weight_grams < (weight_in.day_number * 32):
        status_label = "Le falta peso"

    record = models.BatchWeightRecord(
        batch_id=batch.id,
        day_number=weight_in.day_number,
        avg_weight_grams=weight_in.avg_weight_grams,
        status_label=status_label,
        notes=weight_in.notes
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"message": "Pesaje registrado exitosamente", "id": record.id}

@router.delete("/poultry-control/weight/{record_id}")
def delete_weight_record(
    record_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    rec = db.query(models.BatchWeightRecord).filter(models.BatchWeightRecord.id == record_id).first()
    if rec:
        db.delete(rec)
        db.commit()
    return {"message": "Pesaje eliminado"}

# Customers CRM
@router.get("/customers", response_model=List[schemas.UserResponse])
def get_customers(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    return db.query(models.User).filter(models.User.role == models.UserRole.CUSTOMER.value).order_by(models.User.id.desc()).all()

# Suppliers
@router.get("/suppliers", response_model=List[schemas.SupplierResponse])
def list_suppliers(db: Session = Depends(get_db), admin: models.User = Depends(require_admin)):
    return db.query(models.Supplier).order_by(models.Supplier.id.desc()).all()

@router.post("/suppliers", response_model=schemas.SupplierResponse)
def create_supplier(sup_in: schemas.SupplierCreate, db: Session = Depends(get_db), admin: models.User = Depends(require_admin)):
    sup = models.Supplier(**sup_in.model_dump())
    db.add(sup)
    db.commit()
    db.refresh(sup)
    return sup

# Finances
@router.get("/finances", response_model=List[schemas.FinanceRecordResponse])
def list_finances(db: Session = Depends(get_db), admin: models.User = Depends(require_admin)):
    return db.query(models.FinanceRecord).order_by(models.FinanceRecord.id.desc()).limit(150).all()

@router.post("/finances", response_model=schemas.FinanceRecordResponse)
def create_finance_record(rec_in: schemas.FinanceRecordCreate, db: Session = Depends(get_db), admin: models.User = Depends(require_admin)):
    rec = models.FinanceRecord(**rec_in.model_dump())
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec

# Business Settings
@router.get("/settings", response_model=schemas.BusinessSettingsResponse)
def get_business_settings(db: Session = Depends(get_db)):
    settings_obj = db.query(models.BusinessSettings).first()
    if not settings_obj:
        settings_obj = models.BusinessSettings()
        db.add(settings_obj)
        db.commit()
        db.refresh(settings_obj)
    return settings_obj

@router.put("/settings", response_model=schemas.BusinessSettingsResponse)
def update_business_settings(
    settings_in: schemas.BusinessSettingsUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    settings_obj = db.query(models.BusinessSettings).first()
    if not settings_obj:
        settings_obj = models.BusinessSettings()
        db.add(settings_obj)
    
    update_data = settings_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(settings_obj, key, value)
    
    db.commit()
    db.refresh(settings_obj)
    return settings_obj
