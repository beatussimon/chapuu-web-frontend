import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAppStore } from '../store/useStore';
import { CreditCard, ShoppingCart, MapPin, Store, Utensils, ArrowLeft, Send, ShoppingBag, Clock } from 'lucide-react';
import { useCurrency } from '../utils/useCurrency';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';
import OptimizedImage from '../components/OptimizedImage';

const orderSuccessChime = new Audio('/media/sounds/chapuunotification.mp3');
orderSuccessChime.preload = 'auto';
orderSuccessChime.volume = 0.25; // Balanced notification volume for order success confirmation

export default function Checkout() {
    const { cart, selectedStore, clearStoreCart, activeReservation, userRole } = useAppStore();
    const navigate = useNavigate();
    const { formatPrice } = useCurrency();

    const isShop = selectedStore?.store_type === 'SHOP';
    const defaultMode = isShop ? 'PICKUP' : (localStorage.getItem('scanned_table_id') ? 'DINE_IN' : 'TAKEAWAY');
    const [fulfillmentMode, setFulfillmentMode] = useState(defaultMode);
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(localStorage.getItem('scanned_table_id') || '');
    const [customerPhone, setCustomerPhone] = useState('');
    const [deliveryLocation, setDeliveryLocation] = useState('');
    const [deliveryLatitude, setDeliveryLatitude] = useState('');
    const [deliveryLongitude, setDeliveryLongitude] = useState('');
    const [deliveryDirections, setDeliveryDirections] = useState('');
    const [isLocatingCustomer, setIsLocatingCustomer] = useState(false);
    const [paymentMessage, setPaymentMessage] = useState('');
    const [paymentReceipt, setPaymentReceipt] = useState(null);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [isInstantPayment, setIsInstantPayment] = useState(false);

    // Scheduling States
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledTime, setScheduledTime] = useState('');
    const [prepTimeOption, setPrepTimeOption] = useState('DYNAMIC');
    const [scheduledStartTime, setScheduledStartTime] = useState('');

    // AI Recommendations
    const [recommendations, setRecommendations] = useState([]);

    useEffect(() => {
        if (isInstantPayment && fulfillmentMode === 'DELIVERY') {
            setFulfillmentMode(isShop ? 'PICKUP' : 'TAKEAWAY');
        }
    }, [isInstantPayment, isShop]);

    const triggerGeolocation = () => {
        if (navigator.geolocation) {
            setIsLocatingCustomer(true);
            const toastId = toast.loading("Automatically fetching your delivery coordinates for GPS accuracy...");
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setDeliveryLatitude(latitude.toFixed(6));
                    setDeliveryLongitude(longitude.toFixed(6));
                    
                    try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`, {
                            headers: { 'User-Agent': 'Chapuu-Checkout' }
                        });
                        const data = await res.json();
                        if (data && data.display_name) {
                            const shortName = data.display_name.split(',').slice(0, 3).join(',');
                            setDeliveryLocation(shortName);
                            toast.success(`Delivery address located: ${shortName}`, { id: toastId });
                        } else {
                            setDeliveryLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                            toast.success(`Located at your GPS coordinates`, { id: toastId });
                        }
                    } catch (err) {
                        setDeliveryLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                        toast.success(`Coordinates fetched successfully!`, { id: toastId });
                    } finally {
                        setIsLocatingCustomer(false);
                    }
                },
                (err) => {
                    toast.error("Could not fetch location automatically. Please enable location permissions.", { id: toastId });
                    setIsLocatingCustomer(false);
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        }
    };

    useEffect(() => {
        if (fulfillmentMode === 'DELIVERY' && !deliveryLocation) {
            triggerGeolocation();
        }
    }, [fulfillmentMode]);

    useEffect(() => {
        if (selectedStore) {
            apiClient.get(`/products/recommendations/?store=${selectedStore.id}`)
                .then(res => setRecommendations(Array.isArray(res.data) ? res.data : []))
                .catch(err => console.error("Could not fetch recommendations", err));
            apiClient.get(`/stores/${selectedStore.id}/tables/`)
                .then(res => setTables(Array.isArray(res.data) ? res.data : []))
                .catch(err => console.error("Could not fetch tables", err));
            
            // Re-fetch store details to get latest payment methods
            apiClient.get(`/stores/${selectedStore.id}/`)
                .then(res => {
                    // Update global state if data differs
                    useAppStore.getState().setSelectedStore(res.data);
                })
                .catch(err => console.error("Could not refresh store details", err));
        }
    }, [selectedStore?.id]); // Use .id to avoid infinite loops if object reference changes

    if (!selectedStore) {
        return <Navigate to="/stores" />;
    }

    const storeCart = (Array.isArray(cart) ? cart : []).filter(item => item.store?.id === selectedStore?.id);

    if (storeCart.length === 0) {
        return (
            <div className="w-full max-w-4xl mx-auto py-8 text-white min-h-[60vh] flex flex-col items-center justify-center">
                <ShoppingCart size={64} className="text-slate-600 mb-6" />
                <h2 className="text-2xl font-bold mb-2">Your Cart for {selectedStore.name} is Empty</h2>
                <p className="text-slate-400 mb-6">Looks like you haven't added anything from this store yet.</p>
                {cart.length > 0 ? (
                    <button onClick={() => navigate('/cart')} className="bg-primary-500 text-dark-950 font-bold px-6 py-3 rounded-xl transition-transform hover:-translate-y-1">
                        View Global Cart
                    </button>
                ) : (
                    <button onClick={() => navigate('/menu')} className="bg-primary-500 text-dark-950 font-bold px-6 py-3 rounded-xl transition-transform hover:-translate-y-1">
                        Browse Menu
                    </button>
                )}
            </div>
        );
    }

    const cartTotal = storeCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    const handleCheckout = () => {
        if (fulfillmentMode === 'DINE_IN' && !selectedTable) {
            const tableRequired = selectedStore?.requires_table_for_dine_in !== false;
            if (tableRequired) {
                toast.error("Please select a table to dine in.");
                return;
            }
        }

        if (fulfillmentMode === 'DELIVERY') {
            if (!customerPhone || !deliveryLocation) {
                toast.error("Please provide phone and delivery location.");
                return;
            }
        }

        if (!isInstantPayment && !paymentMessage.trim()) {
            toast.error("Please provide a Transaction ID or Proof of Payment.");
            return;
        }

        if (isScheduled) {
            if (!scheduledTime) {
                toast.error("Please select a target completion time for scheduling.");
                return;
            }
            const targetDate = new Date(scheduledTime);
            if (targetDate <= new Date()) {
                toast.error("Scheduled time must be in the future.");
                return;
            }
            if (prepTimeOption === 'CUSTOM') {
                if (!scheduledStartTime) {
                    toast.error("Please select a preparation start time.");
                    return;
                }
                const startDate = new Date(scheduledStartTime);
                if (startDate <= new Date()) {
                    toast.error("Preparation start time must be in the future.");
                    return;
                }
                if (startDate >= targetDate) {
                    toast.error("Preparation start time must be before the target delivery/pickup time.");
                    return;
                }
            }
        }

        setIsCheckingOut(true);
        const toastId = toast.loading('Placing your order...');

        const isReservationOrder = !!activeReservation;

        const payload = {
            store: selectedStore.id,
            fulfillment_mode: isReservationOrder ? 'RESERVATION' : fulfillmentMode,
            ...(fulfillmentMode === 'DINE_IN' && { table: selectedTable }),
            ...(fulfillmentMode === 'DELIVERY' && { 
                customer_phone: customerPhone, 
                delivery_location: deliveryLocation,
                delivery_latitude: deliveryLatitude,
                delivery_longitude: deliveryLongitude,
                delivery_directions: deliveryDirections
            }),
            payment_message: isInstantPayment ? `Instant Payment (Walk-in)` : paymentMessage,
            is_instant_payment: isInstantPayment,
            items: storeCart.map(i => ({ product: i.product.id, quantity: i.quantity, unit_price: i.product.price })),
            ...(isScheduled && {
                scheduled_time: new Date(scheduledTime).toISOString(),
                prep_time_option: prepTimeOption,
                ...(prepTimeOption === 'CUSTOM' && { scheduled_start_time: new Date(scheduledStartTime).toISOString() })
            })
        }

        if (isReservationOrder) {
            payload.reservation = activeReservation;
        }

        apiClient.post('/orders/', payload)
            .then(res => {
                const orderId = res.data.id;

                if (paymentReceipt) {
                    const formData = new FormData();
                    formData.append('payment_receipt', paymentReceipt);
                    return apiClient.patch(`/orders/${orderId}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
                        .then(() => res); // pass original response down chain
                }
                return res;
            })
            .then(res => {
                try {
                    // Trigger premium mobile haptic success vibration pattern (tactile double-pulse)
                    triggerHaptic(hapticPatterns.success);
                    
                    orderSuccessChime.currentTime = 0;
                    orderSuccessChime.play().catch(e => console.log("Audio play deferred until interaction", e));
                } catch (e) {
                    console.error("Audio/Haptic trigger failed", e);
                }

                toast.success('Order placed successfully!', { id: toastId });
                clearStoreCart(selectedStore.id);
                localStorage.removeItem('scanned_table_id'); // Clear table session on checkout
                useAppStore.setState({ activeReservation: null }); // Clear active reservation

                // Redirect to offline payment confirmation page
                navigate(`/order/confirmation/${res.data.id}`);
            })
            .catch(err => {
                console.error("Order creation failed payload:", err.response?.data);
                const errorMessage = err.response?.data?.detail
                    || (typeof err.response?.data === 'object' ? JSON.stringify(err.response.data) : err.message);
                toast.error("Checkout failed: " + errorMessage, { id: toastId, duration: 6000 });
                setIsCheckingOut(false);
            });
    }

    return (
        <div className="w-full max-w-4xl mx-auto py-8 text-white">
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate('/menu')}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-3xl font-bold">Checkout</h1>
                    <p className="text-slate-400 text-sm mt-1">Review your order details</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Order Summary Form */}
                <div className="space-y-6">
                    <div className="glass-dark border border-white/10 rounded-3xl p-6 shadow-xl">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Store size={20} className="text-primary-500" /> Options
                        </h2>

                        <div className="space-y-4">
                            {['SELLER', 'ADMIN', 'SUPERUSER', 'ACCOUNTANT', 'CHEF'].includes(userRole) && (
                                <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                                    <input
                                        type="checkbox"
                                        checked={isInstantPayment}
                                        onChange={(e) => setIsInstantPayment(e.target.checked)}
                                        className="w-5 h-5 accent-amber-500"
                                    />
                                    <div>
                                        <p className="text-sm font-bold text-amber-400">Walk-In / Pay on Spot</p>
                                        <p className="text-xs text-slate-400">
                                            Customer is physically present and paying now. Order goes directly to kitchen.
                                        </p>
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="text-sm font-medium text-slate-400 mb-2 block">Order Method</label>
                                {activeReservation ? (
                                    <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-dark-950">
                                            <Utensils size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-primary-400">Reservation Pre-order</p>
                                            <p className="text-xs text-slate-400 mt-0.5">Linked to reservation #{activeReservation}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {isShop ? (
                                            /* Shop modes: Pickup & Delivery */
                                            <>
                                                <button
                                                    onClick={() => setFulfillmentMode('PICKUP')}
                                                    className={`py-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-2 ${fulfillmentMode === 'PICKUP' ? 'bg-primary-500 text-dark-900 shadow-lg shadow-primary-500/20' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
                                                >
                                                    <ShoppingBag size={18} /> Pickup
                                                </button>
                                                <button
                                                    onClick={() => setFulfillmentMode('DELIVERY')}
                                                    className={`py-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-2 ${fulfillmentMode === 'DELIVERY' ? 'bg-primary-500 text-dark-900 shadow-lg shadow-primary-500/20' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
                                                >
                                                    <MapPin size={18} /> Delivery
                                                </button>
                                            </>
                                        ) : (
                                            /* Restaurant modes: Takeaway, Dine In, Delivery */
                                            <>
                                                <button
                                                    onClick={() => setFulfillmentMode('TAKEAWAY')}
                                                    className={`py-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-2 ${fulfillmentMode === 'TAKEAWAY' ? 'bg-primary-500 text-dark-900 shadow-lg shadow-primary-500/20' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
                                                >
                                                    <ShoppingCart size={18} /> Takeaway
                                                </button>
                                                <button
                                                    onClick={() => setFulfillmentMode('DINE_IN')}
                                                    className={`py-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-2 ${fulfillmentMode === 'DINE_IN' ? 'bg-primary-500 text-dark-900 shadow-lg shadow-primary-500/20' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
                                                >
                                                    <Utensils size={18} /> Dine In
                                                </button>
                                                <button
                                                    onClick={() => setFulfillmentMode('DELIVERY')}
                                                    className={`py-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-2 ${fulfillmentMode === 'DELIVERY' ? 'bg-primary-500 text-dark-900 shadow-lg shadow-primary-500/20' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
                                                >
                                                    <MapPin size={18} /> Delivery
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Scheduled for Later Toggle & Options */}
                            {!activeReservation && (
                                <div className="pt-4 border-t border-white/5 space-y-4">
                                    <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:bg-white/10 transition-colors" onClick={() => setIsScheduled(!isScheduled)}>
                                        <input
                                            type="checkbox"
                                            checked={isScheduled}
                                            onChange={(e) => setIsScheduled(e.target.checked)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-5 h-5 accent-primary-500 rounded-md"
                                        />
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-slate-200 flex items-center gap-2">
                                                <Clock size={16} className="text-primary-500" /> Schedule Order for Later
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                Place order now and receive/pickup at your preferred time.
                                            </p>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {isScheduled && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="space-y-4 overflow-hidden bg-dark-900/40 p-4 rounded-2xl border border-white/5"
                                            >
                                                <div>
                                                    <label className="text-sm font-medium text-slate-300 block mb-1">Target Delivery/Pickup Time</label>
                                                    <input
                                                        type="datetime-local"
                                                        value={scheduledTime}
                                                        onChange={(e) => setScheduledTime(e.target.value)}
                                                        className="w-full bg-dark-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-primary-500 transition-all"
                                                        style={{ colorScheme: 'dark' }}
                                                        required
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-sm font-medium text-slate-300 block mb-2">Preparation Strategy</label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setPrepTimeOption('DYNAMIC')}
                                                            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${prepTimeOption === 'DYNAMIC' ? 'bg-primary-500 text-dark-900 shadow-md' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
                                                        >
                                                            Dynamic (System Calcs)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setPrepTimeOption('CUSTOM')}
                                                            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${prepTimeOption === 'CUSTOM' ? 'bg-primary-500 text-dark-900 shadow-md' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
                                                        >
                                                            Custom Start Time
                                                        </button>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 mt-2">
                                                        {prepTimeOption === 'DYNAMIC' 
                                                            ? "The store will automatically start prep based on items' preparation time so it is ready on time."
                                                            : "Explicitly choose the time when the kitchen should start preparing your order."}
                                                    </p>
                                                </div>

                                                <AnimatePresence>
                                                    {prepTimeOption === 'CUSTOM' && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="space-y-1 mt-3"
                                                        >
                                                            <label className="text-sm font-medium text-slate-300 block mb-1">Start Prep Time</label>
                                                            <input
                                                                type="datetime-local"
                                                                value={scheduledStartTime}
                                                                onChange={(e) => setScheduledStartTime(e.target.value)}
                                                                className="w-full bg-dark-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-primary-500 transition-all"
                                                                style={{ colorScheme: 'dark' }}
                                                                required
                                                            />
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            <AnimatePresence>
                                {fulfillmentMode === 'DINE_IN' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-2 overflow-hidden mt-4 pt-4 border-t border-white/5"
                                    >
                                        <label className="text-sm font-medium text-slate-400">
                                            {selectedStore.requires_table_for_dine_in !== false ? "Select Table" : "Select Table (Optional)"}
                                        </label>
                                        <select
                                            value={selectedTable}
                                            onChange={(e) => setSelectedTable(e.target.value)}
                                            className="w-full bg-dark-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-primary-500 transition-all appearance-none"
                                        >
                                            {selectedStore.requires_table_for_dine_in !== false ? (
                                                <option value="" disabled>Choose your table...</option>
                                            ) : (
                                                <option value="">Sit Anywhere / Free Seating</option>
                                            )}
                                            {tables.map(t => (
                                                <option key={t.id} value={t.id}>Table {t.number} ({t.capacity} seats)</option>
                                            ))}
                                        </select>
                                    </motion.div>
                                )}

                                {fulfillmentMode === 'DELIVERY' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-4 overflow-hidden mt-4 pt-4 border-t border-white/5"
                                    >
                                        <div>
                                            <label className="text-sm font-medium text-slate-400">Phone Number</label>
                                            <input
                                                type="tel"
                                                value={customerPhone}
                                                onChange={(e) => setCustomerPhone(e.target.value)}
                                                placeholder="e.g. +254 700 000000"
                                                className="w-full mt-1 bg-dark-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-primary-500 transition-all"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-sm font-medium text-slate-400">Delivery Address (GPS Located)</label>
                                                <button
                                                    type="button"
                                                    onClick={triggerGeolocation}
                                                    className="text-xs text-primary-400 hover:underline font-bold bg-transparent border-0 cursor-pointer"
                                                    disabled={isLocatingCustomer}
                                                >
                                                    {isLocatingCustomer ? "Locating..." : "📍 Recenter GPS"}
                                                </button>
                                            </div>
                                            <textarea
                                                value={deliveryLocation}
                                                readOnly={true}
                                                placeholder={isLocatingCustomer ? "Auto-detecting your coordinates..." : "GPS coordinates required for delivery..."}
                                                rows="2"
                                                className="w-full bg-dark-950/60 border border-white/5 rounded-xl px-4 py-3 text-sm text-slate-400 focus:outline-none focus:border-primary-500 transition-all resize-none cursor-not-allowed select-none"
                                            ></textarea>

                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-slate-400">Delivery Directions & Landmarks</label>
                                            <textarea
                                                value={deliveryDirections}
                                                onChange={(e) => setDeliveryDirections(e.target.value)}
                                                placeholder="e.g. Opposite the main market, green gate, 2nd floor"
                                                rows="2"
                                                className="w-full mt-1 bg-dark-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-primary-500 transition-all resize-none"
                                            ></textarea>
                                            <p className="text-[10px] text-slate-500 mt-1">
                                                Provide rider instructions, building name, house number, or landmarks to ensure fast delivery.
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Vertical Cart Items list & Summary */}
                <div>
                    <div className="glass-dark border border-white/10 rounded-3xl p-6 shadow-xl sticky top-28">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
                            <ShoppingCart size={20} className="text-primary-500" /> Order Summary
                        </h2>

                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 mb-6">
                            {storeCart.map((item) => (
                                <div key={item.product.id} className="flex justify-between items-center text-sm py-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-white">{item.quantity}x</span>
                                        <span className="text-slate-300 line-clamp-1">{item.product.name}</span>
                                    </div>
                                    <span className="text-primary-400 font-semibold">{formatPrice(item.product.price * item.quantity)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 border-t border-white/10 space-y-3 mb-6">
                            <div className="flex items-center justify-between text-slate-400 text-sm">
                                <span>Subtotal</span>
                                <span>{formatPrice(cartTotal)}</span>
                            </div>
                            <div className="flex items-center justify-between text-white font-bold text-xl pt-2 border-t border-white/5">
                                <span>Total</span>
                                <span>{formatPrice(cartTotal)}</span>
                            </div>
                        </div>

                        <div className="mb-6 pt-4 border-t border-white/10">
                            {isInstantPayment ? (
                                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-2xl flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-dark-950">
                                        <CreditCard size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-green-400">Paid in Person</p>
                                        <p className="text-xs text-slate-400">This order will be marked as PAID immediately.</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-base font-bold mb-3 text-slate-200">Proof of Payment (Offline)</h3>
                                    
                                    {Array.isArray(selectedStore.payment_methods) && selectedStore.payment_methods.length > 0 ? (
                                        <div className="mb-6 space-y-4">
                                            <p className="text-xs text-slate-400">Transfer the total to a provider below, then upload proof.</p>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {selectedStore.payment_methods.map(pm => pm.is_active && (
                                                    <div key={pm.id} className="bg-dark-900/50 border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center shadow-xl">
                                                        {(pm.image_url || pm.image) && (
                                                            <div className="w-24 h-24 mb-3 rounded-xl bg-white flex items-center justify-center p-2 shrink-0 overflow-hidden shadow-inner">
                                                                <OptimizedImage 
                                                                    src={pm.image_url || pm.image} 
                                                                    alt={pm.provider} 
                                                                    className="w-full h-full object-contain"
                                                                    wrapperClassName="w-full h-full"
                                                                    eager
                                                                />
                                                            </div>
                                                        )}
                                                        
                                                        <h4 className="text-sm font-black text-primary-400 uppercase tracking-tighter mb-1">{pm.provider}</h4>
                                                        
                                                        {pm.account_name && (
                                                            <p className="text-[10px] text-slate-300 font-bold line-clamp-1 mb-2">{pm.account_name}</p>
                                                        )}
                                                        
                                                        {pm.account_number && (
                                                            <div className="w-full bg-dark-950 px-2 py-2 rounded-xl border border-white/5 mt-auto">
                                                                <p className="text-lg font-black font-mono text-white select-all tracking-tight leading-none">{pm.account_number}</p>
                                                                <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest mt-1">Lipa Number</p>
                                                            </div>
                                                        )}

                                                        {pm.instructions && (
                                                            <p className="text-[9px] text-slate-500 mt-2 italic line-clamp-2">{pm.instructions}</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 mb-4">Please transfer the Total amount to the restaurant natively (M-Pesa, Bank, Cash) and provide proof here to speed up approval.</p>
                                    )}

                                    <label className="text-sm font-medium text-slate-400 mb-1 block mt-2">Transaction ID / Message</label>
                                    <textarea
                                        value={paymentMessage}
                                        onChange={(e) => setPaymentMessage(e.target.value)}
                                        placeholder="e.g. Paid via M-Pesa. Ref: ABCD123456"
                                        rows="2"
                                        className="w-full mb-3 bg-dark-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-primary-500 transition-all resize-none"
                                    ></textarea>

                                    <label className="text-sm font-medium text-slate-400 mb-1 block">Payment Receipt (Optional Image)</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setPaymentReceipt(e.target.files[0])}
                                        className="w-full bg-dark-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-primary-500 transition-all file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-500/10 file:text-primary-500 hover:file:bg-primary-500/20"
                                    />
                                </>
                            )}
                        </div>

                        {/* AI Recommendations Section */}
                        {recommendations.length > 0 && (
                            <div className="mb-6 pt-4 border-t border-white/10">
                                <h3 className="text-sm font-bold mb-3 text-primary-400 flex items-center gap-2">
                                    <Utensils size={16} /> Frequently Bought Together
                                </h3>
                                <div className="space-y-3">
                                    {recommendations.map(rec => (
                                        <div key={rec.id} className="flex justify-between items-center bg-dark-950/50 p-3 rounded-xl border border-white/5 group">
                                            <div className="flex items-center gap-3">
                                                {rec.image_url ? (
                                                    <OptimizedImage src={rec.image_url} alt={rec.name} className="w-10 h-10 rounded-lg object-cover" wrapperClassName="w-10 h-10 rounded-lg" eager />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-dark-900 border border-white/5 flex items-center justify-center">
                                                        <Utensils size={16} className="text-white/20" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm text-white font-medium line-clamp-1">{rec.name}</p>
                                                    <p className="text-xs text-primary-500 font-bold">{formatPrice(rec.price)}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    triggerHaptic(hapticPatterns.light);
                                                    apiClient.get(`/products/${rec.id}/`).then(res => { // fetch full product if needed
                                                        useAppStore.getState().addToCart(res.data, 1);
                                                        toast.success(`Added ${res.data.name} to cart`);
                                                    })
                                                }}
                                                className="px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-primary-500 hover:text-dark-900 text-white rounded-lg transition-colors"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => {
                                triggerHaptic(hapticPatterns.medium);
                                handleCheckout();
                            }}
                            disabled={isCheckingOut}
                            className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-dark-950 font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-xl hover:shadow-primary-500/20 disabled:opacity-50 transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                            {isCheckingOut ? (
                                <span className="w-5 h-5 border-2 border-dark-900 border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                                <>
                                    <Send size={20} /> Place Order
                                </>
                            )}
                        </button>
                        <p className="mt-4 text-center text-xs text-slate-500">
                            By placing this order, you will be redirected to confirm your payment directly with the restaurant.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
