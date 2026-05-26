import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Compass, Calendar, ShieldCheck } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface Slide {
  title: string;
  description: string;
  icon: any;
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

  const handleNext = () => {
    if (activeSlide < slides.length - 1) {
      setActiveSlide(activeSlide + 1);
    } else {
      router.push('/signup');
    }
  };

  const handleSkip = () => {
    router.push('/login');
  };

  const ActiveIcon = slides[activeSlide].icon;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.logoText}>CHAPUU</Text>
        {activeSlide < slides.length - 1 && (
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.slideContainer}>
        {/* Glowing backdrop blur blobs */}
        <View style={[styles.glowBlob, { backgroundColor: `${slides[activeSlide].color}12` }]} />

        <View style={[styles.iconContainer, { borderColor: `${slides[activeSlide].color}30` }]}>
          <ActiveIcon size={80} color={slides[activeSlide].color} />
        </View>

        <Text style={styles.title}>{slides[activeSlide].title}</Text>
        <Text style={styles.description}>{slides[activeSlide].description}</Text>
      </View>

      <View style={styles.footer}>
        {/* Slide Indicators */}
        <View style={styles.indicatorContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                { 
                  backgroundColor: index === activeSlide ? slides[activeSlide].color : 'rgba(255,255,255,0.15)',
                  width: index === activeSlide ? 24 : 8,
                }
              ]}
            />
          ))}
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
          onPress={() => router.push('/login')}
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
    paddingHorizontal: 32,
    position: 'relative',
  },
  glowBlob: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    filter: 'blur(40px)', // Expo handles this natively on newer engines, otherwise safe fallback
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
