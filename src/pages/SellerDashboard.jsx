import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, CheckCircle2, Clock, ListOrdered, Utensils, CreditCard, Play, SquareTerminal, Star, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '../store/useStore';
import { useCurrency, formatPriceStatic } from '../utils/useCurrency';
export default function SellerDashboard() {
    const [orders, setOrders] = useState([]);
    const [queueSize, setQueueSize] = useState(0);
    const [loading, setLoading] = useState(true);
    const [storeType, setStoreType] = useState('RESTAURANT'); // 'RESTAURANT' or 'SHOP'
    const { userRole, clearAuth } = useAppStore();
    const { formatPrice } = useCurrency();

    // POS Override State
    const [showPOSModal, setShowPOSModal] = useState(false);
    const [posProducts, setPosProducts] = useState([]);
    const [posCart, setPosCart] = useState([]);
    const [posCustomerName, setPosCustomerName] = useState('');
    const [posSkipKitchen, setPosSkipKitchen] = useState(false);

    // Dashboard View State
    const [activeView, setActiveView] = useState('KITCHEN'); // 'KITCHEN', 'REVIEWS', 'PROFILE'
    const [reviews, setReviews] = useState([]);

    // Profile State
    const [storeDetails, setStoreDetails] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    const fetchDashboard = () => {
        apiClient.get('/auth/users/me/')
            .then(res => setUserProfile(res.data))
            .catch(e => console.error("Profile sync error"));

        apiClient.get('/orders/')
            .then(res => {
                setOrders(res.data);
                setLoading(false);
            })
            .catch(err => {
                toast.error("Error syncing live dashboard");
                setLoading(false);
            });

        // Detect store type and fetch related data
        apiClient.get('/stores/my_store/')
            .then(res => {
                if (res.data && res.data.id) {
                    const store = res.data;
                    setStoreDetails(store);
                    setStoreType(store.store_type || 'RESTAURANT');
                    apiClient.get(`/stores/${store.id}/kitchen_queue/`)
                        .then(r => setQueueSize(r.data.queue_size))
                        .catch(e => console.error("Queue sync error:", e));
                    apiClient.get(`/stores/${store.id}/reviews/`)
                        .then(r => setReviews(r.data))
                        .catch(e => console.error("Review sync error:", e));
                }
            })
            .catch(e => console.error("Store sync error:", e));

        apiClient.get('/products/')
            .then(res => setPosProducts(res.data))
            .catch(e => console.error("Products sync error:", e));
    }

    const markItemReady = (orderId, itemId) => {
        const toastId = toast.loading('Marking item ready...');
        apiClient.post(`/orders/${orderId}/items/${itemId}/ready/`)
            .then(() => {
                toast.success('Kitchen item completed!', { id: toastId });
                fetchDashboard();
            })
            .catch(err => toast.error("Error updating item: " + err.message, { id: toastId }));
    }

    const advanceOrderState = (orderId, newState) => {
        const toastId = toast.loading('Updating order...');
        apiClient.post(`/orders/${orderId}/advance_state/`, { state: newState })
            .then(() => {
                toast.success('Order advanced!', { id: toastId });
                fetchDashboard();
            })
            .catch(err => toast.error("Error updating order: " + err.message, { id: toastId }));
    }

    useEffect(() => {
        fetchDashboard();
        const interval = setInterval(fetchDashboard, 30000); // Increased to 30s to prevent 429 errors
        return () => clearInterval(interval);
    }, []);

    const handleProfileSave = (e) => {
        e.preventDefault();
        if (!storeDetails) return;
        setIsSavingProfile(true);
        const toastId = toast.loading('Updating store profile...');
        apiClient.put(`/stores/${storeDetails.id}/`, storeDetails)
            .then(res => {
                toast.success('Profile updated successfully!', { id: toastId });
                setStoreDetails(res.data);
                setIsSavingProfile(false);
            })
            .catch(err => {
                toast.error('Failed to update profile.', { id: toastId });
                console.error(err);
                setIsSavingProfile(false);
            });
    };

    const activeOrders = orders.filter(o => o.state !== 'COMPLETED' && o.state !== 'CANCELLED' && o.state !== 'CREATED');
    const awaitingPaymentOrders = activeOrders.filter(o => o.state === 'AWAITING_PAYMENT');
    const queuedOrders = activeOrders.filter(o => o.state === 'QUEUED' || o.state === 'PAID');
    const preparingOrders = activeOrders.filter(o => o.state === 'PREPARING');
    const readyOrders = activeOrders.filter(o => o.state === 'READY');

    return (
        <div className="w-full min-h-screen flex flex-col pt-4 pb-8 overflow-y-auto overflow-x-hidden">

            {/* POS Header Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-orange-400 bg-clip-text text-transparent">
                        {storeType === 'SHOP' ? 'Order Command Center' : 'Kitchen Command Center'}
                    </h2>
                    {userProfile && (
                        <p className="text-slate-400 text-sm font-medium">
                            Welcome back, <span className="text-white font-bold tracking-wide">@{userProfile.username}</span>
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex bg-dark-900 border border-white/10 rounded-xl p-1">
                        <button
                            onClick={() => setActiveView('KITCHEN')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${activeView === 'KITCHEN' ? 'bg-primary-500 text-dark-950' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Utensils size={16} /> Kitchen
                        </button>
                        <button
                            onClick={() => setActiveView('REVIEWS')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${activeView === 'REVIEWS' ? 'bg-primary-500 text-dark-950' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Star size={16} /> Feedback
                        </button>
                        <button
                            onClick={() => setActiveView('PROFILE')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${activeView === 'PROFILE' ? 'bg-primary-500 text-dark-950' : 'text-slate-400 hover:text-white'}`}
                        >
                            <ChefHat size={16} /> Profile
                        </button>
                    </div>

                    {userRole !== 'CHEF' && (
                        <button
                            onClick={() => setShowPOSModal(true)}
                            className="bg-primary-500 hover:bg-primary-400 text-dark-950 font-bold px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-primary-500/20 active:scale-95 transition-all"
                        >
                            <ListOrdered size={20} />
                            Walk-In POS Order
                        </button>
                    )}
                </div>
            </div>

            {activeView === 'KITCHEN' && (
                <>
                    {/* Top Stat Bar */}
                    <div className="flex flex-col md:flex-row gap-4 mb-8">
                        <div className="glass-dark border border-white/10 rounded-2xl p-6 flex items-center justify-between flex-1">
                            <div>
                                <p className="text-slate-400 text-sm font-medium mb-1">Pending Verification</p>
                                <h3 className="text-3xl font-bold text-white">
                                    {awaitingPaymentOrders.length} Orders
                                </h3>
                            </div>
                            <div className="h-12 w-12 bg-indigo-400/10 rounded-full flex items-center justify-center border border-indigo-400/20">
                                <CreditCard className="text-indigo-400" size={24} />
                            </div>
                        </div>

                        <div className="glass-dark border border-white/10 rounded-2xl p-6 flex items-center justify-between flex-1">
                            <div>
                                <p className="text-slate-400 text-sm font-medium mb-1">Kitchen Backlog</p>
                                <h3 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                                    {queueSize} Items
                                </h3>
                            </div>
                            <div className="h-12 w-12 bg-red-400/10 rounded-full flex items-center justify-center border border-red-400/20">
                                <ListOrdered className="text-red-400" size={24} />
                            </div>
                        </div>

                        <div className="glass-dark border border-white/10 rounded-2xl p-6 flex items-center justify-between flex-1">
                            <div>
                                <p className="text-slate-400 text-sm font-medium mb-1">Ready for Service</p>
                                <h3 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                                    {readyOrders.length} Orders
                                </h3>
                            </div>
                            <div className="h-12 w-12 bg-green-400/10 rounded-full flex items-center justify-center border border-green-400/20">
                                <CheckCircle2 className="text-green-400" size={24} />
                            </div>
                        </div>
                    </div>

                    {/* Kanban Columns */}
                    <div className="flex flex-col xl:flex-row gap-6 flex-grow overflow-x-auto pb-4 custom-scrollbar">

                        {/* Column 0: Awaiting Payment (Hidden for Chefs) */}
                        {userRole !== 'CHEF' && (
                            <div className="glass-dark rounded-3xl p-6 border border-indigo-500/20 flex flex-col min-w-[300px] xl:min-w-[320px] flex-1 min-h-[400px] xl:min-h-[500px]">
                                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-indigo-500/10">
                                    <CreditCard className="text-indigo-400" />
                                    <h3 className="font-bold text-lg text-slate-200 tracking-wide">VERIFY PAYMENT</h3>
                                    <span className="ml-auto bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-xs font-bold border border-indigo-500/30">
                                        {awaitingPaymentOrders.length}
                                    </span>
                                </div>

                                <div className="overflow-y-auto pr-2 space-y-4 flex-grow">
                                    {loading ? <LoadingSkeleton /> : <AnimatePresence>{awaitingPaymentOrders.map(order => OrderCard(order, null, advanceOrderState))}</AnimatePresence>}
                                    {!loading && awaitingPaymentOrders.length === 0 && <EmptyState icon={<CreditCard size={48} />} text="No pending payments" />}
                                </div>
                            </div>
                        )}

                        {/* Column 1: Kitchen Queue (Hidden for Shops) */}
                        {storeType !== 'SHOP' && (
                            <div className="glass-dark rounded-3xl p-6 border border-white/5 flex flex-col min-w-[300px] xl:min-w-[320px] flex-1 min-h-[400px] xl:min-h-[500px]">
                                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/5">
                                    <ListOrdered className="text-slate-400" />
                                    <h3 className="font-bold text-lg text-slate-200 tracking-wide">KITCHEN QUEUE</h3>
                                    <span className="ml-auto bg-dark-800 text-slate-400 px-3 py-1 rounded-full text-xs font-bold border border-white/5">
                                        {queuedOrders.length}
                                    </span>
                                </div>

                                <div className="overflow-y-auto pr-2 space-y-4 flex-grow">
                                    {loading ? <LoadingSkeleton /> : <AnimatePresence>{queuedOrders.map(order => OrderCard(order, null, advanceOrderState))}</AnimatePresence>}
                                    {!loading && queuedOrders.length === 0 && <EmptyState icon={<ListOrdered size={48} />} text="Queue is empty" />}
                                </div>
                            </div>
                        )}

                        {/* Column 2: Preparing (Restaurant Only) */}
                        {storeType !== 'SHOP' && (
                            <div className="bg-gradient-to-b from-dark-900/80 to-dark-800/40 backdrop-blur-xl rounded-3xl p-6 border border-primary-500/20 shadow-2xl flex flex-col min-w-[300px] xl:min-w-[350px] flex-1 min-h-[400px] xl:min-h-[500px] relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none"></div>

                                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-primary-500/10 z-10">
                                    <ChefHat className="text-primary-500 animate-pulse" />
                                    <h3 className="font-bold text-lg text-white tracking-wide">PREPARING</h3>
                                    <span className="ml-auto bg-primary-500/20 text-primary-400 px-3 py-1 rounded-full text-xs font-bold border border-primary-500/30">
                                        {preparingOrders.length}
                                    </span>
                                </div>

                                <div className="overflow-y-auto pr-2 space-y-4 flex-grow z-10">
                                    {loading ? <LoadingSkeleton /> : (
                                        <AnimatePresence>
                                            {preparingOrders.map(order => OrderCard(order, markItemReady, advanceOrderState))}
                                        </AnimatePresence>
                                    )}
                                    {!loading && preparingOrders.length === 0 && <EmptyState active icon={<Utensils size={48} />} text="Kitchen is waiting" />}
                                </div>
                            </div>
                        )}

                        {/* Column 3: Ready to Serve / Collect */}
                        <div className="glass-dark rounded-3xl p-6 border border-green-500/20 flex flex-col min-w-[300px] xl:min-w-[320px] flex-1 min-h-[400px] xl:min-h-[500px]">
                            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-green-500/10">
                                <CheckCircle2 className="text-green-500" />
                                <h3 className="font-bold text-lg text-white tracking-wide">
                                    {storeType === 'SHOP' ? 'READY TO COLLECT' : 'READY TO SERVE'}
                                </h3>
                                <span className="ml-auto bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-500/30">
                                    {readyOrders.length}
                                </span>
                            </div>

                            <div className="overflow-y-auto pr-2 space-y-4 flex-grow">
                                {loading ? <LoadingSkeleton /> : <AnimatePresence>{readyOrders.map(order => OrderCard(order, null, advanceOrderState))}</AnimatePresence>}
                                {!loading && readyOrders.length === 0 && <EmptyState icon={<CheckCircle2 size={48} />} text="No orders awaiting service" />}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeView === 'REVIEWS' && (
                <div className="glass-dark border border-white/5 rounded-3xl p-6">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2"><MessageSquare className="text-primary-400" /> Customer Feedback</h2>
                            <p className="text-slate-400 mt-1">Review ratings and comments left by your completed orders.</p>
                        </div>
                        <div className="flex items-center gap-4 glass-dark p-4 rounded-2xl border border-white/5">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-primary-400">
                                    {reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : '0.0'}
                                </div>
                                <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mt-1">Avg Rating</div>
                            </div>
                            <div className="w-px h-12 bg-white/10"></div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-white">{reviews.length}</div>
                                <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mt-1">Total Reviews</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {reviews.length === 0 ? (
                            <div className="col-span-full py-12">
                                <EmptyState icon={<Star size={48} />} text="No reviews yet" />
                            </div>
                        ) : (
                            reviews.map(r => (
                                <div key={r.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-primary-500/30 transition-colors flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-white flex items-center flex-wrap gap-2">
                                                Order #{r.order ? r.order : r.id}
                                                <span className="text-slate-400 font-normal text-xs bg-dark-900 border border-white/5 py-0.5 px-2 rounded-full">
                                                    by {r.customer_username || 'Anonymous'}
                                                </span>
                                            </span>
                                            <div className="flex gap-1 mt-1">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} size={14} className={i < r.rating ? 'text-primary-500 fill-current' : 'text-slate-600'} />
                                                ))}
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-slate-500 bg-white/5 px-2 py-1 rounded-md shrink-0 ml-2">
                                            {new Date(r.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-300 italic flex-grow">"{r.comment || 'No comment provided.'}"</p>

                                    {(r.items_reviewed?.length > 0 || r.customer_phone || r.delivery_location || r.fulfillment_mode) && (
                                        <div className="mt-3 pt-3 border-t border-white/10 text-xs text-slate-400 space-y-1.5">
                                            {r.items_reviewed && r.items_reviewed.length > 0 && (
                                                <div className="flex gap-2">
                                                    <span className="font-bold text-slate-500 shrink-0">Ordered:</span>
                                                    <span>{r.items_reviewed.join(', ')}</span>
                                                </div>
                                            )}
                                            {r.fulfillment_mode && (
                                                <div className="flex gap-2">
                                                    <span className="font-bold text-slate-500 shrink-0">Type:</span>
                                                    <span>{r.fulfillment_mode}</span>
                                                </div>
                                            )}
                                            {r.customer_phone && (
                                                <div className="flex gap-2">
                                                    <span className="font-bold text-slate-500 shrink-0">Phone:</span>
                                                    <span>{r.customer_phone}</span>
                                                </div>
                                            )}
                                            {r.delivery_location && (
                                                <div className="flex gap-2">
                                                    <span className="font-bold text-slate-500 shrink-0">Location:</span>
                                                    <span className="line-clamp-2" title={r.delivery_location}>{r.delivery_location}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {activeView === 'PROFILE' && storeDetails && (
                <div className="glass-dark border border-white/5 rounded-3xl p-6 lg:p-10 max-w-4xl mx-auto w-full">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><ChefHat className="text-primary-400" /> Store Profile</h2>
                        <p className="text-slate-400 mt-1">Manage exactly how your store appears to customers on the Discover and Menu pages.</p>
                    </div>

                    <form onSubmit={handleProfileSave} className="space-y-6">
                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex-1 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-400 mb-2">Store Name</label>
                                    <input
                                        type="text"
                                        value={storeDetails.name || ''}
                                        onChange={(e) => setStoreDetails({ ...storeDetails, name: e.target.value })}
                                        className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                                        placeholder="e.g. Burger Palace"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-400 mb-2">Location / Area</label>
                                    <input
                                        type="text"
                                        value={storeDetails.location || ''}
                                        onChange={(e) => setStoreDetails({ ...storeDetails, location: e.target.value })}
                                        className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                                        placeholder="e.g. Downtown 5th Avenue"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="w-full md:w-1/3 flex flex-col items-center justify-start gap-3">
                                <label className="block text-sm font-bold text-slate-400 self-start">Store Banner Cover</label>
                                <div className="w-full aspect-video rounded-xl bg-dark-900 border-2 border-dashed border-white/10 overflow-hidden flex items-center justify-center relative group">
                                    {storeDetails.image_url ? (
                                        <img src={storeDetails.image_url} alt="Store Cover" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-slate-500 flex flex-col items-center gap-2">
                                            <ChefHat size={32} />
                                            <span className="text-xs font-bold uppercase tracking-wider">No Avatar</span>
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="url"
                                    value={storeDetails.image_url || ''}
                                    onChange={(e) => setStoreDetails({ ...storeDetails, image_url: e.target.value })}
                                    className="w-full bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary-500 outline-none transition-all"
                                    placeholder="Paste Image URL"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">Store Description / Bio</label>
                            <textarea
                                value={storeDetails.description || ''}
                                onChange={(e) => setStoreDetails({ ...storeDetails, description: e.target.value })}
                                rows="3"
                                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all resize-none"
                                placeholder="Tell customers about your specialties..."
                            />
                        </div>

                        <div className="pt-4 border-t border-white/5 flex justify-end">
                            <button
                                type="submit"
                                disabled={isSavingProfile}
                                className="bg-primary-500 hover:bg-primary-400 disabled:opacity-50 text-dark-950 font-bold px-8 py-3 rounded-xl transition-all shadow-lg shadow-primary-500/20 active:scale-95"
                            >
                                {isSavingProfile ? 'Saving...' : 'Save Profile Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Manual POS Modal Overlay */}
            {showPOSModal && (
                <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-dark-900 border border-white/10 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-dark-950/50">
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                <SquareTerminal className="text-primary-500" /> Walk-In POS Order
                            </h2>
                            <button onClick={() => setShowPOSModal(false)} className="text-slate-400 hover:text-white p-2">✕</button>
                        </div>

                        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                            {/* Product List */}
                            <div className="flex-1 border-r border-white/10 flex flex-col bg-dark-950/30">
                                <div className="p-4 border-b border-white/5 font-semibold text-slate-300">Tap to Add Items</div>
                                <div className="p-4 overflow-y-auto grid grid-cols-2 lg:grid-cols-3 gap-3">
                                    {posProducts.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => {
                                                const existing = posCart.find(item => item.product.id === p.id);
                                                if (existing) {
                                                    setPosCart(posCart.map(i => i.product.id === p.id ? { ...i, qty: i.qty + 1 } : i));
                                                } else {
                                                    setPosCart([...posCart, { product: p, qty: 1 }]);
                                                }
                                            }}
                                            className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl p-3 text-left transition-colors flex flex-col gap-1 active:scale-95"
                                        >
                                            <span className="font-bold text-sm text-slate-200 line-clamp-1">{p.name}</span>
                                            <span className="text-xs text-primary-400 font-bold">{formatPrice(p.price)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Cart Sidebar */}
                            <div className="w-full md:w-80 flex flex-col bg-dark-900">
                                <div className="p-4 border-b border-white/10">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Customer Name (Optional)</label>
                                    <input
                                        type="text"
                                        value={posCustomerName}
                                        onChange={e => setPosCustomerName(e.target.value)}
                                        placeholder="Walk-In Guest"
                                        className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 mb-4"
                                    />

                                    {storeType !== 'SHOP' && (
                                        <label className="flex items-center gap-2 cursor-pointer group mb-2">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={posSkipKitchen}
                                                    onChange={(e) => setPosSkipKitchen(e.target.checked)}
                                                    className="peer sr-only"
                                                />
                                                <div className="w-10 h-6 bg-dark-800 rounded-full border border-white/10 peer-checked:bg-primary-500 transition-colors"></div>
                                                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
                                            </div>
                                            <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">Skip Kitchen (Instant Ready)</span>
                                        </label>
                                    )}
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {posCart.map(item => (
                                        <div key={item.product.id} className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5">
                                            <div className="truncate pr-2">
                                                <div className="font-medium text-sm truncate w-32">{item.product.name}</div>
                                                <div className="text-xs text-slate-400">{formatPrice(item.product.price)} x {item.qty}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        if (item.qty <= 1) setPosCart(posCart.filter(i => i.product.id !== item.product.id));
                                                        else setPosCart(posCart.map(i => i.product.id === item.product.id ? { ...i, qty: i.qty - 1 } : i));
                                                    }}
                                                    className="w-6 h-6 rounded bg-dark-800 text-white flex items-center justify-center hover:bg-red-500/20 hover:text-red-400"
                                                >-</button>
                                                <span className="text-sm font-bold w-4 text-center">{item.qty}</span>
                                                <button
                                                    onClick={() => setPosCart(posCart.map(i => i.product.id === item.product.id ? { ...i, qty: i.qty + 1 } : i))}
                                                    className="w-6 h-6 rounded bg-dark-800 text-white flex items-center justify-center hover:bg-green-500/20 hover:text-green-400"
                                                >+</button>
                                            </div>
                                        </div>
                                    ))}
                                    {posCart.length === 0 && <div className="text-center text-slate-500 text-sm mt-10">Cart is empty</div>}
                                </div>

                                <div className="p-4 border-t border-white/10 bg-dark-950/50">
                                    <div className="flex justify-between font-bold mb-4">
                                        <span>Total</span>
                                        <span className="text-primary-400">
                                            {formatPrice(posCart.reduce((sum, item) => sum + (parseFloat(item.product.price) * item.qty), 0))}
                                        </span>
                                    </div>
                                    <button
                                        disabled={posCart.length === 0}
                                        onClick={() => {
                                            const total = posCart.reduce((sum, item) => sum + (parseFloat(item.product.price) * item.qty), 0);
                                            const payload = {
                                                store_id: 1, // Assumption: Local POS attached to Store 1
                                                fulfillment_mode: 'TAKEAWAY',
                                                state: posSkipKitchen ? 'READY' : 'PAID',
                                                total_amount: total.toFixed(2),
                                                customer_name: posCustomerName || 'Walk-In Guest',
                                                items: posCart.map(i => ({ product_id: i.product.id, quantity: i.qty, price_at_time: i.product.price }))
                                            };

                                            const toastId = toast.loading('Dispatching ticket...');
                                            apiClient.post('/orders/', payload)
                                                .then(() => {
                                                    toast.success(posSkipKitchen ? 'Order Completed instantly!' : 'Order fired to kitchen!', { id: toastId });
                                                    setPosCart([]);
                                                    setPosCustomerName('');
                                                    setPosSkipKitchen(false);
                                                    setShowPOSModal(false);
                                                    fetchDashboard();
                                                })
                                                .catch(err => toast.error('Failed to create order', { id: toastId }));
                                        }}
                                        className={`w-full py-3 text-dark-900 font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${posSkipKitchen ? 'bg-green-500 hover:bg-green-400' : 'bg-primary-500 hover:bg-primary-400'}`}
                                    >
                                        {posSkipKitchen ? 'Complete Instantly (Paid)' : 'Fire to Kitchen (Paid)'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Subcomponents

const OrderCard = (order, markItemReadyFn = null, advanceOrderStateFn = null) => {

    const isAwaitingPayment = order.state === 'AWAITING_PAYMENT';
    const isQueued = order.state === 'QUEUED' || order.state === 'PAID';
    const isPreparing = order.state === 'PREPARING';
    const isReadyColumn = order.state === 'READY';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            key={order.id}
            className={`bg-dark-950/80 rounded-2xl p-5 border shadow-lg 
                ${isReadyColumn ? 'border-green-500/30 shadow-green-500/10' :
                    isPreparing ? 'border-primary-500/30 shadow-primary-500/10' :
                        isAwaitingPayment ? 'border-indigo-500/30 shadow-indigo-500/10' : 'border-white/5'
                }`}
        >
            <div className="flex justify-between items-start mb-4">
                <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Order</span>
                    <h4 className="text-2xl font-black text-white leading-none">#{order.id}</h4>
                    <span className="text-xs text-primary-400 font-bold block mt-1">{formatPriceStatic(order.total_amount)}</span>
                    <span className="text-xs text-slate-400 block mt-1">
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-xs text-indigo-300 font-medium block mt-1">
                        {order.customer_name ? `By ${order.customer_name}` : 'Guest Order'}
                    </span>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${order.fulfillment_mode === 'DINE_IN' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                        'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                        }`}>
                        {order.fulfillment_mode === 'DINE_IN' ? '🍽️ Dine In' : '🥡 Takeaway'}
                    </span>

                    {order.table_number && (
                        <span className="bg-slate-800 text-white px-3 py-1 rounded-lg text-xs font-bold border border-slate-700 flex items-center gap-1">
                            Table {order.table_number}
                        </span>
                    )}

                    {order.fulfillment_mode === 'DELIVERY' && (
                        <div className="mt-2 text-right bg-dark-900 border border-white/5 p-2 rounded-lg">
                            <span className="text-xs text-slate-400 block mb-1">📞 {order.customer_phone || 'No phone'}</span>
                            <span className="text-xs text-slate-300 block break-words max-w-[200px]">📍 {order.delivery_location || 'No location provided'}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-3 mt-4">
                {order.items?.map((item, idx) => (
                    <div key={item.id || idx} className="flex justify-between items-center bg-dark-800/50 rounded-xl p-3 border border-white/5">
                        <div className="flex items-center gap-3">
                            <span className="bg-dark-900 border border-white/10 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm">
                                {item.quantity}
                            </span>
                            <span className={`text-sm font-medium pr-2 ${item.is_ready ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                                {item.product.name ? item.product.name : 'Unknown Item'}
                            </span>
                        </div>

                        {item.is_ready ? (
                            <span className="flex items-center gap-1 text-green-500 text-xs font-bold bg-green-500/10 px-2 py-1 rounded shrink-0">
                                <CheckCircle2 size={14} /> Ready
                            </span>
                        ) : (
                            markItemReadyFn && isPreparing && (
                                <button
                                    onClick={() => markItemReadyFn(order.id, item.id)}
                                    className="bg-primary-500 hover:bg-primary-400 text-dark-900 text-xs font-bold px-3 py-2 rounded-lg transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-primary-500/20 shrink-0"
                                >
                                    Finish
                                </button>
                            )
                        )}
                    </div>
                ))}
            </div>

            {isAwaitingPayment && (order.payment_message || order.payment_receipt) && (
                <div className="mt-4 bg-dark-900 border border-indigo-500/20 rounded-xl p-3 text-sm text-slate-300">
                    <p className="text-xs font-bold text-indigo-400 mb-1 uppercase tracking-wider">Proof of Payment</p>
                    {order.payment_message && <p className="mb-2 italic">"{order.payment_message}"</p>}
                    {order.payment_receipt && (
                        <a href={order.payment_receipt} target="_blank" rel="noreferrer" className="block mt-2 rounded-lg overflow-hidden border border-white/10 hover:border-indigo-500/50 transition-colors cursor-zoom-in">
                            <img src={order.payment_receipt} alt="Payment Receipt" className="w-full max-h-32 object-cover" />
                        </a>
                    )}
                </div>
            )}

            {isAwaitingPayment && (
                <button
                    onClick={() => advanceOrderStateFn(order.id, 'PAID')}
                    className="w-full mt-5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                >
                    <CheckCircle2 size={18} /> Verify Payment
                </button>
            )}

            {isQueued && advanceOrderStateFn && (
                <button
                    onClick={() => advanceOrderStateFn(order.id, 'PREPARING')}
                    className="w-full mt-5 bg-dark-800 hover:bg-dark-700 border border-white/10 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                    <Play size={18} className="text-primary-500" /> Start PREPARING
                </button>
            )}

            {isPreparing && advanceOrderStateFn && (
                <button
                    onClick={() => advanceOrderStateFn(order.id, 'READY')}
                    className="w-full mt-5 bg-primary-500 hover:bg-primary-400 text-dark-900 font-bold py-3 rounded-xl transition-all shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2"
                >
                    <CheckCircle2 size={18} /> Mark All Ready
                </button>
            )}

            {isReadyColumn && (
                <button
                    onClick={() => advanceOrderStateFn(order.id, 'COMPLETED')}
                    className="w-full mt-5 bg-green-500 hover:bg-green-400 text-dark-900 font-bold py-3 rounded-xl transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
                >
                    <CheckCircle2 size={20} /> Complete Order
                </button>
            )}
        </motion.div>
    );
}

const LoadingSkeleton = () => (
    <>
        {[1, 2, 3].map(i => (
            <div key={i} className="bg-dark-950/50 rounded-2xl p-5 border border-white/5 animate-pulse h-40"></div>
        ))}
    </>
);

const EmptyState = ({ icon, text, active = false }) => (
    <div className={`flex flex-col items-center justify-center h-full text-center ${active ? 'text-primary-500/50' : 'text-slate-600'}`}>
        <div className="mb-4 opacity-50">{icon}</div>
        <p className="font-medium">{text}</p>
    </div>
);
