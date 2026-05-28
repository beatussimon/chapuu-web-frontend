import React from 'react';
import { View, StyleSheet } from 'react-native';
import WebViewTab from '../../components/WebViewTab';
import { useUser } from '../../context/UserContext';

export default function Tab2Screen() {
  const { userRole, updateUser } = useUser();

  const getPath = () => {
    switch (userRole) {
      case 'CUSTOMER':
        return '/stores?type=RESTAURANT';
      case 'SELLER':
      case 'ADMIN':
      case 'SUPERUSER':
      case 'CHEF':
        return '/seller/menu';
      case 'DELIVERY':
        return '/delivery';
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
