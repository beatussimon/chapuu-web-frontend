import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, TrendingUp, Star, ChefHat, ShoppingBag, ArrowRight, Utensils, X, Store } from 'lucide-react';
import apiClient from '../api/client';
import { useAppStore } from '../store/useStore';
import { useCurrency } from '../utils/useCurrency';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import OptimizedImage from '../components/OptimizedImage';

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
            setStores(Array.isArray(storesRes.data) ? storesRes.data : []);
            setStats(statsRes.data || {
                metrics: { total_stores: 0, total_meals_served: 0 },
                top_stores: [],
                trending_items: []
            });
            setLoading(false);
        }).catch(() => {
            toast.error("Failed to load discover data");
            setLoading(false);
        });
    }, []);

    const storesArray = Array.isArray(stores) ? stores : [];
    const filteredStores = storesArray.filter(s => {
        const matchesSearch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.location?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = activeFilter === 'ALL' || s.store_type === activeFilter;
        return matchesSearch && matchesFilter;
    });

    const handleSelectStore = (store) => {
        setSelectedStore(store);
        navigate('/menu');
    };

    if (loading) {
        return (
            <div className="w-full max-w-6xl mx-auto py-8 space-y-6 px-4">
                <div className="h-32 bg-white/5 rounded-2xl animate-pulse"></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-white/5 rounded-xl animate-pulse"></div>)}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-6xl mx-auto py-4 md:py-6 px-2 md:px-4 space-y-8">
            
            {/* Header & Search Block */}
            <div className="glass-dark border border-white/5 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center justify-between shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-[80px] pointer-events-none"></div>
                
                <div className="z-10 text-center md:text-left">
                    <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">
                        {isAuthenticated ? "What are you craving?" : "Discover & Order."}
                    </h1>
                    <p className="text-sm md:text-base text-slate-400">
                        {stats.metrics.total_stores} spots delivering {stats.metrics.total_meals_served} meals.
                    </p>
                    {!isAuthenticated && (
                        <div className="mt-4 flex gap-3 justify-center md:justify-start">
                            <Link to="/register" className="bg-primary-500 text-dark-900 font-bold px-5 py-2 rounded-xl text-sm transition-transform hover:-translate-y-0.5">Sign Up</Link>
                            <Link to="/login" className="bg-white/5 hover:bg-white/10 text-white font-bold px-5 py-2 rounded-xl text-sm transition-colors border border-white/10">Login</Link>
                        </div>
                    )}
                </div>

                <div className="w-full md:w-96 z-10 space-y-3">
                    <div className="relative">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search burgers, pizza, shops..."
                            className="w-full bg-dark-950 border border-white/10 rounded-2xl py-3.5 pl-11 pr-10 text-sm text-white placeholder-slate-500 focus:border-primary-500 outline-none transition-all shadow-inner"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2 justify-center md:justify-start">
                        {['ALL', 'RESTAURANT', 'SHOP'].map(f => (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeFilter === f ? 'bg-primary-500 text-dark-900' : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'}`}
                            >
                                {f === 'ALL' ? 'All' : f === 'RESTAURANT' ? 'Food' : 'Shops'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Trending Products Row */}
            {!searchQuery && activeFilter === 'ALL' && stats.trending_items?.length > 0 && (
                <div>
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 px-2">
                        <TrendingUp className="text-orange-500" size={20} /> Trending Right Now
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 px-2">
                        {stats.trending_items.slice(0, 4).map(item => (
                            <motion.div
                                key={item.id}
                                whileHover={{ y: -3 }}
                                onClick={() => {
                                    const s = stores.find(s => s.id === item.store_id);
                                    if (s) handleSelectStore(s);
                                }}
                                className="cursor-pointer glass-dark border border-white/5 rounded-2xl p-2.5 flex items-center gap-3 hover:border-orange-500/30 transition-all group"
                            >
                                <div className="w-12 h-12 rounded-xl bg-dark-900 overflow-hidden shrink-0">
                                    {item.image_url ? (
                                        <OptimizedImage src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" wrapperClassName="w-full h-full" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center"><Utensils size={14} className="text-slate-600" /></div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-bold text-white truncate">{item.name}</h3>
                                    <div className="flex items-center justify-between mt-0.5">
                                        <span className="text-[10px] font-bold text-primary-400">{formatPrice(item.price)}</span>
                                        <span className="text-[9px] text-slate-500 font-medium px-1.5 py-0.5 bg-white/5 rounded">🔥 {item.times_ordered}x</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Directory / Grid */}
            <div className="px-2">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    {searchQuery ? `Results for "${searchQuery}"` : <><Store className="text-primary-500" size={20} /> Discover Venues</>}
                </h2>
                
                {filteredStores.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-white/5 rounded-3xl border border-dashed border-white/10">
                        No venues found matching your criteria.
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-5">
                        {filteredStores.map(store => {
                            const isTop = stats.top_stores?.some(ts => ts.id === store.id);
                            
                            return (
                                <motion.div
                                    key={store.id}
                                    whileHover={{ y: -4 }}
                                    onClick={() => handleSelectStore(store)}
                                    className="cursor-pointer glass-dark rounded-2xl border border-white/5 hover:border-primary-500/30 transition-all overflow-hidden flex flex-col group relative"
                                >
                                    {isTop && !searchQuery && (
                                        <div className="absolute top-2 right-2 z-20 bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg">HOT</div>
                                    )}
                                    <div className="relative w-full aspect-square bg-dark-900 overflow-hidden">
                                        {store.image_url ? (
                                            <OptimizedImage src={store.image_url} alt={store.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" wrapperClassName="w-full h-full" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-dark-800 to-dark-900">
                                                {store.store_type === 'SHOP' ? <ShoppingBag size={24} className="text-white/10" /> : <ChefHat size={24} className="text-white/10" />}
                                            </div>
                                        )}
                                        <div className="absolute bottom-2 left-2">
                                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded backdrop-blur-md border ${store.store_type === 'SHOP' ? 'bg-purple-500/80 border-purple-500/50 text-white' : 'bg-dark-950/80 border-white/10 text-primary-400'}`}>
                                                {store.store_type}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-3 flex flex-col flex-1 justify-between bg-gradient-to-t from-dark-950 to-transparent">
                                        <div>
                                            <h3 className="font-bold text-white text-sm line-clamp-1">{store.name}</h3>
                                            <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1 line-clamp-1"><MapPin size={10} /> {store.location || 'Online'}</p>
                                        </div>
                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                                                <Star size={10} className="text-yellow-500 fill-current" /> {store.avg_rating?.toFixed(1) || '4.5'}
                                            </div>
                                            <ArrowRight size={14} className="text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 transform duration-300" />
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}