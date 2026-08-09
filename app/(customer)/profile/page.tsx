'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useApp } from '@/context/AppContext';
import ProfileSidebar from '@/components/customer/ProfileSidebar';
import ProfileForm from '@/components/customer/ProfileForm';

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const { profile, updateProfile, appointments, favorites } = useApp();

  // State ข้อมูลส่วนบุคคลตาม UI ดีไซน์
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [lineId, setLineId] = useState('');
  const [email, setEmail] = useState('');

  // State ตั้งค่าการแจ้งเตือน
  const [emailNotification, setEmailNotification] = useState(true);
  const [smsNotification, setSmsNotification] = useState(false);

  // State ตั้งค่ารหัสผ่านใหม่
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // State ทั่วไปสำหรับ Loading & Status Message
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastLoginTime, setLastLoginTime] = useState<string>('');
  const [loginDevice, setLoginDevice] = useState<string>('');
  const [loginIp, setLoginIp] = useState<string>('');
  const [isVerified, setIsVerified] = useState(false);

  // ค่าต้นฉบับที่โหลดมาจาก Database ไว้ใช้ตอนกด "ยกเลิก" เพื่อคืนค่าฟอร์ม
  const [originalProfile, setOriginalProfile] = useState({ firstName: '', lastName: '', phone: '', lineId: '' });

  // ดึงข้อมูลโปรไฟล์จริงจาก Database เมื่อโหลดหน้าเพจ
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
          // Fallback ข้อมูลเบื้องต้นถ้า API ไม่พร้อม
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
  }, [session, profile]);

  // ยกเลิกการแก้ไข: คืนค่าฟอร์มกลับไปเป็นข้อมูลล่าสุดที่โหลดจาก Database
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

  // ฟังก์ชันบันทึกข้อมูลส่วนบุคคลและรหัสผ่านไปยังฐานข้อมูลจริง
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

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

  // Avatar อักษรย่อย่อกรณีไม่มีรูปภาพ
  const getInitialsAvatar = (name: string) => {
    const initials = name.trim().split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#1e293b"/><text x="50" y="55" font-family="sans-serif" font-weight="bold" font-size="35" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  };

  const userDisplayName = `${firstName} ${lastName}`.trim() || session?.user?.name || profile.fullName || 'ผู้ใช้งาน';
  const rawImage = session?.user?.image;
  const avatarUrl = (rawImage && rawImage.startsWith('http')) ? rawImage : getInitialsAvatar(userDisplayName);

  return (
    <div className="font-sans bg-slate-900 min-h-screen text-slate-800 antialiased text-xs">
      {/* Header Banner */}
      <header className="bg-slate-950 text-white pt-10 pb-20 border-b border-slate-800/80">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="text-xl font-bold tracking-tight">จัดการบัญชีผู้ใช้</h1>
          <p className="text-slate-400 text-xs mt-1">อัปเดตข้อมูลส่วนตัว ตั้งค่าความปลอดภัย และยืนยันตัวตน</p>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="max-w-5xl mx-auto px-4 pb-16 -mt-12 flex flex-col lg:flex-row gap-6">
        <ProfileSidebar
          userDisplayName={userDisplayName}
          email={email}
          avatarUrl={avatarUrl}
          favoritesCount={favorites.length}
          appointmentsCount={appointments.length}
        />

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
