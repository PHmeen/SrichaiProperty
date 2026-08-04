'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

import { Property, Appointment, ChatSession, Profile } from '@/types';

export type { Property, Appointment, ChatSession, Profile };

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
  refreshChatSessions: () => Promise<void>;
  sendChatMessage: (sessionId: number, text: string) => Promise<void>;
  updateProfile: (profileData: Partial<Profile>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  const [properties, setProperties] = useState<Property[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [favorites, setFavorites] = useState<(string | number)[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [customProfile, setCustomProfile] = useState<Partial<Profile>>({});

  // 1. ดึงนัดหมาย
  const refreshAppointments = useCallback(async () => {
    if (!session?.user) return;
    try {
      const res = await fetch('/api/appointments');
      const data = await res.json();
      if (Array.isArray(data)) setAppointments(data);
    } catch (err) {
      console.error(err);
    }
  }, [session]);

  // 2. ดึงห้องแชท
  const refreshChatSessions = useCallback(async () => {
    if (!session?.user) return;
    try {
      const res = await fetch('/api/chat/sessions');
      const data = await res.json();
      if (data.success && Array.isArray(data.sessions)) setChatSessions(data.sessions);
    } catch (err) {
      console.error(err);
    }
  }, [session]);

  // โหลดข้อมูลจาก DB
  useEffect(() => {
    // โหลดอสังหาริมทรัพย์ทั้งหมด
    fetch('/api/properties')
      .then(res => res.json())
      .then(data => Array.isArray(data) && setProperties(data))
      .catch(console.error);

    if (session?.user) {
      fetch('/api/appointments')
        .then(res => res.json())
        .then(data => Array.isArray(data) && setAppointments(data))
        .catch(console.error);

      fetch('/api/chat/sessions')
        .then(res => res.json())
        .then(data => data.success && Array.isArray(data.sessions) && setChatSessions(data.sessions))
        .catch(console.error);

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

  // โปรไฟล์ผู้ใช้
  const profile: Profile = {
    fullName: customProfile.fullName || session?.user?.name || "ผู้สนใจซื้อ",
    phone: customProfile.phone || (session?.user as { phone?: string | null })?.phone || "",
    email: customProfile.email || session?.user?.email || "",
    role: customProfile.role || ((session?.user as { role?: string | null })?.role as 'buyer' | 'agent' | 'admin') || "buyer"
  };

  const addProperty = (newProp: Omit<Property, 'id'>) => {
    setProperties(prev => [...prev, { ...newProp, id: Date.now() }]);
  };

  // บันทึก/ยกเลิก รายการโปรดลง DB
  const toggleFavorite = (id: string | number) => {
    const strId = String(id);
    const isFav = favorites.some(favId => String(favId) === strId);
    setFavorites(prev => isFav ? prev.filter(favId => String(favId) !== strId) : [...prev, id]);

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

  // เพิ่มการนัดหมายลง DB
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

  // ยกเลิกคำขอนัดหมาย
  const cancelAppointment = (id: string | number) => {
    setAppointments(prev => prev.map(appt => appt.id === id ? { ...appt, status: 'cancelled' as const } : appt));
  };

  // แก้ไขวัน/เวลานัดหมายลง DB
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

  // ส่งแชทลง DB
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
      console.error(err);
    }
  };

  const updateProfile = (profileData: Partial<Profile>) => {
    setCustomProfile(prev => ({ ...prev, ...profileData }));
  };

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
      refreshChatSessions,
      sendChatMessage,
      updateProfile
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('ต้องเรียกใช้ useApp ภายใต้ AppProvider เท่านั้น');
  return context;
}