export type AppFeature = 
  | 'CUSTOMER_FEATURES'
  | 'SELLER_FEATURES'
  | 'STAFF_FEATURES'
  | 'MANAGE_MENU'
  | 'VIEW_ANALYTICS'
  | 'MANAGE_INVENTORY'
  | 'MANAGE_RESERVATIONS'
  | 'MANAGE_QR'
  | 'TV_DASHBOARD'
  | 'PLATFORM_ADMIN'
  | 'ACCOUNTING'
  | 'DELIVERY_DISPATCH';

export const RolePermissions: Record<string, AppFeature[]> = {
  CUSTOMER: ['CUSTOMER_FEATURES'],
  
  SELLER: [
    'SELLER_FEATURES',
    'STAFF_FEATURES',
    'MANAGE_MENU',
    'VIEW_ANALYTICS',
    'MANAGE_INVENTORY',
    'MANAGE_RESERVATIONS',
    'MANAGE_QR',
    'TV_DASHBOARD'
  ],
  
  CHEF: [
    'STAFF_FEATURES',
    'TV_DASHBOARD' 
  ],

  ACCOUNTANT: [
    'ACCOUNTING'
  ],

  DELIVERY: [
    'DELIVERY_DISPATCH'
  ],
  
  ADMIN: [
    'SELLER_FEATURES',
    'STAFF_FEATURES',
    'MANAGE_MENU',
    'VIEW_ANALYTICS',
    'MANAGE_INVENTORY',
    'MANAGE_RESERVATIONS',
    'MANAGE_QR',
    'TV_DASHBOARD',
    'PLATFORM_ADMIN'
  ],
  
  SUPERUSER: [
    'SELLER_FEATURES',
    'STAFF_FEATURES',
    'MANAGE_MENU',
    'VIEW_ANALYTICS',
    'MANAGE_INVENTORY',
    'MANAGE_RESERVATIONS',
    'MANAGE_QR',
    'TV_DASHBOARD',
    'PLATFORM_ADMIN'
  ]
};

export function hasPermission(role: string | null, feature: AppFeature): boolean {
  if (!role) return false;
  const permissions = RolePermissions[role.toUpperCase()];
  if (!permissions) return false;
  return permissions.includes(feature);
}
