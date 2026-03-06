import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store/useStore';
import { Lock, User, Loader2, Utensils, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import apiClient from '../api/client';

export default function Signup() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    const login = useAppStore(state => state.login);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const toastId = toast.loading('Creating your account...');

        try {
            // 1. Register the new customer account publicly
            await apiClient.post('/register/', {
                username: username,
                password: password,
                phone_number: phone
            });

            toast.success('Account created! Logging you in...', { id: toastId });

            // 2. Automatically log them in immediately afterwards
            await login(username, password);
            navigate('/menu');

        } catch (error) {
            toast.error(error.response?.data?.username?.[0] || 'Registration failed. Try a different username.', { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            {/* Background decorative elements */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-[100px] pointer-events-none"></div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md glass-dark rounded-3xl p-8 border border-white/10 shadow-2xl relative z-10"
            >
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-primary-500/10 p-4 rounded-2xl mb-4 border border-primary-500/20">
                        <Utensils size={40} className="text-primary-500" />
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Join Chapuu</h2>
                    <p className="text-slate-400 text-center">Create a new customer account to order food instantly.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 ml-1">Username <span className="text-red-400">*</span></label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <User size={18} className="text-slate-500" />
                            </div>
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-dark-900 border border-white/10 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl py-3 pl-11 pr-4 text-slate-100 placeholder-slate-600 transition-all outline-none"
                                placeholder="Choose a username..."
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 ml-1">Phone Number</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Phone size={18} className="text-slate-500" />
                            </div>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full bg-dark-900 border border-white/10 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl py-3 pl-11 pr-4 text-slate-100 placeholder-slate-600 transition-all outline-none"
                                placeholder="(Optional)"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 ml-1">Password <span className="text-red-400">*</span></label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock size={18} className="text-slate-500" />
                            </div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                minLength={4}
                                className="w-full bg-dark-900 border border-white/10 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl py-3 pl-11 pr-4 text-slate-100 placeholder-slate-600 transition-all outline-none"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-8 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-dark-950 font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : "Create Account"}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-white/10 text-center">
                    <p className="text-slate-400">
                        Already have an account?{' '}
                        <Link to="/login" className="text-primary-400 hover:text-primary-300 font-semibold transition-colors">
                            Sign In
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
