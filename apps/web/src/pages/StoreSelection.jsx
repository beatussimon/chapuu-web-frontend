import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Store, MapPin, ChefHat, ArrowRight, ShoppingBag, Utensils, Star, Phone, Mail, Clock, Heart } from 'lucide-react';
import { useAppStore } from '../store/useStore';
import { useLocation } from '../hooks/useLocation';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import OptimizedImage from '../components/OptimizedImage';
import useInfiniteScroll from '../hooks/useInfiniteScroll';
import InfiniteScrollTrigger from '../components/InfiniteScrollTrigger';

export default function StoreSelection() {
    const [searchParams] = useSearchParams();
    const typeParam = searchParams.get('type');
    const [filter, setFilter] = useState(typeParam === 'RESTAURANT' || typeParam === 'SHOP' ? typeParam : 'ALL');
    const [showOpenOnly, setShowOpenOnly] = useState(false);
    const { setSelectedStore, savedStores, toggleSaveStore } = useAppStore();
    const { location, hasLocation, requestLocation } = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (typeParam === 'RESTAURANT' || typeParam === 'SHOP') {
            setFilter(typeParam);
        } else {
            setFilter('ALL');
        }
    }, [typeParam]);

    useEffect(() => {
        requestLocation(true).catch(() => {});
    }, []);

    const storeParams = React.useMemo(() => {
        const p = {};
        if (hasLocation && location?.lat && location?.lng) {
            p.lat = location.lat;
            p.lng = location.lng;
        }
        if (filter !== 'ALL' && filter !== 'SAVED') {
            p.store_type = filter;
        }
        if (showOpenOnly) {
            p.is_open = true;
        }
        return p;
    }, [hasLocation, location?.lat, location?.lng, filter, showOpenOnly]);

    const {
        items: rawStores,
        loadMore: loadMoreStores,
        hasMore: hasMoreStores,
        isLoading: storesLoadingInit,
        isLoadingMore: storesLoadingMore
    } = useInfiniteScroll('/stores/', storeParams);

    const loading = storesLoadingInit;

    const stores = React.useMemo(() => {
        return rawStores.map((store) => {
            const avgRating = store.avg_rating !== null && store.avg_rating !== undefined
                ? Number(store.avg_rating).toFixed(1)
                : 'New';
            return {
                ...store,
                reviewCount: store.review_count || 0,
                avgRating
            };
        });
    }, [rawStores]);

    const handleSelectStore = (store) => {
        setSelectedStore(store);
        navigate(`/menu?store=${store.id}`);
    };

    const safeSavedStores = Array.isArray(savedStores) ? savedStores : [];
    let filteredStores = filter === 'SAVED'
        ? stores.filter(s => safeSavedStores.includes(s.id))
        : stores;

    return (
        <div className="w-full max-w-6xl mx-auto py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">Browse Stores and Restaurants</h1>
                <p className="text-slate-400">Choose a restaurant or shop to order from.</p>
            </div>

            {/* Filter Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                {!typeParam ? (
                    <div className="flex flex-wrap gap-2">
                        {[{ key: 'ALL', label: 'All', icon: <Store size={16} /> },
                        { key: 'RESTAURANT', label: 'Restaurants', icon: <Utensils size={16} /> },
                        { key: 'SHOP', label: 'Shops', icon: <ShoppingBag size={16} /> },
                        { key: 'SAVED', label: 'Saved', icon: <Heart size={16} className={filter === 'SAVED' ? 'fill-current text-red-500' : ''} /> }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setFilter(tab.key)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === tab.key
                                    ? 'bg-primary-500 text-dark-950 shadow-lg shadow-primary-500/20'
                                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>
                ) : <div />}

                <button
                    onClick={() => setShowOpenOnly(!showOpenOnly)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                        showOpenOnly
                            ? 'bg-green-500/20 border-green-500/30 text-green-400 shadow-lg'
                            : 'bg-white/5 border-transparent text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                >
                    <Clock size={16} className={showOpenOnly ? 'animate-pulse text-green-400' : ''} />
                    Open Now
                </button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
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
            ) : filteredStores.length === 0 ? (
                <div className="text-center py-20 glass-dark rounded-3xl border border-white/5">
                    <ChefHat size={48} className="mx-auto text-slate-500 mb-4" />
                    <h3 className="text-xl font-medium text-white mb-2">No {filter === 'SHOP' ? 'shops' : filter === 'RESTAURANT' ? 'restaurants' : 'stores'} available</h3>
                    <p className="text-slate-400">Please check back later.</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {filteredStores.map((store, index) => (
                            <motion.div
                                key={store.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => handleSelectStore(store)}
                                className="glass-dark border border-white/5 rounded-3xl overflow-hidden cursor-pointer hover:border-primary-500/50 transition-all flex flex-col group relative"
                            >
                                <div className="relative w-full aspect-[4/3] bg-dark-900 border-b border-white/5 overflow-hidden">
                                    {store.image_url ? (
                                        <OptimizedImage src={store.image_url} alt={store.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" wrapperClassName="w-full h-full" placeholderType="store" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                                            <Store size={48} className="text-white/10" />
                                        </div>
                                    )}

                                    {/* Save/Favorite Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            triggerHaptic(hapticPatterns.light);
                                            toggleSaveStore(store.id);
                                            const isSaved = safeSavedStores.includes(store.id);
                                            if (isSaved) {
                                                toast.success(`Removed ${store.name} from favorites`);
                                            } else {
                                                toast.success(`Saved ${store.name} to favorites`);
                                            }
                                        }}
                                        className="absolute top-2 right-2 z-20 p-2 rounded-xl bg-dark-950/60 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:scale-110 active:scale-95 transition-all text-slate-400 group/heart"
                                        title={safeSavedStores.includes(store.id) ? "Remove from Favorites" : "Save to Favorites"}
                                    >
                                        <Heart size={14} className={`transition-colors ${safeSavedStores.includes(store.id) ? 'fill-red-500 text-red-500 animate-pulse' : 'text-slate-300 hover:text-red-500'}`} />
                                    </button>
                                    
                                    {/* Proximity distance badge */}
                                    {store.distance_km !== undefined && store.distance_km !== null && (
                                        <div className="absolute top-2 left-2 z-10">
                                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded backdrop-blur-md border bg-dark-950/80 border-white/10 text-primary-400 flex items-center gap-1">
                                                <MapPin size={9} className="text-primary-400" /> {store.distance_km < 0.3 ? "Nearby" : `${store.distance_km} km`}
                                            </span>
                                        </div>
                                    )}

                                    {/* Type badge */}
                                    <div className="absolute bottom-2 left-2 z-10">
                                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded backdrop-blur-md border ${store.store_type === 'SHOP' ? 'bg-purple-500/80 border-purple-500/50 text-white' : 'bg-dark-950/80 border-white/10 text-primary-400'}`}>
                                            {store.store_type}
                                        </span>
                                    </div>

                                    {/* Closed Overlay */}
                                    {!store.is_open && (
                                        <div className="absolute inset-0 bg-dark-950/65 z-10 flex items-center justify-center backdrop-blur-[1px]">
                                            <span className="bg-red-500/90 text-white font-black px-3 py-1 rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-red-500/25 border border-red-400/20 transform -rotate-6 animate-fadeIn">
                                                Closed
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="p-5 flex flex-col flex-1 justify-between text-left">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-bold text-white group-hover:text-primary-400 transition-colors line-clamp-1">
                                            {store.name}
                                        </h3>
                                        <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 line-clamp-1">
                                            <MapPin size={11} className="text-slate-500 shrink-0" />
                                            {store.location || 'Online'}
                                        </p>
                                        {(store.contact_phone || store.contact_email) && (
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-slate-400">
                                                {store.contact_phone && <span className="flex items-center gap-1"><Phone size={10} /> {store.contact_phone}</span>}
                                                {store.contact_email && <span className="flex items-center gap-1"><Mail size={10} /> {store.contact_email}</span>}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                                            <Star size={10} className="text-yellow-500 fill-current" /> {parseFloat(store.avgRating || 4.5).toFixed(1)}
                                            {store.reviewCount > 0 && <span className="text-[10px] text-slate-500 ml-0.5">({store.reviewCount})</span>}
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
                        ))}
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
    );
}
