'use client';

import React from 'react';

export default function AgentDashboardPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 font-sans">แผงควบคุมนายหน้า (Agent Dashboard)</h1>
        <a 
          href="/agent/add-property" 
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          + ลงประกาศขายบ้านใหม่
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">บ้านที่กำลังขาย</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">12 หลัง</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">คิวนัดหมายรออนุมัติ</p>
          <p className="text-3xl font-bold text-yellow-600 mt-2">3 คิว</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">แชทคุยกับลูกค้า</p>
          <p className="text-3xl font-bold text-green-600 mt-2">5 ห้อง</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">สถานะ KYC บัญชี</p>
          <p className="text-lg font-bold text-green-600 mt-2">ยืนยันเรียบร้อยแล้ว</p>
        </div>
      </div>

      {/* ลิงก์ด่วนการจัดการสำหรับนายหน้า */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
          <h2 className="text-lg font-bold text-gray-800">จัดการนัดหมาย</h2>
          <p className="text-sm text-gray-500 mt-1">อนุมัติหรือปฏิเสธคำขอการจองนัดเข้าชมบ้านของลูกค้า</p>
          <a href="/agent/appointments" className="inline-block mt-4 text-blue-600 font-semibold hover:underline">ไปยังหน้านัดหมาย →</a>
        </div>
        <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
          <h2 className="text-lg font-bold text-gray-800">แชทของฉัน</h2>
          <p className="text-sm text-gray-500 mt-1">สนทนาตอบคำถามลูกค้าเกี่ยวกับอสังหาริมทรัพย์ที่ลงประกาศ</p>
          <a href="/agent/chat" className="inline-block mt-4 text-blue-600 font-semibold hover:underline">ไปยังห้องแชทนายหน้า →</a>
        </div>
      </div>
    </div>
  );
}
