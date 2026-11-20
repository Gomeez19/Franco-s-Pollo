import os
from sqlalchemy.orm import Session
from backend.database import SessionLocal, engine, Base
from backend import models
from backend.auth import get_password_hash

def seed_database():
    # Create all tables on Neon PostgreSQL
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    # 1. ADMIN USER
    admin_user = db.query(models.User).filter(models.User.email == "admin@francospollo.com").first()
    if not admin_user:
        admin_user = models.User(
            email="admin@francospollo.com",
            hashed_password=get_password_hash("Admin123*"),
            full_name="Franco Morales (Administrador)",
            phone="+57 320 656 5410",
            address="Bodega 14, Frigorífico Central de Carnes",
            neighborhood="Paloquemao",
            city="Bogotá",
            role=models.UserRole.ADMIN.value,
            is_active=True
        )
        db.add(admin_user)
        print("✓ Usuario Administrador creado: admin@francospollo.com / Admin123*")

    # 2. CLIENTES REALES (RESTAURANTES, ASADEROS Y FAMILIAS)
    real_customers = [
        {
            "email": "asaderolacolina@gmail.com",
            "password": "Cliente123*",
            "full_name": "Don Gustavo Peña (Asadero La Colina)",
            "phone": "+57 310 445 7890",
            "address": "Avenida 68 # 45-20",
            "neighborhood": "Salitre Greco",
            "city": "Bogotá"
        },
        {
            "email": "restaurantefridas@gmail.com",
            "password": "Cliente123*",
            "full_name": "Claudia Mendoza (Restaurante Fogón & Leña)",
            "phone": "+57 312 889 0012",
            "address": "Carrera 7 # 72-40 Local 102",
            "neighborhood": "Rosales",
            "city": "Bogotá"
        },
        {
            "email": "marianagomez.bog@gmail.com",
            "password": "Cliente123*",
            "full_name": "Mariana Gómez Rivas",
            "phone": "+57 318 667 3421",
            "address": "Calle 140 # 15-32 Apto 501",
            "neighborhood": "Cedritos",
            "city": "Bogotá"
        },
        {
            "email": "broasterking.bog@hotmail.com",
            "password": "Cliente123*",
            "full_name": "Carlos Julio Vargas (Broaster Express)",
            "phone": "+57 315 223 9988",
            "address": "Calle 53 # 21-14",
            "neighborhood": "Galerías",
            "city": "Bogotá"
        }
    ]

    for c_data in real_customers:
        existing = db.query(models.User).filter(models.User.email == c_data["email"]).first()
        if not existing:
            cust = models.User(
                email=c_data["email"],
                hashed_password=get_password_hash(c_data["password"]),
                full_name=c_data["full_name"],
                phone=c_data["phone"],
                address=c_data["address"],
                neighborhood=c_data["neighborhood"],
                city=c_data["city"],
                role=models.UserRole.CUSTOMER.value,
                is_active=True
            )
            db.add(cust)
            print(f"✓ Cliente real creado: {c_data['email']}")

    # 3. SETTINGS DEL NEGOCIO
    settings_obj = db.query(models.BusinessSettings).first()
    if not settings_obj:
        settings_obj = models.BusinessSettings(
            business_name="FRANCO'S POLLO",
            tagline="Frescura Garantizada de la Granja a su Hogar y Restaurante",
            phone="+57 320 656 5410",
            whatsapp="573206565410",
            email="pedidos@francospollo.com",
            address="Bodega 14, Frigorífico Central de Carnes",
            city="Bogotá, Colombia",
            schedule="Lunes a Sábado: 6:00 AM - 6:00 PM | Domingos: 7:00 AM - 2:00 PM",
            currency="COP",
            delivery_fee_default=5000.0,
            free_delivery_threshold=60000.0,
            payment_methods_enabled="Efectivo, Transferencia bancaria (Nequi/Daviplata/Bancolombia), Pago contra entrega",
            commercial_terms="Garantía de frescura 100%. Cadena de frío ininterrumpida (0°C a 4°C). Pesaje verificado al momento del despacho."
        )
        db.add(settings_obj)
    else:
        settings_obj.phone = "+57 320 656 5410"
        settings_obj.whatsapp = "573206565410"

    # 4. CATEGORÍAS
    categories_data = [
        {"name": "Pollo Entero", "slug": "pollo-entero", "icon": "bird", "description": "Pollo campesino y semicriollo entero, limpio y eviscerado"},
        {"name": "Pechuga", "slug": "pechuga", "icon": "shield", "description": "Pechuga entera, fileteada y porcionada de la más alta calidad"},
        {"name": "Alas", "slug": "alas", "icon": "feather", "description": "Alitas tiernas y carnosas para asados, broaster o BBQ"},
        {"name": "Muslos", "slug": "muslos", "icon": "drumstick", "description": "Muslitos jugosos, tiernos y frescos"},
        {"name": "Piernas Pernil", "slug": "piernas-pernil", "icon": "bone", "description": "Pierna pernil completa, excelente rendimiento y sabor"},
        {"name": "Contramuslos", "slug": "contramuslos", "icon": "package", "description": "Contramuslos ideales para guisos, fritos y al horno"},
        {"name": "Menudencias", "slug": "menudencias", "icon": "heart", "description": "Mollejas, hígados y corazones frescos"},
        {"name": "Otros Productos Avícolas", "slug": "otros-productos", "icon": "sparkles", "description": "Huevos AA, adobados especiales y cortes gourmet"}
    ]

    for cat_data in categories_data:
        cat = db.query(models.Category).filter(models.Category.slug == cat_data["slug"]).first()
        if not cat:
            cat = models.Category(**cat_data)
            db.add(cat)
    db.commit()

    # 5. PRODUCTOS AVÍCOLAS
    cat_entero = db.query(models.Category).filter(models.Category.slug == "pollo-entero").first()
    cat_pechuga = db.query(models.Category).filter(models.Category.slug == "pechuga").first()
    cat_alas = db.query(models.Category).filter(models.Category.slug == "alas").first()
    cat_muslos = db.query(models.Category).filter(models.Category.slug == "muslos").first()
    cat_pernil = db.query(models.Category).filter(models.Category.slug == "piernas-pernil").first()
    cat_contra = db.query(models.Category).filter(models.Category.slug == "contramuslos").first()
    cat_menu = db.query(models.Category).filter(models.Category.slug == "menudencias").first()
    cat_otros = db.query(models.Category).filter(models.Category.slug == "otros-productos").first()

    products_data = [
        {
            "name": "Pollo Entero Campesino Fresco",
            "slug": "pollo-entero-campesino-fresco",
            "category_id": cat_entero.id if cat_entero else None,
            "description": "Pollo fresco de granja criado naturalmente, eviscerado y limpio, listo para hornear o sancocho. Peso promedio 2.2 - 2.5 Kg.",
            "price": 23500.0,
            "unit": "Unidad",
            "stock": 85.0,
            "min_stock_alert": 15.0,
            "image_url": "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=800&q=80",
            "is_featured": True,
            "is_active": True
        },
        {
            "name": "Pechuga Entera sin Piel",
            "slug": "pechuga-entera-sin-piel",
            "category_id": cat_pechuga.id if cat_pechuga else None,
            "description": "Pechuga de pollo 100% magra, limpia de grasa y sin piel. Máxima ternura y rendimiento para tus recetas.",
            "price": 14900.0,
            "unit": "Kg",
            "stock": 120.0,
            "min_stock_alert": 20.0,
            "image_url": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=800&q=80",
            "is_featured": True,
            "is_active": True
        },
        {
            "name": "Filete de Pechuga Porcionado",
            "slug": "filete-de-pechuga-porcionado",
            "category_id": cat_pechuga.id if cat_pechuga else None,
            "description": "Filetes delgados y uniformes listos para la plancha, apanar o ensaladas saludables.",
            "price": 16500.0,
            "unit": "Kg",
            "stock": 95.0,
            "min_stock_alert": 15.0,
            "image_url": "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80",
            "is_featured": True,
            "is_active": True
        },
        {
            "name": "Alitas de Pollo Seleccionadas",
            "slug": "alitas-de-pollo-seleccionadas",
            "category_id": cat_alas.id if cat_alas else None,
            "description": "Alas completas frescas (muslito y ala), ideales para parrilladas familiares, salsas BBQ y fritura crujiente.",
            "price": 11800.0,
            "unit": "Kg",
            "stock": 140.0,
            "min_stock_alert": 25.0,
            "image_url": "https://images.unsplash.com/photo-1527477378370-5b65f7c35586?auto=format&fit=crop&w=800&q=80",
            "is_featured": True,
            "is_active": True
        },
        {
            "name": "Pierna Pernil con Rabadilla",
            "slug": "pierna-pernil-con-rabadilla",
            "category_id": cat_pernil.id if cat_pernil else None,
            "description": "Corte tradicional muy jugoso y con abundante carne. Perfecto para asados y almuerzos cotidianos.",
            "price": 8900.0,
            "unit": "Kg",
            "stock": 110.0,
            "min_stock_alert": 20.0,
            "image_url": "https://images.unsplash.com/photo-1594221708779-94832f4320d1?auto=format&fit=crop&w=800&q=80",
            "is_featured": True,
            "is_active": True
        },
        {
            "name": "Muslos de Pollo Frescos",
            "slug": "muslos-de-pollo-frescos",
            "category_id": cat_muslos.id if cat_muslos else None,
            "description": "Muslitos de pollo tiernos, ideales para los niños y preparaciones al curry o guisados.",
            "price": 9500.0,
            "unit": "Kg",
            "stock": 70.0,
            "min_stock_alert": 15.0,
            "image_url": "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=800&q=80",
            "is_featured": False,
            "is_active": True
        },
        {
            "name": "Contramuslos Deshuesados",
            "slug": "contramuslos-deshuesados",
            "category_id": cat_contra.id if cat_contra else None,
            "description": "Corte gourmet deshuesado y jugoso, retiene la humedad y condimentos extraordinariamente.",
            "price": 13900.0,
            "unit": "Kg",
            "stock": 45.0,
            "min_stock_alert": 10.0,
            "image_url": "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=800&q=80",
            "is_featured": False,
            "is_active": True
        },
        {
            "name": "Menudencias Seleccionadas (Hígado y Molleja)",
            "slug": "menudencias-seleccionadas",
            "category_id": cat_menu.id if cat_menu else None,
            "description": "Mollejas e hígados frescos y desinfectados para sopas nutritivas tradicionales y patés caseros.",
            "price": 5500.0,
            "unit": "Libra",
            "stock": 35.0,
            "min_stock_alert": 10.0,
            "image_url": "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
            "is_featured": False,
            "is_active": True
        },
        {
            "name": "Huevos Campesinos Triple A (Cubeta x 30)",
            "slug": "huevos-campesinos-triple-a",
            "category_id": cat_otros.id if cat_otros else None,
            "description": "Cubeta de 30 huevos rojos tamaño AAA, yema color naranja intenso y máxima frescura de granja.",
            "price": 18500.0,
            "unit": "Bandeja",
            "stock": 60.0,
            "min_stock_alert": 12.0,
            "image_url": "https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=800&q=80",
            "is_featured": True,
            "is_active": True
        }
    ]

    for p_data in products_data:
        p = db.query(models.Product).filter(models.Product.slug == p_data["slug"]).first()
        if not p:
            new_p = models.Product(**p_data)
            db.add(new_p)
    db.commit()

    # 6. PROVEEDORES
    suppliers_data = [
        {
            "name": "Granja Avícola El Porvenir S.A.S.",
            "contact_name": "Ing. Fernando Morales",
            "phone": "+57 311 234 5678",
            "email": "contacto@granjaporvenir.com",
            "address": "Km 18 Vía Cota - Chía",
            "products_supplied": "Pollos en pie de engorde, pollitos de 1 día",
            "total_purchased": 15400000.0,
            "notes": "Proveedor certificado ICA con estrictos estándares de bioseguridad."
        },
        {
            "name": "NutriAvícola Alimentos Concentrados",
            "contact_name": "Dra. Patricia Gómez",
            "phone": "+57 320 890 1234",
            "email": "ventas@nutriavicola.com",
            "address": "Parque Industrial Mosquera Lote 5",
            "products_supplied": "Alimento iniciación, crecimiento y engorde",
            "total_purchased": 8900000.0,
            "notes": "Entregas semanales con descuento por pronto pago."
        }
    ]

    for s_data in suppliers_data:
        sup = db.query(models.Supplier).filter(models.Supplier.name == s_data["name"]).first()
        if not sup:
            new_sup = models.Supplier(**s_data)
            db.add(new_sup)
    db.commit()

    # 7. REGISTROS FINANCIEROS INICIALES
    if db.query(models.FinanceRecord).count() == 0:
        fin_records = [
            models.FinanceRecord(type=models.FinanceType.INGRESO.value, category="Ventas de Tienda", amount=2850000.0, description="Ventas de pollo al por mayor fin de semana"),
            models.FinanceRecord(type=models.FinanceType.GASTO.value, category="Transporte y Combustible", amount=450000.0, description="Rutas de reparto en furgón refrigerado"),
            models.FinanceRecord(type=models.FinanceType.COMPRA_MATERIA_PRIMA.value, category="Granja El Porvenir", amount=3200000.0, description="Lote de 200 pollos en pie")
        ]
        db.add_all(fin_records)
        db.commit()

    db.close()
    print("✓ Base de datos Neon PostgreSQL sembrada e inicializada con éxito total.")

if __name__ == "__main__":
    seed_database()
