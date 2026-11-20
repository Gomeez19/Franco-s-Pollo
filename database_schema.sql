-- ==============================================================================
-- PROYECTO: FRANCO'S POLLO – ESQUEMA DE BASE DE DATOS COMPLETO
-- Compatible con: PostgreSQL / Supabase / SQLite
-- ==============================================================================

-- 1. TABLA: USUARIOS Y CLIENTES (users)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address VARCHAR(255),
    neighborhood VARCHAR(100),
    city VARCHAR(100) DEFAULT 'Bogotá',
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. TABLA: CATEGORÍAS DE PRODUCTOS (categories)
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'drumstick',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA: PRODUCTOS Y CORTES AVÍCOLAS (products)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(50) NOT NULL DEFAULT 'Kg',
    stock NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    min_stock_alert NUMERIC(10, 2) DEFAULT 10.00,
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

-- 4. TABLA: MOVIMIENTOS DE INVENTARIO / KARDEX (inventory_movements)
CREATE TABLE IF NOT EXISTS inventory_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    movement_type VARCHAR(50) NOT NULL, -- 'Entrada', 'Salida por Venta', 'Pérdida / Merma', 'Ajuste manual'
    quantity NUMERIC(10, 2) NOT NULL,
    previous_stock NUMERIC(10, 2) NOT NULL,
    new_stock NUMERIC(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_movements_product ON inventory_movements(product_id);

-- 5. TABLA: PEDIDOS Y VENTAS (orders)
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_code VARCHAR(50) NOT NULL UNIQUE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    shipping_address VARCHAR(255) NOT NULL,
    shipping_neighborhood VARCHAR(100) NOT NULL,
    shipping_city VARCHAR(100) DEFAULT 'Bogotá',
    notes TEXT,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Pendiente' CHECK (status IN (
        'Pendiente', 'Confirmado', 'En preparación', 'Listo', 'En camino', 'Entregado', 'Cancelado'
    )),
    payment_method VARCHAR(50) DEFAULT 'Pago contra entrega' CHECK (payment_method IN (
        'Efectivo', 'Transferencia bancaria', 'Pago contra entrega'
    )),
    is_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_code ON orders(order_code);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);

