import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Store, MapPin, ChefHat, ArrowRight, ShoppingBag, Utensils } from 'lucide-react';
import { useAppStore } from '../store/useStore';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import OptimizedImage from '../components/OptimizedImage';

export default function StoreSelection() {
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();
    const typeParam = searchParams.get('type');
    const [filter, setFilter] = useState(typeParam === 'RESTAURANT' || typeParam === 'SHOP' ? typeParam : 'ALL');
    const { setSelectedStore } = useAppStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (typeParam === 'RESTAURANT' || typeParam === 'SHOP') {
            setFilter(typeParam);
        } else {
            setFilter('ALL');
        }
    }, [typeParam]);

    useEffect(() => {
        const fetchStores = async () => {
            try {
                const response = await apiClient.get('/stores/');
                // Fetch reviews for all stores concurrently
                const data = Array.isArray(response.data) ? response.data : [];
                const storesWithReviews = await Promise.all(data.map(async (store) => {
                    try {
                        const reviewsRes = await apiClient.get(`/stores/${store.id}/reviews/`);
                        const reviews = reviewsRes.data;
                        const avgRating = reviews.length > 0
                            ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
                            : 'New';
                        return { ...store, reviewCount: reviews.length, avgRating };
                    } catch (e) {
                        return { ...store, reviewCount: 0, avgRating: 'New' };
                    }
                }));
                setStores(storesWithReviews);
            } catch (error) {
                toast.error('Failed to load stores');
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchStores();
    }, []);

    const handleSelectStore = (store) => {
        setSelectedStore(store);
        navigate('/menu');
    };

    const filteredStores = filter === 'ALL' ? stores : stores.filter(s => s.store_type === filter);

    return (
        <div className="w-full max-w-6xl mx-auto py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">Browse Stores</h1>
                <p className="text-slate-400">Choose a restaurant or shop to order from.</p>
            </div>

            {/* Filter Tabs */}
            {!typeParam && (
                <div className="flex gap-2 mb-8">
                    {[{ key: 'ALL', label: 'All', icon: <Store size={16} /> },
                    { key: 'RESTAURANT', label: 'Restaurants', icon: <Utensils size={16} /> },
                    { key: 'SHOP', label: 'Shops', icon: <ShoppingBag size={16} /> }
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
            )}

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
                </div>
            ) : filteredStores.length === 0 ? (
                <div className="text-center py-20 glass-dark rounded-3xl border border-white/5">
                    <ChefHat size={48} className="mx-auto text-slate-500 mb-4" />
                    <h3 className="text-xl font-medium text-white mb-2">No {filter === 'SHOP' ? 'shops' : filter === 'RESTAURANT' ? 'restaurants' : 'stores'} available</h3>
                    <p className="text-slate-400">Please check back later.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredStores.map((store, index) => (
                        <motion.div
                            key={store.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => handleSelectStore(store)}
                            className="glass-dark border border-white/5 rounded-3xl overflow-hidden cursor-pointer hover:border-primary-500/50 transition-all group"
                        >
                            <div className="h-40 bg-gradient-to-br from-slate-800 to-slate-900 border-b border-white/5 flex items-center justify-center relative overflow-hidden">
                                {store.image_url ? (
                                    <OptimizedImage src={store.image_url} alt={store.name} className="w-full h-full object-cover" wrapperClassName="w-full h-full" />
                                ) : (
                                    <Store size={48} className="text-white/10" />
                                )}
                                {/* Type badge */}
                                <div className={`absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 backdrop-blur-sm ${store.store_type === 'SHOP'
                                    ? 'bg-purple-500/80 text-white'
                                    : 'bg-primary-500/80 text-dark-950'
                                    }`}>
                                    {store.store_type === 'SHOP' ? <ShoppingBag size={12} /> : <Utensils size={12} />}
                                    {store.store_type === 'SHOP' ? 'Shop' : 'Restaurant'}
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-xl font-bold text-white group-hover:text-primary-400 transition-colors line-clamp-1">
                                        {store.name}
                                    </h3>
                                    {/* Rating Badge */}
                                    <div className="flex items-center gap-1 bg-dark-950 border border-white/10 px-2 py-1 rounded-lg mt-1 shrink-0">
                                        <span className="text-yellow-500 text-xs">⭐</span>
                                        <span className="text-xs font-bold text-white">{store.avgRating}</span>
                                        {store.reviewCount > 0 && <span className="text-[10px] text-slate-500 ml-1">({store.reviewCount})</span>}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 text-slate-400 text-sm mb-6">
                                    <div className="flex items-start gap-2">
                                        <MapPin size={16} className="shrink-0 mt-0.5" />
                                        <span>{store.location}</span>
                                    </div>
                                    {(store.contact_phone || store.contact_email) && (
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                                            {store.contact_phone && <span>📞 {store.contact_phone}</span>}
                                            {store.contact_email && <span>✉️ {store.contact_email}</span>}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                                    <span className="text-sm font-medium text-slate-300">View Menu</span>
                                    <div className="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-500 group-hover:bg-primary-500 group-hover:text-dark-950 transition-all">
                                        <ArrowRight size={16} />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
