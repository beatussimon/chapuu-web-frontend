import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Shield, Store, Users, UserPlus, Home, Save, BarChart3, TrendingUp, 
    DollarSign, Bell, Plus, Edit2, Trash2, Check, X, Ban, Power, 
    Phone, Mail, MessageSquare, AlertTriangle, RefreshCw, Search,
    Award, Zap, Coins, Star, LayoutGrid
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell 
} from 'recharts';
import toast from 'react-hot-toast';
import apiClient from '../api/client';
import { useCurrency } from '../utils/useCurrency';
import { useAppStore } from '../store/useStore';

export default function AdminDashboard() {
    const [stores, setStores] = useState([]);
    const [showGridModal, setShowGridModal] = useState(false);
    const [users, setUsers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [globalPaymentMethods, setGlobalPaymentMethods] = useState([]);
    const [selectedOwner, setSelectedOwner] = useState('');
    const { formatPrice } = useCurrency();
    const { userRole } = useAppStore();

    const [platformAnalytics, setPlatformAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);

    // Dashboard View State (MANAGEMENT, ANALYTICS, PAYMENTS, USERS, NOTICES, SUPPORT_SETTINGS, COMMISSIONS)
    const [activeTab, setActiveTab] = useState('ANALYTICS'); 

    // Platform Billing & Commissions State
    const [billingData, setBillingData] = useState([]);
    const [billingPagination, setBillingPagination] = useState({ count: 0, next: null, previous: null });
    const [billingPage, setBillingPage] = useState(1);
    const [billingSearch, setBillingSearch] = useState('');
    const [rankingsData, setRankingsData] = useState(null);
    const [pendingPayments, setPendingPayments] = useState([]);
    const [loadingBilling, setLoadingBilling] = useState(true);

    // Payment review interactive overlays
    const [reviewingPayment, setReviewingPayment] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);
    const [previewReceiptUrl, setPreviewReceiptUrl] = useState(null);
    const [isMounted, setIsMounted] = useState(false);


 

    // Search and filters
    const [searchUser, setSearchUser] = useState('');

    // New User/Seller Form State
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newFirstName, setNewFirstName] = useState('');
    const [newLastName, setNewLastName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPhone, setNewPhone] = useState('');

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

        apiClient.get('/analytics/platform/')
            .then(res => {
                setPlatformAnalytics(res.data);
                setAnalyticsLoading(false);
            })
            .catch(err => {
                console.error("Failed to load platform analytics", err);
                setAnalyticsLoading(false);
            });
    }, []);

    const fetchBillingData = useCallback(() => {
        setLoadingBilling(true);
        apiClient.get(`/billing/platform-billing/?page=${billingPage}&search=${billingSearch}`)
            .then(res => {
                if (res.data) {
                    setBillingData(Array.isArray(res.data.results) ? res.data.results : []);
                    setBillingPagination({
                        count: res.data.count || 0,
                        next: res.data.next,
                        previous: res.data.previous
                    });
                }
                setLoadingBilling(false);
            })
            .catch(err => {
                console.error("Failed to load platform billing data", err);
                setLoadingBilling(false);
            });

        apiClient.get('/billing/platform-billing/rankings/')
            .then(res => {
                if (res.data) {
                    setRankingsData(res.data);
                }
            })
            .catch(err => console.error("Failed to load billing rankings", err));

        apiClient.get('/billing/payments/?status=PENDING')
            .then(res => {
                setPendingPayments(Array.isArray(res.data) ? res.data : []);
            })
            .catch(err => console.error("Failed to load pending payments", err));
    }, [billingPage, billingSearch]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 45000);
        return () => clearInterval(interval);
    }, [fetchData]);

    useEffect(() => {
        fetchBillingData();
        const interval = setInterval(fetchBillingData, 45000);
        return () => clearInterval(interval);
    }, [fetchBillingData]);

    useEffect(() => {
        setIsMounted(true);
    }, []);


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

    // Platform metrics offloaded to backend analytics endpoint
    const gpv = platformAnalytics?.kpi?.gpv ?? 0;
    const platformCut = platformAnalytics?.kpi?.platform_commission ?? 0;
    const activeStoresCount = platformAnalytics?.kpi?.active_merchants_count ?? stores.filter(s => s.is_active).length;
    const totalUsersCount = (platformAnalytics?.kpi?.customer_count ?? 0) + (platformAnalytics?.kpi?.staff_count ?? 0) || users.length;

    // Timeline Area Chart Data
    const getTrendData = () => {
        if (!platformAnalytics?.daily_trends || platformAnalytics.daily_trends.length === 0) {
            return [{ name: 'Today', Volume: 0, Commission: 0 }];
        }
        return platformAnalytics.daily_trends.map(d => ({
            name: new Date(d.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            Volume: d.gpv,
            Commission: d.commission
        }));
    };

    // Store comparison bar chart
    const getStorePerformanceData = () => {
        if (!platformAnalytics?.store_leaderboard || platformAnalytics.store_leaderboard.length === 0) {
            return [{ name: 'No Stores', Sales: 0 }];
        }
        return platformAnalytics.store_leaderboard.map(s => ({
            name: s.store_name,
            Sales: s.total_sales
        }));
    };

    // Order status ratios
    const getOrderStatesData = () => {
        if (!platformAnalytics?.state_funnel || Object.keys(platformAnalytics.state_funnel).length === 0) {
            return [{ name: 'No Orders', value: 1 }];
        }
        return Object.entries(platformAnalytics.state_funnel).map(([key, val]) => ({
            name: key.replace('_', ' '),
            value: val
        }));
    };

    const PIE_COLORS = ['#eab308', '#fde047', '#ca8a04', '#10B981', '#3b82f6', '#ef4444', '#6b7280'];

    const handleCreateSeller = (e) => {
        e.preventDefault();
        apiClient.post('/users/', {
            username: newUsername,
            password: newPassword,
            role: 'SELLER',
            first_name: newUsername.charAt(0).toUpperCase() + newUsername.slice(1),
            last_name: 'Merchant',
            email: `${newUsername.toLowerCase()}@chapuu.co.tz`,
            phone_number: '+255 700 000 000',
            accepted_liability_policy: true
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

    const handleReviewPayment = (paymentId, approved) => {
        if (!approved && !rejectionReason.trim()) {
            toast.error("Please provide a rejection reason.");
            return;
        }
        setSubmittingReview(true);
        const tid = toast.loading(approved ? "Approving commission payout..." : "Rejecting commission payout...");
        apiClient.post(`/billing/payments/${paymentId}/review/`, {
            approved,
            rejection_reason: approved ? '' : rejectionReason
        })
            .then(res => {
                toast.success(approved ? "Commission payment approved successfully!" : "Commission payment rejected.", { id: tid });
                setReviewingPayment(null);
                setRejectionReason('');
                fetchBillingData();
                fetchData();
            })
            .catch(err => {
                const msg = err.response?.data?.error || "Failed to submit review.";
                toast.error(msg, { id: tid });
            })
            .finally(() => setSubmittingReview(false));
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
            <div className="flex items-center gap-2 mb-8 sticky top-2 z-30">
                <div className="flex bg-dark-900 border border-white/5 rounded-2xl p-1.5 overflow-x-auto w-full backdrop-blur-md bg-dark-900/90 gap-1.5 scrollbar-none no-scrollbar flex-1 min-w-0">
                    <button onClick={() => setActiveTab('ANALYTICS')} className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${activeTab === 'ANALYTICS' ? 'bg-primary-500 text-dark-950 shadow-lg shadow-primary-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        <BarChart3 size={16} /> Analytics
                    </button>
                    <button onClick={() => setActiveTab('MANAGEMENT')} className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${activeTab === 'MANAGEMENT' ? 'bg-primary-500 text-dark-950 shadow-lg shadow-primary-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        <Store size={16} /> Stores Hub
                    </button>
                    <button onClick={() => setActiveTab('PAYMENTS')} className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${activeTab === 'PAYMENTS' ? 'bg-primary-500 text-dark-950 shadow-lg shadow-primary-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        <DollarSign size={16} /> Payments
                    </button>
                    <button onClick={() => setActiveTab('COMMISSIONS')} className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${activeTab === 'COMMISSIONS' ? 'bg-primary-500 text-dark-950 shadow-lg shadow-primary-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        <Coins size={16} /> Commissions
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
                {/* Mobile localized grid switcher trigger */}
                <button 
                    onClick={() => setShowGridModal(true)} 
                    className="lg:hidden w-10 h-10 shrink-0 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md"
                    title="Control Panel Map"
                >
                    <LayoutGrid size={16} />
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
                                {isMounted && (
                                    <ResponsiveContainer width="99%" height={300} initialDimension={{ width: 300, height: 300 }}>
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
                                )}
                            </div>
                        </div>

                        {/* Bar Chart: Store comparison */}
                        <div className="glass-dark border border-white/5 rounded-3xl p-4 md:p-6 flex flex-col shadow-xl">
                            <div className="mb-4">
                                <h3 className="text-base font-bold text-slate-200">Top Tenants Revenue Leaderboard</h3>
                                <p className="text-xs text-slate-400 mt-1">Top-selling stores comparisons</p>
                            </div>
                            <div className="h-[300px] w-full mt-2">
                                {isMounted && (
                                    <ResponsiveContainer width="99%" height={300} initialDimension={{ width: 300, height: 300 }}>
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
                                )}
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
                                    {isMounted && (
                                        <ResponsiveContainer width="99%" height={250} initialDimension={{ width: 250, height: 250 }}>
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
                                    )}
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

                    {/* Safety & Dispute Alert Banner */}
                    {platformAnalytics?.safety_disputes?.locked_orders_count > 0 && (
                        <div className="p-5 bg-red-950/20 border border-red-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 animate-pulse shadow-lg">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="text-red-400" size={24} />
                                <div className="text-left">
                                    <h4 className="text-sm font-black text-white uppercase tracking-tight">Active Platform Lockouts Detected</h4>
                                    <p className="text-xs text-red-400 font-medium">There are currently {platformAnalytics.safety_disputes.locked_orders_count} locked suspicious orders requiring dispute resolution.</p>
                                </div>
                            </div>
                            <button onClick={() => setActiveTab('SUPPORT_SETTINGS')} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer">
                                View Disputes
                            </button>
                        </div>
                    )}
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">First Name</label>
                                        <input type="text" required placeholder="First name" value={newFirstName} onChange={e => setNewFirstName(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 placeholder-slate-600 transition-all text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Last Name</label>
                                        <input type="text" required placeholder="Last name" value={newLastName} onChange={e => setNewLastName(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 placeholder-slate-600 transition-all text-white" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Email Address</label>
                                        <input type="email" required placeholder="Email address" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 placeholder-slate-600 transition-all text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Phone Number</label>
                                        <input type="text" required placeholder="Phone number" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 placeholder-slate-600 transition-all text-white" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Username</label>
                                        <input type="text" required placeholder="Username" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 placeholder-slate-600 transition-all text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Password</label>
                                        <input type="password" required placeholder="Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 placeholder-slate-600 transition-all text-white" />
                                    </div>
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
                                        <input type="text" required placeholder="Store name" value={newStoreName} onChange={e => setNewStoreName(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 placeholder-slate-600 transition-all text-white" />
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
                                    <input type="text" required placeholder="Address / location" value={newStoreAddress} onChange={e => setNewStoreAddress(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 placeholder-slate-600 transition-all text-white" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Contact Phone</label>
                                        <input type="text" placeholder="Contact phone" value={newContactPhone} onChange={e => setNewContactPhone(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 placeholder-slate-600 transition-all text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Contact Email</label>
                                        <input type="email" placeholder="Contact email" value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 placeholder-slate-600 transition-all text-white" />
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
                        {userRole === 'SUPERUSER' ? (
                            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-dark border border-white/5 rounded-3xl p-6 shadow-xl xl:col-span-1">
                                <h2 className="text-xl md:text-2xl font-bold mb-6 text-white flex items-center gap-2.5">
                                    <DollarSign className="text-primary-400" size={20} />
                                    {editingGlobalPayment ? 'Edit Global Method' : 'Add Pre-defined Payment'}
                                </h2>
                                <form onSubmit={handleSaveGlobalPayment} className="space-y-5">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Provider Name</label>
                                        <input type="text" required placeholder="Payment provider name" value={globalPaymentName} onChange={e => setGlobalPaymentName(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none text-white transition-all placeholder-slate-600" />
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
                        ) : (
                            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-dark border border-white/5 rounded-3xl p-6 shadow-xl xl:col-span-1 flex flex-col justify-center items-center text-center py-12 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl pointer-events-none"></div>
                                <Shield className="text-slate-500 mb-3" size={40} />
                                <h3 className="text-sm font-bold text-white uppercase tracking-tight">Payments Form Guarded 🔒</h3>
                                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mt-1.5">
                                    Registering or modifying global payment method templates is strictly restricted to the Platform Owner (Superuser).
                                </p>
                            </motion.div>
                        )}
 
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
 
                                        {userRole === 'SUPERUSER' && (
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
                                        )}
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
                                placeholder="Username to filter..." 
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
                                                {(u.role === 'ADMIN' || u.role === 'SUPERUSER') && userRole !== 'SUPERUSER' ? (
                                                    <div className="flex items-center gap-1.5 text-slate-400 bg-white/5 border border-white/5 px-3 py-2 rounded-lg text-sm w-full max-w-[150px] cursor-not-allowed" title="Editing Admin/Superuser requires Platform Owner role">
                                                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                                        <span>{u.role} 🔒</span>
                                                    </div>
                                                ) : (
                                                    <select 
                                                        className="bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-primary-500 transition-all w-full max-w-[150px]"
                                                        value={u.role}
                                                        onChange={(e) => handleUpdateUserRole(u.id, e.target.value, u.employed_store)}
                                                    >
                                                        <option value="CUSTOMER">Customer</option>
                                                        <option value="SELLER">Seller</option>
                                                        {userRole === 'SUPERUSER' && <option value="ADMIN">Admin</option>}
                                                        {userRole === 'SUPERUSER' && <option value="SUPERUSER">Superuser</option>}
                                                        <option value="CHEF">Chef</option>
                                                        <option value="DELIVERY">Driver</option>
                                                        <option value="ACCOUNTANT">Accountant</option>
                                                    </select>
                                                )}
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
                            <input type="text" required placeholder="Notice title" value={noticeTitle} onChange={e => setNoticeTitle(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 outline-none text-white transition-all placeholder-slate-600" />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Notice Message Details</label>
                            <textarea required placeholder="Notice message details" rows="4" value={noticeMsg} onChange={e => setNoticeMsg(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 outline-none text-white placeholder-slate-600 resize-none transition-all" />
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
                        
                        {userRole !== 'SUPERUSER' && (
                            <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 text-amber-300 backdrop-blur-md">
                                <AlertTriangle size={20} className="shrink-0 animate-pulse" />
                                <div className="text-xs font-semibold leading-relaxed">
                                    <span className="font-bold text-white block mb-0.5">Platform Settings Locked 🔒</span>
                                    Only the Platform Owner (Superuser) can modify support contacts or safety parameters. Regular admins have read-only access.
                                </div>
                            </div>
                        )}

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
                                        <input type="text" required readOnly={userRole !== 'SUPERUSER'} value={supportPhone} onChange={e => setSupportPhone(e.target.value)} className={`w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 outline-none text-white transition-all font-mono ${userRole !== 'SUPERUSER' ? 'opacity-60 cursor-not-allowed' : ''}`} placeholder="e.g. +255 700 000 000" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Support Email (mailto:)</label>
                                        <input type="email" required readOnly={userRole !== 'SUPERUSER'} value={supportEmail} onChange={e => setSupportEmail(e.target.value)} className={`w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 outline-none text-white transition-all font-mono ${userRole !== 'SUPERUSER' ? 'opacity-60 cursor-not-allowed' : ''}`} placeholder="e.g. support@chapuu.co.tz" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Support SMS (sms:)</label>
                                        <input type="text" required readOnly={userRole !== 'SUPERUSER'} value={supportSms} onChange={e => setSupportSms(e.target.value)} className={`w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 outline-none text-white transition-all font-mono ${userRole !== 'SUPERUSER' ? 'opacity-60 cursor-not-allowed' : ''}`} placeholder="e.g. +255 700 000 000" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">WhatsApp Contact Number</label>
                                        <input type="text" required readOnly={userRole !== 'SUPERUSER'} value={supportWhatsapp} onChange={e => setSupportWhatsapp(e.target.value)} className={`w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 outline-none text-white transition-all font-mono ${userRole !== 'SUPERUSER' ? 'opacity-60 cursor-not-allowed' : ''}`} placeholder="e.g. 255700000000" />
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
                                        <input type="text" required readOnly={userRole !== 'SUPERUSER'} value={sellerSupportPhone} onChange={e => setSellerSupportPhone(e.target.value)} className={`w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 outline-none text-white transition-all font-mono ${userRole !== 'SUPERUSER' ? 'opacity-60 cursor-not-allowed' : ''}`} placeholder="e.g. +255 700 000 111" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Seller Support Email</label>
                                        <input type="email" required readOnly={userRole !== 'SUPERUSER'} value={sellerSupportEmail} onChange={e => setSellerSupportEmail(e.target.value)} className={`w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 outline-none text-white transition-all font-mono ${userRole !== 'SUPERUSER' ? 'opacity-60 cursor-not-allowed' : ''}`} placeholder="e.g. vendor-support@chapuu.co.tz" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Seller Support SMS</label>
                                        <input type="text" required readOnly={userRole !== 'SUPERUSER'} value={sellerSupportSms} onChange={e => setSellerSupportSms(e.target.value)} className={`w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 outline-none text-white transition-all font-mono ${userRole !== 'SUPERUSER' ? 'opacity-60 cursor-not-allowed' : ''}`} placeholder="e.g. +255 700 000 111" />
                                    </div>
                                </div>
                            </div>

                            <hr className="border-white/5 my-6" />

                            {/* Warnings Configuration */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono">Compliance & Policies</h3>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Platform Safety Warning Text</label>
                                    <textarea required readOnly={userRole !== 'SUPERUSER'} rows="3" value={policyWarning} onChange={e => setPolicyWarning(e.target.value)} className={`w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 outline-none text-white resize-none transition-all leading-relaxed font-medium ${userRole !== 'SUPERUSER' ? 'opacity-60 cursor-not-allowed' : ''}`} placeholder="Warning shown to store owners on pin locks or policy infractions" />
                                </div>
                            </div>

                            {userRole === 'SUPERUSER' && (
                                <button type="submit" className="w-full bg-primary-500 hover:bg-primary-400 text-dark-950 font-black py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-primary-500/20 active:scale-95 cursor-pointer uppercase tracking-wider">
                                    Save Configuration
                                </button>
                            )}
                        </form>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: COMMISSIONS & BILLING CENTER (NEW) */}
            {activeTab === 'COMMISSIONS' && (
                <div className="space-y-8 animate-fadeIn text-left">
                    {/* Glassmorphic KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-dark-900/60 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between group hover:border-primary-500/40 transition-colors shadow-xl">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl group-hover:bg-primary-500/20 transition-all pointer-events-none"></div>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Gross Platform Volume</span>
                                <TrendingUp className="text-primary-400" size={18} />
                            </div>
                            <div>
                                <span className="text-2xl md:text-3xl font-bold text-white font-mono tracking-tight">
                                    {formatPrice(platformAnalytics?.kpi?.gpv ?? 0)}
                                </span>
                                <p className="text-xs text-slate-400 mt-1 font-medium">All Completed Gross Sales</p>
                            </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="p-6 bg-dark-900/60 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between group hover:border-primary-500/40 transition-colors shadow-xl">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl group-hover:bg-primary-500/20 transition-all pointer-events-none"></div>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Commissions Accrued (3%)</span>
                                <Coins className="text-primary-400" size={18} />
                            </div>
                            <div>
                                <span className="text-2xl md:text-3xl font-bold text-primary-400 font-mono tracking-tight">
                                    {formatPrice(platformAnalytics?.kpi?.platform_commission ?? 0)}
                                </span>
                                <p className="text-xs text-slate-400 mt-1 font-medium font-mono">Platform Earned Revenue</p>
                            </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-6 bg-dark-900/60 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between group hover:border-red-500/40 transition-colors shadow-xl">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all pointer-events-none"></div>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Total Outstanding Owed</span>
                                <DollarSign className="text-red-400" size={18} />
                            </div>
                            <div>
                                <span className="text-2xl md:text-3xl font-bold text-white font-mono tracking-tight text-red-400">
                                    {formatPrice(billingData.reduce((acc, curr) => acc + curr.amount_owed, 0))}
                                </span>
                                <p className="text-xs text-slate-400 mt-1 font-medium">Unpaid Store Balances (Current Page)</p>
                            </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="p-6 bg-dark-900/60 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between group hover:border-green-500/40 transition-colors shadow-xl">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl group-hover:bg-green-500/20 transition-all pointer-events-none"></div>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Paid Commission Payouts</span>
                                <Check className="text-green-400" size={18} />
                            </div>
                            <div>
                                <span className="text-2xl md:text-3xl font-bold text-white font-mono tracking-tight text-green-400">
                                    {formatPrice(billingData.reduce((acc, curr) => acc + curr.total_paid, 0))}
                                </span>
                                <p className="text-xs text-slate-400 mt-1 font-medium">Settled Revenues (Current Page)</p>
                            </div>
                        </motion.div>
                    </div>

                    {/* Rankings Columns Grid */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Award className="text-primary-400" size={20} />
                            <h3 className="text-base font-bold text-slate-200 uppercase tracking-wider font-mono">Platform Leaderboards & Performance Metrics</h3>
                        </div>

                        {rankingsData ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Top Sales GPV */}
                                <div className="glass-dark border border-white/5 rounded-3xl p-5 shadow-xl flex flex-col hover:border-yellow-500/30 transition-all">
                                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                                        <h4 className="text-xs font-bold text-yellow-400 uppercase tracking-tight flex items-center gap-1.5"><Award size={14} /> Revenue Leaders</h4>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Top GPV</span>
                                    </div>
                                    <div className="space-y-2 flex-1">
                                        {rankingsData.most_sales.map((item, idx) => (
                                            <motion.div key={item.store_id} hover={{ y: -2, scale: 1.01 }} className="flex items-center justify-between p-2 bg-dark-950/60 rounded-xl border border-white/5">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-[10px] font-black w-4 text-yellow-500">#{idx+1}</span>
                                                    <span className="text-xs font-bold text-slate-300 truncate">{item.store_name}</span>
                                                </div>
                                                <span className="text-xs font-bold font-mono text-white shrink-0">{formatPrice(item.value)}</span>
                                            </motion.div>
                                        ))}
                                        {rankingsData.most_sales.length === 0 && (
                                            <div className="py-8 text-center text-xs text-slate-600">No stores ranked yet.</div>
                                        )}
                                    </div>
                                </div>

                                {/* Loved by Users */}
                                <div className="glass-dark border border-white/5 rounded-3xl p-5 shadow-xl flex flex-col hover:border-orange-500/30 transition-all">
                                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                                        <h4 className="text-xs font-bold text-orange-400 uppercase tracking-tight flex items-center gap-1.5"><Star size={14} /> Customer Favorites</h4>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Loved</span>
                                    </div>
                                    <div className="space-y-2 flex-1">
                                        {rankingsData.loved.map((item, idx) => (
                                            <motion.div key={item.store_id} hover={{ y: -2, scale: 1.01 }} className="flex items-center justify-between p-2 bg-dark-950/60 rounded-xl border border-white/5">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-[10px] font-black w-4 text-orange-500">#{idx+1}</span>
                                                    <span className="text-xs font-bold text-slate-300 truncate">{item.store_name}</span>
                                                </div>
                                                <span className="text-xs font-bold text-yellow-400 shrink-0 font-mono flex items-center gap-0.5">
                                                    {item.rating.toFixed(1)} ★
                                                    <span className="text-[9px] text-slate-500 font-normal">({item.rating_count})</span>
                                                </span>
                                            </motion.div>
                                        ))}
                                        {rankingsData.loved.length === 0 && (
                                            <div className="py-8 text-center text-xs text-slate-600">No user ratings yet.</div>
                                        )}
                                    </div>
                                </div>

                                {/* Lazy Stores */}
                                <div className="glass-dark border border-white/5 rounded-3xl p-5 shadow-xl flex flex-col hover:border-red-500/30 transition-all">
                                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                                        <h4 className="text-xs font-bold text-red-400 uppercase tracking-tight flex items-center gap-1.5"><AlertTriangle size={14} /> Low Activity Tenants</h4>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Inactive</span>
                                    </div>
                                    <div className="space-y-2 flex-1">
                                        {rankingsData.lazy.map((item, idx) => (
                                            <motion.div key={item.store_id} hover={{ y: -2, scale: 1.01 }} className="flex items-center justify-between p-2 bg-dark-950/60 rounded-xl border border-white/5">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-[10px] font-black w-4 text-red-400">#{idx+1}</span>
                                                    <div className="truncate">
                                                        <p className="text-xs font-bold text-slate-300 truncate">{item.store_name}</p>
                                                        <p className="text-[9px] text-slate-500">Since {item.created_at}</p>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-black font-mono text-slate-400 shrink-0 bg-dark-900 px-1.5 py-0.5 rounded border border-white/5">
                                                    {item.value} {item.value === 1 ? 'order' : 'orders'}
                                                </span>
                                            </motion.div>
                                        ))}
                                        {rankingsData.lazy.length === 0 && (
                                            <div className="py-8 text-center text-xs text-slate-600">No sluggish tenants.</div>
                                        )}
                                    </div>
                                </div>

                                {/* Transaction Volume */}
                                <div className="glass-dark border border-white/5 rounded-3xl p-5 shadow-xl flex flex-col hover:border-cyan-500/30 transition-all">
                                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                                        <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-tight flex items-center gap-1.5"><Zap size={14} /> Highest Velocity</h4>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Orders</span>
                                    </div>
                                    <div className="space-y-2 flex-1">
                                        {rankingsData.most_orders.map((item, idx) => (
                                            <motion.div key={item.store_id} hover={{ y: -2, scale: 1.01 }} className="flex items-center justify-between p-2 bg-dark-950/60 rounded-xl border border-white/5">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-[10px] font-black w-4 text-cyan-500">#{idx+1}</span>
                                                    <span className="text-xs font-bold text-slate-300 truncate">{item.store_name}</span>
                                                </div>
                                                <span className="text-xs font-bold font-mono text-white shrink-0 bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20">
                                                    {item.value} orders
                                                </span>
                                            </motion.div>
                                        ))}
                                        {rankingsData.most_orders.length === 0 && (
                                            <div className="py-8 text-center text-xs text-slate-600">No transactions recorded.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-12 glass-dark border border-white/5 rounded-3xl text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-3">
                                <RefreshCw className="animate-spin text-primary-500" size={24} />
                                Analyzing stores metrics & platform leaderboards...
                            </div>
                        )}
                    </div>

                    {/* Pending review payout alerts queue */}
                    {pendingPayments.length > 0 && (
                        <div className="glass-dark border border-yellow-500/35 bg-yellow-500/5 p-6 rounded-3xl shadow-xl space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="text-yellow-400 animate-pulse" size={20} />
                                    <div>
                                        <h3 className="text-base font-bold text-white uppercase tracking-tight leading-tight">Pending Commission Reviews</h3>
                                        <p className="text-[10px] text-yellow-400 font-bold tracking-wider uppercase font-mono">Invoice Payout slips awaiting platform validation</p>
                                    </div>
                                </div>
                                <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shrink-0">
                                    {pendingPayments.length} pending
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {pendingPayments.map(p => (
                                    <div key={p.id} className="p-4 bg-dark-950/80 border border-white/10 rounded-2xl flex flex-col justify-between gap-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-sm text-slate-200 line-clamp-1">{p.store_name}</h4>
                                                <span className="text-[10px] font-mono font-black text-slate-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded">
                                                    Period: {p.invoice_year}/{p.invoice_month < 10 ? '0' + p.invoice_month : p.invoice_month}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                                                <div>Submitter: <span className="font-bold text-slate-200 font-mono">@{p.submitted_by_username}</span></div>
                                                <div>Slip ID: <span className="font-bold text-slate-200 font-mono truncate">{p.transaction_id}</span></div>
                                            </div>
                                            
                                            {/* Slip receipt screenshot preview thumbnail */}
                                            {p.receipt_screenshot && (
                                                <div 
                                                    onClick={() => setPreviewReceiptUrl(p.receipt_screenshot)}
                                                    className="mt-3 relative h-28 w-full border border-white/10 rounded-xl overflow-hidden cursor-pointer group flex items-center justify-center bg-dark-900 hover:border-primary-500/40 transition-colors"
                                                    title="Click to audit payment receipt slip"
                                                >
                                                    <img src={p.receipt_screenshot} alt="Receipt Slip" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                    <div className="absolute inset-0 bg-dark-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-xs gap-1.5">
                                                        <Search size={14} className="text-white" />
                                                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">Audit Slip</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2 pt-2 border-t border-white/5">
                                            <button 
                                                onClick={() => {
                                                    setReviewingPayment(p);
                                                    setRejectionReason('');
                                                }}
                                                className="w-1/2 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 border border-red-500/20 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                            >
                                                <X size={12} /> Reject slip
                                            </button>
                                            <button 
                                                onClick={() => handleReviewPayment(p.id, true)}
                                                className="w-1/2 bg-green-500 hover:bg-green-400 text-dark-950 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-green-500/10 cursor-pointer flex items-center justify-center gap-1.5"
                                            >
                                                <Check size={12} /> Approve slip
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Master paginated store commissions table */}
                    <div className="glass-dark border border-white/5 rounded-3xl p-4 md:p-6 shadow-xl space-y-6">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-200">Systemwide Store Commissions Registry</h3>
                                <p className="text-xs text-slate-400 mt-1">Audit outstanding commissions and invoices per active tenant</p>
                            </div>

                            {/* Search bar */}
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-3.5 top-3.5 text-slate-500" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Search store name or vendor handle..." 
                                    value={billingSearch} 
                                    onChange={e => {
                                        setBillingSearch(e.target.value);
                                        setBillingPage(1); // reset to first page on search
                                    }} 
                                    className="w-full bg-dark-950 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-600 focus:border-primary-500 outline-none transition-all shadow-inner"
                                />
                            </div>
                        </div>

                        {loadingBilling ? (
                            <div className="py-16 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2.5">
                                <RefreshCw className="animate-spin text-primary-500" size={24} />
                                Synchronizing platform invoices ledger records...
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="overflow-x-auto -mx-4 md:mx-0">
                                    <div className="inline-block min-w-full align-middle px-4 md:px-0">
                                        <table className="min-w-full text-left text-xs md:text-sm text-slate-300">
                                            <thead className="bg-dark-900/40 text-slate-400 border-b border-white/5 font-bold">
                                                <tr className="text-[10px] uppercase tracking-wider">
                                                    <th className="p-4">Store Name</th>
                                                    <th className="p-4">Vendor Profile</th>
                                                    <th className="p-4">Total GPV Sales</th>
                                                    <th className="p-4 text-primary-400">Accrued Commission</th>
                                                    <th className="p-4 text-green-400">Total Settled</th>
                                                    <th className="p-4 text-red-400">Outstanding Owed</th>
                                                    <th className="p-4 text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {billingData.map(s => {
                                                    const hasOutstanding = s.amount_owed > 0;
                                                    const isPending = s.pending_payout > 0;
                                                    return (
                                                        <tr key={s.store_id} className="hover:bg-white/5 transition-colors border-white/5">
                                                            <td className="p-4 font-semibold text-slate-200 whitespace-nowrap">
                                                                <div className="flex items-center gap-2">
                                                                    <Store size={14} className="text-slate-400" />
                                                                    <span>{s.store_name}</span>
                                                                    <span className="text-[8px] font-black uppercase bg-white/5 border border-white/5 px-1.5 py-0.5 rounded text-slate-500">
                                                                        {s.store_type}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="p-4 whitespace-nowrap font-mono text-slate-400">
                                                                @{s.owner_username}
                                                            </td>
                                                            <td className="p-4 font-mono font-bold text-slate-300">
                                                                {formatPrice(s.total_sales)}
                                                            </td>
                                                            <td className="p-4 font-mono font-semibold text-primary-400">
                                                                {formatPrice(s.total_commission)}
                                                            </td>
                                                            <td className="p-4 font-mono font-semibold text-green-400">
                                                                {formatPrice(s.total_paid)}
                                                            </td>
                                                            <td className="p-4 font-mono font-bold">
                                                                {hasOutstanding ? (
                                                                    <span className="text-red-400 font-black">{formatPrice(s.amount_owed)}</span>
                                                                ) : (
                                                                    <span className="text-slate-500 font-semibold">{formatPrice(0)}</span>
                                                                )}
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="flex justify-center">
                                                                    {isPending ? (
                                                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/20 flex items-center gap-1 shrink-0">
                                                                            <RefreshCw size={10} className="animate-spin-slow" /> {s.pending_invoice_count} Review
                                                                        </span>
                                                                    ) : hasOutstanding ? (
                                                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/20 flex items-center gap-1 shrink-0">
                                                                            <AlertTriangle size={10} /> {s.unpaid_invoice_count} Overdue
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-500/15 text-green-400 border border-green-500/20 flex items-center gap-1 shrink-0">
                                                                            <Check size={10} /> Paid & Clear
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {billingData.length === 0 && (
                                                    <tr>
                                                        <td colSpan="7" className="py-12 text-center text-xs text-slate-500">
                                                            No store commission records matched search parameters.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Pagination controls */}
                                {billingPagination.count > 10 && (
                                    <div className="flex justify-between items-center pt-4 border-t border-white/5 text-xs text-slate-400">
                                        <div>
                                            Showing page <span className="font-bold text-white">{billingPage}</span> of <span className="font-bold text-white">{Math.ceil(billingPagination.count / 10)}</span> ({billingPagination.count} total records)
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setBillingPage(prev => Math.max(prev - 1, 1))}
                                                disabled={!billingPagination.previous}
                                                className={`px-3 py-1.5 bg-dark-900 border border-white/5 rounded-xl font-bold uppercase text-[10px] tracking-wide transition-all ${
                                                    billingPagination.previous ? 'hover:bg-white/5 hover:text-white cursor-pointer' : 'opacity-40 cursor-not-allowed'
                                                }`}
                                            >
                                                Previous
                                            </button>
                                            <button 
                                                onClick={() => setBillingPage(prev => prev + 1)}
                                                disabled={!billingPagination.next}
                                                className={`px-3 py-1.5 bg-dark-900 border border-white/5 rounded-xl font-bold uppercase text-[10px] tracking-wide transition-all ${
                                                    billingPagination.next ? 'hover:bg-white/5 hover:text-white cursor-pointer' : 'opacity-40 cursor-not-allowed'
                                                }`}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL: PAYMENT REJECTION REASON PROMPT OVERLAY */}
            <AnimatePresence>
                {reviewingPayment && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setReviewingPayment(null)} className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative glass-dark border border-red-500/25 rounded-3xl p-6 w-full max-w-md shadow-2xl z-10 text-white text-left">
                            <button onClick={() => setReviewingPayment(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-lg transition-all cursor-pointer">
                                <X size={16} />
                            </button>
                            <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-red-400"><AlertTriangle size={18} /> Reject Payout Verification</h3>
                            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                                Please specify the precise reason for rejecting the payout confirmation from <span className="font-bold text-white">{reviewingPayment.store_name}</span>. This message will be displayed directly to the store operator.
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Rejection Reason</label>
                                    <textarea 
                                        required 
                                        rows="3" 
                                        placeholder="e.g. Unreadable receipt screenshot image, invalid transaction confirmation ID, or mismatching payout amount."
                                        value={rejectionReason} 
                                        onChange={e => setRejectionReason(e.target.value)} 
                                        className="w-full bg-dark-950 border border-white/10 rounded-xl px-3 py-2 text-xs focus:border-red-500 outline-none text-white resize-none transition-all placeholder-slate-600 leading-relaxed font-semibold"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                                    <button 
                                        type="button" 
                                        onClick={() => setReviewingPayment(null)} 
                                        className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleReviewPayment(reviewingPayment.id, false)}
                                        disabled={submittingReview || !rejectionReason.trim()}
                                        className="px-6 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-950/20 disabled:text-red-500/50 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/10 cursor-pointer transition-all flex items-center gap-1.5"
                                    >
                                        {submittingReview ? <RefreshCw className="animate-spin" size={12} /> : <Ban size={12} />} Reject Confirmation
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL: IMAGE SCREENSHOT SLIP PREVIEW OVERLAY */}
            <AnimatePresence>
                {previewReceiptUrl && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPreviewReceiptUrl(null)} className="absolute inset-0 bg-dark-950/90 backdrop-blur-md" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-dark-900 border border-white/10 rounded-3xl p-3 max-w-2xl w-full max-h-[85vh] shadow-2xl z-10 text-white overflow-hidden flex flex-col justify-between">
                            <button onClick={() => setPreviewReceiptUrl(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-dark-950/80 hover:bg-dark-800 p-2 rounded-xl transition-all cursor-pointer z-20 shadow-md border border-white/10">
                                <X size={16} />
                            </button>
                            <div className="w-full flex-1 overflow-y-auto rounded-2xl flex items-center justify-center bg-dark-950 border border-white/5 p-1 min-h-[300px]">
                                <img src={previewReceiptUrl} alt="Platform Audit Slip Screenshot" className="max-w-full max-h-[70vh] object-contain rounded-xl" />
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold px-2 pt-3">
                                <span>Platform Financial Audit System</span>
                                <span>Click anywhere outside or X to close</span>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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

            {/* Local Dashboard Tab Swapping Grid Drawer */}
            <AnimatePresence>
                {showGridModal && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowGridModal(false)}
                            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
                        />
                        {/* Drawer */}
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 z-[101] max-h-[80vh] bg-dark-950/98 backdrop-blur-xl border-t border-white/10 rounded-t-[2.5rem] px-6 pt-4 pb-8 overflow-y-auto"
                        >
                            {/* Handle */}
                            <div className="flex justify-center mb-6">
                                <div className="w-12 h-1 bg-white/20 rounded-full" />
                            </div>

                            {/* Header */}
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-black text-white uppercase tracking-wider">Admin Control Panel</h3>
                                    <p className="text-xs text-slate-400">Select an administrative console panel</p>
                                </div>
                                <button 
                                    onClick={() => setShowGridModal(false)} 
                                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Grid Layout */}
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => { setActiveTab('ANALYTICS'); setShowGridModal(false); }}
                                    className={`flex flex-col items-center justify-center p-5 rounded-2xl border transition-all text-center ${activeTab === 'ANALYTICS' ? 'bg-primary-500/10 border-primary-500/30 text-primary-400' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                >
                                    <BarChart3 size={24} className="mb-2" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Analytics</span>
                                </button>

                                <button
                                    onClick={() => { setActiveTab('MANAGEMENT'); setShowGridModal(false); }}
                                    className={`flex flex-col items-center justify-center p-5 rounded-2xl border transition-all text-center ${activeTab === 'MANAGEMENT' ? 'bg-primary-500/10 border-primary-500/30 text-primary-400' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                >
                                    <Store size={24} className="mb-2" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Stores Hub</span>
                                </button>

                                <button
                                    onClick={() => { setActiveTab('PAYMENTS'); setShowGridModal(false); }}
                                    className={`flex flex-col items-center justify-center p-5 rounded-2xl border transition-all text-center relative ${activeTab === 'PAYMENTS' ? 'bg-primary-500/10 border-primary-500/30 text-primary-400' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                >
                                    <DollarSign size={24} className="mb-2" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Payments</span>
                                    {pendingPayments?.length > 0 && (
                                        <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full border-2 border-dark-950 font-black animate-pulse">
                                            {pendingPayments.length}
                                        </span>
                                    )}
                                </button>

                                <button
                                    onClick={() => { setActiveTab('COMMISSIONS'); setShowGridModal(false); }}
                                    className={`flex flex-col items-center justify-center p-5 rounded-2xl border transition-all text-center ${activeTab === 'COMMISSIONS' ? 'bg-primary-500/10 border-primary-500/30 text-primary-400' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                >
                                    <Coins size={24} className="mb-2" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Commissions</span>
                                </button>

                                <button
                                    onClick={() => { setActiveTab('USERS'); setShowGridModal(false); }}
                                    className={`flex flex-col items-center justify-center p-5 rounded-2xl border transition-all text-center ${activeTab === 'USERS' ? 'bg-primary-500/10 border-primary-500/30 text-primary-400' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                >
                                    <Users size={24} className="mb-2" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Roles</span>
                                </button>

                                <button
                                    onClick={() => { setActiveTab('NOTICES'); setShowGridModal(false); }}
                                    className={`flex flex-col items-center justify-center p-5 rounded-2xl border transition-all text-center ${activeTab === 'NOTICES' ? 'bg-primary-500/10 border-primary-500/30 text-primary-400' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                >
                                    <Bell size={24} className="mb-2" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Notices</span>
                                </button>

                                <button
                                    onClick={() => { setActiveTab('SUPPORT_SETTINGS'); setShowGridModal(false); }}
                                    className={`flex flex-col items-center justify-center p-5 rounded-2xl border transition-all text-center relative ${activeTab === 'SUPPORT_SETTINGS' ? 'bg-primary-500/10 border-primary-500/30 text-primary-400' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                >
                                    <Shield size={24} className="mb-2" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Support & Safety</span>
                                    {platformAnalytics?.safety_disputes?.locked_orders_count > 0 && (
                                        <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full border-2 border-dark-950 font-black animate-bounce">
                                            {platformAnalytics.safety_disputes.locked_orders_count}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}