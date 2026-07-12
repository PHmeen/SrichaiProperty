'use client';

import React from 'react';

export default function AdminDashboardPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 font-sans">หน้าควบคุมหลักผู้ดูแลระบบ (Admin Dashboard)</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow transition-shadow">
          <h2 className="text-lg font-bold text-gray-800">อนุมัติ KYC นายหน้า</h2>
          <p className="text-sm text-gray-500 mt-1">ตรวจเอกสารยืนยันตัวตนของสมาชิกที่ลงทะเบียนเป็นนายหน้า</p>
          <a href="/admin/kyc" className="inline-block mt-4 text-blue-600 font-semibold hover:underline">ไปหน้า KYC →</a>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow transition-shadow">
          <h2 className="text-lg font-bold text-gray-800">ตรวจสอบประกาศบ้าน</h2>
          <p className="text-sm text-gray-500 mt-1">คัดกรองความถูกต้องและอนุมัติประกาศขายบ้านขึ้นเว็บไซต์</p>
          <a href="/admin/moderation" className="inline-block mt-4 text-blue-600 font-semibold hover:underline">ไปหน้ารออนุมัติประกาศ →</a>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow transition-shadow">
          <h2 className="text-lg font-bold text-gray-800">จัดการข้อมูลผู้ใช้</h2>
          <p className="text-sm text-gray-500 mt-1">ตรวจสอบบัญชีสมาชิก ค้นหา และระงับการใช้งานบัญชีที่ทำผิดกฎ</p>
          <a href="/admin/users" className="inline-block mt-4 text-blue-600 font-semibold hover:underline">ไปหน้าจัดการผู้ใช้งาน →</a>
        </div>
      </div>
    </div>
  );
}
