import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useCurrency } from '../utils/useCurrency';

export default function PackagingSlip({ order }) {
    const { formatPrice } = useCurrency();
    if (!order) return null;

    const formattedDate = new Date(order.created_at).toLocaleString();
    const storeAppUrl = window.location.origin;
    const verificationUrl = `${storeAppUrl}/verify/order/${order.id}`;

    return (
        <div className="bg-white text-black p-6 font-sans w-full max-w-[400px] border border-slate-300 rounded-lg shadow-sm mx-auto print:border-0 print:shadow-none print:max-w-full print:p-0">
            {/* Header branding */}
            <div className="flex justify-between items-start border-b border-dashed border-slate-400 pb-3">
                <div>
                    <h2 className="text-xl font-black tracking-wider text-black font-mono">CHAPUU</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">Digital Food Label</p>
                </div>
                <div className="text-right">
                    <span className="text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-black uppercase text-slate-700 tracking-wider">
                        {order.fulfillment_mode}
                    </span>
                </div>
            </div>

            {/* Merchant info */}
            <div className="py-3 text-xs border-b border-dashed border-slate-400">
                <div className="font-bold text-sm text-black">{order.store_name || `Store #${order.store}`}</div>
                {order.store_location && <div className="text-slate-600 mt-0.5">Location: {order.store_location}</div>}
                {order.store_phone && <div className="text-slate-600">Tel: {order.store_phone}</div>}
            </div>

            {/* Order Ref & Dates */}
            <div className="py-3 text-xs border-b border-dashed border-slate-400 space-y-1">
                <div className="flex justify-between">
                    <span className="font-bold text-sm">ORDER ID:</span>
                    <span className="font-bold font-mono text-sm">#{order.id}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                    <span>Date:</span>
                    <span className="font-mono">{formattedDate}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                    <span>Customer:</span>
                    <span className="font-bold text-black">{order.customer_name || 'Anonymous / Walk-in'}</span>
                </div>
                {order.customer_phone && (
                    <div className="flex justify-between text-slate-600">
                        <span>Phone:</span>
                        <span className="font-mono">{order.customer_phone}</span>
                    </div>
                )}
            </div>

            {/* Itemized List */}
            <div className="py-3 border-b border-dashed border-slate-400">
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2 font-mono">Order Items</h4>
                <div className="space-y-1.5 text-xs">
                    {order.items && order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between font-medium">
                            <span>{item.quantity}x {item.product_name || item.product?.name || 'Item'}</span>
                            <span className="font-mono">{formatPrice((item.unit_price || 0) * item.quantity)}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Order Totals */}
            <div className="py-3 border-b border-dashed border-slate-400 text-xs space-y-1">
                {order.delivery_fee && parseFloat(order.delivery_fee) > 0 && (
                    <div className="flex justify-between text-slate-600">
                        <span>Delivery Fee:</span>
                        <span className="font-mono">{formatPrice(order.delivery_fee)}</span>
                    </div>
                )}
                <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-100">
                    <span>TOTAL AMOUNT:</span>
                    <span className="font-mono">{formatPrice(order.total_amount || 0)}</span>
                </div>
            </div>

            {/* Delivery address & directions (only for DELIVERY mode) */}
            {order.fulfillment_mode === 'DELIVERY' && (order.delivery_address || order.delivery_directions) && (
                <div className="py-3 border-b border-dashed border-slate-400 text-xs space-y-1">
                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider font-mono">Delivery Details</h4>
                    {order.delivery_address && <div className="text-black font-medium">{order.delivery_address}</div>}
                    {order.delivery_directions && <div className="text-slate-600 italic">Directions: {order.delivery_directions}</div>}
                </div>
            )}

            {/* Dine-in Table number */}
            {order.fulfillment_mode === 'DINE_IN' && order.table_number && (
                <div className="py-3 border-b border-dashed border-slate-400 text-xs text-center">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block font-mono">Dine-in Table</span>
                    <span className="text-xl font-black text-black mt-1 block">TABLE {order.table_number}</span>
                </div>
            )}

            {/* Verification code PIN & QR */}
            <div className="py-4 flex flex-col items-center justify-center gap-3">
                {order.delivery_code && (
                    <div className="text-center">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider block font-mono">Delivery PIN Code</span>
                        <span className="text-lg font-black text-black font-mono tracking-widest bg-slate-100 border border-slate-200 px-3 py-1 rounded mt-1 inline-block">
                            {order.delivery_code}
                        </span>
                    </div>
                )}
                
                <div className="bg-white p-2 border border-slate-200 rounded-xl shadow-sm">
                    <QRCodeSVG
                        value={verificationUrl}
                        size={110}
                        bgColor="#ffffff"
                        fgColor="#000000"
                        level="M"
                    />
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 font-mono">Scan to Verify Pickup</span>
            </div>

            {/* Footer branding */}
            <div className="border-t border-slate-200 pt-3 text-center">
                <p className="text-[8px] text-slate-400 uppercase tracking-widest font-black font-mono">Thank you for dining with us! Powered by Chapuu</p>
            </div>

            {/* Media print style overrides specifically for print previews */}
            <style>
                {`
                    @media print {
                        body { background: white !important; color: black !important; }
                        nav, button, footer, .no-print { display: none !important; }
                        .print-slip-container {
                            width: 100% !important;
                            max-width: 100% !important;
                            padding: 0 !important;
                            border: 0 !important;
                            box-shadow: none !important;
                        }
                    }
                `}
            </style>
        </div>
    );
}
