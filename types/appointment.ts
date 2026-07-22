export interface Appointment {
  id: string | number;
  propertyId: number | string;
  date: string;
  timeSlot: string;
  note: string;
  status: 'upcoming' | 'past' | 'cancelled' | 'pending';
  propertyName: string;
  propertyPrice: string;
  propertyImage: string;
  propertyType: string;
  agentName: string;
  agentImage: string;
}
