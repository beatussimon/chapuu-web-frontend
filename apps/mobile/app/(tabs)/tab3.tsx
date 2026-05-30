import React from 'react';
import { View, StyleSheet } from 'react-native';
import WebViewTab from '../../components/WebViewTab';
import { useUser } from '../../context/UserContext';
import { useWebViewStateUpdate } from '../../hooks/useWebViewStateUpdate';

import CartScreen from '../../components/CartScreen';

export default function Tab3Screen() {
  const { userRole } = useUser();
  const handleStateUpdate = useWebViewStateUpdate();

  const getPath = () => {
    switch (userRole) {
      case 'SELLER':
      case 'ADMIN':
      case 'SUPERUSER':
        return '/seller/analytics';
      default:
        return '/';
    }
  };

  return (
    <View style={styles.container}>
      {userRole === 'CUSTOMER' ? (
        <CartScreen />
      ) : (
        <WebViewTab path={getPath()} onStateUpdate={handleStateUpdate} />
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
