-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "roles" (
    "id" VARCHAR(10) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(15),
    "profile_image" VARCHAR(255),
    "role_id" VARCHAR(10),
    "status" VARCHAR(20) DEFAULT 'pending',
    "is_verified" BOOLEAN DEFAULT false,
    "plan_type" VARCHAR(20) DEFAULT 'basic',
    "plan_expired_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),
    "line_id" VARCHAR(50),
    "experience" VARCHAR(50),
    "specialty_zone" VARCHAR(150),
    "specialty_type" VARCHAR(50),
    "kyc_doc" VARCHAR(255),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_availabilities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agent_id" UUID,
    "available_date" DATE NOT NULL,
    "time_slot" VARCHAR(20),
    "is_booked" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "agent_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_histories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "login_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_types" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "property_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(150) NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "type_id" INTEGER,
    "location" TEXT NOT NULL,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "description" TEXT,
    "bedrooms" INTEGER DEFAULT 0,
    "bathrooms" INTEGER DEFAULT 0,
    "area_sqm" DECIMAL(8,2),
    "status" VARCHAR(20) DEFAULT 'pending',
    "agent_id" UUID,
    "province_id" INTEGER,
    "amphure_id" INTEGER,
    "district_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID,
    "image_url" VARCHAR(255) NOT NULL,
    "order_index" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "property_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID,
    "doc_url" VARCHAR(255) NOT NULL,
    "doc_type" VARCHAR(50),
    "status" VARCHAR(20) DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "property_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amenities" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_amenities" (
    "property_id" UUID NOT NULL,
    "amenity_id" INTEGER NOT NULL,

    CONSTRAINT "property_amenities_pkey" PRIMARY KEY ("property_id","amenity_id")
);

-- CreateTable
CREATE TABLE "nearby_places" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "type" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "nearby_places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_nearbies" (
    "property_id" UUID NOT NULL,
    "nearby_place_id" INTEGER NOT NULL,
    "distance_meters" DECIMAL(6,1),

    CONSTRAINT "property_nearbies_pkey" PRIMARY KEY ("property_id","nearby_place_id")
);

-- CreateTable
CREATE TABLE "saved_properties" (
    "user_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "saved_properties_pkey" PRIMARY KEY ("user_id","property_id")
);

