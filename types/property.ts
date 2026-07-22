export interface Property {
  id: string | number;
  title: string;
  price: string;
  type: string;
  tag: string;
  tagBg: string;
  location: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  image: string;
  agentName: string;
  agentImage: string;
  isPremium?: boolean;
  description?: string;
  latitude?: number;
  longitude?: number;
  province_id?: number | null;
  amphure_id?: number | null;
  district_id?: number | null;
  provinceName?: string;
  amphureName?: string;
  districtName?: string;
}
