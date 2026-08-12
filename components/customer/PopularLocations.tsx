'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';

export default function PopularLocations() {
  const { properties, propertiesLoading } = useApp();

 // ดึงและจัดกลุ่มทำเลที่ตั้งที่มีประกาศจริงๆ จาก Database
// วัตถุประสงค์: สร้างข้อมูลสำหรับแสดง "ทำเลยอดนิยม" (เช่น การ์ดทำเลบนหน้าแรก)
// โดยนับว่าแต่ละทำเลมีประกาศกี่รายการ แล้วเอาทำเลที่มีประกาศเยอะสุด 4 อันดับมาโชว์

// ===== 1. สร้าง object เปล่าไว้เก็บผลลัพธ์การจัดกลุ่ม =====
// key = ชื่อทำเล (string), value = { count: จำนวนประกาศ, image: รูปตัวแทนทำเลนั้น }
const locationGroupsMap: Record<string, { count: number; image: string }> = {};

// ===== 2. วนลูปประกาศทั้งหมด เพื่อจัดกลุ่มตามทำเล =====
properties.forEach((p) => {
  // เลือกชื่อทำเลตามลำดับความสำคัญ (fallback chain):
  // 1) ใช้ชื่ออำเภอ (amphureName) ก่อน ถ้ามี
  // 2) ถ้าไม่มีอำเภอ ใช้ชื่อจังหวัด (provinceName) แทน
  // 3) ถ้าไม่มีทั้งคู่ ลองแกะจาก field "location" แบบข้อความ (เช่น "📍 บางนา, กรุงเทพฯ")
  //    - ตัดไอคอน 📍 ออกด้วย regex
  //    - split ด้วย comma แล้วเอาส่วนแรกสุด (เช่น "บางนา")
  //    - trim() ตัดช่องว่างหัวท้าย
  // 4) ถ้าไม่มีข้อมูลเลยจริงๆ ให้เป็น string ว่าง
  const locName = p.amphureName 
    || p.provinceName 
    || (p.location ? p.location.replace(/📍/g, '').split(',')[0].trim() : '');

  // ถ้าหาชื่อทำเลไม่ได้เลย (string ว่าง) ให้ข้ามประกาศนี้ไป ไม่นับ
  if (!locName) return;

  // ถ้าทำเลนี้ยังไม่เคยเจอมาก่อน → สร้างรายการใหม่ในกลุ่ม เริ่มนับที่ 1
  if (!locationGroupsMap[locName]) {
    locationGroupsMap[locName] = {
      count: 1,
      // เลือกรูปตัวแทนทำเล: ใช้รูปจากประกาศแรกที่เจอในทำเลนั้น
      // ลองหาจาก p.image ก่อน ถ้าไม่มีลองหาจาก p.images[0] (array)
      // ถ้าไม่มีเลยใช้รูป placeholder จาก Unsplash แทน
      image: p.image || p.images?.[0] || 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=400'
    };
  } else {
    // ถ้าทำเลนี้เคยเจอแล้ว → แค่เพิ่มตัวนับ (ไม่เปลี่ยนรูปที่เก็บไว้แล้ว)
    locationGroupsMap[locName].count += 1;
  }
});

// ===== 3. แปลง object กลับเป็น array แล้วเรียง/ตัดเอาแค่ Top 4 =====
const dynamicLocations = Object.entries(locationGroupsMap)
  // แปลง { "บางนา": {count, image} } → { name: "บางนา", count, image }
  .map(([name, data]) => ({ name, count: data.count, image: data.image }))
  // เรียงจากทำเลที่มีประกาศเยอะสุดไปน้อยสุด (มากไปน้อย)
  .sort((a, b) => b.count - a.count)
  // ตัดเอาแค่ 4 อันดับแรก
  .slice(0, 4);

  if (propertiesLoading) {
    return (
      <section className="py-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h2 className="text-lg sm:text-2xl font-extrabold text-slate-900 mb-1">ทำเลยอดนิยม</h2>
            <p className="text-slate-500 text-xs font-medium">กำลังค้นหาทำเลยอดฮิตจากฐานข้อมูล...</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-44 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (dynamicLocations.length === 0) {
    return null;
  }

  return (
    <section className="py-10 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-lg sm:text-2xl font-extrabold text-slate-900 mb-1">ทำเลยอดนิยม</h2>
          <p className="text-slate-500 text-xs font-medium">ทำเลที่มีประกาศขาย/เช่ามากที่สุดในระบบขณะนี้</p>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {dynamicLocations.map((loc, i) => (
            <Link 
              key={i} 
              href={`/search?q=${encodeURIComponent(loc.name)}`}
              className="relative h-44 rounded-2xl overflow-hidden group cursor-pointer shadow-sm border border-slate-100 block"
            >
              <Image 
                src={loc.image} 
                alt={loc.name}
                width={240}
                height={176}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
              <div className="absolute bottom-3 left-3">
                <h3 className="text-white text-base font-bold mb-0.5">{loc.name}</h3>
                <p className="text-slate-300 text-[10px] font-semibold">{loc.count} ประกาศ</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
