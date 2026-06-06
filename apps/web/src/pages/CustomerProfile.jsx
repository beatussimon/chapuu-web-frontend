import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { User, Mail, Phone, ArrowLeft, Save, Star, ShieldCheck, Camera, PenTool, X, CheckCircle, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';
import { parseLocalPhoneNumber } from '../utils/phone';
import { resolveMediaUrl } from '../utils/imageUtils';
import OptimizedImage from '../components/OptimizedImage';

export default function CustomerProfile() {
    const navigate = useNavigate();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [localPhone, setLocalPhone] = useState('');
    const [username, setUsername] = useState('');
    const [loyaltyPoints, setLoyaltyPoints] = useState(0);
    const [userRole, setUserRole] = useState('');
    const [profilePicture, setProfilePicture] = useState('');
    const [profilePictureFile, setProfilePictureFile] = useState(null);
    const [profilePicturePreview, setProfilePicturePreview] = useState('');
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [cacheBuster, setCacheBuster] = useState(Date.now());

    // Application state
    const [myApplications, setMyApplications] = useState([]);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [activeApp, setActiveApp] = useState(null);
    const [isSigning, setIsSigning] = useState(false);
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    // Signature Canvas Handlers
    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const context = canvas.getContext('2d');
        context.beginPath();
        context.moveTo(clientX - rect.left, clientY - rect.top);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault(); // Prevent scrolling
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const context = canvas.getContext('2d');
        context.lineTo(clientX - rect.left, clientY - rect.top);
        context.stroke();
    };

    const stopDrawing = () => {
        if (isDrawing) {
            setIsDrawing(false);
            const context = canvasRef.current.getContext('2d');
            context.closePath();
        }
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
    };

    const submitSignature = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Check if canvas is actually drawn on by checking pixel data
        const context = canvas.getContext('2d');
        const pixelData = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const isBlank = !pixelData.some(channel => channel !== 0);
        
        if (isBlank) {
            toast.error("Please provide a signature before submitting.");
            return;
        }

        const dataUrl = canvas.toDataURL('image/png');
        setIsSigning(true);
        try {
            await apiClient.post(`/seller-applications/${activeApp.id}/sign/`, {
                digital_signature: dataUrl
            });
            toast.success("Contract signed successfully!");
            setShowSignatureModal(false);
            fetchApplications(); // Refresh list
        } catch (err) {
            toast.error("Failed to submit signature.");
        } finally {
            setIsSigning(false);
        }
    };

    const fetchApplications = async () => {
        try {
            const res = await apiClient.get('/seller-applications/');
            const appsData = res.data?.results || res.data;
            setMyApplications(Array.isArray(appsData) ? appsData : []);
        } catch (err) {
            console.error("Failed to load applications", err);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error("Please select a valid image file.");
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error("Image file size must be less than 5MB.");
                return;
            }
            setProfilePictureFile(file);
            setProfilePicturePreview(URL.createObjectURL(file));
            triggerHaptic(hapticPatterns.light);
        }
    };

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
                setProfilePicture(data.profile_picture || '');
                
                const parsedLocal = parseLocalPhoneNumber(data.phone_number);
                setLocalPhone(parsedLocal);
                
                fetchApplications();
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

        const formData = new FormData();
        formData.append('first_name', firstName.trim());
        formData.append('last_name', lastName.trim());
        formData.append('email', email.trim());
        formData.append('phone_number', fullPhone);
        if (profilePictureFile) {
            formData.append('profile_picture', profilePictureFile);
        }

        apiClient.patch('/auth/users/me/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        })
            .then(res => {
                const data = res.data;
                toast.success("Profile updated successfully!", { id: toastId });
                triggerHaptic(hapticPatterns.success);
                setProfilePicture(data.profile_picture || '');
                setProfilePictureFile(null);
                setProfilePicturePreview('');
                setCacheBuster(Date.now());
                setSaving(false);
            })
            .catch(err => {
                console.error("Profile update failed:", err);
                const msg = err.response?.data?.detail || err.response?.data?.profile_picture?.[0] || "Failed to save profile changes.";
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

    const activeApplication = Array.isArray(myApplications) ? myApplications.find(app => ['AWAITING_SIGNATURE', 'PENDING_REVIEW', 'UNDER_REVIEW'].includes(app.status)) : null;
    const isAwaitingSignature = activeApplication?.status === 'AWAITING_SIGNATURE';

    return (
        <div className="w-full max-w-4xl mx-auto py-8 text-white pb-32">
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

            {/* Application Banner */}
            {activeApplication && (
                <div className={`mb-8 p-6 rounded-3xl border shadow-xl relative overflow-hidden ${
                    isAwaitingSignature 
                        ? 'bg-primary-500/10 border-primary-500/30' 
                        : 'bg-blue-500/10 border-blue-500/30'
                }`}>
                    {/* Background decoration */}
                    <div className={`absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 rounded-full blur-3xl opacity-20 ${
                        isAwaitingSignature ? 'bg-primary-500' : 'bg-blue-500'
                    }`}></div>

                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                        <div className={`p-4 rounded-2xl flex-shrink-0 ${
                            isAwaitingSignature ? 'bg-primary-500/20 text-primary-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                            {isAwaitingSignature ? <PenTool size={32} /> : <FileText size={32} />}
                        </div>
                        
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-xl font-bold mb-1">
                                {isAwaitingSignature ? 'Action Required: Sign Your Contract' : 'Application Under Review'}
                            </h3>
                            <p className="text-sm text-slate-300">
                                {isAwaitingSignature 
                                    ? `Your application for ${activeApplication.store_name} is ready. Please review and sign the seller agreement to proceed.` 
                                    : `Your application for ${activeApplication.store_name} is currently being reviewed by our team.`
                                }
                            </p>
                        </div>

                        {isAwaitingSignature && (
                            <button
                                onClick={() => {
                                    setActiveApp(activeApplication);
                                    setShowSignatureModal(true);
                                }}
                                className="w-full md:w-auto px-6 py-3 bg-primary-500 text-dark-950 font-bold rounded-xl hover:bg-primary-400 transition-colors shadow-lg whitespace-nowrap"
                            >
                                Review & Sign
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* User Stats Card */}
                <div className="md:col-span-1 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-dark border border-white/10 rounded-3xl p-6 text-center shadow-xl"
                    >
                        <div className="relative w-24 h-24 mx-auto mb-4 group">
                            {profilePicturePreview || profilePicture ? (
                                <OptimizedImage 
                                    src={profilePicturePreview || profilePicture} 
                                    version={cacheBuster}
                                    alt="Profile" 
                                    className="w-full h-full rounded-full object-cover border-2 border-primary-500/30 group-hover:border-primary-500 transition-colors shadow-lg"
                                    wrapperClassName="w-full h-full rounded-full"
                                    placeholderType="avatar"
                                    eager
                                />
                            ) : (
                                <div className="w-full h-full bg-primary-500/10 border border-primary-500/20 rounded-full flex items-center justify-center text-primary-400 text-3xl font-black uppercase">
                                    {firstName ? firstName[0] : username ? username[0] : 'U'}
                                </div>
                            )}
                            
                            <label className="absolute bottom-0 right-0 p-2 bg-primary-500 hover:bg-primary-400 text-dark-950 rounded-full cursor-pointer shadow-lg hover:scale-105 transition-all flex items-center justify-center border border-dark-950">
                                <Camera size={14} />
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleImageChange} 
                                    className="hidden" 
                                />
                            </label>
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

            {/* Signature Modal */}
            {showSignatureModal && activeApp && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark-950/90 backdrop-blur-sm">
                    <div className="bg-dark-900 border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-dark-950/50">
                            <h2 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-2">
                                <FileText className="text-primary-500" /> Digital Seller Agreement
                            </h2>
                            <button onClick={() => setShowSignatureModal(false)} className="text-slate-400 hover:text-white p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scrollable Body */}
                        <div className="overflow-y-auto custom-scrollbar flex-1 bg-dark-900/50">
                            
                            {/* Contract Content */}
                            <div className="p-6 md:p-8 text-sm text-slate-200 space-y-6">
                            
                            <div className="bg-primary-500/10 border border-primary-500/20 p-5 rounded-2xl">
                                <p className="text-white leading-relaxed">
                                    This agreement ("Agreement") is entered into between <strong className="text-primary-400">Chapuu</strong> ("Platform") and <strong className="text-white">{activeApp.applicant_name}</strong> ("Seller"), trading as <strong className="text-white">{activeApp.store_name}</strong>.
                                </p>
                            </div>
                            
                            <div className="space-y-6">
                                <div className="border-l-2 border-slate-700 pl-4">
                                    <h4 className="font-bold text-white mb-2 uppercase tracking-wide text-xs">Liability and Compliance</h4>
                                    <p className="leading-relaxed">The Seller acknowledges and agrees that all liability for the quality, safety, and legality of the products sold through the Platform rests entirely with the Seller. The Platform acts solely as an intermediary matching service and assumes no liability for food poisoning, injury, or damages arising from the Seller's products.</p>
                                </div>
                                
                                {activeApp.trial_period_days > 0 && (
                                    <div className="border-l-2 border-primary-500 pl-4 bg-primary-500/5 py-2 pr-2 rounded-r-xl">
                                        <h4 className="font-bold text-primary-400 mb-2 uppercase tracking-wide text-xs flex items-center gap-2">
                                            <Star size={14} /> Free Trial Period
                                        </h4>
                                        <p className="leading-relaxed">The Seller is granted a {activeApp.trial_period_days}-day free trial period starting from the date of account activation. During this period, the Platform will charge <strong className="text-white">0% commission</strong> on orders. Upon expiration of the trial, standard commission rates ({activeApp.store_type === 'SHOP' ? '2%' : '7%'}) will automatically apply.</p>
                                    </div>
                                )}
                                
                                <div className="border-l-2 border-slate-700 pl-4">
                                    <h4 className="font-bold text-white mb-2 uppercase tracking-wide text-xs">Customer Service Standards</h4>
                                    <p className="leading-relaxed">The Seller commits to upholding the highest standards of customer service, ensuring timely preparation, accurate fulfillment, and professional handling of customer inquiries and complaints.</p>
                                </div>
                                
                                <div className="border-l-2 border-red-500/50 pl-4 bg-red-500/5 py-2 pr-2 rounded-r-xl">
                                    <h4 className="font-bold text-red-400 mb-2 uppercase tracking-wide text-xs flex items-center gap-2">
                                        Payment and Penalties
                                    </h4>
                                    <p className="leading-relaxed">The Seller agrees to pay all applicable platform fees and standard commissions ({activeApp.store_type === 'SHOP' ? '2%' : '7%'}) on time. Late payments may result in account suspension and a <strong className="text-white">penalty fee of up to 15%</strong> on the outstanding balance as per Tanzanian regulatory guidelines.</p>
                                </div>
                                
                                <div className="border-l-2 border-slate-700 pl-4">
                                    <h4 className="font-bold text-white mb-2 uppercase tracking-wide text-xs">Legally Binding Signature</h4>
                                    <p className="leading-relaxed">By signing below, you acknowledge that you have read, understood, and agree to be bound by the terms of this Agreement. This digital signature is legally binding under the Electronic Transactions Act of Tanzania.</p>
                                </div>
                                </div>
                            </div>

                            {/* Signature Area */}
                            <div className="p-6 md:px-8 pb-8 border-t border-white/10 bg-dark-950/80">
                                <div className="flex justify-between items-end mb-2">
                                    <label className="text-sm font-bold text-white uppercase tracking-wider">Please Sign Below:</label>
                                    <button onClick={clearSignature} className="text-xs text-slate-400 hover:text-white underline font-medium">Clear Signature</button>
                                </div>
                                <div className="bg-white rounded-xl overflow-hidden border-2 border-white/10 shadow-inner">
                                    <canvas
                                        ref={canvasRef}
                                        width={600}
                                        height={200}
                                        className="w-full touch-none cursor-crosshair"
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                        onTouchStart={startDrawing}
                                        onTouchMove={draw}
                                        onTouchEnd={stopDrawing}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Actions (Sticky Bottom) */}
                        <div className="p-6 border-t border-white/10 bg-dark-950/50 flex justify-end gap-4 shrink-0">
                            <button 
                                onClick={() => setShowSignatureModal(false)}
                                className="px-6 py-3 font-bold text-slate-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={submitSignature}
                                disabled={isSigning}
                                className="px-8 py-3 bg-primary-500 text-dark-950 font-bold rounded-xl hover:bg-primary-400 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-lg"
                            >
                                {isSigning ? "Submitting..." : "Sign & Agree"}
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}
