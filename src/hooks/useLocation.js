import { useAppStore } from '../store/useStore';
import toast from 'react-hot-toast';

async function reverseGeocode(lat, lng) {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            {
                headers: {
                    'User-Agent': 'Chapuu-App'
                }
            }
        );
        if (!res.ok) throw new Error('Reverse geocoding failed');
        const data = await res.json();
        
        // Return structured neighborhood or area details (e.g. Masaki, Dar es Salaam)
        const address = data.address;
        if (address) {
            const part1 = address.suburb || address.neighbourhood || address.quarter || address.village || address.city_district || '';
            const part2 = address.city || address.town || address.county || '';
            if (part1 && part2) return `${part1}, ${part2}`;
            if (part1) return part1;
            if (part2) return part2;
        }
        
        return data.display_name?.split(',').slice(0, 2).join(',') || 'Your Area';
    } catch (err) {
        console.error("Reverse geocoding error:", err);
        return 'Your Area';
    }
}

export function useLocation() {
    const { userLocation, setUserLocation, clearUserLocation } = useAppStore();

    const requestLocation = (silent = false) => {
        if (!navigator.geolocation) {
            if (!silent) toast.error('Geolocation is not supported by your browser.');
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // Cache for 5 minutes
        };

        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    
                    if (!silent) toast.loading('Locating...', { id: 'locating-toast', duration: 1500 });
                    
                    const name = await reverseGeocode(latitude, longitude);
                    
                    setUserLocation({
                        lat: latitude,
                        lng: longitude,
                        name: name,
                        granted: true
                    });
                    
                    if (!silent) toast.success(`Located at ${name}`, { id: 'locating-toast' });
                    
                    resolve({ lat: latitude, lng: longitude, name });
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    clearUserLocation();
                    
                    if (!silent) {
                        switch (error.code) {
                            case error.PERMISSION_DENIED:
                                toast.error('Location permission was denied. Enable in browser settings.');
                                break;
                            case error.POSITION_UNAVAILABLE:
                                toast.error('Location information is currently unavailable.');
                                break;
                            case error.TIMEOUT:
                                toast.error('Location request timed out. Please try again.');
                                break;
                            default:
                                toast.error('An unknown error occurred while retrieving location.');
                        }
                    }
                    reject(error);
                },
                options
            );
        });
    };

    return {
        location: userLocation,
        requestLocation,
        hasLocation: userLocation?.granted || false,
        clearLocation: clearUserLocation
    };
}
