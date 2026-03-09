import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Clock, Check, X, Calendar as CalendarIcon, LogIn, LogOut, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../api/client';

export default function ReservationManager() {
    const [reservations, setReservations] = useState([]);
    const [now, setNow] = useState(new Date());

    const fetchReservations = () => {
        apiClient.get('/reservations/')
            .then(res => setReservations(res.data))
            .catch(err => toast.error("Failed to load reservations."));
    }

    useEffect(() => {
        fetchReservations();
        const interval = setInterval(fetchReservations, 30000);
        // Live clock for elapsed time
        const clockInterval = setInterval(() => setNow(new Date()), 10000);
        return () => { clearInterval(interval); clearInterval(clockInterval); };
    }, []);

    const handleConfirm = (id) => {
        apiClient.post(`/reservations/${id}/confirm/`)
            .then(() => { toast.success("Reservation confirmed."); fetchReservations(); })
            .catch(err => toast.error("Error confirming."));
    }

    const handleCheckIn = (id) => {
        apiClient.post(`/reservations/${id}/check_in/`)
            .then(() => { toast.success("Customer checked in. Table active!"); fetchReservations(); })
            .catch(err => toast.error("Check-in failed."));
    }

    const handleCheckOut = (res) => {
        // Find active session and close it
        apiClient.get('/sessions/')
            .then(sessRes => {
                const session = sessRes.data.find(s => s.reservation === res.id && s.is_active);
                if (session) {
                    apiClient.post(`/sessions/${session.id}/close/`)
                        .then(() => { toast.success("Guest checked out!"); fetchReservations(); })
                        .catch(() => toast.error("Check-out failed."));
                } else {
                    toast.error("No active session found.");
                }
            })
            .catch(() => toast.error("Could not fetch sessions."));
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

    const pending = reservations.filter(r => r.status === 'PENDING');
    const upcoming = reservations.filter(r => r.status === 'CONFIRMED');
    const active = reservations.filter(r => r.status === 'ACTIVE');

    const handleNoShow = (id) => {
        apiClient.post(`/reservations/${id}/no_show/`)
            .then(() => { toast.success("Marked as No-Show."); fetchReservations(); })
            .catch(err => toast.error("Update failed."));
    }

    const renderCard = (res) => {
        const overdue = isOverdue(res);
        const elapsed = getElapsedTime(res.session_started_at);

        return (
            <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={res.id}
                className={`glass-dark border rounded-2xl p-5 mb-4 shadow-sm transition-colors ${overdue ? 'border-red-500/40 bg-red-500/5' : 'border-white/5 hover:border-white/10'
                    }`}
            >
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="font-bold text-lg">{res.customer_name}</h3>
                        <p className="text-sm text-primary-400">Table {res.table_number || 'TBD'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md text-slate-300 text-xs font-semibold">
                            <Users size={14} /> {res.guest_count}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-400 mb-3 pb-3 border-b border-white/5">
                    <Clock size={16} /> {new Date(res.reservation_time).toLocaleString()}
                    <span className="text-xs text-slate-600 ml-auto">{res.duration_minutes}min</span>
                </div>

                {/* Elapsed time for active reservations */}
                {res.status === 'ACTIVE' && elapsed && (
                    <div className={`flex items-center gap-2 text-sm mb-4 px-3 py-2 rounded-lg ${overdue ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
                        }`}>
                        {overdue ? <AlertTriangle size={16} /> : <Clock size={16} />}
                        <span className="font-medium">
                            {overdue ? `Overdue — Seated for ${elapsed}` : `Seated for ${elapsed}`}
                        </span>
                    </div>
                )}

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
                        <>
                            <button onClick={() => handleNoShow(res.id)} className="px-3 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg transition-colors flex items-center justify-center border border-orange-500/20" title="Mark No-Show">
                                <AlertTriangle size={16} />
                            </button>
                            <button className="px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors flex items-center justify-center border border-red-500/20">
                                <X size={18} />
                            </button>
                        </>
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
                    <p className="text-slate-500 text-xs mt-1 font-medium uppercase tracking-wider">Live Floor Management</p>
                </div>
                <button onClick={fetchReservations} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all border border-white/10 self-stretch sm:self-auto">
                    Sync Now
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Column: Pending */}
                <div className="flex flex-col bg-dark-900/50 border border-white/5 rounded-3xl p-4 overflow-hidden h-[500px] lg:h-[75vh]">
                    <h2 className="text-sm font-black text-slate-400 mb-4 sticky top-0 px-2 flex items-center gap-2 uppercase tracking-tighter">
                        Pending Requests 
                        <span className="bg-white/10 text-[10px] px-2 py-0.5 rounded-full">{pending.length}</span>
                    </h2>
                    <div className="flex-1 overflow-y-auto px-1 custom-scrollbar pb-10 space-y-4">
                        {pending.length === 0 ? <p className="text-slate-600 text-xs text-center py-10 italic">No pending requests</p> : pending.map(renderCard)}
                    </div>
                </div>

                {/* Column: Upcoming */}
                <div className="flex flex-col bg-dark-900/50 border border-white/5 rounded-3xl p-4 overflow-hidden h-[500px] lg:h-[75vh]">
                    <h2 className="text-sm font-black text-primary-400 mb-4 sticky top-0 px-2 flex items-center gap-2 uppercase tracking-tighter">
                        Confirmed 
                        <span className="bg-primary-500/20 text-primary-400 text-[10px] px-2 py-0.5 rounded-full">{upcoming.length}</span>
                    </h2>
                    <div className="flex-1 overflow-y-auto px-1 custom-scrollbar pb-10 space-y-4">
                        {upcoming.length === 0 ? <p className="text-slate-600 text-xs text-center py-10 italic">No upcoming arrivals</p> : upcoming.map(renderCard)}
                    </div>
                </div>

                {/* Column: Active (Seated) */}
                <div className="flex flex-col bg-dark-900/50 border border-white/5 rounded-3xl p-4 overflow-hidden h-[500px] lg:h-[75vh]">
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
    );
}
