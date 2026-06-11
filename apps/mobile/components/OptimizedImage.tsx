import React from 'react';
import {
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
  Image,
  ImageProps,
  ActivityIndicator,
  ImageResizeMode,
} from 'react-native';
import { ChefHat, ShoppingBag, Utensils, User } from 'lucide-react-native';
import { colors } from '../theme';

interface OptimizedImageProps extends Omit<ImageProps, 'source' | 'resizeMode'> {
  /** Image URL — relative paths are prefixed with EXPO_PUBLIC_WEB_URL */
  src?: string;
  /** Category of placeholder icon shown when there is no image or it fails to load */
  placeholderType?: 'store' | 'product' | 'profile';
  /** Used to pick the right placeholder icon for stores */
  storeType?: 'RESTAURANT' | 'SHOP';
  /** Style applied to the outer wrapper View */
  wrapperStyle?: StyleProp<ViewStyle>;
  /**
   * When true, shows a gold ActivityIndicator spinner while the image loads.
   * Ideal for hero / lightbox images where the user is actively waiting.
   */
  showLoader?: boolean;
  /**
   * React Native Image resizeMode. Defaults to 'cover'.
   */
  resizeMode?: ImageResizeMode;
  /**
   * Android-only fade duration in ms. Set to 0 for instant display (no slow fade).
   * Defaults to 0 for snappier UX.
   */
  fadeDuration?: number;
  /**
   * Image cache policy passed directly to the Image source.
   * 'force-cache' serves from disk on revisit (great for lightboxes).
   * 'reload' always fetches fresh. Defaults to 'default'.
   */
  cache?: 'default' | 'reload' | 'force-cache' | 'only-if-cached';
}

export default function OptimizedImage({
  src,
  placeholderType = 'store',
  storeType = 'RESTAURANT',
  wrapperStyle,
  style,
  showLoader = false,
  resizeMode = 'cover',
  fadeDuration = 0,
  cache = 'default',
  ...props
}: OptimizedImageProps) {
  const [error, setError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  // Reset states when src changes
  React.useEffect(() => {
    setError(false);
    setIsLoading(true);
  }, [src]);

  // Helper to ensure URL is always absolute
  const getFullUrl = (url: string): string => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || 'https://chapuu.com';
    return `${WEB_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const imageUri = getFullUrl(src || '');

  // ── Placeholder (no src or load error) ──────────────────────────────────────
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

  // ── Image ────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.wrapper, wrapperStyle]}>
      <Image
        source={{ uri: imageUri, cache }}
        style={[styles.image, style]}
        resizeMode={resizeMode}
        fadeDuration={fadeDuration}
        onLoadStart={() => setIsLoading(true)}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          console.warn(`[OptimizedImage] Failed to load: ${imageUri}`);
          setError(true);
          setIsLoading(false);
        }}
        {...props}
      />

      {/* Loading skeleton — only when showLoader is enabled and image is still fetching */}
      {showLoader && isLoading && (
        <View style={styles.loaderOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      )}
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
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
