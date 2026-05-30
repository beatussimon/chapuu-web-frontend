import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { Image, ImageProps } from 'expo-image';
import { ChefHat, ShoppingBag, Utensils } from 'lucide-react-native';
import { colors } from '../theme';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  src: string;
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

  // If no source or error loading, show placeholder
  if (!src || error) {
    return (
      <View style={[styles.placeholderContainer, wrapperStyle, style as ViewStyle]}>
        {placeholderType === 'product' ? (
          <Utensils size={48} color={colors.border} />
        ) : storeType === 'SHOP' ? (
          <ShoppingBag size={48} color={colors.border} />
        ) : (
          <ChefHat size={48} color={colors.border} />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, wrapperStyle]}>
      <Image
        source={{ uri: src }}
        style={[styles.image, style]}
        contentFit="cover"
        transition={300}
        cachePolicy="disk"
        onError={() => setError(true)}
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
    backgroundColor: '#1e293b', // slate-800
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
});
