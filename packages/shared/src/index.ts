// Shared Types and Utilities for Chapuu Client (Web & Mobile)

export interface User {
  id: number;
  email: string;
  role: 'CUSTOMER' | 'SELLER' | 'ADMIN' | 'CHEF' | 'ACCOUNTANT' | 'DELIVERY';
  username: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string | null;
}

export interface Store {
  id: number;
  name: string;
  currency: string;
}
