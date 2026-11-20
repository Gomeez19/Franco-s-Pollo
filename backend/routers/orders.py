import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models, schemas
from backend.auth import get_current_user_optional, require_admin

router = APIRouter(prefix="/orders", tags=["Pedidos y Checkout"])

@router.post("/checkout", response_model=schemas.OrderResponse)
def create_order(
    order_in: schemas.OrderCreate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    if not order_in.items:
        raise HTTPException(status_code=400, detail="El carrito de compras está vacío")

    # Fetch settings for delivery fee
    settings_obj = db.query(models.BusinessSettings).first()
    default_delivery_fee = settings_obj.delivery_fee_default if settings_obj else 5000.0
    free_threshold = settings_obj.free_delivery_threshold if settings_obj else 60000.0

    subtotal = 0.0
    order_items_to_create = []

    # Verify inventory and calculate subtotal
    for item in order_in.items:
        prod = db.query(models.Product).filter(models.Product.id == item.product_id).with_for_update().first()
        if not prod:
            raise HTTPException(status_code=404, detail=f"Producto #{item.product_id} no encontrado")
        if not prod.is_active:
            raise HTTPException(status_code=400, detail=f"El producto '{prod.name}' no está disponible actualmente")
        if prod.stock < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuficiente para '{prod.name}'. Disponibles: {prod.stock} {prod.unit}, Solicitados: {item.quantity} {prod.unit}"
            )
        
        item_subtotal = prod.price * item.quantity
        subtotal += item_subtotal

        # Deduct inventory atomically
        previous_stock = prod.stock
        new_stock = previous_stock - item.quantity
        prod.stock = new_stock

        # Create movement
        movement = models.InventoryMovement(
            product_id=prod.id,
            movement_type=models.MovementType.SALIDA_VENTA.value,
            quantity=item.quantity,
            previous_stock=previous_stock,
            new_stock=new_stock,
            notes=f"Venta en pedido"
        )
        db.add(movement)

        order_items_to_create.append({
            "product_id": prod.id,
            "product_name": prod.name,
            "unit_price": prod.price,
            "quantity": item.quantity,
            "subtotal": item_subtotal,
            "unit": prod.unit
        })

    # Delivery fee logic
    delivery_fee = 0.0 if subtotal >= free_threshold else default_delivery_fee
    total = subtotal + delivery_fee

    order_code = f"FP-{uuid.uuid4().hex[:6].upper()}"

    new_order = models.Order(
        order_code=order_code,
        user_id=current_user.id if current_user else None,
        customer_name=order_in.customer_name,
        customer_phone=order_in.customer_phone,
        shipping_address=order_in.shipping_address,
        shipping_neighborhood=order_in.shipping_neighborhood,
        shipping_city=order_in.shipping_city,
        notes=order_in.notes,
        subtotal=subtotal,
        delivery_fee=delivery_fee,
        discount=0.0,
        total=total,
        status=models.OrderStatus.PENDIENTE.value,
        payment_method=order_in.payment_method,
        is_paid=False
    )
    db.add(new_order)
    db.flush()

    # Link items
    for it in order_items_to_create:
        order_item = models.OrderItem(
            order_id=new_order.id,
            product_id=it["product_id"],
            product_name=it["product_name"],
            unit_price=it["unit_price"],
            quantity=it["quantity"],
            subtotal=it["subtotal"],
            unit=it["unit"]
        )
        db.add(order_item)

    # Register finance record (projected revenue)
    finance_rec = models.FinanceRecord(
        type=models.FinanceType.INGRESO.value,
        category="Ventas de Tienda",
        amount=total,
        description=f"Pedido {order_code} - Cliente: {order_in.customer_name}",
        reference=order_code
    )
    db.add(finance_rec)

    db.commit()
    db.refresh(new_order)
    return new_order

@router.get("/my-orders", response_model=List[schemas.OrderResponse])
def get_user_orders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_optional)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Debe iniciar sesión para ver su historial de pedidos")
    return db.query(models.Order).filter(models.Order.user_id == current_user.id).order_by(models.Order.id.desc()).all()

@router.get("/track/{order_code}", response_model=schemas.OrderResponse)
def track_order(order_code: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.order_code == order_code.strip().upper()).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return order

# Admin management endpoints
@router.get("", response_model=List[schemas.OrderResponse])
def list_all_orders(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    query = db.query(models.Order)
    if status_filter:
        query = query.filter(models.Order.status == status_filter)
    return query.order_by(models.Order.id.desc()).all()

@router.get("/{order_id}", response_model=schemas.OrderResponse)
def get_order_detail(
    order_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return order

@router.put("/{order_id}/status", response_model=schemas.OrderResponse)
def update_order_status(
    order_id: int,
    status_in: schemas.OrderStatusUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    old_status = order.status
    order.status = status_in.status
    if status_in.is_paid is not None:
        order.is_paid = status_in.is_paid

    # If order is cancelled, return stock to inventory
    if status_in.status == models.OrderStatus.CANCELADO.value and old_status != models.OrderStatus.CANCELADO.value:
        for it in order.items:
            prod = db.query(models.Product).filter(models.Product.id == it.product_id).first()
            if prod:
                prev = prod.stock
                prod.stock += it.quantity
                mov = models.InventoryMovement(
                    product_id=prod.id,
                    movement_type=models.MovementType.AJUSTE.value,
                    quantity=it.quantity,
                    previous_stock=prev,
                    new_stock=prod.stock,
                    notes=f"Reincorporación por cancelación de pedido #{order.order_code}"
                )
                db.add(mov)

    db.commit()
    db.refresh(order)
    return order
