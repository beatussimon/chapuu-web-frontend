import { useState, useEffect, useCallback } from 'react';
import apiClient, { getWebSocketURL } from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, CheckCircle2, Clock, ListOrdered, Utensils, CreditCard, Play, SquareTerminal, Star, MessageSquare, Truck, Bell, QrCode, Calendar, Store, Plus, Edit2, Trash2, X, ShoppingBag, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '../store/useStore';
import { useCurrency, formatPriceStatic } from '../utils/useCurrency';
import { QRCodeSVG } from 'qrcode.react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

export default function SellerDashboard() {
    const [orders, setOrders] = useState([]);
    const [queueSize, setQueueSize] = useState(0);
    const [loading, setLoading] = useState(true);
    const [storeType, setStoreType] = useState('RESTAURANT'); // 'RESTAURANT' or 'SHOP'
    const { userRole, clearAuth } = useAppStore();
    const { formatPrice } = useCurrency();

    // Determine default view based on role
    const defaultView = userRole === 'CHEF' ? 'KITCHEN' : 
                        userRole === 'DELIVERY' ? 'DELIVERY' : 
                        userRole === 'ACCOUNTANT' ? 'ACCOUNTING' : 'KITCHEN';

    const [activeView, setActiveView] = useState(defaultView); 
    const [reviews, setReviews] = useState([]);
    const [notices, setNotices] = useState([]);
    const [wsConnected, setWsConnected] = useState(false);

    // Profile State
    const [storeDetails, setStoreDetails] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // Modals
    const [showPOSModal, setShowPOSModal] = useState(false);
    const [posProducts, setPosProducts] = useState([]);
    const [posCart, setPosCart] = useState([]);
    const [posCustomerName, setPosCustomerName] = useState('');
    const [posSkipKitchen, setPosSkipKitchen] = useState(false);

    const [verifyModal, setVerifyModal] = useState({ open: false, order: null, fee: '' });
    const [editingPaymentMethod, setEditingPaymentMethod] = useState(null);

    const addToPosCart = (product) => {
        setPosCart(prev => {
            const existing = prev.find(i => i.id === product.id);
            if (existing) {
                return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const updatePosQty = (productId, delta) => {
        setPosCart(prev => prev.map(i => {
            if (i.id === productId) {
                const newQty = Math.max(1, i.quantity + delta);
                return { ...i, quantity: newQty };
            }
            return i;
        }));
    };

    const handlePOSCheckout = () => {
        if (posCart.length === 0) {
            toast.error("POS cart is empty!");
            return;
        }
        
        const toastId = toast.loading('Processing walk-in order...');
        const payload = {
            store: storeDetails.id,
            fulfillment_mode: 'TAKEAWAY',
            payment_message: `POS Order: ${posCustomerName || 'Walk-in Customer'}`,
            items: posCart.map(i => ({ product: i.id, quantity: i.quantity, unit_price: i.price }))
        };

        apiClient.post('/orders/', payload)
            .then(res => {
                const orderId = res.data.id;
                // Move to PAID immediately
                return apiClient.post(`/orders/${orderId}/advance_state/`, { state: 'PAID' })
                    .then(() => {
                        if (posSkipKitchen) {
                            return apiClient.post(`/orders/${orderId}/advance_state/`, { state: 'PREPARING' })
                                .then(() => apiClient.post(`/orders/${orderId}/advance_state/`, { state: 'READY' }));
                        }
                    });
            })
            .then(() => {
                toast.success('POS Order created successfully!', { id: toastId });
                setShowPOSModal(false);
                setPosCart([]);
                setPosCustomerName('');
                setPosSkipKitchen(false);
                fetchDashboard();
            })
            .catch(err => {
                console.error(err);
                toast.error("POS Failed: " + (err.response?.data?.detail || "Check console"), { id: toastId });
            });
    };

    const fetchDashboard = useCallback(() => {
        apiClient.get('/auth/users/me/')
            .then(res => setUserProfile(res.data))
            .catch(e => console.error("Profile sync error"));

        apiClient.get('/orders/')
            .then(res => {
                setOrders(res.data);
            })
            .catch(err => {
                toast.error("Error syncing live dashboard");
            })
            .finally(() => setLoading(false));

        apiClient.get('/stores/my_store/')
            .then(res => {
                if (res.data && res.data.id) {
                    const store = res.data;
                    setStoreDetails(store);
                    setStoreType(store.store_type || 'RESTAURANT');
                    if (['SELLER', 'ADMIN', 'CHEF'].includes(userRole)) {
                        apiClient.get(`/stores/${store.id}/kitchen_queue/`)
                            .then(r => setQueueSize(r.data.queue_size))
                            .catch(e => console.error("Queue sync error:", e));
                    }
                    if (['SELLER', 'ADMIN'].includes(userRole)) {
                        apiClient.get(`/stores/${store.id}/reviews/`)
                            .then(r => setReviews(r.data))
                            .catch(e => console.error("Review sync error:", e));
                    }
                }
            })
            .catch(e => {
                console.error("Store sync error:", e);
                // Even if store fetch fails, we should stop loading
                setLoading(false);
            });

        if (['SELLER', 'ADMIN'].includes(userRole)) {
            apiClient.get('/products/')
                .then(res => setPosProducts(res.data))
                .catch(e => console.error("Products sync error:", e));
        }

        apiClient.get('/notices/')
            .then(res => setNotices(res.data))
            .catch(e => console.log("Notices sync failed"));
    }, [userRole, storeDetails?.id]); // Dependencies for stability

    const markItemReady = (orderId, itemId) => {
        const toastId = toast.loading('Marking item ready...');
        apiClient.post(`/orders/${orderId}/items/${itemId}/ready/`)
            .then(() => {
                toast.success('Kitchen item completed!', { id: toastId });
                fetchDashboard();
            })
            .catch(err => toast.error("Error updating item: " + err.message, { id: toastId }));
    }

    const advanceOrderState = (orderId, newState, extraData = {}) => {
        const toastId = toast.loading('Updating order...');
        apiClient.post(`/orders/${orderId}/advance_state/`, { state: newState, ...extraData })
            .then(() => {
                toast.success('Order advanced!', { id: toastId });
                setVerifyModal({ open: false, order: null, fee: '' });
                fetchDashboard();
            })
            .catch(err => toast.error("Error updating order: " + (err.response?.data?.error || err.message), { id: toastId }));
    }

    useEffect(() => {
        fetchDashboard();
        const interval = setInterval(fetchDashboard, 30000);
        
        let socket = null;
        let reconnectTimeout = null;

        const connectWebSocket = () => {
            let wsPath = '/ws/orders/';
            if (storeDetails?.id) {
                wsPath += `${storeDetails.id}/`;
            }
            
            const wsUrl = getWebSocketURL(wsPath);
            console.log("[WS] Connecting to:", wsUrl);
            socket = new WebSocket(wsUrl);

            socket.onopen = () => {
                console.log("[WS] Connected");
                setWsConnected(true);
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'order_update') {
                        console.log("[WS] Realtime update:", data.message);
                        fetchDashboard();
                    }
                } catch (e) { console.error("[WS] Parse error", e); }
            };

            socket.onclose = (e) => {
                console.log("[WS] Socket closed. Reconnecting in 5s...", e.reason);
                setWsConnected(false);
                reconnectTimeout = setTimeout(connectWebSocket, 5000);
            };

            socket.onerror = (err) => {
                console.error("[WS] Socket error", err);
                setWsConnected(false);
                socket.close();
            };
        };

        connectWebSocket();

        return () => {
            clearInterval(interval);
            if (socket) socket.close();
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
        };
    }, [storeDetails?.id, userRole]);

    const activeOrders = orders.filter(o => o.state !== 'COMPLETED' && o.state !== 'CANCELLED' && o.state !== 'CREATED' && o.state !== 'REFUNDED');
    const awaitingPaymentOrders = activeOrders.filter(o => o.state === 'AWAITING_PAYMENT');
    const queuedOrders = activeOrders.filter(o => (o.state === 'QUEUED' || o.state === 'PAID') && o.fulfillment_mode !== 'RESERVATION');
    const reservationOrders = activeOrders.filter(o => (o.state === 'QUEUED' || o.state === 'PAID') && o.fulfillment_mode === 'RESERVATION');
    const preparingOrders = activeOrders.filter(o => o.state === 'PREPARING');
    const readyOrders = activeOrders.filter(o => o.state === 'READY');
    const outForDeliveryOrders = activeOrders.filter(o => o.state === 'OUT_FOR_DELIVERY');

    // Filter READY orders for specific views
    const readyForKitchen = readyOrders.filter(o => o.fulfillment_mode !== 'DELIVERY');
    const readyForDelivery = readyOrders.filter(o => o.fulfillment_mode === 'DELIVERY');

    const canSeeKitchen = ['SELLER', 'ADMIN', 'CHEF'].includes(userRole);
    const canSeeAccounting = ['SELLER', 'ADMIN', 'ACCOUNTANT'].includes(userRole);
    const canSeeDelivery = ['SELLER', 'ADMIN', 'DELIVERY'].includes(userRole);
    const canSeeAdminStuff = ['SELLER', 'ADMIN'].includes(userRole);

    const storeUrl = typeof window !== 'undefined' ? `${window.location.origin}/?store=${storeDetails?.id}` : '';

    const handleSavePaymentMethod = (e) => {
        e.preventDefault();
        const toastId = toast.loading('Saving payment method...');
        const formData = new FormData(e.target);
        formData.append('store', storeDetails.id);
        
        const req = editingPaymentMethod.id 
            ? apiClient.patch(`/payment-methods/${editingPaymentMethod.id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' }})
            : apiClient.post('/payment-methods/', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
            
        req.then(() => {
            toast.success('Payment method saved!', { id: toastId });
            setEditingPaymentMethod(null);
            fetchDashboard();
        }).catch(err => toast.error('Failed to save payment method', { id: toastId }));
    };

    const handleDeletePaymentMethod = (id) => {
        if (!window.confirm('Delete this payment method?')) return;
        const toastId = toast.loading('Deleting...');
        apiClient.delete(`/payment-methods/${id}/`)
            .then(() => {
                toast.success('Deleted', { id: toastId });
                fetchDashboard();
            })
            .catch(err => toast.error('Failed to delete', { id: toastId }));
    };

    return (
        <div className="w-full min-h-screen flex flex-col pt-2 pb-8 px-2 md:px-4 overflow-y-auto">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div className="flex flex-col gap-1">
                    <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary-400 to-yellow-300 bg-clip-text text-transparent drop-shadow-sm">
                        {userRole === 'ACCOUNTANT' ? 'Accounting Center' : 
                         userRole === 'DELIVERY' ? 'Driver Dispatch' :
                         userRole === 'CHEF' ? 'Kitchen Command' : 'Command Center'}
                    </h2>
                    {userProfile && (
                        <div className="flex items-center gap-3 mt-1">
                            <p className="text-slate-400 text-xs md:text-sm font-medium">
                                {userProfile.role} | <span className="text-white font-bold">@{userProfile.username}</span>
                            </p>
                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${wsConnected ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                <span className="text-[10px] font-black uppercase tracking-tighter">{wsConnected ? 'Live' : 'Offline'}</span>
                            </div>
                        </div>
                    )}
                    {storeDetails && (
                        <div className="flex items-center gap-2 mt-1">
                            <Store size={12} className="text-primary-400" />
                            <span className="text-primary-400 text-xs font-black uppercase tracking-widest">
                                {storeDetails.name}
                            </span>
                            <span className="text-slate-600 text-[10px]">·</span>
                            <span className="text-slate-500 text-[10px] uppercase font-bold">{storeDetails.store_type}</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                    <div className="flex bg-dark-900 border border-white/10 rounded-xl p-1 overflow-x-auto scrollbar-none no-scrollbar">
                        {canSeeKitchen && (
                            <button onClick={() => setActiveView('KITCHEN')} className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 whitespace-nowrap ${activeView === 'KITCHEN' ? 'bg-primary-500 text-dark-950' : 'text-slate-400 hover:text-white'}`}>
                                <Utensils size={14} /> Kitchen
                            </button>
                        )}
                        {canSeeAccounting && (
                            <button onClick={() => setActiveView('ACCOUNTING')} className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 whitespace-nowrap ${activeView === 'ACCOUNTING' ? 'bg-primary-500 text-dark-950' : 'text-slate-400 hover:text-white'}`}>
                                <CreditCard size={14} /> Accountant
                            </button>
                        )}
                        {canSeeDelivery && (
                            <button onClick={() => setActiveView('DELIVERY')} className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 whitespace-nowrap ${activeView === 'DELIVERY' ? 'bg-primary-500 text-dark-950' : 'text-slate-400 hover:text-white'}`}>
                                <Truck size={14} /> Delivery
                            </button>
                        )}
                        <button onClick={() => setActiveView('NOTICES')} className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 whitespace-nowrap ${activeView === 'NOTICES' ? 'bg-primary-500 text-dark-950' : 'text-slate-400 hover:text-white'}`}>
                            <Bell size={14} /> Notices {notices.length > 0 && <span className="bg-red-500 text-white rounded-full px-1.5 text-[10px]">{notices.length}</span>}
                        </button>
                        {canSeeAdminStuff && (
                            <button onClick={() => setActiveView('SETTINGS')} className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 whitespace-nowrap ${activeView === 'SETTINGS' ? 'bg-primary-500 text-dark-950' : 'text-slate-400 hover:text-white'}`}>
                                <Store size={14} /> Settings
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2">
                        {canSeeAdminStuff && (
                            <button onClick={() => setShowPOSModal(true)} className="flex-1 sm:flex-none bg-primary-500 hover:bg-primary-400 text-dark-950 font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-sm">
                                <ListOrdered size={18} /> POS
                            </button>
                        )}
                        <button onClick={() => fetchDashboard()} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-slate-400">
                            <Clock size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {activeView === 'KITCHEN' && canSeeKitchen && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 flex-grow">
                    <div className="glass-dark rounded-2xl md:rounded-3xl p-4 md:p-6 border border-primary-500/20 flex flex-col h-[500px] xl:h-auto">
                        <div className="flex items-center gap-2 mb-4 md:mb-6 pb-3 border-b border-primary-500/10">
                            <Calendar className="text-primary-400" size={18} />
                            <h3 className="font-bold text-base md:text-lg text-slate-200 uppercase tracking-wider">Reservations</h3>
                            <span className="ml-auto bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded-full text-[10px] font-bold border border-primary-500/30">{reservationOrders.length}</span>
                        </div>
                        <div className="overflow-y-auto pr-1 space-y-3 flex-grow custom-scrollbar">
                            {loading ? <LoadingSkeleton /> : <AnimatePresence>{reservationOrders.map(order => <OrderCard key={order.id} order={order} advanceOrderStateFn={advanceOrderState} userRole={userRole} />)}</AnimatePresence>}
                            {!loading && reservationOrders.length === 0 && <EmptyState icon={<Calendar size={40} />} text="No reserved orders" />}
                        </div>
                    </div>

                    {storeType !== 'SHOP' && (
                        <div className="glass-dark rounded-2xl md:rounded-3xl p-4 md:p-6 border border-white/5 flex flex-col h-[500px] xl:h-auto">
                            <div className="flex items-center gap-2 mb-4 md:mb-6 pb-3 border-b border-white/5">
                                <ListOrdered className="text-slate-400" size={18} />
                                <h3 className="font-bold text-base md:text-lg text-slate-200 uppercase tracking-wider">Kitchen Queue</h3>
                                <span className="ml-auto bg-dark-800 text-slate-400 px-2 py-0.5 rounded-full text-[10px] font-bold border border-white/5">{queuedOrders.length}</span>
                            </div>
                            <div className="overflow-y-auto pr-1 space-y-3 flex-grow custom-scrollbar">
                                {loading ? <LoadingSkeleton /> : <AnimatePresence>{queuedOrders.map(order => <OrderCard key={order.id} order={order} advanceOrderStateFn={advanceOrderState} userRole={userRole} />)}</AnimatePresence>}
                                {!loading && queuedOrders.length === 0 && <EmptyState icon={<ListOrdered size={40} />} text="Queue is empty" />}
                            </div>
                        </div>
                    )}
                    <div className="bg-gradient-to-b from-dark-900/80 to-dark-800/40 backdrop-blur-xl rounded-2xl md:rounded-3xl p-4 md:p-6 border border-primary-500/20 shadow-2xl flex flex-col h-[500px] xl:h-auto relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-4 md:mb-6 pb-3 border-b border-primary-500/10 z-10">
                            <ChefHat className="text-primary-500 animate-pulse" size={18} />
                            <h3 className="font-bold text-base md:text-lg text-white uppercase tracking-wider">Preparing</h3>
                            <span className="ml-auto bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded-full text-[10px] font-bold border border-primary-500/30">{preparingOrders.length}</span>
                        </div>
                        <div className="overflow-y-auto pr-1 space-y-3 flex-grow z-10 custom-scrollbar">
                            {loading ? <LoadingSkeleton /> : <AnimatePresence>{preparingOrders.map(order => <OrderCard key={order.id} order={order} markItemReadyFn={markItemReady} advanceOrderStateFn={advanceOrderState} userRole={userRole} />)}</AnimatePresence>}
                            {!loading && preparingOrders.length === 0 && <EmptyState active icon={<Utensils size={40} />} text="Kitchen is waiting" />}
                        </div>
                    </div>
                    {/* DISPATCH COLUMN for non-delivery items */}
                    <div className="glass-dark rounded-2xl md:rounded-3xl p-4 md:p-6 border border-white/5 flex flex-col h-[500px] xl:h-auto">
                        <div className="flex items-center gap-2 mb-4 md:mb-6 pb-3 border-b border-white/5">
                            <CheckCircle2 className="text-green-500" size={18} />
                            <h3 className="font-bold text-base md:text-lg text-white uppercase tracking-wider">Ready to Dispatch</h3>
                            <span className="ml-auto bg-dark-800 text-slate-400 px-2 py-0.5 rounded-full text-[10px] font-bold border border-white/5">{readyForKitchen.length}</span>
                        </div>
                        <div className="overflow-y-auto pr-1 space-y-3 flex-grow custom-scrollbar">
                            {loading ? <LoadingSkeleton /> : <AnimatePresence>{readyForKitchen.map(order => <OrderCard key={order.id} order={order} advanceOrderStateFn={advanceOrderState} userRole={userRole} />)}</AnimatePresence>}
                            {!loading && readyForKitchen.length === 0 && <EmptyState icon={<CheckCircle2 size={40} />} text="No items to dispatch" />}
                        </div>
                    </div>
                </div>
            )}

            {activeView === 'ACCOUNTING' && canSeeAccounting && (
                <div className="glass-dark rounded-3xl p-6 border border-indigo-500/20 flex flex-col min-h-[400px]">
                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-indigo-500/10">
                        <CreditCard className="text-indigo-400" />
                        <h3 className="font-bold text-lg text-slate-200 tracking-wide">VERIFY PAYMENT</h3>
                        <span className="ml-auto bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-xs font-bold border border-indigo-500/30">{awaitingPaymentOrders.length}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? <LoadingSkeleton /> : <AnimatePresence>{awaitingPaymentOrders.map(order => <OrderCard key={order.id} order={order} onVerifyPayment={() => setVerifyModal({ open: true, order, fee: '' })} userRole={userRole} />)}</AnimatePresence>}
                        {!loading && awaitingPaymentOrders.length === 0 && <div className="col-span-full"><EmptyState icon={<CreditCard size={48} />} text="No pending payments" /></div>}
                    </div>
                </div>
            )}

            {activeView === 'DELIVERY' && canSeeDelivery && (
                <div className="flex flex-col xl:flex-row gap-6 flex-grow overflow-x-auto pb-4 custom-scrollbar">
                    <div className="glass-dark rounded-3xl p-6 border border-green-500/20 flex flex-col min-w-[300px] xl:min-w-[320px] flex-1 min-h-[400px]">
                        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-green-500/10">
                            <CheckCircle2 className="text-green-500" />
                            <h3 className="font-bold text-lg text-white tracking-wide">READY FOR PICKUP/DELIVERY</h3>
                            <span className="ml-auto bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-indigo-500/30">{readyForDelivery.length}</span>
                        </div>
                        <div className="overflow-y-auto pr-2 space-y-4 flex-grow">
                            {loading ? <LoadingSkeleton /> : <AnimatePresence>{readyForDelivery.map(order => <OrderCard key={order.id} order={order} advanceOrderStateFn={advanceOrderState} userRole={userRole} />)}</AnimatePresence>}
                            {!loading && readyForDelivery.length === 0 && <EmptyState icon={<CheckCircle2 size={48} />} text="No orders awaiting dispatch" />}
                        </div>
                    </div>
                    <div className="glass-dark rounded-3xl p-6 border border-purple-500/20 flex flex-col min-w-[300px] xl:min-w-[320px] flex-1 min-h-[400px]">
                        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-purple-500/10">
                            <Truck className="text-purple-500" />
                            <h3 className="font-bold text-lg text-white tracking-wide">OUT FOR DELIVERY</h3>
                            <span className="ml-auto bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-xs font-bold border border-purple-500/30">{outForDeliveryOrders.length}</span>
                        </div>
                        <div className="overflow-y-auto pr-2 space-y-4 flex-grow">
                            {loading ? <LoadingSkeleton /> : <AnimatePresence>{outForDeliveryOrders.map(order => <OrderCard key={order.id} order={order} advanceOrderStateFn={advanceOrderState} userRole={userRole} />)}</AnimatePresence>}
                            {!loading && outForDeliveryOrders.length === 0 && <EmptyState icon={<Truck size={48} />} text="No active deliveries" />}
                        </div>
                    </div>
                </div>
            )}

            {activeView === 'SETTINGS' && storeDetails && canSeeAdminStuff && (
                <div className="glass-dark border border-white/5 rounded-3xl p-6 max-w-4xl mx-auto w-full">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6"><Store className="text-primary-400" /> Store Settings</h2>
                    
                    <div className="bg-dark-900 border border-white/10 rounded-2xl p-6 mb-6">
                        <h3 className="text-lg font-bold text-white mb-4">Store Profile</h3>
                        <p className="text-sm text-slate-400 mb-6">Update your store details, contact info, and picture.</p>
                        
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const toastId = toast.loading('Saving store profile...');
                            const formData = new FormData(e.target);
                            apiClient.patch(`/stores/${storeDetails.id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' }})
                                .then(() => {
                                    toast.success('Store profile updated!', { id: toastId });
                                    fetchDashboard();
                                })
                                .catch(err => toast.error('Failed to update profile', { id: toastId }));
                        }} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Store Name</label>
                                    <input type="text" name="name" defaultValue={storeDetails.name} required className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none text-white" />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Contact Phone</label>
                                    <input type="text" name="contact_phone" defaultValue={storeDetails.contact_phone || ''} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none text-white" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs text-slate-400 block mb-1">Location</label>
                                    <textarea name="location" defaultValue={storeDetails.location || ''} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none text-white h-20" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs text-slate-400 block mb-1">Store Picture</label>
                                    {storeDetails.image_url && (
                                        <div className="mb-2 w-32 h-32 rounded-xl overflow-hidden border border-white/10">
                                            <img src={storeDetails.image_url} alt="Store" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <input type="file" name="image" accept="image/*" className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-500/10 file:text-primary-500" />
                                </div>
                            </div>
                            <div className="flex justify-end mt-4">
                                <button type="submit" className="bg-primary-500 hover:bg-primary-400 text-dark-900 font-bold px-6 py-2 rounded-lg text-sm shadow-lg">Save Profile</button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-dark-900 border border-white/10 rounded-2xl p-6 mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Payment Methods</h3>
                            <button 
                                onClick={() => setEditingPaymentMethod({ provider: '', account_name: '', account_number: '', instructions: '', is_active: true })}
                                className="bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 p-2 rounded-lg transition-colors flex items-center gap-1 text-sm font-bold"
                            >
                                <Plus size={16} /> Add Method
                            </button>
                        </div>
                        <p className="text-sm text-slate-400 mb-6">Configure the offline payment methods your customers can use during checkout.</p>
                        
                        {editingPaymentMethod && (
                            <form onSubmit={handleSavePaymentMethod} className="mb-6 bg-dark-950 border border-primary-500/30 p-4 rounded-xl space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Provider (e.g., M-Pesa, Cash)</label>
                                        <input type="text" name="provider" defaultValue={editingPaymentMethod.provider} required className="w-full bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none text-white" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Account Name (Optional)</label>
                                        <input type="text" name="account_name" defaultValue={editingPaymentMethod.account_name} className="w-full bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none text-white" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Account Number (Optional)</label>
                                        <input type="text" name="account_number" defaultValue={editingPaymentMethod.account_number} className="w-full bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none text-white" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Provider Logo (Optional)</label>
                                        <input type="file" name="image" accept="image/*" className="w-full bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-500/10 file:text-primary-500" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs text-slate-400 block mb-1">Instructions</label>
                                        <textarea name="instructions" defaultValue={editingPaymentMethod.instructions} className="w-full bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none text-white h-16" placeholder="e.g. Pay to Till Number 123456" />
                                    </div>
                                    <div className="md:col-span-2 flex items-center gap-2">
                                        <input type="checkbox" name="is_active" id="pm_is_active" defaultChecked={editingPaymentMethod.is_active} value="true" className="accent-primary-500 w-4 h-4 rounded" />
                                        <label htmlFor="pm_is_active" className="text-sm font-medium text-white cursor-pointer">Actively Available</label>
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end pt-2">
                                    <button type="button" onClick={() => setEditingPaymentMethod(null)} className="px-4 py-2 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors text-white">Cancel</button>
                                    <button type="submit" className="bg-primary-500 hover:bg-primary-400 text-dark-900 px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-primary-500/20">Save Method</button>
                                </div>
                            </form>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {storeDetails.payment_methods?.map((pm, idx) => (
                                <div key={pm.id || idx} className="bg-dark-950 border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center group relative">
                                    {(pm.image_url || pm.image) && (
                                        <div className="w-20 h-20 mb-3 rounded-xl bg-white flex items-center justify-center p-2 shrink-0 overflow-hidden shadow-inner border border-white/10">
                                            <img 
                                                src={pm.image_url || pm.image} 
                                                alt={pm.provider} 
                                                className="w-full h-full object-contain" 
                                            />
                                        </div>
                                    )}
                                    <h4 className="font-black text-sm text-primary-400 uppercase tracking-tight mb-1">{pm.provider}</h4>
                                    {pm.account_name && <p className="text-[10px] text-slate-200 font-bold line-clamp-1 mb-2">{pm.account_name}</p>}
                                    {pm.account_number && (
                                        <div className="w-full bg-dark-900 px-2 py-2 rounded-xl border border-white/10 mt-auto">
                                            <p className="text-lg font-black font-mono text-white select-all tracking-tight leading-none">{pm.account_number}</p>
                                            <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest mt-1">Lipa Number</p>
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-between w-full mt-3 pt-2 border-t border-white/5">
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest ${pm.is_active ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>
                                            {pm.is_active ? 'ACTIVE' : 'INACTIVE'}
                                        </span>
                                        <div className="flex gap-2">
                                            <button onClick={() => setEditingPaymentMethod(pm)} className="p-1 text-slate-400 hover:text-white bg-white/5 rounded transition-colors"><Edit2 size={12} /></button>
                                            <button onClick={() => handleDeletePaymentMethod(pm.id)} className="p-1 text-slate-400 hover:text-red-400 bg-white/5 rounded transition-colors"><Trash2 size={12} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!storeDetails.payment_methods || storeDetails.payment_methods.length === 0) && !editingPaymentMethod && (
                                <div className="text-center py-6 text-slate-500 bg-dark-950 rounded-xl border border-white/5 border-dashed">No payment methods configured yet.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Other views omitted for brevity, adding back QR and NOTICES */}
            {activeView === 'NOTICES' && (
                <div className="glass-dark border border-white/5 rounded-3xl p-6 max-w-4xl mx-auto w-full">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6"><Bell className="text-primary-400" /> Staff Notices</h2>
                    <div className="space-y-4">
                        {notices.map(n => (
                            <div key={n.id} className="bg-dark-900 border border-white/10 rounded-xl p-4">
                                <h3 className="text-lg font-bold text-primary-400">{n.title}</h3>
                                <p className="text-slate-300 mt-2 whitespace-pre-wrap">{n.message}</p>
                                <span className="text-xs text-slate-500 block mt-3">From: Admin | {new Date(n.created_at).toLocaleString()}</span>
                            </div>
                        ))}
                        {notices.length === 0 && <EmptyState icon={<Bell size={48} />} text="No notices currently." />}
                    </div>
                </div>
            )}

            {activeView === 'QR' && storeDetails && canSeeAdminStuff && (
                <div className="glass-dark border border-white/5 rounded-3xl p-6 max-w-xl mx-auto w-full flex flex-col items-center">
                    <h2 className="text-2xl font-bold text-white mb-6">Store QR Code</h2>
                    <div className="bg-white p-6 rounded-2xl mb-4">
                        <QRCodeSVG value={storeUrl} size={256} />
                    </div>
                    <p className="text-slate-400 text-center mb-6">Print this and place it on tables or counters so customers can easily access your digital menu.</p>
                    <a href={storeUrl} target="_blank" rel="noreferrer" className="text-primary-400 font-bold hover:underline break-all text-center">{storeUrl}</a>
                </div>
            )}

            {/* MODALS */}
            {/* POS MODAL */}
            {showPOSModal && (
                <div className="fixed inset-0 bg-dark-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-0 sm:p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className="bg-dark-900 w-full h-full sm:h-auto sm:max-w-5xl sm:rounded-3xl shadow-2xl flex flex-col sm:flex-row overflow-hidden border border-white/10"
                    >
                        {/* Product Picker */}
                        <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-white/5 bg-dark-950/30">
                            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-dark-900/50">
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Point of Sale</h3>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Select products to add to cart</p>
                                </div>
                                <button onClick={() => setShowPOSModal(false)} className="sm:hidden p-2 text-slate-400 hover:text-white"><X size={24} /></button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 custom-scrollbar">
                                {posProducts.map(product => (
                                    <button 
                                        key={product.id} 
                                        onClick={() => addToPosCart(product)}
                                        className="bg-dark-900 border border-white/5 rounded-2xl p-3 md:p-4 text-left hover:border-primary-500/50 transition-all group flex flex-col h-full shadow-lg"
                                    >
                                        <div className="w-full aspect-square rounded-xl bg-dark-950 mb-3 overflow-hidden border border-white/5">
                                            {product.image ? (
                                                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-800"><ShoppingBag size={32} /></div>
                                            )}
                                        </div>
                                        <h4 className="font-bold text-white text-sm md:text-base line-clamp-1 group-hover:text-primary-400 transition-colors">{product.name}</h4>
                                        <div className="mt-auto pt-2 flex justify-between items-center">
                                            <span className="text-primary-500 font-black text-sm md:text-base">{formatPrice(product.price)}</span>
                                            <div className="w-8 h-8 rounded-full bg-primary-500/10 text-primary-500 flex items-center justify-center group-hover:bg-primary-500 group-hover:text-dark-900 transition-all">
                                                <Plus size={16} />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Cart Summary */}
                        <div className="w-full sm:w-80 md:w-96 bg-dark-900 flex flex-col h-full border-t sm:border-t-0 sm:border-l border-white/10 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
                            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                <h4 className="font-black text-slate-400 uppercase tracking-widest text-xs">Current Order</h4>
                                <button onClick={() => setPosCart([])} className="text-[10px] font-black text-red-500 hover:text-red-400 uppercase tracking-widest">Clear All</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
                                {posCart.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full opacity-20 py-10">
                                        <ShoppingCart size={48} className="mb-4" />
                                        <p className="font-bold uppercase tracking-widest text-xs">Cart is empty</p>
                                    </div>
                                ) : (
                                    posCart.map(item => (
                                        <div key={item.id} className="flex gap-4 items-center bg-dark-950/50 p-3 rounded-2xl border border-white/5">
                                            <div className="flex-1">
                                                <h5 className="text-sm font-bold text-white line-clamp-1">{item.name}</h5>
                                                <p className="text-xs text-primary-500 font-black mt-1">{formatPrice(item.price * item.quantity)}</p>
                                            </div>
                                            <div className="flex items-center gap-2 bg-dark-900 rounded-xl p-1 border border-white/10">
                                                <button onClick={() => updatePosQty(item.id, -1)} className="p-1 hover:text-primary-400 text-slate-500 transition-colors"><X size={14} /></button>
                                                <span className="w-6 text-center text-sm font-black text-white">{item.quantity}</span>
                                                <button onClick={() => updatePosQty(item.id, 1)} className="p-1 hover:text-primary-400 text-slate-500 transition-colors"><Plus size={14} /></button>
                                            </div>
                                            <button onClick={() => removeFromPosCart(item.id)} className="text-red-500/50 hover:text-red-500 p-1"><Trash2 size={16} /></button>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-6 bg-dark-950/50 border-t border-white/10 space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Customer Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. John Doe"
                                        value={posCustomerName}
                                        onChange={e => setPosCustomerName(e.target.value)}
                                        className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-primary-500 outline-none transition-all font-medium"
                                    />
                                </div>
                                
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-10 h-6 rounded-full transition-colors relative ${posSkipKitchen ? 'bg-primary-500' : 'bg-dark-800'}`}>
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${posSkipKitchen ? 'left-5' : 'left-1'}`}></div>
                                    </div>
                                    <input type="checkbox" className="hidden" checked={posSkipKitchen} onChange={e => setPosSkipKitchen(e.target.checked)} />
                                    <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors">Skip Kitchen Queue</span>
                                </label>

                                <div className="pt-4 space-y-3">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Amount</span>
                                        <span className="text-2xl font-black text-white tracking-tight">
                                            {formatPrice(posCart.reduce((sum, i) => sum + (i.price * i.quantity), 0))}
                                        </span>
                                    </div>
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => setShowPOSModal(false)}
                                            className="flex-1 py-4 rounded-2xl bg-white/5 text-white font-bold text-sm hover:bg-white/10 transition-all border border-white/5"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            disabled={posCart.length === 0}
                                            onClick={handlePOSCheckout}
                                            className="flex-[2] py-4 rounded-2xl bg-primary-500 text-dark-900 font-black text-sm hover:bg-primary-400 transition-all shadow-[0_10px_30px_rgba(249,115,22,0.3)] disabled:opacity-50 disabled:shadow-none"
                                        >
                                            PLACE ORDER
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {verifyModal.open && (
                <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-dark-900 border border-indigo-500/30 w-full max-w-md rounded-3xl shadow-2xl p-6 overflow-y-auto max-h-[80vh]">
                        <h3 className="text-xl font-bold text-white mb-4">Verify Payment: #{verifyModal.order.id}</h3>
                        <div className="mb-4 text-slate-300">
                            Current Total: <strong className="text-primary-400">{formatPriceStatic(verifyModal.order.total_amount)}</strong>
                        </div>
                        
                        {/* Customer payment proof */}
                        {verifyModal.order.payment_message && (
                            <div className="mb-4 bg-dark-950 border border-white/10 rounded-xl p-4">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Payment Message / Ref</p>
                                <p className="text-white text-sm whitespace-pre-wrap">{verifyModal.order.payment_message}</p>
                            </div>
                        )}
                        {verifyModal.order.payment_receipt && (
                            <div className="mb-4">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Receipt Image</p>
                                <img
                                    src={`${BACKEND_URL}${verifyModal.order.payment_receipt}`}
                                    alt="Payment receipt"
                                    className="rounded-xl max-h-60 w-full object-contain border border-white/10"
                                />
                            </div>
                        )}
                        {/* Order items summary */}
                        <div className="mb-4">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Items Ordered</p>
                            {verifyModal.order.items?.map(item => (
                                <div key={item.id} className="flex justify-between text-sm text-slate-300 py-1">
                                    <span>{item.quantity}x {item.product.name}</span>
                                    <span className="text-white font-bold">{formatPriceStatic(item.unit_price * item.quantity)}</span>
                                </div>
                            ))}
                        </div>
                        {/* Customer info */}
                        <div className="flex gap-4 text-sm text-slate-400 mb-4">
                            <span>Mode: <strong className="text-white">{verifyModal.order.fulfillment_mode}</strong></span>
                            {verifyModal.order.customer_phone && (
                                <span>Phone: <strong className="text-white">{verifyModal.order.customer_phone}</strong></span>
                            )}
                        </div>

                        {verifyModal.order.fulfillment_mode === 'DELIVERY' && (
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-slate-400 mb-2">Assign Delivery Fee (If Applicable)</label>
                                <input
                                    type="number" step="0.01" min="0"
                                    value={verifyModal.fee}
                                    onChange={e => setVerifyModal({...verifyModal, fee: e.target.value})}
                                    placeholder="e.g. 5.00"
                                    className="w-full bg-dark-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                                />
                                <p className="text-xs text-slate-500 mt-2">This will be added to the customer's total.</p>
                            </div>
                        )}
                        <div className="flex gap-4">
                            <button onClick={() => setVerifyModal({open: false, order: null, fee: ''})} className="flex-1 py-3 rounded-xl bg-dark-800 text-white font-bold hover:bg-dark-700">Cancel</button>
                            <button 
                                onClick={() => {
                                    const payload = {};
                                    if (verifyModal.fee) payload.delivery_fee = verifyModal.fee;
                                    advanceOrderState(verifyModal.order.id, 'PAID', payload);
                                }} 
                                className="flex-1 py-3 rounded-xl bg-indigo-500 text-white font-bold hover:bg-indigo-400"
                            >
                                Confirm Paid
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const OrderCard = ({ order, markItemReadyFn, advanceOrderStateFn, onVerifyPayment, userRole }) => {
    const isAwaitingPayment = order.state === 'AWAITING_PAYMENT';
    const isQueued = order.state === 'QUEUED' || order.state === 'PAID';
    const isPreparing = order.state === 'PREPARING';
    const isReadyColumn = order.state === 'READY';
    const isOutForDelivery = order.state === 'OUT_FOR_DELIVERY';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className={`bg-dark-950/80 rounded-2xl p-5 border shadow-lg ${isReadyColumn ? 'border-green-500/30' : isPreparing ? 'border-primary-500/30' : isAwaitingPayment ? 'border-indigo-500/30' : 'border-white/5'}`}
        >
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="text-xl font-black text-white">#{order.id}</h4>
                    <span className="text-xs text-primary-400 font-bold block mt-1">{formatPriceStatic(order.total_amount)} {order.delivery_fee > 0 && `(Fee: ${order.delivery_fee})`}</span>
                    {order.reservation_time && (
                        <div className="flex items-center gap-1.5 mt-2 bg-primary-500/10 text-primary-400 px-2 py-1 rounded-md border border-primary-500/20 w-fit">
                            <Calendar size={12} className="shrink-0" />
                            <span className="text-[10px] font-black uppercase tracking-tight">
                                Reserved: {new Date(order.reservation_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    )}
                    <span className="text-xs text-slate-400 block mt-1">{new Date(order.created_at).toLocaleTimeString()}</span>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${order.fulfillment_mode === 'DELIVERY' ? 'bg-purple-500/20 text-purple-400' : 'bg-orange-500/20 text-orange-400'}`}>
                        {order.fulfillment_mode}
                    </span>
                    {order.delivery_location && (
                        <div className="mt-1 text-right bg-dark-900 border border-white/5 p-2 rounded-lg text-xs text-slate-300 max-w-[200px] break-words">
                            📍 {order.delivery_location} <br/> 📞 {order.customer_phone}
                        </div>
                    )}
                </div>
            </div>

            {/* Items */}
            <div className="space-y-2 mt-4">
                {order.items?.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-dark-800/50 rounded-lg p-2 border border-white/5">
                        <span className={`text-sm ${item.is_ready ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{item.quantity}x {item.product.name}</span>
                        {markItemReadyFn && isPreparing && !item.is_ready && (
                            <button onClick={() => markItemReadyFn(order.id, item.id)} className="bg-primary-500 text-dark-900 text-xs font-bold px-2 py-1 rounded">Ready</button>
                        )}
                    </div>
                ))}
            </div>

            {isAwaitingPayment && onVerifyPayment && ['ACCOUNTANT', 'SELLER', 'ADMIN'].includes(userRole) && (
                <button onClick={onVerifyPayment} className="w-full mt-4 bg-indigo-500 text-white font-bold py-2 rounded-xl">Verify Payment</button>
            )}

            {isQueued && advanceOrderStateFn && ['CHEF', 'SELLER', 'ADMIN'].includes(userRole) && (
                <button onClick={() => advanceOrderStateFn(order.id, 'PREPARING')} className="w-full mt-4 bg-dark-800 text-white font-bold py-2 rounded-xl">Start Preparing</button>
            )}

            {isPreparing && advanceOrderStateFn && ['CHEF', 'SELLER', 'ADMIN'].includes(userRole) && (
                <button onClick={() => advanceOrderStateFn(order.id, 'READY')} className="w-full mt-4 bg-primary-500 text-dark-900 font-bold py-2 rounded-xl">Mark All Ready</button>
            )}

            {isReadyColumn && advanceOrderStateFn && ['DELIVERY', 'SELLER', 'ADMIN'].includes(userRole) && order.fulfillment_mode === 'DELIVERY' && (
                <button onClick={() => advanceOrderStateFn(order.id, 'OUT_FOR_DELIVERY')} className="w-full mt-4 bg-purple-500 text-white font-bold py-2 rounded-xl">Out for Delivery</button>
            )}

            {isReadyColumn && advanceOrderStateFn && ['SELLER', 'ADMIN', 'CHEF'].includes(userRole) && order.fulfillment_mode !== 'DELIVERY' && (
                <button onClick={() => advanceOrderStateFn(order.id, 'COMPLETED')} className="w-full mt-4 bg-green-500 text-dark-900 font-bold py-2 rounded-xl">Complete Order</button>
            )}

            {isOutForDelivery && advanceOrderStateFn && ['DELIVERY', 'SELLER', 'ADMIN'].includes(userRole) && (
                <button onClick={() => advanceOrderStateFn(order.id, 'COMPLETED')} className="w-full mt-4 bg-green-500 text-dark-900 font-bold py-2 rounded-xl">Mark Delivered</button>
            )}
        </motion.div>
    );
}

const LoadingSkeleton = () => <div className="bg-dark-950/50 rounded-2xl p-5 border border-white/5 animate-pulse h-40"></div>;
const EmptyState = ({ icon, text }) => <div className="flex flex-col items-center py-10 opacity-50">{icon}<p className="mt-2 font-medium">{text}</p></div>;
