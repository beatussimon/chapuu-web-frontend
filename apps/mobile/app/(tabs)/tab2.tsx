import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import WebViewTab from '../../components/WebViewTab';
import StoreMenuScreen from '../../components/StoreMenuScreen';
import { useUser } from '../../context/UserContext';
import { useWebViewStateUpdate } from '../../hooks/useWebViewStateUpdate';

export default function Tab2Screen() {
  const { userRole, pendingDeepLinkPath, setPendingDeepLinkPath } = useUser();
  const handleStateUpdate = useWebViewStateUpdate();
  const { store } = useLocalSearchParams();
  const [currentPath, setCurrentPath] = useState<string>('/stores?type=RESTAURANT');

  useEffect(() => {
    let defaultPath = '/';
    switch (userRole) {
      case 'CUSTOMER':
        defaultPath = '/stores?type=RESTAURANT';
        break;
      case 'SELLER':
      case 'ADMIN':
      case 'SUPERUSER':
      case 'CHEF':
        defaultPath = '/seller/menu';
        break;
      case 'DELIVERY':
        defaultPath = '/delivery';
        break;
      default:
        defaultPath = '/stores?type=RESTAURANT';
    }

    if (pendingDeepLinkPath && (pendingDeepLinkPath.startsWith('/stores') || pendingDeepLinkPath.startsWith('/menu'))) {
      setCurrentPath(pendingDeepLinkPath);
      setPendingDeepLinkPath(null);
    } else {
      setCurrentPath(defaultPath);
    }
  }, [userRole, pendingDeepLinkPath, setPendingDeepLinkPath]);

  return (
    <View style={styles.container}>
      {userRole === 'CUSTOMER' && store ? (
        <StoreMenuScreen storeId={store as string} />
      ) : (
        <WebViewTab path={currentPath} onStateUpdate={handleStateUpdate} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
});
