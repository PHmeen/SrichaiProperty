'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

import { Property, Appointment, ChatMessage, ChatSession, Profile } from '@/types';

export type { Property, Appointment, ChatMessage, ChatSession, Profile };

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
  editAppointmentDate: (id: string | number, date: string, timeSlot: string) => Promise<{ success: boolean; error?: string }>;
  refreshAppointments: () => Promise<void>;
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
  
  // หมายเหตุ: เดิมโค้ด 3 บรรทัดนี้อ่าน localStorage ตรงๆ ใน useState initializer
  // ซึ่งทำงานตอน "initial render" ด้วย — ฝั่ง server ไม่มี localStorage เลยได้ค่า fallback ว่างๆ เสมอ
  // แต่ฝั่ง client รอบแรกที่ hydrate จะอ่านค่าจริงจาก localStorage ทันที ทำให้ HTML รอบแรกของทั้งสองฝั่งไม่ตรงกัน
  // (React หา mismatch ตรงนี้ -> ขึ้น error "Hydration failed")
  // แก้โดยให้ state เริ่มต้นเป็นค่าว่างเหมือนกันทั้ง server และ client ก่อนเสมอ
  // แล้วค่อยอ่านจาก localStorage ทีหลังใน useEffect (รันหลัง mount เท่านั้น ไม่กระทบ HTML รอบแรก)
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [favorites, setFavorites] = useState<(string | number)[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(defaultChatSessions);
  const [properties, setProperties] = useState<Property[]>([]);

  // โหลดค่าที่เคยบันทึกไว้ใน localStorage ทันทีหลัง mount (client-only)
  useEffect(() => {
    setAppointments(getLocal('srichai_appointments', []));
    setFavorites(getLocal('srichai_favorites', []));
    setChatSessions(getLocal('srichai_chats', defaultChatSessions));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      fetch('/api/user/saved-properties')
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.savedProperties)) {
            const ids = data.savedProperties.map((s: { id: string }) => s.id);
            setFavorites(ids);
            saveToLocal('srichai_favorites', ids);
          }
        })
        .catch(err => console.error("Error fetching saved properties:", err));
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
    const strId = String(id);
    const isFav = favorites.some(favId => String(favId) === strId);
    const updated = isFav 
      ? favorites.filter(favId => String(favId) !== strId)
      : [...favorites, id];
      
    setFavorites(updated);
    saveToLocal('srichai_favorites', updated);

    if (session?.user) {
      if (isFav) {
        fetch(`/api/user/saved-properties?propertyId=${encodeURIComponent(strId)}`, {
          method: 'DELETE'
        }).catch(err => console.error("Error removing favorite DB:", err));
      } else {
        fetch('/api/user/saved-properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ propertyId: strId })
        }).catch(err => console.error("Error saving favorite DB:", err));
      }
    }
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

  // ฟังก์ชัน: ดึงนัดหมายล่าสุดจาก server มาอัปเดต context ทันที
  // ใช้ตอนหน้าจอง (book-appointment) สร้างนัดหมายใหม่เสร็จแล้ว router.push ไปหน้าประวัติ
  // เพราะ AppProvider อยู่ระดับ root layout ไม่ได้ remount ตอนเปลี่ยนหน้า
  // useEffect ที่ดึงข้อมูลตอน mount ทีแรกจะไม่รันซ้ำให้อัตโนมัติ ต้องเรียกฟังก์ชันนี้เองหลังจองสำเร็จ
  const refreshAppointments = async () => {
    try {
      const res = await fetch('/api/appointments');
      const data = await res.json();
      if (Array.isArray(data)) {
        setAppointments(data);
        saveToLocal('srichai_appointments', data);
      }
    } catch (err) {
      console.error("Error refreshing appointments:", err);
    }
  };

  // ฟังก์ชัน: ยกเลิกคำขอนัดหมายชมสถานที่
  const cancelAppointment = (id: string | number) => {
    const updated = appointments.map(appt => 
      appt.id === id ? { ...appt, status: 'cancelled' as const } : appt
    );
    setAppointments(updated);
    saveToLocal('srichai_appointments', updated);
  };

  // ฟังก์ชัน: ลูกค้าแก้วัน/รอบที่จอง (ทำได้เฉพาะตอนนัดหมายยัง pending) แล้วดึงข้อมูลล่าสุดจาก DB มาอัปเดต
  const editAppointmentDate = async (
    id: string | number,
    date: string,
    timeSlot: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, date, timeSlot })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const latestRes = await fetch('/api/appointments');
        const latestData = await latestRes.json();
        if (Array.isArray(latestData)) {
          setAppointments(latestData);
          saveToLocal('srichai_appointments', latestData);
        }
        return { success: true };
      }

      return { success: false, error: data.error || 'เกิดข้อผิดพลาดในการแก้ไขนัดหมาย' };
    } catch {
      return { success: false, error: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' };
    }
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
      editAppointmentDate,
      refreshAppointments,
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