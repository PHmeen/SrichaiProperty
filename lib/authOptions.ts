import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    //  Provider ที่ 1: ล็อกอินผ่าน Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    //  Provider ที่ 2: ล็อกอินผ่าน Facebook OAuth
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "",
      // ขอสิทธิ์แค่ public_profile (ไม่บังคับขอ email เพราะบางบัญชี FB ไม่มี/ไม่ยอมให้ email)
      authorization: "https://www.facebook.com/v18.0/dialog/oauth?scope=public_profile",
      userinfo: {
        url: "https://graph.facebook.com/me",
        params: { fields: "id,name,picture.width(250).height(250)" },
      },
      // แปลงข้อมูลดิบจาก Facebook ให้อยู่ในรูปแบบที่ NextAuth ต้องการ
      profile(profile) {
        return {
          id: profile.id,
          name: profile.name,
          // ถ้า Facebook ไม่ส่ง email มา ให้สร้าง email ปลอมจาก id เพื่อใช้เป็น key ในระบบ
          email: profile.email || `fb_${profile.id}@facebook.com`,
          image: profile.picture?.data?.url || null,
        };
      },
    }),
    //  Provider ที่ 3: ล็อกอินด้วย Email/Password ของระบบเอง (Credentials)
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      // authorize() คือฟังก์ชันหลักที่ถูกเรียกทุกครั้งที่กด "เข้าสู่ระบบ" ด้วย email/password
      // ทำหน้าที่ตรวจสอบสิทธิ์ ถ้าไม่ผ่านให้ throw Error (ข้อความจะไปโชว์ที่หน้า login ฝั่ง client)
      async authorize(credentials) {
        // 1. เช็คว่ากรอกข้อมูลมาครบหรือไม่
        if (!credentials?.email || !credentials?.password) {
          throw new Error("กรุณากรอกอีเมลและรหัสผ่าน");
        }

        // 2. หา user จากอีเมลในฐานข้อมูล
        const user = await db.users.findUnique({
          where: { email: credentials.email }
        });

        if (!user) {
          throw new Error("ไม่พบบัญชีผู้ใช้งานนี้");
        }

        // 3. เทียบรหัสผ่านที่กรอกกับ hash ที่เก็บไว้ (ไม่เคยเก็บรหัสผ่านตัวจริงในฐานข้อมูล)
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password_hash
        );

        if (!isPasswordValid) {
          throw new Error("รหัสผ่านไม่ถูกต้อง");
        }

        // 4. กันไม่ให้นายหน้า (agent) ที่แอดมินยังไม่อนุมัติ (status = pending) เข้าระบบได้
        if (user.role_id === 'agent' && user.status === 'pending') {
          throw new Error("บัญชีนายหน้าของคุณอยู่ระหว่างรอแอดมินตรวจสอบและอนุมัติ");
        }

        // 5. กันบัญชีที่ถูกแบน
        if (user.status === 'banned') {
          throw new Error("บัญชีของคุณถูกระงับการใช้งาน");
        }

        // 6. บันทึกประวัติการเข้าสู่ระบบลงฐานข้อมูลจริง (login_histories)
        // ใช้ .catch() เพื่อไม่ให้การบันทึก log ล้มเหลวแล้วไปทำให้ login ทั้งหมดล้มเหลวไปด้วย
        await db.login_histories.create({
          data: {
            user_id: user.id,
            ip_address: "credentials-login",
            user_agent: "NextAuth/CredentialsProvider"
          }
        }).catch(err => console.error("Error writing login history:", err));

        // 7. ผ่านทุกเงื่อนไข -> คืนข้อมูล user กลับไปให้ NextAuth เก็บต่อใน jwt callback
        return {
          id: user.id,
          email: user.email,
          name: `${user.first_name} ${user.last_name}`,
          role: user.role_id || "customer",
          phone: user.phone,
          status: user.status || "pending"
        };
      }
    })
  ],
  callbacks: {
    //  signIn callback: รันเฉพาะตอนล็อกอินผ่าน Google/Facebook (OAuth)
    // ใช้เช็ค/สร้าง user ในฐานข้อมูลของเราเอง เพราะ Google/Facebook ไม่รู้จัก role, status ของระบบเรา
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "facebook") {
        // Facebook อาจไม่มี email มาด้วย จึงต้อง fallback เป็น email ปลอมจาก user.id
        const userEmail = user.email || (user.id ? `fb_${user.id}@facebook.com` : null);
        if (!userEmail) {
          console.error('Facebook login: no email and no user.id');
          return false; // return false = ปฏิเสธการล็อกอิน
        }
        user.email = userEmail;

        // เช็คว่า email นี้มีอยู่ในฐานข้อมูลเราแล้วหรือยัง
        const existingUser = await db.users.findUnique({
          where: { email: userEmail }
        });

        // ถ้ายังไม่มี -> เป็นการล็อกอินครั้งแรกด้วย social -> สร้าง user ใหม่อัตโนมัติ
        if (!existingUser) {
          const nameParts = (user.name || "").trim().split(/\s+/);
          const firstName = nameParts[0] || (account.provider === "google" ? "Google" : "Facebook");
          const lastName = nameParts.slice(1).join(" ") || "User";

          await db.users.create({
            data: {
              email: userEmail,
              password_hash: "", // ไม่มีรหัสผ่าน เพราะล็อกอินผ่าน social เท่านั้น
              first_name: firstName,
              last_name: lastName,
              profile_image: user.image || null,
              role_id: "customer", // social login ได้ role ลูกค้าเสมอ (ไม่ใช่ agent/admin)
              status: "approved", // ถือว่ายืนยันตัวตนแล้วผ่าน Google/Facebook จึง approve ทันที
              is_verified: true
            }
          });
        }
      }
      return true; // true = อนุญาตให้ล็อกอินผ่าน
    },
    //  jwt callback: รันทุกครั้งที่มีการสร้าง/ต่ออายุ JWT token
    // หน้าที่คือ "ยัด" ข้อมูลสำคัญ (id, role, phone, status) เข้าไปเก็บไว้ใน token
    async jwt({ token, user, account }) {
      // กรณีนี้คือ "เพิ่งล็อกอินสำเร็จ" (user มาจาก authorize() หรือ profile() ของ provider)
      if (user) {
        const u = user as { id: string; role: string; phone?: string | null; image?: string | null; status?: string | null };
        token.id = u.id;
        token.role = u.role || "customer";
        token.phone = u.phone || null;
        token.picture = u.image || null;
        token.status = u.status || "pending";
      }
      // กรณีล็อกอินผ่าน social: ข้อมูลจาก provider ไม่มี role/status ของเรา
      // ต้อง query ฐานข้อมูลอีกครั้งเพื่อเอาข้อมูลจริงมาแทนที่ในทุกครั้งที่ token ถูกสร้าง/ต่ออายุ
      if ((account?.provider === "google" || account?.provider === "facebook") && token.email) {
        const dbUser = await db.users.findUnique({
          where: { email: token.email }
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role_id || "customer";
          token.phone = dbUser.phone || null;
          token.picture = dbUser.profile_image || token.picture || null;
          token.status = dbUser.status || "pending";
        }
      }
      return token;
    },
    //  session callback: รันเมื่อฝั่ง client เรียก useSession() หรือ /api/auth/session
    // หน้าที่คือเอาข้อมูลจาก token มาแปะใส่ session.user เพื่อให้ frontend อ่าน role ได้
    async session({ session, token }) {
      if (session.user) {
        const s = session.user as { id: string; role: string; phone?: string | null; image?: string | null; status?: string | null };
        s.id = token.id as string;
        s.role = token.role as string; // <-- ค่านี้แหละที่หน้า login เอาไปเช็คว่าจะ redirect ไปไหน
        s.phone = token.phone as string | null;
        s.status = token.status as string | null;
        session.user.image = token.picture as string | null;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login", // ถ้า NextAuth ต้องการให้ล็อกอิน จะพาไปหน้านี้
  },
  session: {
    strategy: "jwt", // เก็บ session เป็น JWT (ไม่ผูกกับฐานข้อมูล session table)
    maxAge: 60 * 60 * 8, // อายุ session = 8 ชั่วโมง (ลด exposure window ถ้า JWT ถูกขโมย)
  },
  secret: process.env.NEXTAUTH_SECRET, // key ลับใช้เข้ารหัส/ตรวจสอบ JWT
};
