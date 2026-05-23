import { useState, useEffect, useMemo } from 'react';
import apiClient from '../../api/client';
import { motion } from 'framer-motion';
import {
    BarChart3, TrendingUp, DollarSign, ShoppingBag, Clock, AlertTriangle,
    Calendar, Download, RefreshCw, Target, Lightbulb, ArrowUpRight, ArrowDownRight,
    Percent, CheckCircle2
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { useCurrency } from '../../utils/useCurrency';
import toast from 'react-hot-toast';

const COLORS = ['#06b6d4', '#8b5cf6', '#f97316', '#22c55e', '#ef4444', '#eab308', '#ec4899', '#3b82f6'];

const PRESETS = [
    { label: 'Today', days: 0 },
    { label: '7 Days', days: 7 },
    { label: '30 Days', days: 30 },
    { label: '90 Days', days: 90 },
    { label: 'This Year', days: 365 },
];

export default function SellerAnalytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activePreset, setActivePreset] = useState(2); // default 30 days
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const { formatPrice } = useCurrency();

    const getDateRange = (presetIdx) => {
        if (presetIdx < 0) return null;
        const to = new Date();
        const from = new Date();
        if (presetIdx === 0) {
            // Today only
        } else {
            const preset = PRESETS[presetIdx];
            if (preset) {
                from.setDate(from.getDate() - preset.days);
            }
        }
        return {
            from: from.toISOString().split('T')[0],
            to: to.toISOString().split('T')[0],
        };
    };

    const fetchAnalytics = (fromDate, toDate) => {
        if (!fromDate || !toDate) return;
        setLoading(true);
        apiClient.get(`/analytics/seller/?from=${fromDate}&to=${toDate}`)
            .then(res => {
                setData(res.data);
                setLoading(false);
            })
            .catch(err => {
                toast.error('Failed to load analytics');
                setLoading(false);
            });
    };

    useEffect(() => {
        if (activePreset >= 0) {
            const range = getDateRange(activePreset);
            fetchAnalytics(range.from, range.to);
        }
    }, [activePreset]);

    const handleCustomRange = () => {
        if (customFrom && customTo) {
            setActivePreset(-1);
            fetchAnalytics(customFrom, customTo);
        } else {
            toast.error('Please select both start and end dates');
        }
    };

    const handleExportCSV = () => {
        if (!data || !data.date_range) return;
        const rows = [['Date', 'Revenue', 'Orders']];
        const revenueData = Array.isArray(data.revenue_by_day) ? data.revenue_by_day : [];
        revenueData.forEach(d => rows.push([d.day, d.revenue, d.count]));
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics_${data.date_range.from}_to_${data.date_range.to}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Report exported!');
    };

    const kpi = data?.kpi || {};

    return (
        <div className="w-full max-w-[1400px] mx-auto space-y-8">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                        Business Analytics
                    </h1>
                    <p className="text-slate-400 mt-1">Track your performance, revenue, and growth</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            if (activePreset < 0) {
                                fetchAnalytics(customFrom, customTo);
                            } else {
                                const range = getDateRange(activePreset);
                                fetchAnalytics(range.from, range.to);
                            }
                        }}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={18} />
                    </button>
                    <button
                        onClick={handleExportCSV}
                        disabled={!data}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                        <Download size={16} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Date Range Picker */}
            <div className="glass-dark border border-white/10 rounded-2xl p-4">
                <div className="flex flex-wrap items-center gap-2">
                    <Calendar size={18} className="text-slate-400" />
                    {PRESETS.map((p, idx) => (
                        <button
                            key={p.label}
                            onClick={() => setActivePreset(idx)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activePreset === idx
                                ? 'bg-cyan-500 text-dark-950 shadow-lg shadow-cyan-500/20'
                                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            {p.label}
                        </button>
                    ))}
                    <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 w-full lg:w-auto lg:ml-auto mt-4 lg:mt-0">
                        <div className="flex items-center gap-2 w-full lg:w-auto flex-1">
                            <input
                                type="date"
                                value={customFrom}
                                onChange={e => setCustomFrom(e.target.value)}
                                className="bg-dark-900 border border-white/10 rounded-lg px-2 py-2 text-xs md:text-sm text-slate-300 focus:border-cyan-500 outline-none flex-1 min-w-0"
                                style={{ colorScheme: 'dark' }}
                            />
                            <span className="text-slate-500 shrink-0">→</span>
                            <input
                                type="date"
                                value={customTo}
                                onChange={e => setCustomTo(e.target.value)}
                                className="bg-dark-900 border border-white/10 rounded-lg px-2 py-2 text-xs md:text-sm text-slate-300 focus:border-cyan-500 outline-none flex-1 min-w-0"
                                style={{ colorScheme: 'dark' }}
                            />
                        </div>
                        <button
                            onClick={handleCustomRange}
                            className="w-full lg:w-auto px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-sm font-bold text-slate-300 transition-colors"
                        >
                            Apply
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="glass-dark border border-white/10 rounded-2xl p-6 animate-pulse h-32" />
                    ))}
                    <div className="col-span-full glass-dark border border-white/10 rounded-2xl animate-pulse h-80" />
                </div>
            ) : data ? (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                        {/* Total Revenue */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
                            className="glass-dark border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-cyan-500/30 transition-colors"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full -mr-8 -mt-8 group-hover:bg-cyan-500/10 transition-colors" />
                            <p className="text-slate-400 text-sm font-medium mb-1">Total Revenue</p>
                            <h3 className="text-2xl md:text-3xl font-bold text-white">{formatPrice(kpi.total_revenue)}</h3>
                            <div className="flex items-center gap-1 mt-2 text-xs text-cyan-400 font-medium">
                                <DollarSign size={14} /> From {kpi.completed_orders} completed orders
                            </div>
                        </motion.div>

                        {/* Net Revenue */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                            className="glass-dark border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-500/30 transition-colors"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/5 rounded-full -mr-8 -mt-8 group-hover:bg-slate-500/10 transition-colors" />
                            <p className="text-slate-400 text-sm font-medium mb-1">Net Revenue</p>
                            <h3 className="text-2xl md:text-3xl font-bold text-white">{formatPrice(kpi.net_revenue)}</h3>
                            <div className="flex items-center gap-1 mt-2 text-xs text-slate-400 font-medium">
                                <TrendingUp size={14} /> After commission fees
                            </div>
                        </motion.div>

                        {/* Platform Commission */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                            className="glass-dark border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-500/30 transition-colors"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/5 rounded-full -mr-8 -mt-8 group-hover:bg-slate-500/10 transition-colors" />
                            <p className="text-slate-400 text-sm font-medium mb-1">Platform Commission</p>
                            <h3 className="text-2xl md:text-3xl font-bold text-white">{formatPrice(kpi.total_commission)}</h3>
                            <div className="flex items-center gap-1 mt-2 text-xs text-slate-400 font-medium">
                                <Percent size={14} /> 3% fee on sales
                            </div>
                        </motion.div>

                        {/* Total Orders */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                            className="glass-dark border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-purple-500/30 transition-colors"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -mr-8 -mt-8 group-hover:bg-purple-500/10 transition-colors" />
                            <p className="text-slate-400 text-sm font-medium mb-1">Total Orders</p>
                            <h3 className="text-2xl md:text-3xl font-bold text-white">{kpi.total_orders}</h3>
                            <div className="flex items-center gap-1 mt-2 text-xs text-purple-400 font-medium">
                                <ShoppingBag size={14} /> {kpi.cancelled_orders} cancelled
                            </div>
                        </motion.div>

                        {/* Avg Order Value */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                            className="glass-dark border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-green-500/30 transition-colors"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full -mr-8 -mt-8 group-hover:bg-green-500/10 transition-colors" />
                            <p className="text-slate-400 text-sm font-medium mb-1">Avg Order Value</p>
                            <h3 className="text-2xl md:text-3xl font-bold text-white">{formatPrice(kpi.avg_order_value)}</h3>
                            <div className="flex items-center gap-1 mt-2 text-xs text-green-400 font-medium">
                                <Target size={14} /> Per completed order
                            </div>
                        </motion.div>

                        {/* Completion Rate */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                            className="glass-dark border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-amber-500/30 transition-colors"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-8 -mt-8 group-hover:bg-amber-500/10 transition-colors" />
                            <p className="text-slate-400 text-sm font-medium mb-1">Completion Rate</p>
                            <h3 className="text-2xl md:text-3xl font-bold text-white">{kpi.completion_rate}%</h3>
                            <div className="flex items-center gap-1 mt-2 text-xs text-amber-400 font-medium">
                                <CheckCircle2 size={14} /> {kpi.completed_orders} / {kpi.total_orders}
                            </div>
                        </motion.div>
                    </div>

                    {/* Charts Row 1 */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                        {/* Revenue Over Time */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                            className="xl:col-span-2 glass-dark border border-white/10 rounded-2xl p-6"
                        >
                            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                                <TrendingUp size={20} className="text-cyan-400" /> Revenue Over Time
                            </h3>
                            <p className="text-sm text-slate-500 mb-6">Daily gross and net revenue for the selected period</p>
                            <ResponsiveContainer width="100%" height={280} initialDimension={{ width: 400, height: 280 }}>
                                <AreaChart data={Array.isArray(data?.revenue_by_day) ? data.revenue_by_day : []}>
                                    <defs>
                                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                                        tickFormatter={v => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    />
                                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                                        tickFormatter={v => formatPrice(v)}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                        labelFormatter={v => new Date(v).toLocaleDateString()}
                                        formatter={(value, name) => [formatPrice(value), name]}
                                    />
                                    <Legend verticalAlign="top" height={36} content={({ payload }) => (
                                        <div className="flex justify-end gap-6 text-xs font-medium text-slate-400 mb-2">
                                            {payload.map((entry, idx) => (
                                                <div key={idx} className="flex items-center gap-1.5">
                                                    <div className="w-3 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                                    <span>{entry.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )} />
                                    <Area type="monotone" dataKey="revenue" name="Gross Revenue" stroke="#06b6d4" strokeWidth={2} fill="url(#revGrad)" />
                                    <Area type="monotone" dataKey="net_revenue" name="Net Revenue" stroke="#22c55e" strokeWidth={2} fill="url(#netGrad)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </motion.div>

                        {/* Fulfillment Breakdown */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                            className="glass-dark border border-white/10 rounded-2xl p-6"
                        >
                            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                                <Percent size={20} className="text-purple-400" /> Fulfillment Mix
                            </h3>
                            <p className="text-sm text-slate-500 mb-4">Order types breakdown</p>
                            <ResponsiveContainer width="100%" height={220} initialDimension={{ width: 400, height: 220 }}>
                                <PieChart>
                                    <Pie
                                        data={Array.isArray(data?.fulfillment_breakdown) ? data.fulfillment_breakdown : []}
                                        cx="50%" cy="50%"
                                        innerRadius={55} outerRadius={85}
                                        paddingAngle={4}
                                        dataKey="count"
                                        nameKey="fulfillment_mode"
                                    >
                                        {(Array.isArray(data?.fulfillment_breakdown) ? data.fulfillment_breakdown : []).map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                        formatter={(value, name) => [value, name.replace('_', ' ')]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-wrap justify-center gap-3 mt-2">
                                {(Array.isArray(data?.fulfillment_breakdown) ? data.fulfillment_breakdown : []).map((f, i) => (
                                    <div key={f.fulfillment_mode} className="flex items-center gap-2 text-xs">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                        <span className="text-slate-300">{f.fulfillment_mode.replace('_', ' ')} ({f.count})</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Charts Row 2 */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                        {/* Orders by Hour */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                            className="glass-dark border border-white/10 rounded-2xl p-6"
                        >
                            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                                <Clock size={20} className="text-amber-400" /> Orders by Hour
                            </h3>
                            <p className="text-sm text-slate-500 mb-6">Identify your peak business hours</p>
                            <ResponsiveContainer width="100%" height={250} initialDimension={{ width: 400, height: 250 }}>
                                <BarChart data={Array.isArray(data?.orders_by_hour) ? data.orders_by_hour : []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                                        tickFormatter={h => `${h}:00`}
                                    />
                                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                        labelFormatter={h => `${h}:00 - ${h}:59`}
                                    />
                                    <Bar dataKey="count" fill="#eab308" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </motion.div>

                        {/* Top Products */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                            className="glass-dark border border-white/10 rounded-2xl p-6"
                        >
                            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                                <BarChart3 size={20} className="text-green-400" /> Top Products
                            </h3>
                            <p className="text-sm text-slate-500 mb-4">Best sellers by revenue</p>
                            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2">
                                {(Array.isArray(data?.top_products) ? data.top_products : []).map((p, idx) => {
                                    const maxRev = (Array.isArray(data?.top_products) ? data.top_products : [])[0]?.total_revenue || 1;
                                    const pct = (p.total_revenue / maxRev) * 100;
                                    return (
                                        <div key={p.product_name} className="group">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-slate-400">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="text-sm font-medium text-slate-200 truncate max-w-[160px]">{p.product_name}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-sm font-bold text-white">{formatPrice(p.total_revenue)}</span>
                                                    <span className="text-xs text-slate-500 ml-2">{p.total_sold} sold</span>
                                                </div>
                                            </div>
                                            <div className="w-full bg-dark-900 rounded-full h-1.5 overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${pct}%` }}
                                                    transition={{ delay: 0.8 + idx * 0.05, duration: 0.5 }}
                                                    className="h-full rounded-full"
                                                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                                {(Array.isArray(data?.top_products) ? data.top_products : []).length === 0 && (
                                    <p className="text-slate-500 text-sm text-center py-8">No product data for this period</p>
                                )}
                            </div>
                        </motion.div>
                    </div>

                    {/* Insights Section */}
                    {Array.isArray(data?.insights) && data.insights.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
                            className="glass-dark border border-cyan-500/20 rounded-2xl p-6"
                        >
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Lightbulb size={20} className="text-cyan-400" /> Business Insights
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {data.insights.map((insight, idx) => (
                                    <div key={idx} className="bg-dark-900/50 border border-white/5 rounded-xl p-4 flex items-start gap-3 hover:border-cyan-500/20 transition-colors">
                                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                            <Lightbulb size={16} className="text-cyan-400" />
                                        </div>
                                        <p className="text-sm text-slate-300 leading-relaxed">{insight}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Order State Breakdown */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
                        className="glass-dark border border-white/10 rounded-2xl p-6"
                    >
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <ShoppingBag size={20} className="text-purple-400" /> Order Status Breakdown
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            {(Array.isArray(data?.state_breakdown) ? data.state_breakdown : []).map((s, idx) => {
                                const stateColors = {
                                    COMPLETED: 'bg-green-500/10 text-green-400 border-green-500/20',
                                    CANCELLED: 'bg-red-500/10 text-red-400 border-red-500/20',
                                    PREPARING: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
                                    READY: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
                                    QUEUED: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
                                    PAID: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
                                    AWAITING_PAYMENT: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
                                    CREATED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                                };
                                return (
                                    <div key={s.state} className={`px-4 py-3 rounded-xl border font-medium text-sm ${stateColors[s.state] || 'bg-white/5 text-slate-400 border-white/10'}`}>
                                        {s.state.replace('_', ' ')} <span className="font-bold ml-1">{s.count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                </>
            ) : (
                <div className="text-center py-20 text-slate-500">
                    <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No analytics data available</p>
                </div>
            )}
        </div>
    );
}
