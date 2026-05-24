import React, { useEffect, useRef, useState } from 'react';
import { X, Navigation, Store, MapPin } from 'lucide-react';

export default function MapModal({
    isOpen,
    onClose,
    userLocation,
    stores = [],
    onSelectStore
}) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const [leafletLoaded, setLeafletLoaded] = useState(false);
    
    // 1. Inject Leaflet CDN Assets on Mount
    useEffect(() => {
        if (!isOpen) return;

        // Check if already loaded
        if (window.L) {
            setLeafletLoaded(true);
            return;
        }

        // Inject stylesheet
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        link.crossOrigin = '';
        document.head.appendChild(link);

        // Inject script
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        script.crossOrigin = '';
        script.onload = () => {
            setLeafletLoaded(true);
        };
        document.body.appendChild(script);

        return () => {
            // Keep style/script to avoid refetching on subsequent opens
        };
    }, [isOpen]);

    // 2. Initialize Leaflet Map
    useEffect(() => {
        if (!isOpen || !leafletLoaded || !mapContainerRef.current) return;

        const L = window.L;
        if (!L) return;

        // Clean up previous map instance if any
        if (mapRef.current) {
            mapRef.current.remove();
        }

        // Determine initial center: User coordinates or Dar es Salaam default (-6.78, 39.28)
        const centerLat = userLocation?.lat || -6.78;
        const centerLng = userLocation?.lng || 39.28;
        const zoomLevel = userLocation?.lat ? 14 : 12;

        // Instantiate Leaflet map
        const map = L.map(mapContainerRef.current, {
            zoomControl: false // Positioned custom zoom controls
        }).setView([centerLat, centerLng], zoomLevel);
        
        mapRef.current = map;

        // Add OSM Dark/Classic tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Custom Leaflet Icons using SVGs
        const userIcon = L.divIcon({
            html: `<div class="relative flex items-center justify-center">
                     <span class="absolute inline-flex h-6 w-6 animate-ping rounded-full bg-blue-400 opacity-75"></span>
                     <div class="h-4 w-4 rounded-full bg-blue-500 border-2 border-white shadow-lg"></div>
                   </div>`,
            className: 'custom-user-marker',
            iconSize: [24, 24]
        });

        const storeIcon = L.divIcon({
            html: `<div class="flex items-center justify-center h-8 w-8 rounded-full bg-primary-500 border-2 border-dark-950 text-dark-900 shadow-md">
                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                   </div>`,
            className: 'custom-store-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16]
        });

        // Add user marker
        if (userLocation?.lat && userLocation?.lng) {
            L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
                .addTo(map)
                .bindPopup(`<div class="text-xs font-bold text-dark-950">📍 Your Location<br/><span class="font-normal text-slate-500">${userLocation.name || 'Active Session'}</span></div>`)
                .openPopup();
        }

        // Add store markers
        stores.forEach(store => {
            if (store.latitude && store.longitude) {
                const distStr = store.distance_km ? `<b>${store.distance_km} km</b> away` : store.location;
                
                const popupContent = document.createElement('div');
                popupContent.className = 'text-xs p-1.5 space-y-2 text-dark-950';
                popupContent.innerHTML = `
                    <div class="font-bold text-sm">${store.name}</div>
                    <div class="text-slate-500 font-medium">${distStr}</div>
                    <div class="flex items-center justify-between gap-4 pt-1">
                        <span class="px-1.5 py-0.5 rounded font-black text-[9px] uppercase ${store.is_open ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">
                            ${store.is_open ? 'Open' : 'Closed'}
                        </span>
                        <button class="bg-primary-500 hover:bg-primary-600 text-dark-900 text-[10px] font-black px-2.5 py-1 rounded shadow-sm cursor-pointer select-store-btn">
                            View Menu &rarr;
                        </button>
                    </div>
                `;

                // Wire up view menu click
                popupContent.querySelector('.select-store-btn').addEventListener('click', () => {
                    onSelectStore(store);
                    onClose();
                });

                L.marker([parseFloat(store.latitude), parseFloat(store.longitude)], { icon: storeIcon })
                    .addTo(map)
                    .bindPopup(popupContent);
            }
        });

        // Add Custom Zoom Control
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [isOpen, leafletLoaded, userLocation, stores]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-dark-950/80 backdrop-blur-md">
            
            {/* Modal Box */}
            <div className="relative w-full max-w-4xl h-[80vh] md:h-[70vh] bg-dark-900 border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 z-10 shrink-0 bg-dark-900/90 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <Navigation size={18} className="text-primary-500 animate-pulse" />
                        <div>
                            <h3 className="font-black text-white text-sm">Nearby Interactive Map</h3>
                            <p className="text-[10px] text-slate-500">
                                {stores.filter(s => s.latitude).length} spots found near your location.
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Map Wrapper */}
                <div className="flex-1 w-full h-full relative bg-dark-950">
                    {!leafletLoaded && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-dark-950 text-slate-500 text-xs">
                            <div className="h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                            Loading Interactive Maps...
                        </div>
                    )}
                    
                    {/* The Leaflet Container */}
                    <div ref={mapContainerRef} className="w-full h-full text-dark-950" />
                </div>

            </div>
        </div>
    );
}
