'use client';

/**
 * ==============================================================================
 * คลังข้อมูลกลางของระบบ (Global App Context Provider)
 * ==============================================================================
 * ภาพรวมการทำงาน:
 * 1. ทำหน้าที่เป็นศูนย์กลางเก็บข้อมูลที่ใช้ร่วมกันทั้งแอป เช่น รายชื่ออสังหาริมทรัพย์, รายการโปรด, 
 *    รายการนัดหมาย, ห้องแชท และข้อมูลโปรไฟล์ผู้ใช้งาน
 * 2. ทำหน้าที่โหลดข้อมูลเริ่มต้นจาก API หลังบ้าน และให้บริการฟังก์ชันสำหรับจัดการข้อมูล 
 *    (เช่น กดเพิ่ม/ลบรายการโปรด, นัดหมายเข้าชม, ส่งข้อความแชท)
 * 3. ช่วยให้ทุกคอมโพเนนต์สามารถเรียกใช้ข้อมูลกลางผ่าน Custom Hook `useApp()` ได้ทันที
 * ==============================================================================
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Property, Appointment, ChatSession, Profile } from '@/types';

export type { Property, Appointment, ChatSession, Profile };

/**
 * ------------------------------------------------------------------------------
 * นิยามพิมพ์เขียวข้อมูลและฟังก์ชันทั้งหมดใน AppContext (AppContextType Interface)
 * ------------------------------------------------------------------------------
 */
interface AppContextType {
  // ---- ข้อมูล State กลาง ----
  properties: Property[];                                          // รายชื่ออสังหาริมทรัพย์ทั้งหมดในระบบ
  propertiesLoading: boolean;                                       // สถานะการโหลดข้อมูลอสังหาริมทรัพย์ (true = กำลังโหลด)
  favorites: (string | number)[];                                  // รายชื่อ ID อสังหาริมทรัพย์ที่ผู้ใช้กดหัวใจบันทึกโปรดไว้
  appointments: Appointment[];                                     // รายการนัดหมายเข้าชมอสังหาริมทรัพย์ทั้งหมด
  chatSessions: ChatSession[];                                     // รายการห้องแชทระหว่างผู้ซื้อและนายหน้า
  profile: Profile;                                                // ข้อมูลโปรไฟล์ของผู้ใช้งานปัจจุบัน

  // ---- ฟังก์ชันจัดการข้อมูล (Actions & Methods) ----
  addProperty: (property: Omit<Property, 'id'>) => void;           // ฟังก์ชันเพิ่มประกาศขาย/เช่าบ้านใหม่
  toggleFavorite: (id: string | number) => void;                   // ฟังก์ชันกดสลับบันทึก/ยกเลิกรายการโปรด
  addAppointment: (appointment: Omit<Appointment, 'id' | 'status' | 'propertyName' | 'propertyPrice' | 'propertyImage' | 'propertyType' | 'agentName' | 'agentImage'>) => void; // ฟังก์ชันจองนัดหมายใหม่
  cancelAppointment: (id: string | number) => void;                // ฟังก์ชันยกเลิกนัดหมาย
  editAppointmentDate: (id: string | number, date: string, timeSlot: string) => Promise<{ success: boolean; error?: string }>; // ฟังก์ชันแก้ไขวันเวลานัดหมาย
  refreshAppointments: () => Promise<void>;                        // ฟังก์ชันดึงรายการนัดหมายใหม่ล่าสุดจาก API
  refreshChatSessions: () => Promise<void>;                        // ฟังก์ชันดึงรายการห้องแชทใหม่ล่าสุดจาก API
  sendChatMessage: (sessionId: number, text: string) => Promise<void>; // ฟังก์ชันส่งข้อความแชทไปหานายหน้า
  updateProfile: (profileData: Partial<Profile>) => void;           // ฟังก์ชันอัปเดตข้อมูลโปรไฟล์ผู้ใช้งาน
}

// สร้าง Context Object สำหรับเก็บสภาวะข้อมูลกลาง
const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * ==============================================================================
 * AppProvider Component (ตัวห่อหุ้มแอปพลิเคชันเพื่อกระจายข้อมูล)
 * ==============================================================================
 */
