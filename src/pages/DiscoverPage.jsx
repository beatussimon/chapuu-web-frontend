import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, TrendingUp, Star, ChefHat, ShoppingBag, ArrowRight, Utensils, X, Sparkles } from 'lucide-react';
import apiClient from '../api/client';
import { useAppStore } from '../store/useStore';
import { useCurrency } from '../utils/useCurrency';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function DiscoverPage() {
    const [stores, setStores] = useState([]);
    const [trendingProducts, setTrendingProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [loading, setLoading] = useState(true);
    const { setSelectedStore } = useAppStore();
    const { formatPrice } = useCurrency();
    const navigate = useNavigate();

    useEffect(() => {
        Promise.all([
            apiClient.get('/stores/'),
            apiClient.get('/products/')
        ]).then(([storesRes, productsRes]) => {
            setStores(storesRes.data);
            // Pick up to 8 products as "trending" (randomized)
            const shuffled = productsRes.data.sort(() => 0.5 - Math.random());
            setTrendingProducts(shuffled.slice(0, 8));
            setLoading(false);
        }).catch(() => {
            toast.error("Failed to load discover data");
            setLoading(false);
        });
    }, []);

    const filteredStores = stores.filter(s => {
        const matchesSearch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.location?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = activeFilter === 'ALL' || s.store_type === activeFilter;
        return matchesSearch && matchesFilter;
    });

    const restaurants = stores.filter(s => s.store_type !== 'SHOP');
    const shops = stores.filter(s => s.store_type === 'SHOP');

    const handleSelectStore = (store) => {
        setSelectedStore(store);
        navigate('/menu');
    };

    const StoreCard = ({ store, featured = false }) => (
        <motion.div
            whileHover={{ y: -4 }}
            onClick={() => handleSelectStore(store)}
            className={`cursor-pointer glass-dark rounded-2xl border border-white/5 hover:border-primary-500/30 transition-all overflow-hidden group ${featured ? 'col-span-1' : ''}`}
        >
            <div className="relative w-full aspect-video bg-dark-900 overflow-hidden">
                {store.image_url ? (
                    <img src={store.image_url} alt={store.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-500/10 to-purple-500/10">
                        {store.store_type === 'SHOP' ? <ShoppingBag size={32} className="text-purple-400/40" /> : <ChefHat size={32} className="text-primary-400/40" />}
                    </div>
                )}
                <div className="absolute top-3 left-3">
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${store.store_type === 'SHOP' ? 'bg-purple-500/80 text-white' : 'bg-primary-500/80 text-dark-950'
                        }`}>
                        {store.store_type === 'SHOP' ? 'Shop' : 'Restaurant'}
                    </span>
                </div>
            </div>
            <div className="p-4">
                <h3 className="font-bold text-white text-base line-clamp-1">{store.name}</h3>
                {store.location && (
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><MapPin size={12} /> {store.location}</p>
                )}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Star size={12} className="text-yellow-500 fill-current" /> {store.avg_rating?.toFixed(1) || '4.5'}
                    </div>
                    <span className="text-xs text-primary-400 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                        View Menu <ArrowRight size={12} />
                    </span>
                </div>
            </div>
        </motion.div>
    );

    if (loading) {
        return (
            <div className="w-full max-w-7xl mx-auto py-8 space-y-8">
                <div className="h-48 bg-white/5 rounded-3xl animate-pulse"></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-56 bg-white/5 rounded-2xl animate-pulse"></div>)}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto py-4 space-y-10">

            {/* Hero */}
            <div className="relative glass-dark rounded-3xl border border-white/5 p-8 md:p-12 overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <Sparkles className="text-primary-400" size={24} />
                        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Discover</h1>
                    </div>
                    <p className="text-slate-400 mb-6 max-w-lg">Explore restaurants, shops, trending items, and more.</p>

                    {/* Search */}
                    <div className="relative max-w-xl">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search size={18} className="text-slate-500" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search restaurants, shops, cuisines..."
                            className="w-full bg-dark-900/80 border border-white/10 focus:border-primary-500 rounded-2xl py-3.5 pl-11 pr-10 text-slate-100 placeholder-slate-600 transition-all outline-none focus:ring-1 focus:ring-primary-500/30"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white">
                                <X size={18} />
                            </button>
                        )}
                    </div>

                    {/* Filter Chips */}
                    <div className="flex gap-2 mt-4">
                        {['ALL', 'RESTAURANT', 'SHOP'].map(f => (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeFilter === f
                                    ? 'bg-primary-500 text-dark-950 shadow-lg shadow-primary-500/20'
                                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                {f === 'ALL' ? '🌐 All' : f === 'RESTAURANT' ? '🍽️ Restaurants' : '🛍️ Shops'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Search Results (when searching) */}
            {searchQuery ? (
                <div>
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Search size={20} className="text-slate-400" />
                        Results for "{searchQuery}"
                    </h2>
                    {filteredStores.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 border border-dashed border-slate-700 rounded-2xl">
                            No stores found matching "{searchQuery}"
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredStores.map(s => <StoreCard key={s.id} store={s} />)}
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {/* Featured Restaurants */}
                    {restaurants.length > 0 && (activeFilter === 'ALL' || activeFilter === 'RESTAURANT') && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <ChefHat size={22} className="text-primary-400" /> Restaurants
                                </h2>
                                <button onClick={() => { setActiveFilter('RESTAURANT'); }} className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
                                    See all <ArrowRight size={14} />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {restaurants.slice(0, activeFilter === 'ALL' ? 4 : 100).map(s => <StoreCard key={s.id} store={s} featured />)}
                            </div>
                        </div>
                    )}

                    {/* Popular Shops */}
                    {shops.length > 0 && (activeFilter === 'ALL' || activeFilter === 'SHOP') && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <ShoppingBag size={22} className="text-purple-400" /> Shops
                                </h2>
                                <button onClick={() => { setActiveFilter('SHOP'); }} className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1">
                                    See all <ArrowRight size={14} />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {shops.slice(0, activeFilter === 'ALL' ? 4 : 100).map(s => <StoreCard key={s.id} store={s} />)}
                            </div>
                        </div>
                    )}

                    {/* Trending Items */}
                    {trendingProducts.length > 0 && activeFilter === 'ALL' && (
                        <div>
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <TrendingUp size={22} className="text-orange-400" /> Trending Items
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {trendingProducts.map(p => (
                                    <motion.div key={p.id} whileHover={{ y: -3 }} className="glass-dark rounded-2xl border border-white/5 overflow-hidden hover:border-orange-500/20 transition-all cursor-pointer group"
                                        onClick={() => {
                                            // Find the store and navigate
                                            const store = stores.find(s => s.id === p.store);
                                            if (store) handleSelectStore(store);
                                        }}
                                    >
                                        <div className="relative w-full aspect-square bg-dark-900 overflow-hidden">
                                            {p.image_url ? (
                                                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Utensils size={24} className="text-white/10" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3">
                                            <h4 className="font-semibold text-sm text-slate-100 line-clamp-1">{p.name}</h4>
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-sm font-bold text-primary-400">{formatPrice(p.price)}</span>
                                                <span className="text-[10px] text-slate-600">{stores.find(s => s.id === p.store)?.name}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
