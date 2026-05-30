import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, ScrollView, Vibration, Platform, Animated, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Compass, Calendar, ShieldCheck } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface Slide {
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
}

const slides: Slide[] = [
  {
    title: 'Discover Local Flavors',
    description: 'Find and explore your favorite neighborhood restaurants and retail shops at your fingertips.',
    icon: Compass,
    color: '#eab308', // gold
  },
  {
    title: 'Reserve in Advance',
    description: 'Book your tables and place orders ahead of time to skip the queues and enjoy your dining experience.',
    icon: Calendar,
    color: '#2dd4bf', // teal
  },
  {
    title: 'Real-time Tracker',
    description: 'Monitor your deliveries and dining orders step-by-step from preparation to fulfillment with secure verification.',
    icon: ShieldCheck,
    color: '#c084fc', // purple
  },
];

export default function OnboardingScreen() {
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false, // Set to false because we are animating layout properties (width) of the indicators
      listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const slideSize = event.nativeEvent.layoutMeasurement.width;
        const offset = event.nativeEvent.contentOffset.x;
        const activeIndex = Math.round(offset / slideSize);
        if (activeIndex !== activeSlide && activeIndex >= 0 && activeIndex < slides.length) {
          setActiveSlide(activeIndex);
          Vibration.vibrate(8); // Soft premium haptic tick on swipe transition
        }
      }
    }
  );

  const handleNext = () => {
    if (activeSlide < slides.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: (activeSlide + 1) * width,
        animated: true,
      });
      setActiveSlide(activeSlide + 1);
      Vibration.vibrate(10); // Haptic feedback on button press
    } else {
      Vibration.vibrate(15);
      router.push('/signup');
    }
  };

  const handleSkip = () => {
    Vibration.vibrate(10);
    router.push('/login');
  };

  const handleDotPress = (index: number) => {
    Vibration.vibrate(10);
    scrollViewRef.current?.scrollTo({
      x: index * width,
      animated: true,
    });
    setActiveSlide(index);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.logoText}>CHAPUU</Text>
        {activeSlide < slides.length - 1 ? (
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <View style={styles.slideContainer}>
        {/* Glowing backdrop atmosphere layers blending smoothly */}
        {slides.map((slide, index) => {
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0, 0.14, 0],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={index}
              style={[
                styles.glowBlob,
                {
                  backgroundColor: slide.color,
                  opacity: opacity,
                }
              ]}
            />
          );
        })}

        <Animated.ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {slides.map((slide, index) => {
            const Icon = slide.icon;
            const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

            // Icon elastic scale and rotation
            const iconScale = scrollX.interpolate({
              inputRange,
              outputRange: [0.8, 1, 0.8],
              extrapolate: 'clamp',
            });
            const iconOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            const iconRotate = scrollX.interpolate({
              inputRange,
              outputRange: ['-12deg', '0deg', '12deg'],
              extrapolate: 'clamp',
            });

            // Parallax shift for content
            const titleTranslateX = scrollX.interpolate({
              inputRange,
              outputRange: [80, 0, -80],
              extrapolate: 'clamp',
            });
            const descTranslateX = scrollX.interpolate({
              inputRange,
              outputRange: [120, 0, -120],
              extrapolate: 'clamp',
            });

            return (
              <View key={index} style={[styles.slide, { width }]}>
                <Animated.View 
                  style={[
                    styles.iconContainer, 
                    { 
                      borderColor: `${slide.color}30`,
                      opacity: iconOpacity,
                      transform: [
                        { scale: iconScale },
                        { rotate: iconRotate }
                      ]
                    }
                  ]}
                >
                  <Icon size={80} color={slide.color} />
                </Animated.View>
                <Animated.Text 
                  style={[
                    styles.title, 
                    { 
                      transform: [{ translateX: titleTranslateX }] 
                    }
                  ]}
                >
                  {slide.title}
                </Animated.Text>
                <Animated.Text 
                  style={[
                    styles.description, 
                    { 
                      transform: [{ translateX: descTranslateX }] 
                    }
                  ]}
                >
                  {slide.description}
                </Animated.Text>
              </View>
            );
          })}
        </Animated.ScrollView>
      </View>

      <View style={styles.footer}>
        {/* Elastic Slide Indicators */}
        <View style={styles.indicatorContainer}>
          {slides.map((slide, index) => {
            const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
            
            // Dot width stretches dynamically during transition
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });

            // Dot opacity transitions smoothly
            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.15, 1, 0.15],
              extrapolate: 'clamp',
            });

            return (
              <TouchableOpacity
                key={index}
                onPress={() => handleDotPress(index)}
                activeOpacity={0.8}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Animated.View
                  style={[
                    styles.indicator,
                    { 
                      width: dotWidth,
                      opacity: dotOpacity,
                      backgroundColor: slide.color,
                    }
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Action Buttons */}
        <TouchableOpacity 
          style={[styles.primaryButton, { backgroundColor: slides[activeSlide].color }]} 
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>
            {activeSlide === slides.length - 1 ? 'GET STARTED' : 'CONTINUE'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={() => {
            Vibration.vibrate(10);
            router.push('/login');
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>
            I already have an account. <Text style={styles.loginHighlight}>Log In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617', // bg-dark-950
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2,
  },
  skipText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  slideContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowBlob: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 40,
      },
      android: {
        elevation: 0,
      }
    }),
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    alignItems: 'center',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#020617', // dark font matching branding
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  secondaryButton: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  secondaryButtonText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  loginHighlight: {
    color: '#eab308',
    fontWeight: '800',
  },
});
