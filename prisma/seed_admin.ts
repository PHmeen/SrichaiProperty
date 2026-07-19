import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Creating default admin account...");
  
  const email = "admin@srichaiproperty.com";
  const password = "adminpassword123";
  const passwordHash = await bcrypt.hash(password, 10);

  const adminUser = await prisma.users.upsert({
    where: { email },
    update: {
      role_id: "admin",
      status: "approved",
      is_verified: true,
    },
    create: {
      email,
      password_hash: passwordHash,
      first_name: "Srichai",
      last_name: "Admin",
      phone: "0899999999",
      role_id: "admin",
      status: "approved",
      is_verified: true,
    }
  });

  console.log("✅ Admin account created successfully!");
  console.log("📧 Email:", adminUser.email);
  console.log("🔑 Password:", password);
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
