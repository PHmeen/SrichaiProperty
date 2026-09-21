export interface PropertyNearbyItem {
  id?: number | string;
  name: string;
  type?: string | null;
  category?: 'shopping' | 'education' | 'hospital' | 'transport' | string;
  transitType?: 'bus' | 'train' | 'ferry' | 'flight' | string;
  distance?: number | null;
  distanceKm?: number | null;
  distanceText?: string | null;
  latitude?: number;
  longitude?: number;
}

export interface Property {
  id: string | number;
  title: string;
  price: string;
  listingType: 'sale' | 'rent';
  type: string;
  type_id?: number | null;
  tag: string;
  tagBg: string;
  location: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  image: string;
  images?: string[];
  agentName: string;
  agentImage: string;
  isPremium?: boolean;
  description?: string;
  latitude?: number;
  longitude?: number;
  province_id?: number | null;
  amphure_id?: number | null;
  district_id?: number | null;
  agent_id?: string | null;
  agentRating?: number;
  agentReviewCount?: number;
  provinceName?: string;
  amphureName?: string;
  districtName?: string;
  
  commonFee?: number | null;
  parking?: number | null;
  floors?: number | null;
  ownership?: string | null;
  amenities?: string[];
  nearbies?: PropertyNearbyItem[];
}
