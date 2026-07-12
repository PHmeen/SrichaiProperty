import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL is not set in .env file');
  process.exit(1);
}

// SQL Script containing the 27 tables, inserts, indexes, and RLS
const sql = `
-- เปิดส่วนขยาย UUID สำหรับสุ่มไอดีความปลอดภัยสูง
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. กลุ่มผู้ใช้งาน (User & Access)
-- =========================================================================

-- 1. ตารางสิทธิ์การใช้งาน (Role)
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(10) PRIMARY KEY, -- 'admin', 'agent', 'buyer'
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- แทรกข้อมูลสิทธิ์เริ่มต้น
INSERT INTO roles (id, name) VALUES 
('admin', 'ผู้ดูแลระบบ'),
('agent', 'นายหน้า'),
('buyer', 'ผู้สนใจซื้อ')
ON CONFLICT (id) DO NOTHING;

-- 2. ตารางข้อมูลผู้ใช้งาน (User)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(15),
    profile_image VARCHAR(255),
    role_id VARCHAR(10) REFERENCES roles(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'banned')),
    is_verified BOOLEAN DEFAULT FALSE, -- ยืนยันตัวตน KYC ผ่านแล้วหรือไม่
    plan_type VARCHAR(20) DEFAULT 'basic' CHECK (plan_type IN ('basic', 'pro')),
    plan_expired_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. ตารางประวัติการเข้าสู่ระบบ (LoginHistory)
CREATE TABLE IF NOT EXISTS login_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- =========================================================================
-- 2. กลุ่มอสังหาริมทรัพย์ (Properties)
-- =========================================================================

-- 4. ตารางประเภทอสังหาริมทรัพย์ (PropertyType)
CREATE TABLE IF NOT EXISTS property_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE, -- 'บ้านเดี่ยว', 'ทาวน์โฮม', 'คอนโดมิเนียม'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- แทรกประเภทเริ่มต้น
INSERT INTO property_types (id, name) VALUES 
(1, 'บ้านเดี่ยว'), 
(2, 'ทาวน์โฮม'), 
(3, 'คอนโดมิเนียม')
ON CONFLICT (id) DO NOTHING;

-- 5. ตารางประกาศอสังหาริมทรัพย์ (Property)
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    type_id INTEGER REFERENCES property_types(id) ON DELETE RESTRICT,
    location TEXT NOT NULL,
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    description TEXT,
    bedrooms INTEGER DEFAULT 0,
    bathrooms INTEGER DEFAULT 0,
    area_sqm NUMERIC(8, 2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    agent_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. ตารางรูปภาพอสังหาริมทรัพย์ (PropertyImage)
CREATE TABLE IF NOT EXISTS property_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    image_url VARCHAR(255) NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. ตารางเอกสารสิทธิ์อสังหาริมทรัพย์ (PropertyDocument)
CREATE TABLE IF NOT EXISTS property_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    doc_url VARCHAR(255) NOT NULL,
    doc_type VARCHAR(50), -- 'โฉนดที่ดิน', 'หนังสือมอบอำนาจ'
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. ตารางสิ่งอำนวยความสะดวก (Amenity)
CREATE TABLE IF NOT EXISTS amenities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE, -- 'ฟิตเนส', 'สระว่ายน้ำ', 'ระบบรักษาความปลอดภัย 24 ชม.'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 9. ตารางความสัมพันธ์สิ่งอำนวยความสะดวกกับบ้าน (PropertyAmenity)
CREATE TABLE IF NOT EXISTS property_amenities (
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    amenity_id INTEGER REFERENCES amenities(id) ON DELETE CASCADE,
    PRIMARY KEY (property_id, amenity_id)
);

-- 10. ตารางสถานที่ใกล้เคียง (NearbyPlace)
CREATE TABLE IF NOT EXISTS nearby_places (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50), -- 'โรงเรียน', 'โรงพยาบาล', 'ห้างสรรพสินค้า'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 11. ตารางความสัมพันธ์สถานที่ใกล้เคียงกับบ้าน (PropertyNearby)
CREATE TABLE IF NOT EXISTS property_nearbies (
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    nearby_place_id INTEGER REFERENCES nearby_places(id) ON DELETE CASCADE,
    distance_meters NUMERIC(6, 1), -- ระยะห่าง เช่น 500 เมตร
    PRIMARY KEY (property_id, nearby_place_id)
);


-- =========================================================================
-- 3. กลุ่มนัดหมายและการรีวิว (Appointments & Reviews)
-- =========================================================================

-- 12. ตารางวันและเวลาว่างของนายหน้า (AgentAvailability)
CREATE TABLE IF NOT EXISTS agent_availabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES users(id) ON DELETE CASCADE,
    available_date DATE NOT NULL,
    time_slot VARCHAR(20) CHECK (time_slot IN ('morning', 'afternoon')), -- เช้า (9:00-12:00) / บ่าย (13:00-16:00)
    is_booked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE (agent_id, available_date, time_slot)
);

-- 13. ตารางการนัดหมายเข้าชมบ้าน (Appointment)
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES users(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    time_slot VARCHAR(20) CHECK (time_slot IN ('morning', 'afternoon')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'no-show')),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 14. ตารางรีวิวและความคิดเห็น (Review)
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE UNIQUE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- =========================================================================
-- 4. กลุ่มแชทข้อความ (Messaging)
-- =========================================================================

-- 15. ตารางห้องสนทนา (ChatSession)
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES users(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE (customer_id, agent_id, property_id)
);

-- 16. ตารางข้อความแชท (Message)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    file_url VARCHAR(255),
    latitude NUMERIC(10, 8), -- แนบพิกัด
    longitude NUMERIC(11, 8), -- แนบพิกัด
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 17. ตารางข้อความตอบกลับด่วนของนายหน้า (QuickReplyTemplate)
CREATE TABLE IF NOT EXISTS quick_reply_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- =========================================================================
-- 5. กลุ่มการเงินและระบบโปรโมท (Finance & Marketing)
-- =========================================================================

-- 18. ตารางแพ็กเกจโฆษณา (ListingPackage)
CREATE TABLE IF NOT EXISTS listing_packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE, -- 'Free', 'Silver Boost', 'Gold Boost'
    price NUMERIC(10, 2) NOT NULL,
    max_duration_days INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 19. ตารางการสั่งซื้อแพ็กเกจของนายหน้า (ListingPackageOrder)
CREATE TABLE IF NOT EXISTS listing_package_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    package_id INTEGER REFERENCES listing_packages(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 20. ตารางธุรกรรมการชำระเงิน (PaymentTransaction)
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES listing_package_orders(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50), -- 'QR Code', 'Bank Transfer'
    slip_url VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 21. ตารางการปิดการขายและสถิติ (SaleTransaction)
CREATE TABLE IF NOT EXISTS sale_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    buyer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    final_price NUMERIC(12, 2) NOT NULL,
    commission_rate NUMERIC(4, 2) NOT NULL, -- เช่น 3.00%
    commission_amount NUMERIC(10, 2) NOT NULL,
    transaction_date DATE NOT NULL,
    agreement_file_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 22. ตารางข้อมูลโปรโมชั่นส่วนลด (Promotion)
CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    discount_rate NUMERIC(4, 2), -- ส่วนลดเป็น %
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    code VARCHAR(20) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 23. ตารางป้ายโฆษณาหน้าแรก (BannerCampaign)
CREATE TABLE IF NOT EXISTS banner_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(100) NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    link_url VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'inactive' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- =========================================================================
-- 6. กลุ่มการจัดการและค่าตั้งต้น (Moderation & Configuration)
-- =========================================================================

-- 24. ตารางรายงานปัญหาการใช้งาน (Report)
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reported_property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    reported_agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reason VARCHAR(150) NOT NULL,
    details TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'ignored')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 25. ตารางการแจ้งเตือนภายในเว็บ (Notification)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    type VARCHAR(50), -- 'appointment', 'kyc', 'payment'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 26. ตารางบันทึกประกาศอสังหาริมทรัพย์โปรด (SavedProperty)
CREATE TABLE IF NOT EXISTS saved_properties (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (user_id, property_id)
);

-- 27. ตารางการตั้งค่าส่วนกลางระบบ (SystemConfig)
CREATE TABLE IF NOT EXISTS system_configs (
    key VARCHAR(50) PRIMARY KEY,
    value VARCHAR(255) NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- แทรกข้อมูลระบบเริ่มต้น
INSERT INTO system_configs (key, value, description) VALUES 
('default_commission_rate', '3.0', 'อัตราค่าคอมมิชชั่นขั้นพื้นฐานสำหรับการปิดการขาย (%)'),
('max_free_listings', '3', 'จำนวนการลงประกาศอสังหาฯ ฟรีต่อบัญชีนายหน้า')
ON CONFLICT (key) DO NOTHING;

-- สร้าง Indexes สำหรับการสืบค้นข้อมูลที่บ่อยที่สุด
CREATE INDEX IF NOT EXISTS idx_properties_agent ON properties(agent_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_agent ON appointments(agent_id);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE is_read = false;

-- เปิดใช้งานระบบ RLS สำหรับตารางสำคัญเพื่อความปลอดภัยสูงสุด
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- นโยบาย RLS (ลบอันเดิมออกก่อนถ้ามี เพื่อกันชนกัน)
DROP POLICY IF EXISTS "Public read approved properties" ON properties;
CREATE POLICY "Public read approved properties" ON properties 
    FOR SELECT USING (status = 'approved');

DROP POLICY IF EXISTS "Participants can read messages" ON messages;
CREATE POLICY "Participants can read messages" ON messages 
    FOR ALL USING (
        auth.uid() = sender_id 
        OR auth.uid() IN (
            SELECT customer_id FROM chat_sessions WHERE id = session_id
            UNION
            SELECT agent_id FROM chat_sessions WHERE id = session_id
        )
    );
`;

async function main() {
  console.log('🔄 Connecting to PostgreSQL database...');
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connected successfully.');
    console.log('⏳ Running DDL scripts to create 27 tables, insert default values, create indexes, and enable RLS...');
    await client.query(sql);
    console.log('🎉 Successfully applied database schema!');
  } catch (error) {
    console.error('❌ Error executing SQL script:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
