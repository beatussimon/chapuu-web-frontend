import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useStore';
import { Lock, User, Loader2, Utensils, Phone, Mail, Scale, ShieldAlert, FileText, CheckCircle, X, ChevronRight, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../api/client';

export default function Signup() {
    // Multi-step state (1: Profile, 2: Account/Credentials, 3: Agreement)
    const [step, setStep] = useState(1);

    // Form inputs state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    
    // Policy acceptance states
    const [acceptedPolicy, setAcceptedPolicy] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [scrolledToBottom, setScrolledToBottom] = useState(false);
    const [loading, setLoading] = useState(false);

    const scrollContainerRef = useRef(null);
    const login = useAppStore(state => state.login);
    const token = useAppStore(state => state.token);
    const userRole = useAppStore(state => state.userRole);
    const navigate = useNavigate();
    const location = useLocation();

    // Redirect if already logged in
    useEffect(() => {
        if (token) {
            if (userRole === 'CUSTOMER') {
                const destination = location.state?.from || '/menu';
                navigate(destination, { replace: true });
            } else {
                navigate('/seller', { replace: true });
            }
        }
    }, [token, userRole, navigate, location]);

    // Scroll tracker inside the T&C modal
    const handleTermsScroll = (e) => {
        const target = e.currentTarget;
        if (target.scrollHeight - target.scrollTop <= target.clientHeight + 30) {
            setScrolledToBottom(true);
        }
    };

    // Auto-scroll logic checks if content fits without scrolling
    useEffect(() => {
        if (showTermsModal && scrollContainerRef.current) {
            const el = scrollContainerRef.current;
            if (el.scrollHeight <= el.clientHeight) {
                setScrolledToBottom(true);
            }
        }
    }, [showTermsModal]);

    const handleAcceptTerms = () => {
        if (scrolledToBottom) {
            setAcceptedPolicy(true);
            setShowTermsModal(false);
            toast.success("Thank you for reading the liability policy!");
        }
    };

    // Form validations per step
    const validateStep1 = () => {
        if (!firstName.trim()) {
            toast.error("First Name is required.");
            return false;
        }
        if (!lastName.trim()) {
            toast.error("Last Name is required.");
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim() || !emailRegex.test(email)) {
            toast.error("A valid Email Address is required.");
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        if (!phone.trim()) {
            toast.error("Phone Number is required.");
            return false;
        }
        if (!username.trim()) {
            toast.error("Username is required.");
            return false;
        }
        if (password.length < 4) {
            toast.error("Password must be at least 4 characters long.");
            return false;
        }
        return true;
    };

    const handleNext = () => {
        if (step === 1) {
            if (validateStep1()) setStep(2);
        } else if (step === 2) {
            if (validateStep2()) setStep(3);
        }
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!acceptedPolicy) {
            toast.error('You must accept the Terms & Conditions and Liability Policy to register.');
            return;
        }

        setLoading(true);
        const toastId = toast.loading('Creating your account...');

        try {
            await apiClient.post('/register/', {
                username: username,
                first_name: firstName,
                last_name: lastName,
                email: email,
                phone_number: phone,
                password: password,
                accepted_liability_policy: true
            });

            toast.success('Account created! Logging you in...', { id: toastId });

            await login(username, password);
            const destination = location.state?.from || '/menu';
            navigate(destination);

        } catch (error) {
            const data = error.response?.data;
            if (data && typeof data === 'object') {
                const firstErrorField = Object.keys(data)[0];
                const firstErrorVal = data[firstErrorField];
                const firstErrorMessage = Array.isArray(firstErrorVal) ? firstErrorVal[0] : firstErrorVal;
                
                toast.error(`${firstErrorField.replace('_', ' ').toUpperCase()}: ${firstErrorMessage}`, { id: toastId });
            } else {
                toast.error('Registration failed. Please verify your details.', { id: toastId });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[75vh] md:min-h-[80vh] w-full flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none"></div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-xl glass-dark rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl relative z-10 my-4"
            >
                <div className="flex flex-col items-center mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white/90 mb-1 text-center">Join Chapuu</h2>
                    <p className="text-slate-400 text-center text-xs">
                        Complete these 3 simple steps to create your account.
                    </p>
                </div>

                {/* Animated Stepper Indicator */}
                <div className="flex items-center justify-between px-4 mb-8 relative">
                    {/* Stepper Progress Bar Background */}
                    <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white/5 -translate-y-1/2 z-0"></div>
                    {/* Active Progress Bar */}
                    <motion.div 
                        className="absolute top-1/2 left-0 h-[2px] bg-primary-500 -translate-y-1/2 z-0 origin-left"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: (step - 1) / 2 }}
                        transition={{ duration: 0.3 }}
                        style={{ width: '100%' }}
                    ></motion.div>

                    {/* Step 1 Node */}
                    <div className="flex flex-col items-center z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                            step >= 1 ? 'bg-primary-500 text-dark-950 border-primary-500 shadow-md shadow-primary-500/25' : 'bg-slate-900 text-slate-500 border-white/10'
                        }`}>
                            {step > 1 ? <CheckCircle size={16} className="text-dark-950 fill-dark-950" /> : "1"}
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 mt-1">Profile</span>
                    </div>

                    {/* Step 2 Node */}
                    <div className="flex flex-col items-center z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                            step >= 2 ? 'bg-primary-500 text-dark-950 border-primary-500 shadow-md shadow-primary-500/25' : 'bg-slate-900 text-slate-500 border-white/10'
                        }`}>
                            {step > 2 ? <CheckCircle size={16} className="text-dark-950 fill-dark-950" /> : "2"}
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 mt-1">Account</span>
                    </div>

                    {/* Step 3 Node */}
                    <div className="flex flex-col items-center z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                            step === 3 ? 'bg-primary-500 text-dark-950 border-primary-500 shadow-md shadow-primary-500/25' : 'bg-slate-900 text-slate-500 border-white/10'
                        }`}>
                            3
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 mt-1">Agreement</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="overflow-hidden">
                    <AnimatePresence mode="wait">
                        
                        {/* STEP 1: PERSONAL PROFILE */}
                        {step === 1 && (
                            <motion.div
                                key="step-1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-300 ml-1">First Name <span className="text-red-400">*</span></label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <User size={16} className="text-slate-500" />
                                            </div>
                                            <input
                                                type="text"
                                                required
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                className="w-full bg-dark-900 border border-white/10 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 transition-all outline-none"
                                                placeholder="First name"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-300 ml-1">Last Name <span className="text-red-400">*</span></label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <User size={16} className="text-slate-500" />
                                            </div>
                                            <input
                                                type="text"
                                                required
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                className="w-full bg-dark-900 border border-white/10 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 transition-all outline-none"
                                                placeholder="Last name"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-300 ml-1">Email Address <span className="text-red-400">*</span></label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Mail size={16} className="text-slate-500" />
                                        </div>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-dark-900 border border-white/10 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 transition-all outline-none"
                                            placeholder="Email address"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button
                                        type="button"
                                        onClick={handleNext}
                                        className="w-full sm:w-auto px-6 py-3 bg-primary-500 hover:bg-primary-400 text-dark-950 font-bold rounded-xl transition-all shadow-md shadow-primary-500/10 flex items-center justify-center gap-2 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 text-sm"
                                    >
                                        Next Step <ChevronRight size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 2: CREDENTIALS & SECURITY */}
                        {step === 2 && (
                            <motion.div
                                key="step-2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                            >
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-300 ml-1">Phone Number <span className="text-red-400">*</span></label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Phone size={16} className="text-slate-500" />
                                        </div>
                                        <input
                                            type="tel"
                                            required
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="w-full bg-dark-900 border border-white/10 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 transition-all outline-none"
                                            placeholder="Phone number"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-300 ml-1">Username <span className="text-red-400">*</span></label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <User size={16} className="text-slate-500" />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="w-full bg-dark-900 border border-white/10 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 transition-all outline-none"
                                            placeholder="Username"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-300 ml-1">Password <span className="text-red-400">*</span></label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock size={16} className="text-slate-500" />
                                        </div>
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            minLength={4}
                                            className="w-full bg-dark-900 border border-white/10 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 transition-all outline-none"
                                            placeholder="Password"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 gap-4">
                                    <button
                                        type="button"
                                        onClick={handleBack}
                                        className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 text-sm"
                                    >
                                        <ChevronLeft size={16} /> Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleNext}
                                        className="px-6 py-3 bg-primary-500 hover:bg-primary-400 text-dark-950 font-bold rounded-xl transition-all shadow-md shadow-primary-500/10 flex items-center justify-center gap-2 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 text-sm"
                                    >
                                        Next Step <ChevronRight size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 3: LIABILITY POLICY AGREEMENT */}
                        {step === 3 && (
                            <motion.div
                                key="step-3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                            >
                                <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary-500/10 border border-primary-500/20 text-primary-400 rounded-lg flex items-center justify-center">
                                            <Scale size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm">Mutual Liability Agreement</h4>
                                            <span className="text-[10px] text-slate-500">Ensuring a fair ecosystem</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Both customers and shops are legally bound to hold full liability for their transactional decisions. Stores are liable for food safety, pricing accuracy, and receipt validation. Customers are liable for reservations, table scanning check-ins, and accurate payments.
                                    </p>
                                </div>

                                <div className="flex items-start gap-3 bg-white/5 border border-white/5 rounded-2xl p-4">
                                    <div className="flex items-center h-5">
                                        <input
                                            id="policy-checkbox"
                                            type="checkbox"
                                            required
                                            checked={acceptedPolicy}
                                            onChange={(e) => setAcceptedPolicy(e.target.checked)}
                                            className="w-4 h-4 rounded text-primary-500 bg-dark-900 border-white/10 focus:ring-primary-500 focus:ring-offset-dark-950 accent-primary-500 cursor-pointer"
                                        />
                                    </div>
                                    <div className="text-xs leading-relaxed text-slate-400">
                                        <label htmlFor="policy-checkbox" className="cursor-pointer">
                                            I declare that I accept the{' '}
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setScrolledToBottom(false);
                                                setShowTermsModal(true);
                                            }}
                                            className="text-primary-400 hover:text-primary-300 font-bold transition-all underline outline-none"
                                        >
                                            Terms & Mutual Liability Policy
                                        </button>
                                        <span className="text-red-400 ml-1">*</span>
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            Click the policy link above to launch the mandatory reading review.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 gap-4">
                                    <button
                                        type="button"
                                        disabled={loading}
                                        onClick={handleBack}
                                        className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 text-sm disabled:opacity-40"
                                    >
                                        <ChevronLeft size={16} /> Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading || !acceptedPolicy}
                                        className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-dark-950 font-bold rounded-xl transition-all shadow-lg shadow-primary-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex-1 flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer text-sm"
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={18} /> : "Create Account"}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                        
                    </AnimatePresence>
                </form>

                <div className="mt-6 pt-5 border-t border-white/10 text-center">
                    <p className="text-slate-400 text-xs">
                        Already have an account?{' '}
                        <Link to="/login" className="text-primary-400 hover:text-primary-300 font-semibold transition-colors">
                            Sign In
                        </Link>
                    </p>
                </div>
            </motion.div>

            {/* INTERACTIVE POPUP MODAL (Framer Motion) */}
            <AnimatePresence>
                {showTermsModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        {/* Overlay backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowTermsModal(false)}
                            className="fixed inset-0 bg-dark-950/80 backdrop-blur-md"
                        ></motion.div>

                        {/* Modal Box */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="w-full max-w-2xl bg-dark-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[85vh]"
                        >
                            {/* Modal Header */}
                            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-dark-950">
                                <div className="flex items-center gap-3">
                                    <Scale className="text-primary-500" size={24} />
                                    <div>
                                        <h3 className="text-lg font-bold text-white leading-none">Terms & Mutual Liability Policy</h3>
                                        <span className="text-[10px] text-slate-500">Chapuu Multi-Vendor Agreement</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowTermsModal(false)}
                                    className="p-1.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Modal Scroll Content */}
                            <div
                                ref={scrollContainerRef}
                                onScroll={handleTermsScroll}
                                className="p-6 overflow-y-auto space-y-6 text-slate-300 text-sm leading-relaxed max-h-[50vh] scrollbar-thin scrollbar-thumb-white/10"
                            >
                                <div className="bg-primary-500/5 border border-primary-500/10 rounded-2xl p-4 flex gap-3 items-start">
                                    <ShieldAlert size={24} className="text-primary-400 shrink-0 mt-0.5" />
                                    <p className="text-xs text-slate-400">
                                        <strong>Instruction:</strong> Please scroll to the bottom of the terms to activate the acceptance button. This ensures that you have reviewed the mutual liability parameters.
                                    </p>
                                </div>

                                <section className="space-y-2">
                                    <h4 className="font-bold text-white flex items-center gap-2">
                                        <FileText size={16} className="text-primary-400" />
                                        1. Scope & Technology Nature
                                    </h4>
                                    <p>
                                        Chapuu is a multi-vendor digital booking and ordering platform that connects Customers with independent retail stores, food vendors, and restaurant venues.
                                        You understand and agree that Chapuu is a software facilitator and is not a merchant of record, food preparer, or table vendor.
                                    </p>
                                </section>

                                <section className="space-y-2">
                                    <h4 className="font-bold text-white flex items-center gap-2">
                                        <User size={16} className="text-blue-400" />
                                        2. Customer & User Liability
                                    </h4>
                                    <p>
                                        By registering, customers assume exclusive liability for all transaction decisions, including:
                                    </p>
                                    <ul className="list-disc list-inside pl-2 space-y-1 text-slate-400 text-xs">
                                        <li>Ensuring order quantities, ingredient preferences, and selected stores are correct.</li>
                                        <li>Attending dine-in sessions or reservations. Unexcused No-Shows are logged and penalised.</li>
                                        <li>Proposing authentic payments and providing genuine transactional receipts.</li>
                                    </ul>
                                </section>

                                <section className="space-y-2">
                                    <h4 className="font-bold text-white flex items-center gap-2">
                                        <Utensils size={16} className="text-amber-400" />
                                        3. Merchant & Store Liability
                                    </h4>
                                    <p>
                                        Merchants hold exclusive, direct legal and product liability for:
                                    </p>
                                    <ul className="list-disc list-inside pl-2 space-y-1 text-slate-400 text-xs">
                                        <li>Providing and preparing fresh, sanitary, and accurately priced items.</li>
                                        <li>Listing allergen warnings and matching stock levels to inventory values.</li>
                                        <li>Validating customer payment proofs before processing orders.</li>
                                    </ul>
                                </section>

                                <section className="space-y-2">
                                    <h4 className="font-bold text-white flex items-center gap-2">
                                        <Scale size={16} className="text-red-400" />
                                        4. Limitation of Liability
                                    </h4>
                                    <p>
                                        Chapuu disclaims all liability for food safety, vendor operations, direct cash exchanges, or driver performance. In case of dispute, you agree to release Chapuu from any and all damages, claims, and demands.
                                    </p>
                                </section>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t border-white/5 bg-dark-950 flex flex-col sm:flex-row gap-3 items-center justify-between">
                                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                                    {scrolledToBottom ? (
                                        <span className="text-green-500 flex items-center gap-1">
                                            <CheckCircle size={14} /> Ready to accept
                                        </span>
                                    ) : (
                                        <span>Scroll down to read the agreement</span>
                                    )}
                                </div>

                                <div className="flex gap-2 w-full sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={() => setShowTermsModal(false)}
                                        className="flex-1 sm:flex-none px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold rounded-xl text-xs transition-all cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!scrolledToBottom}
                                        onClick={handleAcceptTerms}
                                        className="flex-1 sm:flex-none px-5 py-2.5 bg-primary-500 hover:bg-primary-400 text-dark-950 font-bold rounded-xl text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        Read & Accept
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
