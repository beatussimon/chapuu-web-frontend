// Shared Types and Utilities for Chapuu Client (Web & Mobile)

export interface User {
  id: number;
  email: string;
  role: 'CUSTOMER' | 'SELLER' | 'ADMIN' | 'CHEF' | 'ACCOUNTANT' | 'DELIVERY';
  username: string;
}

export interface Store {
  id: number;
  name: string;
  currency: string;
}
