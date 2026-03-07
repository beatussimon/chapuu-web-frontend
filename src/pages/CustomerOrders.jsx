import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { motion } from 'framer-motion';
import { ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react';
import { useCurrency } from '../utils/useCurrency';

export default function CustomerOrders() {
    const [allOrders, setAllOrders] = useState([]);
    const [displayedOrders, setDisplayedOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const navigate = useNavigate();
    const { formatPrice } = useCurrency();

    useEffect(() => {
        apiClient.get('/orders/')
            .then(res => {
                const sorted = res.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                setAllOrders(sorted);
                setDisplayedOrders(sorted.slice(0, ITEMS_PER_PAGE));
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load orders", err);
                setLoading(false);
            });
    }, []);

    // Intersection Observer for Infinite Scroll
    const handleObserver = (entities) => {
        const target = entities[0];
        if (target.isIntersecting && displayedOrders.length < allOrders.length) {
            const nextPage = page + 1;
            setPage(nextPage);
            setDisplayedOrders(allOrders.slice(0, nextPage * ITEMS_PER_PAGE));
        }
    };

    useEffect(() => {
        const observer = new IntersectionObserver(handleObserver, { root: null, rootMargin: '20px', threshold: 1.0 });
        const loaderNode = document.getElementById('scroll-loader');
        if (loaderNode) observer.observe(loaderNode);
        return () => { if (loaderNode) observer.unobserve(loaderNode); };
    }, [displayedOrders, allOrders, page]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-200px)]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto py-8 text-white px-4">
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <ShoppingBag size={28} className="text-primary-500" /> My Orders
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">View your order history and track active deliveries.</p>
                </div>
            </div>

            {displayedOrders.length === 0 ? (
                <div className="glass-dark border border-white/10 rounded-3xl p-12 text-center shadow-xl">
                    <ShoppingBag size={48} className="mx-auto text-slate-600 mb-4" />
                    <h2 className="text-xl font-bold mb-2">No orders yet</h2>
                    <p className="text-slate-400 mb-6">Looks like you haven't placed any orders. Discover great food nearby!</p>
                    <Link to="/stores" className="inline-block bg-primary-500 hover:bg-primary-400 text-dark-900 font-bold py-3 px-6 rounded-xl transition-all">
                        Browse Restaurants
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {displayedOrders.map(order => (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={order.id}
                            className="glass-dark border border-white/10 hover:border-primary-500/30 rounded-2xl p-6 transition-all group shadow-xl"
                        >
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-bold">Order #{order.id}</h3>
                                        <span className={`px-2 py-1 bg-white/10 rounded-lg text-xs font-semibold
                                            ${order.state === 'CANCELLED' ? 'text-red-400' : ''}
                                            ${order.state === 'COMPLETED' ? 'text-green-400' : ''}
                                            ${order.state === 'AWAITING_PAYMENT' ? 'text-orange-400' : ''}
                                            ${['QUEUED', 'PREPARING'].includes(order.state) ? 'text-indigo-400' : ''}
                                            ${order.state === 'READY' ? 'text-teal-400' : ''}
                                        `}>
                                            {order.state.replace('_', ' ')}
                                        </span>
                                        <span className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded-lg">
                                            {order.fulfillment_mode.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-400">
                                        {new Date(order.created_at).toLocaleString()}
                                    </p>
                                    <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                                        {order.items.map((item, idx) => (
                                            <span key={idx} className="whitespace-nowrap text-xs bg-dark-900 border border-white/5 text-slate-300 px-2 py-1 rounded-md">
                                                {item.quantity}x {item.product?.name || 'Item'}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex md:flex-col items-center justify-between w-full md:w-auto gap-4">
                                    <div className="text-xl font-bold text-primary-400">{formatPrice(order.total_amount)}</div>
                                    <Link
                                        to={`/order/track/${order.id}`}
                                        className="flex items-center gap-2 text-sm font-medium text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-colors group-hover:bg-primary-500 group-hover:text-dark-900 shadow-lg"
                                    >
                                        View Details <ArrowRight size={16} />
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {/* Infinite Scroll Trigger */}
                    {displayedOrders.length < allOrders.length && (
                        <div id="scroll-loader" className="h-10 mt-4 flex justify-center items-center">
                            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
