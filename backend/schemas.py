from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime

# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    email: str
    full_name: str
    role: str

class TokenData(BaseModel):
    email: Optional[str] = None

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = "Bogotá"

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Category Schemas
class CategoryBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    icon: Optional[str] = "drumstick"

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Product Schemas
class ProductBase(BaseModel):
    name: str
    slug: Optional[str] = None
    category_id: Optional[int] = None
    description: Optional[str] = None
    price: float = Field(gt=0, description="Precio en COP")
    unit: str = "Kg"
    stock: float = Field(ge=0, description="Existencias disponibles")
    min_stock_alert: float = 10.0
    image_url: Optional[str] = None
    is_active: bool = True
    is_featured: bool = False

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    category_id: Optional[int] = None
    description: Optional[str] = None
    price: Optional[float] = None
    unit: Optional[str] = None
    stock: Optional[float] = None
    min_stock_alert: Optional[float] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None

class ProductResponse(ProductBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    category: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True

# Inventory Movement Schemas
class InventoryMovementCreate(BaseModel):
    product_id: int
    movement_type: str  # Entrada, Pérdida / Merma, Ajuste
    quantity: float
    notes: Optional[str] = None

class InventoryMovementResponse(BaseModel):
    id: int
    product_id: int
    movement_type: str
    quantity: float
    previous_stock: float
    new_stock: float
    notes: Optional[str]
    created_at: datetime
    product_name: Optional[str] = None

    class Config:
        from_attributes = True

# Order Schemas
class OrderItemCreate(BaseModel):
    product_id: int
    quantity: float

class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    unit_price: float
    quantity: float
    subtotal: float
    unit: str

    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    customer_name: str
    customer_phone: str
    shipping_address: str
    shipping_neighborhood: str
    shipping_city: str = "Bogotá"
    notes: Optional[str] = None
    payment_method: str = "Pago contra entrega"
    items: List[OrderItemCreate]

class OrderStatusUpdate(BaseModel):
    status: str
    is_paid: Optional[bool] = None

class OrderResponse(BaseModel):
    id: int
    order_code: str
    user_id: Optional[int]
    customer_name: str
    customer_phone: str
    shipping_address: str
    shipping_neighborhood: str
    shipping_city: str
    notes: Optional[str]
    subtotal: float
    delivery_fee: float
    discount: float
    total: float
    status: str
    payment_method: str
    is_paid: bool
    created_at: datetime
    items: List[OrderItemResponse] = []

    class Config:
        from_attributes = True

# Supplier Schemas
class SupplierBase(BaseModel):
    name: str
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    products_supplied: Optional[str] = None
    total_purchased: float = 0.0
    notes: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierResponse(SupplierBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Finance Schemas
class FinanceRecordCreate(BaseModel):
    type: str  # Ingreso, Gasto, Compra Materia Prima
    category: str
    amount: float
    description: Optional[str] = None
    reference: Optional[str] = None

class FinanceRecordResponse(BaseModel):
    id: int
    type: str
    category: str
    amount: float
    description: Optional[str]
    reference: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# Calculator Schemas
class BreedingCalcInputs(BaseModel):
    chickens_count: int = Field(gt=0)
    initial_price_per_chicken: float = Field(ge=0)
    initial_weight_kg: float = Field(ge=0)
    feed_consumed_kg: float = Field(ge=0)
    feed_price_per_kg: float = Field(ge=0)
    medications_cost: float = 0.0
    vitamins_cost: float = 0.0
    vaccines_cost: float = 0.0
    labor_cost: float = 0.0
    utilities_cost: float = 0.0  # Agua y energía
    transport_cost: float = 0.0
    mortality_rate_percent: float = Field(ge=0, le=100)
    other_expenses: float = 0.0
    target_margin_percent: float = 25.0
    final_avg_weight_kg: float = 2.4

class BreedingCalcResults(BaseModel):
    chickens_surviving: int
    mortality_count: int
    total_investment: float
    cost_per_surviving_chicken: float
    total_biomass_kg: float
    cost_per_kg: float
    cost_per_lb: float
    min_selling_price_total: float
    recommended_price_per_kg: float
    recommended_price_per_lb: float
    recommended_price_per_chicken: float
    estimated_revenue: float
    estimated_profit: float
    profit_margin_percent: float

class CommercialCalcInputs(BaseModel):
    chickens_bought: int = Field(gt=0)
    purchase_price_per_unit: float = Field(ge=0)
    avg_weight_kg: float = Field(gt=0)
    transport_cost: float = 0.0
    processing_cost: float = 0.0  # Faenado, despiece
    packaging_cost: float = 0.0
    labor_cost: float = 0.0
    other_expenses: float = 0.0
    margin_type: str = "margin_on_sale"  # "margin_on_sale" or "markup_on_cost"
    desired_margin_percent: float = 25.0

class CommercialCalcResults(BaseModel):
    total_purchase_cost: float
    additional_expenses: float
    total_cost: float
    cost_per_chicken: float
    cost_per_kg: float
    cost_per_lb: float
    min_selling_price_total: float
    min_selling_price_per_kg: float
    min_selling_price_per_lb: float
    recommended_price_per_chicken: float
    recommended_price_per_kg: float
    recommended_price_per_lb: float
    profit_per_chicken: float
    total_expected_revenue: float
    total_profit: float
    profit_margin_percent: float

class SavedCalculationCreate(BaseModel):
    title: str
    mode: str
    inputs: Any
    results: Any

class SavedCalculationResponse(BaseModel):
    id: int
    title: str
    mode: str
    inputs_json: str
    results_json: str
    created_at: datetime

    class Config:
        from_attributes = True

# Settings Schemas
class BusinessSettingsUpdate(BaseModel):
    business_name: Optional[str] = None
    tagline: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    schedule: Optional[str] = None
    currency: Optional[str] = None
    delivery_fee_default: Optional[float] = None
    free_delivery_threshold: Optional[float] = None
    payment_methods_enabled: Optional[str] = None
    commercial_terms: Optional[str] = None

class BusinessSettingsResponse(BaseModel):
    id: int
    business_name: str
    tagline: str
    phone: str
    whatsapp: str
    email: str
    address: str
    city: str
    schedule: str
    currency: str
    delivery_fee_default: float
    free_delivery_threshold: float
    payment_methods_enabled: str
    commercial_terms: str

    class Config:
        from_attributes = True
