import React from 'react';
import { motion } from 'framer-motion';
import { Scale, User, Store, ShieldAlert, ScrollText, CheckCircle } from 'lucide-react';

export default function TermsAndConditions() {
    return (
        <div className="w-full max-w-5xl mx-auto py-12 px-4 min-h-[85vh]">
            {/* Page Header */}
            <div className="text-center mb-16 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-primary-500/10 rounded-full blur-[80px] pointer-events-none"></div>
                <div className="inline-flex items-center justify-center p-4 bg-primary-500/10 rounded-2xl mb-6 border border-primary-500/20 relative z-10">
                    <ScrollText size={48} className="text-primary-400" />
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4 relative z-10">
                    Terms & Mutual Liability Policy
                </h1>
                <p className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed relative z-10">
                    Please read this document carefully. By using Chapuu, both Customers and Merchants agree to take full responsibility and liability for their respective decisions and actions on the platform.
                </p>
            </div>

            {/* Core Agreement Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                {/* User Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-dark border border-white/5 rounded-3xl p-8 hover:border-primary-500/20 transition-all duration-300 relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center mb-6">
                        <User size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">User & Customer Liability</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        You are fully responsible for your dining reservations, ordering selections, dine-in table scans, payment verification proofs, and overall consumption choices.
                    </p>
                </motion.div>

                {/* Store Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-dark border border-white/5 rounded-3xl p-8 hover:border-primary-500/20 transition-all duration-300 relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center mb-6">
                        <Store size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">Store & Vendor Liability</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Merchants carry exclusive liability for menu pricing accuracy, ingredient allergen warnings, kitchen preparation quality, hygiene standards, POS ordering, and receipt auditing.
                    </p>
                </motion.div>

                {/* Platform Disclaimer */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="glass-dark border border-white/5 rounded-3xl p-8 hover:border-primary-500/20 transition-all duration-300 relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center justify-center mb-6">
                        <Scale size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">Facilitator Disclaimer</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Chapuu is a pure technological facilitator connecting customers with independent sellers. We do not cook, serve, or own any retail stock, and hold zero liability for local disputes.
                    </p>
                </motion.div>
            </div>

            {/* Detailed Legal Sections */}
            <div className="glass-dark border border-white/10 rounded-3xl p-8 md:p-12 space-y-12">
                
                {/* SECTION 1 */}
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <span className="text-primary-500">01.</span> Scope & Acceptance
                    </h2>
                    <p className="text-slate-300 leading-relaxed">
                        By creating an account, placing an order, checking in via QR codes, or registering a shop on Chapuu, you explicitly warrant that you possess the legal capacity to enter into this contract and agree to be fully bound by these terms. This policy constitutes a legally binding contract between users (customers), stores (independent merchants), and Chapuu (the platform).
                    </p>
                </div>

                <hr className="border-white/5" />

                {/* SECTION 2 */}
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <span className="text-primary-500">02.</span> Customer Responsibilities & Liability
                    </h2>
                    <p className="text-slate-300 leading-relaxed">
                        As a registered Customer, you acknowledge that you are solely liable for the decisions you make on the platform, including but not limited to:
                    </p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-400 text-sm">
                        <li className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                            <CheckCircle size={18} className="text-primary-500 shrink-0 mt-0.5" />
                            <span><strong>Reservation Failures & No-Shows:</strong> Failing to attend a confirmed reservation may trigger a status flag or table reservation restriction. You are responsible for canceling in advance.</span>
                        </li>
                        <li className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                            <CheckCircle size={18} className="text-primary-500 shrink-0 mt-0.5" />
                            <span><strong>Incorrect Order Inputs:</strong> Double-checking quantity limits, fulfillment selections (Dine-in, Takeaway, Delivery), and specific delivery coordinates is your complete responsibility.</span>
                        </li>
                        <li className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                            <CheckCircle size={18} className="text-primary-500 shrink-0 mt-0.5" />
                            <span><strong>Offline Payment Proofs:</strong> If submitting an offline payment receipt, you are responsible for uploading a valid transaction record. Fraudulent or mismatching references are fully punishable.</span>
                        </li>
                        <li className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                            <CheckCircle size={18} className="text-primary-500 shrink-0 mt-0.5" />
                            <span><strong>Cart & Inventory Actions:</strong> Finalizing orders triggers immediate local stock deductions. Placing frivolous orders that tie up inventory is strictly forbidden.</span>
                        </li>
                    </ul>
                </div>

                <hr className="border-white/5" />

                {/* SECTION 3 */}
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <span className="text-primary-500">03.</span> Store & Merchant Responsibilities & Liability
                    </h2>
                    <p className="text-slate-300 leading-relaxed">
                        Registered Stores and their employed staff (Chefs, Accountants, Delivery Drivers, and POS operators) are solely liable for their business operations and decisions:
                    </p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-400 text-sm">
                        <li className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                            <CheckCircle size={18} className="text-primary-500 shrink-0 mt-0.5" />
                            <span><strong>Menu Accuracy & Allergens:</strong> Stores carry direct legal liability for maintaining updated and precise menu listings, descriptions, dietary labels, and warning of potential food allergens.</span>
                        </li>
                        <li className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                            <CheckCircle size={18} className="text-primary-500 shrink-0 mt-0.5" />
                            <span><strong>Food Safety & Preparation:</strong> Merchants hold sole product liability for the food prepared. Any health hazard, sanitary violation, or hygiene issues rest exclusively on the vendor's shoulders.</span>
                        </li>
                        <li className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                            <CheckCircle size={18} className="text-primary-500 shrink-0 mt-0.5" />
                            <span><strong>Transaction Audits:</strong> Accountants and Sellers are responsible for auditing receipt references prior to marking an order as PAID. Waiving receipts at the counter is the store's financial decision.</span>
                        </li>
                        <li className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                            <CheckCircle size={18} className="text-primary-500 shrink-0 mt-0.5" />
                            <span><strong>POS Staff Operations:</strong> Any manual transaction entered by store employees on the Seller Point-of-Sale dashboard binds the store directly; staff actions are the liability of the vendor owner.</span>
                        </li>
                    </ul>
                </div>

                <hr className="border-white/5" />

                {/* SECTION 4 */}
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <span className="text-primary-500">04.</span> Platform Role & Liability Limitations
                    </h2>
                    <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-6 flex gap-4 items-start">
                        <ShieldAlert size={28} className="text-red-400 shrink-0 mt-1" />
                        <div className="space-y-2">
                            <h4 className="text-lg font-bold text-white">Critical Platform Disclaimer</h4>
                            <p className="text-slate-300 text-sm leading-relaxed">
                                Chapuu does not prepare, deliver, inspect, or manage any of the products or ingredients listed. We provide the digital marketplace platform as-is. All agreements and transaction fulfillments occur strictly between the Customer and the Store. Chapuu disclaims all warranties, express or implied, and is not liable for health damages, payment proof discrepancies, loss of profits, or delivery driver conduct.
                            </p>
                        </div>
                    </div>
                </div>

                <hr className="border-white/5" />

                {/* SECTION 5 */}
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <span className="text-primary-500">05.</span> Agreement to Arbitrate & Dispute Resolutions
                    </h2>
                    <p className="text-slate-300 leading-relaxed text-sm">
                        In case of any dispute between a Customer and a Store, both parties must attempt to resolve the issue directly with the store owner first. If unresolved, the user may report the vendor using our support forms. However, Chapuu holds no authority to enforce refunds, adjust bank accounts, or arbitrate claims, and all financial reconciliations must be requested directly from the corresponding merchant.
                    </p>
                </div>

                <hr className="border-white/5" />

                {/* SECTION 6 */}
                <div className="space-y-4 text-left">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <span className="text-primary-500">06.</span> Location Data & Privacy
                    </h2>
                    <p className="text-slate-300 leading-relaxed">
                        Chapuu utilizes your browser or device geolocation coordinates during active sessions under the following conditions:
                    </p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-400 text-sm">
                        <li className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                            <CheckCircle size={18} className="text-primary-500 shrink-0 mt-0.5" />
                            <span><strong>Nearby Suggestions & Proximity Radius:</strong> Location data is used strictly to rank closest food spots first and filter menus within dynamic proximity bounds (e.g. 500m, 1km, 2km).</span>
                        </li>
                        <li className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                            <CheckCircle size={18} className="text-primary-500 shrink-0 mt-0.5" />
                            <span><strong>Session Proximity Calculations:</strong> Your current coordinates are processed on active pages to calculate estimated distances in real-time, and are never permanently stored on our databases.</span>
                        </li>
                        <li className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                            <CheckCircle size={18} className="text-primary-500 shrink-0 mt-0.5" />
                            <span><strong>Optional Usage Consent:</strong> Enabling device location is entirely voluntary. Customers may opt-out at any time and manually browse without real-time distance sorting features.</span>
                        </li>
                        <li className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                            <CheckCircle size={18} className="text-primary-500 shrink-0 mt-0.5" />
                            <span><strong>Store Owner Consent:</strong> Store owners who utilize the auto-locate feature consent to their store coordinates being calculated, shared, and displayed on maps for proximity sorting and navigation.</span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Back Button */}
            <div className="mt-12 text-center">
                <button
                    onClick={() => window.history.back()}
                    className="px-8 py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white font-bold rounded-2xl transition-all shadow-lg cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
                >
                    Return to Previous Page
                </button>
            </div>
        </div>
    );
}
