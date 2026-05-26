import React from 'react';
import { View, StyleSheet } from 'react-native';
import WebViewTab from '../../components/WebViewTab';
import { useUser } from '../_layout';

export default function Tab1Screen() {
  const { userRole, updateUser } = useUser();

  // Determine path based on role
  const getPath = () => {
    if (userRole === 'CUSTOMER') {
      return '/';
    }
    // All other roles default to seller dashboard
    return '/seller';
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
