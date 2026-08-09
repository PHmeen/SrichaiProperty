'use client';

/**
 * ==============================================================================
 * หน้าจัดการข้อมูลส่วนตัวและโปรไฟล์ผู้ใช้งาน (User Profile Page)
 * /app/(customer)/profile/page.tsx
 * ==============================================================================
 * วัตถุประสงค์หลัก:
 * 1. ทำหน้าที่เป็น Controller หลักในการควบคุมข้อมูลส่วนตัวของผู้ใช้ (ชื่อ, นามสกุล, เบอร์โทร, LINE ID, รหัสผ่าน)
 * 2. โหลดข้อมูลโปรไฟล์จริงและประวัติการล็อกอินจาก API หลังบ้าน (`GET /api/user/profile`)
 * 3. ส่งข้อมูลการแก้ไขโปรไฟล์และเปลี่ยนรหัสผ่านไปยัง API หลังบ้าน (`PUT /api/user/profile`)
 * 4. แยกการแสดงผล UI ออกเป็น 2 คอมโพเนนต์ย่อยเพื่อความสะอาดและอ่านง่าย:
 *    - `ProfileSidebar`: แผงด้านซ้ายแสดงรูปโปรไฟล์ ยอดรายการโปรด และยอดคิวนัดหมาย
 *    - `ProfileForm`: ฟอร์มด้านขวาสำหรับกรอกข้อมูล แก้ไขรหัสผ่าน และดูประวัติการเข้าใช้งาน
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useApp } from '@/context/AppContext';
import ProfileSidebar from '@/components/customer/ProfileSidebar';
import ProfileForm from '@/components/customer/ProfileForm';

// ฟังก์ชันสร้างรูปโปรไฟล์ตัวอักษรย่อ (fallback avatar) กรณีผู้ใช้ไม่มีรูปถ่ายในระบบ
const getInitialsAvatar = (name: string) => {
  const initials = name.trim().split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#1e293b"/><text x="50" y="55" font-family="sans-serif" font-weight="bold" font-size="35" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const { profile, updateProfile, appointments, favorites } = useApp();

  // ---- State ข้อมูลส่วนบุคคล ----
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [lineId, setLineId] = useState('');
  const [email, setEmail] = useState('');

  // ---- State การตั้งค่าการแจ้งเตือน ----
  const [emailNotification, setEmailNotification] = useState(true);
  const [smsNotification, setSmsNotification] = useState(false);

  // ---- State เปลี่ยนรหัสผ่านใหม่ ----
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ---- State สถานะและการแสดงผล ----
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastLoginTime, setLastLoginTime] = useState<string>('');
  const [loginDevice, setLoginDevice] = useState<string>('');
  const [loginIp, setLoginIp] = useState<string>('');
  const [isVerified, setIsVerified] = useState(false);

  // สำเนาข้อมูลเดิมที่ดึงมาจากฐานข้อมูล ไว้ใช้รีเซ็ตฟอร์มเมื่อกด "ยกเลิก"
  const [originalProfile, setOriginalProfile] = useState({ firstName: '', lastName: '', phone: '', lineId: '' });

  // ----------------------------------------------------------------------------
  // 1. EFFECT: โหลดข้อมูลโปรไฟล์ผู้ใช้งานจริงจาก API หลังบ้าน
  // ----------------------------------------------------------------------------
  useEffect(() => {
    async function loadUserProfile() {
      try {
        const res = await fetch('/api/user/profile');
        const data = await res.json();

        if (res.ok && data.success && data.user) {
          const u = data.user;
          const loaded = {
            firstName: u.firstName || '',
            lastName: u.lastName || '',
            phone: u.phone || '',
            lineId: u.lineId || '',
          };
          setFirstName(loaded.firstName);
          setLastName(loaded.lastName);
          setPhone(loaded.phone);
          setLineId(loaded.lineId);
          setEmail(u.email || '');
          setOriginalProfile(loaded);
          setIsVerified(Boolean(u.isVerified));

          if (u.lastLogin?.created_at) {
            const dt = new Date(u.lastLogin.created_at);
            setLastLoginTime(dt.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }));
            setLoginDevice(u.lastLogin.user_agent || '');
            setLoginIp(u.lastLogin.ip_address || '');
          } else {
            setLastLoginTime('ไม่มีข้อมูล');
          }
        } else {
          // กรณี API มีปัญหา ให้ดึงข้อมูลสำรองจาก Session / AppContext
          const nameParts = (session?.user?.name || profile.fullName || '').trim().split(/\s+/);
          const loaded = {
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            phone: profile.phone || '',
            lineId: '',
          };
          setFirstName(loaded.firstName);
          setLastName(loaded.lastName);
          setPhone(loaded.phone);
          setEmail(session?.user?.email || profile.email || '');
          setOriginalProfile(loaded);
          setLastLoginTime('ไม่มีข้อมูล');
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setLastLoginTime('ไม่มีข้อมูล');
      } finally {
        setIsLoadingProfile(false);
      }
    }

    loadUserProfile();
  }, [session]);

  // ----------------------------------------------------------------------------
  // 2. ฟังก์ชันรีเซ็ตฟอร์ม (ยกเลิกการแก้ไข คืนค่าเป็นข้อมูลล่าสุดจากฐานข้อมูล)
  // ----------------------------------------------------------------------------
  const handleResetProfile = () => {
    setFirstName(originalProfile.firstName);
    setLastName(originalProfile.lastName);
    setPhone(originalProfile.phone);
    setLineId(originalProfile.lineId);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setStatusMsg(null);
  };

  // ----------------------------------------------------------------------------
  // 3. ฟังก์ชันบันทึกข้อมูลโปรไฟล์และเปลี่ยนรหัสผ่าน (ส่งไปยัง API PUT /api/user/profile)
  // ----------------------------------------------------------------------------
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    // ตรวจสอบการยืนยันรหัสผ่านใหม่
    if (newPassword && newPassword !== confirmPassword) {
      setStatusMsg({ type: 'error', text: 'รหัสผ่านใหม่และรหัสผ่านยืนยันไม่ตรงกัน' });
      return;
    }

    if (newPassword && !currentPassword) {
      setStatusMsg({ type: 'error', text: 'กรุณากรอกรหัสผ่านปัจจุบันเพื่อยืนยันการเปลี่ยนรหัสผ่าน' });
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          lineId,
          emailNotification,
          smsNotification,
          currentPassword: newPassword ? currentPassword : undefined,
          newPassword: newPassword || undefined
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatusMsg({ type: 'success', text: 'บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว!' });
        const updatedFullName = `${firstName} ${lastName}`.trim();
        updateProfile({ fullName: updatedFullName, phone });
        if (session) {
          await updateSession({ name: updatedFullName });
        }
        setOriginalProfile({ firstName, lastName, phone, lineId });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'ไม่สามารถบันทึกข้อมูลได้' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
    } finally {
      setIsSaving(false);
    }
  };

  // คำนวณชื่อผู้ใช้ที่จะนำไปแสดงผล และดึง URL รูปโปรไฟล์
  const userDisplayName = `${firstName} ${lastName}`.trim() || session?.user?.name || profile.fullName || 'ผู้ใช้งาน';
  const rawImage = session?.user?.image;
  const avatarUrl = (rawImage && rawImage.startsWith('http')) ? rawImage : getInitialsAvatar(userDisplayName);

  return (
    <div className="font-sans bg-slate-900 min-h-screen text-slate-800 antialiased text-xs">
      {/* 4.1 แบนเนอร์หัวข้อหน้าเพจ */}
      <header className="bg-slate-950 text-white pt-10 pb-20 border-b border-slate-800/80">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="text-xl font-bold tracking-tight">จัดการบัญชีผู้ใช้</h1>
          <p className="text-slate-400 text-xs mt-1">อัปเดตข้อมูลส่วนตัว ตั้งค่าความปลอดภัย และยืนยันตัวตน</p>
        </div>
      </header>

      {/* 4.2 เลย์เอาต์ส่วนเนื้อหาหลัก (แบ่งเป็น Sidebar ซ้าย และ Form ขวา) */}
      <div className="max-w-5xl mx-auto px-4 pb-16 -mt-12 flex flex-col lg:flex-row gap-6">
        {/* แผงข้อมูลผู้ใช้สรุปด้านซ้าย */}
        <ProfileSidebar
          userDisplayName={userDisplayName}
          email={email}
          avatarUrl={avatarUrl}
          favoritesCount={favorites.length}
          appointmentsCount={appointments.length}
        />

        {/* ฟอร์มแก้ไขข้อมูลและเปลี่ยนรหัสผ่านด้านขวา */}
        <ProfileForm
          firstName={firstName}
          setFirstName={setFirstName}
          lastName={lastName}
          setLastName={setLastName}
          phone={phone}
          setPhone={setPhone}
          lineId={lineId}
          setLineId={setLineId}
          email={email}
          emailNotification={emailNotification}
          setEmailNotification={setEmailNotification}
          smsNotification={smsNotification}
          setSmsNotification={setSmsNotification}
          currentPassword={currentPassword}
          setCurrentPassword={setCurrentPassword}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          isSaving={isSaving}
          isLoadingProfile={isLoadingProfile}
          statusMsg={statusMsg}
          lastLoginTime={lastLoginTime}
          loginDevice={loginDevice}
          loginIp={loginIp}
          isVerified={isVerified}
          handleSaveProfile={handleSaveProfile}
          onResetProfile={handleResetProfile}
        />
      </div>
    </div>
  );
}
