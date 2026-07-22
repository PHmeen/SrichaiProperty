import Link from 'next/link';
import Image from 'next/image';

const locations = [
  { name: "หาดใหญ่", count: 124, image: "https://images.unsplash.com/photo-1563492065599-3520f775eeed?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
  { name: "เมืองสงขลา", count: 86, image: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
  { name: "สะเดา", count: 45, image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
  { name: "ระโนด", count: 28, image: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
];

export default function PopularLocations() {
  return (
    <section className="py-10 bg-white">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-6">
          <h2 className="text-xl font-extrabold text-slate-900 mb-1">ทำเลยอดนิยม</h2>
          <p className="text-slate-500 text-xs">ค้นหาอสังหาริมทรัพย์ในพื้นที่ยอดฮิต</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {locations.map((loc, i) => (
            <Link 
              key={i} 
              href="/search"
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
                <p className="text-slate-300 text-[10px]">{loc.count} ประกาศ</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
