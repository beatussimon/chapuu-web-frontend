import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { User, Mail, Phone, ArrowLeft, Save, Star, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';
import { parseLocalPhoneNumber } from '../utils/phone';

export default function CustomerProfile() {
    const navigate = useNavigate();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [localPhone, setLocalPhone] = useState('');
    const [username, setUsername] = useState('');
    const [loyaltyPoints, setLoyaltyPoints] = useState(0);
    const [userRole, setUserRole] = useState('');
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        apiClient.get('/auth/users/me/')
            .then(res => {
                const data = res.data;
                setUsername(data.username || '');
                setFirstName(data.first_name || '');
                setLastName(data.last_name || '');
                setEmail(data.email || '');
                setLoyaltyPoints(data.loyalty_points || 0);
                setUserRole(data.role || 'CUSTOMER');
                
                const parsedLocal = parseLocalPhoneNumber(data.phone_number);
                setLocalPhone(parsedLocal);
                
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch profile info:", err);
                toast.error("Could not load profile info.");
                setLoading(false);
            });
    }, []);

    const handlePhoneChange = (e) => {
        const val = e.target.value.replace(/\D/g, ''); // Digits only
        if (val.length <= 9) {
            setLocalPhone(val);
        }
    };

    const handleSave = (e) => {
        e.preventDefault();
        
        if (!firstName.trim() || !lastName.trim()) {
            toast.error("First name and Last name are required.");
            return;
        }

        if (!email.trim() || !email.includes('@')) {
            toast.error("Please enter a valid email address.");
            return;
        }

        if (localPhone.length !== 9) {
            toast.error("Phone number must be exactly 9 digits.");
            return;
        }

        setSaving(true);
        const toastId = toast.loading("Saving changes...");
        const fullPhone = `+255${localPhone}`;

        const payload = {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: email.trim(),
            phone_number: fullPhone
        };

        apiClient.patch('/auth/users/me/', payload)
            .then(res => {
                toast.success("Profile updated successfully!", { id: toastId });
                triggerHaptic(hapticPatterns.success);
                setSaving(false);
            })
            .catch(err => {
                console.error("Profile update failed:", err);
                const msg = err.response?.data?.detail || "Failed to save profile changes.";
                toast.error(msg, { id: toastId });
                setSaving(false);
            });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-white">
                <div className="w-10 h-10 border-3 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                <p className="text-sm text-slate-400 animate-pulse font-bold">Loading your profile details...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto py-8 text-white">
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-3xl font-bold">Account Profile</h1>
                    <p className="text-slate-400 text-sm mt-1">Manage your account information and preferences</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* User Stats Card */}
                <div className="md:col-span-1 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-dark border border-white/10 rounded-3xl p-6 text-center shadow-xl"
                    >
                        <div className="w-24 h-24 bg-primary-500/10 border border-primary-500/20 rounded-full flex items-center justify-center text-primary-400 text-3xl font-black mx-auto mb-4 uppercase">
                            {firstName ? firstName[0] : username ? username[0] : 'U'}
                        </div>
                        
                        <h2 className="text-xl font-bold text-white mb-1 truncate">{firstName && lastName ? `${firstName} ${lastName}` : username}</h2>
                        <p className="text-xs text-slate-400 font-mono mb-4">@{username}</p>

                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-wider text-slate-300">
                            <ShieldCheck size={12} className="text-primary-500" />
                            {userRole}
                        </div>

                        <div className="mt-6 pt-6 border-t border-white/5">
                            <div className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl">
                                <span className="text-[10px] font-mono font-black uppercase text-amber-400 tracking-widest block mb-1">Loyalty Rewards</span>
                                <div className="flex items-center justify-center gap-2">
                                    <Star size={18} className="text-amber-400 fill-amber-400" />
                                    <span className="text-2xl font-black text-white">{loyaltyPoints}</span>
                                    <span className="text-xs text-slate-400 font-bold">pts</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Edit Form */}
                <div className="md:col-span-2">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="glass-dark border border-white/10 rounded-3xl p-6 md:p-8 shadow-xl"
                    >
                        <h3 className="text-lg font-bold text-white mb-6 border-b border-white/5 pb-4 uppercase tracking-wider">Edit Profile Details</h3>
                        
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-2">First Name</label>
                                    <div className="relative">
                                        <User size={16} className="absolute left-4 top-3.5 text-slate-500" />
                                        <input
                                            type="text"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            required
                                            placeholder="Enter first name"
                                            className="w-full bg-dark-950 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-primary-500 transition-all font-semibold"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-2">Last Name</label>
                                    <div className="relative">
                                        <User size={16} className="absolute left-4 top-3.5 text-slate-500" />
                                        <input
                                            type="text"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            required
                                            placeholder="Enter last name"
                                            className="w-full bg-dark-950 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-primary-500 transition-all font-semibold"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-2">Email Address</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-4 top-3.5 text-slate-500" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        placeholder="Enter email address"
                                        className="w-full bg-dark-950 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-primary-500 transition-all font-semibold"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-2">Phone Number</label>
                                <div className="flex gap-2">
                                    <div className="flex items-center gap-1.5 px-4 bg-dark-950 border border-white/10 rounded-xl text-sm font-bold text-slate-300">
                                        <Phone size={14} className="text-slate-500" />
                                        <span>+255</span>
                                    </div>
                                    <input
                                        type="tel"
                                        value={localPhone}
                                        onChange={handlePhoneChange}
                                        required
                                        placeholder="e.g. 712345678"
                                        className="flex-1 bg-dark-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-primary-500 transition-all font-semibold tracking-wider font-mono"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2 font-medium">
                                    Enter your 9-digit local phone number. It will be saved in international format (+255).
                                </p>
                            </div>

                            <div className="pt-4 border-t border-white/5 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-primary-500 hover:bg-primary-400 disabled:opacity-50 text-dark-950 font-bold px-6 py-3 rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer text-sm"
                                >
                                    <Save size={18} />
                                    {saving ? "Saving..." : "Save Profile"}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
