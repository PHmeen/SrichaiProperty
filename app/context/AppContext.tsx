'use client';

/**
 * AppContext.tsx - ไฟล์จัดการสถานะของแอปพลิเคชัน (Global State Management)
 * เหมาะสำหรับมือใหม่: ไฟล์นี้เปรียบเสมือน "ฐานข้อมูลจำลอง" ในหน้าบ้าน (Client-side Database)
 * ทำให้หน้าเว็บแต่ละหน้า (เช่น หน้าแรก หน้าค้นหา หน้านัดหมาย และหน้าแชท) สามารถส่งต่อข้อมูลหากันได้จริง
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

// === 1. กำหนดรูปแบบข้อมูล (TypeScript Interfaces) ===
// ช่วยให้มือใหม่เขียนโค้ดได้ง่ายขึ้นเพราะบราวเซอร์จะคอยบอกใบ้ตัวสะกดของตัวแปรต่างๆ ให้

// รูปแบบข้อมูลของ อสังหาริมทรัพย์ (บ้าน คอนโด ฯลฯ)
export interface Property {
  id: number;
  title: string;       // ชื่อบ้าน/โครงการ
  price: string;       // ราคา
  type: string;        // ประเภท เช่น บ้านเดี่ยว, คอนโด
  tag: string;         // แท็ก เช่น ขายด่วน, โครงการใหม่
  tagBg: string;       // สีพื้นหลังของแท็ก
  location: string;    // ที่ตั้ง
  bedrooms: number;    // จำนวนห้องนอน
  bathrooms: number;   // จำนวนห้องน้ำ
  area: number;        // พื้นที่ใช้สอย (ตร.ม.)
  image: string;       // ลิงก์รูปภาพ
  agentName: string;   // ชื่อตัวแทนนายหน้า
  agentImage: string;  // รูปภาพของตัวแทนนายหน้า
  isPremium?: boolean; // ทรัพย์พิเศษ/แนะนำหรือไม่
}

// รูปแบบข้อมูลของ การนัดหมายชมบ้าน
export interface Appointment {
  id: number;
  propertyId: number | string;
  date: string;        // วันที่นัด
  timeSlot: string;    // ช่วงเวลาที่นัด
  note: string;        // ข้อความเพิ่มเติม
  status: 'upcoming' | 'past' | 'cancelled' | 'pending'; // สถานะ: กำลังมาถึง, ผ่านมาแล้ว, ยกเลิกแล้ว, รอยืนยัน
  propertyName: string;
  propertyPrice: string;
  propertyImage: string;
  propertyType: string;
  agentName: string;
  agentImage: string;
}

// รูปแบบข้อความในห้องแชท
export interface ChatMessage {
  id: number;
  sender: 'user' | 'agent'; // ผู้ส่ง: ลูกค้า (user) หรือนายหน้า (agent)
  text: string;             // ข้อความ
  time: string;             // เวลาที่ส่ง
}

// รูปแบบของเซสชันการแชท (กล่องข้อความที่มีกับนายหน้าแต่ละคน)
export interface ChatSession {
  id: number;
  name: string;
  avatar: string;
  isActive: boolean;
  lastMessage: string;
  time: string;
  messages: ChatMessage[];
}

// รูปแบบข้อมูลโปรไฟล์ผู้ใช้งาน
export interface Profile {
  fullName: string;
  phone: string;
  email: string;
  role: 'buyer' | 'agent' | 'admin'; // บทบาท: ผู้ซื้อ, นายหน้า, หรือผู้ดูแลระบบ
}

// === 2. กำหนดเมธอดและตัวแปรที่จะแชร์ไปทุกหน้า (Context Interface) ===
interface AppContextType {
  properties: Property[];
  favorites: number[];
  appointments: Appointment[];
  chatSessions: ChatSession[];
  profile: Profile;
  addProperty: (property: Omit<Property, 'id'>) => void;
  toggleFavorite: (id: number) => void;
  addAppointment: (appointment: Omit<Appointment, 'id' | 'status' | 'propertyName' | 'propertyPrice' | 'propertyImage' | 'propertyType' | 'agentName' | 'agentImage'>) => void;
  cancelAppointment: (id: number) => void;
  sendChatMessage: (sessionId: number, text: string) => void;
  updateProfile: (profileData: Partial<Profile>) => void;
}

// === 3. กำหนดค่าเริ่มต้นของระบบ (Default Setup) ===
const defaultProperties: Property[] = [
  {
    id: 1,
    title: "บ้านเดี่ยวสไตล์นอร์ดิก พื้นที่กว้าง",
    price: "฿5,500,000",
    type: "บ้านเดี่ยว",
    tag: "ขายด่วน",
    tagBg: "bg-blue-600",
    location: "📍 ถ.เพชรเกษม, หาดใหญ่",
    bedrooms: 3,
    bathrooms: 3,
    area: 200,
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    agentName: "สมชาย นายหน้าดี",
    agentImage: "https://ui-avatars.com/api/?name=Agent+1&background=1e40af&color=fff",
    isPremium: true
  },
  {
    id: 2,
    title: "คอนโดหรู ใกล้มอ.",
    price: "฿1,890,000",
    type: "คอนโดมิเนียม",
    tag: "โครงการใหม่",
    tagBg: "bg-teal-500",
    location: "📍 ถ.ปุณณกัณฑ์, หาดใหญ่",
    bedrooms: 1,
    bathrooms: 1,
    area: 35,
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    agentName: "วิภาดา จิตดี",
    agentImage: "https://ui-avatars.com/api/?name=Agent+2&background=0d9488&color=fff",
    isPremium: false
  },
  {
    id: 3,
    title: "ทาวน์โฮม 3 ชั้น รีโนเวทใหม่",
    price: "฿3,200,000",
    type: "ทาวน์โฮม",
    tag: "มือสอง",
    tagBg: "bg-orange-500",
    location: "📍 ถ.คลองเรียน 1, หาดใหญ่",
    bedrooms: 3,
    bathrooms: 4,
    area: 150,
    image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    agentName: "เอกชัย มั่นคง",
    agentImage: "https://ui-avatars.com/api/?name=Agent+3&background=d97706&color=fff",
    isPremium: false
  }
];

const defaultChatSessions: ChatSession[] = [
  {
    id: 1,
    name: "สมชาย นายหน้าดี",
    avatar: "https://ui-avatars.com/api/?name=Somchai+Agent&background=1e40af&color=fff",
    isActive: true,
    lastMessage: "ยินดีรับผิดชอบค่าธรรมเนียมการโอนให้ครับ...",
    time: "10:45",
    messages: [
      { id: 1, sender: 'user', text: "สวัสดีครับ สนใจบ้านเดี่ยวโครงการสิริชัย วิลเลจ ครับ", time: "10:30" },
      { id: 2, sender: 'agent', text: "สวัสดีครับคุณพาทิศ บ้านหลังนี้ทำเลดีมากเลยครับ", time: "10:32" },
      { id: 3, sender: 'user', text: "ค่าโอนบ้านทางผู้ขายจะรับผิดชอบให้ทั้งหมดไหมครับ?", time: "10:40" },
      { id: 4, sender: 'agent', text: "ยินดีรับผิดชอบค่าธรรมเนียมการโอนให้ครับ สะดวกนัดเข้าชมวันเสาร์นี้เลยไหมครับ?", time: "10:45" }
    ]
  },
  {
    id: 2,
    name: "วิภาดา จิตดี",
    avatar: "https://ui-avatars.com/api/?name=Wipada+Agent&background=0d9488&color=fff",
    isActive: false,
    lastMessage: "คอนโดโครงการนี้ยังเปิดรับข้อเสนอนะคะ",
    time: "เมื่อวาน",
    messages: [
      { id: 1, sender: 'agent', text: "คอนโดโครงการนี้ยังเปิดรับข้อเสนอนะคะ สะดวกช่วงเช้าหรือบ่ายดีคะ?", time: "เมื่อวาน" }
    ]
  }
];

// สร้าง Context Object ขึ้นมาเพื่อใช้ส่งต่อข้อมูล
const AppContext = createContext<AppContextType | undefined>(undefined);

// === 4. ส่วนเชื่อมโยงข้อมูล (App Provider) ===
export function AppProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  
  // โหลดรายการบ้าน/อสังหาริมทรัพย์ จาก API หลังบ้านจริง
  const [properties, setProperties] = useState<Property[]>(defaultProperties);

  useEffect(() => {
    fetch('/api/properties')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProperties(data);
        }
      })
      .catch(err => console.error("Error fetching properties:", err));
  }, []);

  // โหลดรายชื่อทรัพย์ที่กดหัวใจ (Favorite IDs)
  const [favorites, setFavorites] = useState<number[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('srichai_favorites');
      return stored ? JSON.parse(stored) : [1, 2];
    }
    return [1, 2];
  });

  // โหลดประวัติการนัดหมาย
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('srichai_appointments');
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  // โหลดกล่องแชท
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('srichai_chats');
      return stored ? JSON.parse(stored) : defaultChatSessions;
    }
    return defaultChatSessions;
  });

  // กำหนดสเตตสำหรับข้อมูลโปรไฟล์ที่แก้ไขชั่วคราวในแอป (เช่น การสลับโหมดผู้ซื้อ/นายหน้า)
  const [customProfile, setCustomProfile] = useState<Partial<Profile>>({});

  // คำนวณข้อมูลโปรไฟล์จากเซสชันของ NextAuth ร่วมกับสเตตที่แก้ชั่วคราว
  const profile: Profile = {
    fullName: customProfile.fullName || session?.user?.name || "ผู้สนใจซื้อ",
    phone: customProfile.phone || (session?.user as { phone?: string | null })?.phone || "",
    email: customProfile.email || session?.user?.email || "",
    role: customProfile.role || ((session?.user as { role?: string | null })?.role as 'buyer' | 'agent' | 'admin') || "buyer"
  };

  // ฟังก์ชันตัวช่วย: บันทึกลง LocalStorage (บราวเซอร์เมมโมรี่)
  const saveToLocal = (key: string, data: unknown) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(data));
    }
  };

  // ฟังก์ชัน: ตัวแทนนายหน้าลงประกาศอสังหาฯ เพิ่มเติม
  const addProperty = (newProp: Omit<Property, 'id'>) => {
    const updated = [...properties, { ...newProp, id: Date.now() }];
    setProperties(updated);
    saveToLocal('srichai_properties', updated);
  };

  // ฟังก์ชัน: บันทึก/ยกเลิก รายการโปรด (กดไอคอนหัวใจ)
  const toggleFavorite = (id: number) => {
    const updated = favorites.includes(id) 
      ? favorites.filter(favId => favId !== id)
      : [...favorites, id];
    setFavorites(updated);
    saveToLocal('srichai_favorites', updated);
  };

  // ฟังก์ชัน: สร้างคิวนัดหมายชมบ้านเดี่ยว/คอนโด
  const addAppointment = (appt: Omit<Appointment, 'id' | 'status' | 'propertyName' | 'propertyPrice' | 'propertyImage' | 'propertyType' | 'agentName' | 'agentImage'>) => {
    const prop = properties.find(p => p.id === Number(appt.propertyId)) || properties[0];
    const newAppt: Appointment = {
      ...appt,
      id: Date.now(),
      status: 'pending', // เริ่มต้นจะเป็น "รอยืนยัน" (Pending) เสมอ
      propertyName: prop.title,
      propertyPrice: prop.price,
      propertyImage: prop.image,
      propertyType: prop.type,
      agentName: prop.agentName,
      agentImage: prop.agentImage
    };
    const updated = [...appointments, newAppt];
    setAppointments(updated);
    saveToLocal('srichai_appointments', updated);
  };

  // ฟังก์ชัน: ยกเลิกคำขอนัดหมายชมสถานที่
  const cancelAppointment = (id: number) => {
    const updated = appointments.map(appt => 
      appt.id === id ? { ...appt, status: 'cancelled' as const } : appt
    );
    setAppointments(updated);
    saveToLocal('srichai_appointments', updated);
  };

  // ฟังก์ชัน: พิมพ์ส่งข้อความแชทไปหานายหน้าผู้ดูแล
  const sendChatMessage = (sessionId: number, text: string) => {
    const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const updated = chatSessions.map(session => {
      if (session.id === sessionId) {
        return {
          ...session,
          lastMessage: text,
          time: timeStr,
          messages: [
            ...session.messages,
            { id: Date.now(), sender: 'user' as const, text, time: timeStr }
          ]
        };
      }
      return session;
    });
    setChatSessions(updated);
    saveToLocal('srichai_chats', updated);
  };

  // ฟังก์ชัน: อัปเดตข้อมูลโปรไฟล์ส่วนตัว (ชื่อ-นามสกุล, เบอร์โทร, บทบาท)
  const updateProfile = (profileData: Partial<Profile>) => {
    setCustomProfile(prev => ({ ...prev, ...profileData }));
  };

  // ส่งออก Context Provider เพื่อนำไปหุ้มที่ root layout.tsx
  return (
    <AppContext.Provider value={{
      properties,
      favorites,
      appointments,
      chatSessions,
      profile,
      addProperty,
      toggleFavorite,
      addAppointment,
      cancelAppointment,
      sendChatMessage,
      updateProfile
    }}>
      {children}
    </AppContext.Provider>
  );
}

// สร้าง custom hook เพื่อให้ทุกหน้าเพจเรียกใช้ข้อมูลได้สั้นๆ
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('ต้องเรียกใช้ useApp ภายใต้ AppProvider เท่านั้น');
  }
  return context;
}
