import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp, Image, ImageProps } from 'react-native';
import { ChefHat, ShoppingBag, Utensils, User } from 'lucide-react-native';
import { colors } from '../theme';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  src?: string;
  placeholderType?: 'store' | 'product' | 'profile';
  storeType?: 'RESTAURANT' | 'SHOP';
  wrapperStyle?: StyleProp<ViewStyle>;
}

export default function OptimizedImage({
  src,
  placeholderType = 'store',
  storeType = 'RESTAURANT',
  wrapperStyle,
  style,
  ...props
}: OptimizedImageProps) {
  const [error, setError] = React.useState(false);

  // Helper to ensure URL is absolute
  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || 'https://chapuu.com';
    return `${WEB_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const imageUri = getFullUrl(src || '');

  // If no source or error loading, show placeholder
  if (!src || error) {
    return (
      <View style={[styles.placeholderContainer, wrapperStyle, style as ViewStyle]}>
        {placeholderType === 'product' ? (
          <Utensils size={32} color={colors.text.tertiary} />
        ) : placeholderType === 'profile' ? (
          <User size={32} color={colors.text.tertiary} />
        ) : storeType === 'SHOP' ? (
          <ShoppingBag size={32} color={colors.text.tertiary} />
        ) : (
          <ChefHat size={32} color={colors.text.tertiary} />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, wrapperStyle]}>
      <Image
        source={{ uri: imageUri }}
        style={[styles.image, style]}
        resizeMode="cover"
        onError={() => {
          console.warn(`[OptimizedImage] Failed to load: ${imageUri}`);
          setError(true);
        }}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
});
