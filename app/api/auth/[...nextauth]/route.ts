import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("กรุณากรอกอีเมลและรหัสผ่าน");
        }

        const user = await db.users.findUnique({
          where: { email: credentials.email }
        });

        if (!user) {
          throw new Error("ไม่พบบัญชีผู้ใช้งานนี้");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password_hash
        );

        if (!isPasswordValid) {
          throw new Error("รหัสผ่านไม่ถูกต้อง");
        }

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
      // ตรวจสอบเมื่อมีการล็อกอินด้วย Google
      if (account?.provider === "google") {
        if (!user.email) return false;

        // ค้นหาว่าอีเมลนี้มีอยู่ในระบบหรือยัง
        const existingUser = await db.users.findUnique({
          where: { email: user.email }
        });

        if (!existingUser) {
          // หากไม่มี ให้นำชื่อมาแยกเป็น first_name และ last_name เพื่อบันทึกเข้าตาราง users อัตโนมัติ
          const nameParts = (user.name || "").trim().split(/\s+/);
          const firstName = nameParts[0] || "Google";
          const lastName = nameParts.slice(1).join(" ") || "User";

          await db.users.create({
            data: {
              email: user.email,
              password_hash: "", // ล็อกอินผ่านโซเชียลจะไม่มีรหัสผ่าน
              first_name: firstName,
              last_name: lastName,
              profile_image: user.image || null,
              role_id: "buyer", // กำหนดบทบาทเริ่มต้น
              status: "pending", // แก้ไขตรงนี้จาก 'active' เป็น 'pending' ตามข้อจำกัดใน Database
              is_verified: true
            }
          });
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        const u = user as { id: string; role: string; phone?: string | null };
        token.id = u.id;
        token.role = u.role || "buyer";
        token.phone = u.phone || null;
      }
      // ถ้าเป็นการล็อกอินผ่าน Google ให้ไปดึงข้อมูล ID และ Role ล่าสุดจาก DB
      if (account?.provider === "google" && token.email) {
        const dbUser = await db.users.findUnique({
          where: { email: token.email }
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role_id || "buyer";
          token.phone = dbUser.phone || null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const s = session.user as { id: string; role: string; phone?: string | null };
        s.id = token.id as string;
        s.role = token.role as string;
        s.phone = token.phone as string | null;
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
