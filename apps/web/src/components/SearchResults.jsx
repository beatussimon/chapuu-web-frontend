import React from 'react';
import { motion } from 'framer-motion';
import { Store as StoreIcon, Star, ShoppingBag, Utensils, Tag, MapPin, Sparkles, Navigation } from 'lucide-react';
import OptimizedImage from './OptimizedImage';
import { useCurrency } from '../utils/useCurrency';

export default function SearchResults({
    results = {},
    loading = false,
    query = '',
    onSelectStore,
    onSelectProduct,
    onSelectCategory,
    onIncreaseRadius
}) {
    const { formatPrice } = useCurrency();
    
    const products = results.products || [];
    const stores = results.stores || [];
    const categories = results.categories || [];
    
    const hasResults = products.length > 0 || stores.length > 0 || categories.length > 0;

    if (loading) {
        return (
            <div className="w-full py-8 space-y-6">
                <div className="flex gap-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-8 w-20 bg-white/5 rounded-lg animate-pulse" />
                    ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-28 bg-white/5 rounded-2xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (!query) return null;

    if (!hasResults) {
        return (
            <div className="text-center py-16 px-4 glass-dark rounded-3xl border border-white/5 space-y-4">
                <p className="text-slate-400 text-sm">
                    No items, stores, or categories match "{query}" near you.
                </p>
                <div className="flex justify-center gap-3">
                    <button
                        onClick={onIncreaseRadius}
                        className="bg-primary-500 text-dark-900 font-bold px-5 py-2.5 rounded-xl text-xs transition-transform hover:-translate-y-0.5 cursor-pointer shadow-lg shadow-primary-500/20"
                    >
                        🔍 Expand Search Radius
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-8 py-2">
            
            {/* 1. Categories Section (Chips) */}
            {categories.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-xs uppercase font-black tracking-wider text-slate-500 flex items-center gap-1.5 px-1">
                        <Tag size={12} className="text-primary-500" />
                        Match Categories ({categories.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => onSelectCategory(cat.id)}
                                className="flex items-center gap-2 bg-white/5 border border-white/5 hover:border-primary-500/30 hover:bg-white/10 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                            >
                                <Tag size={12} className="text-primary-500" />
                                {cat.name}
                                <span className="text-[9px] px-1 bg-white/10 text-slate-500 rounded font-medium">
                                    {cat.product_count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 2. Stores Section */}
            {stores.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-xs uppercase font-black tracking-wider text-slate-500 flex items-center gap-1.5 px-1">
                        <StoreIcon size={13} className="text-primary-500" />
                        Available Spots ({stores.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {stores.map(store => (
                            <motion.div
                                key={store.id}
                                whileHover={{ y: -3 }}
                                onClick={() => onSelectStore(store)}
                                className="cursor-pointer glass-dark border border-white/5 hover:border-primary-500/30 p-3 rounded-2xl flex gap-3.5 items-center transition-all group relative"
                            >
                                {/* Store Thumbnail */}
                                <div className="h-16 w-16 bg-dark-900 rounded-xl overflow-hidden shrink-0 relative">
                                    {store.image_url ? (
                                        <OptimizedImage src={store.image_url} alt={store.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" wrapperClassName="w-full h-full" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-dark-800 to-dark-900">
                                            {store.store_type === 'SHOP' ? <ShoppingBag size={18} className="text-white/10" /> : <Utensils size={18} className="text-white/10" />}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Store Info */}
                                <div className="flex-1 min-w-0 space-y-1">
                                    <h4 className="font-bold text-white text-sm line-clamp-1 group-hover:text-primary-500 transition-colors">
                                        {store.name}
                                    </h4>
                                    
                                    {/* Distance & Location */}
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                        {store.distance_km !== null ? (
                                            <span className="flex items-center gap-0.5 font-bold text-primary-400">
                                                <MapPin size={9} />
                                                {store.distance_km} km
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-0.5">
                                                <MapPin size={9} />
                                                {store.location?.split(',')[0]}
                                            </span>
                                        )}
                                        <span className="text-white/10">•</span>
                                        <span className={`px-1 py-0.2 rounded-[3px] text-[8px] font-black uppercase ${
                                            store.is_open 
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                        }`}>
                                            {store.is_open ? 'Open' : 'Closed'}
                                        </span>
                                    </div>

                                    {/* Rating */}
                                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                                        <Star size={10} className="text-yellow-500 fill-current" />
                                        {parseFloat(store.avg_rating || 4.5).toFixed(1)}
                                        {store.relevance_score && (
                                            <>
                                                <span className="text-white/10">•</span>
                                                <span className="text-[9px] font-medium text-slate-500 flex items-center gap-0.5">
                                                    <Sparkles size={8} className="text-primary-500" />
                                                    {Math.round(store.relevance_score * 100)}% match
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* 3. Products Section */}
            {products.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-xs uppercase font-black tracking-wider text-slate-500 flex items-center gap-1.5 px-1">
                        <ShoppingBag size={13} className="text-primary-500" />
                        Menu Items & Meals ({products.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {products.map(prod => (
                            <motion.div
                                key={prod.id}
                                whileHover={{ y: -3 }}
                                onClick={() => onSelectProduct(prod)}
                                className="cursor-pointer glass-dark border border-white/5 hover:border-primary-500/30 p-3 rounded-2xl flex gap-3.5 items-center transition-all group relative"
                            >
                                {/* Product Thumbnail */}
                                <div className="h-16 w-16 bg-dark-900 rounded-xl overflow-hidden shrink-0 relative">
                                    {prod.image_url ? (
                                        <OptimizedImage src={prod.image_url} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" wrapperClassName="w-full h-full" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-dark-800 to-dark-900">
                                            <Utensils size={18} className="text-white/10" />
                                        </div>
                                    )}
                                </div>
                                
                                {/* Product Info */}
                                <div className="flex-1 min-w-0 space-y-1">
                                    <h4 className="font-bold text-white text-sm line-clamp-1 group-hover:text-primary-500 transition-colors">
                                        {prod.name}
                                    </h4>
                                    
                                    <p className="text-[10px] text-slate-500 font-medium line-clamp-1 flex items-center gap-1">
                                        <StoreIcon size={10} className="text-primary-500 shrink-0" />
                                        {prod.store_name}
                                        {prod.distance_km !== null && (
                                            <span className="text-primary-400 font-bold shrink-0">
                                                ({prod.distance_km} km)
                                            </span>
                                        )}
                                    </p>

                                    <div className="flex items-center justify-between pt-1">
                                        <span className="text-xs font-bold text-primary-400">
                                            {formatPrice(prod.price)}
                                        </span>
                                        
                                        {prod.relevance_score && (
                                            <span className="text-[8px] font-medium text-slate-500 flex items-center gap-0.5">
                                                <Sparkles size={8} className="text-primary-500" />
                                                {Math.round(prod.relevance_score * 100)}% Match
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

        </div>
    );
}
