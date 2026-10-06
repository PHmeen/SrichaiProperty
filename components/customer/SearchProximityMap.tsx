'use client';

/**
 * ==============================================================================
 * SearchProximityMap.tsx - แผนที่แสดงอสังหาริมทรัพย์และจุดแลนด์มาร์ก
 * ==============================================================================
 * - แสดงหมุดของแลนด์มาร์กศูนย์กลาง (สีแดง/ส้ม) พร้อมวงกลมแสดงรัศมีการค้นหา
 * - แสดงหมุดของบ้านและอสังหาริมทรัพย์รอบๆ (สีน้ำเงิน)
 * - คลิกหมุดเพื่อดูรูป ราคา ระยะห่าง และลิงก์ตรงสู่หน้ารายละเอียด
 * - รองรับ Next.js SSR-safe
 * ==============================================================================
 */

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Property } from '@/types/property';
import { LandmarkTarget } from '@/lib/services/landmarkService';
import { MapPin, Navigation, Bed, Bath, ArrowUpRight } from 'lucide-react';

// รีเซ็ต icon path สำหรับ Leaflet
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

// สร้าง Custom Marker Icon สำหรับ Landmark ศูนย์กลาง (สีส้มแดงเด่นชัด)
const landmarkIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// สร้าง Custom Marker Icon สำหรับอสังหาริมทรัพย์ (สีน้ำเงิน)
const propertyIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface SearchProximityMapProps {
  properties: Property[];
  landmark: LandmarkTarget | null;
  radiusKm?: number;
  height?: number | string;
}

// คอมโพเนนต์ลูกสำหรับปรับขอบเขตและมุมกล้องของแผนที่อัตโนมัติ (Auto Fit Bounds)
function MapBoundsUpdater({
  landmark,
  properties
}: {
  landmark: LandmarkTarget | null;
  properties: Property[];
}) {
  const map = useMap();

  useEffect(() => {
    if (landmark) {
      map.setView([landmark.lat, landmark.lng], 13);
      return;
    }

    const validProps = properties.filter((p) => p.latitude != null && p.longitude != null);
    if (validProps.length > 0) {
      const bounds = L.latLngBounds(
        validProps.map((p) => [Number(p.latitude), Number(p.longitude)] as [number, number])
      );
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [landmark, properties, map]);

  return null;
}

export default function SearchProximityMap({
  properties,
  landmark,
  radiusKm = 10,
  height = 560
}: SearchProximityMapProps) {
  // พิกัดศูนย์กลางเริ่มต้น (ถ้ามี Landmark ใช้พิกัด Landmark, ถ้าไม่มีใช้ทรัพย์แรกหรือหาดใหญ่)
  const defaultCenter: [number, number] = landmark
    ? [landmark.lat, landmark.lng]
    : properties[0]?.latitude != null && properties[0]?.longitude != null
    ? [Number(properties[0].latitude), Number(properties[0].longitude)]
    : [7.0089, 100.4812];

  // กรองเฉพาะทรัพย์ที่มีพิกัดถูกต้อง
  const validProperties = properties.filter(
    (p) => p.latitude != null && p.longitude != null && !isNaN(Number(p.latitude)) && !isNaN(Number(p.longitude))
  );

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm"
      style={{ height }}
    >
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsUpdater landmark={landmark} properties={validProperties} />

        {/* 1. แสดงหมุดและรัศมีของ Landmark ศูนย์กลาง */}
        {landmark && (
          <>
            <Marker position={[landmark.lat, landmark.lng]} icon={landmarkIcon}>
              <Popup className="custom-leaflet-popup">
                <div className="p-2 space-y-1 text-slate-800 text-xs">
                  <div className="flex items-center gap-1.5 font-black text-rose-600">
                    <Navigation className="w-3.5 h-3.5 shrink-0" />
                    <span>จุดศูนย์กลางค้นหา</span>
                  </div>
                  <div className="font-extrabold text-sm text-slate-900">{landmark.name}</div>
                  {landmark.description && (
                    <div className="text-[11px] text-slate-500 leading-tight">{landmark.description}</div>
                  )}
                  <div className="text-[10px] text-slate-400 pt-1">
                    แสดงอสังหาฯ ในรัศมี {radiusKm} กม.
                  </div>
                </div>
              </Popup>
            </Marker>

            {/* วงกลมแสดงรัศมีรอบ Landmark */}
            <Circle
              center={[landmark.lat, landmark.lng]}
              radius={radiusKm * 1000}
              pathOptions={{
                color: '#2563eb',
                fillColor: '#3b82f6',
                fillOpacity: 0.1,
                weight: 1.5,
                dashArray: '6, 6'
              }}
            />
          </>
        )}

        {/* 2. แสดงหมุดของอสังหาริมทรัพย์รอบๆ */}
        {validProperties.map((prop) => (
          <Marker
            key={prop.id}
            position={[Number(prop.latitude), Number(prop.longitude)]}
            icon={propertyIcon}
          >
            <Popup className="custom-leaflet-popup">
              <div className="w-56 p-1 text-slate-800 text-xs space-y-2">
                {/* รูปภาพพรีวิว */}
                <div className="relative h-28 w-full rounded-lg overflow-hidden bg-slate-100">
                  <Image
                    src={prop.image || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80'}
                    alt={prop.title}
                    fill
                    className="object-cover"
                  />
                  {prop.distanceText && (
                    <div className="absolute top-1.5 left-1.5 bg-blue-600 text-white font-extrabold px-1.5 py-0.5 rounded text-[10px] shadow-sm flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5 shrink-0" />
                      <span>{prop.distanceText}</span>
                    </div>
                  )}
                </div>

                {/* รายละเอียด */}
                <div>
                  <div className="font-black text-blue-700 text-sm">{prop.price}</div>
                  <h4 className="font-bold text-slate-900 text-xs line-clamp-1 mt-0.5">{prop.title}</h4>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{prop.location}</span>
                  </div>
                </div>

                {/* สเปก */}
                <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold pt-1 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <Bed className="w-3 h-3 text-blue-600" /> {prop.bedrooms} นอน
                  </span>
                  <span className="flex items-center gap-1">
                    <Bath className="w-3 h-3 text-blue-600" /> {prop.bathrooms} น้ำ
                  </span>
                  <span>{prop.area} ตร.ม.</span>
                </div>

                {/* ลิงก์ไปหน้ารายละเอียด */}
                <Link
                  href={`/property/${prop.id}`}
                  className="block w-full text-center py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-1 shadow-xs"
                >
                  <span>ดูรายละเอียด</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
