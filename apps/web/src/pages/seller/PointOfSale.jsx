import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ShoppingBag, ShoppingCart, Plus, Minus, X, Trash2, 
    ArrowLeft, Search, Tag, DollarSign, Printer, CheckCircle2,
    Clock, Coffee, UtensilsCrossed, CreditCard, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../api/client';
import { useAppStore } from '../../store/useStore';
import { useCurrency } from '../../utils/useCurrency';
import OptimizedImage from '../../components/OptimizedImage';

export default function PointOfSale() {
    const navigate = useNavigate();
    const { token, userRole } = useAppStore();
    const { formatPrice } = useCurrency();
    const [isLoading, setIsLoading] = useState(true);
    const [storeDetails, setStoreDetails] = useState(null);
    const [products, setProducts] = useState([]);
    
    // POS State
    const [cart, setCart] = useState([]);
    const [customItems, setCustomItems] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('ALL');
    const [customerName, setCustomerName] = useState('');
    const [skipKitchen, setSkipKitchen] = useState(true);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [fulfillmentMode, setFulfillmentMode] = useState('TAKEAWAY');
    
    // Modals
    const [showCustomItemModal, setShowCustomItemModal] = useState(false);
    const [customItemDraft, setCustomItemDraft] = useState({ name: '', price: '' });
    
    const [showDiscountModal, setShowDiscountModal] = useState(false);
    const [discountDraft, setDiscountDraft] = useState('');
    
    const [transactionComplete, setTransactionComplete] = useState(null);
    const [activeTab, setActiveTab] = useState('products');
    const [isProcessing, setIsProcessing] = useState(false);
    const [printOrderId, setPrintOrderId] = useState(null);
    
    const searchInputRef = useRef(null);

    const fetchStoreData = async () => {
        try {
            const [storeRes, productsRes] = await Promise.all([
                apiClient.get('/stores/my_store/'),
                apiClient.get('/products/')
            ]);
            setStoreDetails(storeRes.data);
            setProducts((productsRes.data || []).filter(p => p.is_active));
        } catch (error) {
            console.error("Error fetching store data:", error);
            toast.error("Failed to load store catalog");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!token) return;
        fetchStoreData();
        
        // Auto-focus search on load for fast barcode scanning
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [token]);

    // Derived Data
    const categories = useMemo(() => {
        const cats = new Set(products.map(p => p.category).filter(Boolean));
        return ['ALL', ...Array.from(cats)];
    }, [products]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesCat = activeCategory === 'ALL' || p.category === activeCategory;
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesCat && matchesSearch;
        });
    }, [products, activeCategory, searchQuery]);

    const subtotal = useMemo(() => {
        const productsTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const customTotal = customItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        return productsTotal + customTotal;
    }, [cart, customItems]);

    const total = Math.max(0, subtotal - discountAmount);

    // Cart Actions
    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === product.id);
            if (existing) {
                return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
        setSearchQuery('');
        if (searchInputRef.current) searchInputRef.current.focus();
    };

    const updateQty = (id, delta, isCustom = false) => {
        if (isCustom) {
            setCustomItems(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
        } else {
            setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
        }
    };

    const removeLineItem = (id, isCustom = false) => {
        if (isCustom) {
            setCustomItems(prev => prev.filter(i => i.id !== id));
        } else {
            setCart(prev => prev.filter(i => i.id !== id));
        }
    };

    const addCustomItem = () => {
        if (!customItemDraft.name || !customItemDraft.price) {
            toast.error("Name and price required");
            return;
        }
        setCustomItems(prev => [...prev, {
            id: 'custom_' + Date.now(),
            name: customItemDraft.name,
            price: parseFloat(customItemDraft.price),
            quantity: 1,
            isCustom: true
        }]);
        setCustomItemDraft({ name: '', price: '' });
        setShowCustomItemModal(false);
    };

    const clearCart = () => {
        setCart([]);
        setCustomItems([]);
        setDiscountAmount(0);
        setCustomerName('');
    };

    const handleCheckout = async () => {
        if (cart.length === 0 && customItems.length === 0) {
            toast.error("Cart is empty");
            return;
        }

        const toastId = toast.loading('Processing payment...');
        const payload = {
            store: storeDetails.id,
            fulfillment_mode: fulfillmentMode,
            is_instant_payment: true,
            payment_message: `POS Terminal: ${customerName || 'Walk-in'}`,
            discount_amount: discountAmount,
            pos_custom_items: customItems.map(i => ({ name: i.name, price: i.price, quantity: i.quantity })),
            items: cart.map(i => ({ product: i.id, quantity: i.quantity, unit_price: i.price }))
        };

        setIsProcessing(true);
        try {
            const res = await apiClient.post('/orders/', payload);
            const orderId = res.data.id;
            let currentOrderState = res.data.state;
            
            if (skipKitchen) {
                // Iteratively transition the order to COMPLETED
                if (currentOrderState === 'QUEUED') {
                    try {
                        const transitionRes = await apiClient.post(`/orders/${orderId}/advance_state/`, { state: 'PREPARING' });
                        currentOrderState = transitionRes.data.order_state || transitionRes.data.state;
                    } catch (e) {
                        console.error("Failed to transition QUEUED -> PREPARING:", e);
                    }
                }
                if (currentOrderState === 'PREPARING') {
                    try {
                        const transitionRes = await apiClient.post(`/orders/${orderId}/advance_state/`, { state: 'READY' });
                        currentOrderState = transitionRes.data.order_state || transitionRes.data.state;
                    } catch (e) {
                        console.error("Failed to transition PREPARING -> READY:", e);
                    }
                }
                if (currentOrderState === 'READY') {
                    try {
                        const transitionRes = await apiClient.post(`/orders/${orderId}/advance_state/`, { state: 'COMPLETED' });
                        currentOrderState = transitionRes.data.order_state || transitionRes.data.state;
                    } catch (e) {
                        console.error("Failed to transition READY -> COMPLETED:", e);
                    }
                }
            }

            toast.success('Transaction Successful!', { id: toastId });
            setTransactionComplete({ ...res.data, state: currentOrderState });
            clearCart();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || 'Payment failed', { id: toastId });
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="h-screen w-full bg-dark-950 flex flex-col font-sans overflow-hidden">
            {/* Top Navigation Bar */}
            <header className="h-16 bg-dark-900 border-b border-white/10 flex items-center justify-between px-6 shrink-0 z-10 shadow-md">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate(userRole === 'CHAPUUSTAFF' ? '/staff-portal' : '/seller')}
                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-white tracking-tight leading-none">{storeDetails?.name || 'Chapuu POS'}</h1>
                        <p className="text-[10px] text-primary-500 font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Terminal Active
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-dark-950 rounded-xl border border-white/5">
                        <Clock size={16} className="text-slate-500" />
                        <span className="text-sm font-bold text-slate-300">
                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                    <button onClick={clearCart} className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white text-sm font-bold rounded-xl transition-colors">
                        Hold / Clear
                    </button>
                </div>
            </header>

            {/* Mobile Tab Switcher */}
            <div className="flex md:hidden bg-dark-900 border-b border-white/10 shrink-0">
                <button onClick={() => setActiveTab('products')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'products' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-slate-400'}`}>
                    <ShoppingBag size={18} /> Menu
                </button>
                <button onClick={() => setActiveTab('cart')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'cart' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-slate-400'}`}>
                    <ShoppingCart size={18} /> Cart ({cart.length + customItems.length})
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* Left Pane: Catalog */}
                <div className={`flex-[3] h-full flex-col border-r border-white/10 bg-dark-950 relative ${activeTab === 'products' ? 'flex' : 'hidden md:flex'}`}>
                    
                    {/* Catalog Header Controls */}
                    <div className="p-4 border-b border-white/5 bg-dark-900/50 flex flex-col sm:flex-row gap-4 shrink-0">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input 
                                ref={searchInputRef}
                                type="text" 
                                placeholder="Search products or scan barcode..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-dark-950 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-white font-medium focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all placeholder:text-slate-600"
                            />
                        </div>
                        <div className="flex overflow-x-auto pb-1 sm:pb-0 gap-2 custom-scrollbar hide-scroll-indicator shrink-0 items-center">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                                        activeCategory === cat 
                                            ? 'bg-primary-500 text-dark-950 shadow-lg shadow-primary-500/20' 
                                            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Product Grid */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                        {filteredProducts.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-30">
                                <Search size={64} className="mb-4" />
                                <p className="text-xl font-bold">No products found</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 auto-rows-max">
                                {filteredProducts.map(product => (
                                    <button 
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        className="group relative flex flex-col bg-dark-900 border border-white/5 rounded-3xl overflow-hidden hover:border-primary-500 hover:shadow-[0_0_20px_rgba(249,115,22,0.15)] transition-all cursor-pointer h-40 md:h-48 text-left active:scale-95"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-900/60 to-transparent z-10"></div>
                                        {product.image ? (
                                            <div className="absolute inset-0">
                                                <OptimizedImage src={product.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                            </div>
                                        ) : (
                                            <div className="absolute inset-0 bg-dark-800 flex items-center justify-center text-slate-600">
                                                <ShoppingBag size={32} />
                                            </div>
                                        )}
                                        <div className="relative z-20 mt-auto p-3 md:p-4 w-full">
                                            <p className="text-white font-bold text-sm md:text-base leading-tight line-clamp-2 drop-shadow-md">{product.name}</p>
                                            <p className="text-primary-400 font-black text-sm md:text-base mt-1 drop-shadow-md">{formatPrice(product.price)}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Pane: Cart & Checkout */}
                <div className={`w-full h-full md:w-[320px] lg:w-[380px] xl:w-[450px] bg-dark-900 flex-col shadow-[-20px_0_40px_rgba(0,0,0,0.5)] shrink-0 relative z-20 ${activeTab === 'cart' ? 'flex' : 'hidden md:flex'}`}>
                    
                    {/* Cart Header */}
                    <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-dark-950/50">
                        <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                            <ShoppingCart size={20} className="text-primary-500" /> Current Order
                        </h2>
                        <span className="bg-primary-500 text-dark-950 text-xs font-black px-2 py-1 rounded-lg">
                            {cart.length + customItems.length} items
                        </span>
                    </div>

                    {/* Scrollable Middle Section (Items + Options) */}
                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col">
                        
                        {/* Cart Items List */}
                        <div className="flex-1 p-4 space-y-3">
                        {[...cart, ...customItems].length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-20">
                                <ShoppingBag size={64} className="mb-4" />
                                <p className="font-bold uppercase tracking-widest text-sm">Cart is empty</p>
                            </div>
                        ) : (
                            [...cart, ...customItems].map(item => (
                                <div key={item.id} className="flex gap-3 bg-dark-950/50 border border-white/5 rounded-2xl p-3 items-center group">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-white font-bold text-sm truncate pr-2">
                                            {item.isCustom && <Tag size={12} className="inline mr-1 text-secondary-500" />}
                                            {item.name}
                                        </h4>
                                        <p className="text-primary-400 font-black text-xs mt-0.5">{formatPrice(item.price)}</p>
                                    </div>
                                    <div className="flex items-center gap-1 bg-dark-900 border border-white/10 rounded-xl p-1">
                                        <button onClick={() => updateQty(item.id, -1, item.isCustom)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-400 transition-colors cursor-pointer"><Minus size={14} /></button>
                                        <span className="w-6 text-center text-sm font-black text-white">{item.quantity}</span>
                                        <button onClick={() => updateQty(item.id, 1, item.isCustom)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-400 transition-colors cursor-pointer"><Plus size={14} /></button>
                                    </div>
                                    <button onClick={() => removeLineItem(item.id, item.isCustom)} className="w-10 h-10 flex items-center justify-center rounded-xl text-red-500/50 hover:bg-red-500/10 hover:text-red-500 transition-colors cursor-pointer shrink-0">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                        </div>

                        {/* Advanced Options (Scrolls with items) */}
                        <div className="mt-auto shrink-0 border-t border-white/10 bg-dark-900/50">
                            
                            {/* Order Modifiers */}
                            <div className="px-5 py-4 grid grid-cols-2 gap-3">
                        <button onClick={() => setShowCustomItemModal(true)} className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold text-sm transition-colors border border-white/5">
                            <Plus size={16} className="text-primary-500" /> Misc Item
                        </button>
                        <button onClick={() => setShowDiscountModal(true)} className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold text-sm transition-colors border border-white/5">
                            <Tag size={16} className="text-secondary-500" /> {discountAmount > 0 ? `Discount (-${formatPrice(discountAmount)})` : 'Discount'}
                        </button>
                            </div>

                            {/* Fulfillment & Customer */}
                            <div className="px-5 pb-4 space-y-3.5">
                                {/* Customer Name Input */}
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Customer Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="Walk-in Customer" 
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        className="w-full bg-dark-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-primary-500 outline-none placeholder:text-slate-600 transition-all focus:ring-1 focus:ring-primary-500"
                                    />
                                </div>

                                {/* Skip Kitchen Queue Switch */}
                                <button 
                                    type="button"
                                    onClick={() => setSkipKitchen(!skipKitchen)}
                                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-between transition-all border ${
                                        skipKitchen 
                                            ? 'bg-green-500/10 text-green-500 border-green-500/30' 
                                            : 'bg-dark-800 text-slate-400 border-white/5'
                                    }`}
                                >
                                    <span>Skip Kitchen Queue</span>
                                    <span className={`w-2.5 h-2.5 rounded-full transition-all ${skipKitchen ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-slate-600'}`}></span>
                                </button>

                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => setFulfillmentMode('TAKEAWAY')}
                                        className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${fulfillmentMode === 'TAKEAWAY' ? 'bg-primary-500 text-dark-950' : 'bg-dark-800 text-slate-400 border border-white/5'}`}
                                    >
                                        <Coffee size={14} /> Takeaway
                                    </button>
                                    <button 
                                        onClick={() => setFulfillmentMode('DINE_IN')}
                                        className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${fulfillmentMode === 'DINE_IN' ? 'bg-primary-500 text-dark-950' : 'bg-dark-800 text-slate-400 border border-white/5'}`}
                                    >
                                        <UtensilsCrossed size={14} /> Dine-In
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sticky Checkout Footer */}
                    <div className="bg-dark-950 px-5 py-4 border-t border-white/10 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-10">
                        <div className="space-y-1 mb-3">
                            <div className="flex justify-between text-sm text-slate-400 font-medium">
                                <span>Subtotal</span>
                                <span>{formatPrice(subtotal)}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-sm text-secondary-500 font-bold">
                                    <span>Discount</span>
                                    <span>-{formatPrice(discountAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-end pt-1 border-t border-white/5 mt-1">
                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Total</span>
                                <span className="text-3xl font-black text-white tracking-tight">{formatPrice(total)}</span>
                            </div>
                        </div>

                        <button 
                            onClick={handleCheckout}
                            disabled={isProcessing || ([...cart, ...customItems].length === 0)}
                            className={`w-full py-3.5 rounded-xl font-black text-lg transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(249,115,22,0.15)] ${isProcessing || ([...cart, ...customItems].length === 0) ? 'bg-dark-800 text-slate-500 cursor-not-allowed' : 'bg-primary-500 hover:bg-primary-400 text-dark-950 hover:shadow-[0_0_25px_rgba(249,115,22,0.3)]'}`}
                        >
                            {isProcessing ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <CreditCard size={20} />
                            )}
                            {isProcessing ? 'Processing...' : 'Checkout'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showCustomItemModal && (
                    <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-dark-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-white/10">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-black text-white uppercase tracking-tight">Add Misc Item</h3>
                                <button onClick={() => setShowCustomItemModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Item Name</label>
                                    <input type="text" autoFocus value={customItemDraft.name} onChange={e => setCustomItemDraft(p => ({...p, name: e.target.value}))} className="w-full bg-dark-950 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-primary-500 outline-none" placeholder="e.g. Special Request" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Price (KES)</label>
                                    <input type="number" value={customItemDraft.price} onChange={e => setCustomItemDraft(p => ({...p, price: e.target.value}))} className="w-full bg-dark-950 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-primary-500 outline-none" placeholder="0.00" />
                                </div>
                                <button onClick={addCustomItem} className="w-full py-3.5 mt-2 rounded-xl bg-primary-500 text-dark-900 font-black text-sm hover:bg-primary-400 transition-colors">Add to Order</button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {showDiscountModal && (
                    <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-dark-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-white/10">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-black text-white uppercase tracking-tight">Apply Discount</h3>
                                <button onClick={() => setShowDiscountModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Discount Amount (KES)</label>
                                    <input type="number" autoFocus value={discountDraft} onChange={e => setDiscountDraft(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-primary-500 outline-none" placeholder="e.g. 100" />
                                </div>
                                <button onClick={() => {
                                    setDiscountAmount(parseFloat(discountDraft) || 0);
                                    setShowDiscountModal(false);
                                    setDiscountDraft('');
                                }} className="w-full py-3.5 mt-2 rounded-xl bg-secondary-500 text-white font-black text-sm hover:bg-secondary-400 transition-colors">Apply Discount</button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {transactionComplete && (
                    <div className="fixed inset-0 bg-dark-950/95 backdrop-blur-md z-[300] flex flex-col items-center justify-center p-6 text-center">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-dark-950 mb-8 shadow-[0_0_50px_rgba(34,197,94,0.3)]">
                            <CheckCircle2 size={48} strokeWidth={3} />
                        </motion.div>
                        <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-4xl font-black text-white uppercase tracking-tight mb-2">
                            Sale Complete
                        </motion.h2>
                        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-slate-400 mb-12">
                            Order #{transactionComplete.id} • {formatPrice(transactionComplete.total_amount)}
                        </motion.p>
                        
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                            <button onClick={() => setPrintOrderId(transactionComplete.id)} className="flex-1 py-4 rounded-2xl bg-white/10 text-white font-bold text-sm hover:bg-white/20 transition-all border border-white/10 flex items-center justify-center gap-2">
                                <Printer size={18} /> Print Receipt
                            </button>
                            <button onClick={() => setTransactionComplete(null)} className="flex-1 py-4 rounded-2xl bg-primary-500 text-dark-900 font-black text-sm hover:bg-primary-400 transition-all shadow-[0_10px_30px_rgba(249,115,22,0.3)]">
                                NEW SALE
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Hidden iframe for silent printing */}
            {printOrderId && (
                <iframe 
                    src={`/seller/print-receipt/${printOrderId}?embedded=true`} 
                    className="absolute w-0 h-0 invisible border-0"
                    title="Print Frame"
                    onLoad={() => {
                        // Reset after a brief delay to allow multiple prints if needed
                        setTimeout(() => setPrintOrderId(null), 3000);
                    }}
                />
            )}
        </div>
    );
}
