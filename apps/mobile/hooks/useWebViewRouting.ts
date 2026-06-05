import { useCallback } from 'react';
import { Linking, Vibration } from 'react-native';
import { useRouter } from 'expo-router';

export function useWebViewRouting(
  BASE_URL: string,
  path: string,
  userRole: string | null,
  setPendingDeepLinkPath: (p: string) => void
) {
  const router = useRouter();

  const handleShouldStartLoadWithRequest = useCallback((request: { url: string }) => {
    const { url } = request;

    // 1. Intercept custom URL schemes
    const isCustomScheme = url.startsWith('tel:') || url.startsWith('mailto:') || url.startsWith('sms:') || url.startsWith('whatsapp:');
    const isWhatsAppWeb = url.includes('wa.me') || url.includes('api.whatsapp.com');
    const isWebUrl = url.startsWith('http://') || url.startsWith('https://');
    const isExternalWebUrl = isWebUrl && !url.startsWith(BASE_URL);

    if (isCustomScheme || isWhatsAppWeb || isExternalWebUrl) {
      Linking.openURL(url).catch((err) => console.warn('Failed to open URL natively:', err));
      return false; 
    }

    if (!url.startsWith(BASE_URL)) return true;

    // 2. Parse URL safely
    let pathname = '/';
    let search = '';
    try {
      const urlObj = new URL(url);
      pathname = urlObj.pathname;
      search = urlObj.search;
    } catch (e) {
      return true;
    }

    // 3. Robust Regex Matching instead of string matching
    if (/^\/menu(\/.*)?$/.test(pathname)) {
      const urlObj = new URL(url);
      const storeId = urlObj.searchParams.get('store');
      if (storeId) {
        router.navigate({ pathname: '/(tabs)/tab2', params: { store: storeId } } as any);
        return false;
      }
    }

    if (/^\/order\/track\/.+/.test(pathname)) {
      Vibration.vibrate(10);
      const orderId = pathname.split('/').pop();
      if (orderId) {
        router.navigate(`/order/${orderId}` as any);
      }
      return false;
    }

    // 4. Tab Redirects
    const tabMapping: Record<string, string> = {};
    if (userRole === 'CUSTOMER') {
      tabMapping['/'] = '/(tabs)';
      tabMapping['/stores'] = '/(tabs)/tab2';
      tabMapping['/cart'] = '/(tabs)/tab3';
      tabMapping['/orders'] = '/(tabs)/tab4';
      tabMapping['/reserve'] = '/(tabs)/tab5';
    } else if (['SELLER', 'ADMIN', 'SUPERUSER'].includes(userRole || '')) {
      tabMapping['/seller'] = '/(tabs)';
      tabMapping['/seller/menu'] = '/(tabs)/tab2';
      tabMapping['/seller/analytics'] = '/(tabs)/tab3';
      tabMapping['/seller/inventory'] = '/(tabs)/tab4';
    }

    const currentTabPath = path.startsWith('/') ? path : `/${path}`;
    const currentTabPathname = currentTabPath.split('?')[0];

    if (tabMapping[pathname] && pathname !== currentTabPathname) {
      router.navigate(tabMapping[pathname] as any);
      return false;
    }

    return true;
  }, [path, BASE_URL, userRole, router, setPendingDeepLinkPath]);

  return { handleShouldStartLoadWithRequest };
}
