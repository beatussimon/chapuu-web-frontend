import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import WebViewTab from '../../components/WebViewTab';
import { useUser } from '../../context/UserContext';
import { useWebViewStateUpdate } from '../../hooks/useWebViewStateUpdate';

export default function Tab1Screen() {
  const { userRole, pendingDeepLinkPath, setPendingDeepLinkPath } = useUser();
  const handleStateUpdate = useWebViewStateUpdate();
  const [currentPath, setCurrentPath] = useState<string>('/');

  useEffect(() => {
    let defaultPath = '/';
    if (userRole !== 'CUSTOMER') {
      defaultPath = '/seller';
    }

    if (pendingDeepLinkPath && (pendingDeepLinkPath === '/' || pendingDeepLinkPath.startsWith('/menu'))) {
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
