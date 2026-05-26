import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Shield, CheckCircle2, Clock, XCircle, AlertTriangle, ShieldCheck, User, ArrowLeft, Loader2, Key } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../api/client';
import { useAppStore } from '../store/useStore';
import { useCurrency } from '../utils/useCurrency';

export default function OrderVerification() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token, userRole } = useAppStore();
    const { formatPrice } = useCurrency();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [pin, setPin] = useState('');
    const [verifying, setVerifying] = useState(false);

    const isStaff = token && ['SELLER', 'ADMIN', 'SUPERUSER', 'CHEF', 'DELIVERY', 'ACCOUNTANT'].includes(userRole);

    const fetchOrderDetails = () => {
        setLoading(true);
        setError(null);
        apiClient.get(`/orders/${id}/`)
            .then(res => {
                setOrder(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Verification fetch error", err);
                setError(err.response?.data?.detail || "Order not found or access denied.");
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchOrderDetails();
    }, [id, token]);

    const handleConfirmPin = (e) => {
        e.preventDefault();
        if (pin.length !== 6) {
            toast.error("Please enter a valid 6-digit delivery/pickup PIN.");
            return;
        }
        setVerifying(true);
        const tid = toast.loading("Verifying PIN...");
        apiClient.post(`/orders/${id}/confirm_delivery/`, { code: pin })
            .then(() => {
                toast.success("Order verified and handed off!", { id: tid });
                setPin('');
                fetchOrderDetails();
            })
            .catch(err => {
                const msg = err.response?.data?.error || "Invalid verification code.";
                toast.error(msg, { id: tid });
            })
            .finally(() => setVerifying(false));
    };

    const handleManualOverride = () => {
        if (!confirm("Perform manual handoff override? This will bypass the PIN code check.")) return;
        setVerifying(true);
        const tid = toast.loading("Performing override...");
        apiClient.post(`/orders/${id}/staff_manual_verify/`)
            .then(() => {
                toast.success("Manual handoff override completed successfully!", { id: tid });
                fetchOrderDetails();
            })
            .catch(err => {
                const msg = err.response?.data?.error || "Override failed.";
                toast.error(msg, { id: tid });
            })
            .finally(() => setVerifying(false));
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
                <p className="text-sm text-slate-400 font-mono">FETCHING VERIFICATION SECURE DEED...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-md mx-auto my-12 p-6 glass-dark border border-red-500/20 rounded-3xl text-center space-y-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                    <XCircle size={32} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">Verification Failed</h2>
                    <p className="text-sm text-slate-400 mt-2">{error}</p>
                </div>
                <div className="flex flex-col gap-3">
                    <button onClick={fetchOrderDetails} className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold py-2.5 rounded-xl transition-all cursor-pointer">
                        Retry Lookup
                    </button>
                    <Link to="/" className="text-xs text-primary-400 hover:underline">
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    // Determine states
    const isReady = order.state === 'READY';
    const isCompleted = order.state === 'COMPLETED';

    return (
        <div className="max-w-lg mx-auto my-6 p-4 sm:p-6 bg-dark-950 text-white min-h-[80vh] flex flex-col justify-between">
            <div className="space-y-6">
                {/* Header navbar */}
                <div className="flex items-center justify-between pb-4 border-b border-white/5">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer">
                        <ArrowLeft size={14} /> Back
                    </button>
                    <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500 font-mono">
                        <ShieldCheck size={12} className="text-primary-500" /> CHAPUU SECURE QR SCAN
                    </div>
                </div>

                {/* Main Card */}
                <div className="glass-dark border border-white/5 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-3xl pointer-events-none"></div>

                    {/* Store Title */}
                    <div className="text-center pb-4 border-b border-white/5">
                        <span className="text-[10px] font-black uppercase text-primary-400 tracking-widest font-mono">Order Verification</span>
                        <h2 className="text-xl font-black text-white mt-1 uppercase tracking-tight">{order.store_name || `Store #${order.store}`}</h2>
                        <p className="text-xs text-slate-400 mt-1">Order Ref: <span className="font-mono text-white font-bold">#{order.id}</span></p>
                    </div>

                    {/* Status Badge */}
                    <div className="my-6 flex flex-col items-center justify-center gap-2">
                        {isCompleted ? (
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-16 h-16 rounded-full bg-slate-500/10 border border-slate-500/20 flex items-center justify-center text-slate-400">
                                    <CheckCircle2 size={32} />
                                </div>
                                <span className="px-3 py-1 bg-slate-500/20 text-slate-400 rounded-full text-xs font-black uppercase tracking-wider border border-white/10">
                                    Already Collected / Completed
                                </span>
                            </div>
                        ) : isReady ? (
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 animate-pulse">
                                    <ShieldCheck size={32} />
                                </div>
                                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-black uppercase tracking-wider border border-green-500/30 animate-pulse">
                                    READY — VERIFY HANDOFF
                                </span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400">
                                    <Clock size={32} />
                                </div>
                                <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-black uppercase tracking-wider border border-yellow-500/30">
                                    Status: {order.state}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Order Details Details Grid */}
                    <div className="space-y-4 pt-4 border-t border-white/5 text-xs">
                        <div className="grid grid-cols-2 gap-y-3 font-medium">
                            <div className="text-slate-500">Customer Profile:</div>
                            <div className="text-right text-white font-bold">{order.customer_name || "Anonymous / Walk-in"}</div>

                            <div className="text-slate-500">Fulfillment Mode:</div>
                            <div className="text-right text-white font-bold uppercase tracking-wider">{order.fulfillment_mode}</div>

                            <div className="text-slate-500">Placed At:</div>
                            <div className="text-right text-slate-300 font-mono">{new Date(order.created_at).toLocaleString()}</div>

                            {order.total_amount && (
                                <>
                                    <div className="text-slate-500">Total Price:</div>
                                    <div className="text-right text-primary-400 font-mono font-bold">{formatPrice(order.total_amount)}</div>
                                </>
                            )}
                        </div>

                        {/* Items list */}
                        {order.items && order.items.length > 0 ? (
                            <div className="mt-4 bg-dark-900/60 border border-white/5 rounded-2xl p-4 space-y-2">
                                <span className="block text-[9px] font-black uppercase text-slate-500 tracking-wider">Item Summary</span>
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-slate-300 font-medium">
                                        <span>{item.quantity}x {item.product_name}</span>
                                        {item.unit_price && <span className="font-mono text-slate-400">{formatPrice(item.unit_price * item.quantity)}</span>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center p-3 text-slate-600 bg-white/5 border border-white/5 rounded-xl font-mono text-[10px]">
                                Secure View — Item details masked.
                            </div>
                        )}
                    </div>
                </div>

                {/* Hand-off validation triggers */}
                {isReady && (
                    <div className="space-y-4 animate-fadeIn">
                        {isStaff ? (
                            <div className="glass-dark border border-primary-500/20 rounded-3xl p-6 space-y-4">
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                                    <Key size={14} className="text-primary-400" /> Enter Hand-off PIN Code
                                </h3>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Ask the customer for the 6-digit confirmation code shown on their order tracker page.
                                </p>
                                <form onSubmit={handleConfirmPin} className="flex gap-2">
                                    <input 
                                        type="text" 
                                        maxLength={6} 
                                        required 
                                        placeholder="6-digit PIN" 
                                        value={pin}
                                        onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                                        className="flex-1 bg-dark-950 border border-white/10 focus:border-primary-500 rounded-xl px-4 py-3 text-center text-lg font-black font-mono tracking-widest outline-none transition-all"
                                    />
                                    <button 
                                        type="submit" 
                                        disabled={verifying || pin.length !== 6}
                                        className="bg-primary-500 hover:bg-primary-400 disabled:bg-slate-700 disabled:opacity-40 disabled:text-slate-400 text-dark-950 font-bold px-6 rounded-xl transition-all cursor-pointer font-mono text-sm uppercase tracking-wider flex items-center justify-center"
                                    >
                                        {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify"}
                                    </button>
                                </form>

                                <div className="relative flex py-2 items-center">
                                    <div className="flex-grow border-t border-white/5"></div>
                                    <span className="flex-shrink mx-4 text-[9px] text-slate-500 font-bold uppercase tracking-widest">Or Override</span>
                                    <div className="flex-grow border-t border-white/5"></div>
                                </div>

                                <button 
                                    onClick={handleManualOverride}
                                    disabled={verifying}
                                    className="w-full bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white text-red-400 font-bold py-2.5 rounded-xl transition-all cursor-pointer text-xs uppercase tracking-wider"
                                >
                                    Administrative Override
                                </button>
                            </div>
                        ) : (
                            <div className="p-5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-2xl text-center flex items-center gap-3">
                                <CheckCircle2 className="shrink-0 animate-pulse" size={24} />
                                <div className="text-left text-xs font-medium leading-normal">
                                    <span className="font-bold text-white block mb-0.5">Order Verified Successfully ✅</span>
                                    Show this screen to the cashier or waiter to collect your food items. Provide them with your 6-digit pin code if requested.
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* If already completed */}
                {isCompleted && (
                    <div className="p-5 bg-white/5 border border-white/5 text-slate-400 rounded-2xl text-center flex items-center gap-3">
                        <CheckCircle2 className="shrink-0 text-slate-500" size={24} />
                        <div className="text-left text-xs font-medium leading-normal">
                            <span className="font-bold text-slate-300 block mb-0.5">Order Handed Off</span>
                            This order is fully complete and has already been verified and collected. No further actions needed.
                        </div>
                    </div>
                )}
            </div>

            {/* Auth call to action */}
            {!token && (
                <div className="mt-8 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                        <span className="block text-xs font-bold text-white">Chapuu Staff Member?</span>
                        <span className="block text-[10px] text-slate-400">Log in to process confirmation handoffs.</span>
                    </div>
                    <Link 
                        to="/login" 
                        state={{ from: `/verify/order/${id}` }}
                        className="bg-primary-500/10 border border-primary-500/20 hover:bg-primary-500 hover:text-dark-950 text-primary-400 font-bold px-4 py-2 rounded-xl text-xs transition-all uppercase tracking-wider"
                    >
                        Sign In
                    </Link>
                </div>
            )}
        </div>
    );
}
