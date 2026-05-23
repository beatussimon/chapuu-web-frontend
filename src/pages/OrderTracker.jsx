import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient, { getWebSocketURL } from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, CheckCircle2, Clock, CreditCard, ShoppingBag, ArrowLeft, RefreshCw, Truck, Package, Star, X, Calendar, Users, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCurrency } from '../utils/useCurrency';

const CountdownTimer = ({ targetTime, prefix = "Arriving in " }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const updateTimer = () => {
            const diff = new Date(targetTime) - new Date();
            if (diff <= 0) {
                setTimeLeft('Expected now');
                return;
            }
            const hours = Math.floor(diff / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            
            const hStr = hours > 0 ? `${hours}h ` : '';
            const mStr = minutes > 0 || hours > 0 ? `${minutes}m ` : '';
            setTimeLeft(`${prefix}${hStr}${mStr}${seconds}s`);
        };

        updateTimer();
        const timer = setInterval(updateTimer, 1000);
        return () => clearInterval(timer);
    }, [targetTime, prefix]);

    return <span className="font-mono">{timeLeft}</span>;
};

export default function OrderTracker() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const { formatPrice } = useCurrency();
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);

    // Review State
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [reviewSubmitted, setReviewSubmitted] = useState(false);

    const fetchOrder = () => {
        if (!id) return;
        apiClient.get(`/orders/${id}/`)
            .then(res => {
                setOrder(res.data);
                setLoading(false);
                // Only show review modal if order is strictly COMPLETED and not already reviewed
                if (res.data.state === 'COMPLETED' && !res.data.has_review && !reviewSubmitted) {
                    setShowReviewModal(true);
                }
            })
            .catch(err => {
                console.error("Could not fetch order", err);
                setLoading(false);
            });
    }

    const submitReview = () => {
        if (rating === 0) {
            toast.error("Please provide a star rating!");
            return;
        }
        if (!comment.trim()) {
            toast.error("Please provide a comment for your review!");
            return;
        }
        apiClient.post('/reviews/', {
            store: order.store,
            order: order.id,
            rating: rating,
            comment: comment
        }).then(() => {
            toast.success("Review submitted!");
            setReviewSubmitted(true);
            setShowReviewModal(false);
            fetchOrder(); // Refresh to show review details
        }).catch(err => {
            console.error("Failed to submit review", err);
            toast.error("Could not submit review.");
        });
    }

    useEffect(() => {
        fetchOrder();
        const interval = setInterval(fetchOrder, 30000); // Polling fallback

        const wsUrl = getWebSocketURL(`/ws/order/${id}/`);
        
        let socket = null;
        let reconnectTimeout = null;

        const connectWS = () => {
            console.log("[WS] Connecting to Tracker Socket...");
            socket = new WebSocket(wsUrl);

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'order_update') {
                        console.log("[WS] Live update for this order:", data.message);
                        fetchOrder();
                    }
                } catch (e) { console.error("[WS] Error", e); }
            };
            socket.onclose = () => {
                reconnectTimeout = setTimeout(connectWS, 5000);
            };
            socket.onerror = () => {
                if (socket) socket.close();
            };
        };

        if (id) connectWS();

        return () => {
            clearInterval(interval);
            if (socket) {
                socket.onclose = null;
                socket.onerror = null;
                socket.close();
            }
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
        };
    }, [id]);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-200px)]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="text-center py-20 text-white">
                <p className="mb-4 text-slate-400">Order not found.</p>
                <Link to="/orders" className="bg-primary-500 text-dark-950 px-6 py-2 rounded-xl font-bold">Back to My Orders</Link>
            </div>
        );
    }

    if (['CANCELLED', 'EXPIRED', 'REFUNDED'].includes(order?.state)) {
        return (
            <div className="w-full max-w-3xl mx-auto py-20 px-4 text-center">
                <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6 mx-auto">
                    <X size={40} />
                </div>
                <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Order {order.state}</h2>
                <p className="text-slate-400 mb-8">This order is no longer active and cannot be tracked.</p>
                <Link to="/orders" className="inline-block bg-white/5 hover:bg-white/10 text-white px-8 py-3 rounded-2xl font-bold transition-all">
                    ← Back to My Orders
                </Link>
            </div>
        );
    }

    const stateFlow = ['CREATED', 'AWAITING_PAYMENT', 'PAID', 'QUEUED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED'];
    const currentStateIndex = stateFlow.indexOf(order.state);
    const activeIndex = order.state === 'PAID' ? stateFlow.indexOf('QUEUED') : currentStateIndex;

    const getIcon = (state) => {
        switch (state) {
            case 'AWAITING_PAYMENT': return <CreditCard size={24} />;
            case 'QUEUED': return <Clock size={24} />;
            case 'PREPARING': return <ChefHat size={24} />;
            case 'READY': return <Package size={24} />;
            case 'OUT_FOR_DELIVERY': return <Truck size={24} />;
            case 'COMPLETED': return <ShoppingBag size={24} />;
            default: return <Clock size={24} />;
        }
    };

    const getStatusText = (state) => {
        switch (state) {
            case 'AWAITING_PAYMENT': return 'Payment Verification';
            case 'PAID':
            case 'QUEUED': 
                if (order.fulfillment_mode === 'RESERVATION') return 'Reservation Booked';
                if (order.scheduled_time) return 'Scheduled & Confirmed';
                return 'Received & In Queue';
            case 'PREPARING': return 'Kitchen is Preparing';
            case 'READY':
                if (order.fulfillment_mode === 'DELIVERY') return 'Ready for Dispatch';
                if (order.fulfillment_mode === 'RESERVATION') return 'Table & Meal Ready';
                return 'Ready for Pickup / Service';
            case 'OUT_FOR_DELIVERY': return 'Out for Delivery';
            case 'COMPLETED': return 'Completed';
            default: return 'Processing';
        }
    };

    const displayStates = order.fulfillment_mode === 'DELIVERY' 
        ? ['AWAITING_PAYMENT', 'QUEUED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED'] 
        : ['AWAITING_PAYMENT', 'QUEUED', 'PREPARING', 'READY', 'COMPLETED'];

    const currentStepIndex = displayStates.indexOf(displayStates.slice().reverse().find(s => stateFlow.indexOf(s) <= activeIndex) || displayStates[0]);
    const progressPercent = (currentStepIndex / (displayStates.length - 1)) * 100;

    return (
        <div className="w-full max-w-3xl mx-auto py-4 md:py-8 px-2 md:px-4">

            <div className="flex items-center gap-3 mb-8">
                <button onClick={() => navigate('/orders')} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-slate-400">
                    <ArrowLeft size={18} />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl md:text-3xl font-bold text-white flex items-center justify-between">
                        Order #{order.id}
                        <button onClick={fetchOrder} className="text-slate-500 hover:text-primary-500 transition-colors" title="Refresh">
                            <RefreshCw size={18} />
                        </button>
                    </h1>
                    <p className="text-slate-400 text-xs md:text-sm mt-0.5">{order.store_name || `Store #${order.store}`}</p>
                </div>
            </div>

            <div className="glass-dark border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-8 mb-8 shadow-2xl">
                <h3 className="text-sm md:text-lg font-black text-white mb-8 border-b border-white/5 pb-4 uppercase tracking-widest">Live Status</h3>

                <div className="relative flex flex-col md:flex-row justify-between gap-8 md:gap-0 px-2 md:px-0">
                    {/* Background Line */}
                    <div className="absolute left-[31px] md:left-0 top-0 md:top-[31px] bottom-0 md:bottom-auto w-0.5 md:w-full h-full md:h-0.5 bg-white/10 -z-10 rounded-full"></div>

                    {/* Progress Fill Line */}
                    <div 
                        className="absolute left-[31px] md:left-0 top-0 md:top-[31px] bg-primary-500 transition-all duration-1000 -z-10 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                        style={{ 
                            width: !isMobile ? `${progressPercent}%` : '2px',
                            height: isMobile ? `${progressPercent}%` : '2px'
                        }}
                    ></div>

                    {displayStates.map((state, idx) => {
                        const targetStateIndex = stateFlow.indexOf(state);
                        const isPast = activeIndex > targetStateIndex;
                        const isCurrent = activeIndex === targetStateIndex;
                        const isFinished = isPast || (isCurrent && state === 'COMPLETED');

                        return (
                            <div key={state} className={`flex md:flex-col items-center gap-4 md:gap-4 flex-1 ${isCurrent || isPast ? 'opacity-100' : 'opacity-30'}`}>
                                <motion.div
                                    animate={{ scale: isCurrent ? 1.1 : 1 }}
                                    className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center shrink-0 border-2 md:border-4 shadow-xl z-10 transition-colors duration-500
                                        ${isFinished ? 'bg-primary-500 border-primary-600 text-dark-900 shadow-primary-500/30' :
                                            isCurrent ? 'bg-dark-900 border-primary-500 text-primary-500 shadow-primary-500/50' :
                                                'bg-dark-800 border-white/10 text-slate-500'}`}
                                >
                                    {isFinished ? <CheckCircle2 size={20} className="md:w-6 md:h-6" /> : React.cloneElement(getIcon(state), { className: "w-[18px] h-[18px] md:w-6 md:h-6" })}
                                </motion.div>

                                <div className="text-left md:text-center">
                                    <h4 className={`font-bold transition-colors text-xs md:text-sm ${isCurrent ? 'text-primary-400' : isPast ? 'text-white' : 'text-slate-500'}`}>
                                        {getStatusText(state)}
                                    </h4>
                                    {isCurrent && state !== 'COMPLETED' && (
                                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-primary-400 mt-1 uppercase tracking-widest animate-pulse font-bold">
                                            In Progress
                                        </motion.p>
                                    )}
                                    {isCurrent && state === 'COMPLETED' && (
                                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-green-400 mt-1 uppercase tracking-widest font-bold">
                                            Enjoy!
                                        </motion.p>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Premium Glassmorphic Reservation Ticket */}
            {order.fulfillment_mode === 'RESERVATION' && (
                <div className={`glass-dark border rounded-3xl p-6 md:p-8 mb-8 relative overflow-hidden shadow-2xl transition-all duration-500
                    ${order.reservation_status === 'CONFIRMED' ? 'border-emerald-500/30 bg-emerald-500/[0.02] shadow-[0_0_30px_rgba(16,185,129,0.15)]' :
                      order.reservation_status === 'ACTIVE' ? 'border-cyan-500/30 bg-cyan-500/[0.02] shadow-[0_0_30px_rgba(6,182,212,0.15)]' :
                      order.reservation_status === 'PENDING' ? 'border-amber-500/30 bg-amber-500/[0.02] shadow-[0_0_30px_rgba(245,158,11,0.15)]' :
                      'border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]'}`}
                >
                    {/* Glowing decorative ambient dots */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-3xl -z-10"></div>
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-3xl -z-10"></div>

                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-primary-400">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block">Fulfillment Mode</span>
                                <h3 className="text-sm font-black text-white uppercase tracking-wider">VIP Reservation Booking</h3>
                            </div>
                        </div>

                        {/* Status Pill */}
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider
                            ${order.reservation_status === 'CONFIRMED' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                              order.reservation_status === 'ACTIVE' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' :
                              order.reservation_status === 'PENDING' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                              order.reservation_status === 'COMPLETED' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' :
                              'bg-white/5 border-white/10 text-slate-400'}`}
                        >
                            <span className={`w-2 h-2 rounded-full block
                                ${order.reservation_status === 'CONFIRMED' ? 'bg-emerald-400 animate-pulse' :
                                  order.reservation_status === 'ACTIVE' ? 'bg-cyan-400 animate-pulse' :
                                  order.reservation_status === 'PENDING' ? 'bg-amber-400 animate-pulse' :
                                  order.reservation_status === 'COMPLETED' ? 'bg-purple-400' :
                                  'bg-slate-400'}`}
                            ></span>
                            {order.reservation_status || 'PENDING'}
                        </div>
                    </div>

                    {/* Ticket Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                        <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Date & Time</span>
                            <span className="text-sm font-bold text-white block">
                                {order.reservation_time 
                                    ? new Date(order.reservation_time).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                    : 'Not Scheduled'}
                            </span>
                            {order.reservation_time && (
                                <span className="text-[10px] text-primary-400 font-black mt-1 block">
                                    <CountdownTimer targetTime={order.reservation_time} prefix="Expected in: " />
                                </span>
                            )}
                        </div>

                        <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Guests Seated</span>
                            <span className="text-sm font-bold text-white flex items-center gap-1.5">
                                <Users size={14} className="text-slate-400" />
                                {order.reservation_guest_count || 1} {parseInt(order.reservation_guest_count) === 1 ? 'Guest' : 'Guests'}
                            </span>
                        </div>

                        <div className="col-span-2 md:col-span-1">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Table Number</span>
                            <span className={`text-sm font-bold block ${order.table_number ? 'text-primary-400' : 'text-slate-400'}`}>
                                {order.table_number ? `Table #${order.table_number}` : 'Assigned on Arrival'}
                            </span>
                        </div>
                    </div>

                    {/* Decorative Dashed Ticket Separator */}
                    <div className="relative my-6">
                        <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-white/10 -translate-y-1/2"></div>
                        {/* Half-circles on left and right edges for boarding pass style */}
                        <div className="absolute -left-9 md:-left-11 top-1/2 -translate-y-1/2 w-6 h-6 bg-dark-950 border border-white/10 rounded-full"></div>
                        <div className="absolute -right-9 md:-right-11 top-1/2 -translate-y-1/2 w-6 h-6 bg-dark-950 border border-white/10 rounded-full"></div>
                    </div>

                    {/* Ticket Stub Message */}
                    <div className="bg-dark-950/60 rounded-2xl border border-white/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Instructions</h4>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                {order.reservation_status === 'PENDING' && "We are waiting for our accountant or manager to verify your transaction deposit payment. Check back soon!"}
                                {order.reservation_status === 'CONFIRMED' && "Congratulations! Your reservation is confirmed. Present this card screen at the host stand to be seated immediately."}
                                {order.reservation_status === 'ACTIVE' && "Your dining session is officially active. Welcome to your reserved table! Feel free to request assistance from staff."}
                                {order.reservation_status === 'COMPLETED' && "Thank you for dining with us! We hope you thoroughly enjoyed your experience. Please leave a review below."}
                                {order.reservation_status === 'CANCELLED' && "This booking was cancelled. If you have questions or had paid a deposit, please reach out to host support."}
                                {!['PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED'].includes(order.reservation_status) && "Please present this booking screen at the host stand upon your arrival."}
                            </p>
                        </div>
                        {order.reservation_status === 'CONFIRMED' && (
                            <div className="shrink-0 flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-xl">
                                <span className="text-[11px] font-black text-emerald-400 tracking-wider uppercase animate-pulse">Ready to Seat</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Premium Glassmorphic Scheduled Preorder Ticket */}
            {order.scheduled_time && order.fulfillment_mode !== 'RESERVATION' && (
                <div className="glass-dark border border-primary-500/20 bg-primary-500/[0.01] rounded-3xl p-6 md:p-8 mb-8 relative overflow-hidden shadow-2xl">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-primary-400">
                                <Clock size={20} className="animate-pulse" />
                            </div>
                            <div>
                                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block">Order Type</span>
                                <h3 className="text-sm font-black text-white uppercase tracking-wider">Scheduled Preorder</h3>
                            </div>
                        </div>
                        <div className="bg-primary-500/10 text-primary-400 px-3 py-1 rounded-lg border border-primary-500/20 text-xs font-bold uppercase tracking-wider">
                            Pre-order
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                            <span className="text-slate-500 font-bold block mb-1">EXPECTED PICKUP/DELIVERY</span>
                            <span className="text-sm font-bold text-white block font-sans">
                                {new Date(order.scheduled_time).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-500 font-bold block mb-1">COUNTDOWN TO ARRIVAL</span>
                            <span className="text-sm font-black text-primary-400 block font-sans">
                                <CountdownTimer targetTime={order.scheduled_time} prefix="" />
                            </span>
                        </div>
                    </div>
                    {order.scheduled_start_time && ['QUEUED', 'PAID'].includes(order.state) && (
                        <div className="mt-4 pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                            <span className="text-slate-400 font-medium">Kitchen scheduled to start cooking at: <strong>{new Date(order.scheduled_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                            <div className="bg-primary-500/10 text-primary-400 px-3 py-1 rounded-lg border border-primary-500/20 font-black font-sans shrink-0">
                                Prep begins in: <CountdownTimer targetTime={order.scheduled_start_time} prefix="" />
                            </div>
                        </div>
                    )}
                    
                    {/* Reschedule button and status indicators */}
                    <div className="mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {order.reschedule_status ? (
                            <div className="flex flex-col gap-2">
                                <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider w-fit
                                    ${order.reschedule_status === 'APPROVED' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                                      order.reschedule_status === 'PENDING' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse' :
                                      'bg-red-500/10 border-red-500/20 text-red-400'}`}
                                >
                                    Reschedule: {order.reschedule_status.replace('_', ' ')}
                                    {order.reschedule_status === 'PENDING' && " (Awaiting approval)"}
                                </div>
                                {order.reschedule_status === 'REJECTED' && order.reschedule_rejection_reason && (
                                    <p className="text-xs text-red-400 font-medium text-left mt-1">
                                        Reason: <span className="italic">"{order.reschedule_rejection_reason}"</span>
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="text-xs text-slate-500">Need to change your schedule?</div>
                        )}
                        
                        {['PAID', 'QUEUED'].includes(order.state) && 
                         order.reschedule_status !== 'PENDING' && 
                         (order.reschedule_count || 0) < 1 &&
                         (!order.scheduled_start_time || new Date(order.scheduled_start_time) > new Date()) && (
                            <button
                                onClick={() => setShowRescheduleModal(true)}
                                className="bg-primary-500 hover:bg-primary-400 text-dark-900 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-primary-500/10 transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
                            >
                                <Clock size={14} /> Reschedule Order
                            </button>
                        )}
                    </div>

                    {/* Reschedule Request History */}
                    {order.reschedule_requests && order.reschedule_requests.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-white/5 text-left">
                            <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider mb-3 font-mono">Schedule Change History</h4>
                            <div className="space-y-2">
                                {order.reschedule_requests.map((req, idx) => (
                                    <div key={req.id || idx} className="bg-dark-950/40 border border-white/5 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-400">Proposed Time:</span>
                                                <span className="font-bold text-white">
                                                    {new Date(req.requested_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            {req.status === 'REJECTED' && req.rejection_reason && (
                                                <p className="text-[11px] text-red-400 font-medium mt-1">
                                                    Reason: <span className="italic">"{req.rejection_reason}"</span>
                                                </p>
                                            )}
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider w-fit shrink-0 border
                                            ${req.status === 'APPROVED' ? 'bg-green-500/15 border-green-500/25 text-green-400' :
                                              req.status === 'PENDING' ? 'bg-amber-500/15 border-amber-500/25 text-amber-400 animate-pulse' :
                                              'bg-red-500/15 border-red-500/25 text-red-400'}`}
                                        >
                                            {req.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Handoff Verification Code (Refined visibility) */}
            {((order.fulfillment_mode === 'DELIVERY' && order.state === 'OUT_FOR_DELIVERY') ||
              (['PICKUP', 'TAKEAWAY'].includes(order.fulfillment_mode) && order.state === 'READY')) && (
                <div className="glass-dark border border-primary-500/20 bg-primary-500/5 rounded-2xl md:rounded-3xl p-6 mb-8 shadow-xl text-center">
                    <h3 className="text-sm md:text-lg font-black text-primary-400 mb-2 uppercase tracking-wider">Handoff Verification Code</h3>
                    <p className="text-xs text-slate-400 mb-4">Please give this code to the driver or cashier to complete your order handoff.</p>
                    <div className="bg-dark-950/60 inline-block px-8 py-3 rounded-2xl border border-white/10">
                        <span className="text-3xl font-black font-mono tracking-widest text-primary-500">{order.delivery_code || '------'}</span>
                    </div>
                </div>
            )}

            {/* Order Items summary */}
            <div className="glass-dark border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-8 mb-8 shadow-xl">
                <h3 className="text-sm md:text-lg font-bold text-white mb-6 border-b border-white/5 pb-4">Order Details</h3>
                <div className="space-y-3 mb-6">
                    {(Array.isArray(order.items) ? order.items : []).map(item => (
                        <div key={item.id} className="flex justify-between items-center text-xs md:text-sm text-slate-300 bg-dark-900/50 p-3 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2">
                                <span className="font-black text-primary-500 w-6">{item.quantity}x</span>
                                <span className="font-medium text-slate-200">{item.product?.name || 'Item'}</span>
                            </div>
                            <span className="text-white font-bold">{formatPrice(item.unit_price * item.quantity)}</span>
                        </div>
                    ))}
                </div>

                {order.delivery_fee > 0 && (
                    <div className="flex justify-between items-center px-3 mb-4 text-xs md:text-sm">
                        <span className="text-slate-400">Delivery Fee</span>
                        <span className="text-primary-400 font-bold">+{formatPrice(order.delivery_fee)}</span>
                    </div>
                )}

                <div className="pt-4 border-t border-white/10 flex justify-between items-center mt-2">
                    <span className="text-slate-400 text-sm md:text-base font-medium">Total Paid</span>
                    <span className="text-xl md:text-3xl font-black tracking-tight text-white">{formatPrice(order.total_amount)}</span>
                </div>
            </div>

            {/* Display Review if it exists */}
            {order.has_review && order.review_details && (
                <div className="glass-dark border border-yellow-500/20 rounded-2xl md:rounded-3xl p-4 md:p-8 bg-yellow-500/5 shadow-xl">
                    <h3 className="text-sm md:text-lg font-bold text-yellow-500 mb-4 flex items-center gap-2">
                        <Star size={20} className="fill-current" /> Your Feedback
                    </h3>
                    <div className="flex gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map(star => (
                            <Star key={star} size={16} className={order.review_details.rating >= star ? 'text-yellow-400 fill-current' : 'text-slate-700'} />
                        ))}
                    </div>
                    {order.review_details.comment && (
                        <p className="text-slate-300 text-sm italic leading-relaxed">
                            "{order.review_details.comment}"
                        </p>
                    )}
                    <p className="text-[10px] text-slate-500 mt-4 font-medium uppercase tracking-wider">
                        Submitted on {new Date(order.review_details.created_at).toLocaleDateString()}
                    </p>
                </div>
            )}

            {/* Review Modal */}
            <AnimatePresence>
                {showReviewModal && !reviewSubmitted && (order.state === 'COMPLETED') && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="bg-dark-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
                        >
                            <h2 className="text-2xl font-bold text-white mb-2 text-center">Rate Your Experience</h2>
                            <p className="text-slate-400 text-center text-sm mb-6">How was your order from {order.store_name || `Store #${order.store}`}?</p>
                            <div className="flex justify-center gap-2 mb-6">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button key={star} onClick={() => setRating(star)} className={`p-2 transition-transform hover:scale-110 ${rating >= star ? 'text-yellow-400' : 'text-slate-600'}`}>
                                        <svg className="w-10 h-10 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                                    </button>
                                ))}
                            </div>
                            <textarea
                                value={comment} onChange={(e) => setComment(e.target.value)}
                                placeholder="Leave a comment..."
                                className="w-full bg-dark-950 border border-white/10 rounded-xl p-4 text-slate-200 focus:border-primary-500 transition-all resize-none mb-6 h-24"
                                required
                            ></textarea>
                            <div className="flex gap-4">
                                <button onClick={() => setShowReviewModal(false)} className="flex-1 py-3 text-slate-400 hover:text-white transition-colors font-medium">Dismiss</button>
                                <button onClick={submitReview} className="flex-1 bg-primary-500 hover:bg-primary-400 text-dark-900 font-bold py-3 rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all transform hover:-translate-y-1">Submit Review</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Preorder Reschedule Modal */}
            <AnimatePresence>
                {showRescheduleModal && (
                    <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-dark-900 border border-white/10 w-full max-w-md rounded-3xl p-6 shadow-2xl relative text-left"
                        >
                            <button onClick={() => setShowRescheduleModal(false)} className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
                            
                            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-6">Reschedule Preorder</h3>

                            <div className="bg-primary-500/10 border border-primary-500/20 p-4 rounded-2xl mb-6">
                                <p className="text-[10px] text-primary-400 font-black uppercase tracking-wider mb-1">Current Expected Time</p>
                                <p className="text-sm font-bold text-white">{new Date(order.scheduled_time).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>

                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const newTime = e.target.new_time.value;
                                if (!newTime) return toast.error("Please pick a new schedule time.");

                                const tid = toast.loading("Submitting reschedule request...");
                                apiClient.post(`/orders/${order.id}/request_reschedule/`, {
                                    scheduled_time: newTime
                                }).then(res => {
                                    toast.success("Reschedule request submitted successfully! Pending vendor approval.", { id: tid });
                                    setShowRescheduleModal(false);
                                    fetchOrder();
                                }).catch(err => {
                                    const msg = err.response?.data?.error || "Rescheduling failed.";
                                    toast.error(msg, { id: tid });
                                });
                            }} className="space-y-6">
                                <div>
                                    <label className="block text-xs text-slate-400 font-bold uppercase mb-2">New Expected Time</label>
                                    <input 
                                        type="datetime-local"
                                        name="new_time"
                                        required
                                        className="w-full bg-dark-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 text-sm font-medium"
                                        style={{ colorScheme: 'dark' }}
                                        min={new Date().toISOString().slice(0, 16)}
                                    />
                                </div>

                                <div className="p-4 bg-primary-500/5 border border-primary-500/10 rounded-2xl flex gap-3">
                                    <AlertCircle className="text-primary-400 shrink-0" size={18} />
                                    <p className="text-[11px] text-slate-400 leading-relaxed">
                                        Your request is sent to the restaurant for review. We validate that the kitchen has enough time to prepare your food before confirming.
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setShowRescheduleModal(false)} className="flex-1 py-3 rounded-xl bg-dark-800 font-bold hover:bg-dark-700 text-sm transition-colors text-white">Cancel</button>
                                    <button 
                                        type="submit" 
                                        className="flex-1 py-3 rounded-xl bg-primary-500 text-dark-950 font-black hover:bg-primary-400 text-sm uppercase tracking-wider shadow-lg shadow-primary-500/20 transition-all cursor-pointer"
                                    >
                                        Request Change
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
