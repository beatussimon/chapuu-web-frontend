import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { Printer, ArrowLeft } from 'lucide-react';
import { useCurrency } from '../../utils/useCurrency';

export default function PrintReceipt() {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const { formatPrice } = useCurrency();

    useEffect(() => {
        apiClient.get(`/orders/${orderId}/`)
            .then(res => {
                setOrder(res.data);
                setLoading(false);
                // Trigger print dialog automatically after a brief delay for rendering
                setTimeout(() => {
                    window.print();
                }, 500);
            })
            .catch(err => {
                console.error("Failed to load order for printing:", err);
                setLoading(false);
            });
    }, [orderId]);

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/seller/pos');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-dark-950 text-white flex items-center justify-center flex-col gap-4 no-print">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary-500"></div>
                <p className="text-slate-400 font-medium">Generating receipt...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-dark-950 text-white flex items-center justify-center flex-col gap-4 no-print">
                <p className="text-red-400 font-bold">Order not found</p>
                <button onClick={handleBack} className="bg-white/10 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-white/20">
                    <ArrowLeft size={16} /> Back to POS
                </button>
            </div>
        );
    }

    // Format date: e.g. "06 Jun 2026 14:30"
    const orderDate = new Date(order.created_at);
    const dateStr = orderDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = orderDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="min-h-screen bg-slate-100 flex justify-center py-10 print:bg-white print:p-0">
            {/* Embedded Print CSS to guarantee 80mm thermal roll sizing */}
            <style>{`
                @media print {
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                    }
                }
            `}</style>
            {/* Header Controls for screen only */}
            <div className="fixed top-4 right-4 flex gap-3 no-print">
                <button 
                    onClick={handleBack}
                    className="p-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl shadow-lg border border-slate-200 transition-colors"
                    title="Back"
                >
                    <ArrowLeft size={20} />
                </button>
                <button 
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg transition-colors"
                >
                    <Printer size={20} /> Print
                </button>
            </div>

            {/* Receipt Container - Strictly constrained for 80mm thermal printers */}
            <div className="bg-white p-6 shadow-2xl print:shadow-none w-[80mm] max-w-[80mm] mx-auto text-black font-mono text-sm print:m-0 print:w-full print:max-w-full">
                
                {/* Store Header */}
                <div className="text-center mb-6">
                    <h1 className="font-bold text-xl uppercase tracking-wider mb-1">{order.store_name}</h1>
                    {order.store_location && <p className="text-xs mb-1">{order.store_location}</p>}
                    {order.store_phone && <p className="text-xs mb-1">Tel: {order.store_phone}</p>}
                    
                    <div className="mt-4 pt-4 border-t border-dashed border-slate-300">
                        <h2 className="font-bold text-lg">CASH RECEIPT</h2>
                    </div>
                </div>

                {/* Metadata */}
                <div className="text-xs mb-4 space-y-1">
                    <div className="flex justify-between">
                        <span>Order No:</span>
                        <span className="font-bold">{order.id}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Date:</span>
                        <span>{dateStr} {timeStr}</span>
                    </div>
                    {order.customer_name && (
                        <div className="flex justify-between">
                            <span>Customer:</span>
                            <span className="uppercase">{order.customer_name}</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span>Mode:</span>
                        <span className="uppercase font-bold">{order.fulfillment_mode}</span>
                    </div>
                </div>

                <div className="border-t border-dashed border-slate-300 my-4"></div>

                {/* Items */}
                <div className="space-y-3 mb-4">
                    {order.items.map(item => (
                        <div key={item.id} className="text-sm">
                            <div className="flex justify-between font-bold">
                                <span>{item.product.name}</span>
                                <span>{formatPrice(parseFloat(item.unit_price) * item.quantity)}</span>
                            </div>
                            <div className="text-xs text-slate-600 mt-0.5">
                                {item.quantity} x {formatPrice(item.unit_price)}
                            </div>
                        </div>
                    ))}
                    
                    {order.pos_custom_items && order.pos_custom_items.map((item, idx) => (
                        <div key={`custom-${idx}`} className="text-sm">
                            <div className="flex justify-between font-bold">
                                <span>{item.name}</span>
                                <span>{formatPrice(parseFloat(item.price) * item.quantity)}</span>
                            </div>
                            <div className="text-xs text-slate-600 mt-0.5">
                                {item.quantity} x {formatPrice(item.price)}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="border-t border-dashed border-slate-300 my-4"></div>

                {/* Totals */}
                <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{formatPrice(parseFloat(order.total_amount) + parseFloat(order.discount_amount || 0))}</span>
                    </div>
                    
                    {parseFloat(order.discount_amount || 0) > 0 && (
                        <div className="flex justify-between text-xs">
                            <span>Discount:</span>
                            <span>-{formatPrice(order.discount_amount)}</span>
                        </div>
                    )}

                    {parseFloat(order.delivery_fee || 0) > 0 && (
                        <div className="flex justify-between text-xs">
                            <span>Delivery Fee:</span>
                            <span>{formatPrice(order.delivery_fee)}</span>
                        </div>
                    )}

                    <div className="flex justify-between font-black text-lg mt-2 pt-2 border-t border-slate-300">
                        <span>TOTAL:</span>
                        <span>{formatPrice(order.total_amount)}</span>
                    </div>
                </div>

                <div className="border-t border-dashed border-slate-300 my-4"></div>

                {/* Footer */}
                <div className="text-center text-xs space-y-2 mt-6">
                    <p className="font-bold">Thank you for your business!</p>
                    <p className="text-[10px] text-slate-500">Powered by CHAPUU</p>
                </div>
                
                {/* Added whitespace at bottom to ensure paper cuts after content on thermal printers */}
                <div className="h-10 print:h-[20mm]"></div>
            </div>
        </div>
    );
}
