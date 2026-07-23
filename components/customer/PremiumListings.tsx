import Link from 'next/link';
import Image from 'next/image';
import { Property } from '@/types';

interface PremiumListingsProps {
  properties: Property[];
}

export default function PremiumListings({ properties }: PremiumListingsProps) {
  if (!properties || properties.length === 0) return null;

  return (
    <section className="py-10 bg-slate-50 border-t border-slate-200">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-6">
          <h2 className="text-xl font-extrabold text-slate-900 mb-1">⭐ อสังหาริมทรัพย์พรีเมียมแนะนำ</h2>
          <p className="text-slate-500 text-xs">คัดสรรเฉพาะบ้านและคอนโดหรูทำเลทองจากนายหน้าที่สมัครแพ็กเกจโฆษณา</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {properties.map((prop) => (
            <Link 
              key={prop.id}
              href={`/property/${prop.id}`}
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-slate-200 flex flex-col sm:flex-row"
            >
              <div className="sm:w-1/2 h-48 sm:h-auto relative">
                <Image src={prop.image} alt={prop.title} width={240} height={192} className="w-full h-full object-cover" />
              </div>
              <div className="p-4 sm:w-1/2 flex flex-col justify-between">
                <div>
                  <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">{prop.type}</span>
                  <h3 className="font-bold text-sm text-slate-900 mt-1.5 line-clamp-1">{prop.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{prop.location}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-blue-700 font-extrabold text-sm">{prop.price}</span>
                  <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold">ดูรายละเอียด</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
