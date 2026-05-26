import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowRight, ArrowLeft, Calendar, Star, X, Clock, AlertCircle } from 'lucide-react';
import { useCurrency } from '../utils/useCurrency';
import toast from 'react-hot-toast';
import useInfiniteScroll from '../hooks/useInfiniteScroll';
import InfiniteScrollTrigger from '../components/InfiniteScrollTrigger';

export default function CustomerOrders() {
    const [activeTab, setActiveTab] = useState('ORDERS'); // 'ORDERS' or 'RESERVATIONS'

    // Reschedule state
    const [rescheduleTarget, setRescheduleTarget] = useState(null);

    const navigate = useNavigate();
    const { formatPrice } = useCurrency();

    // Use infinite scroll hooks
    const {
        items: orders,
        loadMore: loadMoreOrders,
        hasMore: hasMoreOrders,
        isLoading: ordersLoadingInit,
        isLoadingMore: ordersLoadingMore,
        refresh: refreshOrders
    } = useInfiniteScroll('/orders/');

    const {
        items: reservations,
        loadMore: loadMoreReservations,
        hasMore: hasMoreReservations,
        isLoading: reservationsLoadingInit,
        isLoadingMore: reservationsLoadingMore,
        refresh: refreshReservations
    } = useInfiniteScroll('/reservations/');

    const loading = activeTab === 'ORDERS' ? ordersLoadingInit : reservationsLoadingInit;

    const handleCancelReservation = (id) => {
        if (!window.confirm("Are you sure you want to cancel this reservation? Any linked food orders will also be cancelled.")) return;
        
        const tid = toast.loading("Cancelling...");
        apiClient.post(`/reservations/${id}/cancel/`)
            .then(() => {
                toast.success("Reservation cancelled.", { id: tid });
                refreshReservations();
            })
            .catch(err => {
                toast.error(err.response?.data?.error || "Failed to cancel.", { id: tid });
            });
    }

    // Polling refresh effect - only runs if not loading more to avoid page reset
    useEffect(() => {
        const interval = setInterval(() => {
            if (activeTab === 'ORDERS') {
                if (!ordersLoadingMore) refreshOrders();
            } else {
                if (!reservationsLoadingMore) refreshReservations();
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [activeTab, ordersLoadingMore, reservationsLoadingMore, refreshOrders, refreshReservations]);

    // Post active orders count back to the native shell (excluding COMPLETED, CANCELLED, REFUNDED, EXPIRED)
    useEffect(() => {
        if (window.ReactNativeWebView && Array.isArray(orders)) {
            const activeCount = orders.filter(o => !['COMPLETED', 'CANCELLED', 'REFUNDED', 'EXPIRED'].includes(o.state)).length;
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'ACTIVE_ORDERS_COUNT',
                payload: { count: activeCount }
            }));
        }
    }, [orders]);

    if (loading && orders.length === 0 && reservations.length === 0) {
        return (
            <div className="w-full max-w-4xl mx-auto py-4 md:py-8 text-white px-2 md:px-4 animate-pulse">
                {/* Header Skeleton */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-5 bg-white/5 rounded-xl w-10 h-10"></div>
                        <div className="space-y-2">
                            <div className="h-7 w-48 bg-white/5 rounded-lg"></div>
                            <div className="h-4 w-32 bg-white/5 rounded"></div>
                        </div>
                    </div>
                    <div className="h-10 w-full md:w-64 bg-white/5 rounded-xl"></div>
                </div>

                {/* Vertical Activity Cards Skeleton */}
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="glass-dark border border-white/10 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="w-full space-y-3">
                                <div className="flex justify-between items-center">
                                    <div className="h-5 w-1/3 bg-white/5 rounded"></div>
                                    <div className="h-5 w-24 bg-white/5 rounded-full"></div>
                                </div>
                                <div className="h-4 w-1/2 bg-white/5 rounded"></div>
                                <div className="h-3 w-1/4 bg-white/5 rounded"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto py-4 md:py-8 text-white px-2 md:px-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                            <ShoppingBag size={24} className="text-primary-500" /> My Activity
                        </h1>
                        <p className="text-slate-400 text-xs md:text-sm mt-0.5">Orders & Reservations history.</p>
                    </div>
                </div>

                <div className="flex bg-dark-900 border border-white/10 rounded-xl p-1 self-stretch md:self-auto">
                    <button onClick={() => setActiveTab('ORDERS')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'ORDERS' ? 'bg-primary-500 text-dark-950 shadow-lg shadow-primary-500/20' : 'text-slate-400 hover:text-white'}`}>
                        <ShoppingBag size={14} /> Orders
                    </button>
                    <button onClick={() => setActiveTab('RESERVATIONS')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'RESERVATIONS' ? 'bg-primary-500 text-dark-950 shadow-lg shadow-primary-500/20' : 'text-slate-400 hover:text-white'}`}>
                        <Calendar size={14} /> Reservations
                    </button>
                </div>
            </div>

            {activeTab === 'ORDERS' && (
                <>
                    {orders.length === 0 ? (
                        <div className="glass-dark border border-white/10 rounded-3xl p-8 md:p-12 text-center shadow-xl">
                            <ShoppingBag size={40} className="mx-auto text-slate-600 mb-4" />
                            <h2 className="text-lg md:text-xl font-bold mb-2">No orders yet</h2>
                            <p className="text-slate-400 text-sm mb-6">Discovery great food nearby!</p>
                            <Link to="/stores" className="inline-block bg-primary-500 hover:bg-primary-400 text-dark-900 font-bold py-2.5 px-6 rounded-xl text-sm transition-all">
                                Browse Restaurants
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-4">
                            <AnimatePresence>
                                {orders.map(order => (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        key={order.id}
                                        className="glass-dark border border-white/10 hover:border-primary-500/30 rounded-2xl p-4 md:p-6 transition-all group shadow-xl"
                                    >
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                            <div className="w-full">
                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                    <h3 className="text-base md:text-lg font-bold">Order #{order.id}</h3>
                                                    <span className={`px-2 py-0.5 bg-white/10 rounded text-[10px] md:text-xs font-bold uppercase tracking-tight
                                                        ${order.state === 'CANCELLED' ? 'text-red-400' : ''}
                                                        ${order.state === 'COMPLETED' ? 'text-green-400' : ''}
                                                        ${order.state === 'AWAITING_PAYMENT' ? 'text-orange-400' : ''}
                                                        ${['QUEUED', 'PREPARING'].includes(order.state) ? 'text-indigo-400' : ''}
                                                        ${order.state === 'READY' ? 'text-teal-400' : ''}
                                                        ${order.state === 'OUT_FOR_DELIVERY' ? 'text-purple-400' : ''}
                                                    `}>
                                                        {order.state.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded font-medium">
                                                        {order.fulfillment_mode}
                                                    </span>
                                                    {order.has_review && (
                                                        <span className="text-[10px] text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded font-bold border border-yellow-500/20 flex items-center gap-1">
                                                            <Star size={10} className="fill-current" /> Reviewed
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] md:text-sm text-slate-400">
                                                    {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                                <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
                                                    {(Array.isArray(order.items) ? order.items : []).map((item, idx) => (
                                                        <span key={idx} className="whitespace-nowrap text-[10px] bg-dark-900 border border-white/5 text-slate-300 px-2 py-1 rounded-md">
                                                            {item.quantity}x {item.product?.name || 'Item'}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex md:flex-col items-center justify-between w-full md:w-auto gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-white/5">
                                                <div className="text-lg md:text-xl font-bold text-primary-400">{formatPrice(order.total_amount)}</div>
                                                {order.id && (
                                                    <Link
                                                        to={`/order/track/${order.id}`}
                                                        className="flex items-center gap-2 text-xs font-bold text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all group-hover:bg-primary-500 group-hover:text-dark-900 shadow-lg"
                                                    >
                                                        Track <ArrowRight size={14} />
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                        <InfiniteScrollTrigger
                            loadMore={loadMoreOrders}
                            hasMore={hasMoreOrders}
                            isLoading={ordersLoadingInit}
                            isLoadingMore={ordersLoadingMore}
                        />
                    </>
                )}
                </>
            )}

            {activeTab === 'RESERVATIONS' && (
                <>
                    {reservations.length === 0 ? (
                        <div className="glass-dark border border-white/10 rounded-3xl p-8 md:p-12 text-center shadow-xl">
                            <Calendar size={40} className="mx-auto text-slate-600 mb-4" />
                            <h2 className="text-lg md:text-xl font-bold mb-2">No reservations</h2>
                            <p className="text-slate-400 text-sm mb-6">Book a table for dine-in!</p>
                            <Link to="/stores" className="inline-block bg-primary-500 hover:bg-primary-400 text-dark-900 font-bold py-2.5 px-6 rounded-xl text-sm transition-all">
                                Find a Table
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-4">
                            <AnimatePresence>
                                {reservations.map(res => (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        key={res.id}
                                        className="glass-dark border border-white/10 rounded-2xl p-4 md:p-6 transition-all"
                                    >
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                            <div className="w-full">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h3 className="text-base md:text-lg font-bold">Booking #{res.id}</h3>
                                                    <span className={`px-2 py-0.5 bg-white/10 rounded text-[10px] md:text-xs font-bold uppercase tracking-tight
                                                        ${res.status === 'CANCELLED' || res.status === 'NO_SHOW' ? 'text-red-400' : ''}
                                                        ${res.status === 'COMPLETED' ? 'text-green-400' : ''}
                                                        ${res.status === 'PENDING' ? 'text-orange-400' : ''}
                                                        ${res.status === 'CONFIRMED' || res.status === 'SEATED' ? 'text-indigo-400' : ''}
                                                    `}>
                                                        {res.status.replace('_', ' ')}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] md:text-sm text-slate-300 font-medium">
                                                    {new Date(res.reservation_time).toLocaleString()}
                                                </p>
                                                <div className="flex items-center gap-3 mt-2 text-[10px] md:text-xs text-slate-400">
                                                    <span>Guests: <strong className="text-white">{res.guest_count}</strong></span>
                                                    <span>Duration: <strong className="text-white">{res.duration_minutes}m</strong></span>
                                                    {res.table_number && <span className="bg-dark-900 px-2 py-0.5 rounded border border-white/5 text-primary-400 font-bold">Table {res.table_number}</span>}
                                                </div>
                                                {res.linked_order && (
                                                    <div className="mt-4 bg-dark-950/40 border border-white/5 rounded-2xl p-4 text-left">
                                                        <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/5">
                                                            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Pre-ordered Meal</span>
                                                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider
                                                                ${res.linked_order.state === 'CANCELLED' ? 'bg-red-500/20 text-red-400 border border-red-500/10' :
                                                                  res.linked_order.state === 'COMPLETED' ? 'bg-green-500/20 text-green-400 border border-green-500/10' :
                                                                  ['QUEUED', 'PREPARING'].includes(res.linked_order.state) ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/10 animate-pulse' :
                                                                  res.linked_order.state === 'READY' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/10 animate-bounce' :
                                                                  'bg-white/5 text-slate-300'}`}
                                                            >
                                                                {res.linked_order.state.replace('_', ' ')}
                                                            </span>
                                                        </div>
                                                        <div className="space-y-1.5 mb-2">
                                                            {(res.linked_order.items || []).map((item, idx) => (
                                                                <div key={idx} className="flex justify-between text-xs text-slate-300">
                                                                    <span>{item.quantity}x {item.product_name}</span>
                                                                    <span className="text-slate-400 font-semibold">{formatPrice(item.unit_price * item.quantity)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="pt-2 border-t border-white/5 flex justify-between items-center text-xs">
                                                            <span className="text-slate-500 font-medium">Meal Total</span>
                                                            <strong className="text-primary-400 font-bold">{formatPrice(res.linked_order.total_amount)}</strong>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex md:flex-col items-center gap-2 w-full md:w-auto mt-4 md:mt-0">
                                                {res.can_modify ? (
                                                    <>
                                                        <button 
                                                            onClick={() => setRescheduleTarget(res)}
                                                            className="flex-1 md:w-full bg-white/5 hover:bg-white/10 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-2"
                                                        >
                                                            <Clock size={14} /> Reschedule
                                                        </button>
                                                        <button 
                                                            onClick={() => handleCancelReservation(res.id)}
                                                            className="flex-1 md:w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-2"
                                                        >
                                                            <X size={14} /> Cancel
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="text-[10px] text-slate-500 italic bg-white/5 px-3 py-2 rounded-xl border border-white/5 flex items-center gap-2">
                                                        <AlertCircle size={12} /> Modification window closed
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                        <InfiniteScrollTrigger
                            loadMore={loadMoreReservations}
                            hasMore={hasMoreReservations}
                            isLoading={reservationsLoadingInit}
                            isLoadingMore={reservationsLoadingMore}
                        />
                    </>
                )}
                </>
            )}

            <RescheduleModal 
                reservation={rescheduleTarget} 
                onClose={() => setRescheduleTarget(null)} 
                onSuccess={() => {
                    setRescheduleTarget(null);
                    refreshReservations();
                }}
            />
        </div>
    );
}

function RescheduleModal({ reservation, onClose, onSuccess }) {
    const [newTime, setNewTime] = useState('');
    const [loading, setLoading] = useState(false);

    if (!reservation) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!newTime) return toast.error("Please select a new time");

        setLoading(true);
        const tid = toast.loading("Updating reservation...");
        
        apiClient.post(`/reservations/${reservation.id}/reschedule/`, {
            reservation_time: newTime
        }).then(() => {
            toast.success("Rescheduled successfully!", { id: tid });
            onSuccess();
        }).catch(err => {
            toast.error(err.response?.data?.error || "Rescheduling failed.", { id: tid });
        }).finally(() => setLoading(false));
    };

    return (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-dark-900 border border-white/10 w-full max-w-md rounded-3xl p-6 shadow-2xl"
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">Reschedule Booking</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full"><X size={20} /></button>
                </div>

                <div className="bg-primary-500/10 border border-primary-500/20 p-4 rounded-2xl mb-6">
                    <p className="text-xs text-primary-400 font-bold uppercase mb-1">Current Schedule</p>
                    <p className="text-sm font-medium">{new Date(reservation.reservation_time).toLocaleString()}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-2">New Arrival Time</label>
                        <input 
                            type="datetime-local"
                            value={newTime}
                            onChange={e => setNewTime(e.target.value)}
                            className="w-full bg-dark-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500"
                            style={{ colorScheme: 'dark' }}
                            min={new Date().toISOString().slice(0, 16)}
                        />
                    </div>

                    <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex gap-3">
                        <AlertCircle className="text-orange-400 shrink-0" size={18} />
                        <p className="text-[11px] text-orange-200/80 leading-relaxed">
                            Rescheduling depends on table availability. If the restaurant is full at the new time, the change will be declined.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-dark-800 font-bold hover:bg-dark-700">Cancel</button>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="flex-1 py-3 rounded-xl bg-primary-500 text-dark-950 font-bold hover:bg-primary-400 disabled:opacity-50"
                        >
                            Confirm Change
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}