-- CreateTable
CREATE TABLE "provinces" (
    "id" INTEGER NOT NULL,
    "name_th" VARCHAR(150) NOT NULL,
    "name_en" VARCHAR(150) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "provinces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amphures" (
    "id" INTEGER NOT NULL,
    "name_th" VARCHAR(150) NOT NULL,
    "name_en" VARCHAR(150) NOT NULL,
    "province_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "amphures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts" (
    "id" INTEGER NOT NULL,
    "name_th" VARCHAR(150) NOT NULL,
    "name_en" VARCHAR(150) NOT NULL,
    "zip_code" INTEGER NOT NULL,
    "amphure_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID,
    "agent_id" UUID,
    "property_id" UUID,
    "appointment_date" DATE NOT NULL,
    "time_slot" VARCHAR(20),
    "status" VARCHAR(20) DEFAULT 'pending',
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "appointment_id" UUID,
    "rating" INTEGER,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID,
    "agent_id" UUID,
    "property_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID,
    "sender_id" UUID,
    "content" TEXT,
    "file_url" VARCHAR(255),
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quick_reply_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agent_id" UUID,
    "title" VARCHAR(100) NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "quick_reply_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_packages" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "max_duration_days" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "listing_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_package_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID,
    "package_id" INTEGER,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" VARCHAR(20) DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "listing_package_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_method" VARCHAR(50),
    "slip_url" VARCHAR(255),
    "status" VARCHAR(20) DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID,
    "agent_id" UUID,
    "buyer_id" UUID,
    "final_price" DECIMAL(12,2) NOT NULL,
    "commission_rate" DECIMAL(4,2) NOT NULL,
    "commission_amount" DECIMAL(10,2) NOT NULL,
    "transaction_date" DATE NOT NULL,
    "agreement_file_url" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "sale_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "title" VARCHAR(150) NOT NULL,
    "content" TEXT NOT NULL,
    "is_read" BOOLEAN DEFAULT false,
    "type" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reporter_id" UUID,
    "reported_property_id" UUID,
    "reported_agent_id" UUID,
    "reason" VARCHAR(150) NOT NULL,
    "details" TEXT,
    "status" VARCHAR(20) DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banner_campaigns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(100) NOT NULL,
    "image_url" VARCHAR(255) NOT NULL,
    "link_url" VARCHAR(255),
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" VARCHAR(20) DEFAULT 'inactive',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "banner_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "discount_rate" DECIMAL(4,2),
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "code" VARCHAR(20),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configs" (
    "key" VARCHAR(50) NOT NULL,
    "value" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "agent_availabilities_agent_id_available_date_time_slot_key" ON "agent_availabilities"("agent_id", "available_date", "time_slot");

-- CreateIndex
CREATE UNIQUE INDEX "property_types_name_key" ON "property_types"("name");

-- CreateIndex
CREATE INDEX "idx_properties_agent" ON "properties"("agent_id");

-- CreateIndex
CREATE INDEX "idx_properties_status" ON "properties"("status");

-- CreateIndex
CREATE INDEX "idx_properties_province" ON "properties"("province_id");

-- CreateIndex
CREATE INDEX "idx_properties_amphure" ON "properties"("amphure_id");

-- CreateIndex
CREATE INDEX "idx_properties_district" ON "properties"("district_id");

-- CreateIndex
CREATE UNIQUE INDEX "amenities_name_key" ON "amenities"("name");

-- CreateIndex
CREATE INDEX "idx_amphures_province" ON "amphures"("province_id");

-- CreateIndex
CREATE INDEX "idx_districts_amphure" ON "districts"("amphure_id");

-- CreateIndex
CREATE INDEX "idx_appointments_agent" ON "appointments"("agent_id");

-- CreateIndex
CREATE INDEX "idx_appointments_customer" ON "appointments"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_appointment_id_key" ON "reviews"("appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_sessions_customer_id_agent_id_property_id_key" ON "chat_sessions"("customer_id", "agent_id", "property_id");

-- CreateIndex
CREATE INDEX "idx_messages_session" ON "messages"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "listing_packages_name_key" ON "listing_packages"("name");

-- CreateIndex
CREATE INDEX "idx_notifications_user_unread" ON "notifications"("user_id") WHERE (is_read = false);

-- CreateIndex
CREATE UNIQUE INDEX "promotions_code_key" ON "promotions"("code");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agent_availabilities" ADD CONSTRAINT "agent_availabilities_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "login_histories" ADD CONSTRAINT "login_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "property_types"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_amphure_id_fkey" FOREIGN KEY ("amphure_id") REFERENCES "amphures"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "property_images" ADD CONSTRAINT "property_images_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "property_documents" ADD CONSTRAINT "property_documents_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "property_amenities" ADD CONSTRAINT "property_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "property_amenities" ADD CONSTRAINT "property_amenities_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "property_nearbies" ADD CONSTRAINT "property_nearbies_nearby_place_id_fkey" FOREIGN KEY ("nearby_place_id") REFERENCES "nearby_places"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "property_nearbies" ADD CONSTRAINT "property_nearbies_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "saved_properties" ADD CONSTRAINT "saved_properties_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "saved_properties" ADD CONSTRAINT "saved_properties_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "amphures" ADD CONSTRAINT "amphures_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "districts" ADD CONSTRAINT "districts_amphure_id_fkey" FOREIGN KEY ("amphure_id") REFERENCES "amphures"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quick_reply_templates" ADD CONSTRAINT "quick_reply_templates_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "listing_package_orders" ADD CONSTRAINT "listing_package_orders_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "listing_packages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "listing_package_orders" ADD CONSTRAINT "listing_package_orders_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "listing_package_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sale_transactions" ADD CONSTRAINT "sale_transactions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sale_transactions" ADD CONSTRAINT "sale_transactions_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sale_transactions" ADD CONSTRAINT "sale_transactions_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_agent_id_fkey" FOREIGN KEY ("reported_agent_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_property_id_fkey" FOREIGN KEY ("reported_property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
