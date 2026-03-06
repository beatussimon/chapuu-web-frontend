import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCurrency } from '../utils/useCurrency';
import { Link } from 'react-router-dom';
import { Utensils, QrCode, Zap, Clock, Star, ChefHat, ArrowRight, Store, TrendingUp, Users, Calendar, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../store/useStore';
import apiClient from '../api/client';

export default function LandingPage() {
    const { token, userRole } = useAppStore();
    const isAuthenticated = !!token;
    const { formatPrice } = useCurrency();

    const [stats, setStats] = useState({
        metrics: { total_stores: 0, total_meals_served: 0 },
        top_stores: [],
        trending_items: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiClient.get('/stats/billboard/')
            .then(res => {
                setStats(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load billboard stats", err);
                setLoading(false);
            });
    }, []);

    const getDashboardLink = () => {
        if (!token) return '/login';
        if (userRole === 'SELLER') return '/seller';
        if (userRole === 'ADMIN') return '/admin';
        return '/menu';
    };

    const faqs = [
        { q: "How does table reservation work?", a: "Simply browse restaurants, select an available time, and your table is instantly secured. You can optionally pre-order your meals so they are prepared right as you arrive." },
        { q: "Can I order food without a reservation?", a: "Yes! You can order for Pickup or Delivery, or simply scan a table's QR code when you walk in to start a Dine-In session instantly." },
        { q: "How do loyalty points work?", a: "For every $1 you spend on the platform, you earn 1 loyalty point. These points are automatically tracked in your Customer Dashboard." },
        { q: "Is my payment information secure?", a: "Absolutely. We use enterprise-grade encryption and secure payment gateways. Our staff never sees your raw payment details." },
        { q: "I'm a restaurant owner. How do I join?", a: "Currently, our platform is invite-only for vendors to ensure quality. Contact our support team to request a vendor application." }
    ];
    const [openFaq, setOpenFaq] = useState(null);

    return (
        <div className="w-full flex-grow flex flex-col items-center pb-20">
            {/* Hero Section */}
            <section className="w-full relative overflow-hidden py-20 lg:py-24 flex flex-col items-center text-center px-4">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full bg-primary-500/10 blur-[120px] rounded-full pointer-events-none"></div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="z-10 max-w-5xl flex flex-col items-center"
                >
                    <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-gradient-to-r from-primary-500/10 to-orange-500/10 border border-primary-500/20 text-primary-400 font-bold text-sm mb-8 shadow-lg shadow-primary-500/5">
                        <TrendingUp size={18} className="text-orange-500" />
                        Live Platform Activity
                    </div>

                    {!isAuthenticated && (
                        <>
                            <h1 className="text-6xl md:text-8xl font-black mb-6 leading-tight">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-orange-500 to-red-500">
                                    Skip the Wait.<br />Savor the Moment.
                                </span>
                            </h1>
                            <p className="text-xl md:text-2xl text-slate-300 mb-10 max-w-3xl font-light">
                                Discover top-rated kitchens, reserve a table, and perfectly time your meal before you even arrive.
                            </p>
                        </>
                    )}

                    {!isAuthenticated && (
                        <div className="flex flex-col sm:flex-row gap-4 mb-16">
                            <Link to="/register" className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-dark-950 font-black px-10 py-5 rounded-full transition-all shadow-xl shadow-primary-500/25 flex items-center justify-center gap-3 transform hover:-translate-y-1 text-lg">
                                Sign Up & Eat <ArrowRight size={24} />
                            </Link>
                            <Link to="/login" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold px-8 py-5 rounded-full transition-all flex items-center justify-center gap-2 backdrop-blur-sm text-lg">
                                Seller Portal
                            </Link>
                        </div>
                    )}

                    {/* Live Metric Tickers */}
                    <div className="grid grid-cols-2 gap-6 w-full max-w-2xl">
                        <div className="glass-dark border border-white/10 rounded-3xl p-6 text-center shadow-2xl">
                            <h4 className="text-slate-400 font-bold text-sm mb-2 uppercase tracking-widest">Active Kitchens</h4>
                            <p className="text-4xl font-black text-white">{loading ? '-' : stats.metrics.total_stores}</p>
                        </div>
                        <div className="glass-dark border border-white/10 rounded-3xl p-6 text-center shadow-2xl">
                            <h4 className="text-slate-400 font-bold text-sm mb-2 uppercase tracking-widest">Meals Served</h4>
                            <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">{loading ? '-' : stats.metrics.total_meals_served}</p>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* Dynamic Content Grid */}
            <div className="w-full max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 mt-10">

                {/* Top Restaurants */}
                <section>
                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                        <h2 className="text-3xl font-black text-white flex items-center gap-3">
                            <Store className="text-primary-500" size={32} />
                            Trending Kitchens
                        </h2>
                        <Link to="/stores" className="text-primary-400 font-bold hover:text-primary-300 transition-colors">View All</Link>
                    </div>

                    <div className="grid gap-4">
                        {loading ? (
                            [1, 2, 3].map(i => <div key={i} className="h-32 bg-white/5 rounded-3xl animate-pulse"></div>)
                        ) : stats.top_stores.length > 0 ? (
                            stats.top_stores.map((store, index) => (
                                <Link to={`/stores`} key={store.id}>
                                    <motion.div
                                        whileHover={{ scale: 1.02 }}
                                        className="glass-dark border border-white/5 hover:border-primary-500/30 rounded-3xl p-4 flex gap-6 items-center transition-all shadow-lg hover:shadow-primary-500/10 cursor-pointer"
                                    >
                                        <div className="text-2xl font-black text-slate-700 w-8 text-center">#{index + 1}</div>
                                        <div className="w-24 h-24 rounded-2xl bg-dark-900 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                                            {store.image_url ? (
                                                <img src={store.image_url} alt={store.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Store size={32} className="text-slate-600" />
                                            )}
                                        </div>
                                        <div className="flex-grow">
                                            <h3 className="text-2xl font-bold text-white mb-1">{store.name}</h3>
                                            <p className="text-slate-400 text-sm mb-2">{store.location}</p>
                                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-green-500/10 text-green-400 text-xs font-bold border border-green-500/20">
                                                <Utensils size={14} /> {store.completed_orders} Orders Completed
                                            </div>
                                        </div>
                                    </motion.div>
                                </Link>
                            ))
                        ) : (
                            <div className="text-center p-10 glass-dark rounded-3xl border border-white/5 text-slate-500">No stores found yet.</div>
                        )}
                    </div>
                </section>

                {/* Most Ordered Items */}
                <section>
                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                        <h2 className="text-3xl font-black text-white flex items-center gap-3">
                            <TrendingUp className="text-orange-500" size={32} />
                            Platform Top Picks
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {loading ? (
                            [1, 2, 3, 4].map(i => <div key={i} className="h-48 bg-white/5 rounded-3xl animate-pulse"></div>)
                        ) : stats.trending_items.length > 0 ? (
                            stats.trending_items.map((item, index) => (
                                <motion.div
                                    key={item.id}
                                    whileHover={{ y: -5 }}
                                    className="glass-dark border border-white/5 rounded-3xl p-5 relative overflow-hidden group hover:border-orange-500/30 transition-all shadow-lg"
                                >
                                    <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-black px-4 py-1 rounded-bl-xl z-20 shadow-md">
                                        #{index + 1} Popular
                                    </div>

                                    <div className="w-full h-32 rounded-xl bg-dark-900 mb-4 overflow-hidden relative">
                                        {item.image_url ? (
                                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Utensils size={32} className="text-slate-600" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-transparent to-transparent"></div>
                                        <div className="absolute bottom-2 left-3 right-3 flex justify-between items-end">
                                            <span className="text-xs font-bold text-slate-300 truncate w-3/4 shadow-sm">{item.store_name}</span>
                                            <span className="bg-primary-500 text-dark-950 px-2 py-1 rounded-md text-xs font-black shadow-lg">{formatPrice(item.price)}</span>
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">{item.name}</h3>
                                    <p className="text-sm text-slate-400 flex items-center gap-1 font-medium">
                                        <Users size={14} className="text-slate-500" /> Ordered {item.times_ordered} times
                                    </p>
                                </motion.div>
                            ))
                        ) : (
                            <div className="col-span-2 text-center p-10 glass-dark rounded-3xl border border-white/5 text-slate-500">No orders placed yet.</div>
                        )}
                    </div>
                </section>
            </div>

            {/* FAQ Section */}
            <section className="w-full max-w-4xl mx-auto mt-24 px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Frequently Asked Questions</h2>
                    <p className="text-slate-400">Everything you need to know about the platform.</p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, idx) => (
                        <div key={idx} className="glass-dark border border-white/5 rounded-2xl overflow-hidden transition-all duration-300 hover:border-primary-500/30">
                            <button
                                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                                className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                            >
                                <span className="text-lg font-bold text-slate-200">{faq.q}</span>
                                <motion.div animate={{ rotate: openFaq === idx ? 180 : 0 }}>
                                    <ChevronDown className="text-primary-500" />
                                </motion.div>
                            </button>

                            <motion.div
                                initial={false}
                                animate={{ height: openFaq === idx ? 'auto' : 0, opacity: openFaq === idx ? 1 : 0 }}
                                className="overflow-hidden"
                            >
                                <div className="px-6 pb-6 pt-0 text-slate-400 border-t border-white/5 mt-2 pt-4">
                                    {faq.a}
                                </div>
                            </motion.div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Call to action */}
            <section className="w-full max-w-4xl mx-auto mt-24 mb-10 px-4">
                <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-[3rem] p-12 text-center relative overflow-hidden shadow-2xl shadow-indigo-500/20 border border-white/10">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/30 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/30 rounded-full blur-3xl -ml-32 -mb-32"></div>

                    <h2 className="text-4xl md:text-5xl font-black text-white mb-6 relative z-10">Ready to skip the line?</h2>
                    <p className="text-xl text-indigo-200 mb-10 relative z-10 max-w-xl mx-auto">Reserve a table and pre-order your food so it's ready the moment you sit down.</p>

                    <Link to={isAuthenticated ? "/stores" : "/register"} className="relative z-10 bg-white text-indigo-950 font-black px-12 py-5 rounded-full inline-flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl text-lg">
                        <Calendar size={24} /> Book a Table Now
                    </Link>
                </div>
            </section>
        </div>
    );
}
