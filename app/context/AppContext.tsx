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
  id: string | number;
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
  description?: string; // รายละเอียดเพิ่มเติม
  latitude?: number;    // ละติจูด
  longitude?: number;   // ลองจิจูด
  province_id?: number | null;
  amphure_id?: number | null;
  district_id?: number | null;
  provinceName?: string;
  amphureName?: string;
  districtName?: string;
}

// รูปแบบข้อมูลของ การนัดหมายชมบ้าน
export interface Appointment {
  id: string | number;
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
  favorites: (string | number)[];
  appointments: Appointment[];
  chatSessions: ChatSession[];
  profile: Profile;
  addProperty: (property: Omit<Property, 'id'>) => void;
  toggleFavorite: (id: string | number) => void;
  addAppointment: (appointment: Omit<Appointment, 'id' | 'status' | 'propertyName' | 'propertyPrice' | 'propertyImage' | 'propertyType' | 'agentName' | 'agentImage'>) => void;
  cancelAppointment: (id: string | number) => void;
  sendChatMessage: (sessionId: number, text: string) => void;
  updateProfile: (profileData: Partial<Profile>) => void;
}

// === 3. กำหนดค่าเริ่มต้นของระบบ (Default Setup) ===

const defaultChatSessions: ChatSession[] = [
  {
    id: 1,
    name: "สมชาย นายหน้าดี",
    avatar: "https://ui-avatars.com/api/?name=Somchai+Agent&background=1e40af&color=fff",
    isActive: true,
    lastMessage: "ยินดีรับผิดชอบค่าธรรมเนียมการโอนให้ครับ...",
    time: "10:45",
    messages: [
      { id: 1, sender: 'user', text: "สวัสดีครับ สนใจบ้านครับ", time: "10:30" }
    ]
  }
];

// สร้าง Context Object ขึ้นมาเพื่อใช้ส่งต่อข้อมูล
const AppContext = createContext<AppContextType | undefined>(undefined);

// === 4. ส่วนเชื่อมโยงข้อมูล (App Provider) ===
export function AppProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  
  // ฟังก์ชันตัวช่วย: โหลดข้อมูลจาก LocalStorage
  const getLocal = <T,>(key: string, fallback: T): T => {
    if (typeof window === 'undefined') return fallback;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  };

  // ฟังก์ชันตัวช่วย: บันทึกลง LocalStorage
  const saveToLocal = (key: string, data: unknown) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(data));
    }
  };
  
  // โหลดข้อมูลต่าง ๆ จาก LocalStorage
  const [appointments, setAppointments] = useState<Appointment[]>(() => getLocal('srichai_appointments', []));
  const [favorites, setFavorites] = useState<(string | number)[]>(() => getLocal('srichai_favorites', []));
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => getLocal('srichai_chats', defaultChatSessions));

  // โหลดรายการบ้าน/อสังหาริมทรัพย์ จาก API หลังบ้านจริง (เริ่มต้นเป็นอาเรย์ว่างเพื่อรอโหลดข้อมูลจริงจากฐานข้อมูล)
  const [properties, setProperties] = useState<Property[]>([]);

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

  // ดึงข้อมูลนัดหมายจากฐานข้อมูลจริงเมื่อผู้ใช้ล็อกอิน
  useEffect(() => {
    if (session?.user) {
      fetch('/api/appointments')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setAppointments(data);
            saveToLocal('srichai_appointments', data);
          }
        })
        .catch(err => console.error("Error fetching appointments:", err));
    }
  }, [session]);

  // กำหนดสเตตสำหรับข้อมูลโปรไฟล์ที่แก้ไขชั่วคราวในแอป (เช่น การสลับโหมดผู้ซื้อ/นายหน้า)
  const [customProfile, setCustomProfile] = useState<Partial<Profile>>({});

  // คำนวณข้อมูลโปรไฟล์จากเซสชันของ NextAuth ร่วมกับสเตตที่แก้ชั่วคราว
  const profile: Profile = {
    fullName: customProfile.fullName || session?.user?.name || "ผู้สนใจซื้อ",
    phone: customProfile.phone || (session?.user as { phone?: string | null })?.phone || "",
    email: customProfile.email || session?.user?.email || "",
    role: customProfile.role || ((session?.user as { role?: string | null })?.role as 'buyer' | 'agent' | 'admin') || "buyer"
  };



  // ฟังก์ชัน: ตัวแทนนายหน้าลงประกาศอสังหาฯ เพิ่มเติม
  const addProperty = (newProp: Omit<Property, 'id'>) => {
    const updated = [...properties, { ...newProp, id: Date.now() }];
    setProperties(updated);
    saveToLocal('srichai_properties', updated);
  };

  // ฟังก์ชัน: บันทึก/ยกเลิก รายการโปรด (กดไอคอนหัวใจ)
  const toggleFavorite = (id: string | number) => {
    const updated = favorites.includes(id) 
      ? favorites.filter(favId => favId !== id)
      : [...favorites, id];
    setFavorites(updated);
    saveToLocal('srichai_favorites', updated);
  };

  // ฟังก์ชัน: สร้างคิวนัดหมายชมบ้านเดี่ยว/คอนโด
  const addAppointment = (appt: Omit<Appointment, 'id' | 'status' | 'propertyName' | 'propertyPrice' | 'propertyImage' | 'propertyType' | 'agentName' | 'agentImage'>) => {
    const prop = properties.find(p => String(p.id) === String(appt.propertyId)) || properties[0];
    const tempId = "temp_" + Date.now();
    const newAppt: Appointment = {
      ...appt,
      id: tempId,
      status: 'pending',
      propertyName: prop.title,
      propertyPrice: prop.price,
      propertyImage: prop.image,
      propertyType: prop.type,
      agentName: prop.agentName,
      agentImage: prop.agentImage
    };
    
    // อัปเดตหน้าจอทันทีแบบรวดเร็ว (Optimistic)
    const updated = [...appointments, newAppt];
    setAppointments(updated);
    saveToLocal('srichai_appointments', updated);

    // ยิงบันทึกข้อมูลเข้าฐานข้อมูลของจริงผ่าน API หลังบ้าน
    fetch('/api/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        propertyId: appt.propertyId,
        date: appt.date,
        timeSlot: appt.timeSlot,
        note: appt.note
      })
    })
    .then(res => res.json())
    .then(data => {
      // ดึงข้อมูลนัดหมายล่าสุดเพื่อนำ ID จริง (UUID) จาก DB มาทับสเตตแทนตัวชั่วคราว
      if (data.success) {
        fetch('/api/appointments')
          .then(res => res.json())
          .then(latestData => {
            if (Array.isArray(latestData)) {
              setAppointments(latestData);
              saveToLocal('srichai_appointments', latestData);
            }
          });
      }
    })
    .catch(err => console.error("Error creating appointment in database:", err));
  };

  // ฟังก์ชัน: ยกเลิกคำขอนัดหมายชมสถานที่
  const cancelAppointment = (id: string | number) => {
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