-- 6. TABLA: DETALLE DE PEDIDOS (order_items)
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    product_name VARCHAR(200) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    unit VARCHAR(50) DEFAULT 'Kg'
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- 7. TABLA: PROVEEDORES AVÍCOLAS (suppliers)
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address VARCHAR(255),
    products_supplied TEXT,
    total_purchased NUMERIC(14, 2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABLA: REGISTROS FINANCIEROS Y COSTOS (finance_records)
CREATE TABLE IF NOT EXISTS finance_records (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Ingreso', 'Gasto', 'Compra Materia Prima')),
    category VARCHAR(100) NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    description TEXT,
    reference VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. TABLA: CÁLCULOS GUARDADOS DE LA CALCULADORA INTELIGENTE (price_calculations)
CREATE TABLE IF NOT EXISTS price_calculations (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    mode VARCHAR(50) NOT NULL CHECK (mode IN ('crianza', 'comercializacion')),
    inputs_json TEXT NOT NULL,
    results_json TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. TABLA: CONFIGURACIÓN GENERAL DEL NEGOCIO (business_settings)
CREATE TABLE IF NOT EXISTS business_settings (
    id SERIAL PRIMARY KEY,
    business_name VARCHAR(255) DEFAULT 'FRANCO''S POLLO',
    tagline VARCHAR(255) DEFAULT 'Calidad, Frescura y el Mejor Sabor en Productos Avícolas',
    phone VARCHAR(50) DEFAULT '+57 315 889 9000',
    whatsapp VARCHAR(50) DEFAULT '573158899000',
    email VARCHAR(255) DEFAULT 'pedidos@francospollo.com',
    address VARCHAR(255) DEFAULT 'Bodega 14, Frigorífico Central de Carnes',
    city VARCHAR(100) DEFAULT 'Bogotá, Colombia',
    schedule VARCHAR(255) DEFAULT 'Lunes a Sábado: 6:00 AM - 6:00 PM | Domingos: 7:00 AM - 2:00 PM',
    currency VARCHAR(10) DEFAULT 'COP',
    delivery_fee_default NUMERIC(10, 2) DEFAULT 5000.00,
    free_delivery_threshold NUMERIC(10, 2) DEFAULT 60000.00,
    payment_methods_enabled VARCHAR(255) DEFAULT 'Efectivo, Transferencia bancaria, Pago contra entrega',
    commercial_terms TEXT DEFAULT 'Garantía de frescura. Cadena de frío ininterrumpida. Pesaje verificado al momento del despacho.'
);

-- ==============================================================================
-- INSERCIÓN DE DATOS INICIALES (SEED DATA)
-- ==============================================================================

-- 1. Insertar Configuración
INSERT INTO business_settings (id, business_name, tagline, phone, whatsapp, email, address, city, schedule, currency, delivery_fee_default, free_delivery_threshold)
VALUES (1, 'FRANCO''S POLLO', 'Frescura Garantizada de la Granja a su Hogar y Restaurante', '+57 315 889 9000', '573158899000', 'pedidos@francospollo.com', 'Bodega 14, Frigorífico Central de Carnes', 'Bogotá, Colombia', 'Lunes a Sábado: 6:00 AM - 6:00 PM | Domingos: 7:00 AM - 2:00 PM', 'COP', 5000.00, 60000.00)
ON CONFLICT (id) DO NOTHING;

-- 2. Insertar Categorías
INSERT INTO categories (id, name, slug, icon, description) VALUES
(1, 'Pollo Entero', 'pollo-entero', 'bird', 'Pollo campesino y semicriollo entero, limpio y eviscerado'),
(2, 'Pechuga', 'pechuga', 'shield', 'Pechuga entera, fileteada y porcionada de la más alta calidad'),
(3, 'Alas', 'alas', 'feather', 'Alitas tiernas y carnosas para asados, broaster o BBQ'),
(4, 'Muslos', 'muslos', 'drumstick', 'Muslitos jugosos, tiernos y frescos'),
(5, 'Piernas Pernil', 'piernas-pernil', 'bone', 'Pierna pernil completa, excelente rendimiento y sabor'),
(6, 'Contramuslos', 'contramuslos', 'package', 'Contramuslos ideales para guisos, fritos y al horno'),
(7, 'Menudencias', 'menudencias', 'heart', 'Mollejas, hígados y corazones frescos'),
(8, 'Otros Productos Avícolas', 'otros-productos', 'sparkles', 'Huevos AA, adobados especiales y cortes gourmet')
ON CONFLICT (id) DO NOTHING;

-- 3. Insertar Productos Iniciales
INSERT INTO products (id, category_id, name, slug, description, price, unit, stock, min_stock_alert, image_url, is_featured, is_active) VALUES
(1, 1, 'Pollo Entero Campesino Fresco', 'pollo-entero-campesino-fresco', 'Pollo fresco de granja criado naturalmente, eviscerado y limpio, listo para hornear o sancocho. Peso promedio 2.2 - 2.5 Kg.', 23500.00, 'Unidad', 85.00, 15.00, 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=800&q=80', TRUE, TRUE),
(2, 2, 'Pechuga Entera sin Piel', 'pechuga-entera-sin-piel', 'Pechuga de pollo 100% magra, limpia de grasa y sin piel. Máxima ternura y rendimiento para tus recetas.', 14900.00, 'Kg', 120.00, 20.00, 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=800&q=80', TRUE, TRUE),
(3, 2, 'Filete de Pechuga Porcionado', 'filete-de-pechuga-porcionado', 'Filetes delgados y uniformes listos para la plancha, apanar o ensaladas saludables.', 16500.00, 'Kg', 95.00, 15.00, 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80', TRUE, TRUE),
(4, 3, 'Alitas de Pollo Seleccionadas', 'alitas-de-pollo-seleccionadas', 'Alas completas frescas (muslito y ala), ideales para parrilladas familiares, salsas BBQ y fritura crujiente.', 11800.00, 'Kg', 140.00, 25.00, 'https://images.unsplash.com/photo-1527477378370-5b65f7c35586?auto=format&fit=crop&w=800&q=80', TRUE, TRUE),
(5, 5, 'Pierna Pernil con Rabadilla', 'pierna-pernil-con-rabadilla', 'Corte tradicional muy jugoso y con abundante carne. Perfecto para asados y almuerzos cotidianos.', 8900.00, 'Kg', 110.00, 20.00, 'https://images.unsplash.com/photo-1594221708779-94832f4320d1?auto=format&fit=crop&w=800&q=80', TRUE, TRUE),
(6, 4, 'Muslos de Pollo Frescos', 'muslos-de-pollo-frescos', 'Muslitos de pollo tiernos, ideales para los niños y preparaciones al curry o guisados.', 9500.00, 'Kg', 70.00, 15.00, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=800&q=80', FALSE, TRUE),
(7, 6, 'Contramuslos Deshuesados', 'contramuslos-deshuesados', 'Corte gourmet deshuesado y jugoso, retiene la humedad y condimentos extraordinariamente.', 13900.00, 'Kg', 45.00, 10.00, 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=800&q=80', FALSE, TRUE),
(8, 7, 'Menudencias Seleccionadas (Hígado y Molleja)', 'menudencias-seleccionadas', 'Mollejas e hígados frescos y desinfectados para sopas nutritivas tradicionales y patés caseros.', 5500.00, 'Libra', 35.00, 10.00, 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80', FALSE, TRUE),
(9, 8, 'Huevos Campesinos Triple A (Cubeta x 30)', 'huevos-campesinos-triple-a', 'Cubeta de 30 huevos rojos tamaño AAA, yema color naranja intenso y máxima frescura de granja.', 18500.00, 'Bandeja', 60.00, 12.00, 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=800&q=80', TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 4. Insertar Proveedores
INSERT INTO suppliers (name, contact_name, phone, email, address, products_supplied, total_purchased, notes) VALUES
('Granja Avícola El Porvenir S.A.S.', 'Ing. Fernando Morales', '+57 311 234 5678', 'contacto@granjaporvenir.com', 'Km 18 Vía Cota - Chía', 'Pollos en pie de engorde, pollitos de 1 día', 15400000.00, 'Proveedor certificado ICA con estrictos estándares de bioseguridad.'),
('NutriAvícola Alimentos Concentrados', 'Dra. Patricia Gómez', '+57 320 890 1234', 'ventas@nutriavicola.com', 'Parque Industrial Mosquera Lote 5', 'Alimento iniciación, crecimiento y engorde', 8900000.00, 'Entregas semanales con descuento por pronto pago.');
