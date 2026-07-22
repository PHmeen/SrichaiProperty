export interface Profile {
  fullName: string;
  phone: string;
  email: string;
  role: 'buyer' | 'agent' | 'admin';
}
