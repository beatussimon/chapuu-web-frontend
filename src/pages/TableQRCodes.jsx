import { useState, useEffect, useRef } from 'react';
import apiClient from '../api/client';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Printer, Download, Store, Star, Calendar, Utensils } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TableQRCodes() {
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const storeAppUrl = window.location.origin;

    const [storeId, setStoreId] = useState(null);
    const [storeName, setStoreName] = useState('');

    const [newTableNum, setNewTableNum] = useState('');
    const [newTableCap, setNewTableCap] = useState(2);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        apiClient.get('/stores/')
            .then(res => {
                const stores = Array.isArray(res.data) ? res.data : [];
                if (stores.length > 0) {
                    const sid = stores[0].id;
                    setStoreId(sid);
                    setStoreName(stores[0].name);
                    return apiClient.get(`/stores/${sid}/tables/`);
                } else {
                    setLoading(false);
                    return Promise.reject("No stores found.");
                }
            })
            .then(res => {
                if (res) {
                    setTables(Array.isArray(res.data) ? res.data : []);
                    setLoading(false);
                }
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const printQRs = () => window.print();

    const downloadQR = (elementId, filename) => {
        const svg = document.getElementById(elementId);
        if (!svg) return;
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 400, 400);
            ctx.drawImage(img, 20, 20, 360, 360);
            const a = document.createElement('a');
            a.download = `${filename}.png`;
            a.href = canvas.toDataURL('image/png');
            a.click();
            toast.success('QR downloaded!');
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    const handleAddTable = (e) => {
        e.preventDefault();
        if (!storeId || !newTableNum) return;
        setSubmitting(true);
        apiClient.post(`/stores/${storeId}/tables/`, { number: newTableNum, capacity: newTableCap })
            .then(res => {
                toast.success(`Table ${newTableNum} added!`);
                setTables([...tables, res.data]);
                setNewTableNum('');
                setNewTableCap(2);
                setSubmitting(false);
            })
            .catch(err => {
                toast.error("Failed to add table");
                setSubmitting(false);
            });
    };

    // Store-level QR definitions
    const storeQRTypes = storeId ? [
        {
            key: 'menu',
            label: 'Menu QR',
            desc: 'Direct link to your menu — perfect for flyers, social media, and receipts',
            url: `${storeAppUrl}/scan?store=${storeId}`,
            icon: <Utensils size={20} />,
            color: 'primary',
            bgClass: 'bg-primary-500/10 border-primary-500/20',
            textClass: 'text-primary-400',
            badgeClass: 'bg-primary-500 text-dark-950',
        },
        {
            key: 'review',
            label: 'Review QR',
            desc: 'Customers scan to leave a review — place on receipts or checkout counter',
            url: `${storeAppUrl}/scan?store=${storeId}&action=review`,
            icon: <Star size={20} />,
            color: 'amber',
            bgClass: 'bg-amber-500/10 border-amber-500/20',
            textClass: 'text-amber-400',
            badgeClass: 'bg-amber-500 text-dark-950',
        },
        {
            key: 'reserve',
            label: 'Reservation QR',
            desc: 'Customers scan to make a reservation — post on your door or website',
            url: `${storeAppUrl}/scan?store=${storeId}&action=reserve`,
            icon: <Calendar size={20} />,
            color: 'indigo',
            bgClass: 'bg-indigo-500/10 border-indigo-500/20',
            textClass: 'text-indigo-400',
            badgeClass: 'bg-indigo-500 text-white',
        },
    ] : [];

    if (loading) return <div className="p-8 text-slate-400 animate-pulse">Loading tables...</div>;

    return (
        <div className="w-full max-w-6xl mx-auto py-8 space-y-10">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8 print:hidden">
                <div className="flex items-center gap-4">
                    <div className="bg-primary-500/10 p-3 rounded-xl border border-primary-500/20">
                        <QrCode className="text-primary-500" size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-white">QR Code Hub</h2>
                        <p className="text-slate-400">Generate QR codes for tables, menus, reviews, and reservations</p>
                    </div>
                </div>
                <button
                    onClick={printQRs}
                    className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-dark-900 font-bold px-6 py-3 rounded-xl transition-all shadow-lg print:hidden w-full sm:w-auto"
                >
                    <Printer size={20} /> Print All
                </button>
            </div>

            {/* Store-Level QR Codes */}
            {storeQRTypes.length > 0 && (
                <div className="print:hidden">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Store size={20} className="text-slate-400" /> Store QR Codes
                        <span className="text-sm font-normal text-slate-500 ml-2">— use these on flyers, social media, and marketing materials</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {storeQRTypes.map(qr => (
                            <div key={qr.key} className={`rounded-2xl p-6 border flex flex-col items-center text-center ${qr.bgClass}`}>
                                <div className={`${qr.badgeClass} px-3 py-1 rounded-lg text-xs font-bold mb-4 flex items-center gap-1`}>
                                    {qr.icon} {qr.label}
                                </div>
                                <div className="bg-white p-3 rounded-xl mb-4 shadow-lg">
                                    <QRCodeSVG
                                        id={`store-qr-${qr.key}`}
                                        value={qr.url}
                                        size={140}
                                        bgColor="#ffffff"
                                        fgColor="#0f172a"
                                        level="M"
                                    />
                                </div>
                                <p className="text-sm text-slate-400 mb-3 leading-relaxed">{qr.desc}</p>
                                <button
                                    onClick={() => downloadQR(`store-qr-${qr.key}`, `${storeName}-${qr.key}-qr`)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${qr.textClass} bg-white/5 hover:bg-white/10`}
                                >
                                    <Download size={14} /> Download PNG
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Table Management + Add Table */}
            <div className="print:hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <h3 className="text-xl font-bold text-white flex flex-wrap items-center gap-2">
                        Table QR Codes
                        <span className="text-sm font-normal text-slate-500">— customers scan to order directly to their table</span>
                    </h3>
                    <form onSubmit={handleAddTable} className="flex w-full md:w-auto gap-2 items-center bg-dark-900 border border-white/10 p-2 rounded-xl">
                        <input
                            type="text"
                            placeholder="Tbl Num"
                            value={newTableNum}
                            onChange={e => setNewTableNum(e.target.value)}
                            required
                            className="flex-1 md:w-20 bg-dark-950 border border-white/10 rounded-lg px-2.5 py-2 text-sm text-slate-200 focus:border-primary-500 outline-none"
                        />
                        <input
                            type="number"
                            placeholder="Seats"
                            min="1"
                            value={newTableCap}
                            onChange={e => setNewTableCap(e.target.value)}
                            className="flex-1 md:w-16 bg-dark-950 border border-white/10 rounded-lg px-2.5 py-2 text-sm text-slate-200 focus:border-primary-500 outline-none"
                        />
                        <button
                            type="submit"
                            disabled={submitting}
                            className="bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                        >
                            {submitting ? '...' : '+ Add'}
                        </button>
                    </form>
                </div>
            </div>

            <style>
                {`
                    @media print {
                        body { background: white; color: black; }
                        .glass-dark, .bg-dark-950, .text-slate-400 { background: white !important; border: 1px solid #ccc !important; color: black !important; }
                        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        nav { display: none !important; }
                    }
                `}
            </style>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 print:gap-12 print:grid-cols-3">
                {tables.map(t => {
                    const scanUrl = `${storeAppUrl}/scan?store=${storeId}&table=${t.id}`;
                    return (
                        <div key={t.id} className="glass-dark rounded-3xl p-6 border border-white/10 flex flex-col items-center text-center print:border-slate-300 print:shadow-none break-inside-avoid">
                            <h3 className="text-2xl font-black text-white print:text-black mb-1">TABLE {t.number}</h3>
                            <p className="text-sm text-slate-400 print:text-slate-600 mb-4">{t.capacity} Seats</p>

                            <div className="bg-white p-4 rounded-2xl border-2 border-white/20 print:border-slate-200 mb-4 shadow-xl">
                                <QRCodeSVG
                                    id={`table-qr-${t.id}`}
                                    value={scanUrl}
                                    size={160}
                                    bgColor={"#ffffff"}
                                    fgColor={"#0f172a"}
                                    level={"M"}
                                />
                            </div>

                            <p className="text-sm font-medium text-primary-400 print:text-slate-800 mb-3">Scan to Order</p>
                            <button
                                onClick={() => downloadQR(`table-qr-${t.id}`, `table-${t.number}-qr`)}
                                className="flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors print:hidden"
                            >
                                <Download size={12} /> Download
                            </button>
                        </div>
                    );
                })}
            </div>

            {tables.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                    <QrCode size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No tables yet. Add one above to generate QR codes.</p>
                </div>
            )}
        </div>
    );
}
