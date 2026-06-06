import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, TrendingUp, Star, ChefHat, ShoppingBag, ArrowRight, Utensils, X, Store, Navigation, SlidersHorizontal, Clock, Compass, Tag, Map as MapIcon, Heart } from 'lucide-react';
import apiClient from '../api/client';
import { useAppStore } from '../store/useStore';
import { useCurrency } from '../utils/useCurrency';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import OptimizedImage from '../components/OptimizedImage';
import { useLocation } from '../hooks/useLocation';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';
import SearchResults from '../components/SearchResults';
import MapModal from '../components/MapModal';
import useInfiniteScroll from '../hooks/useInfiniteScroll';
import InfiniteScrollTrigger from '../components/InfiniteScrollTrigger';

// Localized proximity slider component to achieve 60fps drag performance without triggering parent rerenders
function ProximitySlider({ hasLocation, activeRadius, onChange }) {
    const [localRadius, setLocalRadius] = useState(2.0);

    // Sync localRadius when activeRadius is cleared/reset externally
    useEffect(() => {
        if (activeRadius === null) {
            setLocalRadius(2.0);
        } else {
            setLocalRadius(activeRadius);
        }
    }, [activeRadius]);

    // Debounce range slider updates by 350ms to ensure 60fps drag performance without rapid API queries
    useEffect(() => {
        const timer = setTimeout(() => {
            if (hasLocation) {
                onChange(localRadius);
            }
        }, 350);
        return () => clearTimeout(timer);
    }, [localRadius, hasLocation, onChange]);

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <label className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Compass size={13} className="text-primary-500 shrink-0" />
                    Proximity Range
                </label>
                <span className="text-xs font-mono font-bold text-white bg-primary-500/10 text-primary-400 border border-primary-500/20 px-2 py-0.5 rounded-lg">
                    {!hasLocation ? "Enable Location first" :
                     localRadius <= 0.5 ? "Closest (< 500m)" :
                     localRadius >= 10.0 ? "Any distance (10km+)" :
                     `Within ${localRadius.toFixed(1)} km`}
                </span>
            </div>
            <div className="relative flex items-center pt-2">
                <input
                    type="range"
                    min="0.5"
                    max="10.0"
                    step="0.5"
                    disabled={!hasLocation}
                    value={localRadius}
                    onChange={(e) => setLocalRadius(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary-500 disabled:opacity-30 disabled:cursor-not-allowed"
                />
            </div>
            <div className="flex justify-between text-[9px] font-black uppercase text-slate-600 tracking-widest font-mono">
                <span>500m</span>
                <span>2.0km</span>
                <span>5.0km</span>
                <span>10.0km</span>
            </div>
        </div>
    );
}

export default function DiscoverPage() {
    const [stats, setStats] = useState({
        metrics: { total_stores: 0, total_meals_served: 0 },
        top_stores: [],
        trending_items: []
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [initialLoading, setInitialLoading] = useState(true);
    const { setSelectedStore, token, savedStores, toggleSaveStore } = useAppStore();
    const isAuthenticated = !!token;
    const { formatPrice } = useCurrency();
    const navigate = useNavigate();

    // Proximity state integration
    const { location, requestLocation, hasLocation, clearLocation } = useLocation();
    const [activeRadius, setActiveRadius] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isOpenOnly, setIsOpenOnly] = useState(false);
    const [categories, setCategories] = useState([]);
    const [searchResults, setSearchResults] = useState({ products: [], stores: [], categories: [] });
    const [searchLoading, setSearchLoading] = useState(false);
    const [mapOpen, setMapOpen] = useState(false);
    const [showFiltersPanel, setShowFiltersPanel] = useState(false);

    // Auto-prompt location on first visit
    useEffect(() => {
        if (!hasLocation && !sessionStorage.getItem('chapuu_loc_prompt')) {
            sessionStorage.setItem('chapuu_loc_prompt', 'true');
            // Silent is true to avoid throwing an error toast if they ignore/deny
            requestLocation(true).catch(() => {});
        }
    }, [hasLocation, requestLocation]);

    // Memoize store parameters to prevent infinite loops / refetches in hook
    const storeParams = React.useMemo(() => {
        const p = {};
        if (hasLocation && location?.lat && location?.lng) {
            p.lat = location.lat;
            p.lng = location.lng;
            if (activeRadius) p.radius = activeRadius;
        }
        if (activeFilter !== 'ALL') {
            p.store_type = activeFilter;
        }
        if (isOpenOnly) {
            p.is_open = true;
        }
        return p;
    }, [hasLocation, location?.lat, location?.lng, activeRadius, activeFilter, isOpenOnly]);

    // Use infinite scroll for main store listings
    const {
        items: stores,
        loadMore: loadMoreStores,
        hasMore: hasMoreStores,
        isLoading: storesLoadingInit,
        isLoadingMore: storesLoadingMore
    } = useInfiniteScroll('/stores/', storeParams);

    const storesLoading = storesLoadingInit || storesLoadingMore;

    // Baseline stats & categories load
    useEffect(() => {
        const params = {};
        if (hasLocation && location?.lat && location?.lng) {
            params.lat = location.lat;
            params.lng = location.lng;
        }

        Promise.all([
            apiClient.get('/stats/billboard/', { params }),
            apiClient.get('/categories/')
        ]).then(([statsRes, categoriesRes]) => {
            const statsData = statsRes.data || {};
            setStats({
                metrics: statsData.metrics || { total_stores: 0, total_meals_served: 0 },
                top_stores: Array.isArray(statsData.top_stores) ? statsData.top_stores : [],
                trending_items: Array.isArray(statsData.trending_items) ? statsData.trending_items : []
            });
            setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : []);
            setInitialLoading(false);
        }).catch((err) => {
            console.error("Discover stats load error:", err);
            setInitialLoading(false);
        });
    }, [hasLocation, location?.lat, location?.lng]);

    // Search query & category pill debouncer
    useEffect(() => {
        if (!searchQuery.trim() && !selectedCategory) {
            setSearchResults({ products: [], stores: [], categories: [] });
            return;
        }

        setSearchLoading(true);
        const delayDebounceFn = setTimeout(() => {
            const params = {
                q: searchQuery,
                type: 'all'
            };
            
            if (hasLocation && location?.lat && location?.lng) {
                params.lat = location.lat;
                params.lng = location.lng;
                params.radius = activeRadius || 2.0;
            }
            if (activeFilter !== 'ALL') {
                params.store_type = activeFilter;
            }
            if (isOpenOnly) {
                params.is_open = true;
            }
            if (selectedCategory) {
                params.category = selectedCategory;
            }

            apiClient.get('/search/', { params })
                .then((res) => {
                    const data = res.data?.results || {};
                    setSearchResults({
                        products: Array.isArray(data.products) ? data.products : [],
                        stores: Array.isArray(data.stores) ? data.stores : [],
                        categories: Array.isArray(data.categories) ? data.categories : []
                    });
                    setSearchLoading(false);
                })
                .catch((err) => {
                    console.error("Search error:", err);
                    setSearchLoading(false);
                });
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, hasLocation, location?.lat, location?.lng, activeRadius, activeFilter, isOpenOnly, selectedCategory]);

    const handleSelectStore = (store) => {
        setSelectedStore(store);
        navigate(`/menu?store=${store.id}`);
    };

    const isSearching = searchQuery.trim().length > 0 || selectedCategory !== null;

    if (initialLoading) {
        return (
            <div className="w-full max-w-6xl mx-auto py-4 md:py-6 px-2 md:px-4 space-y-8 animate-pulse">
                {/* Header & Search Block Skeleton */}
                <div className="glass-dark border border-white/5 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center justify-between shadow-2xl relative overflow-hidden">
                    <div className="space-y-3 flex-1">
                        <div className="h-8 w-2/3 md:w-80 bg-white/5 rounded-lg"></div>
                        <div className="h-4 w-1/2 md:w-60 bg-white/5 rounded-md"></div>
                    </div>
                    <div className="h-12 w-full md:w-80 bg-white/5 rounded-2xl shrink-0"></div>
                </div>

                {/* Categories Slider Skeleton */}
                <div className="glass-dark border border-white/5 rounded-2xl p-4">
                    <div className="flex items-center gap-3 overflow-hidden">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-8 w-24 bg-white/5 rounded-xl shrink-0"></div>
                        ))}
                    </div>
                </div>

                {/* Trending Nearby Grid Skeleton */}
                <div>
                    <div className="h-6 w-48 bg-white/5 rounded-md mb-6 px-2"></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="glass-dark border border-white/5 rounded-3xl overflow-hidden flex flex-col h-[320px]">
                                <div className="relative w-full aspect-[4/3] bg-white/5 flex items-center justify-center border-b border-white/5">
                                    <ChefHat size={48} className="text-white/10" />
                                </div>
                                <div className="p-5 flex-grow space-y-3">
                                    <div className="h-5 w-2/3 bg-white/5 rounded"></div>
                                    <div className="h-3.5 w-1/2 bg-white/5 rounded"></div>
                                    <div className="pt-4 border-t border-white/5 flex justify-between">
                                        <div className="h-4 w-12 bg-white/5 rounded"></div>
                                        <div className="h-4 w-8 bg-white/5 rounded"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Discover Spots Grid Skeleton */}
                <div>
                    <div className="flex items-center justify-between mb-6 px-2">
                        <div className="h-6 w-40 bg-white/5 rounded-md"></div>
                        <div className="h-10 w-28 bg-white/5 rounded-xl"></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="glass-dark border border-white/5 rounded-3xl overflow-hidden flex flex-col h-[320px]">
                                <div className="relative w-full aspect-[4/3] bg-white/5 flex items-center justify-center border-b border-white/5">
                                    <Store size={48} className="text-white/10" />
                                </div>
                                <div className="p-5 flex-grow space-y-3">
                                    <div className="h-5 w-3/4 bg-white/5 rounded"></div>
                                    <div className="h-3.5 w-1/2 bg-white/5 rounded"></div>
                                    <div className="pt-4 border-t border-white/5 flex justify-between">
                                        <div className="h-4 w-16 bg-white/5 rounded"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }


    const safeSavedStores = Array.isArray(savedStores) ? savedStores : [];
    const favoriteStores = stores.filter(s => safeSavedStores.includes(s.id));

    const renderStoreCard = (store) => {
        const isTop = stats.top_stores?.some(ts => ts.id === store.id);
        const isSaved = safeSavedStores.includes(store.id);

        return (
            <motion.div
                key={store.id}
                whileHover={{ y: -4 }}
                onClick={() => handleSelectStore(store)}
                className="cursor-pointer glass-dark border border-white/5 rounded-3xl overflow-hidden hover:border-primary-500/50 transition-all flex flex-col group relative"
            >
                {/* Save/Favorite Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic(hapticPatterns.light);
                        toggleSaveStore(store.id);
                        if (isSaved) {
                            toast.success(`Removed ${store.name} from favorites`);
                        } else {
                            toast.success(`Saved ${store.name} to favorites`);
                        }
                    }}
                    className="absolute top-2 right-2 z-20 p-2 rounded-xl bg-dark-950/60 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:scale-110 active:scale-95 transition-all text-slate-400 group/heart"
                    title={isSaved ? "Remove from Favorites" : "Save to Favorites"}
                >
                    <Heart size={14} className={`transition-colors ${isSaved ? 'fill-red-500 text-red-500 animate-pulse' : 'text-slate-300 hover:text-red-500'}`} />
                </button>

                {isTop && (
                    <div className="absolute top-2 right-12 z-20 bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg">HOT</div>
                )}

                <div className="relative w-full aspect-[4/3] bg-dark-900 border-b border-white/5 overflow-hidden">
                    {store.image_url ? (
                        <OptimizedImage src={store.image_url} alt={store.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" wrapperClassName="w-full h-full" placeholderType="store" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                            {store.store_type === 'SHOP' ? <ShoppingBag size={48} className="text-white/10" /> : <ChefHat size={48} className="text-white/10" />}
                        </div>
                    )}
                    
                    {/* Proximity distance badge */}
                    {store.distance_km !== undefined && store.distance_km !== null && (
                        <div className="absolute top-2 left-2 z-10">
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded backdrop-blur-md border bg-dark-950/80 border-white/10 text-primary-400 flex items-center gap-1">
                                <MapPin size={9} className="text-primary-400" /> {store.distance_km < 0.3 ? "Nearby" : `${store.distance_km} km`}
                            </span>
                        </div>
                    )}
                    
                    <div className="absolute bottom-2 left-2 z-10">
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded backdrop-blur-md border ${store.store_type === 'SHOP' ? 'bg-purple-500/80 border-purple-500/50 text-white' : 'bg-dark-950/80 border-white/10 text-primary-400'}`}>
                            {store.store_type}
                        </span>
                    </div>
                    {!store.is_open && (
                        <div className="absolute inset-0 bg-dark-950/65 z-10 flex items-center justify-center backdrop-blur-[1px]">
                            <span className="bg-red-500/90 text-white font-black px-3 py-1 rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-red-500/25 border border-red-400/20 transform -rotate-6 animate-fadeIn">
                                Closed
                            </span>
                        </div>
                    )}
                </div>
                <div className="p-5 flex flex-col flex-1 justify-between bg-gradient-to-t from-dark-950 to-transparent text-left">
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-white group-hover:text-primary-400 transition-colors line-clamp-1">{store.name}</h3>
                        <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 line-clamp-1">
                            <MapPin size={11} className="text-slate-500 shrink-0" /> 
                            {store.location || 'Online'}
                        </p>
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                            <Star size={10} className="text-yellow-500 fill-current" /> {parseFloat(store.avg_rating || 4.5).toFixed(1)}
                            <span className="text-[10px] text-slate-700 font-black">·</span>
                            <span className="text-[9px] text-slate-400 font-medium tracking-tighter flex items-center gap-1">
                                <Clock size={9} className="text-slate-400 shrink-0" />
                                {store.working_hours || '08:00 AM - 10:00 PM'}
                            </span>
                        </div>
                        <ArrowRight size={14} className="text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 transform duration-300" />
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="w-full max-w-6xl mx-auto py-4 md:py-6 px-2 md:px-4 space-y-8">
            
            {/* Header & Search Block */}
            <div className="glass-dark border border-white/5 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center justify-between shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-[80px] pointer-events-none"></div>
                
                <div className="z-10 text-center md:text-left space-y-2">
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                        {isAuthenticated ? "What are you craving?" : "Discover & Order."}
                    </h1>
                    
                    {/* Deliver Location Indicator */}
                    {hasLocation ? (
                        <div className="flex items-center justify-center md:justify-start gap-1.5 text-xs font-bold text-primary-400">
                            <Navigation size={12} className="animate-pulse" />
                            <span>Delivering to: <span className="underline">{location.name}</span></span>
                            <button 
                                onClick={clearLocation} 
                                className="text-[10px] text-slate-500 hover:text-white ml-1 bg-white/5 px-1.5 py-0.5 rounded cursor-pointer"
                            >
                                Change
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center md:justify-start gap-3 text-sm md:text-base text-slate-400">
                            <span>{stats.metrics?.total_stores ?? '...'} spots delivering {stats.metrics?.total_meals_served ?? '...'} meals.</span>
                            <button onClick={() => requestLocation()} className="text-[10px] font-bold bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 px-2 py-1 rounded-lg border border-primary-500/20 transition-colors flex items-center gap-1 cursor-pointer">
                                <MapPin size={10} /> Find Nearby
                            </button>
                        </div>
                    )}

                    {!isAuthenticated && (
                        <div className="mt-4 flex gap-3 justify-center md:justify-start">
                            <Link to="/register" className="bg-primary-500 text-dark-900 font-bold px-5 py-2 rounded-xl text-sm transition-transform hover:-translate-y-0.5">Sign Up</Link>
                            <Link to="/login" className="bg-white/5 hover:bg-white/10 text-white font-bold px-5 py-2 rounded-xl text-sm transition-colors border border-white/10">Login</Link>
                        </div>
                    )}
                </div>

                <div className="w-full md:w-96 z-10 space-y-4">
                    {/* Search Bar Input & Sleek Filter Toggle Button */}
                    <div className="flex items-center gap-3">
                        <div className="relative flex-grow">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search meals, spots, categories..."
                                className="w-full bg-dark-950 border border-white/10 rounded-2xl py-3.5 pl-11 pr-10 text-sm text-white placeholder-slate-500 focus:border-primary-500 outline-none transition-all shadow-inner"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-12 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer">
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                        
                        <button
                            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                            className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all cursor-pointer relative shrink-0 ${
                                showFiltersPanel || activeFilter !== 'ALL' || activeRadius || isOpenOnly || selectedCategory
                                    ? 'bg-primary-500 text-dark-900 border-primary-500 shadow-lg shadow-primary-500/20'
                                    : 'bg-dark-950 hover:bg-white/5 text-slate-400 hover:text-white border-white/10'
                            }`}
                            title="Refine Search Filters"
                        >
                            <SlidersHorizontal size={18} />
                            {/* Active Filters Count Badge */}
                            {((activeFilter !== 'ALL' ? 1 : 0) + (activeRadius ? 1 : 0) + (isOpenOnly ? 1 : 0) + (selectedCategory ? 1 : 0)) > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-dark-900">
                                    {(activeFilter !== 'ALL' ? 1 : 0) + (activeRadius ? 1 : 0) + (isOpenOnly ? 1 : 0) + (selectedCategory ? 1 : 0)}
                                </span>
                            )}
                        </button>
                    </div>

                </div>
            </div>

            {/* Collapsible Filter Panel */}
            <AnimatePresence>
                {showFiltersPanel && (
                    <motion.div
                        initial={{ height: 0, opacity: 0, y: -10 }}
                        animate={{ height: 'auto', opacity: 1, y: 0 }}
                        exit={{ height: 0, opacity: 0, y: -10 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="overflow-hidden px-2 z-20"
                    >
                        <div className="glass-dark border border-white/10 rounded-3xl p-6 shadow-xl space-y-6 text-left">
                            <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                <h3 className="text-xs font-black uppercase text-primary-400 tracking-wider">Refine Proximity & Search Filters</h3>
                                <button
                                    onClick={() => {
                                        setActiveFilter('ALL');
                                        setActiveRadius(null);
                                        setIsOpenOnly(false);
                                        setSelectedCategory(null);
                                    }}
                                    className="text-[10px] text-slate-500 hover:text-white uppercase font-black tracking-widest cursor-pointer bg-white/5 px-2 py-1 rounded transition-colors"
                                >
                                    Reset Filters
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Spot Type Group */}
                                <div className="space-y-3">
                                    <label className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                                        <Store size={13} className="text-primary-500 shrink-0" />
                                        Spot Type
                                    </label>
                                    <div className="flex bg-dark-950 border border-white/10 p-1 rounded-xl w-fit">
                                        {[
                                            { label: 'All', value: 'ALL', icon: <Compass size={12} /> },
                                            { label: 'Restaurants', value: 'RESTAURANT', icon: <Utensils size={12} /> },
                                            { label: 'Shops', value: 'SHOP', icon: <ShoppingBag size={12} /> }
                                        ].map(type => (
                                            <button
                                                key={type.value}
                                                onClick={() => setActiveFilter(type.value)}
                                                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                    activeFilter === type.value
                                                        ? 'bg-primary-500 text-dark-900 shadow-md font-black'
                                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                                }`}
                                            >
                                                {type.icon}
                                                {type.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Proximity Range Slider */}
                                <ProximitySlider
                                    hasLocation={hasLocation}
                                    activeRadius={activeRadius}
                                    onChange={setActiveRadius}
                                />

                                {/* Availability Selector */}
                                <div className="space-y-3">
                                    <label className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                                        <Clock size={13} className="text-primary-500 shrink-0" />
                                        Spot Availability
                                    </label>
                                    <div>
                                        <button
                                            onClick={() => setIsOpenOnly(!isOpenOnly)}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                                isOpenOnly
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-md shadow-emerald-500/5'
                                                    : 'bg-dark-950 border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                                            }`}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full ${isOpenOnly ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                                            Only Open Spots
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Spot Category Wrap Grid */}
                            {categories.length > 0 && (
                                <div className="space-y-3 pt-4 border-t border-white/5">
                                    <label className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                                        <Tag size={13} className="text-primary-500 shrink-0" />
                                        Food Categories
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map(cat => {
                                            const isActive = selectedCategory === cat.id;
                                            return (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => setSelectedCategory(isActive ? null : cat.id)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                                        isActive
                                                            ? 'bg-primary-500 text-dark-900 border-primary-500 font-black'
                                                            : 'bg-dark-950 border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                                                    }`}
                                                >
                                                    {cat.name}
                                                    {cat.product_count !== undefined && (
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono ${isActive ? 'bg-dark-900/10 text-dark-900' : 'bg-white/5 text-slate-500'}`}>
                                                            {cat.product_count}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search Results Display */}
            {isSearching ? (
                <div className="px-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            Search matches in Chapuu
                        </h2>
                        {selectedCategory && (
                            <button 
                                onClick={() => setSelectedCategory(null)}
                                className="text-xs text-primary-500 font-bold hover:text-white flex items-center gap-1 cursor-pointer"
                            >
                                Clear Category <X size={12} />
                            </button>
                        )}
                    </div>
                    <SearchResults
                        results={searchResults}
                        loading={searchLoading}
                        query={searchQuery || (selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : '')}
                        onSelectStore={handleSelectStore}
                        onSelectProduct={async (item) => {
                            let s = stores.find(store => store.id === item.store_id);
                            if (!s) {
                                const tid = toast.loading(`Connecting to ${item.store_name || 'store'}...`);
                                try {
                                    const res = await apiClient.get(`/stores/${item.store_id}/`);
                                    s = res.data;
                                    toast.dismiss(tid);
                                } catch (err) {
                                    toast.error("Failed to load store details", { id: tid });
                                    return;
                                }
                            }
                            if (s) {
                                setSelectedStore(s);
                                navigate(`/menu?store=${s.id}`, { state: { highlightProductId: item.id } });
                            }
                        }}
                        onSelectCategory={setSelectedCategory}
                        onIncreaseRadius={() => {
                            setActiveRadius(prev => prev ? Math.min(prev + 1.0, 10.0) : 2.0);
                        }}
                    />
                </div>
            ) : (
                /* Standard Browse Mode */
                <>
                    {/* Trending Products Row */}
                    {activeFilter === 'ALL' && stats.trending_items?.length > 0 && (
                        <div>
                            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 px-2">
                                <TrendingUp className="text-orange-500" size={20} /> 
                                {hasLocation ? "Trending Nearby" : "Trending Right Now"}
                            </h2>
                            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-2 transition-opacity duration-200 ${storesLoading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                                {stats.trending_items.slice(0, 4).map(item => (
                                    <motion.div
                                        key={item.id}
                                        whileHover={{ y: -4 }}
                                        onClick={async () => {
                                            let s = stores.find(store => store.id === item.store_id);
                                            if (!s) {
                                                const tid = toast.loading(`Connecting to ${item.store_name || 'store'}...`);
                                                try {
                                                    const res = await apiClient.get(`/stores/${item.store_id}/`);
                                                    s = res.data;
                                                    toast.dismiss(tid);
                                                } catch (err) {
                                                    toast.error("Failed to load store details", { id: tid });
                                                    return;
                                                }
                                            }
                                            if (s) {
                                                setSelectedStore(s);
                                                 navigate(`/menu?store=${s.id}`, { state: { highlightProductId: item.id } });
                                            }
                                        }}
                                        className="cursor-pointer glass-dark border border-white/5 rounded-3xl overflow-hidden hover:border-primary-500/50 transition-all flex flex-col group relative"
                                    >
                                        <div className="relative w-full aspect-[4/3] bg-dark-900 overflow-hidden">
                                            {item.image_url ? (
                                                <OptimizedImage src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" wrapperClassName="w-full h-full" placeholderType="product" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                                                    <Utensils size={48} className="text-white/10" />
                                                </div>
                                            )}
                                            
                                            {/* Distance Badge */}
                                            {item.distance_km !== undefined && item.distance_km !== null && (
                                                <div className="absolute top-2 left-2 z-10">
                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-md border bg-dark-950/80 border-white/10 text-primary-400 flex items-center gap-1">
                                                        <MapPin size={9} className="text-primary-400" /> {item.distance_km} km
                                                    </span>
                                                </div>
                                            )}

                                            <div className="absolute bottom-2 left-2">
                                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded backdrop-blur-md border bg-orange-500/80 border-orange-500/50 text-white">
                                                    🔥 TRENDING
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-5 flex flex-col flex-1 justify-between bg-gradient-to-t from-dark-950 to-transparent text-left">
                                            <div>
                                                <h3 className="text-lg font-bold text-white group-hover:text-primary-400 transition-colors line-clamp-1">{item.name}</h3>
                                                <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 line-clamp-1">
                                                    <Store size={11} className="text-primary-500 shrink-0" /> {item.store_name || 'Store'}
                                                </p>
                                            </div>
                                            <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                                                <span className="text-sm font-bold text-primary-400">{formatPrice(item.price)}</span>
                                                <span className="text-[10px] text-slate-400 font-bold px-2 py-0.5 bg-white/5 rounded border border-white/5">🔥 {item.times_ordered}x</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Saved Spots / Favorites */}
                    {activeFilter === 'ALL' && favoriteStores.length > 0 && (
                        <div className="px-2 mb-8">
                            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Heart className="text-red-500 fill-current" size={20} /> 
                                Your Favorites
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {favoriteStores.map(store => renderStoreCard(store))}
                            </div>
                        </div>
                    )}

                    {/* Main Directory / Grid */}
                    <div className="px-2">
                        <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Store className="text-primary-500" size={20} /> 
                                {hasLocation ? "Closest spots to you" : "Discover spots"}
                            </h2>
                            <div className="flex items-center gap-2">
                                {!hasLocation && (
                                    <button onClick={() => requestLocation()} className="flex items-center gap-1.5 text-xs text-primary-400 font-bold hover:text-white bg-primary-500/10 border border-primary-500/20 px-3.5 py-2 rounded-xl cursor-pointer hover:bg-primary-500/20 transition-all shadow-md">
                                        <MapPin size={12} /> Find Nearest Spots
                                    </button>
                                )}
                                <button
                                    onClick={() => setMapOpen(true)}
                                    className="flex items-center gap-1.5 text-xs text-primary-500 font-black hover:text-primary-400 bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl cursor-pointer hover:bg-white/10 transition-all shadow-md"
                                >
                                    <MapIcon size={12} /> View Map
                                </button>
                            </div>
                        </div>
                        
                        {stores.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 bg-white/5 rounded-3xl border border-dashed border-white/10 space-y-3">
                                <p>No spots found matching your proximity criteria.</p>
                                {activeRadius && (
                                    <button 
                                        onClick={() => setActiveRadius(null)}
                                        className="bg-white/5 hover:bg-white/10 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors border border-white/10 cursor-pointer"
                                    >
                                        Remove Radius Constraint
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 transition-opacity duration-200 ${storesLoading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                                    {stores.map(store => renderStoreCard(store))}
                                </div>
                                <InfiniteScrollTrigger
                                    loadMore={loadMoreStores}
                                    hasMore={hasMoreStores}
                                    isLoading={storesLoadingInit}
                                    isLoadingMore={storesLoadingMore}
                                />
                            </>
                        )}
                    </div>
                </>
            )}

            {/* Subtle Maps Popup Overlay */}
            <MapModal
                isOpen={mapOpen}
                onClose={() => setMapOpen(false)}
                userLocation={hasLocation ? location : null}
                stores={stores}
                onSelectStore={handleSelectStore}
            />

        </div>
    );
}