import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Clock, Check, X, Calendar as CalendarIcon, LogIn, LogOut, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient, { getWebSocketURL } from '../api/client';

export default function ReservationManager() {
    const [reservations, setReservations] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [now, setNow] = useState(new Date());
    const [wsConnected, setWsConnected] = useState(false);
    const [activeMobileTab, setActiveMobileTab] = useState('pending');

    const fetchReservations = () => {
        apiClient.get('/reservations/')
            .then(res => setReservations(Array.isArray(res.data) ? res.data : []))
            .catch(err => toast.error("Failed to load reservations."));
    }

    const playNotification = () => {
        try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play();
        } catch (e) { console.error("Audio failed", e); }
    };

    useEffect(() => {
        fetchReservations();
        
        let socket = null;
        let reconnectTimeout = null;

        const connectWS = () => {
            const url = getWebSocketURL('/ws/orders/');
            socket = new WebSocket(url);

            socket.onopen = () => setWsConnected(true);
            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'order_update') {
                        fetchReservations();
                        // If it's a new pending reservation arrival (implicitly), chime
                        playNotification();
                    }
                } catch (e) { console.error("[Host WS] Parse error", e); }
            };
            socket.onclose = () => {
                setWsConnected(false);
                reconnectTimeout = setTimeout(connectWS, 5000);
            };
            socket.onerror = () => {
                if (socket) socket.close();
            };
        };

        connectWS();

        const clockInterval = setInterval(() => setNow(new Date()), 10000);
        return () => { 
            if (socket) {
                socket.onclose = null;
                socket.onerror = null;
                socket.close();
            }
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            clearInterval(clockInterval); 
        };
    }, []);

    const handleConfirm = (id) => {
        apiClient.post(`/reservations/${id}/confirm/`)
            .then(() => { toast.success("Reservation confirmed."); fetchReservations(); })
            .catch(err => toast.error("Error confirming."));
    }

    const handleCheckIn = (id) => {
        const toastId = toast.loading("Checking in guest...");
        apiClient.post(`/reservations/${id}/check_in/`)
            .then(res => { 
                toast.success("Guest checked in! Kitchen notified.", { id: toastId }); 
                fetchReservations(); 
            })
            .catch(err => toast.error("Check-in failed: " + (err.response?.data?.error || err.message), { id: toastId }));
    }

    const handleCheckOut = (res) => {
        const toastId = toast.loading("Processing check-out...");
        apiClient.get('/sessions/')
            .then(sessRes => {
                const data = Array.isArray(sessRes.data) ? sessRes.data : [];
                const session = data.find(s => s.reservation === res.id && s.is_active);
                if (session) {
                    apiClient.post(`/sessions/${session.id}/close/`)
                        .then(() => { toast.success("Guest checked out!", { id: toastId }); fetchReservations(); })
                        .catch(() => toast.error("Check-out failed.", { id: toastId }));
                } else {
                    toast.error("No active session found.", { id: toastId });
                }
            })
            .catch(() => toast.error("Connection error.", { id: toastId }));
    }

    const getElapsedTime = (startedAt) => {
        if (!startedAt) return null;
        const started = new Date(startedAt);
        const diffMs = now - started;
        const diffMins = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    };

    const isOverdue = (res) => {
        if (!res.session_started_at) return false;
        const started = new Date(res.session_started_at);
        const expiryMs = started.getTime() + (res.duration_minutes * 60000);
        return now.getTime() > expiryMs;
    };

    // Filter logic
    const pending = reservations.filter(r => r.status === 'PENDING');
    const upcoming = reservations.filter(r => r.status === 'CONFIRMED');
    const active = reservations.filter(r => r.status === 'ACTIVE');
    const history = reservations.filter(r => ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(r.status)).reverse();

    const handleNoShow = (id) => {
        apiClient.post(`/reservations/${id}/no_show/`)
            .then(() => { toast.success("Marked as No-Show."); fetchReservations(); })
            .catch(err => toast.error("Update failed."));
    }

    const renderCard = (res) => {
        const overdue = isOverdue(res);
        const elapsed = getElapsedTime(res.session_started_at);
        const isHistory = ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(res.status);

        return (
            <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={res.id}
                className={`glass-dark border rounded-2xl p-5 mb-4 shadow-sm transition-colors ${overdue ? 'border-red-500/40 bg-red-500/5' : isHistory ? 'opacity-60 border-white/5 grayscale-[0.5]' : 'border-white/5 hover:border-white/10'
                    }`}
            >
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="font-bold text-lg">{res.customer_name}</h3>
                        <p className="text-sm text-primary-400">Table {res.table_number || 'TBD'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            res.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                            res.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400' :
                            res.status === 'NO_SHOW' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-white/5 text-slate-300'
                        }`}>
                            {res.status}
                        </div>
                        <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md text-slate-300 text-xs font-semibold">
                            <Users size={14} /> {res.guest_count}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-400 mb-3 pb-3 border-b border-white/5">
                    <Clock size={16} /> {new Date(res.reservation_time).toLocaleString()}
                </div>

                {res.linked_order && (
                    <div className="mt-3 mb-3 bg-dark-950/60 rounded-xl p-3 border border-white/5 text-left text-xs">
                        <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-white/5">
                            <span className="text-slate-400 font-bold">Meal Pre-order</span>
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
                        <div className="space-y-1.5">
                            {(res.linked_order.items || []).map((item, idx) => (
                                <div key={idx} className="text-slate-300 flex justify-between">
                                    <span>{item.quantity}x {item.product_name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {!isHistory && (
                    <div className="flex gap-2">
                        {res.status === 'PENDING' && (
                            <button onClick={() => handleConfirm(res.id)} className="flex-1 bg-primary-600/20 hover:bg-primary-600/40 text-primary-400 py-2 rounded-lg text-sm font-medium transition-colors flex justify-center items-center gap-2">
                                <Check size={16} /> Confirm
                            </button>
                        )}
                        {res.status === 'CONFIRMED' && (
                            <button onClick={() => handleCheckIn(res.id)} className="flex-1 bg-green-500/20 hover:bg-green-500/40 text-green-400 py-2 rounded-lg text-sm font-medium transition-colors flex justify-center items-center gap-2">
                                <LogIn size={16} /> Check-In
                            </button>
                        )}
                        {(res.status === 'PENDING' || res.status === 'CONFIRMED') && (
                            <button onClick={() => handleNoShow(res.id)} className="px-4 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg transition-colors flex items-center justify-center border border-orange-500/20" title="Mark No-Show">
                                <AlertTriangle size={18} />
                            </button>
                        )}
                        {res.status === 'ACTIVE' && (
                            <button onClick={() => handleCheckOut(res)}
                                className={`w-full py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 ${overdue
                                    ? 'bg-red-500 text-white hover:bg-red-400 shadow-lg shadow-red-500/20'
                                    : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                                    }`}
                            >
                                <LogOut size={16} /> {overdue ? 'End Session (Overdue)' : 'Check Out'}
                            </button>
                        )}
                    </div>
                )}
            </motion.div>
        );
    };

    return (
        <div className="w-full min-h-screen py-4 md:py-6 px-2 md:px-4 text-white overflow-x-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                        <CalendarIcon className="text-indigo-500" size={28} /> Host Stand
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{wsConnected ? 'Live Connection Active' : 'Offline - Sync Required'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-dark-900 border border-white/5 rounded-xl p-1 self-stretch sm:self-auto">
                    <button 
                        onClick={() => setShowHistory(false)}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${!showHistory ? 'bg-primary-500 text-dark-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Active Floor
                    </button>
                    <button 
                        onClick={() => setShowHistory(true)}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${showHistory ? 'bg-primary-500 text-dark-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        History
                    </button>
                </div>
            </div>

            {!showHistory ? (
                <div>
                    {/* Mobile Tab Switcher */}
                    <div className="flex lg:hidden bg-dark-900 border border-white/5 rounded-xl p-1 mb-4 gap-1">
                        <button 
                            onClick={() => setActiveMobileTab('pending')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeMobileTab === 'pending' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Pending ({pending.length})
                        </button>
                        <button 
                            onClick={() => setActiveMobileTab('upcoming')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeMobileTab === 'upcoming' ? 'bg-primary-500 text-dark-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Confirmed ({upcoming.length})
                        </button>
                        <button 
                            onClick={() => setActiveMobileTab('active')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeMobileTab === 'active' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Seated ({active.length})
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Column: Pending */}
                        <div className={`flex flex-col bg-dark-900/50 border border-white/5 rounded-3xl p-4 overflow-hidden h-[60vh] lg:h-[75vh] ${activeMobileTab === 'pending' ? 'flex' : 'hidden lg:flex'}`}>
                            <h2 className="text-sm font-black text-slate-400 mb-4 sticky top-0 px-2 flex items-center gap-2 uppercase tracking-tighter">
                                Pending Requests 
                                <span className="bg-white/10 text-[10px] px-2 py-0.5 rounded-full">{pending.length}</span>
                            </h2>
                            <div className="flex-1 overflow-y-auto px-1 custom-scrollbar pb-10 space-y-4">
                                {pending.length === 0 ? <p className="text-slate-600 text-xs text-center py-10 italic">No pending requests</p> : pending.map(renderCard)}
                            </div>
                        </div>

                        {/* Column: Upcoming */}
                        <div className={`flex flex-col bg-dark-900/50 border border-white/5 rounded-3xl p-4 overflow-hidden h-[60vh] lg:h-[75vh] ${activeMobileTab === 'upcoming' ? 'flex' : 'hidden lg:flex'}`}>
                            <h2 className="text-sm font-black text-primary-400 mb-4 sticky top-0 px-2 flex items-center gap-2 uppercase tracking-tighter">
                                Confirmed 
                                <span className="bg-primary-500/20 text-primary-400 text-[10px] px-2 py-0.5 rounded-full">{upcoming.length}</span>
                            </h2>
                            <div className="flex-1 overflow-y-auto px-1 custom-scrollbar pb-10 space-y-4">
                                {upcoming.length === 0 ? <p className="text-slate-600 text-xs text-center py-10 italic">No upcoming arrivals</p> : upcoming.map(renderCard)}
                            </div>
                        </div>

                        {/* Column: Active (Seated) */}
                        <div className={`flex flex-col bg-dark-900/50 border border-white/5 rounded-3xl p-4 overflow-hidden h-[60vh] lg:h-[75vh] ${activeMobileTab === 'active' ? 'flex' : 'hidden lg:flex'}`}>
                            <h2 className="text-sm font-black text-green-400 mb-4 sticky top-0 px-2 flex items-center gap-2 uppercase tracking-tighter">
                                Seated Guests
                                <span className="bg-green-500/20 text-green-500 text-[10px] px-2 py-0.5 rounded-full">{active.length}</span>
                            </h2>
                            <div className="flex-1 overflow-y-auto px-1 custom-scrollbar pb-10 space-y-4">
                                {active.length === 0 ? <p className="text-slate-600 text-xs text-center py-10 italic">Floor is empty</p> : active.map(renderCard)}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="glass-dark border border-white/5 rounded-3xl p-6 min-h-[50vh]">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Clock size={20} className="text-slate-400" /> Recent Activity (Last 50)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {history.length === 0 ? (
                            <div className="col-span-full py-20 text-center">
                                <CalendarIcon size={48} className="mx-auto mb-4 opacity-20" />
                                <p className="text-slate-500">No historical data found.</p>
                            </div>
                        ) : history.slice(0, 50).map(renderCard)}
                    </div>
                </div>
            )}
        </div>
    );
}

