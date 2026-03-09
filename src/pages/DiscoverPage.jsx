import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, TrendingUp, Star, ChefHat, ShoppingBag, ArrowRight, Utensils, X, Sparkles, Users, Store } from 'lucide-react';
import apiClient from '../api/client';
import { useAppStore } from '../store/useStore';
import { useCurrency } from '../utils/useCurrency';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function DiscoverPage() {
    const [stores, setStores] = useState([]);
    const [stats, setStats] = useState({
        metrics: { total_stores: 0, total_meals_served: 0 },
        top_stores: [],
        trending_items: []
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [loading, setLoading] = useState(true);
    const { setSelectedStore, token } = useAppStore();
    const isAuthenticated = !!token;
    const { formatPrice } = useCurrency();
    const navigate = useNavigate();

    useEffect(() => {
        Promise.all([
            apiClient.get('/stores/'),
            apiClient.get('/stats/billboard/')
        ]).then(([storesRes, statsRes]) => {
            setStores(storesRes.data);
            setStats(statsRes.data);
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
            <div className="relative glass-dark rounded-3xl border border-white/5 p-8 md:p-12 overflow-hidden flex flex-col items-center">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none"></div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="z-10 w-full flex flex-col items-center text-center mb-8"
                >
                    <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-gradient-to-r from-primary-500/10 to-orange-500/10 border border-primary-500/20 text-primary-400 font-bold text-sm mb-8 shadow-lg shadow-primary-500/5">
                        <TrendingUp size={18} className="text-orange-500" />
                        Live Platform Activity
                    </div>

                    {!isAuthenticated ? (
                        <>
                            <h1 className="text-3xl sm:text-5xl md:text-7xl font-black mb-4 md:mb-6 leading-tight">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-orange-500 to-red-500">
                                    Skip the Wait.<br />Savor the Moment.
                                </span>
                            </h1>
                            <p className="text-base md:text-xl text-slate-300 mb-6 md:mb-8 max-w-2xl font-light mx-auto px-4">
                                Discover top-rated kitchens, reserve a table, and perfectly time your meal before you even arrive.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-8 md:mb-12 justify-center w-full max-w-sm sm:max-w-none">
                                <Link to="/register" className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-dark-950 font-black px-6 md:px-8 py-3.5 md:py-4 rounded-full transition-all shadow-xl flex items-center justify-center gap-3 transform hover:-translate-y-1 text-sm md:text-base">
                                    Sign Up & Eat <ArrowRight size={18} />
                                </Link>
                                <Link to="/login" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold px-6 md:px-8 py-3.5 md:py-4 rounded-full transition-all flex items-center justify-center gap-2 backdrop-blur-sm text-sm md:text-base">
                                    Seller Portal
                                </Link>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center justify-center gap-3 mb-3">
                                <Sparkles className="text-primary-400" size={24} />
                                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">Discover</h1>
                            </div>
                            <p className="text-slate-400 mb-6 md:mb-8 max-w-lg mx-auto text-sm md:text-lg">Explore restaurants, shops, trending items, and more.</p>
                        </>
                    )}

                    {/* Live Metric Tickers */}
                    <div className="grid grid-cols-2 gap-3 md:gap-6 w-full max-w-lg mx-auto mb-6 md:mb-8">
                        <div className="glass-dark border border-white/10 rounded-2xl md:rounded-3xl p-3 md:p-5 text-center shadow-xl">
                            <h4 className="text-slate-500 font-bold text-[10px] md:text-xs mb-1 uppercase tracking-widest">Active Kitchens</h4>
                            <p className="text-xl md:text-3xl font-black text-white">{loading ? '-' : stats.metrics.total_stores}</p>
                        </div>
                        <div className="glass-dark border border-white/10 rounded-2xl md:rounded-3xl p-3 md:p-5 text-center shadow-xl">
                            <h4 className="text-slate-500 font-bold text-[10px] md:text-xs mb-1 uppercase tracking-widest">Meals Served</h4>
                            <p className="text-xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">{loading ? '-' : stats.metrics.total_meals_served}</p>
                        </div>
                    </div>
                </motion.div>

                <div className="relative z-10 w-full flex flex-col items-center px-4">

                    {/* Search */}
                    <div className="relative w-full max-w-xl">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search size={16} className="text-slate-500" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search restaurants, shops..."
                            className="w-full bg-dark-900/80 border border-white/10 focus:border-primary-500 rounded-xl md:rounded-2xl py-3 md:py-3.5 pl-10 md:pl-11 pr-10 text-sm md:text-base text-slate-100 placeholder-slate-600 transition-all outline-none"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white">
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Filter Chips */}
                    <div className="flex gap-2 mt-4 overflow-x-auto w-full justify-center no-scrollbar scrollbar-none pb-2 px-4">
                        {['ALL', 'RESTAURANT', 'SHOP'].map(f => (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[11px] md:text-sm font-bold transition-all whitespace-nowrap ${activeFilter === f
                                    ? 'bg-primary-500 text-dark-950 shadow-lg shadow-primary-500/20'
                                    : 'bg-white/5 text-slate-400 hover:text-white'
                                    }`}
                            >
                                {f === 'ALL' ? '🌐 All' : f === 'RESTAURANT' ? '🍽️ Restaurant' : '🛍️ Shops'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Search Results (when searching) */}
            {searchQuery ? (
                <div>
                    <h2 className="text-lg md:text-xl font-bold text-white mb-4 px-2">
                        Results for "{searchQuery}"
                    </h2>
                    {filteredStores.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 border border-dashed border-slate-700 rounded-2xl mx-2">
                            No matching stores found.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-2">
                            {filteredStores.map(s => <StoreCard key={s.id} store={s} />)}
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-10 md:gap-16 px-2 md:px-0">
                    {/* Top Restaurants / Trending Kitchens (From stats) */}
                    {activeFilter === 'ALL' && stats.top_stores && stats.top_stores.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-6 pb-2 md:pb-4 border-b border-white/5">
                                <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2 md:gap-3">
                                    <Store className="text-primary-500" size={24} />
                                    Hot Right Now
                                </h2>
                                <button onClick={() => setActiveFilter('RESTAURANT')} className="text-[10px] md:text-sm text-primary-400 font-bold uppercase tracking-widest hover:text-primary-300 transition-colors">Directory</button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {stats.top_stores.map((store, index) => (
                                    <div key={store.id} onClick={() => {
                                        const s = stores.find(s => s.id === store.id);
                                        if (s) handleSelectStore(s);
                                    }}>
                                        <motion.div
                                            whileHover={{ scale: 1.01 }}
                                            className="glass-dark border border-white/5 hover:border-primary-500/30 rounded-2xl md:rounded-3xl p-3 md:p-4 flex gap-4 md:gap-6 items-center transition-all cursor-pointer"
                                        >
                                            <div className="text-xl md:text-2xl font-black text-slate-800 w-6 text-center">{index + 1}</div>
                                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl md:rounded-2xl bg-dark-900 border border-white/5 overflow-hidden shrink-0 flex items-center justify-center">
                                                {store.image_url ? (
                                                    <img src={store.image_url} alt={store.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Store size={20} className="text-slate-700" />
                                                )}
                                            </div>
                                            <div className="flex-grow">
                                                <h3 className="text-lg md:text-xl font-bold text-white mb-0.5 line-clamp-1">{store.name}</h3>
                                                <p className="text-slate-500 text-[10px] md:text-xs mb-2 line-clamp-1">{store.location || 'No address'}</p>
                                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-green-500/10 text-green-400 text-[9px] md:text-[10px] font-bold border border-green-500/20">
                                                    <Utensils size={10} /> {store.completed_orders} Serves
                                                </div>
                                            </div>
                                        </motion.div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Most Ordered Items / Platform Top Picks (From stats) */}
                    {activeFilter === 'ALL' && stats.trending_items && stats.trending_items.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-6 pb-2 md:pb-4 border-b border-white/5">
                                <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2 md:gap-3">
                                    <TrendingUp className="text-orange-500" size={24} />
                                    Platform Picks
                                </h2>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                                {stats.trending_items.map((item, index) => (
                                    <motion.div
                                        key={item.id}
                                        whileHover={{ y: -4 }}
                                        onClick={() => {
                                            const s = stores.find(s => s.id === item.store_id);
                                            if (s) handleSelectStore(s);
                                        }}
                                        className="cursor-pointer glass-dark border border-white/5 rounded-2xl md:rounded-3xl p-3 md:p-4 relative overflow-hidden group hover:border-orange-500/30 transition-all shadow-lg flex flex-col"
                                    >
                                        <div className="absolute top-0 right-0 bg-orange-500 text-white text-[8px] md:text-[10px] font-black px-2 md:px-3 py-1 rounded-bl-lg md:rounded-bl-xl z-20 shadow-md">
                                            #{index + 1} Popular
                                        </div>

                                        <div className="w-full h-24 md:h-32 rounded-lg md:rounded-xl bg-dark-900 mb-3 md:mb-4 overflow-hidden relative">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Utensils size={20} className="text-slate-700" />
                                                </div>
                                            )}
                                            <div className="absolute bottom-1.5 left-2 right-2 flex justify-between items-end">
                                                <span className="text-[8px] md:text-[10px] font-bold text-slate-300 truncate w-2/3">{item.store_name}</span>
                                                <span className="bg-primary-500 text-dark-950 px-1.5 py-0.5 rounded text-[8px] md:text-[10px] font-black">{formatPrice(item.price)}</span>
                                            </div>
                                        </div>

                                        <h3 className="text-sm md:text-base font-bold text-white mb-1 line-clamp-1">{item.name}</h3>
                                        <p className="text-[9px] md:text-xs text-slate-500 flex items-center gap-1 font-medium mt-auto pt-2 border-t border-white/5">
                                            Ordered {item.times_ordered}x
                                        </p>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* All Restaurants Directory */}
                    {restaurants.length > 0 && (activeFilter === 'ALL' || activeFilter === 'RESTAURANT') && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                                    <ChefHat size={20} className="text-primary-400" /> {activeFilter === 'ALL' ? 'Restaurants' : 'Directory'}
                                </h2>
                                {activeFilter === 'ALL' && (
                                    <button onClick={() => setActiveFilter('RESTAURANT')} className="text-[10px] md:text-sm text-primary-400 hover:text-primary-300 font-bold uppercase tracking-wider flex items-center gap-1">
                                        All <ArrowRight size={12} />
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                                {restaurants.slice(0, activeFilter === 'ALL' ? 4 : 100).map(s => <StoreCard key={s.id} store={s} featured />)}
                            </div>
                        </div>
                    )}

                    {/* All Shops Directory */}
                    {shops.length > 0 && (activeFilter === 'ALL' || activeFilter === 'SHOP') && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                                    <ShoppingBag size={20} className="text-purple-400" /> {activeFilter === 'ALL' ? 'Shops' : 'Directory'}
                                </h2>
                                {activeFilter === 'ALL' && (
                                    <button onClick={() => setActiveFilter('SHOP')} className="text-[10px] md:text-sm text-purple-400 hover:text-purple-300 font-bold uppercase tracking-wider flex items-center gap-1">
                                        All <ArrowRight size={12} />
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                                {shops.slice(0, activeFilter === 'ALL' ? 4 : 100).map(s => <StoreCard key={s.id} store={s} />)}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
