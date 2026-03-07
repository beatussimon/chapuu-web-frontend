import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Utensils, CheckCircle, Clock } from 'lucide-react';
import apiClient from '../api/client';
import { formatPriceStatic } from '../utils/useCurrency';

export default function PublicDisplay() {
    const { storeId } = useParams();
    const navigate = useNavigate();

    const [storeName, setStoreName] = useState('');
    const [orders, setOrders] = useState([]);
    const [ads, setAds] = useState([]);
    const [featuredProducts, setFeaturedProducts] = useState([]);

    // Cycle state: 0 = Queue Board, 1 = Ad/Featured Board
    const [viewMode, setViewMode] = useState(0);
    const [currentAdIndex, setCurrentAdIndex] = useState(0);

    const fetchData = async () => {
        try {
            if (storeId) {
                const storeRes = await apiClient.get(`/stores/${storeId}/`);
                setStoreName(storeRes.data.name);
            }

            // Fetch live KDS orders for the store
            const orderRes = await apiClient.get(storeId ? `/orders/?store=${storeId}` : '/orders/');
            // Only show active kitchen orders (exclude delivery/cart states)
            const activeOrders = orderRes.data.filter(o => ['QUEUED', 'PREPARING', 'READY'].includes(o.state));
            setOrders(activeOrders);

            // Fetch ads 
            const adsRes = await apiClient.get(storeId ? `/ads/?store=${storeId}` : '/ads/');
            setAds(adsRes.data);

            // Fetch featured products (just taking top 4 for now)
            const prodRes = await apiClient.get(storeId ? `/products/?store=${storeId}` : '/products/');
            if (prodRes.data.length > 0) {
                // simple deterministic shuffle / slice
                setFeaturedProducts(prodRes.data.slice(0, 4));
            }

        } catch (error) {
            console.error("Failed fetching TV data:", error);
        }
    };

    useEffect(() => {
        fetchData();
        const dataInterval = setInterval(fetchData, 15000); // 15 sec Polling

        // Cycle View Logic (10 seconds order board, 10 seconds ad board)
        const viewInterval = setInterval(() => {
            setViewMode(prev => {
                if (prev === 0 && ads.length > 0) {
                    // Switch to ad mode, increment ad
                    setCurrentAdIndex(idx => (idx + 1) % ads.length);
                    return 1;
                }
                return 0;
            });
        }, 12000);

        return () => {
            clearInterval(dataInterval);
            clearInterval(viewInterval);
        };
    }, [storeId, ads.length]);

    const queued = orders.filter(o => o.state === 'QUEUED').slice(0, 6);
    const preparing = orders.filter(o => o.state === 'PREPARING').slice(0, 6);
    const ready = orders.filter(o => o.state === 'READY').reverse();

    return (
        <div className="w-full h-screen bg-dark-950 text-white overflow-hidden flex flex-col relative select-none">
            {/* Header / Brand Bar */}
            <div className="h-20 bg-dark-900 border-b border-white/5 flex items-center justify-between px-8 shadow-xl z-20">
                <div className="flex items-center gap-4">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                        className="bg-primary-500/20 p-3 rounded-2xl"
                    >
                        <Utensils className="text-primary-500" size={32} />
                    </motion.div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">{storeName || 'Global Queue'}</h1>
                        <p className="text-slate-400 font-medium tracking-widest uppercase text-sm">Live Order Status</p>
                    </div>
                </div>

                <div className="text-right">
                    <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="flex items-center gap-2 text-green-400 font-bold text-xl"
                    >
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        LIVE UPDATE
                    </motion.div>
                </div>
            </div>

            {/* Main Stage */}
            <div className="flex-1 relative">
                <AnimatePresence mode="wait">
                    {viewMode === 0 ? (
                        <motion.div
                            key="queue-board"
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 50 }}
                            className="absolute inset-0 grid grid-cols-3 gap-8 p-8"
                        >
                            {/* QUEUED COLUMN */}
                            <div className="glass flex flex-col rounded-3xl overflow-hidden border border-white/5">
                                <div className="bg-slate-800/50 py-4 px-6 border-b border-white/5 flex items-center gap-3">
                                    <Clock size={28} className="text-slate-400" />
                                    <h2 className="text-2xl font-bold uppercase tracking-widest text-slate-300">Queued</h2>
                                </div>
                                <div className="flex-1 p-6 space-y-4">
                                    {queued.map(o => (
                                        <div key={o.id} className="bg-dark-900/50 p-6 rounded-2xl border border-white/5 shadow-lg flex justify-between items-center">
                                            <span className="text-4xl font-black font-mono tracking-tighter text-slate-400">#{o.id}</span>
                                        </div>
                                    ))}
                                    {queued.length === 0 && <p className="text-slate-600 text-center mt-10 text-xl font-bold">No orders queued</p>}
                                </div>
                            </div>

                            {/* PREPARING COLUMN */}
                            <div className="glass flex flex-col rounded-3xl overflow-hidden border border-white/5">
                                <div className="bg-orange-500/10 py-4 px-6 border-b border-orange-500/20 flex items-center gap-3">
                                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }}>
                                        <Utensils size={28} className="text-orange-400" />
                                    </motion.div>
                                    <h2 className="text-2xl font-bold uppercase tracking-widest text-orange-400">Cooking</h2>
                                </div>
                                <div className="flex-1 p-6 space-y-4">
                                    {preparing.map(o => (
                                        <motion.div
                                            key={o.id}
                                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                            className="bg-orange-500/5 p-6 rounded-2xl border border-orange-500/20 shadow-lg flex justify-between items-center"
                                        >
                                            <span className="text-4xl font-black font-mono tracking-tighter text-orange-300">#{o.id}</span>
                                            <span className="text-sm font-bold text-orange-500/60 uppercase tracking-widest animate-pulse">Prep</span>
                                        </motion.div>
                                    ))}
                                    {preparing.length === 0 && <p className="text-slate-600 text-center mt-10 text-xl font-bold">Kitchen is clear</p>}
                                </div>
                            </div>

                            {/* READY COLUMN */}
                            <div className="glass flex flex-col rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(34,197,94,0.1)] border-t-[6px] border-t-green-500">
                                <div className="bg-green-500/10 py-6 px-6 border-b border-green-500/20 flex items-center gap-3 justify-center">
                                    <CheckCircle size={40} className="text-green-500" />
                                    <h2 className="text-4xl font-black uppercase tracking-widest text-green-400">Please Collect</h2>
                                </div>
                                <div className="flex-1 p-6 flex flex-wrap gap-4 align-start content-start">
                                    {ready.map(o => (
                                        <motion.div
                                            key={o.id}
                                            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                            className="bg-green-500 w-[47%] py-8 rounded-2xl shadow-[0_10px_30px_rgba(34,197,94,0.3)] flex justify-center items-center"
                                        >
                                            <span className="text-5xl font-black font-mono tracking-tighter text-dark-900 drop-shadow-md">#{o.id}</span>
                                        </motion.div>
                                    ))}
                                    {ready.length === 0 && <p className="text-slate-600 text-center w-full mt-10 text-2xl font-bold">No completed orders</p>}
                                </div>
                            </div>

                        </motion.div>
                    ) : (
                        <motion.div
                            key={`ad-board-${currentAdIndex}`}
                            initial={{ opacity: 0, scale: 1.05 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1 }}
                            className="absolute inset-0 flex items-center justify-center p-12"
                        >
                            {ads.length > 0 && ads[currentAdIndex].media ? (
                                <div className="w-full h-full relative rounded-[3rem] overflow-hidden shadow-2xl border border-white/10">
                                    <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-transparent to-transparent z-10"></div>
                                    {ads[currentAdIndex].media.endsWith('.mp4') ? (
                                        <video src={ads[currentAdIndex].media} autoPlay muted loop className="w-full h-full object-cover" />
                                    ) : (
                                        <img src={ads[currentAdIndex].media} alt="Ad" className="w-full h-full object-cover" />
                                    )}
                                    <div className="absolute bottom-12 left-12 z-20">
                                        <h2 className="text-6xl font-black drop-shadow-2xl">{ads[currentAdIndex].title}</h2>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-4xl font-bold text-slate-500">Promotions Array Empty</div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Ticker / Footer */}
            <div className="h-12 bg-primary-600 flex items-center overflow-hidden z-20">
                <motion.div
                    animate={{ x: ["100%", "-100%"] }}
                    transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
                    className="whitespace-nowrap flex gap-12 font-bold tracking-widest text-lg drop-shadow-md text-dark-900"
                >
                    {featuredProducts.length > 0 ? featuredProducts.map((p, i) => (
                        <span key={i}>★ TRY OUR {p.name.toUpperCase()} FOR {formatPriceStatic(p.price)} ★</span>
                    )) : (
                        <span>★ ORDER AT THE COUNTER OR SCAN YOUR TABLE'S QR CODE ★</span>
                    )}
                </motion.div>
            </div>

        </div>
    );
}
