import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "",
      authorization: "https://www.facebook.com/v18.0/dialog/oauth?scope=public_profile",
      userinfo: {
        url: "https://graph.facebook.com/me",
        params: { fields: "id,name,picture.width(250).height(250)" },
      },
      profile(profile) {
        return {
          id: profile.id,
          name: profile.name,
          email: profile.email || `fb_${profile.id}@facebook.com`,
          image: profile.picture?.data?.url || null,
        };
      },
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

        if (user.role_id === 'agent' && user.status === 'pending') {
          throw new Error("บัญชีนายหน้าของคุณอยู่ระหว่างรอแอดมินตรวจสอบและอนุมัติ");
        }

        if (user.status === 'banned') {
          throw new Error("บัญชีของคุณถูกระงับการใช้งาน");
        }

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
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "facebook") {
        const userEmail = user.email || `fb_${user.id || Date.now()}@facebook.com`;
        user.email = userEmail;

        const existingUser = await db.users.findUnique({
          where: { email: userEmail }
        });

        if (!existingUser) {
          const nameParts = (user.name || "").trim().split(/\s+/);
          const firstName = nameParts[0] || (account.provider === "google" ? "Google" : "Facebook");
          const lastName = nameParts.slice(1).join(" ") || "User";

          await db.users.create({
            data: {
              email: userEmail,
              password_hash: "",
              first_name: firstName,
              last_name: lastName,
              profile_image: user.image || null,
              role_id: "customer",
              status: "approved",
              is_verified: true
            }
          });
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        const u = user as { id: string; role: string; phone?: string | null; image?: string | null; status?: string | null };
        token.id = u.id;
        token.role = u.role || "customer";
        token.phone = u.phone || null;
        token.picture = u.image || null;
        token.status = u.status || "pending";
      }
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
    async session({ session, token }) {
      if (session.user) {
        const s = session.user as { id: string; role: string; phone?: string | null; image?: string | null; status?: string | null };
        s.id = token.id as string;
        s.role = token.role as string;
        s.phone = token.phone as string | null;
        s.status = token.status as string | null;
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
};
