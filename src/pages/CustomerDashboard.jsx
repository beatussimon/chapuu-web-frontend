import { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAppStore } from '../store/useStore';
import { ShoppingCart, ChefHat, Plus, Minus, CreditCard, UtensilsCrossed, Trash2, ArrowLeft, Star, Search, ShoppingBag, X } from 'lucide-react';
import { useCurrency } from '../utils/useCurrency';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';

export default function CustomerDashboard() {
    const [products, setProducts] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userPoints, setUserPoints] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState(null);
    const [showMobileCart, setShowMobileCart] = useState(false);
    const { cart, addToCart, updateQuantity, removeFromCart, selectedStore } = useAppStore();
    const navigate = useNavigate();
    const { formatPrice } = useCurrency();
    const categoryRefs = useRef({});

    useEffect(() => {
        apiClient.get('/auth/users/me/')
            .then(res => setUserPoints(res.data.loyalty_points || 0))
            .catch(() => console.error("Could not fetch user profile"));
    }, []);

    useEffect(() => {
        if (!selectedStore) return;

        const fetchStoreData = () => {
            apiClient.get(`/products/?store=${selectedStore.id}`)
                .then(res => {
                    setProducts(res.data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Failed to load menu: " + err.message);
                    setLoading(false);
                });

            apiClient.get(`/stores/${selectedStore.id}/reviews/`)
                .then(res => setReviews(res.data))
                .catch(err => console.error("Failed to load reviews", err));
        };

        fetchStoreData();
        const interval = setInterval(fetchStoreData, 10000);
        return () => clearInterval(interval);
    }, [selectedStore]);

    if (!selectedStore) {
        return <Navigate to="/stores" />;
    }

    const isShop = selectedStore?.store_type === 'SHOP';
    const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    // Filter products by search and category
    const filteredProducts = products.filter(p => {
        const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = !activeCategory || (p.category_name || 'Uncategorized') === activeCategory;
        return matchesSearch && matchesCategory;
    });

    // Group filtered products by category
    const groupedProducts = filteredProducts.reduce((acc, product) => {
        const catName = product.category_name || 'Uncategorized';
        if (!acc[catName]) acc[catName] = [];
        acc[catName].push(product);
        return acc;
    }, {});

    // Get unique categories
    const categories = [...new Set(products.map(p => p.category_name || 'Uncategorized'))];

    const scrollToCategory = (cat) => {
        setActiveCategory(activeCategory === cat ? null : cat);
        if (categoryRefs.current[cat]) {
            categoryRefs.current[cat].scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8 w-full relative">

            {/* Store Image Underlay */}
            {selectedStore.image_url && (
                <div className="absolute top-0 left-0 w-full h-[300px] -mx-4 md:-mx-8 md:-mt-8 -z-10 overflow-hidden pointer-events-none">
                    <img src={selectedStore.image_url} alt={selectedStore.name} className="w-full h-full object-cover opacity-30" />
                    <div className="absolute inset-0 bg-gradient-to-b from-dark-950/10 via-dark-950/80 to-dark-950"></div>
                </div>
            )}

            {/* Main Menu Section */}
            <div className={`flex-grow ${selectedStore.image_url ? 'pt-8' : ''}`}>
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => navigate('/stores')}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
                        title="Browse Stores"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex-1 flex justify-between items-start">
                        <div className="flex items-start gap-4">
                            {selectedStore.image_url && (
                                <img src={selectedStore.image_url} alt={selectedStore.name} className="w-16 h-16 rounded-2xl object-cover border border-white/10 shadow-lg hidden sm:block" />
                            )}
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent flex items-center gap-3">
                                    {!selectedStore.image_url && (isShop ? <ShoppingBag className="text-purple-500 w-7 h-7" /> : <ChefHat className="text-primary-500 w-7 h-7" />)}
                                    {selectedStore.name}
                                </h2>
                                <p className="text-slate-400 text-sm mt-0.5">{selectedStore.location}</p>
                            </div>
                        </div>

                        <div className="hidden md:flex flex-col items-end">
                            <div className="bg-primary-500/10 border border-primary-500/30 rounded-2xl px-5 py-2 flex flex-col items-center">
                                <span className="text-[10px] text-primary-400 font-medium uppercase tracking-wider">Points</span>
                                <span className="text-2xl font-black text-white">{userPoints}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative mb-4">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search size={18} className="text-slate-500" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Search ${isShop ? 'products' : 'menu'}...`}
                        className="w-full bg-dark-900/80 border border-white/10 focus:border-primary-500 rounded-2xl py-3 pl-11 pr-10 text-slate-100 placeholder-slate-600 transition-all outline-none focus:ring-1 focus:ring-primary-500/30"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white">
                            <X size={18} />
                        </button>
                    )}
                </div>

                {/* Category Chips */}
                {categories.length > 1 && (
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                        <button
                            onClick={() => setActiveCategory(null)}
                            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${!activeCategory
                                ? 'bg-primary-500 text-dark-950 shadow-lg shadow-primary-500/20'
                                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            All
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => scrollToCategory(cat)}
                                className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeCategory === cat
                                    ? 'bg-primary-500 text-dark-950 shadow-lg shadow-primary-500/20'
                                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                )}

                {/* Product Grid */}
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="glass-dark rounded-2xl h-64 animate-pulse">
                                <div className="h-32 bg-white/5 rounded-t-2xl"></div>
                                <div className="p-4 space-y-2">
                                    <div className="h-4 w-3/4 bg-white/10 rounded"></div>
                                    <div className="h-3 w-1/2 bg-white/5 rounded"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="py-16 text-center text-slate-500 border border-dashed border-slate-700 rounded-2xl">
                        <UtensilsCrossed className="mx-auto h-12 w-12 mb-4 opacity-50" />
                        <p>{searchQuery ? `No results for "${searchQuery}"` : 'No products available.'}</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(groupedProducts).map(([category, items]) => (
                            <div key={category} ref={el => categoryRefs.current[category] = el}>
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <div className="w-1 h-6 bg-primary-500 rounded-full"></div>
                                    {category}
                                    <span className="text-xs text-slate-500 font-normal ml-1">({items.length})</span>
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                                    {items.map(p => {
                                        const cartItem = cart.find(i => i.product.id === p.id);
                                        return (
                                            <motion.div
                                                whileHover={{ y: -3 }}
                                                key={p.id}
                                                className="glass-dark rounded-2xl border border-white/5 hover:border-primary-500/30 transition-all flex flex-col overflow-hidden group"
                                            >
                                                {/* Product Image */}
                                                <div className="relative w-full aspect-[4/3] bg-dark-900 overflow-hidden">
                                                    {p.image_url ? (
                                                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <UtensilsCrossed size={28} className="text-white/10" />
                                                        </div>
                                                    )}
                                                    {/* Quick add button overlay */}
                                                    {!cartItem && (
                                                        <button
                                                            onClick={() => {
                                                                triggerHaptic(hapticPatterns.light);
                                                                addToCart(p, 1);
                                                                toast.success(`Added ${p.name}`, { position: 'bottom-center', duration: 1500 });
                                                            }}
                                                            className="absolute bottom-2 right-2 bg-primary-500 hover:bg-primary-400 text-dark-900 rounded-xl p-2.5 shadow-lg shadow-primary-500/30 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0"
                                                        >
                                                            <Plus size={18} />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Product Info */}
                                                <div className="p-3 md:p-4 flex flex-col flex-grow">
                                                    <h4 className="font-semibold text-sm md:text-base text-slate-100 line-clamp-1">{p.name}</h4>
                                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 flex-grow">{p.description}</p>

                                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                                                        <span className="text-lg font-bold text-primary-400">{formatPrice(p.price)}</span>

                                                        {cartItem ? (
                                                            <div className="flex items-center gap-1 bg-dark-900/80 rounded-xl p-0.5 border border-white/10">
                                                                <button onClick={() => updateQuantity(p.id, cartItem.quantity - 1)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300">
                                                                    <Minus size={14} />
                                                                </button>
                                                                <span className="font-semibold w-6 text-center text-sm">{cartItem.quantity}</span>
                                                                <button onClick={() => updateQuantity(p.id, cartItem.quantity + 1)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300">
                                                                    <Plus size={14} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => {
                                                                    triggerHaptic(hapticPatterns.light);
                                                                    addToCart(p, 1);
                                                                    toast.success(`Added ${p.name}`, { position: 'bottom-center', duration: 1500 });
                                                                }}
                                                                className="bg-white/10 hover:bg-primary-500 hover:text-dark-900 text-white rounded-xl p-2 transition-colors md:hidden"
                                                            >
                                                                <Plus size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Desktop Cart Sidebar */}
            <div className="hidden lg:block w-96 flex-shrink-0">
                <div className="sticky top-28 glass-dark rounded-3xl p-6 border border-white/10 shadow-2xl flex flex-col max-h-[calc(100vh-8rem)]">

                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="text-primary-500" />
                            <h2 className="text-xl font-bold">Your Cart</h2>
                        </div>
                        <span className="bg-primary-500 text-dark-900 text-xs font-bold px-3 py-1 rounded-full">
                            {cart.length} Items
                        </span>
                    </div>

                    <div className="overflow-y-auto flex-grow pr-2 mb-6 space-y-3">
                        <AnimatePresence>
                            {cart.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-center justify-center h-48 text-slate-500 text-center"
                                >
                                    <ShoppingCart size={48} className="mb-4 opacity-20" />
                                    <p>Your cart is empty.<br />Add some items!</p>
                                </motion.div>
                            ) : (
                                cart.map((item) => (
                                    <motion.div
                                        key={item.product.id}
                                        layout
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="flex bg-dark-800/50 rounded-xl p-3 border border-white/5 relative group"
                                    >
                                        <div className="flex-grow pr-8">
                                            <h4 className="font-medium text-sm text-slate-200 line-clamp-1">{item.product.name}</h4>
                                            <div className="flex justify-between items-center mt-2">
                                                <span className="text-xs text-slate-400">{formatPrice(item.product.price)} x {item.quantity}</span>
                                                <span className="font-semibold text-primary-400">{formatPrice(item.product.price * item.quantity)}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeFromCart(item.product.id)}
                                            className="absolute top-2 right-2 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </div>

                    {cart.length > 0 && (
                        <div className="bg-dark-900/50 rounded-2xl p-5 border border-white/5 space-y-4">
                            <div className="pt-2 flex items-center justify-between">
                                <span className="text-slate-400 font-medium">Total</span>
                                <span className="text-2xl font-bold tracking-tight">{formatPrice(cartTotal)}</span>
                            </div>

                            <button
                                onClick={() => navigate('/checkout')}
                                className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-dark-950 font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-xl hover:shadow-primary-500/20 transform hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <CreditCard size={20} /> Proceed to Checkout
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Floating Cart Bar */}
            {cart.length > 0 && (
                <div className="fixed bottom-20 left-4 right-4 lg:hidden z-40">
                    <button
                        onClick={() => navigate('/checkout')}
                        className="w-full bg-primary-500 text-dark-950 font-bold py-4 px-6 rounded-2xl flex items-center justify-between shadow-2xl shadow-primary-500/30"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-dark-900/20 rounded-lg p-1.5">
                                <ShoppingCart size={18} />
                            </div>
                            <span>{cart.reduce((s, i) => s + i.quantity, 0)} items</span>
                        </div>
                        <span className="text-lg">{formatPrice(cartTotal)} →</span>
                    </button>
                </div>
            )}

            {/* Reviews Marquee Section */}
            {reviews.length > 0 && (
                <div className="mt-8 border-t border-white/5 pt-8 overflow-hidden rounded-3xl relative min-w-0 pb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2 mb-6 px-2 text-white"><Star className="text-yellow-500 fill-current" /> Store Reviews</h3>
                    <div className="absolute left-0 top-16 bottom-0 w-8 bg-gradient-to-r from-dark-950 to-transparent z-10 pointer-events-none"></div>
                    <div className="absolute right-0 top-16 bottom-0 w-12 bg-gradient-to-l from-dark-950/90 to-transparent z-10 pointer-events-none"></div>

                    <div className="flex overflow-hidden">
                        <motion.div className="flex gap-4 shrink-0 px-2 animate-[scroll_30s_linear_infinite]">
                            {[...reviews, ...reviews, ...reviews].map((r, idx) => (
                                <div key={idx} className="glass-dark border border-white/5 rounded-2xl p-4 w-64 shrink-0 flex flex-col hover:border-white/20 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex gap-1">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} size={14} className={i < r.rating ? 'text-yellow-500 fill-current' : 'text-slate-600'} />
                                            ))}
                                        </div>
                                        <span className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm text-slate-300 line-clamp-3 italic">"{r.comment || 'Great experience!'}"</p>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            )}
        </div>
    );
}
