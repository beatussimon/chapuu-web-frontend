import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Utensils, CheckCircle, Clock, Wifi, WifiOff } from 'lucide-react';
import apiClient, { getWebSocketURL } from '../api/client';
import { formatPriceStatic } from '../utils/useCurrency';
import OptimizedImage from '../components/OptimizedImage';

export default function PublicDisplay() {
    const { storeId } = useParams();
    const navigate = useNavigate();

    const [storeName, setStoreName] = useState('');
    const [orders, setOrders] = useState([]);
    const [ads, setAds] = useState([]);
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [wsConnected, setWsConnected] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Cycle state: 0 = Queue Board, 1 = Ad/Featured Board
    const [viewMode, setViewMode] = useState(0);
    const [currentAdIndex, setCurrentAdIndex] = useState(0);

    const prevReadyIdsRef = useRef(new Set());
    const adsRef = useRef([]);

    useEffect(() => {
        adsRef.current = ads;
    }, [ads]);

    const playReadyChime = () => {
        try {
            const chime = new Audio('/media/sounds/chapuunotification.mp3');
            chime.volume = 0.4;
            chime.play().catch(err => {
                // Fallback to public web sfx if local file fails/is blocked
                const fallbackChime = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                fallbackChime.volume = 0.4;
                fallbackChime.play().catch(() => {});
            });
        } catch (e) {}
    };

    const fetchData = async () => {
        try {
            if (storeId) {
                const storeRes = await apiClient.get(`/stores/${storeId}/`);
                setStoreName(storeRes.data.name);
            }

            // Fetch live KDS orders for the store
            const orderRes = await apiClient.get(storeId ? `/orders/?store=${storeId}` : '/orders/');
            
            // Support paginated responses or direct array responses
            const orderData = Array.isArray(orderRes.data.results) ? orderRes.data.results 
                             : (Array.isArray(orderRes.data) ? orderRes.data : []);
                             
            // Exclude paid/completed orders (only QUEUED, PREPARING, READY are active on TV board)
            const activeOrders = orderData.filter(o => ['QUEUED', 'PREPARING', 'READY'].includes(o.state));
            setOrders(activeOrders);

            // Audio Chime Logic: Play sound when a new READY order appears
            const currentReadyOrders = activeOrders.filter(o => o.state === 'READY');
            const currentReadyIds = new Set(currentReadyOrders.map(o => o.id));
            if (prevReadyIdsRef.current.size > 0) {
                const newReadyFound = [...currentReadyIds].some(id => !prevReadyIdsRef.current.has(id));
                if (newReadyFound) {
                    playReadyChime();
                }
            }
            prevReadyIdsRef.current = currentReadyIds;

            // Fetch ads 
            const adsRes = await apiClient.get(storeId ? `/ads/?store=${storeId}` : '/ads/');
            const adsData = Array.isArray(adsRes.data.results) ? adsRes.data.results 
                          : (Array.isArray(adsRes.data) ? adsRes.data : []);
            setAds(adsData);

            // Fetch featured products (just taking top 4 for now)
            const prodRes = await apiClient.get(storeId ? `/products/?store=${storeId}` : '/products/');
            const prodData = Array.isArray(prodRes.data.results) ? prodRes.data.results 
                           : (Array.isArray(prodRes.data) ? prodRes.data : []);
            if (prodData.length > 0) {
                setFeaturedProducts(prodData.slice(0, 4));
            }

        } catch (error) {
            console.error("Failed fetching TV data:", error);
        }
    };

    // Live clock update
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Websocket Connection
    useEffect(() => {
        fetchData();
        
        let socket = null;
        let reconnectTimeout = null;

        const connectWS = () => {
            const path = storeId ? `/ws/orders/${storeId}/` : '/ws/orders/';
            const url = getWebSocketURL(path);
            socket = new WebSocket(url);

            socket.onopen = () => {
                console.log("[TV WS] Connected");
                setWsConnected(true);
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'order_update') {
                        fetchData();
                    }
                } catch (e) { console.error("[TV WS] Parse error", e); }
            };

            socket.onclose = () => {
                setWsConnected(false);
                reconnectTimeout = setTimeout(connectWS, 5000);
            };

            socket.onerror = (err) => {
                console.error("[TV WS] Error", err);
                if (socket) socket.close();
            };
        };

        connectWS();

        return () => {
            if (socket) {
                socket.onclose = null;
                socket.onerror = null;
                socket.close();
            }
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
        };
    }, [storeId]);

    // Active polling fallback only if WS is disconnected
    useEffect(() => {
        let poll = null;
        if (!wsConnected) {
            console.log("[TV] WS Offline. Falling back to 30s polling.");
            poll = setInterval(fetchData, 30000);
        }
        return () => {
            if (poll) clearInterval(poll);
        };
    }, [wsConnected, storeId]);

    // Cycle View Logic (12 seconds order board, 12 seconds ad board)
    useEffect(() => {
        const viewInterval = setInterval(() => {
            const currentAds = adsRef.current;
            setViewMode(prev => {
                if (prev === 0 && currentAds.length > 0) {
                    // Switch to ad mode, increment ad
                    setCurrentAdIndex(idx => (idx + 1) % currentAds.length);
                    return 1;
                }
                return 0; // If prev is 1 or no ads, stay/switch to queue board (0)
            });
        }, 12000);

        return () => clearInterval(viewInterval);
    }, []);

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
                        <h1 className="text-xl md:text-3xl font-black tracking-tight">{storeName || 'Global Queue'}</h1>
                        <p className="text-slate-400 font-medium tracking-widest uppercase text-xs md:text-sm">Live Order Status</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Live Clock */}
                    <span className="text-2xl font-mono text-slate-300 font-bold bg-dark-950 px-4 py-1.5 rounded-xl border border-white/5 shadow-inner">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>

                    {/* WebSocket Connection Status */}
                    {wsConnected ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-xs font-bold">
                            <Wifi size={14} className="animate-pulse" /> Live
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full text-xs font-bold animate-pulse">
                            <WifiOff size={14} /> Offline (Polling)
                        </div>
                    )}
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
                            className="absolute inset-0 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 p-4 md:p-8 overflow-y-auto md:overflow-hidden"
                        >
                            {/* QUEUED COLUMN */}
                            <div className="glass flex flex-col rounded-3xl overflow-hidden border border-white/5 min-h-[250px] md:min-h-0">
                                <div className="bg-slate-800/50 py-4 px-6 border-b border-white/5 flex items-center gap-3">
                                    <Clock size={28} className="text-slate-400" />
                                    <h2 className="text-xl md:text-2xl font-bold uppercase tracking-widest text-slate-300">Queued</h2>
                                </div>
                                <div className="flex-1 p-6 space-y-4 overflow-y-auto custom-scrollbar">
                                    {(Array.isArray(queued) ? queued : []).map(o => (
                                        <div key={o.id} className="bg-dark-900/50 p-6 rounded-2xl border border-white/5 shadow-lg flex justify-between items-center text-left">
                                            <span className="text-4xl font-black font-mono tracking-tighter text-slate-400">#{o.id}</span>
                                            <div className="text-right">
                                                <span className="text-lg font-bold text-slate-300 block">{o.customer_initial || 'A.'}</span>
                                                {o.table_number && <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mt-0.5">Table {o.table_number}</span>}
                                            </div>
                                        </div>
                                    ))}
                                    {queued.length === 0 && <p className="text-slate-600 text-center mt-10 text-xl font-bold">No orders queued</p>}
                                </div>
                            </div>

                            {/* PREPARING COLUMN */}
                            <div className="glass flex flex-col rounded-3xl overflow-hidden border border-white/5 min-h-[250px] md:min-h-0">
                                <div className="bg-orange-500/10 py-4 px-6 border-b border-orange-500/20 flex items-center gap-3">
                                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }}>
                                        <Utensils size={28} className="text-orange-400" />
                                    </motion.div>
                                    <h2 className="text-xl md:text-2xl font-bold uppercase tracking-widest text-orange-400">Cooking</h2>
                                </div>
                                <div className="flex-1 p-6 space-y-4 overflow-y-auto custom-scrollbar">
                                    {(Array.isArray(preparing) ? preparing : []).map(o => (
                                        <motion.div
                                            key={o.id}
                                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                            className="bg-orange-500/5 p-6 rounded-2xl border border-orange-500/20 shadow-lg flex justify-between items-center text-left"
                                        >
                                            <span className="text-4xl font-black font-mono tracking-tighter text-orange-300">#{o.id}</span>
                                            <div className="text-right">
                                                <span className="text-lg font-bold text-orange-400 block">{o.customer_initial || 'A.'}</span>
                                                {o.table_number && <span className="text-xs text-orange-500/65 font-bold uppercase tracking-wider block mt-0.5">Table {o.table_number}</span>}
                                            </div>
                                        </motion.div>
                                    ))}
                                    {preparing.length === 0 && <p className="text-slate-600 text-center mt-10 text-xl font-bold">Kitchen is clear</p>}
                                </div>
                            </div>

                            {/* READY COLUMN */}
                            <div className="glass flex flex-col rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(34,197,94,0.1)] border-t-[6px] border-t-green-500 min-h-[250px] md:min-h-0">
                                <div className="bg-green-500/10 py-6 px-6 border-b border-green-500/20 flex items-center gap-3 justify-center">
                                    <CheckCircle size={40} className="text-green-500" />
                                    <h2 className="text-2xl md:text-4xl font-black uppercase tracking-widest text-green-400">Please Collect</h2>
                                </div>
                                <div className="flex-1 p-6 flex flex-wrap gap-4 align-start content-start overflow-y-auto custom-scrollbar">
                                    {(Array.isArray(ready) ? ready : []).map(o => (
                                        <motion.div
                                            key={o.id}
                                            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                            className="bg-green-500 w-[47%] py-6 px-4 rounded-2xl shadow-[0_10px_30px_rgba(34,197,94,0.3)] flex justify-between items-center text-left"
                                        >
                                            <span className="text-5xl font-black font-mono tracking-tighter text-dark-900 drop-shadow-md">#{o.id}</span>
                                            <div className="text-right">
                                                <span className="text-xl font-black text-dark-950 block">{o.customer_initial || 'A.'}</span>
                                                {o.table_number && <span className="text-xs text-dark-900/65 font-bold uppercase tracking-wider block mt-0.5">Table {o.table_number}</span>}
                                            </div>
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
                            className="absolute inset-0 flex items-center justify-center p-4 md:p-12"
                        >
                            {Array.isArray(ads) && ads.length > 0 && ads[currentAdIndex].media ? (
                                <div className="w-full h-full relative rounded-2xl md:rounded-[3rem] overflow-hidden shadow-2xl border border-white/10">
                                    <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-transparent to-transparent z-10"></div>
                                    {ads[currentAdIndex].media.endsWith('.mp4') ? (
                                        <video src={ads[currentAdIndex].media} autoPlay muted loop className="w-full h-full object-cover" />
                                    ) : (
                                        <OptimizedImage src={ads[currentAdIndex].media} alt="Ad" className="w-full h-full object-cover" wrapperClassName="w-full h-full" eager />
                                    )}
                                    <div className="absolute bottom-6 left-6 md:bottom-12 md:left-12 z-20">
                                        <h2 className="text-3xl md:text-6xl font-black drop-shadow-2xl">{ads[currentAdIndex].title}</h2>
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
                    {Array.isArray(featuredProducts) && featuredProducts.length > 0 ? featuredProducts.map((p, i) => (
                        <span key={i}>★ TRY OUR {p.name.toUpperCase()} FOR {formatPriceStatic(p.price)} ★</span>
                    )) : (
                        <span>★ ORDER AT THE COUNTER OR SCAN YOUR TABLE'S QR CODE ★</span>
                    )}
                </motion.div>
            </div>

        </div>
    );
}
