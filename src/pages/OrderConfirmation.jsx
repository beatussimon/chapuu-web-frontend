import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { CheckCircle2, Copy, MessageSquare, ArrowRight, Store } from 'lucide-react';
import { useCurrency } from '../utils/useCurrency';
import toast from 'react-hot-toast';

export default function OrderConfirmation() {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const { formatPrice } = useCurrency();

    useEffect(() => {
        apiClient.get(`/orders/${id}/`)
            .then(res => {
                setOrder(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Could not fetch order", err);
                toast.error("Failed to load order details");
                setLoading(false);
            });
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

    const itemsText = (Array.isArray(order.items) ? order.items : []).map(i => `${i.quantity}x ${i.product.name || 'Item'}`).join(', ');

    // Formatting the message to copy
    const confirmationMessage = `Hello, I just placed Order #${order.id} on Chapuu for ${formatPrice(order.total_amount)}. \n\nItems: ${itemsText}\nFulfillment: ${order.fulfillment_mode} ${order.table_number ? `(Table ${order.table_number})` : ''}\n\nHere is my payment confirmation to begin my order processing.`;

    const handleCopy = () => {
        navigator.clipboard.writeText(confirmationMessage);
        toast.success("Message copied to clipboard!");
    };

    return (
        <div className="w-full max-w-2xl mx-auto py-12 px-4 flex flex-col items-center">
            <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                <CheckCircle2 size={40} />
            </div>

            <h1 className="text-4xl font-black text-white mb-2 text-center">Order Received!</h1>
            <p className="text-slate-400 text-lg mb-8 text-center max-w-md">
                Your order `<span className="text-primary-400 font-bold">#{order.id}</span>` has been sent, but needs payment confirmation.
            </p>

            <div className="w-full glass-dark border border-white/10 rounded-3xl p-6 md:p-8 mb-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-bl-[100px] pointer-events-none"></div>

                <div className="flex items-center gap-3 mb-4 line-clamp-1 pb-4 border-b border-white/5">
                    <Store className="text-primary-500" size={24} />
                    <span className="font-semibold text-lg text-white">Action Required: Send Payment Confirmation</span>
                </div>

                <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                    To finalize and send your order to the kitchen, please make your payment and then send the following message to the restaurant to confirm.
                </p>

                <div className="bg-dark-950 p-4 rounded-xl border border-white/10 relative mt-4 shadow-inner">
                    <p className="text-slate-400 text-sm whitespace-pre-wrap font-mono relative z-10">{confirmationMessage}</p>

                    <button
                        onClick={handleCopy}
                        className="absolute right-4 bottom-4 p-3 bg-white/5 hover:bg-primary-500 hover:text-dark-900 border border-white/10 text-white rounded-lg transition-all shadow-lg z-20 flex items-center gap-2"
                        title="Copy to clipboard"
                    >
                        <Copy size={16} /> <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Copy Message</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap justify-center w-full gap-4">
                <button
                    onClick={handleCopy}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                >
                    <MessageSquare size={18} /> Send manually
                </button>

                {order.id && (
                    <Link to={`/order/track/${order.id}`} className="bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/10">
                        Track Order <ArrowRight size={18} />
                    </Link>
                )}

                <Link to="/menu" className="bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/10">
                    Keep Browsing <ArrowRight size={18} />
                </Link>
            </div>
        </div>
    );
}
