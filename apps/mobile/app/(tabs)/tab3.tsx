import React from 'react';
import { View, StyleSheet } from 'react-native';
import WebViewTab from '../../components/WebViewTab';
import { useUser } from '../../context/UserContext';

export default function Tab3Screen() {
  const { userRole, updateUser } = useUser();

  const getPath = () => {
    switch (userRole) {
      case 'CUSTOMER':
        return '/cart';
      case 'SELLER':
      case 'ADMIN':
      case 'SUPERUSER':
        return '/seller/analytics';
      default:
        return '/';
    }
  };

  const handleStateUpdate = (state: any) => {
    if (state) {
      const { userRole: newRole, token: newToken } = state;
      updateUser(newRole || 'CUSTOMER', newToken || null);
    } else {
      updateUser('CUSTOMER', null);
    }
  };

  return (
    <View style={styles.container}>
      <WebViewTab path={getPath()} onStateUpdate={handleStateUpdate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
});
