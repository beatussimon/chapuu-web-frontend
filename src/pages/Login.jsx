import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useStore';
import { Lock, User, Loader2, Utensils } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const login = useAppStore(state => state.login);
    const token = useAppStore(state => state.token);
    const userRole = useAppStore(state => state.userRole);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (token) {
            if (userRole === 'CUSTOMER') {
                const destination = location.state?.from || '/';
                navigate(destination, { replace: true });
            } else {
                navigate('/seller', { replace: true });
            }
        }
    }, [token, userRole, navigate, location]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const toastId = toast.loading('Authenticating...');

        try {
            const role = await login(username, password);
            toast.success(`Welcome back, ${username}!`, { id: toastId });

            if (role === 'CUSTOMER') {
                const destination = location.state?.from || '/';
                navigate(destination);
            } else {
                navigate('/seller');
            }
        } catch (error) {
            toast.error(error.message || 'Login failed', { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[75vh] md:min-h-[80vh] w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden relative">

            {/* Background decorative elements */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-primary-500/20 rounded-full blur-[60px] sm:blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-red-500/10 rounded-full blur-[60px] sm:blur-[100px] pointer-events-none"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md glass-dark rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl relative z-10"
            >
                <div className="flex flex-col items-center mb-6 sm:mb-8">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white/90 mb-2 text-center">Welcome Back</h2>
                    <p className="text-xs sm:text-sm text-slate-400 text-center">Sign in to multi-vendor Chapuu Operations.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 ml-1">Username</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <User size={18} className="text-slate-500" />
                            </div>
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-dark-900/50 border border-white/10 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl py-3 pl-11 pr-4 text-slate-100 placeholder-slate-600 transition-all outline-none text-base"
                                placeholder="Username"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock size={18} className="text-slate-500" />
                            </div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-dark-900/50 border border-white/10 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl py-3 pl-11 pr-4 text-slate-100 placeholder-slate-600 transition-all outline-none text-base"
                                placeholder="Password"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-4 sm:mt-6 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-dark-950 font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0 text-base"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : "Sign In securely"}
                    </button>
                </form>

                <div className="mt-6 sm:mt-8 text-center">
                    <p className="text-slate-400 text-sm sm:text-base">
                        New to Chapuu?{' '}
                        <Link to="/register" state={{ from: location.state?.from }} className="text-primary-400 hover:text-primary-300 font-semibold transition-colors">
                            Create an account
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