export function AppProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession(); // ดึงข้อมูลล็อกอินของผู้ใช้ปัจจุบันจาก NextAuth

  // ---- State หลักภายในคลังข้อมูลกลาง ----
  const [properties, setProperties] = useState<Property[]>([]);           // เก็บรายการบ้านทั้งหมด
  const [propertiesLoading, setPropertiesLoading] = useState(true);        // สถานะโหลดรายการบ้าน
  const [appointments, setAppointments] = useState<Appointment[]>([]);     // เก็บรายการนัดหมาย
  const [favorites, setFavorites] = useState<(string | number)[]>([]);     // เก็บ ID รายการโปรด
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);     // เก็บห้องแชท
  const [customProfile, setCustomProfile] = useState<Partial<Profile>>({});// เก็บข้อมูลโปรไฟล์เพิ่มเติม

  // ============================================================================
  // 1. ฟังก์ชันโหลด/รีเฟรชรายการนัดหมายจาก API หลังบ้าน
  // ============================================================================
  const refreshAppointments = useCallback(async () => {
    if (!session?.user) return;
    try {
      const res = await fetch('/api/appointments');
      const data = await res.json();
      if (data.success && Array.isArray(data.appointments)) {
        setAppointments(data.appointments);
      } else if (Array.isArray(data)) {
        setAppointments(data);
      }
    } catch (err) {
      console.error('Error refreshing appointments:', err);
    }
  }, [session]);

  // ============================================================================
  // 2. ฟังก์ชันโหลด/รีเฟรชห้องแชททั้งหมดจาก API หลังบ้าน
  // ============================================================================
  const refreshChatSessions = useCallback(async () => {
    if (!session?.user) return;
    try {
      const res = await fetch('/api/chat/sessions');
      const data = await res.json();
      if (data.success && Array.isArray(data.sessions)) setChatSessions(data.sessions);
    } catch (err) {
      console.error('Error refreshing chat sessions:', err);
    }
  }, [session]);

  // ============================================================================
  // 3. EFFECT: โหลดข้อมูลเริ่มต้นจากฐานข้อมูลผ่าน API (ทำงานเมื่อโหลดแอปหรือ Session เปลี่ยน)
  // ============================================================================
  useEffect(() => {
    // 3.1 โหลดข้อมูลอสังหาริมทรัพย์ทั้งหมดในระบบ (ไม่ต้องล็อกอินก็ดูได้)
    fetch('/api/properties')
      .then(res => res.json())
      .then(data => Array.isArray(data) && setProperties(data))
      .catch(console.error)
      .finally(() => setPropertiesLoading(false));

    // 3.2 โหลดข้อมูลส่วนตัวของผู้ใช้เฉพาะเมื่อมีการ "ล็อกอินเข้าสู่ระบบ" แล้ว
    if (session?.user) {
      // โหลดรายการนัดหมายของผู้ใช้
      fetch('/api/appointments')
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.appointments)) {
            setAppointments(data.appointments);
          } else if (Array.isArray(data)) {
            setAppointments(data);
          }
        })
        .catch(console.error);

      // โหลดห้องแชทของผู้ใช้
      fetch('/api/chat/sessions')
        .then(res => res.json())
        .then(data => data.success && Array.isArray(data.sessions) && setChatSessions(data.sessions))
        .catch(console.error);

      // โหลดรายการโปรดที่ผู้ใช้เคยบันทึกไว้ในฐานข้อมูล
      fetch('/api/user/saved-properties')
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.savedProperties)) {
            setFavorites(data.savedProperties.map((s: { id: string }) => s.id));
          }
        })
        .catch(console.error);
    }
  }, [session]);

  // ============================================================================
  // 4. การประกอบข้อมูลโปรไฟล์ผู้ใช้งาน (รวมข้อมูลจาก Session + CustomProfile)
  // ============================================================================
  const profile: Profile = {
    fullName: customProfile.fullName || session?.user?.name || "ผู้สนใจซื้อ",
    phone: customProfile.phone || (session?.user as { phone?: string | null })?.phone || "",
    email: customProfile.email || session?.user?.email || "",
    role: customProfile.role || ((session?.user as { role?: string | null })?.role as 'buyer' | 'agent' | 'admin') || "buyer"
  };

  // ============================================================================
  // 5. ฟังก์ชันเพิ่มประกาศอสังหาริมทรัพย์ใหม่
  // ============================================================================
  const addProperty = (newProp: Omit<Property, 'id'>) => {
    setProperties(prev => [...prev, { ...newProp, id: Date.now() }]);
  };

  // ============================================================================
  // 6. ฟังก์ชันบันทึก / ยกเลิก รายการโปรดลงฐานข้อมูลจริง
  // ============================================================================
  const toggleFavorite = (id: string | number) => {
    const strId = String(id);
    const isFav = favorites.some(favId => String(favId) === strId);
    
    // อัปเดต State หน้าบ้านทันที เพื่อความรวดเร็วในการแสดงผลไอคอนหัวใจ
    setFavorites(prev => isFav ? prev.filter(favId => String(favId) !== strId) : [...prev, id]);

    // ส่งคำร้องขอไปยัง API หลังบ้านเพื่อบันทึกลงฐานข้อมูลจริง
    if (session?.user) {
      const method = isFav ? 'DELETE' : 'POST';
      const url = isFav ? `/api/user/saved-properties?propertyId=${encodeURIComponent(strId)}` : '/api/user/saved-properties';
      const options: RequestInit = { method };
      if (!isFav) {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify({ propertyId: strId });
      }
      fetch(url, options).catch(console.error);
    }
  };

  // ============================================================================
  // 7. ฟังก์ชันเพิ่มนัดหมายเข้าชมบ้านใหม่ลงฐานข้อมูล
  // ============================================================================
  const addAppointment = (appt: Omit<Appointment, 'id' | 'status' | 'propertyName' | 'propertyPrice' | 'propertyImage' | 'propertyType' | 'agentName' | 'agentImage'>) => {
    fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appt)
    })
    .then(res => res.json())
    .then(data => data.success && refreshAppointments())
    .catch(console.error);
  };

  // ============================================================================
  // 8. ฟังก์ชันยกเลิกนัดหมายลงฐานข้อมูลจริง
  // ============================================================================
  const cancelAppointment = async (id: string | number) => {
    const targetIdStr = String(id).trim();
    // อัปเดต State หน้าบ้านทันที เพื่อให้รายการย้ายไปแท็บ "ยกเลิกแล้ว" ทันทีโดยไม่ต้องรอ
    setAppointments(prev => prev.map(appt => String(appt.id).trim() === targetIdStr ? { ...appt, status: 'cancelled' as const } : appt));

    try {
      // ส่งคำร้องขอลบ/ยกเลิกนัดหมายไปยังฐานข้อมูลจริง
      const res = await fetch(`/api/appointments?id=${encodeURIComponent(String(id))}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await refreshAppointments();
      }
    } catch (err) {
      console.error("Cancel appointment error:", err);
    }
  };

  // ============================================================================
  // 9. ฟังก์ชันแก้ไขวัน/เวลานัดหมายลงฐานข้อมูล
  // ============================================================================
  const editAppointmentDate = async (id: string | number, date: string, timeSlot: string) => {
    try {
      const res = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, date, timeSlot })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await refreshAppointments();
        return { success: true };
      }
      return { success: false, error: data.error || 'เกิดข้อผิดพลาดในการแก้ไขนัดหมาย' };
    } catch {
      return { success: false, error: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' };
    }
  };

  // ============================================================================
  // 10. ฟังก์ชันส่งข้อความแชทลงฐานข้อมูล
  // ============================================================================
  const sendChatMessage = async (sessionId: number, text: string) => {
    if (!text.trim()) return;
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, content: text })
      });
      const data = await res.json();
      if (data.success) await refreshChatSessions();
    } catch (err) {
      console.error('Send chat message error:', err);
    }
  };

  // ============================================================================
  // 11. ฟังก์ชันอัปเดตข้อมูลโปรไฟล์ผู้ใช้งาน
  // ============================================================================
  const updateProfile = (profileData: Partial<Profile>) => {
    setCustomProfile(prev => ({ ...prev, ...profileData }));
  };

  // กระจายข้อมูลและฟังก์ชันทั้งหมดผ่าน Context Provider ให้คอมโพเนนต์ลูกเรียกใช้
  return (
    <AppContext.Provider value={{
      properties,
      propertiesLoading,
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
      refreshChatSessions,
      sendChatMessage,
      updateProfile
    }}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * ==============================================================================
 * Custom Hook: useApp()
 * ==============================================================================
 * ฟังก์ชันช่วยให้คอมโพเนนต์ย่อยดึงข้อมูลและฟังก์ชันจาก AppContext ไปใช้ได้สะดวกยิ่งขึ้น
 * ตัวอย่างการใช้งาน: const { properties, favorites, toggleFavorite } = useApp();
 * ==============================================================================
 */
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('ต้องเรียกใช้ useApp ภายใต้ AppProvider เท่านั้น');
  return context;
}