import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, CheckCircle2, Clock, CreditCard, ShoppingBag, ArrowLeft, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCurrency } from '../utils/useCurrency';

export default function OrderTracker() {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const { formatPrice } = useCurrency();

    // Review State
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [reviewSubmitted, setReviewSubmitted] = useState(false);

    const fetchOrder = () => {
        apiClient.get(`/orders/${id}/`)
            .then(res => {
                setOrder(res.data);
                setLoading(false);
                if (res.data.state === 'COMPLETED' && !reviewSubmitted) {
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
        }).catch(err => {
            console.error("Failed to submit review", err);
            toast.error("Could not submit review.");
        });
    }

    useEffect(() => {
        fetchOrder();
        const interval = setInterval(fetchOrder, 30000);
        return () => clearInterval(interval);
    }, [id]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-200px)]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    if (!order) {
        return <div className="text-center py-20 text-white">Order not found.</div>;
    }

    const stateFlow = ['CREATED', 'AWAITING_PAYMENT', 'PAID', 'QUEUED', 'PREPARING', 'READY', 'COMPLETED'];
    const currentStateIndex = stateFlow.indexOf(order.state);

    const getIcon = (state) => {
        switch (state) {
            case 'AWAITING_PAYMENT': return <CreditCard size={24} />;
            case 'QUEUED': return <Clock size={24} />;
            case 'PREPARING': return <ChefHat size={24} />;
            case 'READY': return <CheckCircle2 size={24} />;
            case 'COMPLETED': return <ShoppingBag size={24} />;
            default: return <Clock size={24} />;
        }
    };

    const getStatusText = (state) => {
        switch (state) {
            case 'AWAITING_PAYMENT': return 'Awaiting Payment Verification';
            case 'PAID':
            case 'QUEUED': return 'Received & In Queue';
            case 'PREPARING': return 'Kitchen is Preparing';
            case 'READY': return 'Ready for Pickup / Service';
            case 'COMPLETED': return 'Completed';
            default: return 'Processing';
        }
    };

    const displayStates = ['AWAITING_PAYMENT', 'QUEUED', 'PREPARING', 'READY'];

    return (
        <div className="w-full max-w-3xl mx-auto py-8 px-4">

            <div className="flex items-center gap-4 mb-8">
                <Link to="/menu" className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        Track Order #{order.id}
                        <button onClick={fetchOrder} className="text-slate-500 hover:text-primary-500 transition-colors" title="Refresh">
                            <RefreshCw size={20} />
                        </button>
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">{order.store_name || `From Store #${order.store}`}</p>
                </div>
            </div>

            <div className="glass-dark border border-white/10 rounded-3xl p-8 mb-8 shadow-2xl">

                <h3 className="text-lg font-bold text-white mb-8 border-b border-white/5 pb-4">Live Status</h3>

                {/* Progress Bar & Steps */}
                <div className="relative flex flex-col md:flex-row justify-between gap-8 md:gap-0">
                    {/* Background Line */}
                    <div className="absolute left-[39px] md:left-0 top-0 md:top-[39px] bottom-0 md:bottom-auto w-1 md:w-full h-full md:h-1 bg-white/10 -z-10 rounded"></div>

                    {/* Progress Indicator Line */}
                    <div className="absolute left-[39px] md:left-0 top-0 md:top-[39px] bottom-0 md:bottom-auto w-1 md:h-1 bg-primary-500 transition-all duration-1000 -z-10 rounded shadow-[0_0_15px_rgba(249,115,22,0.5)]"
                        style={{
                            width: window.innerWidth >= 768 ? `${Math.max(0, (displayStates.indexOf(order.state === 'PAID' ? 'QUEUED' : order.state) / (displayStates.length - 1)) * 100)}%` : '4px',
                            height: window.innerWidth < 768 ? `${Math.max(0, (displayStates.indexOf(order.state === 'PAID' ? 'QUEUED' : order.state) / (displayStates.length - 1)) * 100)}%` : '4px'
                        }}
                    ></div>

                    {displayStates.map((state, idx) => {
                        const targetStateIndex = stateFlow.indexOf(state);
                        // PAID is essentially QUEUED visually
                        const activeIndex = order.state === 'PAID' ? stateFlow.indexOf('QUEUED') : currentStateIndex;

                        const isPast = activeIndex > targetStateIndex;
                        const isCurrent = activeIndex === targetStateIndex;
                        const isFuture = activeIndex < targetStateIndex;

                        return (
                            <div key={state} className={`flex md:flex-col items-center gap-6 md:gap-4 flex-1 ${isCurrent ? 'md:-mt-2 opacity-100' : 'opacity-50'}`}>
                                <motion.div
                                    animate={{ scale: isCurrent ? 1.2 : 1 }}
                                    className={`w-20 h-20 rounded-full flex items-center justify-center shrink-0 border-4 shadow-xl z-10 transition-colors duration-500
                                        ${isPast ? 'bg-primary-500 border-primary-600 text-dark-900 shadow-primary-500/30' :
                                            isCurrent ? 'bg-dark-900 border-primary-500 text-primary-500 shadow-primary-500/50' :
                                                'bg-dark-800 border-white/10 text-slate-500'}`}
                                >
                                    {getIcon(state)}
                                </motion.div>

                                <div className="text-left md:text-center mt-2">
                                    <h4 className={`font-bold transition-colors ${isCurrent ? 'text-primary-400 text-lg' : isPast ? 'text-white' : 'text-slate-500'}`}>
                                        {getStatusText(state)}
                                    </h4>
                                    {isCurrent && (
                                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-slate-400 mt-1">
                                            {state === 'AWAITING_PAYMENT' && "Waiting for restaurant to confirm payment..."}
                                            {state === 'QUEUED' && "Your ticket is on the board!"}
                                            {state === 'PREPARING' && "Chef is actively cooking!"}
                                            {state === 'READY' && "Enjoy your meal!"}
                                        </motion.p>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Order Items summary */}
            <div className="glass-dark border border-white/10 rounded-3xl p-6 md:p-8">
                <h3 className="text-lg font-bold text-white mb-6 border-b border-white/5 pb-4">Order Details</h3>

                <div className="space-y-4 mb-6">
                    {order.items.map(item => (
                        <div key={item.id} className="flex justify-between items-center text-slate-300 bg-dark-900/50 p-3 rounded-xl border border-white/5">
                            <div>
                                <span className="font-bold text-white w-8 inline-block">{item.quantity}x</span>
                                {item.product.name}
                            </div>
                            <span className="text-primary-400 font-semibold">{formatPrice(item.unit_price)}</span>
                        </div>
                    ))}
                </div>

                <div className="pt-4 border-t border-white/10 mt-4 text-sm text-slate-400 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                    <p>Placed: {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    {order.customer_phone && <p>Contact: {order.customer_phone}</p>}
                </div>

                <div className="pt-4 border-t border-white/10 flex justify-between items-center mt-2">
                    <span className="text-slate-400 font-medium">Total Paid</span>
                    <span className="text-2xl font-bold tracking-tight text-white">{formatPrice(order.total_amount)}</span>
                </div>
            </div>

            {/* Review Modal */}
            <AnimatePresence>
                {showReviewModal && !reviewSubmitted && (order.state === 'COMPLETED' || order.state === 'READY') && (
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
                                    <button
                                        key={star}
                                        onClick={() => setRating(star)}
                                        className={`p-2 transition-transform hover:scale-110 ${rating >= star ? 'text-yellow-400' : 'text-slate-600'}`}
                                    >
                                        <svg className="w-10 h-10 fill-current" viewBox="0 0 24 24">
                                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                        </svg>
                                    </button>
                                ))}
                            </div>

                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Leave a comment (optional)..."
                                className="w-full bg-dark-950 border border-white/10 rounded-xl p-4 text-slate-200 focus:border-primary-500 transition-all resize-none mb-6 h-24"
                            ></textarea>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowReviewModal(false)}
                                    className="flex-1 py-3 text-slate-400 hover:text-white transition-colors font-medium"
                                >
                                    Dismiss
                                </button>
                                <button
                                    onClick={submitReview}
                                    className="flex-1 bg-primary-500 hover:bg-primary-400 text-dark-900 font-bold py-3 rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all transform hover:-translate-y-1"
                                >
                                    Submit Review
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
