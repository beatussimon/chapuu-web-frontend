import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAppStore } from '../../store/useStore';
import { MapPin, Phone, CheckCircle, Clock, Package, Navigation, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function DeliveryDashboard() {
    const { userRole, clearAuth } = useAppStore();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userRole !== 'DELIVERY' && userRole !== 'ADMIN') {
            navigate('/');
            return;
        }

        const fetchOrders = () => {
            apiClient.get('/orders/')
                .then(res => {
                    // Filter for active delivery orders (READY or strictly PREPARING if they want to wait)
                    // Usually delivery picks up when READY. We'll show READY and PREPARING for awareness.
                    const data = Array.isArray(res.data) ? res.data : [];
                    const deliveryOrders = data.filter(o =>
                        o.fulfillment_mode === 'DELIVERY' &&
                        ['PREPARING', 'READY'].includes(o.state)
                    );
                    setOrders(deliveryOrders);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Failed to load delivery orders", err);
                    setLoading(false);
                });
        };

        fetchOrders();
        const interval = setInterval(fetchOrders, 30000);
        return () => clearInterval(interval);
    }, [userRole, navigate]);

    const handleMarkDelivered = (orderId) => {
        if (!window.confirm("Confirm order has been delivered to customer?")) return;

        apiClient.patch(`/orders/${orderId}/`, { state: 'COMPLETED' })
            .then(() => {
                toast.success("Order marked as Delivered!");
                setOrders(orders.filter(o => o.id !== orderId));
            })
            .catch(err => {
                console.error("Failed to update order", err);
                toast.error("Failed to mark delivered.");
            });
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div></div>;
    }

    return (
        <div className="w-full max-w-6xl mx-auto py-8 text-white px-4">
            <div className="flex items-center justify-between mb-8">
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
                            className={`glass-dark border rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col ${order.state === 'READY' ? 'border-primary-500/50' : 'border-white/10'}`}
                        >
                            {order.state === 'READY' && (
                                <div className="absolute top-0 left-0 w-full h-1 bg-primary-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]"></div>
                            )}

                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">Order #{order.id}</span>
                                    <h3 className="text-xl font-bold">{order.store_name || `Store #${order.store}`}</h3>
                                </div>
                                <span className={`px-3 py-1 rounded-lg text-xs font-bold ${order.state === 'READY' ? 'bg-primary-500/20 text-primary-400' : 'bg-white/10 text-slate-300'}`}>
                                    {order.state === 'READY' ? 'Ready for Pickup' : 'Cooking...'}
                                </span>
                            </div>

                            <div className="space-y-4 flex-grow mb-6">
                                <div className="bg-dark-900/50 p-4 rounded-xl border border-white/5">
                                    <div className="flex items-start gap-3 mb-3">
                                        <MapPin size={18} className="text-slate-400 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Deliver To</p>
                                            <p className="text-sm font-medium">{order.delivery_location || 'No location provided'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Phone size={18} className="text-slate-400 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Customer Phone</p>
                                            <p className="text-sm font-medium">{order.customer_phone || 'No phone provided'}</p>
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
                                    <div className="flex justify-between mt-2 font-bold text-primary-400">
                                        <span>Total to Collect (if unpaid):</span>
                                        <span>${order.total_amount}</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleMarkDelivered(order.id)}
                                disabled={order.state !== 'READY'}
                                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${order.state === 'READY'
                                    ? 'bg-green-500 hover:bg-green-400 text-dark-900 shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:-translate-y-1'
                                    : 'bg-white/5 text-slate-500 cursor-not-allowed'
                                    }`}
                            >
                                {order.state === 'READY' ? (
                                    <><CheckCircle size={20} /> Mark Delivered</>
                                ) : (
                                    <><Clock size={20} /> Waiting on Kitchen</>
                                )}
                            </button>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
