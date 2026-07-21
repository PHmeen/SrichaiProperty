'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export interface Property {
  id: string | number;
  title: string;
  price: string;
  type: string;
  tag: string;
  tagBg: string;
  location: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  image: string;
  agentName: string;
  agentImage: string;
  isPremium?: boolean;
  description?: string;
  latitude?: number;
  longitude?: number;
  province_id?: number | null;
  amphure_id?: number | null;
  district_id?: number | null;
  provinceName?: string;
  amphureName?: string;
  districtName?: string;
}

export interface Appointment {
  id: string | number;
  propertyId: number | string;
  date: string;
  timeSlot: string;
  note: string;
  status: 'upcoming' | 'past' | 'cancelled' | 'pending';
  propertyName: string;
  propertyPrice: string;
  propertyImage: string;
  propertyType: string;
  agentName: string;
  agentImage: string;
}

export interface ChatMessage {
  id: number;
  sender: 'user' | 'agent';
  text: string;
  time: string;
}

export interface ChatSession {
  id: number;
  name: string;
  avatar: string;
  isActive: boolean;
  lastMessage: string;
  time: string;
  messages: ChatMessage[];
}

export interface Profile {
  fullName: string;
  phone: string;
  email: string;
  role: 'buyer' | 'agent' | 'admin';
}

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

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  
  const getLocal = <T,>(key: string, fallback: T): T => {
    if (typeof window === 'undefined') return fallback;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  };

  const saveToLocal = (key: string, data: unknown) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(data));
    }
  };
  
  const [appointments, setAppointments] = useState<Appointment[]>(() => getLocal('srichai_appointments', []));
  const [favorites, setFavorites] = useState<(string | number)[]>(() => getLocal('srichai_favorites', []));
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => getLocal('srichai_chats', defaultChatSessions));
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

  const [customProfile, setCustomProfile] = useState<Partial<Profile>>({});

  const profile: Profile = {
    fullName: customProfile.fullName || session?.user?.name || "ผู้สนใจซื้อ",
    phone: customProfile.phone || (session?.user as { phone?: string | null })?.phone || "",
    email: customProfile.email || session?.user?.email || "",
    role: customProfile.role || ((session?.user as { role?: string | null })?.role as 'buyer' | 'agent' | 'admin') || "buyer"
  };

  const addProperty = (newProp: Omit<Property, 'id'>) => {
    const updated = [...properties, { ...newProp, id: Date.now() }];
    setProperties(updated);
    saveToLocal('srichai_properties', updated);
  };

  const toggleFavorite = (id: string | number) => {
    const updated = favorites.includes(id) 
      ? favorites.filter(favId => favId !== id)
      : [...favorites, id];
    setFavorites(updated);
    saveToLocal('srichai_favorites', updated);
  };

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
    
    const updated = [...appointments, newAppt];
    setAppointments(updated);
    saveToLocal('srichai_appointments', updated);

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
