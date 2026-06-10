import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import ScalePressable, { ScaleIconButton } from '../ScalePressable';
import { MapPin } from 'lucide-react-native';
import * as Location from 'expo-location';
import { colors, spacing, borderRadius } from '../../theme';
import { triggerLightHaptic, triggerSelectionHaptic } from '../../hooks/useHaptics';
import { useUser } from '../../context/UserContext';

interface DeliveryLocationPickerProps {
  initialLocation: string;
  initialPhone: string;
  initialLat: number | null;
  initialLng: number | null;
  initialDirections: string;
  onLocationChange: (location: string, lat: number | null, lng: number | null) => void;
  onPhoneChange: (phone: string) => void;
  onDirectionsChange: (directions: string) => void;
  isLocating?: boolean;
  onGetLocation?: () => void;
}

export function DeliveryLocationPicker({
  initialLocation,
  initialPhone,
  initialLat,
  initialLng,
  initialDirections,
  onLocationChange,
  onPhoneChange,
  onDirectionsChange,
  isLocating: propsIsLocating,
  onGetLocation
}: DeliveryLocationPickerProps) {
  const { theme } = useUser();
  const activeColors = {
    card: theme === 'legacy' ? colors.surfaceHighlight : '#121212',
    border: theme === 'legacy' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.16)',
    inputBg: theme === 'legacy' ? colors.dark[950] : '#000000',
    inputBorder: theme === 'legacy' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.16)',
  };

  const [deliveryLocation, setDeliveryLocation] = useState(initialLocation);
  const [phoneNumber, setPhoneNumber] = useState(initialPhone);
  const [directions, setDirections] = useState(initialDirections);
  const [localIsLocating, setLocalIsLocating] = useState(false);

  const activeIsLocating = propsIsLocating !== undefined ? propsIsLocating : localIsLocating;

  useEffect(() => {
    setDeliveryLocation(initialLocation);
  }, [initialLocation]);

  useEffect(() => {
    setPhoneNumber(initialPhone);
  }, [initialPhone]);

  useEffect(() => {
    setDirections(initialDirections);
  }, [initialDirections]);

  const handleLocationChange = (text: string) => {
    setDeliveryLocation(text);
    onLocationChange(text, initialLat, initialLng);
  };

  const handlePhoneChange = (text: string) => {
    const val = text.replace(/\D/g, ''); // Digits only
    if (val.length <= 9) {
      setPhoneNumber(val);
      onPhoneChange(val);
    }
  };

  const handleDirectionsChange = (text: string) => {
    setDirections(text);
    onDirectionsChange(text);
  };

  const handleGetLocation = () => {
    triggerSelectionHaptic();
    if (onGetLocation) {
      onGetLocation();
    } else {
      getLocation();
    }
  };

  const getLocation = async () => {
    setLocalIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        setLocalIsLocating(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (reverseGeocode.length > 0) {
          const place = reverseGeocode[0];
          const address = `${place.name || place.street}, ${place.city}`;
          setDeliveryLocation(address);
          onLocationChange(address, location.coords.latitude, location.coords.longitude);
        } else {
          setDeliveryLocation('GPS Location Acquired');
          onLocationChange('GPS Location Acquired', location.coords.latitude, location.coords.longitude);
        }
      } catch (e) {
        setDeliveryLocation('GPS Location Acquired');
        onLocationChange('GPS Location Acquired', location.coords.latitude, location.coords.longitude);
      }
    } catch (e) {
      console.warn(e);
      alert('Could not get location. Please enter manually.');
    } finally {
      setLocalIsLocating(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
      <Text style={styles.sectionTitle}>Delivery Details</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Phone Number</Text>
        <View style={styles.phoneInputRow}>
          <View style={[styles.phonePrefixBox, { backgroundColor: activeColors.inputBg, borderColor: activeColors.inputBorder }]}>
            <Text style={styles.phonePrefixText}>+255</Text>
          </View>
          <TextInput
            style={[styles.input, styles.phoneInput, { backgroundColor: activeColors.inputBg, borderColor: activeColors.inputBorder }]}
            placeholder="e.g. 712345678"
            placeholderTextColor={colors.text.tertiary}
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={handlePhoneChange}
          />
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <View style={styles.locationHeaderRow}>
          <Text style={styles.label}>Delivery Address (GPS Located)</Text>
        </View>
        <View style={styles.locationInputWrapper}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0, paddingRight: 50, backgroundColor: activeColors.inputBg, borderColor: activeColors.inputBorder }]}
            placeholder={activeIsLocating ? "Locating..." : "GPS coordinates required..."}
            placeholderTextColor={colors.text.tertiary}
            value={deliveryLocation}
            onChangeText={handleLocationChange}
            multiline
          />
          <ScalePressable
            style={styles.gpsButton}
            onPress={handleGetLocation}
            disabled={activeIsLocating}
          >
            {activeIsLocating ? (
              <ActivityIndicator size="small" color={colors.primary[500]} />
            ) : (
              <MapPin size={20} color={colors.primary[500]} />
            )}
          </ScalePressable>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Delivery Directions & Landmarks</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: activeColors.inputBg, borderColor: activeColors.inputBorder }]}
          placeholder="e.g. Opposite the main market, green gate, 2nd floor"
          placeholderTextColor={colors.text.tertiary}
          value={directions}
          onChangeText={handleDirectionsChange}
          multiline
          numberOfLines={2}
        />
        <Text style={styles.helperText}>
          Provide rider instructions, building name, house number, or landmarks to ensure fast delivery.
        </Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceHighlight,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.dark[950],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text.primary,
    fontSize: 14,
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  phonePrefixBox: {
    backgroundColor: colors.dark[950],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phonePrefixText: {
    color: colors.text.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  phoneInput: {
    flex: 1,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  locationInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gpsButton: {
    position: 'absolute',
    right: 8,
    padding: 8,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 10,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
});
