import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Clock, Users, MapPin, CheckCircle, Utensils, Phone, AlertTriangle, ArrowRight, ChefHat, Star, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../api/client';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useStore';
import { useCurrency } from '../utils/useCurrency';
import OptimizedImage from '../components/OptimizedImage';

export default function ReservationForm() {
    const navigate = useNavigate();
    const { formatPrice } = useCurrency();
    const [stores, setStores] = useState([]);
    const [selectedStore, setSelectedStore] = useState('');
    const [tables, setTables] = useState([]);

    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [guests, setGuests] = useState(2);
    const [duration, setDuration] = useState(60);
    const [selectedTable, setSelectedTable] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmedRes, setConfirmedRes] = useState(null);
    const [wantsPreOrder, setWantsPreOrder] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Best sellers for suggestions
    const [bestSellers, setBestSellers] = useState([]);

    useEffect(() => {
        apiClient.get('/stores/')
            .then(res => {
                const restaurantStores = res.data.filter(s => s.store_type === 'RESTAURANT');
                setStores(restaurantStores);
                if (restaurantStores.length > 0) setSelectedStore(restaurantStores[0].id);
            })
            .catch(err => console.error(err));
    }, []);

    // Fetch tables when store changes
    useEffect(() => {
        if (!selectedStore) return;
        setTables([]);
        setSelectedTable('');
        apiClient.get(`/tables/?store=${selectedStore}`)
            .then(res => setTables(res.data.filter(t => t.is_active)))
            .catch(() => setTables([]));

        // Fetch best sellers for this store
        apiClient.get(`/products/?store=${selectedStore}`)
            .then(res => {
                const active = res.data.filter(p => p.is_active);
                setBestSellers(active.slice(0, 4));
            })
            .catch(() => setBestSellers([]));
    }, [selectedStore]);

    // Filter tables by guest capacity
    const suitableTables = useMemo(() => {
        return tables.filter(t => t.capacity >= guests);
    }, [tables, guests]);

    const currentStore = stores.find(s => s.id == selectedStore);

    const handleReserve = (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (!date || !time) {
            toast.error("Please select a date and time!");
            return;
        }
        if (!selectedStore) {
            toast.error("Please select a restaurant!");
            return;
        }

        // Validate date is not in the past
        const reservationDate = new Date(`${date}T${time}:00`);
        if (reservationDate < new Date()) {
            toast.error("Cannot book in the past!");
            return;
        }

        const isoTimeStr = `${date}T${time}:00Z`;
        setIsSubmitting(true);
        const toastId = toast.loading("Checking availability...");

        const payload = {
            store: selectedStore,
            reservation_time: isoTimeStr,
            duration_minutes: duration,
            guest_count: guests
        };
        if (selectedTable) payload.table = selectedTable;

        apiClient.post('/reservations/', payload)
            .then(res => {
                toast.success("Table Confirmed!", { id: toastId });
                setConfirmedRes(res.data);
                setIsSubmitting(false);
                if (!wantsPreOrder) {
                    setTimeout(() => navigate('/'), 3000);
                }
            })
            .catch(err => {
                let msg = "Booking failed. Please try again.";
                const data = err.response?.data;
                
                if (data) {
                    if (typeof data === 'string') {
                        msg = data;
                    } else if (data.error) {
                        msg = data.error;
                    } else if (data.detail) {
                        msg = data.detail;
                    } else {
                        // Extract first validation error if it's a field-level error object
                        const firstKey = Object.keys(data)[0];
                        if (firstKey) {
                            const val = data[firstKey];
                            msg = Array.isArray(val) ? val[0] : val;
                            if (typeof msg === 'object') msg = JSON.stringify(msg);
                            // Prepend field name for clarity if it's not a generic error
                            if (firstKey !== 'non_field_errors' && firstKey !== 'detail') {
                                msg = `${firstKey}: ${msg}`;
                            }
                        }
                    }
                }
                
                setErrorMsg(msg);
                toast.error(msg, { id: toastId });
                setIsSubmitting(false);
            });
    };

    const handleSkipFood = () => {
        setConfirmedRes(null);
        navigate('/');
    };

    const handlePreOrderFood = () => {
        // Global state for reservation could be set here, but URL params/state is simpler.
        // Zustand could also hold this: useAppStore.getState().setActiveReservation(confirmedRes.id)
        useAppStore.setState({ activeReservation: confirmedRes.id, selectedStore: currentStore });
        navigate('/menu');
    };

    // ─── Confirmed View ────────────────────────────
    if (confirmedRes) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center items-center py-10 lg:py-20">
                <div className="glass-dark border border-green-500/20 p-8 md:p-10 rounded-3xl max-w-lg w-full text-center relative overflow-hidden shadow-2xl shadow-green-500/10">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6 relative z-10" />
                    <h2 className="text-3xl font-black mb-4 z-10 text-white relative">Table Confirmed!</h2>
                    <p className="text-slate-300 mb-8 z-10 relative">
                        {wantsPreOrder
                            ? "Your table is secured. Would you like to order food now so it's ready when you arrive?"
                            : "Your table is secured! We'll see you there. Redirecting..."}
                    </p>

                    <div className="bg-dark-900/50 z-10 relative border border-white/5 rounded-2xl p-6 text-left mb-8 space-y-4 shadow-inner">
                        <div className="flex justify-between items-center border-b border-white/5 pb-3">
                            <span className="text-slate-400 font-medium">Table</span>
                            <strong className="text-white text-lg">{confirmedRes.table_number || 'Auto-Assigned'}</strong>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-3">
                            <span className="text-slate-400 font-medium">Date & Time</span>
                            <strong className="text-white">{new Date(confirmedRes.reservation_time).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</strong>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-medium">Guests</span>
                            <strong className="text-white flex items-center gap-2"><Users size={16} className="text-primary-500" /> {confirmedRes.guest_count} People</strong>
                        </div>
                    </div>

                    {wantsPreOrder && (
                        <div className="flex flex-col gap-4 relative z-10">
                            <button
                                onClick={handlePreOrderFood}
                                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-dark-950 py-4 rounded-xl transition-all font-bold text-lg shadow-lg shadow-green-500/25 flex items-center justify-center gap-2 transform hover:-translate-y-1"
                            >
                                <Utensils size={20} /> Pre-order Food for the Table
                            </button>
                            <button
                                onClick={handleSkipFood}
                                className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white py-4 rounded-xl transition-colors font-medium"
                            >
                                I'm Done (Skip Food)
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        );
    }

    // ─── Main Form ─────────────────────────────────
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto py-6 lg:py-10">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                {/* Main Form (3 cols) */}
                <div className="lg:col-span-3 glass-dark border border-white/5 p-6 md:p-8 rounded-3xl shadow-xl">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                        <CalendarIcon className="text-primary-500" />
                        Reserve a Table
                    </h2>

                    <form onSubmit={handleReserve} className="space-y-5">
                        {/* Store Selection */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2"><MapPin size={16} /> Select Restaurant</label>
                            <select
                                value={selectedStore}
                                onChange={(e) => setSelectedStore(e.target.value)}
                                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary-500 appearance-none"
                            >
                                {stores.length === 0 && <option value="">No restaurants available</option>}
                                {stores.map(s => <option key={s.id} value={s.id}>{s.name} — {s.location}</option>)}
                            </select>
                        </div>

                        {/* Date & Time */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2"><CalendarIcon size={16} /> Date</label>
                                <input
                                    type="date"
                                    value={date}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary-500 text-white [color-scheme:dark]"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2"><Clock size={16} /> Time</label>
                                <input
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary-500 text-white [color-scheme:dark]"
                                    required
                                />
                            </div>
                        </div>

                        {/* Guest & Duration */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2"><Users size={16} /> Party Size</label>
                                <input
                                    type="number"
                                    min="1" max="20"
                                    value={guests}
                                    onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
                                    className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary-500 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Duration</label>
                                <select
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary-500 appearance-none"
                                >
                                    <option value={30}>30 Minutes</option>
                                    <option value={60}>1 Hour</option>
                                    <option value={90}>1.5 Hours</option>
                                    <option value={120}>2 Hours</option>
                                </select>
                            </div>
                        </div>

                        {/* Table Selection */}
                        {tables.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Preferred Table (optional)</label>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTable('')}
                                        className={`py-2 px-3 rounded-xl text-xs font-medium transition-colors ${!selectedTable ? 'bg-primary-500 text-dark-950' : 'bg-dark-900 border border-white/10 text-slate-400 hover:text-white'}`}
                                    >
                                        Auto
                                    </button>
                                    {suitableTables.map(t => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => setSelectedTable(t.id)}
                                            className={`py-2 px-3 rounded-xl text-xs font-medium transition-colors ${selectedTable === t.id ? 'bg-primary-500 text-dark-950' : 'bg-dark-900 border border-white/10 text-slate-400 hover:text-white'}`}
                                        >
                                            T{t.number} <span className="text-[10px] opacity-60">({t.capacity}p)</span>
                                        </button>
                                    ))}
                                </div>
                                {suitableTables.length === 0 && tables.length > 0 && (
                                    <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                                        <AlertTriangle size={12} /> No tables fit {guests} guests. Auto-assign will try all tables.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Pre-order toggle */}
                        <div className="flex items-center justify-between bg-dark-900/50 border border-white/5 rounded-xl px-4 py-3">
                            <div>
                                <p className="text-sm font-medium text-slate-300">Pre-order food & drinks?</p>
                                <p className="text-xs text-slate-500">Order in advance so it's ready when you arrive</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setWantsPreOrder(!wantsPreOrder)}
                                className={`relative w-12 h-6 rounded-full transition-colors ${wantsPreOrder ? 'bg-primary-500' : 'bg-white/10'}`}
                            >
                                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${wantsPreOrder ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                            </button>
                        </div>

                        {/* Error Display */}
                        <AnimatePresence>
                            {errorMsg && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-red-500/10 border border-red-500/20 rounded-xl p-4"
                                >
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle size={20} className="text-red-400 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-red-300 text-sm font-medium mb-2">{errorMsg}</p>
                                            <p className="text-slate-400 text-xs">Try a different time, date, or fewer guests.</p>
                                            <div className="mt-3 flex items-center gap-2 text-xs">
                                                <Phone size={12} className="text-primary-400" />
                                                <span className="text-primary-400 font-medium">Need help? Call {currentStore?.contact_phone || '+255 700 000 000'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full mt-2 bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 rounded-xl shadow-lg transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {isSubmitting ? 'Checking...' : 'Confirm Booking'}
                        </button>
                    </form>
                </div>

                {/* Sidebar (2 cols) */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Table Availability Summary */}
                    <div className="glass-dark border border-white/5 p-5 rounded-2xl">
                        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <Star size={14} className="text-amber-400" /> Table Availability
                        </h3>
                        {tables.length === 0 ? (
                            <div className="text-center py-4">
                                <AlertTriangle size={24} className="text-amber-400 mx-auto mb-2" />
                                <p className="text-sm text-slate-400">No tables configured for this restaurant.</p>
                                <p className="text-xs text-slate-500 mt-1">Contact support for assistance.</p>
                                <div className="mt-3 flex items-center justify-center gap-2 text-xs">
                                    <Phone size={12} className="text-primary-400" />
                                    <span className="text-primary-400 font-medium">{currentStore?.contact_phone || '+255 700 000 000'}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-slate-400 mb-2">
                                    <span>{tables.length} total tables</span>
                                    <span className="text-green-400">{suitableTables.length} fit {guests}+ guests</span>
                                </div>
                                {tables.slice(0, 6).map(t => (
                                    <div key={t.id} className={`flex items-center justify-between py-2 px-3 rounded-lg text-xs ${t.capacity >= guests ? 'bg-green-500/5 border border-green-500/10' : 'bg-white/5 border border-white/5 opacity-50'}`}>
                                        <span className="text-white font-medium">Table {t.number}</span>
                                        <span className="text-slate-400">{t.capacity} seats</span>
                                    </div>
                                ))}
                                {tables.length > 6 && (
                                    <p className="text-xs text-slate-500 text-center mt-1">+{tables.length - 6} more tables</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Best Sellers */}
                    {bestSellers.length > 0 && (
                        <div className="glass-dark border border-white/5 p-5 rounded-2xl">
                            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                <TrendingUp size={14} className="text-primary-400" /> Popular at {currentStore?.name}
                            </h3>
                            <div className="space-y-3">
                                {bestSellers.map(p => (
                                    <div key={p.id} className="flex items-center gap-3">
                                        {p.image_url ? (
                                            <OptimizedImage src={p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover" wrapperClassName="w-10 h-10 rounded-lg" eager />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-dark-900/50 flex items-center justify-center">
                                                <ChefHat size={14} className="text-slate-500" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-white truncate">{p.name}</p>
                                            <p className="text-[10px] text-slate-400">{formatPrice(p.price)}</p>
                                        </div>
                                    </div>
                                ))}
                                {wantsPreOrder && (
                                    <p className="text-[10px] text-primary-400 flex items-center gap-1 mt-1">
                                        <ArrowRight size={10} /> You'll get to pre-order after booking
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Customer Support */}
                    <div className="glass-dark border border-white/5 p-5 rounded-2xl">
                        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                            <Phone size={14} className="text-green-400" /> Need Help?
                        </h3>
                        <p className="text-xs text-slate-400 mb-3">Having trouble booking? Our team is here to assist.</p>
                        <a
                            href={`tel:${currentStore?.contact_phone || '+255700000000'}`}
                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm font-medium hover:bg-green-500/20 transition-colors"
                        >
                            <Phone size={14} />
                            {currentStore?.contact_phone || '+255 700 000 000'}
                        </a>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
