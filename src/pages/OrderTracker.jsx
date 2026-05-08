import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient, { getWebSocketURL } from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, CheckCircle2, Clock, CreditCard, ShoppingBag, ArrowLeft, RefreshCw, Truck, Package, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCurrency } from '../utils/useCurrency';

export default function OrderTracker() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const { formatPrice } = useCurrency();

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

        const wsUrl = getWebSocketURL('/ws/orders/');
        
        let socket = null;
        let reconnectTimeout = null;

        const connectWS = () => {
            console.log("[WS] Connecting to Tracker Socket...");
            socket = new WebSocket(wsUrl);

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'order_update' && data.message.order_id === parseInt(id)) {
                        console.log("[WS] Live update for this order:", data.message);
                        fetchOrder();
                    }
                } catch (e) { console.error("[WS] Error", e); }
            };

            socket.onclose = () => {
                reconnectTimeout = setTimeout(connectWS, 5000);
            };
        };

        if (id) connectWS();

        return () => {
            clearInterval(interval);
            if (socket) socket.close();
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
            case 'QUEUED': return 'Received & In Queue';
            case 'PREPARING': return 'Kitchen is Preparing';
            case 'READY': return order.fulfillment_mode === 'DELIVERY' ? 'Ready for Dispatch' : 'Ready for Pickup / Service';
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

            {/* Order Items summary */}
            <div className="glass-dark border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-8 mb-8 shadow-xl">
                <h3 className="text-sm md:text-lg font-bold text-white mb-6 border-b border-white/5 pb-4">Order Details</h3>
                <div className="space-y-3 mb-6">
                    {order.items.map(item => (
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
                                placeholder="Leave a comment (optional)..."
                                className="w-full bg-dark-950 border border-white/10 rounded-xl p-4 text-slate-200 focus:border-primary-500 transition-all resize-none mb-6 h-24"
                            ></textarea>
                            <div className="flex gap-4">
                                <button onClick={() => setShowReviewModal(false)} className="flex-1 py-3 text-slate-400 hover:text-white transition-colors font-medium">Dismiss</button>
                                <button onClick={submitReview} className="flex-1 bg-primary-500 hover:bg-primary-400 text-dark-900 font-bold py-3 rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all transform hover:-translate-y-1">Submit Review</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
