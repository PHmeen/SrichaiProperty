// === ระบบล็อกอิน (NextAuth Configuration) ===
// ไฟล์นี้ทำหน้าที่ตั้งค่าการยืนยันตัวตนสำหรับผู้ใช้ เช่น ล็อกอินด้วย Google, Facebook หรือกรอกอีเมล/รหัสผ่านปกติ

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

const handler = NextAuth({
  providers: [
    // 1. ระบบล็อกอินด้วย Google
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    
    // 2. ระบบล็อกอินด้วย Facebook
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "",
      // บังคับขอเฉพาะสิทธิ์ข้อมูลสาธารณะ (public_profile) เพื่อไม่ให้ติดบล็อกจาก Facebook
      authorization: "https://www.facebook.com/v18.0/dialog/oauth?scope=public_profile",
      userinfo: {
        url: "https://graph.facebook.com/me",
        params: { fields: "id,name,picture.width(250).height(250)" },
      },
      // ฟังก์ชันสำหรับแปลงข้อมูลจาก Facebook ไปเก็บในระบบล็อกอิน
      profile(profile) {
        return {
          id: profile.id,
          name: profile.name,
          email: profile.email || `fb_${profile.id}@facebook.com`, // สร้างอีเมลจำลองกรณีเฟสบุ๊คไม่ส่งอีเมลมา
          image: profile.picture?.data?.url || null, // ดึงลิงก์รูปภาพโปรไฟล์
        };
      },
    }),
    
    // 3. ระบบล็อกอินด้วย อีเมล และ รหัสผ่าน (Credentials)
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      // ฟังก์ชันตรวจสอบความถูกต้องของรหัสผ่านในฐานข้อมูล
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("กรุณากรอกอีเมลและรหัสผ่าน");
        }

        // ค้นหาผู้ใช้จากอีเมลในฐานข้อมูล PostgreSQL
        const user = await db.users.findUnique({
          where: { email: credentials.email }
        });

        if (!user) {
          throw new Error("ไม่พบบัญชีผู้ใช้งานนี้");
        }

        // ถอดรหัสลับและตรวจสอบรหัสผ่านว่าตรงกันหรือไม่
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password_hash
        );

        if (!isPasswordValid) {
          throw new Error("รหัสผ่านไม่ถูกต้อง");
        }

        // ส่งข้อมูลผู้ใช้กลับไปให้ระบบล็อกอินจำไว้
        return {
          id: user.id,
          email: user.email,
          name: `${user.first_name} ${user.last_name}`,
          role: user.role_id || "buyer",
          phone: user.phone
        };
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      // ตรวจสอบเมื่อมีการล็อกอินด้วย Google หรือ Facebook
      if (account?.provider === "google" || account?.provider === "facebook") {
        // หากเป็นการล็อกอินผ่าน Facebook ที่ไม่มีสิทธิ์ email ให้สร้าง synthetic email ปลอดภัยระดับ ID
        const userEmail = user.email || `fb_${user.id || Date.now()}@facebook.com`;
        user.email = userEmail;

        // ค้นหาว่าอีเมลนี้มีอยู่ในระบบหรือยัง
        const existingUser = await db.users.findUnique({
          where: { email: userEmail }
        });

        if (!existingUser) {
          // หากไม่มี ให้นำชื่อมาแยกเป็น first_name และ last_name เพื่อบันทึกเข้าตาราง users อัตโนมัติ
          const nameParts = (user.name || "").trim().split(/\s+/);
          const firstName = nameParts[0] || (account.provider === "google" ? "Google" : "Facebook");
          const lastName = nameParts.slice(1).join(" ") || "User";

          await db.users.create({
            data: {
              email: userEmail,
              password_hash: "", // ล็อกอินผ่านโซเชียลจะไม่มีรหัสผ่าน
              first_name: firstName,
              last_name: lastName,
              profile_image: user.image || null,
              role_id: "buyer", // กำหนดบทบาทเริ่มต้น
              status: "pending", // ยืนยันรอก่อน
              is_verified: true
            }
          });
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        const u = user as { id: string; role: string; phone?: string | null; image?: string | null };
        token.id = u.id;
        token.role = u.role || "buyer";
        token.phone = u.phone || null;
        token.picture = u.image || null;
      }
      // ถ้าเป็นการล็อกอินผ่าน Google หรือ Facebook ให้ไปดึงข้อมูล ID และ Role ล่าสุดจาก DB
      if ((account?.provider === "google" || account?.provider === "facebook") && token.email) {
        const dbUser = await db.users.findUnique({
          where: { email: token.email }
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role_id || "buyer";
          token.phone = dbUser.phone || null;
          token.picture = dbUser.profile_image || token.picture || null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const s = session.user as { id: string; role: string; phone?: string | null; image?: string | null };
        s.id = token.id as string;
        s.role = token.role as string;
        s.phone = token.phone as string | null;
        session.user.image = token.picture as string | null;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
