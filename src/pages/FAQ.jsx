import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, Mail, Phone, MessageSquare } from 'lucide-react';

export default function FAQ() {
    const [openFaq, setOpenFaq] = useState(null);

    const faqs = [
        { q: "How does table reservation work?", a: "Simply browse restaurants, select an available time, and your table is instantly secured. You can optionally pre-order your meals so they are prepared right as you arrive." },
        { q: "Can I order food without a reservation?", a: "Yes! You can order for Pickup or Delivery, or simply scan a table's QR code when you walk in to start a Dine-In session instantly." },
        { q: "How do loyalty points work?", a: "For every $1 you spend on the platform, you earn 1 loyalty point. These points are automatically tracked in your Customer Dashboard." },
        { q: "Is my payment information secure?", a: "Absolutely. We use enterprise-grade encryption and secure payment gateways. Our staff never sees your raw payment details." },
        { q: "I'm a restaurant owner. How do I join?", a: "Currently, our platform is invite-only for vendors to ensure quality. Contact our support team to request a vendor application." }
    ];

    return (
        <div className="w-full max-w-4xl mx-auto py-12 px-4 min-h-[70vh]">
            <div className="text-center mb-16">
                <div className="inline-flex items-center justify-center p-4 bg-primary-500/10 rounded-full mb-6 relative">
                    <div className="absolute inset-0 bg-primary-500/20 blur-xl rounded-full"></div>
                    <HelpCircle size={48} className="text-primary-400 relative z-10" />
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-white mb-4">Frequently Asked Questions</h1>
                <p className="text-lg text-slate-400 max-w-2xl mx-auto">Got questions? We've got answers. Everything you need to know about the Chapuu platform.</p>
            </div>

            <div className="space-y-4">
                {faqs.map((faq, idx) => (
                    <div key={idx} className="glass-dark border border-white/5 rounded-2xl overflow-hidden transition-all duration-300 hover:border-primary-500/30 shadow-lg">
                        <button
                            onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                            className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                        >
                            <span className="text-lg font-bold text-slate-200">{faq.q}</span>
                            <motion.div animate={{ rotate: openFaq === idx ? 180 : 0 }}>
                                <ChevronDown className="text-primary-500" />
                            </motion.div>
                        </button>

                        <AnimatePresence>
                            {openFaq === idx && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="px-6 pb-6 pt-0 text-slate-400 border-t border-white/5 mt-2 pt-4 leading-relaxed">
                                        {faq.a}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>

            <div className="mt-16 text-center glass-dark border border-primary-500/20 rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent"></div>
                <h3 className="text-2xl font-bold text-white mb-2 relative z-10">Report an Issue or Get Support</h3>
                <p className="text-slate-400 mb-8 max-w-lg mx-auto relative z-10">
                    If you face any delivery issues, reckless service, or policy violations, please report it immediately. Our support team is available 24/7.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                    <a 
                        href="tel:+255700000000" 
                        className="flex flex-col items-center justify-center p-6 bg-slate-900/60 border border-white/5 rounded-2xl hover:border-primary-500/40 hover:bg-slate-900/80 transition-all duration-300 group shadow-md"
                    >
                        <div className="w-12 h-12 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-400 group-hover:scale-110 transition-transform mb-4">
                            <Phone size={24} />
                        </div>
                        <span className="text-lg font-bold text-slate-200 mb-1">Call Us</span>
                        <span className="text-sm text-slate-400">+255 700 000 000</span>
                    </a>

                    <a 
                        href="mailto:support@chapuu.test?subject=Report%20an%20Issue" 
                        className="flex flex-col items-center justify-center p-6 bg-slate-900/60 border border-white/5 rounded-2xl hover:border-primary-500/40 hover:bg-slate-900/80 transition-all duration-300 group shadow-md"
                    >
                        <div className="w-12 h-12 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-400 group-hover:scale-110 transition-transform mb-4">
                            <Mail size={24} />
                        </div>
                        <span className="text-lg font-bold text-slate-200 mb-1">Email Support</span>
                        <span className="text-sm text-slate-400">support@chapuu.test</span>
                    </a>

                    <a 
                        href="sms:+255700000000?body=I%20want%20to%20report%20an%20issue%20with%20my%20order" 
                        className="flex flex-col items-center justify-center p-6 bg-slate-900/60 border border-white/5 rounded-2xl hover:border-primary-500/40 hover:bg-slate-900/80 transition-all duration-300 group shadow-md"
                    >
                        <div className="w-12 h-12 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-400 group-hover:scale-110 transition-transform mb-4">
                            <MessageSquare size={24} />
                        </div>
                        <span className="text-lg font-bold text-slate-200 mb-1">SMS Support</span>
                        <span className="text-sm text-slate-400">Send an SMS</span>
                    </a>
                </div>
            </div>
        </div>
    );
}
