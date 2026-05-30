import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import WebViewTab from '../../components/WebViewTab';
import { useUser } from '../../context/UserContext';
import { useWebViewStateUpdate } from '../../hooks/useWebViewStateUpdate';

export default function Tab2Screen() {
  const { userRole, pendingDeepLinkPath, setPendingDeepLinkPath } = useUser();
  const handleStateUpdate = useWebViewStateUpdate();
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
    }

    if (pendingDeepLinkPath && pendingDeepLinkPath.startsWith('/stores')) {
      setCurrentPath(pendingDeepLinkPath);
      setPendingDeepLinkPath(null);
    } else {
      setCurrentPath(defaultPath);
    }
  }, [userRole, pendingDeepLinkPath, setPendingDeepLinkPath]);

  return (
    <View style={styles.container}>
      <WebViewTab path={currentPath} onStateUpdate={handleStateUpdate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
});
