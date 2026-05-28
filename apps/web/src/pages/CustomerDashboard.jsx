import { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import apiClient from '../api/client';
import { useAppStore } from '../store/useStore';
import { ShoppingCart, ChefHat, Plus, Minus, CreditCard, UtensilsCrossed, Trash2, ArrowLeft, Star, Search, ShoppingBag, X, Phone, Mail, ChevronUp, ChevronLeft, ChevronRight, Image, Clock, Heart, MapPin } from 'lucide-react';
import { useCurrency } from '../utils/useCurrency';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';
import OptimizedImage from '../components/OptimizedImage';

export default function CustomerDashboard() {
    const [products, setProducts] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userPoints, setUserPoints] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState(null);
    const [showMobileCart, setShowMobileCart] = useState(false);
    const [previewImageProduct, setPreviewImageProduct] = useState(null);
    const [previewImageIndex, setPreviewImageIndex] = useState(0);
    const [cartCollapsed, setCartCollapsed] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [searchParams] = useSearchParams();
    const initialTab = searchParams.get('tab') || 'menu';
    const [activeTab, setActiveTab] = useState(initialTab);
    const [reviewPage, setReviewPage] = useState(1);
    const [reviewsCount, setReviewsCount] = useState(0);
    const [reviewsAvgRating, setReviewsAvgRating] = useState('New');
    const [starCountsState, setStarCountsState] = useState({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
    const { cart, addToCart, updateQuantity, removeFromCart, selectedStore, savedStores, toggleSaveStore } = useAppStore();
    const navigate = useNavigate();
    const location = useLocation();
    const { formatPrice } = useCurrency();
    const categoryRefs = useRef({});
    const lastScrollY = useRef(0);

    // Auto-collapse cart bar on scroll down, expand on scroll up
    useEffect(() => {
        if (cart.length === 0) return;
        const handleScroll = () => {
            const y = window.scrollY;
            if (y > lastScrollY.current + 30) {
                setCartCollapsed(true);
            } else if (y < lastScrollY.current - 15) {
                setCartCollapsed(false);
            }
            lastScrollY.current = y;
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [cart.length]);

    useEffect(() => {
        apiClient.get('/auth/users/me/')
            .then(res => setUserPoints(res.data.loyalty_points || 0))
            .catch(() => console.error("Could not fetch user profile"));
    }, []);

    useEffect(() => {
        if (!lightboxOpen || !selectedStore?.gallery_images?.length) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setLightboxOpen(false);
            } else if (e.key === 'ArrowRight') {
                setLightboxIndex((prev) => (prev === selectedStore.gallery_images.length - 1 ? 0 : prev + 1));
            } else if (e.key === 'ArrowLeft') {
                setLightboxIndex((prev) => (prev === 0 ? selectedStore.gallery_images.length - 1 : prev - 1));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxOpen, selectedStore]);

    useEffect(() => {
        if (!selectedStore) return;

        const fetchStoreData = () => {
            apiClient.get(`/products/?store=${selectedStore.id}`)
                .then(res => {
                    // De-duplicate products by ID just in case API returns multiples
                    const data = res.data?.results || (Array.isArray(res.data) ? res.data : []);
                    const unique = Array.from(new Map(data.map(item => [item.id, item])).values());
                    setProducts(unique);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Failed to load menu: " + err.message);
                    setLoading(false);
                });
        };

        fetchStoreData();
        const interval = setInterval(fetchStoreData, 45000); // 45s Polling to prevent 429 Too Many Requests
        return () => clearInterval(interval);
    }, [selectedStore]);

    useEffect(() => {
        setReviewPage(1);
    }, [selectedStore]);

    useEffect(() => {
        if (!selectedStore) return;

        const fetchReviews = () => {
            apiClient.get(`/stores/${selectedStore.id}/reviews/?page=${reviewPage}`)
                .then(res => {
                    const data = res.data || {};
                    if (data.results) {
                        setReviews(data.results);
                        setReviewsCount(data.count || 0);
                        setReviewsAvgRating(data.avg_rating !== null && data.avg_rating !== undefined ? data.avg_rating : 'New');
                        setStarCountsState(data.star_counts || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
                    } else {
                        // Fallback for unpaginated response
                        const list = Array.isArray(data) ? data : [];
                        setReviews(list);
                        setReviewsCount(list.length);
                        const avg = list.length > 0 ? (list.reduce((sum, r) => sum + r.rating, 0) / list.length).toFixed(1) : 'New';
                        setReviewsAvgRating(avg);
                        
                        const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
                        list.forEach(r => {
                            const key = Math.min(5, Math.max(1, Math.round(r.rating)));
                            counts[key] = (counts[key] || 0) + 1;
                        });
                        setStarCountsState(counts);
                    }
                })
                .catch(err => console.error("Failed to load reviews", err));
        };

        fetchReviews();
        const interval = setInterval(fetchReviews, 45000); // 45s Polling
        return () => clearInterval(interval);
    }, [selectedStore, reviewPage]);

    useEffect(() => {
        if (!loading && products.length > 0 && location.state?.highlightProductId) {
            const product = products.find(p => p.id === location.state.highlightProductId);
            if (product) {
                // Open the product preview modal
                setPreviewImageProduct(product);
                setPreviewImageIndex(0);
                
                // Select category and scroll to it
                const cat = product.category_name || 'Uncategorized';
                setActiveCategory(cat);
                
                // Delay scroll slightly to allow DOM to render
                setTimeout(() => {
                    if (categoryRefs.current[cat]) {
                        categoryRefs.current[cat].scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100);

                // Clear location state so this only runs once per transition
                window.history.replaceState({}, document.title);
            }
        }
    }, [loading, products, location.state]);

    if (!selectedStore) {
        return <Navigate to="/stores" />;
    }

    const isShop = selectedStore?.store_type === 'SHOP';
    const productsArray = Array.isArray(products) ? products : [];
    const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    // Filter products by search and category
    const filteredProducts = productsArray.filter(p => {
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
    const categories = [...new Set(productsArray.map(p => p.category_name || 'Uncategorized'))];

    const scrollToCategory = (cat) => {
        setActiveCategory(activeCategory === cat ? null : cat);
        if (categoryRefs.current[cat]) {
            categoryRefs.current[cat].scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="w-full relative pb-36 md:pb-12">

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Main Menu Section */}
                <div className="flex-grow">
                    {/* Header Area Wrapper */}
                    <div className={`relative ${selectedStore.image_url ? '-mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-4 md:pt-8 pb-4 md:pb-6 mb-4 md:mb-6 md:-mt-8 rounded-b-[2rem] md:rounded-b-[3rem] overflow-hidden' : 'mb-4 md:mb-6'}`}>
                        {/* Store Image Underlay */}
                        {selectedStore.image_url && (
                            <div className="absolute inset-0 -z-10 pointer-events-none">
                                <OptimizedImage src={selectedStore.image_url} alt={selectedStore.name} className="w-full h-full object-cover opacity-20" wrapperClassName="w-full h-full" placeholderType="store" eager />
                                <div className="absolute inset-0 bg-gradient-to-b from-dark-950/10 via-dark-950/60 to-dark-950"></div>
                            </div>
                        )}

                        {/* Header Navigation & Store Details Stack */}
                        <div className="flex items-start justify-between gap-4 w-full mb-6">
                            {/* Left side: Back button and Details (Logo + Info) */}
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                                <button
                                    onClick={() => navigate('/stores')}
                                    className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white shrink-0 mt-0.5"
                                    title="Browse Stores"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                
                                <div className="flex-1 min-w-0 flex items-start gap-4">
                                    {selectedStore.image_url && (
                                        <OptimizedImage 
                                            src={selectedStore.image_url} 
                                            alt={selectedStore.name} 
                                            className="w-16 h-16 rounded-2xl object-cover border border-white/10 shadow-lg shrink-0" 
                                            wrapperClassName="w-16 h-16 rounded-2xl shrink-0 hidden sm:block" 
                                            placeholderType="store" 
                                            eager 
                                        />
                                    )}
                                    <div className="flex-1 min-w-0 text-left space-y-2">
                                        <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2 min-w-0">
                                            {!selectedStore.image_url && (isShop ? <ShoppingBag className="text-purple-500 w-5 h-5 shrink-0" /> : <ChefHat className="text-primary-500 w-5 h-5 shrink-0" />)}
                                            <span className="truncate">{selectedStore.name}</span>
                                        </h2>

                                        {/* Store Badges Row */}
                                        <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 text-xs w-full">
                                            <div className={`px-2 py-0.5 rounded-full text-[9px] md:text-xs font-black uppercase tracking-wider flex items-center gap-1 border ${
                                                selectedStore.is_open 
                                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${selectedStore.is_open ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                                                {selectedStore.is_open ? 'Open Now' : 'Closed'}
                                            </div>

                                            <span className="text-[9px] md:text-xs text-slate-400 font-bold bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                                                <Clock size={10} className="md:w-3 md:h-3 text-slate-400 shrink-0" />
                                                {selectedStore.working_hours || '08:00 AM - 10:00 PM'}
                                            </span>


                                            {selectedStore.location && <span className="w-1 h-1 rounded-full bg-white/20 hidden md:block"></span>}

                                            {selectedStore.location && (
                                                <span className="text-slate-400 text-[10px] md:text-xs flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full md:bg-transparent md:border-none md:p-0 md:font-medium">
                                                    <MapPin size={10} className="md:hidden text-slate-400" />
                                                    {selectedStore.location}
                                                </span>
                                            )}
                                        </div>

                                        {/* Action Links Row */}
                                        <div className="flex flex-wrap items-center gap-3 text-[10px] md:text-xs font-bold pt-2 border-t border-white/5 w-full">
                                            <a 
                                                href={`tel:${selectedStore.contact_phone || selectedStore.phone || ''}`} 
                                                className={`text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors ${!(selectedStore.contact_phone || selectedStore.phone) ? 'pointer-events-none opacity-50' : ''}`} 
                                                title="Call Store"
                                            >
                                                <Phone size={12} /> Call
                                            </a>
                                            <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                            <a 
                                                href={`mailto:${selectedStore.contact_email || ''}?subject=Inquiry from Chapuu`} 
                                                className={`text-slate-300 hover:text-white flex items-center gap-1 transition-colors ${!selectedStore.contact_email ? 'pointer-events-none opacity-50' : ''}`} 
                                                title="Email Store"
                                            >
                                                <Mail size={12} /> Email
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right side: Heart Button & Points Badge */}
                            <div className="flex items-start gap-2 shrink-0 mt-0.5">
                                <button
                                    onClick={() => {
                                        triggerHaptic(hapticPatterns.light);
                                        toggleSaveStore(selectedStore.id);
                                        const isSaved = Array.isArray(savedStores) && savedStores.includes(selectedStore.id);
                                        if (isSaved) {
                                            toast.success(`Removed ${selectedStore.name} from favorites`);
                                        } else {
                                            toast.success(`Saved ${selectedStore.name} to favorites`);
                                        }
                                    }}
                                    className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
                                    title={Array.isArray(savedStores) && savedStores.includes(selectedStore.id) ? "Remove from Favorites" : "Save to Favorites"}
                                >
                                    <Heart size={20} className={Array.isArray(savedStores) && savedStores.includes(selectedStore.id) ? 'fill-red-500 text-red-500' : 'text-slate-400 hover:text-red-500'} />
                                </button>
                                
                                {/* Points badge visible only on desktop */}
                                <div className="hidden md:flex bg-primary-500/10 border border-primary-500/30 rounded-xl px-4 py-2 flex flex-col items-center">
                                    <span className="text-[10px] text-primary-400 font-medium uppercase tracking-wider">Points</span>
                                    <span className="text-2xl font-black text-white leading-none mt-0.5">{userPoints}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                {/* Tab Switcher */}
                    <div className="flex border-b border-white/5 mb-6 overflow-x-auto no-scrollbar">
                        {[
                            { id: 'menu', label: isShop ? 'Products' : 'Menu', count: products.length },
                            { id: 'reviews', label: 'Reviews', count: reviewsCount },
                            { id: 'info', label: 'Info & Gallery', count: selectedStore.gallery_images?.length || 0 }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    triggerHaptic(hapticPatterns.light);
                                    setActiveTab(tab.id);
                                }}
                                className={`px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                                    activeTab === tab.id
                                        ? 'border-primary-500 text-primary-400 font-black'
                                        : 'border-transparent text-slate-400 hover:text-white'
                                }`}
                            >
                                {tab.label}
                                {tab.count > 0 && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                                        activeTab === tab.id
                                            ? 'bg-primary-500/20 text-primary-400'
                                            : 'bg-white/5 text-slate-500'
                                    }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'menu' && (
                        <>
                            {/* Search Bar */}
                            <div className="relative mb-4 w-full md:max-w-md mx-auto">
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                        <div key={i} className="glass-dark border border-white/5 rounded-3xl overflow-hidden flex flex-col h-[320px] animate-pulse">
                                            <div className="relative w-full aspect-[4/3] bg-white/5 flex items-center justify-center border-b border-white/5">
                                                <ChefHat size={48} className="text-white/10" />
                                            </div>
                                            <div className="p-5 flex-grow space-y-3">
                                                <div className="h-5 w-3/4 bg-white/5 rounded"></div>
                                                <div className="h-3.5 w-1/2 bg-white/5 rounded"></div>
                                                <div className="pt-4 border-t border-white/5 flex justify-between">
                                                    <div className="h-4 w-16 bg-white/5 rounded"></div>
                                                    <div className="h-6 w-10 bg-white/5 rounded-xl"></div>
                                                </div>
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
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                                {items.map(p => {
                                                    const cartArray = Array.isArray(cart) ? cart : [];
                                                    const cartItem = cartArray.find(i => i.product.id === p.id);
                                                    const isAvailable = p.computed_is_available !== undefined ? p.computed_is_available : p.is_active;
                                                    
                                                    return (
                                                        <motion.div
                                                            whileHover={{ y: -4 }}
                                                            key={p.id}
                                                            className={`glass-dark border border-white/5 rounded-3xl overflow-hidden hover:border-primary-500/50 transition-all flex flex-col group relative ${!isAvailable ? 'opacity-60 grayscale-[50%]' : ''}`}
                                                        >
                                                            {/* Product Image */}
                                                            <div className="relative w-full aspect-[4/3] bg-dark-900 border-b border-white/5 overflow-hidden cursor-pointer" onClick={() => { setPreviewImageIndex(0); setPreviewImageProduct(p); }}>
                                                                {p.image_url ? (
                                                                    <OptimizedImage src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" wrapperClassName="w-full h-full" placeholderType="product" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center">
                                                                        <UtensilsCrossed size={48} className="text-white/10" />
                                                                    </div>
                                                                )}
                                                                {!isAvailable && (
                                                                    <div className="absolute inset-0 bg-dark-950/60 flex items-center justify-center z-10">
                                                                        <span className="bg-red-500 text-white font-bold px-3 py-1 rounded-lg text-sm shadow-lg transform -rotate-12">Out of Stock</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Product Info */}
                                                            <div className="p-5 flex flex-col flex-grow text-left">
                                                                <h4 className="text-lg font-bold text-slate-100 group-hover:text-primary-400 transition-colors line-clamp-1">{p.name}</h4>
                                                                {p.requires_inventory && p.stock_quantity !== null && (
                                                                    <span className="text-[10px] font-bold text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded border border-orange-400/20 w-fit mt-1">
                                                                        {p.stock_quantity} in stock
                                                                    </span>
                                                                )}
                                                                <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 flex-grow">{p.description}</p>

                                                                <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                                                                    <span className="text-lg font-bold text-primary-400">{formatPrice(p.price)}</span>

                                                                    {!isAvailable ? (
                                                                        <span className="text-xs font-bold text-red-400">Unavailable</span>
                                                                    ) : cartItem ? (
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
                                                                            className="bg-white/10 hover:bg-primary-500 hover:text-dark-900 text-white rounded-xl p-2 transition-colors"
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
                        </>
                    )}

                    {activeTab === 'reviews' && (() => {
                        const totalReviews = reviewsCount;
                        const avgRating = reviewsAvgRating;
                        const starCounts = starCountsState;

                        const REVIEWS_PER_PAGE = 5;
                        const totalPages = Math.ceil(totalReviews / REVIEWS_PER_PAGE);
                        const currentPage = Math.min(reviewPage, Math.max(1, totalPages));
                        const paginatedReviews = reviews;

                        return (
                            <div className="space-y-6 text-left">
                                <div className="glass-dark border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row gap-8 items-center">
                                    <div className="text-center md:border-r md:border-white/5 md:pr-8 shrink-0">
                                        <h4 className="text-5xl font-black text-white">{avgRating}</h4>
                                        <div className="flex gap-1 justify-center my-2">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} size={16} className={i < Math.round(avgRating) ? 'text-yellow-500 fill-current' : 'text-slate-600'} />
                                            ))}
                                        </div>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{totalReviews} customer reviews</p>
                                    </div>

                                    <div className="flex-1 w-full space-y-2">
                                        {[5, 4, 3, 2, 1].map(stars => {
                                            const count = starCounts[stars] || 0;
                                            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                                            return (
                                                <div key={stars} className="flex items-center gap-3 text-xs">
                                                    <span className="w-3 font-mono font-bold text-slate-400">{stars}</span>
                                                    <Star size={10} className="text-yellow-500 fill-current shrink-0" />
                                                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${percentage}%` }} />
                                                    </div>
                                                    <span className="w-8 text-right font-mono text-slate-500">{count}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {totalReviews === 0 ? (
                                    <div className="text-center py-16 glass-dark rounded-3xl border border-white/5">
                                        <Star size={48} className="mx-auto text-slate-600 mb-3" />
                                        <h4 className="text-lg font-bold text-white mb-1">No reviews yet</h4>
                                        <p className="text-xs text-slate-400">Order from this store to leave the first review!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {paginatedReviews.map((r, idx) => (
                                            <div key={idx} className="glass-dark border border-white/5 rounded-3xl p-5 hover:border-white/10 transition-all flex flex-col gap-3 shadow-lg">
                                                <div className="flex justify-between items-start">
                                                     <div className="flex items-center gap-3">
                                                         {r.customer_profile_picture ? (
                                                             <img 
                                                                 src={r.customer_profile_picture} 
                                                                 alt={r.customer_name || r.customer_username || 'Customer'} 
                                                                 className="w-10 h-10 rounded-full object-cover border border-white/10" 
                                                             />
                                                         ) : (
                                                             <div className="w-10 h-10 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 font-black">
                                                                 {(r.customer_name || r.customer_username || 'C')[0].toUpperCase()}
                                                             </div>
                                                         )}
                                                         <div>
                                                             <h5 className="text-sm font-bold text-slate-100">{r.customer_name || r.customer_username || 'Customer'}</h5>
                                                            <div className="flex gap-0.5 mt-0.5">
                                                                {[...Array(5)].map((_, i) => (
                                                                    <Star key={i} size={10} className={i < r.rating ? 'text-yellow-500 fill-current' : 'text-slate-600'} />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] text-slate-500 bg-white/5 border border-white/5 px-2 py-0.5 rounded-md font-mono">
                                                        {new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-300 leading-relaxed italic">"{r.comment || 'Great experience!'}"</p>

                                                {r.items_reviewed && r.items_reviewed.length > 0 && (
                                                    <div className="pt-2 border-t border-white/5 flex flex-wrap gap-1.5 items-center">
                                                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider mr-1">Ordered:</span>
                                                        {r.items_reviewed.map((item, itemIdx) => (
                                                            <span key={itemIdx} className="text-[9px] font-bold text-primary-400 bg-primary-500/5 border border-primary-500/10 px-2 py-0.5 rounded">
                                                                {item}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {totalPages > 1 && (
                                            <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-white/5">
                                                <button
                                                    disabled={currentPage === 1}
                                                    onClick={() => {
                                                        triggerHaptic(hapticPatterns.light);
                                                        setReviewPage(prev => Math.max(1, prev - 1));
                                                    }}
                                                    className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none rounded-xl text-slate-400 hover:text-white transition-colors"
                                                    title="Previous Page"
                                                >
                                                    <ChevronLeft size={16} />
                                                </button>

                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-xl border border-white/5">
                                                    <span className="text-xs font-mono font-bold text-primary-400">{currentPage}</span>
                                                    <span className="text-xs font-mono text-slate-500">/</span>
                                                    <span className="text-xs font-mono text-slate-400">{totalPages}</span>
                                                </div>

                                                <button
                                                    disabled={currentPage === totalPages}
                                                    onClick={() => {
                                                        triggerHaptic(hapticPatterns.light);
                                                        setReviewPage(prev => Math.min(totalPages, prev + 1));
                                                    }}
                                                    className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none rounded-xl text-slate-400 hover:text-white transition-colors"
                                                    title="Next Page"
                                                >
                                                    <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {activeTab === 'info' && (
                        <div className="space-y-8 text-left">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="glass-dark border border-white/5 rounded-3xl p-6 space-y-4">
                                    <h4 className="text-base font-bold text-white flex items-center gap-2 pb-2 border-b border-white/5">
                                        <Clock size={16} className="text-primary-500" /> Operational Hours
                                    </h4>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400">Working Hours</span>
                                        <span className="font-bold text-slate-200">{selectedStore.working_hours || '08:00 AM - 10:00 PM'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400">Status</span>
                                        <span className={`font-black uppercase text-xs px-2.5 py-0.5 rounded-full border ${
                                            selectedStore.is_open 
                                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                                : 'bg-red-500/10 border-red-500/20 text-red-400'
                                        }`}>
                                            {selectedStore.is_open ? 'Open Now' : 'Closed'}
                                        </span>
                                    </div>
                                </div>

                                <div className="glass-dark border border-white/5 rounded-3xl p-6 space-y-4">
                                    <h4 className="text-base font-bold text-white flex items-center gap-2 pb-2 border-b border-white/5">
                                        <MapPin size={16} className="text-primary-500" /> Contact & Location
                                    </h4>
                                    <div className="flex justify-between items-start text-sm">
                                        <span className="text-slate-400 shrink-0">Address</span>
                                        <span className="font-medium text-slate-200 text-right">{selectedStore.location || 'Online / Delivery Only'}</span>
                                    </div>
                                    {selectedStore.contact_phone && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400">Phone</span>
                                            <a href={`tel:${selectedStore.contact_phone}`} className="font-bold text-primary-400 hover:underline">{selectedStore.contact_phone}</a>
                                        </div>
                                    )}
                                    {selectedStore.contact_email && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400">Email</span>
                                            <a href={`mailto:${selectedStore.contact_email}`} className="font-bold text-primary-400 hover:underline">{selectedStore.contact_email}</a>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-base font-bold text-white flex items-center gap-2 mb-4 px-2">
                                    <Image size={16} className="text-primary-500" /> Store Gallery Images
                                </h4>
                                {selectedStore.gallery_images?.length === 0 ? (
                                    <div className="text-center py-12 glass-dark rounded-3xl border border-white/5">
                                        <Image size={48} className="mx-auto text-slate-600 mb-3" />
                                        <h4 className="text-lg font-bold text-white mb-1">No photos added</h4>
                                        <p className="text-xs text-slate-400">This store hasn't shared any photos yet.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 px-2">
                                        {selectedStore.gallery_images.map((img, idx) => (
                                            <button
                                                key={img.id}
                                                onClick={() => {
                                                    triggerHaptic(hapticPatterns.medium);
                                                    setLightboxIndex(idx);
                                                    setLightboxOpen(true);
                                                }}
                                                className="w-full aspect-[4/3] rounded-3xl overflow-hidden border border-white/5 hover:border-primary-500/50 hover:scale-[1.02] shrink-0 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/30 relative group shadow-lg"
                                            >
                                                <OptimizedImage 
                                                    src={img.image_url || img.image} 
                                                    alt={img.caption || 'Store image'} 
                                                    className="w-full h-full object-cover" 
                                                    wrapperClassName="w-full h-full"
                                                    placeholderType="store"
                                                    eager
                                                />
                                                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Mobile Floating Cart Bar — collapses to pill on scroll */}
            {cart.length > 0 && (
                <div className={`fixed lg:hidden z-40 transition-all duration-300 ease-out ${
                    cartCollapsed
                        ? 'bottom-24 right-4 left-auto'
                        : 'bottom-20 left-4 right-4'
                }`}>
                    {cartCollapsed ? (
                        /* Collapsed pill */
                        <button
                            onClick={() => setCartCollapsed(false)}
                            className="bg-primary-500 text-dark-950 font-bold w-14 h-14 rounded-full flex items-center justify-center shadow-2xl shadow-primary-500/40 relative"
                        >
                            <ShoppingCart size={20} />
                            <span className="absolute -top-1 -right-1 bg-dark-900 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-primary-500">
                                {cart.reduce((s, i) => s + i.quantity, 0)}
                            </span>
                        </button>
                    ) : (
                        /* Expanded bar */
                        <button
                            onClick={() => navigate('/cart')}
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
                    )}
                </div>
            )}




            {/* Full Picture Modal — Mobile-optimized */}
            <AnimatePresence>
                {previewImageProduct && (() => {
                    const images = [previewImageProduct.image_url, previewImageProduct.image2_url].filter(Boolean);
                    return (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] bg-dark-950/95 backdrop-blur-md flex flex-col"
                            onClick={() => setPreviewImageProduct(null)}
                        >
                            {/* Top bar */}
                            <div className="flex items-center justify-between px-4 py-3 safe-area-top shrink-0" onClick={e => e.stopPropagation()}>
                                <button 
                                    className="text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-colors"
                                    onClick={() => setPreviewImageProduct(null)}
                                >
                                    <X size={20} />
                                </button>
                                {images.length > 1 && (
                                    <div className="flex gap-1.5">
                                        {images.map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setPreviewImageIndex(i)}
                                                className={`w-2 h-2 rounded-full transition-all ${previewImageIndex === i ? 'bg-primary-500 w-6' : 'bg-white/30'}`}
                                            />
                                        ))}
                                    </div>
                                )}
                                <div className="w-10" /> {/* spacer for centering dots */}
                            </div>

                            {/* Image area — fills available space */}
                            <div 
                                className="flex-1 flex items-center justify-center px-2 pb-2 min-h-0 overflow-hidden relative group"
                                onClick={e => e.stopPropagation()}
                            >
                                {/* Desktop Navigation Arrows */}
                                {images.length > 1 && (
                                    <>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                triggerHaptic(hapticPatterns.light);
                                                setPreviewImageIndex(prev => (prev - 1 + images.length) % images.length);
                                            }}
                                            className="absolute left-4 z-20 p-3 rounded-full bg-black/40 text-white hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100 hidden md:block"
                                        >
                                            <ChevronLeft size={24} />
                                        </button>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                triggerHaptic(hapticPatterns.light);
                                                setPreviewImageIndex(prev => (prev + 1) % images.length);
                                            }}
                                            className="absolute right-4 z-20 p-3 rounded-full bg-black/40 text-white hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100 hidden md:block"
                                        >
                                            <ChevronRight size={24} />
                                        </button>
                                    </>
                                )}

                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={previewImageIndex}
                                        drag="x"
                                        dragConstraints={{ left: 0, right: 0 }}
                                        onDragEnd={(e, { offset, velocity }) => {
                                            const swipeThreshold = 50;
                                            if (images.length > 1) {
                                                if (offset.x < -swipeThreshold) {
                                                    triggerHaptic(hapticPatterns.light);
                                                    setPreviewImageIndex(prev => (prev + 1) % images.length);
                                                } else if (offset.x > swipeThreshold) {
                                                    triggerHaptic(hapticPatterns.light);
                                                    setPreviewImageIndex(prev => (prev - 1 + images.length) % images.length);
                                                }
                                            }
                                        }}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        className="w-full h-full flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
                                    >
                                        {images[previewImageIndex] && (
                                            <OptimizedImage 
                                                src={images[previewImageIndex]} 
                                                alt={previewImageProduct.name} 
                                                className="max-w-full max-h-full object-contain rounded-2xl pointer-events-none shadow-2xl" 
                                                wrapperClassName="w-full h-full flex items-center justify-center"
                                                placeholderType="product"
                                                eager 
                                            />
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Product info overlay at bottom */}
                            <div 
                                className="shrink-0 px-5 pb-6 pt-3 bg-gradient-to-t from-dark-950 via-dark-950/80 to-transparent"
                                onClick={e => e.stopPropagation()}
                            >
                                <h3 className="text-xl font-bold text-white mb-1 line-clamp-1">{previewImageProduct.name}</h3>
                                <div className="flex items-center justify-between">
                                    <span className="text-lg font-bold text-primary-400">{formatPrice(previewImageProduct.price)}</span>
                                    {previewImageProduct.description && (
                                        <p className="text-xs text-slate-400 ml-4 line-clamp-1 flex-1 text-right">{previewImageProduct.description}</p>
                                    )}
                                </div>
                                {/* Quick add to cart from preview */}
                                {(() => {
                                    const isAvailable = previewImageProduct.computed_is_available !== undefined ? previewImageProduct.computed_is_available : previewImageProduct.is_active;
                                    const cartArray = Array.isArray(cart) ? cart : [];
                                    const cartItem = cartArray.find(i => i.product.id === previewImageProduct.id);
                                    if (!isAvailable) return null;
                                    return (
                                        <button
                                            onClick={() => {
                                                triggerHaptic(hapticPatterns.light);
                                                if (cartItem) {
                                                    updateQuantity(previewImageProduct.id, cartItem.quantity + 1);
                                                } else {
                                                    addToCart(previewImageProduct, 1);
                                                }
                                                toast.success(`Added ${previewImageProduct.name}`, { position: 'bottom-center', duration: 1500 });
                                            }}
                                            className="mt-3 w-full bg-primary-500 text-dark-950 font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
                                        >
                                            <Plus size={18} />
                                            {cartItem ? `Add Another (${cartItem.quantity} in cart)` : 'Add to Cart'}
                                        </button>
                                    );
                                })()}
                            </div>
                        </motion.div>
                    );
                })()}
            </AnimatePresence>

            {/* Store Gallery Lightbox Modal */}
            <AnimatePresence>
                {lightboxOpen && selectedStore?.gallery_images?.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setLightboxOpen(false)}
                        className="fixed inset-0 z-50 flex flex-col justify-between bg-dark-950/95 backdrop-blur-xl select-none"
                    >
                        {/* Lightbox Header */}
                        <div 
                            className="w-full flex items-center justify-between p-4 bg-gradient-to-b from-dark-950 to-transparent"
                            onClick={e => e.stopPropagation()}
                        >
                            <span className="text-slate-400 text-sm font-bold">
                                {lightboxIndex + 1} of {selectedStore.gallery_images.length}
                            </span>
                            <button
                                onClick={() => {
                                    triggerHaptic(hapticPatterns.light);
                                    setLightboxOpen(false);
                                }}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white cursor-pointer"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Lightbox Body / Swiper */}
                        <div className="flex-1 flex items-center justify-between px-2 md:px-8 relative">
                            {/* Left Nav Button (Desktop) */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    triggerHaptic(hapticPatterns.light);
                                    setLightboxIndex((prev) => (prev === 0 ? selectedStore.gallery_images.length - 1 : prev - 1));
                                }}
                                className="hidden md:flex p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full transition-colors text-slate-400 hover:text-white cursor-pointer"
                            >
                                <ChevronLeft size={28} />
                            </button>

                            {/* Main Gallery Image View with Motion for Swipe */}
                            <div 
                                className="w-full max-w-4xl h-[60vh] md:h-[75vh] flex items-center justify-center overflow-hidden mx-auto"
                                onClick={e => e.stopPropagation()}
                            >
                                <motion.div
                                    key={lightboxIndex}
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    transition={{ duration: 0.2 }}
                                    className="w-full h-full flex items-center justify-center relative p-2"
                                    drag="x"
                                    dragConstraints={{ left: 0, right: 0 }}
                                    dragElastic={0.6}
                                    onDragEnd={(e, { offset, velocity }) => {
                                        const swipeConfidenceThreshold = 10000;
                                        const swipePower = Math.abs(offset.x) * velocity.x;
                                        if (swipePower < -swipeConfidenceThreshold || offset.x < -150) {
                                            // Swipe left -> Next Image
                                            triggerHaptic(hapticPatterns.light);
                                            setLightboxIndex((prev) => (prev === selectedStore.gallery_images.length - 1 ? 0 : prev + 1));
                                        } else if (swipePower > swipeConfidenceThreshold || offset.x > 150) {
                                            // Swipe right -> Prev Image
                                            triggerHaptic(hapticPatterns.light);
                                            setLightboxIndex((prev) => (prev === 0 ? selectedStore.gallery_images.length - 1 : prev - 1));
                                        }
                                    }}
                                >
                                    <OptimizedImage 
                                        src={selectedStore.gallery_images[lightboxIndex].image_url || selectedStore.gallery_images[lightboxIndex].image} 
                                        alt={selectedStore.gallery_images[lightboxIndex].caption || 'Store Gallery Image'} 
                                        className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-white/5"
                                        wrapperClassName="w-full h-full flex items-center justify-center"
                                        placeholderType="store"
                                        eager
                                    />
                                </motion.div>
                            </div>

                            {/* Right Nav Button (Desktop) */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    triggerHaptic(hapticPatterns.light);
                                    setLightboxIndex((prev) => (prev === selectedStore.gallery_images.length - 1 ? 0 : prev + 1));
                                }}
                                className="hidden md:flex p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full transition-colors text-slate-400 hover:text-white cursor-pointer"
                            >
                                <ChevronRight size={28} />
                            </button>
                        </div>

                        {/* Lightbox Footer (Caption) */}
                        <div 
                            className="w-full text-center px-6 pb-8 pt-4 bg-gradient-to-t from-dark-950 via-dark-950/80 to-transparent"
                            onClick={e => e.stopPropagation()}
                        >
                            {selectedStore.gallery_images[lightboxIndex].caption ? (
                                <p className="text-white text-base md:text-lg font-bold line-clamp-2 drop-shadow-md">
                                    {selectedStore.gallery_images[lightboxIndex].caption}
                                </p>
                            ) : (
                                <p className="text-slate-500 text-xs italic tracking-wider">No description available</p>
                            )}
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-2 block md:hidden">
                                👈 Swipe Left or Right to Browse 👉
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
