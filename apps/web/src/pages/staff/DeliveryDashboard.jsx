import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAppStore } from '../../store/useStore';
import { MapPin, Phone, CheckCircle, Clock, Package, Navigation, LogOut, X, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function DeliveryDashboard() {
    const { userRole, clearAuth } = useAppStore();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedOrderForPin, setSelectedOrderForPin] = useState(null);
    const [pin, setPin] = useState('');
    const [confirmingPin, setConfirmingPin] = useState(false);

    const fetchOrders = () => {
        apiClient.get('/orders/')
            .then(res => {
                // Handle both paginated and non-paginated responses
                let data = [];
                if (res.data && typeof res.data === 'object' && 'results' in res.data) {
                    data = Array.isArray(res.data.results) ? res.data.results : [];
                } else {
                    data = Array.isArray(res.data) ? res.data : [];
                }

                const deliveryOrders = data.filter(o =>
                    o.fulfillment_mode === 'DELIVERY' &&
                    ['PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(o.state)
                );
                setOrders(deliveryOrders);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load delivery orders", err);
                setLoading(false);
            });
    };

    useEffect(() => {
        if (userRole !== 'DELIVERY' && userRole !== 'ADMIN' && userRole !== 'SUPERUSER') {
            navigate('/');
            return;
        }

        fetchOrders();
        const interval = setInterval(fetchOrders, 30000);
        return () => clearInterval(interval);
    }, [userRole, navigate]);

    // Sync active deliveries count to native shell
    useEffect(() => {
        if (window.ReactNativeWebView && Array.isArray(orders)) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'ACTIVE_ORDERS_COUNT',
                payload: { count: orders.length }
            }));
        }
    }, [orders]);

    const handleStartDelivery = (orderId) => {
        apiClient.post(`/orders/${orderId}/advance_state/`, { state: 'OUT_FOR_DELIVERY' })
            .then(() => {
                toast.success("Order is now Out for Delivery!");
                fetchOrders();
            })
            .catch(err => {
                console.error("Failed to start delivery", err);
                const msg = err.response?.data?.error || "Failed to start delivery.";
                toast.error(msg);
            });
    };

    const handleConfirmDeliveryCode = () => {
        if (pin.length !== 6) {
            toast.error("Please enter a 6-digit PIN.");
            return;
        }
        setConfirmingPin(true);
        apiClient.post(`/orders/${selectedOrderForPin}/confirm_delivery/`, { code: pin })
            .then(() => {
                toast.success("Order delivered and completed!");
                setPin('');
                setSelectedOrderForPin(null);
                fetchOrders();
            })
            .catch(err => {
                console.error("Failed to confirm delivery", err);
                const msg = err.response?.data?.error || "Failed to verify code.";
                toast.error(msg);
            })
            .finally(() => {
                setConfirmingPin(false);
            });
    };

    if (loading) {
        return (
            <div className="w-full max-w-6xl mx-auto py-8 text-white px-4 animate-pulse">
                {/* Header Skeleton */}
                <div className="flex items-center justify-between mb-8">
                    <div className="space-y-2">
                        <div className="h-9 w-60 bg-white/5 rounded-lg"></div>
                        <div className="h-4 w-40 bg-white/5 rounded"></div>
                    </div>
                </div>

                {/* Dispatch Grid Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="glass-dark border border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col h-[360px]">
                            <div className="flex justify-between items-start mb-4">
                                <div className="space-y-2 flex-1">
                                    <div className="h-3 w-1/4 bg-white/5 rounded"></div>
                                    <div className="h-6 w-3/4 bg-white/5 rounded-md"></div>
                                </div>
                                <div className="h-6 w-16 bg-white/5 rounded-lg shrink-0"></div>
                            </div>
                            
                            <div className="bg-dark-900/50 p-4 rounded-xl border border-white/5 space-y-3 mb-6 flex-grow">
                                <div className="space-y-1.5">
                                    <div className="h-3 w-16 bg-white/5 rounded"></div>
                                    <div className="h-4 w-full bg-white/5 rounded"></div>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="h-3 w-20 bg-white/5 rounded"></div>
                                    <div className="h-4 w-1/2 bg-white/5 rounded"></div>
                                </div>
                            </div>

                            <div className="h-14 w-full bg-white/5 rounded-xl mt-auto"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-6xl mx-auto py-8 text-white px-4">
            <div className="flex items-center justify-between mb-8 webview-hide-header">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Navigation size={32} className="text-primary-500" />
                        Delivery Dispatch
                    </h1>
                    <p className="text-slate-400 mt-1">Manage active delivery orders</p>
                </div>
                {userRole === 'DELIVERY' && (
                    <button
                        onClick={() => { clearAuth(); navigate('/login'); }}
                        className="flex items-center gap-2 p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-colors font-medium"
                    >
                        <LogOut size={20} /> <span className="hidden sm:inline">Sign Out</span>
                    </button>
                )}
            </div>

            {orders.length === 0 ? (
                <div className="glass-dark border border-white/10 rounded-3xl p-16 text-center">
                    <Package size={48} className="mx-auto text-slate-600 mb-4" />
                    <h2 className="text-2xl font-bold mb-2">No Active Deliveries</h2>
                    <p className="text-slate-400">Waiting for new delivery orders to be ready...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {orders.map(order => (
                        <motion.div
                            key={order.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`glass-dark border rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col ${order.state === 'READY' || order.state === 'OUT_FOR_DELIVERY' ? 'border-primary-500/50' : 'border-white/10'}`}
                        >
                            {(order.state === 'READY' || order.state === 'OUT_FOR_DELIVERY') && (
                                <div className="absolute top-0 left-0 w-full h-1 bg-primary-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]"></div>
                            )}

                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">Order #{order.id}</span>
                                    <h3 className="text-xl font-bold">{order.store_name || `Store #${order.store}`}</h3>
                                </div>
                                <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                                    order.state === 'READY' ? 'bg-primary-500/20 text-primary-400' : 
                                    order.state === 'OUT_FOR_DELIVERY' ? 'bg-cyan-500/20 text-cyan-400' : 
                                    'bg-white/10 text-slate-300'
                                }`}>
                                    {order.state === 'READY' ? 'Ready' : 
                                     order.state === 'OUT_FOR_DELIVERY' ? 'In Transit' : 
                                     'Preparing'}
                                </span>
                            </div>

                            <div className="space-y-4 flex-grow mb-6">
                                <div className="bg-dark-900/50 p-4 rounded-xl border border-white/5">
                                    <div className="flex items-start gap-3 mb-3">
                                        <MapPin size={18} className="text-slate-400 mt-0.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Deliver To</p>
                                                <a 
                                                    href={
                                                        order.delivery_latitude && order.delivery_longitude
                                                            ? `https://www.google.com/maps/dir/?api=1&destination=${order.delivery_latitude},${order.delivery_longitude}`
                                                            : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.delivery_location || '')}`
                                                    } 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-[10px] text-primary-400 hover:underline font-bold flex items-center gap-0.5 shrink-0 cursor-pointer"
                                                >
                                                    <Navigation size={10} /> Open Directions
                                                </a>
                                            </div>
                                            <p className="text-sm font-medium break-words">{order.delivery_location || 'No location provided'}</p>
                                            {order.delivery_directions && (
                                                <p className="text-[11px] text-amber-400 bg-amber-500/5 border border-amber-500/10 rounded-lg p-1.5 mt-1.5 leading-normal">
                                                    Directions: {order.delivery_directions}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Phone size={18} className="text-slate-400 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Customer Phone</p>
                                            <a href={`tel:${order.customer_phone}`} className="text-sm font-medium text-slate-200 hover:text-white hover:underline">{order.customer_phone || 'No phone provided'}</a>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Order Items</p>
                                    <div className="text-sm text-slate-300 space-y-1">
                                        {order.items.map(item => (
                                            <div key={item.id} className="flex justify-between border-b border-white/5 pb-1">
                                                <span>{item.quantity}x {item.product.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {['READY', 'OUT_FOR_DELIVERY'].includes(order.state) && (
                                <a
                                    href={
                                        order.delivery_latitude && order.delivery_longitude
                                            ? `https://www.google.com/maps/dir/?api=1&destination=${order.delivery_latitude},${order.delivery_longitude}`
                                            : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.delivery_location || '')}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full py-3 mb-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all bg-indigo-600 hover:bg-indigo-500 text-white shadow-md hover:-translate-y-0.5 text-sm cursor-pointer"
                                >
                                    <Navigation size={16} /> Start Navigation
                                </a>
                            )}

                            {order.state === 'READY' ? (
                                <button
                                    onClick={() => handleStartDelivery(order.id)}
                                    className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all bg-primary-500 hover:bg-primary-400 text-dark-900 shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:-translate-y-1"
                                >
                                    <Truck size={20} /> Out For Delivery
                                </button>
                            ) : order.state === 'OUT_FOR_DELIVERY' ? (
                                <button
                                    onClick={() => setSelectedOrderForPin(order.id)}
                                    className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all bg-green-500 hover:bg-green-400 text-dark-900 shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:-translate-y-1"
                                >
                                    <CheckCircle size={20} /> Mark Delivered (Enter Code)
                                </button>
                            ) : (
                                <button
                                    disabled
                                    className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all bg-white/5 text-slate-500 cursor-not-allowed"
                                >
                                    <Clock size={20} /> Kitchen Preparing...
                                </button>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}

            {/* PIN Entry Modal */}
            <AnimatePresence>
                {selectedOrderForPin && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-dark-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative"
                        >
                            <button
                                onClick={() => { setSelectedOrderForPin(null); setPin(''); }}
                                className="absolute top-4 right-4 p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>

                            <h3 className="text-xl font-bold text-white mb-2 text-center">Fulfillment Handoff</h3>
                            <p className="text-xs text-slate-400 text-center mb-6">
                                Enter the 6-digit confirmation code provided by the customer for Order #{selectedOrderForPin}.
                            </p>

                            <div className="flex justify-center mb-6">
                                <input
                                    type="text"
                                    maxLength="6"
                                    value={pin}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        setPin(val);
                                    }}
                                    placeholder="000000"
                                    className="bg-dark-950 border border-white/10 rounded-xl px-4 py-3 text-center text-3xl font-black font-mono tracking-widest text-primary-500 focus:outline-none focus:border-primary-500 w-48 transition-all"
                                    autoFocus
                                />
                            </div>

                            <button
                                onClick={handleConfirmDeliveryCode}
                                disabled={confirmingPin || pin.length !== 6}
                                className="w-full bg-primary-500 hover:bg-primary-400 disabled:opacity-50 text-dark-950 font-bold py-3 rounded-xl shadow-lg transition-all"
                            >
                                {confirmingPin ? 'Verifying...' : 'Verify & Complete'}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
