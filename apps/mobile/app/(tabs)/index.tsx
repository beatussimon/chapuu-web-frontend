import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import WebViewTab from '../../components/WebViewTab';
import { useUser } from '../../context/UserContext';
import { useWebViewStateUpdate } from '../../hooks/useWebViewStateUpdate';

import DiscoverScreen from '../../components/DiscoverScreen';

export default function Tab1Screen() {
  const { userRole, pendingDeepLinkPath, setPendingDeepLinkPath } = useUser();
  const handleStateUpdate = useWebViewStateUpdate();
  const [currentPath, setCurrentPath] = useState<string>('/');

  // 1. Set default path when userRole changes
  useEffect(() => {
    let defaultPath = '/';
    if (userRole !== 'CUSTOMER') {
      defaultPath = '/seller';
    }
    setCurrentPath(defaultPath);
  }, [userRole]);

  // 2. Consume pending deep link reactively without resetting on null
  useEffect(() => {
    if (pendingDeepLinkPath && (pendingDeepLinkPath === '/' || pendingDeepLinkPath.startsWith('/menu'))) {
      setCurrentPath(pendingDeepLinkPath);
      setPendingDeepLinkPath(null);
    }
  }, [pendingDeepLinkPath, setPendingDeepLinkPath]);

  return (
    <View style={styles.container}>
      {userRole === 'CUSTOMER' && currentPath === '/' ? (
        <DiscoverScreen />
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
