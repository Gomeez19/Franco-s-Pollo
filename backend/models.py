from datetime import datetime
import enum
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum
)
from sqlalchemy.orm import relationship
from backend.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    CUSTOMER = "customer"

class OrderStatus(str, enum.Enum):
    PENDIENTE = "Pendiente"
    CONFIRMADO = "Confirmado"
    EN_PREPARACION = "En preparación"
    LISTO = "Listo"
    EN_CAMINO = "En camino"
    ENTREGADO = "Entregado"
    CANCELADO = "Cancelado"

class PaymentMethod(str, enum.Enum):
    EFECTIVO = "Efectivo"
    TRANSFERENCIA = "Transferencia bancaria"
    CONTRA_ENTREGA = "Pago contra entrega"

class MovementType(str, enum.Enum):
    ENTRADA = "Entrada"
    SALIDA_VENTA = "Salida por Venta"
    PERDIDA = "Pérdida / Merma"
    AJUSTE = "Ajuste manual"

class FinanceType(str, enum.Enum):
    INGRESO = "Ingreso"
    GASTO = "Gasto"
    COMPRA_MATERIA_PRIMA = "Compra Materia Prima"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    address = Column(String(255), nullable=True)
    neighborhood = Column(String(100), nullable=True)
    city = Column(String(100), default="Barranquilla")
    role = Column(String(20), default=UserRole.CUSTOMER.value)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    orders = relationship("Order", back_populates="customer")

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), default="drumstick")
    created_at = Column(DateTime, default=datetime.utcnow)

    products = relationship("Product", back_populates="category")

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    name = Column(String(200), nullable=False, index=True)
    slug = Column(String(200), unique=True, index=True)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False, default=0.0)
    unit = Column(String(50), nullable=False, default="Kg")
    stock = Column(Float, nullable=False, default=0.0)
    min_stock_alert = Column(Float, default=10.0)
    image_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category = relationship("Category", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")
    inventory_movements = relationship("InventoryMovement", back_populates="product")

class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    movement_type = Column(String(50), nullable=False)
    quantity = Column(Float, nullable=False)
    previous_stock = Column(Float, nullable=False)
    new_stock = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="inventory_movements")

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_code = Column(String(50), unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    customer_name = Column(String(255), nullable=False)
    customer_phone = Column(String(50), nullable=False)
    shipping_address = Column(String(255), nullable=False)
    shipping_neighborhood = Column(String(100), nullable=False)
    shipping_city = Column(String(100), default="Barranquilla")
    notes = Column(Text, nullable=True)

    subtotal = Column(Float, nullable=False, default=0.0)
    delivery_fee = Column(Float, nullable=False, default=0.0)
    discount = Column(Float, nullable=False, default=0.0)
    total = Column(Float, nullable=False, default=0.0)

    status = Column(String(50), default=OrderStatus.PENDIENTE.value)
    payment_method = Column(String(50), default=PaymentMethod.CONTRA_ENTREGA.value)
    is_paid = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    product_name = Column(String(200), nullable=False)
    unit_price = Column(Float, nullable=False)
    quantity = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)
    unit = Column(String(50), default="Kg")

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    contact_name = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(String(255), nullable=True)
    products_supplied = Column(Text, nullable=True)
    total_purchased = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class FinanceRecord(Base):
    __tablename__ = "finance_records"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(50), nullable=False)  # Ingreso, Gasto, Compra Materia Prima
    category = Column(String(100), nullable=False)  # Alimento, Pollos, Vitaminas, Bebedero, Comedero, Galpon, etc.
    amount = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    reference = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class PriceCalculation(Base):
    __tablename__ = "price_calculations"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    mode = Column(String(50), nullable=False)
    inputs_json = Column(Text, nullable=False)
    results_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

# ==============================================================================
# NUEVOS MODELOS PARA EL SISTEMA MÓVIL AVÍCOLA "CONTROL DE POLLOS Y LOTES"
# ==============================================================================
class PoultryBatch(Base):
    __tablename__ = "poultry_batches"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), default="Lote Principal")
    chickens_initial = Column(Integer, default=50)
    chickens_current = Column(Integer, default=47)
    mortality_count = Column(Integer, default=3)
    slaughtered_count = Column(Integer, default=0)
    start_date = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

class BatchWeightRecord(Base):
    __tablename__ = "batch_weight_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("poultry_batches.id"), nullable=True)
    day_number = Column(Integer, nullable=False)  # Ej: Día 1, 2, 7, 9, 13
    avg_weight_grams = Column(Float, nullable=False)  # Ej: 400 g
    ideal_weight_grams = Column(Float, nullable=True)
    status_label = Column(String(50), default="Bien de peso")  # "Bien de peso", "Le falta peso", "Sobrepeso"
    notes = Column(Text, nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow)

class BusinessSettings(Base):
    __tablename__ = "business_settings"

    id = Column(Integer, primary_key=True)
    business_name = Column(String(255), default="FRANCO'S POLLO")
    tagline = Column(String(255), default="El Pollo de Cada Hogar")
    phone = Column(String(50), default="+57 320 656 5410")
    whatsapp = Column(String(50), default="573206565410")
    email = Column(String(255), default="pedidos@francospollo.com")
    address = Column(String(255), default="Centro de Distribución Mayorista y Domicilios")
    city = Column(String(100), default="Malambo, Soledad y Barranquilla (Atlántico)")
    schedule = Column(String(255), default="Lunes a Sábado: 6:00 AM - 6:00 PM | Domingos: 7:00 AM - 2:00 PM")
    currency = Column(String(10), default="COP")
    delivery_fee_default = Column(Float, default=5000.0)
    free_delivery_threshold = Column(Float, default=60000.0)
    payment_methods_enabled = Column(String(255), default="Efectivo, Transferencia bancaria (Nequi/Bancolombia), Pago contra entrega")
    commercial_terms = Column(Text, default="Garantía de frescura. Cadena de frío ininterrumpida. Pesaje verificado al momento del despacho.")
