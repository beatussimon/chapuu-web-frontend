import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Shield, Store, Users, UserPlus, Home, Save, BarChart3, TrendingUp, 
    DollarSign, Bell, Plus, Edit2, Trash2, Check, X, Ban, Power, 
    Phone, Mail, MessageSquare, AlertTriangle, RefreshCw, Search 
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell 
} from 'recharts';
import toast from 'react-hot-toast';
import apiClient from '../api/client';
import { useCurrency } from '../utils/useCurrency';

export default function AdminDashboard() {
    const [stores, setStores] = useState([]);
    const [users, setUsers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [globalPaymentMethods, setGlobalPaymentMethods] = useState([]);
    const [selectedOwner, setSelectedOwner] = useState('');
    const { formatPrice } = useCurrency();

    // Dashboard View State (MANAGEMENT, ANALYTICS, PAYMENTS, USERS, NOTICES, SUPPORT_SETTINGS)
    const [activeTab, setActiveTab] = useState('ANALYTICS'); 

    // Search and filters
    const [searchUser, setSearchUser] = useState('');

    // New User/Seller Form State
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');

    // New Store Form State
    const [newStoreName, setNewStoreName] = useState('');
    const [newStoreAddress, setNewStoreAddress] = useState('');
    const [newContactPhone, setNewContactPhone] = useState('');
    const [newContactEmail, setNewContactEmail] = useState('');
    const [newStoreImage, setNewStoreImage] = useState(null);
    const [newStoreType, setNewStoreType] = useState('RESTAURANT');

    // Edit Store State
    const [editingStore, setEditingStore] = useState(null);
    const [editStoreData, setEditStoreData] = useState({ name: '', location: '', contact_phone: '', contact_email: '', is_active: true });
    const [editStoreImage, setEditStoreImage] = useState(null);

    // Global Payment Method form state
    const [editingGlobalPayment, setEditingGlobalPayment] = useState(null); // null or { id, name, requires_account_details, is_active }
    const [globalPaymentName, setGlobalPaymentName] = useState('');
    const [globalPaymentLogo, setGlobalPaymentLogo] = useState(null);
    const [globalPaymentRequires, setGlobalPaymentRequires] = useState(true);
    const [globalPaymentActive, setGlobalPaymentActive] = useState(true);

    // Notices State
    const [noticeTitle, setNoticeTitle] = useState('');
    const [noticeMsg, setNoticeMsg] = useState('');
    const [noticeTargetUser, setNoticeTargetUser] = useState('');
    const [noticeTargetStore, setNoticeTargetStore] = useState('');

    // Support Settings State
    const [supportPhone, setSupportPhone] = useState('');
    const [supportEmail, setSupportEmail] = useState('');
    const [supportSms, setSupportSms] = useState('');
    const [supportWhatsapp, setSupportWhatsapp] = useState('');
    const [sellerSupportPhone, setSellerSupportPhone] = useState('');
    const [sellerSupportEmail, setSellerSupportEmail] = useState('');
    const [sellerSupportSms, setSellerSupportSms] = useState('');
    const [policyWarning, setPolicyWarning] = useState('');

    // Actions loaders
    const [storeLockLoading, setStoreLockLoading] = useState(null);

    const fetchData = useCallback(() => {
        apiClient.get('/stores/')
            .then(res => setStores(Array.isArray(res.data) ? res.data : []))
            .catch(err => console.error("Failed to load stores", err));

        apiClient.get('/users/')
            .then(res => setUsers(Array.isArray(res.data) ? res.data : []))
            .catch(err => console.error("Failed to load users", err));

        apiClient.get('/orders/')
            .then(res => setOrders(Array.isArray(res.data) ? res.data : []))
            .catch(err => console.error("Failed to load orders", err));

        apiClient.get('/global-payment-methods/')
            .then(res => setGlobalPaymentMethods(Array.isArray(res.data) ? res.data : []))
            .catch(err => console.error("Failed to load global payment methods", err));
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 45000);
        return () => clearInterval(interval);
    }, [fetchData]);

    useEffect(() => {
        apiClient.get('/system-support/')
            .then(res => {
                if (res.data) {
                    setSupportPhone(res.data.support_phone || '');
                    setSupportEmail(res.data.support_email || '');
                    setSupportSms(res.data.support_sms || '');
                    setSupportWhatsapp(res.data.support_whatsapp || '');
                    setSellerSupportPhone(res.data.seller_support_phone || '');
                    setSellerSupportEmail(res.data.seller_support_email || '');
                    setSellerSupportSms(res.data.seller_support_sms || '');
                    setPolicyWarning(res.data.policy_warning || '');
                }
            })
            .catch(err => console.error("Failed to load support settings", err));
    }, []);

    // Seeding default metrics calculation
    const completedOrders = orders.filter(o => ['DELIVERED', 'COMPLETED', 'READY'].includes(o.state));
    const gpv = completedOrders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
    const platformCut = gpv * 0.03;
    const activeStoresCount = stores.filter(s => s.is_active).length;
    const totalUsersCount = users.length;

    // Timeline Area Chart Data
    const getTrendData = () => {
        const dailyData = {};
        completedOrders.forEach(o => {
            const date = new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const amount = parseFloat(o.total_price || 0);
            if (!dailyData[date]) {
                dailyData[date] = { name: date, Volume: 0, Commission: 0 };
            }
            dailyData[date].Volume += amount;
            dailyData[date].Commission += amount * 0.03;
        });
        const list = Object.values(dailyData);
        return list.length > 0 ? list.slice(-10) : [{ name: 'Today', Volume: 0, Commission: 0 }];
    };

    // Store comparison bar chart
    const getStorePerformanceData = () => {
        const storeSales = {};
        completedOrders.forEach(o => {
            const storeName = o.store_name || `Store #${o.store}`;
            const amount = parseFloat(o.total_price || 0);
            if (!storeSales[storeName]) {
                storeSales[storeName] = { name: storeName, Sales: 0 };
            }
            storeSales[storeName].Sales += amount;
        });
        const list = Object.values(storeSales);
        return list.length > 0 ? list.sort((a, b) => b.Sales - a.Sales).slice(0, 5) : [{ name: 'No Stores', Sales: 0 }];
    };

    // Order status ratios
    const getOrderStatesData = () => {
        const statesCount = {};
        orders.forEach(o => {
            const state = o.state || 'AWAITING_PAYMENT';
            statesCount[state] = (statesCount[state] || 0) + 1;
        });
        const list = Object.entries(statesCount).map(([key, val]) => ({
            name: key.replace('_', ' '),
            value: val
        }));
        return list.length > 0 ? list : [{ name: 'No Orders', value: 1 }];
    };

    const PIE_COLORS = ['#eab308', '#fde047', '#ca8a04', '#10B981', '#3b82f6', '#ef4444', '#6b7280'];

    const handleCreateSeller = (e) => {
        e.preventDefault();
        apiClient.post('/users/', {
            username: newUsername,
            password: newPassword,
            role: 'SELLER'
        })
            .then(res => {
                toast.success(`User ${newUsername} created successfully!`);
                setNewUsername('');
                setNewPassword('');
                fetchData();
            })
            .catch(err => {
                const errorMessage = err.response?.data ? JSON.stringify(err.response.data) : err.message;
                toast.error(`Failed to create user: ${errorMessage}`);
            });
    };

    const handleCreateStore = (e) => {
        e.preventDefault();
        if (!newStoreName?.trim() || !newStoreAddress?.trim() || !selectedOwner) {
            toast.error("Please fill in all required fields.");
            return;
        }

        const formData = new FormData();
        formData.append('name', newStoreName);
        formData.append('location', newStoreAddress);
        formData.append('owner', selectedOwner);
        formData.append('store_type', newStoreType);
        formData.append('is_active', true);
        if (newContactPhone) formData.append('contact_phone', newContactPhone);
        if (newContactEmail) formData.append('contact_email', newContactEmail);
        if (newStoreImage) formData.append('image', newStoreImage);

        const toastId = toast.loading('Creating store...');
        apiClient.post('/stores/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }).then(res => {
            toast.success(`Store ${newStoreName} created!`, { id: toastId });
            setNewStoreName(''); setNewStoreAddress(''); setNewContactPhone(''); setNewContactEmail(''); setNewStoreImage(null); setSelectedOwner('');
            fetchData();
        }).catch(err => toast.error(`Failed to create store`, { id: toastId }));
    };

    const handleUpdateStore = (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('name', editStoreData.name);
        formData.append('location', editStoreData.location);
        formData.append('contact_phone', editStoreData.contact_phone);
        formData.append('contact_email', editStoreData.contact_email);
        formData.append('is_active', editStoreData.is_active);
        if (editStoreImage) formData.append('image', editStoreImage);

        apiClient.patch(`/stores/${editingStore.id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
            .then(res => {
                toast.success(`Store updated!`);
                setEditingStore(null);
                setEditStoreImage(null);
                fetchData();
            })
            .catch(err => toast.error("Failed to update store."));
    };

    // Store administrative suspension locking toggle
    const handleToggleStoreActive = (storeId, currentStatus) => {
        setStoreLockLoading(storeId);
        apiClient.patch(`/stores/${storeId}/`, { is_active: !currentStatus })
            .then(() => {
                toast.success(`Store status updated successfully!`);
                fetchData();
            })
            .catch(() => toast.error('Failed to change store active status.'))
            .finally(() => setStoreLockLoading(null));
    };

    const handleUpdateUserRole = (userId, newRole, employedStoreId) => {
        const payload = { role: newRole };
        if (employedStoreId !== undefined) {
            payload.employed_store = employedStoreId === '' ? null : employedStoreId;
        }
        apiClient.patch(`/users/${userId}/`, payload)
            .then(() => {
                toast.success('User updated successfully');
                fetchData();
            })
            .catch(() => toast.error('Failed to update user'));
    };

    const handleSaveGlobalPayment = (e) => {
        e.preventDefault();
        if (!globalPaymentName?.trim()) {
            toast.error("Please insert a payment method name");
            return;
        }

        const formData = new FormData();
        formData.append('name', globalPaymentName);
        formData.append('requires_account_details', globalPaymentRequires);
        formData.append('is_active', globalPaymentActive);
        if (globalPaymentLogo) {
            formData.append('logo', globalPaymentLogo);
        }

        const tid = toast.loading(editingGlobalPayment ? "Saving global method..." : "Creating global method...");
        const req = editingGlobalPayment
            ? apiClient.patch(`/global-payment-methods/${editingGlobalPayment.id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
            : apiClient.post('/global-payment-methods/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

        req.then(() => {
            toast.success(editingGlobalPayment ? "Payment method updated!" : "New global payment method registered!", { id: tid });
            setEditingGlobalPayment(null);
            setGlobalPaymentName('');
            setGlobalPaymentLogo(null);
            setGlobalPaymentRequires(true);
            setGlobalPaymentActive(true);
            fetchData();
        }).catch(err => toast.error(err.response?.data?.name ? "Payment option name already exists." : "Failed to save global payment method", { id: tid }));
    };

    const handleDeleteGlobalPayment = (id) => {
        if (!window.confirm("Remove this global payment template? Existing seller setups linked to it will lock their providers.")) return;
        const tid = toast.loading("Deleting global method...");
        apiClient.delete(`/global-payment-methods/${id}/`)
            .then(() => {
                toast.success("Removed successfully", { id: tid });
                fetchData();
            })
            .catch(() => toast.error("Could not delete. Check if active links are present.", { id: tid }));
    };

    const handlePostNotice = (e) => {
        e.preventDefault();
        const payload = {
            title: noticeTitle,
            message: noticeMsg,
        };
        if (noticeTargetUser) payload.target_user = noticeTargetUser;
        if (noticeTargetStore) payload.store = noticeTargetStore;

        const tid = toast.loading("Posting notice...");
        apiClient.post('/notices/', payload)
            .then(() => {
                toast.success("Notice broadcasted!", {id: tid});
                setNoticeTitle(''); setNoticeMsg(''); setNoticeTargetStore(''); setNoticeTargetUser('');
            }).catch(err => toast.error("Failed to post notice", {id: tid}));
    };

    const handleUpdateSupportConfig = (e) => {
        e.preventDefault();
        const payload = {
            support_phone: supportPhone,
            support_email: supportEmail,
            support_sms: supportSms,
            support_whatsapp: supportWhatsapp,
            seller_support_phone: sellerSupportPhone,
            seller_support_email: sellerSupportEmail,
            seller_support_sms: sellerSupportSms,
            policy_warning: policyWarning
        };
        const tid = toast.loading("Updating support configuration...");
        apiClient.post('/system-support/update_config/', payload)
            .then(() => {
                toast.success("Support configuration updated successfully!", { id: tid });
            })
            .catch(() => {
                toast.error("Failed to update support configuration.", { id: tid });
            });
    };

    const getStoreOwnerName = (storeId) => {
        const store = stores.find(s => s.id === storeId);
        if (!store) return 'Unknown Store';
        const owner = users.find(u => u.id === store.owner);
        return owner ? `@${owner.username}` : 'Unknown Owner';
    };

    const handleAdminResetLock = (orderId) => {
        const tid = toast.loading("Resetting security lock...");
        apiClient.post(`/orders/${orderId}/admin_reset_lock/`)
            .then(() => {
                toast.success("Security attempts reset successfully! Order unlocked.", { id: tid });
                fetchData();
            })
            .catch(err => {
                const msg = err.response?.data?.error || "Failed to reset security lock.";
                toast.error(msg, { id: tid });
            });
    };

    const handleAdminForceComplete = (orderId) => {
        if (!confirm("Are you sure you want to force manual override for this order? This will bypass verification security codes.")) return;
        const tid = toast.loading("Performing administrative force override...");
        apiClient.post(`/orders/${orderId}/staff_manual_verify/`)
            .then(() => {
                toast.success("Administrative override completed successfully!", { id: tid });
                fetchData();
            })
            .catch(err => {
                const msg = err.response?.data?.error || "Failed to force complete order.";
                toast.error(msg, { id: tid });
            });
    };

    // Search and filter users list
    const filteredUsers = users.filter(u => u.username.toLowerCase().includes(searchUser.toLowerCase()));

    return (
        <div className="w-full min-h-screen py-4 md:py-6 px-2 md:px-6 text-white bg-dark-950 overflow-x-hidden">
            {/* Header section */}
            <div className="flex flex-col lg:flex-row items-center justify-between mb-8 gap-4 border-b border-white/5 pb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-400">
                        <Shield size={28} />
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary-400 to-yellow-300 bg-clip-text text-transparent drop-shadow-sm leading-tight">
                            Platform Admin
                        </h2>
                        <p className="text-xs text-slate-400">Total system overview & administrative settings</p>
                    </div>
                </div>

                {/* Refresh and metadata */}
                <div className="flex items-center gap-3 self-end lg:self-center">
                    <button onClick={fetchData} className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl border border-white/5 transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                        <RefreshCw size={14} className="animate-spin-slow" /> Sync
                    </button>
                    <span className="text-xs bg-dark-900 border border-white/5 px-3 py-2.5 rounded-xl text-slate-400 font-semibold tracking-wide">
                        v2.4.1 (Stable)
                    </span>
                </div>
            </div>

            {/* Mobile Scrollable top navigation tabs */}
            <div className="flex bg-dark-900 border border-white/5 rounded-2xl p-1.5 overflow-x-auto w-full mb-8 scrollbar-none no-scrollbar sticky top-2 z-30 backdrop-blur-md bg-dark-900/90 gap-1.5">
                <button onClick={() => setActiveTab('ANALYTICS')} className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${activeTab === 'ANALYTICS' ? 'bg-primary-500 text-dark-950 shadow-lg shadow-primary-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                    <BarChart3 size={16} /> Analytics
                </button>
                <button onClick={() => setActiveTab('MANAGEMENT')} className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${activeTab === 'MANAGEMENT' ? 'bg-primary-500 text-dark-950 shadow-lg shadow-primary-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                    <Store size={16} /> Stores Hub
                </button>
                <button onClick={() => setActiveTab('PAYMENTS')} className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${activeTab === 'PAYMENTS' ? 'bg-primary-500 text-dark-950 shadow-lg shadow-primary-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                    <DollarSign size={16} /> Payments
                </button>
                <button onClick={() => setActiveTab('USERS')} className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${activeTab === 'USERS' ? 'bg-primary-500 text-dark-950 shadow-lg shadow-primary-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                    <Users size={16} /> Roles
                </button>
                <button onClick={() => setActiveTab('NOTICES')} className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${activeTab === 'NOTICES' ? 'bg-primary-500 text-dark-950 shadow-lg shadow-primary-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                    <Bell size={16} /> Notices
                </button>
                <button onClick={() => setActiveTab('SUPPORT_SETTINGS')} className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${activeTab === 'SUPPORT_SETTINGS' ? 'bg-primary-500 text-dark-950 shadow-lg shadow-primary-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                    <Shield size={16} /> Support & Safety
                </button>
            </div>

            {/* TAB CONTENT: ANALYTICS OVERVIEW */}
            {activeTab === 'ANALYTICS' && (
                <div className="space-y-8 animate-fadeIn">
                    {/* Glassmorphic KPI Panels Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-dark-900/60 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between group hover:border-primary-500/40 transition-colors shadow-xl">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl group-hover:bg-primary-500/20 transition-all pointer-events-none"></div>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Gross Platform Volume</span>
                                <TrendingUp className="text-primary-400" size={18} />
                            </div>
                            <div>
                                <span className="text-2xl md:text-3xl font-bold text-white font-mono tracking-tight">{formatPrice(gpv)}</span>
                                <p className="text-xs text-slate-400 mt-1">Total Completed Gross Sales</p>
                            </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="p-6 bg-dark-900/60 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between group hover:border-primary-500/40 transition-colors shadow-xl">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl group-hover:bg-primary-500/20 transition-all pointer-events-none"></div>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Platform Revenues (3% Cut)</span>
                                <DollarSign className="text-primary-400" size={18} />
                            </div>
                            <div>
                                <span className="text-2xl md:text-3xl font-bold text-primary-400 font-mono tracking-tight">{formatPrice(platformCut)}</span>
                                <p className="text-xs text-slate-400 mt-1">Accrued billing commission</p>
                            </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-6 bg-dark-900/60 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between group hover:border-primary-500/40 transition-colors shadow-xl">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl group-hover:bg-primary-500/20 transition-all pointer-events-none"></div>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Active Store Tenants</span>
                                <Store className="text-primary-400" size={18} />
                            </div>
                            <div>
                                <span className="text-2xl md:text-3xl font-bold text-white font-mono tracking-tight">{activeStoresCount} <span className="text-xs text-slate-500">/ {stores.length}</span></span>
                                <p className="text-xs text-slate-400 mt-1">Active operational locations</p>
                            </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="p-6 bg-dark-900/60 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between group hover:border-primary-500/40 transition-colors shadow-xl">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl group-hover:bg-primary-500/20 transition-all pointer-events-none"></div>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Registered Userbase</span>
                                <Users className="text-primary-400" size={18} />
                            </div>
                            <div>
                                <span className="text-2xl md:text-3xl font-bold text-white font-mono tracking-tight">{totalUsersCount}</span>
                                <p className="text-xs text-slate-400 mt-1">Total Enrolled platform profiles</p>
                            </div>
                        </motion.div>
                    </div>

                    {/* Recharts Graphical Dashboards Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Area Chart: Revenue Trend */}
                        <div className="glass-dark border border-white/5 rounded-3xl p-4 md:p-6 flex flex-col shadow-xl">
                            <div className="mb-4">
                                <h3 className="text-base font-bold text-slate-200">Revenues & Volume Timeline</h3>
                                <p className="text-xs text-slate-400 mt-1">Daily platform growth timeline</p>
                            </div>
                            <div className="h-[300px] w-full mt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={getTrendData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#eab308" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="#eab308" stopOpacity={0.0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                                        <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#ffffff10', borderRadius: '12px', fontSize: '12px', color: '#fff' }} />
                                        <Area type="monotone" dataKey="Volume" stroke="#eab308" strokeWidth={3} fillOpacity={1} fill="url(#colorVolume)" name="Sales Vol" />
                                        <Area type="monotone" dataKey="Commission" stroke="#10B981" strokeWidth={2} fillOpacity={0} name="3% Comm." />
                                        <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Bar Chart: Store comparison */}
                        <div className="glass-dark border border-white/5 rounded-3xl p-4 md:p-6 flex flex-col shadow-xl">
                            <div className="mb-4">
                                <h3 className="text-base font-bold text-slate-200">Top Tenants Revenue Leaderboard</h3>
                                <p className="text-xs text-slate-400 mt-1">Top-selling stores comparisons</p>
                            </div>
                            <div className="h-[300px] w-full mt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={getStorePerformanceData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                                        <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#ffffff10', borderRadius: '12px', fontSize: '12px', color: '#fff' }} />
                                        <Bar dataKey="Sales" fill="#10B981" radius={[8, 8, 0, 0]} name="Completed Sales">
                                            {getStorePerformanceData().map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? '#eab308' : '#10B981'} />
                                            ))}
                                        </Bar>
                                        <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Pie Chart: Order status ratio */}
                        <div className="glass-dark border border-white/5 rounded-3xl p-4 md:p-6 flex flex-col shadow-xl lg:col-span-2">
                            <div className="mb-4 flex justify-between items-center">
                                <div>
                                    <h3 className="text-base font-bold text-slate-200">System-wide Order States Distribution</h3>
                                    <p className="text-xs text-slate-400 mt-1">Order stage distributions breakdown</p>
                                </div>
                                <span className="text-xs bg-dark-900 border border-white/5 text-slate-400 px-3 py-1.5 rounded-full font-semibold">
                                    Total: {orders.length} orders
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6">
                                <div className="h-[250px] w-full md:col-span-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie 
                                                data={getOrderStatesData()} 
                                                cx="50%" 
                                                cy="50%" 
                                                innerRadius={60} 
                                                outerRadius={90} 
                                                paddingAngle={4} 
                                                dataKey="value"
                                            >
                                                {getOrderStatesData().map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#ffffff10', borderRadius: '12px', fontSize: '12px', color: '#fff' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                                    {getOrderStatesData().map((entry, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2.5 bg-dark-900/60 rounded-xl border border-white/5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></div>
                                                <span className="text-xs text-slate-300 font-bold uppercase tracking-tight">{entry.name}</span>
                                            </div>
                                            <span className="text-xs font-bold font-mono text-white bg-dark-900 px-2 py-1 rounded-md">{entry.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: STORES HUB & SUSPENSION KEYS */}
            {activeTab === 'MANAGEMENT' && (
                <div className="space-y-8 animate-fadeIn">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
                        {/* Quick Register Account Form */}
                        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-dark border border-white/5 rounded-3xl p-6 shadow-xl">
                            <h2 className="text-xl md:text-2xl font-bold mb-6 text-white flex items-center gap-2.5"><UserPlus className="text-primary-400" size={20} /> Quick Mint Account</h2>
                            <form onSubmit={handleCreateSeller} className="space-y-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Username</label>
                                    <input type="text" required placeholder="Enter seller username" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 placeholder-slate-600 transition-all text-white" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Password</label>
                                    <input type="password" required placeholder="Enter secure password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 placeholder-slate-600 transition-all text-white" />
                                </div>
                                <button type="submit" className="w-full bg-primary-500 hover:bg-primary-400 text-dark-950 font-bold py-2.5 px-4 rounded-lg text-sm transition-all shadow-lg shadow-primary-500/10 active:scale-98 cursor-pointer mt-4">Create User</button>
                            </form>
                        </motion.div>

                        {/* New Store Instance Form */}
                        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-dark border border-white/5 rounded-3xl p-6 shadow-xl">
                            <h2 className="text-xl md:text-2xl font-bold mb-6 text-white flex items-center gap-2.5"><Store className="text-primary-400" size={20} /> Register New Store</h2>
                            <form onSubmit={handleCreateStore} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Store Name</label>
                                        <input type="text" required placeholder="Enter store name" value={newStoreName} onChange={e => setNewStoreName(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 placeholder-slate-600 transition-all text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Store Type</label>
                                        <select required value={newStoreType} onChange={e => setNewStoreType(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 transition-all text-white">
                                            <option value="RESTAURANT">Restaurant</option>
                                            <option value="SHOP">Shop</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Address / Location</label>
                                    <input type="text" required placeholder="Enter store street address and location" value={newStoreAddress} onChange={e => setNewStoreAddress(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 placeholder-slate-600 transition-all text-white" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Contact Phone</label>
                                        <input type="text" placeholder="Enter store contact phone number" value={newContactPhone} onChange={e => setNewContactPhone(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 placeholder-slate-600 transition-all text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Contact Email</label>
                                        <input type="email" placeholder="Enter store email address" value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 placeholder-slate-600 transition-all text-white" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Assign Store Owner</label>
                                        <select required value={selectedOwner} onChange={e => setSelectedOwner(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 transition-all text-white">
                                            <option value="" disabled>Select User Profile</option>
                                            {users.filter(u => u.role === 'SELLER' || u.role === 'ADMIN').map(u => (
                                                <option key={u.id} value={u.id}>@{u.username} ({u.role})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Store Logo / Banner Image</label>
                                        <input type="file" accept="image/*" onChange={e => setNewStoreImage(e.target.files[0])} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 text-slate-400 file:mr-3 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-primary-500/10 file:text-primary-500 transition-all" />
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-primary-500 hover:bg-primary-400 text-dark-950 font-bold py-2.5 px-4 rounded-lg text-sm transition-all shadow-lg shadow-primary-500/10 active:scale-98 cursor-pointer mt-4">Launch Store Instance</button>
                            </form>
                        </motion.div>
                    </div>

                    {/* Stores List view with Suspension controllers */}
                    <div className="glass-dark border border-white/5 rounded-3xl p-4 md:p-6 shadow-xl">
                        <h2 className="text-xl md:text-2xl font-bold mb-6 text-white flex items-center gap-2.5"><Home className="text-primary-400" size={20} /> Active Platform Tenants</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {stores.map(s => {
                                const storeOwnerName = users.find(u => u.id === s.owner)?.username || `Owner #${s.owner}`;
                                return (
                                    <div key={s.id} className={`p-5 bg-dark-900/60 rounded-2xl border transition-all flex flex-col group ${s.is_active ? 'border-white/5 hover:border-primary-500/40 shadow-lg' : 'border-red-500/30 bg-red-950/15 shadow-[0_0_20px_rgba(239,68,68,0.05)]'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-base text-white group-hover:text-primary-400 transition-colors leading-snug line-clamp-1">{s.name}</h3>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 ${s.store_type === 'SHOP' ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'}`}>
                                                {s.store_type}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mb-3 line-clamp-1 flex items-center gap-1">Location: {s.location}</p>
                                        
                                        {/* Store information indicators */}
                                        <div className="space-y-1 mt-auto pt-3 border-t border-white/5 text-xs text-slate-500">
                                            <div className="flex justify-between"><span className="uppercase tracking-tight font-semibold">Vendor:</span> <span className="font-bold text-slate-300">@{storeOwnerName}</span></div>
                                            <div className="flex justify-between"><span className="uppercase tracking-tight font-semibold">Phone:</span> <span className="text-slate-400">{s.contact_phone || 'None'}</span></div>
                                        </div>

                                        <div className="flex justify-between items-center mt-5 pt-3 border-t border-white/5 gap-2">
                                            {/* SUSPENSION TOGGLE SWITCH (Live lock/unlock) */}
                                            <button 
                                                onClick={() => handleToggleStoreActive(s.id, s.is_active)}
                                                disabled={storeLockLoading === s.id}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                                    s.is_active 
                                                        ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white' 
                                                        : 'bg-primary-500/15 text-primary-400 border border-primary-500/35 hover:bg-primary-500 hover:text-dark-950 shadow-md'
                                                }`}
                                            >
                                                {storeLockLoading === s.id ? (
                                                    <RefreshCw size={10} className="animate-spin" />
                                                ) : s.is_active ? (
                                                    <Ban size={10} />
                                                ) : (
                                                    <Power size={10} />
                                                )}
                                                {s.is_active ? 'Suspend' : 'Activate'}
                                            </button>

                                            <button 
                                                onClick={() => { 
                                                    setEditingStore(s); 
                                                    setEditStoreData({ name: s.name, location: s.location, contact_phone: s.contact_phone || '', contact_email: s.contact_email || '', is_active: s.is_active }); 
                                                }} 
                                                className="px-3 py-1.5 bg-primary-500/10 text-primary-500 border border-primary-500/20 rounded-lg hover:bg-primary-500 hover:text-dark-950 transition-all text-xs font-bold cursor-pointer"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: GLOBAL PAYMENT METHOD TEMPLATES HUB (NEW) */}
            {activeTab === 'PAYMENTS' && (
                <div className="space-y-8 animate-fadeIn">
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8 items-start">
                        {/* Global payment method creator/editor form */}
                        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-dark border border-white/5 rounded-3xl p-6 shadow-xl xl:col-span-1">
                            <h2 className="text-xl md:text-2xl font-bold mb-6 text-white flex items-center gap-2.5">
                                <DollarSign className="text-primary-400" size={20} />
                                {editingGlobalPayment ? 'Edit Global Method' : 'Add Pre-defined Payment'}
                            </h2>
                            <form onSubmit={handleSaveGlobalPayment} className="space-y-5">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Provider Name</label>
                                    <input type="text" required placeholder="Enter payment provider name" value={globalPaymentName} onChange={e => setGlobalPaymentName(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none text-white transition-all placeholder-slate-600" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Official Provider Logo</label>
                                    <input type="file" accept="image/*" onChange={e => setGlobalPaymentLogo(e.target.files[0])} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none text-white file:mr-3 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-primary-500/10 file:text-primary-500 transition-all" />
                                    <p className="text-[10px] text-slate-500 mt-1">Leave empty to preserve logo when editing.</p>
                                </div>
                                
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between p-3 bg-dark-900/60 border border-white/5 rounded-xl">
                                        <div>
                                            <span className="text-xs font-bold text-slate-200 block">Requires Account Details</span>
                                            <p className="text-xs text-slate-400">True for M-Pesa/Bank, False for Cash</p>
                                        </div>
                                        <input type="checkbox" checked={globalPaymentRequires} onChange={e => setGlobalPaymentRequires(e.target.checked)} className="accent-primary-500 w-5 h-5 rounded cursor-pointer" />
                                    </div>
 
                                    <div className="flex items-center justify-between p-3 bg-dark-900/60 border border-white/5 rounded-xl">
                                        <div>
                                            <span className="text-xs font-bold text-slate-200 block">Method Active Status</span>
                                            <p className="text-xs text-slate-400">Enable/disable globally for sellers</p>
                                        </div>
                                        <input type="checkbox" checked={globalPaymentActive} onChange={e => setGlobalPaymentActive(e.target.checked)} className="accent-primary-500 w-5 h-5 rounded cursor-pointer" />
                                    </div>
                                </div>
 
                                <div className="flex gap-2 pt-4">
                                    {editingGlobalPayment && (
                                        <button type="button" onClick={() => {
                                            setEditingGlobalPayment(null);
                                            setGlobalPaymentName('');
                                            setGlobalPaymentLogo(null);
                                            setGlobalPaymentRequires(true);
                                            setGlobalPaymentActive(true);
                                        }} className="w-1/3 py-2 px-4 border border-white/10 hover:bg-white/5 text-slate-300 rounded-lg font-bold text-sm cursor-pointer transition-all">Cancel</button>
                                    )}
                                    <button type="submit" className={`py-2.5 px-4 bg-primary-500 hover:bg-primary-400 text-dark-950 rounded-lg font-bold text-sm transition-all shadow-lg shadow-primary-500/10 active:scale-98 cursor-pointer ${editingGlobalPayment ? 'w-2/3' : 'w-full'}`}>
                                        {editingGlobalPayment ? 'Save Changes' : 'Register Provider'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
 
                        {/* List of global payment methods configured */}
                        <div className="glass-dark border border-white/5 rounded-3xl p-4 md:p-6 shadow-xl xl:col-span-2 space-y-6">
                            <div>
                                <h3 className="text-base font-bold text-slate-200">Pre-defined System Payment Methods</h3>
                                <p className="text-xs text-slate-400 mt-1">Active options sellers can choose from</p>
                            </div>
 
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {globalPaymentMethods.map(pm => (
                                    <div key={pm.id} className="p-4 bg-dark-900/60 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-primary-500/40 transition-colors">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-14 h-14 bg-dark-950 border border-white/10 rounded-2xl flex items-center justify-center p-2 shrink-0 overflow-hidden shadow-inner">
                                                {pm.logo_url || pm.logo ? (
                                                    <img src={pm.logo_url || pm.logo} alt={pm.name} className="w-full h-full object-contain" />
                                                ) : (
                                                    <DollarSign size={20} className="text-slate-400" />
                                                )}
                                            </div>
                                            <div className="overflow-hidden">
                                                <h4 className="font-bold text-sm text-white line-clamp-1">{pm.name}</h4>
                                                <div className="flex flex-wrap gap-1.5 mt-1">
                                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5`}>
                                                        {pm.requires_account_details ? 'Details Required' : 'Direct/Cash'}
                                                    </span>
                                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${pm.is_active ? 'bg-green-500/15 text-green-400 border border-green-500/15' : 'bg-red-500/15 text-red-400 border border-red-500/15'}`}>
                                                        {pm.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
 
                                        <div className="flex gap-1">
                                            <button onClick={() => {
                                                setEditingGlobalPayment(pm);
                                                setGlobalPaymentName(pm.name);
                                                setGlobalPaymentRequires(pm.requires_account_details);
                                                setGlobalPaymentActive(pm.is_active);
                                            }} className="p-2 bg-white/5 hover:bg-primary-500 hover:text-dark-950 rounded-lg text-slate-400 transition-colors cursor-pointer" title="Edit method">
                                                <Edit2 size={13} />
                                            </button>
                                            <button onClick={() => handleDeleteGlobalPayment(pm.id)} className="p-2 bg-white/5 hover:bg-red-500 hover:text-white rounded-lg text-slate-400 transition-colors cursor-pointer" title="Remove method">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {globalPaymentMethods.length === 0 && (
                                    <div className="col-span-full py-8 text-center text-xs text-slate-500 border border-white/5 border-dashed rounded-2xl">
                                        No pre-defined global payment methods seeded yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
 
            {/* TAB CONTENT: ROLE & ACCESS HUB */}
            {activeTab === 'USERS' && (
                <div className="glass-dark border border-white/5 rounded-3xl p-6 shadow-xl animate-fadeIn">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                        <div>
                            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5"><Users className="text-primary-400" size={20} /> Role & Access Hub</h2>
                            <p className="text-xs text-slate-400 mt-1">Control roles and employment scopes</p>
                        </div>
 
                        {/* Search field */}
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-3 text-slate-500" size={16} />
                            <input 
                                type="text" 
                                placeholder="Enter username to filter..." 
                                value={searchUser} 
                                onChange={e => setSearchUser(e.target.value)} 
                                className="w-full bg-dark-950 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-600 focus:border-primary-500 outline-none transition-all"
                            />
                        </div>
                    </div>
 
                    <div className="overflow-x-auto -mx-4 md:mx-0">
                        <div className="inline-block min-w-full align-middle px-4 md:px-0">
                            <table className="min-w-full text-left text-xs md:text-sm text-slate-300">
                                <thead className="bg-dark-900/40 text-slate-400 border-b border-white/5">
                                    <tr className="text-[10px] uppercase tracking-wider font-bold">
                                        <th className="p-4">Username</th>
                                        <th className="p-4">Assigned Role</th>
                                        <th className="p-4">Linked Store Branch</th>
                                        <th className="p-4 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredUsers.map(u => (
                                        <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4 font-semibold text-slate-200 whitespace-nowrap">@{u.username}</td>
                                            <td className="p-4">
                                                <select 
                                                    className="bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-primary-500 transition-all w-full max-w-[150px]"
                                                    value={u.role}
                                                    onChange={(e) => handleUpdateUserRole(u.id, e.target.value, u.employed_store)}
                                                >
                                                    <option value="CUSTOMER">Customer</option>
                                                    <option value="SELLER">Seller</option>
                                                    <option value="ADMIN">Admin</option>
                                                    <option value="CHEF">Chef</option>
                                                    <option value="DELIVERY">Driver</option>
                                                    <option value="ACCOUNTANT">Accountant</option>
                                                </select>
                                            </td>
                                            <td className="p-4">
                                                <select 
                                                    className="bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-primary-500 transition-all w-full max-w-[180px]"
                                                    value={u.employed_store || ''}
                                                    onChange={(e) => handleUpdateUserRole(u.id, u.role, e.target.value)}
                                                >
                                                    <option value="">Global Tenant</option>
                                                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-500/10 text-green-400 rounded-full text-[10px] font-bold uppercase tracking-wider border border-green-500/20">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                                    Online
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredUsers.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="py-8 text-center text-xs text-slate-500">
                                                No users found matching query.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
 
            {/* TAB CONTENT: NOTICES CENTER */}
            {activeTab === 'NOTICES' && (
                <div className="glass-dark border border-white/5 rounded-3xl p-6 max-w-2xl mx-auto shadow-xl animate-fadeIn">
                    <h2 className="text-xl md:text-2xl font-bold mb-6 text-white flex items-center gap-2.5"><Bell className="text-primary-400" /> Broadcast System Alert</h2>
                    <form onSubmit={handlePostNotice} className="space-y-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Alert Title</label>
                            <input type="text" required placeholder="Enter notice title" value={noticeTitle} onChange={e => setNoticeTitle(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 outline-none text-white transition-all placeholder-slate-600" />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Notice Message Details</label>
                            <textarea required placeholder="Enter detailed notice message details" rows="4" value={noticeMsg} onChange={e => setNoticeMsg(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 outline-none text-white placeholder-slate-600 resize-none transition-all" />
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Target Store Scope (Optional)</label>
                                <select value={noticeTargetStore} onChange={e => setNoticeTargetStore(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 outline-none text-white transition-all">
                                    <option value="">Global Broadcast (All Stores)</option>
                                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Target User Account (Optional)</label>
                                <select value={noticeTargetUser} onChange={e => setNoticeTargetUser(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 outline-none text-white transition-all">
                                    <option value="">All Registered Staff</option>
                                    {users.map(u => <option key={u.id} value={u.id}>@{u.username}</option>)}
                                </select>
                            </div>
                        </div>
 
                        <button type="submit" className="w-full bg-primary-500 hover:bg-primary-400 text-dark-950 font-bold py-2.5 px-4 rounded-lg text-sm transition-all shadow-lg shadow-primary-500/10 active:scale-98 cursor-pointer mt-4">Send System Broadcast</button>
                    </form>
                </div>
            )}
 
            {/* TAB CONTENT: SUPPORT_SETTINGS */}
            {activeTab === 'SUPPORT_SETTINGS' && (
                <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn text-left">
                    
                    {/* Platform Safety & Risk Center Card */}
                    <div className="glass-dark border border-red-500/25 bg-red-500/5 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="flex justify-between items-center mb-6 pb-3 border-b border-white/5">
                            <div className="flex items-center gap-2.5">
                                <Shield className="text-red-400 animate-pulse" size={24} />
                                <div>
                                    <h2 className="text-lg font-black text-white uppercase tracking-tight">Platform Safety & Risk Center</h2>
                                    <p className="text-xs text-red-400 font-bold uppercase tracking-widest font-mono mt-0.5">System Lockouts & PIN Security Logs</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-black uppercase bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded-md">Live Safeguard</span>
                        </div>

                        {(() => {
                            const lockedOrders = orders.filter(o => o.is_locked || o.delivery_code_attempts > 0);
                            return lockedOrders.length > 0 ? (
                                <div className="space-y-4">
                                    {lockedOrders.map(o => (
                                        <div key={o.id} className="bg-dark-950/80 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:border-red-500/30">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-base font-black text-white">Order #{o.id}</span>
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                                        o.fulfillment_mode === 'DELIVERY' ? 'bg-purple-500/20 text-purple-400' : 'bg-orange-500/20 text-orange-400'
                                                    }`}>
                                                        {o.fulfillment_mode}
                                                    </span>
                                                    {o.is_locked ? (
                                                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">LOCKED</span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Suspicious attempts</span>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-400 font-medium">
                                                    <div>Store: <span className="text-white font-bold">{o.store_name || `Store #${o.store}`}</span></div>
                                                    <div>Owner: <span className="text-white font-bold">{getStoreOwnerName(o.store)}</span></div>
                                                    <div>Client Name: <span className="text-white font-bold">{o.customer_name || 'Anonymous'}</span></div>
                                                    <div>PIN Attempts: <span className="font-mono text-red-400 font-black">{o.delivery_code_attempts || 0} / 5</span></div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 w-full md:w-auto self-stretch md:self-auto">
                                                <button
                                                    onClick={() => handleAdminResetLock(o.id)}
                                                    className="flex-1 md:flex-initial bg-dark-900 border border-white/10 hover:border-primary-500/30 hover:bg-dark-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                                >
                                                    <RefreshCw size={12} /> Unlock & Reset Attempts
                                                </button>
                                                <button
                                                    onClick={() => handleAdminForceComplete(o.id)}
                                                    className="flex-1 md:flex-initial bg-red-600 hover:bg-red-500 text-white font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-red-500/10 flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
                                                >
                                                    <Check size={12} /> Force Complete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-dark-950/60 border border-white/5 p-8 rounded-2xl flex flex-col items-center justify-center text-center">
                                    <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-3">
                                        <Check size={24} />
                                    </div>
                                    <h4 className="text-sm font-bold text-white uppercase tracking-tight">All Operations Secure</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed max-w-sm mt-1">
                                        No active lockouts or suspicious verification activities detected. Store counters and deliveries are operating within safety parameters.
                                    </p>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Platform Configuration Card */}
                    <div className="glass-dark border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="flex items-center gap-2.5 mb-6 pb-3 border-b border-white/5">
                            <Shield className="text-primary-400" size={20} />
                            <div>
                                <h2 className="text-lg font-black text-white uppercase tracking-tight">System Configuration Settings</h2>
                                <p className="text-xs text-slate-400 font-medium">Configure global support channels, priority seller support, and compliance guidelines.</p>
                            </div>
                        </div>

                        <form onSubmit={handleUpdateSupportConfig} className="space-y-6">
                            
                            {/* General Customer Support Section */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase text-primary-400 tracking-wider font-mono">Customer Support Channels (FAQ View)</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Support Phone (tel:)</label>
                                        <input type="text" required value={supportPhone} onChange={e => setSupportPhone(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 outline-none text-white transition-all font-mono" placeholder="e.g. +255 700 000 000" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Support Email (mailto:)</label>
                                        <input type="email" required value={supportEmail} onChange={e => setSupportEmail(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 outline-none text-white transition-all font-mono" placeholder="e.g. support@chapuu.co.tz" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Support SMS (sms:)</label>
                                        <input type="text" required value={supportSms} onChange={e => setSupportSms(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 outline-none text-white transition-all font-mono" placeholder="e.g. +255 700 000 000" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">WhatsApp Contact Number</label>
                                        <input type="text" required value={supportWhatsapp} onChange={e => setSupportWhatsapp(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 outline-none text-white transition-all font-mono" placeholder="e.g. 255700000000" />
                                    </div>
                                </div>
                            </div>

                            <hr className="border-white/5 my-6" />

                            {/* Priority Seller Support Section */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase text-red-400 tracking-wider font-mono">Dedicated Seller Support Channels (Merchant View)</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Seller Support Phone</label>
                                        <input type="text" required value={sellerSupportPhone} onChange={e => setSellerSupportPhone(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 outline-none text-white transition-all font-mono" placeholder="e.g. +255 700 000 111" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Seller Support Email</label>
                                        <input type="email" required value={sellerSupportEmail} onChange={e => setSellerSupportEmail(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 outline-none text-white transition-all font-mono" placeholder="e.g. vendor-support@chapuu.co.tz" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Seller Support SMS</label>
                                        <input type="text" required value={sellerSupportSms} onChange={e => setSellerSupportSms(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 outline-none text-white transition-all font-mono" placeholder="e.g. +255 700 000 111" />
                                    </div>
                                </div>
                            </div>

                            <hr className="border-white/5 my-6" />

                            {/* Warnings Configuration */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono">Compliance & Policies</h3>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Platform Safety Warning Text</label>
                                    <textarea required rows="3" value={policyWarning} onChange={e => setPolicyWarning(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 outline-none text-white resize-none transition-all leading-relaxed font-medium" placeholder="Enter warning shown to store owners on pin locks or policy infractions" />
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-primary-500 hover:bg-primary-400 text-dark-950 font-black py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-primary-500/20 active:scale-95 cursor-pointer uppercase tracking-wider">
                                Save Configuration
                            </button>
                        </form>
                    </div>
                </div>
            )}
 
            {/* MODAL: EDITING STORE DETAILS */}
            <AnimatePresence>
                {editingStore && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingStore(null)} className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative glass-dark border border-white/5 rounded-3xl p-6 w-full max-w-lg shadow-2xl z-10 text-white">
                            <button onClick={() => setEditingStore(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-lg transition-all cursor-pointer">
                                <X size={16} />
                            </button>
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Store className="text-primary-400" /> Edit Store Profile</h3>
                            
                            <form onSubmit={handleUpdateStore} className="space-y-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Store Name</label>
                                    <input type="text" required value={editStoreData.name} onChange={e => setEditStoreData({ ...editStoreData, name: e.target.value })} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none text-white transition-all" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Location</label>
                                    <input type="text" required value={editStoreData.location} onChange={e => setEditStoreData({ ...editStoreData, location: e.target.value })} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none text-white transition-all" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Phone</label>
                                        <input type="text" value={editStoreData.contact_phone} onChange={e => setEditStoreData({ ...editStoreData, contact_phone: e.target.value })} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none text-white transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Email</label>
                                        <input type="email" value={editStoreData.contact_email} onChange={e => setEditStoreData({ ...editStoreData, contact_email: e.target.value })} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none text-white transition-all" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Update Store Image</label>
                                    <input type="file" accept="image/*" onChange={e => setEditStoreImage(e.target.files[0])} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none text-slate-400 file:mr-3 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-primary-500/10 file:text-primary-500 transition-all focus:outline-none" />
                                </div>
 
                                <div className="flex justify-end gap-2 pt-4">
                                    <button type="button" onClick={() => setEditingStore(null)} className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-lg text-sm font-bold text-slate-400 hover:text-white cursor-pointer transition-all">Cancel</button>
                                    <button type="submit" className="px-6 py-2 bg-primary-500 hover:bg-primary-400 text-dark-950 rounded-lg text-sm font-bold shadow-lg shadow-primary-500/10 cursor-pointer transition-all">Save Changes</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}