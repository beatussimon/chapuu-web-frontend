import React from 'react';
import { Tabs } from 'expo-router';
import { useUser } from '../_layout';
import { 
  Compass, 
  Utensils, 
  ShoppingCart, 
  ShoppingBag, 
  Calendar, 
  Terminal, 
  BarChart3, 
  Package, 
  Navigation, 
  LayoutGrid 
} from 'lucide-react-native';

export default function TabLayout() {
  const { userRole } = useUser();

  // Helper to determine tab options based on role
  const getTabConfig = (tabId: string) => {
    switch (userRole) {
      case 'SELLER':
      case 'ADMIN':
      case 'SUPERUSER':
        if (tabId === 'index') return { label: 'Dashboard', icon: Terminal, href: '/' };
        if (tabId === 'tab2') return { label: 'Menu', icon: Utensils, href: '/tab2' };
        if (tabId === 'tab3') return { label: 'Analytics', icon: BarChart3, href: '/tab3' };
        if (tabId === 'tab4') return { label: 'Stock', icon: Package, href: '/tab4' };
        if (tabId === 'tab5') return { label: 'More', icon: LayoutGrid, href: '/tab5' };
        break;

      case 'CHEF':
        if (tabId === 'index') return { label: 'Dashboard', icon: Terminal, href: '/' };
        if (tabId === 'tab2') return { label: 'Menu', icon: Utensils, href: '/tab2' };
        if (tabId === 'tab5') return { label: 'More', icon: LayoutGrid, href: '/tab5' };
        break;

      case 'ACCOUNTANT':
        if (tabId === 'index') return { label: 'Dashboard', icon: Terminal, href: '/' };
        if (tabId === 'tab5') return { label: 'More', icon: LayoutGrid, href: '/tab5' };
        break;

      case 'DELIVERY':
        if (tabId === 'index') return { label: 'Dashboard', icon: Terminal, href: '/' };
        if (tabId === 'tab2') return { label: 'Deliveries', icon: Navigation, href: '/tab2' };
        if (tabId === 'tab5') return { label: 'More', icon: LayoutGrid, href: '/tab5' };
        break;

      case 'CUSTOMER':
      default:
        if (tabId === 'index') return { label: 'Discover', icon: Compass, href: '/' };
        if (tabId === 'tab2') return { label: 'Restaurants', icon: Utensils, href: '/tab2' };
        if (tabId === 'tab3') return { label: 'Cart', icon: ShoppingCart, href: '/tab3' };
        if (tabId === 'tab4') return { label: 'Orders', icon: ShoppingBag, href: '/tab4' };
        if (tabId === 'tab5') return { label: 'Reserve', icon: Calendar, href: '/tab5' };
        break;
    }
    return null; // Hide the tab if it doesn't match the role config
  };

  const getScreenOptions = (tabId: string): any => {
    const config = getTabConfig(tabId);
    if (!config) {
      return {
        href: null, // Hides tab from bottom bar
      };
    }
    const IconComponent = config.icon;
    return {
      title: config.label,
      tabBarIcon: ({ color, size }: any) => (
        <IconComponent color={color} size={size} />
      ),
    };
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#eab308', // Gold active color
        tabBarInactiveTintColor: '#94a3b8', // Slate-400 inactive color
        tabBarStyle: {
          backgroundColor: '#020617', // bg-dark-950
          borderTopWidth: 1,
          borderTopColor: 'rgba(255, 255, 255, 0.08)',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen name="index" options={getScreenOptions('index')} />
      <Tabs.Screen name="tab2" options={getScreenOptions('tab2')} />
      <Tabs.Screen name="tab3" options={getScreenOptions('tab3')} />
      <Tabs.Screen name="tab4" options={getScreenOptions('tab4')} />
      <Tabs.Screen name="tab5" options={getScreenOptions('tab5')} />
    </Tabs>
  );
}
