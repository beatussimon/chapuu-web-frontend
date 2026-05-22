import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient, { getWebSocketURL } from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ChefHat, CheckCircle2, Clock, ListOrdered, Utensils, CreditCard, Play, 
    SquareTerminal, Star, MessageSquare, Truck, Bell, QrCode, Calendar, 
    Store, Plus, Edit2, Trash2, X, ShoppingBag, ShoppingCart, Users, 
    UserPlus, Key, Power, Search, BarChart3, Settings, Save, Phone, Mail, 
    TerminalSquare, Shield, RefreshCw, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '../store/useStore';
import { useCurrency, formatPriceStatic } from '../utils/useCurrency';
import { QRCodeSVG } from 'qrcode.react';
import OptimizedImage from '../components/OptimizedImage';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

const softChime = new Audio('/media/sounds/soft_chime.mp3');
softChime.preload = 'auto';

const playCachedChime = () => {
    try {
        softChime.currentTime = 0; // Reset playhead
        softChime.play().catch(err => {
            console.log("Audio playback deferred until user interaction", err);
        });
    } catch (e) {
        console.error("Audio trigger failed", e);
    }
};

export default function SellerDashboard() {
    const [orders, setOrders] = useState([]);
    const [queueSize, setQueueSize] = useState(0);
    const [loading, setLoading] = useState(true);
    const [storeType, setStoreType] = useState('RESTAURANT'); // 'RESTAURANT' or 'SHOP'
    const { userRole, clearAuth } = useAppStore();
    const { formatPrice } = useCurrency();

    // Determine default view based on role
    const defaultView = userRole === 'CHEF' ? 'KITCHEN' : 
                        userRole === 'DELIVERY' ? 'DELIVERY' : 
                        userRole === 'ACCOUNTANT' ? 'ACCOUNTING' : 'KITCHEN';

    const [activeView, setActiveView] = useState(defaultView); 
    const [reviews, setReviews] = useState([]);
    const [notices, setNotices] = useState([]);
    const [wsConnected, setWsConnected] = useState(false);
    const [selectedOrders, setSelectedOrders] = useState([]);
    
    // Billing States
    const [invoices, setInvoices] = useState([]);
    const [ledgerEntries, setLedgerEntries] = useState([]);
    const [platformPaymentMethods, setPlatformPaymentMethods] = useState([]);
    const [showPaymentModal, setShowPaymentModal] = useState({ open: false, invoice: null });
    const [paymentForm, setPaymentForm] = useState({ amount: '', transactionId: '', receiptScreenshot: null });

    // Handoff Verification PIN State
    const [handoffPinModal, setHandoffPinModal] = useState({ open: false, orderId: null, pin: '', loading: false });
    
    // Team Management State
    const [staffList, setStaffList] = useState([]);
    const [showHireModal, setShowHireModal] = useState(false);
    const [hireForm, setHireForm] = useState({ username: '', password: '', role: 'CHEF', first_name: '', last_name: '' });

    // Support Settings State
    const [supportConfig, setSupportConfig] = useState({
        policy_warning: "Violation of the system's policy (such as consecutive delivery locking or fraud) can get your store taken down permanently."
    });

    useEffect(() => {
        apiClient.get('/system-support/')
            .then(res => {
                if (res.data && res.data.policy_warning) {
                    setSupportConfig(res.data);
                }
            })
            .catch(err => console.error("Failed to fetch support config in SellerDashboard", err));
    }, []);

    // Role-Based "Tunnel Vision" Redirects
    useEffect(() => {
        if (userRole === 'CHEF' && activeView !== 'KITCHEN') setActiveView('KITCHEN');
        if (userRole === 'ACCOUNTANT' && activeView !== 'ACCOUNTING') setActiveView('ACCOUNTING');
        if (userRole === 'DELIVERY' && activeView !== 'DELIVERY') setActiveView('DELIVERY');
    }, [userRole, activeView]);

    const fetchStaff = () => {
        if (userRole === 'SELLER' || userRole === 'ADMIN') {
            apiClient.get('/staff/')
                .then(res => setStaffList(Array.isArray(res.data) ? res.data : []))
                .catch(e => console.error("Staff fetch failed"));
        }
    };

    const handleHire = (e) => {
        e.preventDefault();
        const toastId = toast.loading("Adding team member...");
        apiClient.post('/staff/', hireForm)
            .then(() => {
                toast.success("Staff added successfully!", { id: toastId });
                setShowHireModal(false);
                setHireForm({ username: '', password: '', role: 'CHEF', first_name: '', last_name: '' });
                fetchStaff();
            })
            .catch(err => {
                toast.error("Hiring failed: " + (err.response?.data?.username || "Invalid data"), { id: toastId });
            });
    };

    const handleDeactivateStaff = (id) => {
        if (!confirm("Are you sure? This will instantly terminate all active sessions for this worker.")) return;
        const toastId = toast.loading("Deactivating...");
        apiClient.post(`/staff/${id}/deactivate/`)
            .then(() => {
                toast.success("Worker deactivated.", { id: toastId });
                fetchStaff();
            })
            .catch(() => toast.error("Action failed.", { id: toastId }));
    };

    const handleResetStaffPassword = (id) => {
        const newPass = prompt("Enter new temporary password:");
        if (!newPass) return;
        const toastId = toast.loading("Resetting password...");
        apiClient.post(`/staff/${id}/reset_password/`, { password: newPass })
            .then(() => toast.success("Password reset!", { id: toastId }))
            .catch(() => toast.error("Reset failed.", { id: toastId }));
    };

    // Notification Badge Calculations
    const kitchenCount = orders.filter(o => ['QUEUED', 'PAID', 'PREPARING'].includes(o.state)).length;
    const accountingCount = orders.filter(o => o.state === 'AWAITING_PAYMENT').length;
    const deliveryCount = orders.filter(o => ['READY', 'OUT_FOR_DELIVERY'].includes(o.state)).length;
    const unreadNoticesCount = notices.filter(n => !n.is_read).length;

    const handleMarkAsRead = (noticeId) => {
        apiClient.post(`/notices/${noticeId}/mark_as_read/`)
            .then(() => {
                setNotices(prev => prev.map(n => n.id === noticeId ? { ...n, is_read: true } : n));
            })
            .catch(e => console.error("Failed to mark notice as read", e));
    };

    const toggleOrderSelection = (orderId) => {
        setSelectedOrders(prev => 
            prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
        );
    };

    const handleBulkAdvance = (newState) => {
        if (selectedOrders.length === 0) return;
        const toastId = toast.loading(`Updating ${selectedOrders.length} orders...`);
        
        apiClient.post('/orders/bulk_advance_state/', {
            order_ids: selectedOrders,
            state: newState
        })
        .then(res => {
            toast.success('Bulk update complete!', { id: toastId });
            setSelectedOrders([]);
            fetchDashboard();
        })
        .catch(err => {
            toast.error('Bulk update failed: ' + (err.response?.data?.error || err.message), { id: toastId });
        });
    };

    // Profile State
    const [storeDetails, setStoreDetails] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // Modals
    const [showPOSModal, setShowPOSModal] = useState(false);
    const [posProducts, setPosProducts] = useState([]);
    const [posCart, setPosCart] = useState([]);
    const [posCustomerName, setPosCustomerName] = useState('');
    const [posSkipKitchen, setPosSkipKitchen] = useState(false);

    const [verifyModal, setVerifyModal] = useState({ open: false, order: null, fee: '' });
    const [editingPaymentMethod, setEditingPaymentMethod] = useState(null);

    const addToPosCart = (product) => {
        setPosCart(prev => {
            const existing = prev.find(i => i.id === product.id);
            if (existing) {
                return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const updatePosQty = (productId, delta) => {
        setPosCart(prev => prev.map(i => {
            if (i.id === productId) {
                const newQty = Math.max(1, i.quantity + delta);
                return { ...i, quantity: newQty };
            }
            return i;
        }));
    };

    const removeFromPosCart = (productId) => {
        setPosCart(prev => prev.filter(i => i.id !== productId));
    };

    const handlePOSCheckout = () => {
        if (posCart.length === 0) {
            toast.error("POS cart is empty!");
            return;
        }
        
        const toastId = toast.loading('Processing walk-in order...');
        const payload = {
            store: storeDetails.id,
            fulfillment_mode: 'TAKEAWAY',
            is_instant_payment: true,
            payment_message: `POS Order: ${posCustomerName || 'Walk-in Customer'}`,
            items: posCart.map(i => ({ product: i.id, quantity: i.quantity, unit_price: i.price }))
        };

        apiClient.post('/orders/', payload)
            .then(res => {
                const orderId = res.data.id;
                const currentState = res.data.state;
                
                // Only advance if not already READY/COMPLETED and staff requested skip kitchen
                if (posSkipKitchen && currentState !== 'READY' && currentState !== 'COMPLETED') {
                    return apiClient.post(`/orders/${orderId}/advance_state/`, { state: 'PREPARING' })
                        .then(() => apiClient.post(`/orders/${orderId}/advance_state/`, { state: 'READY' }));
                }
                return res;
            })
            .then(() => {
                toast.success('POS Order created successfully!', { id: toastId });
                setShowPOSModal(false);
                setPosCart([]);
                setPosCustomerName('');
                setPosSkipKitchen(false);
                fetchDashboard();
            })
            .catch(err => {
                console.error(err);
                toast.error("POS Failed: " + (err.response?.data?.detail || "Check console"), { id: toastId });
            });
    };

    // Use refs for stable access to state within async callbacks and intervals
    const isFetchingRef = useRef(false);
    const storeIdRef = useRef(storeDetails?.id);
    
    useEffect(() => {
        storeIdRef.current = storeDetails?.id;
    }, [storeDetails?.id]);

    const fetchDashboard = useCallback(async (force = false) => {
        if (isFetchingRef.current && !force) return;
        isFetchingRef.current = true;
        
        try {
            // DYNAMIC DATA: Fetch every sync cycle
            const ordersRes = await apiClient.get('/orders/');
            setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);

            const noticesRes = await apiClient.get('/notices/');
            setNotices(Array.isArray(noticesRes.data) ? noticesRes.data : []);

            // Role-scoped dynamic data
            if (storeIdRef.current) {
                if (['SELLER', 'ADMIN', 'CHEF'].includes(userRole)) {
                    apiClient.get(`/stores/${storeIdRef.current}/kitchen_queue/`)
                        .then(r => setQueueSize(r.data.queue_size))
                        .catch(() => {});
                }
            }

        } catch (error) {
            console.error("Dashboard dynamic sync failed", error);
        } finally {
            setLoading(false);
            isFetchingRef.current = false;
        }
    }, [userRole]);

    const advanceOrderState = useCallback((orderId, newState, payload = {}) => {
        const toastId = toast.loading(`Updating order to ${newState}...`);
        apiClient.post(`/orders/${orderId}/advance_state/`, { state: newState, ...payload })
            .then(() => {
                toast.success(`Order #${orderId} is now ${newState}`, { id: toastId });
                fetchDashboard(true);
                if (newState === 'PAID') setVerifyModal({ open: false, order: null, fee: '' });
            })
            .catch(err => {
                toast.error(`Update failed: ${err.response?.data?.error || err.message}`, { id: toastId });
            });
    }, [fetchDashboard]);

    const markItemReady = useCallback((orderId, itemId) => {
        const toastId = toast.loading("Marking item as ready...");
        apiClient.post(`/orders/${orderId}/items/${itemId}/ready/`)
            .then(() => {
                toast.success("Item ready!", { id: toastId });
                fetchDashboard(true);
            })
            .catch(err => {
                toast.error("Failed to update item: " + (err.response?.data?.error || err.message), { id: toastId });
            });
    }, [fetchDashboard]);

    const handleConfirmHandoffPin = () => {
        if (handoffPinModal.pin.length !== 6) {
            toast.error("Please enter a 6-digit PIN.");
            return;
        }
        setHandoffPinModal(prev => ({ ...prev, loading: true }));
        apiClient.post(`/orders/${handoffPinModal.orderId}/confirm_delivery/`, { code: handoffPinModal.pin })
            .then(() => {
                toast.success("Order handoff completed successfully!");
                setHandoffPinModal({ open: false, orderId: null, pin: '', loading: false });
                fetchDashboard(true);
            })
            .catch(err => {
                console.error("Handoff pin verification failed", err);
                const msg = err.response?.data?.error || "Failed to verify handoff code.";
                toast.error(msg);
                setHandoffPinModal(prev => ({ ...prev, loading: false }));
            });
    };

    const handleStaffManualVerify = (orderId) => {
        const toastId = toast.loading("Performing manual handoff override...");
        setHandoffPinModal(prev => ({ ...prev, loading: true }));
        apiClient.post(`/orders/${orderId}/staff_manual_verify/`)
            .then(() => {
                toast.success("Manual override completed! 3% commission collected.", { id: toastId });
                setHandoffPinModal({ open: false, orderId: null, pin: '', loading: false });
                fetchDashboard(true);
            })
            .catch(err => {
                console.error("Manual override failed", err);
                const msg = err.response?.data?.error || "Failed to perform manual override.";
                toast.error(msg, { id: toastId });
                setHandoffPinModal(prev => ({ ...prev, loading: false }));
            });
    };

    const handleRespondReschedule = (orderId, approve) => {
        const toastId = toast.loading(`${approve ? 'Approving' : 'Rejecting'} reschedule request...`);
        apiClient.post(`/orders/${orderId}/respond_reschedule/`, { approve })
            .then(() => {
                toast.success(`Reschedule request ${approve ? 'approved' : 'rejected'}!`, { id: toastId });
                fetchDashboard(true);
            })
            .catch(err => {
                toast.error(`Action failed: ${err.response?.data?.error || err.message}`, { id: toastId });
            });
    };

    const fetchBillingData = useCallback(() => {
        if (userRole !== 'SELLER' && userRole !== 'ADMIN') return;
        
        apiClient.get('/billing/invoices/')
            .then(res => setInvoices(Array.isArray(res.data) ? res.data : []))
            .catch(e => console.error("Failed to fetch invoices", e));

        apiClient.get('/billing/ledger/')
            .then(res => setLedgerEntries(Array.isArray(res.data) ? res.data : []))
            .catch(e => console.error("Failed to fetch ledger", e));

        apiClient.get('/billing/payment-methods/')
            .then(res => setPlatformPaymentMethods(Array.isArray(res.data) ? res.data : []))
            .catch(e => console.error("Failed to fetch platform payment methods", e));
    }, [userRole]);

    const handleSubmitPaymentProof = (e) => {
        e.preventDefault();
        const invoiceId = showPaymentModal.invoice.id;
        if (!paymentForm.transactionId || !paymentForm.amount || !paymentForm.receiptScreenshot) {
            toast.error("Please fill in all payment details and upload a screenshot.");
            return;
        }

        const toastId = toast.loading("Submitting payment proof...");
        const formData = new FormData();
        formData.append('invoice', invoiceId);
        formData.append('amount', paymentForm.amount);
        formData.append('transaction_id', paymentForm.transactionId);
        formData.append('receipt_screenshot', paymentForm.receiptScreenshot);

        apiClient.post('/billing/payments/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        })
        .then(() => {
            toast.success("Payment proof submitted successfully! Pending admin review.", { id: toastId });
            setShowPaymentModal({ open: false, invoice: null });
            setPaymentForm({ amount: '', transactionId: '', receiptScreenshot: null });
            fetchBillingData();
        })
        .catch(err => {
            console.error("Payment proof submission failed", err);
            const msg = err.response?.data?.error || err.response?.data?.detail || "Failed to submit proof.";
            toast.error(msg, { id: toastId });
        });
    };

    useEffect(() => {
        if (activeView === 'BILLING') {
            fetchBillingData();
        }
    }, [activeView, fetchBillingData]);

    // STATIC DATA: Fetch only once on mount or when userRole changes
    useEffect(() => {
        const fetchStaticData = async () => {
            try {
                const meRes = await apiClient.get('/auth/users/me/');
                setUserProfile(meRes.data);

                const storeRes = await apiClient.get('/stores/my_store/');
                if (storeRes.data && storeRes.data.id) {
                    const store = storeRes.data;
                    setStoreDetails(store);
                    setStoreType(store.store_type || 'RESTAURANT');
                    
                    if (['SELLER', 'ADMIN'].includes(userRole)) {
                        apiClient.get(`/stores/${store.id}/reviews/`)
                            .then(r => setReviews(Array.isArray(r.data) ? r.data : []))
                            .catch(() => {});
                    }
                }

                if (['SELLER', 'ADMIN'].includes(userRole)) {
                    apiClient.get('/products/')
                        .then(res => setPosProducts(Array.isArray(res.data) ? res.data : []))
                        .catch(() => {});
                }
            } catch (e) {
                console.error("Static data fetch failed", e);
            }
        };

        fetchStaticData();
    }, [userRole]);

    // WebSocket Logic
    useEffect(() => {
        if (!userRole) return;
        
        let socket = null;
        let reconnectTimeout = null;

        const connectWS = () => {
            let wsPath = '/ws/orders/';
            // Use storeId from ref to avoid effect restart loop
            if (storeIdRef.current) {
                wsPath += `${storeIdRef.current}/`;
            }
            
            const wsUrl = getWebSocketURL(wsPath);
            socket = new WebSocket(wsUrl);

            socket.onopen = () => setWsConnected(true);
            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'order_update') {
                        playCachedChime(); // Play the cached soft chime
                        fetchDashboard(true); // Force fetch on WS trigger
                    }
                } catch (e) {}
            };

            socket.onclose = () => {
                setWsConnected(false);
                reconnectTimeout = setTimeout(connectWS, 10000); // Slower reconnect
            };
            socket.onerror = () => socket.close();
        };

        connectWS();
        return () => {
            if (socket) socket.close();
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
        };
    }, [userRole]); // DON'T depend on storeDetails.id here

    // Polling & Initial Fetch
    useEffect(() => {
        fetchDashboard();
        fetchStaff();
        const interval = setInterval(fetchDashboard, 45000); // 45s interval
        return () => clearInterval(interval);
    }, [userRole, fetchDashboard]);

    const ordersArray = Array.isArray(orders) ? orders : [];
    const isFutureScheduled = (o) => {
        return o.state === 'PAID' && o.scheduled_start_time && new Date(o.scheduled_start_time) > new Date();
    };
    const upcomingScheduledOrders = ordersArray.filter(isFutureScheduled);
    const activeOrders = ordersArray.filter(o => o.state !== 'COMPLETED' && o.state !== 'CANCELLED' && o.state !== 'CREATED' && o.state !== 'REFUNDED' && !isFutureScheduled(o));
    const awaitingPaymentOrders = activeOrders.filter(o => o.state === 'AWAITING_PAYMENT');
    const queuedOrders = activeOrders.filter(o => (o.state === 'QUEUED' || o.state === 'PAID') && o.fulfillment_mode !== 'RESERVATION');
    const reservationOrders = activeOrders.filter(o => (o.state === 'QUEUED' || o.state === 'PAID') && o.fulfillment_mode === 'RESERVATION');
    const preparingOrders = activeOrders.filter(o => o.state === 'PREPARING');
    const readyOrders = activeOrders.filter(o => o.state === 'READY');
    const outForDeliveryOrders = activeOrders.filter(o => o.state === 'OUT_FOR_DELIVERY');

    // Filter READY orders for specific views
    const readyForKitchen = readyOrders.filter(o => o.fulfillment_mode !== 'DELIVERY');
    const readyForDelivery = readyOrders.filter(o => o.fulfillment_mode === 'DELIVERY');
    const lockedOrders = [...readyForDelivery, ...outForDeliveryOrders].filter(o => o.is_locked);

    const canSeeKitchen = ['SELLER', 'ADMIN', 'CHEF'].includes(userRole);
    const canSeeAccounting = ['SELLER', 'ADMIN', 'ACCOUNTANT'].includes(userRole);
    const canSeeDelivery = ['SELLER', 'ADMIN', 'DELIVERY'].includes(userRole);
    const canSeeAdminStuff = ['SELLER', 'ADMIN'].includes(userRole);

    const storeUrl = typeof window !== 'undefined' ? `${window.location.origin}/?store=${storeDetails?.id}` : '';

    const handleSavePaymentMethod = (e) => {
        e.preventDefault();
        const toastId = toast.loading('Saving payment method...');
        const formData = new FormData(e.target);
        formData.append('store', storeDetails.id);
        
        const req = editingPaymentMethod.id 
            ? apiClient.patch(`/payment-methods/${editingPaymentMethod.id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' }})
            : apiClient.post('/payment-methods/', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
            
        req.then(() => {
            toast.success('Payment method saved!', { id: toastId });
            setEditingPaymentMethod(null);
            fetchDashboard();
        }).catch(err => toast.error('Failed to save payment method', { id: toastId }));
    };

    const handleDeletePaymentMethod = (id) => {
        if (!window.confirm('Delete this payment method?')) return;
        const toastId = toast.loading('Deleting...');
        apiClient.delete(`/payment-methods/${id}/`)
            .then(() => {
                toast.success('Deleted', { id: toastId });
                fetchDashboard();
            })
            .catch(err => toast.error('Failed to delete', { id: toastId }));
    };

    return (
        <div className="w-full min-h-screen flex flex-col pt-2 pb-8 px-2 md:px-4 overflow-y-auto">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div className="flex flex-col gap-1">
                    <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary-400 to-yellow-300 bg-clip-text text-transparent drop-shadow-sm">
                        {userRole === 'ACCOUNTANT' ? 'Accounting Center' : 
                         userRole === 'DELIVERY' ? 'Driver Dispatch' :
                         userRole === 'CHEF' ? 'Kitchen Command' : 'Command Center'}
                    </h2>
                    {userProfile && (
                        <div className="flex items-center gap-3 mt-1">
                            <p className="text-slate-400 text-xs md:text-sm font-medium">
                                {userProfile.role} | <span className="text-white font-bold">@{userProfile.username}</span>
                            </p>
                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${wsConnected ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                <span className="text-[10px] font-black uppercase tracking-tighter">{wsConnected ? 'Live' : 'Offline'}</span>
                            </div>
                        </div>
                    )}
                    {storeDetails && (
                        <div className="flex items-center gap-2 mt-1">
                            <Store size={12} className="text-primary-400" />
                            <span className="text-primary-400 text-xs font-black uppercase tracking-widest">
                                {storeDetails.name}
                            </span>
                            <span className="text-slate-600 text-[10px]">·</span>
                            <span className="text-slate-500 text-[10px] uppercase font-bold">{storeDetails.store_type}</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                    <div className="flex bg-dark-900 border border-white/10 rounded-xl p-1 overflow-x-auto lg:justify-center scrollbar-none no-scrollbar">
                        {/* Operational Tabs */}
                        {(userRole === 'SELLER' || userRole === 'ADMIN' || userRole === 'CHEF') && (
                            <button onClick={() => setActiveView('KITCHEN')} className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all relative ${activeView === 'KITCHEN' ? 'bg-primary-500 text-dark-950 shadow-lg shadow-primary-500/20' : 'text-slate-400 hover:text-white'}`}>
                                <Utensils size={14} /> Kitchen
                                {kitchenCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full border-2 border-dark-900 animate-bounce font-black">{kitchenCount}</span>}
                            </button>
                        )}
                        {(userRole === 'SELLER' || userRole === 'ADMIN' || userRole === 'ACCOUNTANT') && (
                            <button onClick={() => setActiveView('ACCOUNTING')} className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all relative ${activeView === 'ACCOUNTING' ? 'bg-primary-500 text-dark-950 shadow-lg shadow-primary-500/20' : 'text-slate-400 hover:text-white'}`}>
                                <CreditCard size={14} /> Accountant
                                {accountingCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full border-2 border-dark-900 font-black">{accountingCount}</span>}
                            </button>
                        )}
                        {(userRole === 'SELLER' || userRole === 'ADMIN' || userRole === 'DELIVERY') && (
                            <button onClick={() => setActiveView('DELIVERY')} className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all relative ${activeView === 'DELIVERY' ? 'bg-primary-500 text-dark-950 shadow-lg shadow-primary-500/20' : 'text-slate-400 hover:text-white'}`}>
                                <Truck size={14} /> Delivery
                                {deliveryCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full border-2 border-dark-900 font-black">{deliveryCount}</span>}
                            </button>
                        )}

                        {/* Management Tabs */}
                        {(userRole === 'SELLER' || userRole === 'ADMIN') && (
                            <button onClick={() => setActiveView('TEAM')} className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all ${activeView === 'TEAM' ? 'bg-primary-500 text-dark-950 shadow-lg shadow-primary-500/20' : 'text-slate-400 hover:text-white'}`}>
                                <Users size={14} /> Team
                            </button>
                        )}
                        {(userRole === 'SELLER' || userRole === 'ADMIN') && (
                            <button onClick={() => setActiveView('BILLING')} className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all ${activeView === 'BILLING' ? 'bg-primary-500 text-dark-950 shadow-lg shadow-primary-500/20' : 'text-slate-400 hover:text-white'}`}>
                                <CreditCard size={14} /> Billing
                            </button>
                        )}

                        <button onClick={() => setActiveView('NOTICES')} className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all relative ${activeView === 'NOTICES' ? 'bg-primary-500 text-dark-950 shadow-lg shadow-primary-500/20' : 'text-slate-400 hover:text-white'}`}>
                            <Bell size={14} /> Notices
                            {unreadNoticesCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full border-2 border-dark-900 font-black">{unreadNoticesCount}</span>}
                        </button>
                        {(userRole === 'SELLER' || userRole === 'ADMIN') && (
                            <button onClick={() => setActiveView('SETTINGS')} className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all ${activeView === 'SETTINGS' ? 'bg-primary-500 text-dark-950' : 'text-slate-400 hover:text-white'}`}>
                                <Store size={14} /> Settings
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2">
                        {canSeeAdminStuff && (
                            <button onClick={() => setShowPOSModal(true)} className="flex-1 sm:flex-none bg-primary-500 hover:bg-primary-400 text-dark-950 font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-sm">
                                <ListOrdered size={18} /> POS
                            </button>
                        )}
                        <button onClick={() => fetchDashboard()} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-slate-400">
                            <Clock size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Floating Bulk Actions Bar */}
            <AnimatePresence>
                {selectedOrders.length > 0 && (
                    <motion.div 
                        initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] bg-dark-900/90 backdrop-blur-xl border border-primary-500/30 rounded-3xl p-4 shadow-2xl flex items-center gap-6"
                    >
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-primary-500 tracking-widest">Bulk Actions</span>
                            <span className="text-white font-bold text-sm">{selectedOrders.length} orders selected</span>
                        </div>
                        <div className="h-8 w-px bg-white/10"></div>
                        <div className="flex gap-2">
                            {activeView === 'KITCHEN' && (
                                <>
                                    <button onClick={() => handleBulkAdvance('PREPARING')} className="px-4 py-2 bg-dark-800 hover:bg-dark-700 text-white rounded-xl text-xs font-bold transition-all">Start Prep</button>
                                    <button onClick={() => handleBulkAdvance('READY')} className="px-4 py-2 bg-primary-500 hover:bg-primary-400 text-dark-900 rounded-xl text-xs font-bold transition-all">Mark Ready</button>
                                </>
                            )}
                            {activeView === 'DELIVERY' && (
                                <button onClick={() => handleBulkAdvance('OUT_FOR_DELIVERY')} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all">Dispatch All</button>
                            )}
                            {activeView === 'KITCHEN' && (
                                <button onClick={() => handleBulkAdvance('COMPLETED')} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-bold transition-all">Complete All</button>
                            )}
                            <button onClick={() => setSelectedOrders([])} className="p-2 text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {activeView === 'KITCHEN' && canSeeKitchen && (
                <div className="flex flex-col gap-6 flex-grow animate-fadeIn">
                    {upcomingScheduledOrders.length > 0 && (
                        <div className="glass-dark border border-primary-500/20 bg-primary-500/5 rounded-3xl p-6 mb-2">
                            <h3 className="text-sm font-black uppercase text-primary-400 mb-4 tracking-widest flex items-center gap-2">
                                <Clock size={16} className="animate-pulse" /> Upcoming Scheduled Orders
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {upcomingScheduledOrders.map(order => (
                                    <ScheduledOrderCard 
                                        key={order.id} 
                                        order={order} 
                                        onStartNow={() => advanceOrderState(order.id, storeType === 'SHOP' ? 'READY' : 'QUEUED')}
                                        onRespondReschedule={handleRespondReschedule}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 flex-grow">
                        <div className="glass-dark rounded-2xl md:rounded-3xl p-4 md:p-6 border border-primary-500/20 flex flex-col h-[500px] xl:h-auto">
                            <div className="flex items-center gap-2 mb-4 md:mb-6 pb-3 border-b border-primary-500/10">
                                <Calendar className="text-primary-400" size={18} />
                                <h3 className="font-bold text-base md:text-lg text-slate-200 uppercase tracking-wider">Reservations</h3>
                                <span className="ml-auto bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded-full text-[10px] font-bold border border-primary-500/30">{reservationOrders.length}</span>
                            </div>
                            <div className="overflow-y-auto pr-1 space-y-3 flex-grow custom-scrollbar">
                                {loading ? <LoadingSkeleton /> : <AnimatePresence>{reservationOrders.map(order => <OrderCard key={order.id} order={order} advanceOrderStateFn={advanceOrderState} userRole={userRole} isSelected={selectedOrders.includes(order.id)} onSelect={() => toggleOrderSelection(order.id)} onOpenHandoffPinModal={(id) => setHandoffPinModal({ open: true, orderId: id, pin: '', loading: false })} />)}</AnimatePresence>}
                                {!loading && reservationOrders.length === 0 && <EmptyState icon={<Calendar size={40} />} text="No reserved orders" />}
                            </div>
                        </div>

                        {storeType !== 'SHOP' && (
                            <div className="glass-dark rounded-2xl md:rounded-3xl p-4 md:p-6 border border-white/5 flex flex-col h-[500px] xl:h-auto">
                                <div className="flex items-center gap-2 mb-4 md:mb-6 pb-3 border-b border-white/5">
                                    <ListOrdered className="text-slate-400" size={18} />
                                    <h3 className="font-bold text-base md:text-lg text-slate-200 uppercase tracking-wider">Kitchen Queue</h3>
                                    <span className="ml-auto bg-dark-800 text-slate-400 px-2 py-0.5 rounded-full text-[10px] font-bold border border-white/5">{queuedOrders.length}</span>
                                </div>
                                <div className="overflow-y-auto pr-1 space-y-3 flex-grow custom-scrollbar">
                                    {loading ? <LoadingSkeleton /> : <AnimatePresence>{queuedOrders.map(order => <OrderCard key={order.id} order={order} advanceOrderStateFn={advanceOrderState} userRole={userRole} isSelected={selectedOrders.includes(order.id)} onSelect={() => toggleOrderSelection(order.id)} onOpenHandoffPinModal={(id) => setHandoffPinModal({ open: true, orderId: id, pin: '', loading: false })} />)}</AnimatePresence>}
                                    {!loading && queuedOrders.length === 0 && <EmptyState icon={<ListOrdered size={40} />} text="Queue is empty" />}
                                </div>
                            </div>
                        )}
                        <div className="bg-gradient-to-b from-dark-900/80 to-dark-800/40 backdrop-blur-xl rounded-2xl md:rounded-3xl p-4 md:p-6 border border-primary-500/20 shadow-2xl flex flex-col h-[500px] xl:h-auto relative overflow-hidden">
                            <div className="flex items-center gap-2 mb-4 md:mb-6 pb-3 border-b border-primary-500/10 z-10">
                                <ChefHat className="text-primary-500 animate-pulse" size={18} />
                                <h3 className="font-bold text-base md:text-lg text-white uppercase tracking-wider">Preparing</h3>
                                <span className="ml-auto bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded-full text-[10px] font-bold border border-primary-500/30">{preparingOrders.length}</span>
                            </div>
                            <div className="overflow-y-auto pr-1 space-y-3 flex-grow z-10 custom-scrollbar">
                                {loading ? <LoadingSkeleton /> : <AnimatePresence>{preparingOrders.map(order => <OrderCard key={order.id} order={order} markItemReadyFn={markItemReady} advanceOrderStateFn={advanceOrderState} userRole={userRole} isSelected={selectedOrders.includes(order.id)} onSelect={() => toggleOrderSelection(order.id)} onOpenHandoffPinModal={(id) => setHandoffPinModal({ open: true, orderId: id, pin: '', loading: false })} />)}</AnimatePresence>}
                                {!loading && preparingOrders.length === 0 && <EmptyState active icon={<Utensils size={40} />} text="Kitchen is waiting" />}
                            </div>
                        </div>
                        {/* DISPATCH COLUMN for non-delivery items */}
                        <div className="glass-dark rounded-2xl md:rounded-3xl p-4 md:p-6 border border-white/5 flex flex-col h-[500px] xl:h-auto">
                            <div className="flex items-center gap-2 mb-4 md:mb-6 pb-3 border-b border-white/5">
                                <CheckCircle2 className="text-green-500" size={18} />
                                <h3 className="font-bold text-base md:text-lg text-white uppercase tracking-wider">Ready to Dispatch</h3>
                                <span className="ml-auto bg-dark-800 text-slate-400 px-2 py-0.5 rounded-full text-[10px] font-bold border border-white/5">{readyForKitchen.length}</span>
                            </div>
                            <div className="overflow-y-auto pr-1 space-y-3 flex-grow custom-scrollbar">
                                {loading ? <LoadingSkeleton /> : <AnimatePresence>{readyForKitchen.map(order => <OrderCard key={order.id} order={order} advanceOrderStateFn={advanceOrderState} userRole={userRole} isSelected={selectedOrders.includes(order.id)} onSelect={() => toggleOrderSelection(order.id)} onOpenHandoffPinModal={(id) => setHandoffPinModal({ open: true, orderId: id, pin: '', loading: false })} />)}</AnimatePresence>}
                                {!loading && readyForKitchen.length === 0 && <EmptyState icon={<CheckCircle2 size={40} />} text="No items to dispatch" />}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeView === 'ACCOUNTING' && canSeeAccounting && (
                <div className="glass-dark rounded-3xl p-6 border border-indigo-500/20 flex flex-col min-h-[400px]">
                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-indigo-500/10">
                        <CreditCard className="text-indigo-400" />
                        <h3 className="font-bold text-lg text-slate-200 tracking-wide">VERIFY PAYMENT</h3>
                        <span className="ml-auto bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-xs font-bold border border-indigo-500/30">{awaitingPaymentOrders.length}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? <LoadingSkeleton /> : <AnimatePresence>{awaitingPaymentOrders.map(order => <OrderCard key={order.id} order={order} onVerifyPayment={() => setVerifyModal({ open: true, order, fee: '' })} userRole={userRole} isSelected={selectedOrders.includes(order.id)} onSelect={() => toggleOrderSelection(order.id)} onOpenHandoffPinModal={(id) => setHandoffPinModal({ open: true, orderId: id, pin: '', loading: false })} />)}</AnimatePresence>}
                        {!loading && awaitingPaymentOrders.length === 0 && <div className="col-span-full"><EmptyState icon={<CreditCard size={48} />} text="No pending payments" /></div>}
                    </div>
                </div>
            )}

            {activeView === 'DELIVERY' && canSeeDelivery && (
                <div className="flex flex-col gap-6 w-full animate-fadeIn">
                    {/* Locked Order / Policy Warning Banner */}
                    {lockedOrders.length > 0 && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center gap-5 shadow-[0_0_35px_rgba(239,68,68,0.15)] relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.03] to-transparent"></div>
                            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 shrink-0 border border-red-500/30 relative z-10">
                                <AlertTriangle size={24} />
                            </div>
                            <div className="flex-grow text-left relative z-10">
                                <h4 className="text-lg font-bold text-white mb-1">Security Alert: {lockedOrders.length} Locked Order{lockedOrders.length > 1 ? 's' : ''} Detected</h4>
                                <p className="text-xs text-slate-300 leading-relaxed">
                                    Orders have been locked due to excessive failed PIN verification attempts. This has been flagged as suspicious to the admin panel. 
                                    <span className="text-red-400 font-bold block mt-1">
                                        ⚠️ WARNING: {supportConfig.policy_warning}
                                    </span>
                                </p>
                            </div>
                            <div className="shrink-0 flex gap-2 w-full md:w-auto relative z-10">
                                <button 
                                    onClick={() => {
                                        setHandoffPinModal({ open: true, orderId: lockedOrders[0].id, pin: '', loading: false });
                                    }}
                                    className="w-full md:w-auto bg-red-500 hover:bg-red-400 text-dark-950 font-bold px-6 py-3 rounded-2xl transition-all shadow-lg active:scale-95 text-xs font-black uppercase tracking-wider"
                                >
                                    Resolve Lock
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col xl:flex-row gap-6 flex-grow overflow-x-auto pb-4 custom-scrollbar">
                        <div className="glass-dark rounded-3xl p-6 border border-green-500/20 flex flex-col min-w-[300px] xl:min-w-[320px] flex-1 min-h-[400px]">
                            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-green-500/10">
                                <CheckCircle2 className="text-green-500" />
                                <h3 className="font-bold text-lg text-white tracking-wide">READY FOR PICKUP/DELIVERY</h3>
                                <span className="ml-auto bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-500/30">{readyForDelivery.length}</span>
                            </div>
                            <div className="overflow-y-auto pr-2 space-y-4 flex-grow">
                                {loading ? <LoadingSkeleton /> : <AnimatePresence>{readyForDelivery.map(order => <OrderCard key={order.id} order={order} advanceOrderStateFn={advanceOrderState} userRole={userRole} isSelected={selectedOrders.includes(order.id)} onSelect={() => toggleOrderSelection(order.id)} onOpenHandoffPinModal={(id) => setHandoffPinModal({ open: true, orderId: id, pin: '', loading: false })} />)}</AnimatePresence>}
                                {!loading && readyForDelivery.length === 0 && <EmptyState icon={<CheckCircle2 size={48} />} text="No orders awaiting dispatch" />}
                            </div>
                        </div>
                        <div className="glass-dark rounded-3xl p-6 border border-purple-500/20 flex flex-col min-w-[300px] xl:min-w-[320px] flex-1 min-h-[400px]">
                            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-purple-500/10">
                                <Truck className="text-purple-500" />
                                <h3 className="font-bold text-lg text-white tracking-wide">OUT FOR DELIVERY</h3>
                                <span className="ml-auto bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-xs font-bold border border-purple-500/30">{outForDeliveryOrders.length}</span>
                            </div>
                            <div className="overflow-y-auto pr-2 space-y-4 flex-grow">
                                {loading ? <LoadingSkeleton /> : <AnimatePresence>{outForDeliveryOrders.map(order => <OrderCard key={order.id} order={order} advanceOrderStateFn={advanceOrderState} userRole={userRole} isSelected={selectedOrders.includes(order.id)} onSelect={() => toggleOrderSelection(order.id)} onOpenHandoffPinModal={(id) => setHandoffPinModal({ open: true, orderId: id, pin: '', loading: false })} />)}</AnimatePresence>}
                                {!loading && outForDeliveryOrders.length === 0 && <EmptyState icon={<Truck size={48} />} text="No active deliveries" />}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeView === 'BILLING' && canSeeAdminStuff && (
                <div className="glass-dark border border-white/5 rounded-3xl p-6 max-w-6xl mx-auto w-full space-y-8 animate-fadeIn">
                    <div className="flex justify-between items-center pb-4 border-b border-white/5">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <CreditCard className="text-primary-400" /> Platform Billing & Commissions
                            </h2>
                            <p className="text-xs text-slate-400 mt-1">Manage your platform fees, invoices, and payment confirmations.</p>
                        </div>
                        <button onClick={fetchBillingData} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors">
                            <RefreshCw size={16} />
                        </button>
                    </div>

                    {/* KPI Balances Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                            <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Outstanding Dues</span>
                            <span className="text-2xl font-black text-white mt-2 font-mono">
                                {formatPrice(
                                    invoices
                                        .filter(inv => ['UNPAID', 'OVERDUE'].includes(inv.status))
                                        .reduce((sum, inv) => sum + parseFloat(inv.total_commission), 0)
                                )}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1">Sum of unpaid & overdue invoices</span>
                        </div>

                        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                            <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Total Commission Paid</span>
                            <span className="text-2xl font-black text-slate-300 mt-2 font-mono">
                                {formatPrice(
                                    invoices
                                        .filter(inv => inv.status === 'PAID')
                                        .reduce((sum, inv) => sum + parseFloat(inv.total_commission), 0)
                                )}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1">Accrued platform fee verified by admin</span>
                        </div>

                        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                            <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Platform Order Volume</span>
                            <span className="text-2xl font-black text-slate-300 mt-2 font-mono">
                                {formatPrice(
                                    invoices.reduce((sum, inv) => sum + parseFloat(inv.total_order_amount), 0)
                                )}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1">Historical total of invoiced order amounts</span>
                        </div>
                    </div>

                    {/* Monthly Invoices Table */}
                    <div className="bg-dark-900 border border-white/10 rounded-2xl p-6">
                        <h3 className="text-base font-bold text-white mb-4">Monthly Statements</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs md:text-sm text-slate-300">
                                <thead>
                                    <tr className="border-b border-white/5 text-[10px] uppercase font-black tracking-wider text-slate-500">
                                        <th className="pb-3">Period</th>
                                        <th className="pb-3">Order Count</th>
                                        <th className="pb-3">Gross Sales</th>
                                        <th className="pb-3">Commission (3%)</th>
                                        <th className="pb-3">Due Date</th>
                                        <th className="pb-3">Status</th>
                                        <th className="pb-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map(inv => (
                                        <tr key={inv.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                            <td className="py-4 font-bold text-white">
                                                {new Date(inv.year, inv.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                                            </td>
                                            <td className="py-4">{inv.order_count}</td>
                                            <td className="py-4 font-mono">{formatPrice(inv.total_order_amount)}</td>
                                            <td className="py-4 font-mono text-primary-400 font-bold">{formatPrice(inv.total_commission)}</td>
                                            <td className="py-4">{new Date(inv.due_date).toLocaleDateString()}</td>
                                            <td className="py-4">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                                    inv.status === 'PAID' ? 'bg-green-500/20 text-green-400' :
                                                    inv.status === 'PENDING_REVIEW' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    inv.status === 'OVERDUE' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-slate-700/20 text-slate-400'
                                                }`}>
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td className="py-4 text-right">
                                                {['UNPAID', 'OVERDUE'].includes(inv.status) ? (
                                                    <button
                                                        onClick={() => {
                                                            setShowPaymentModal({ open: true, invoice: inv });
                                                            setPaymentForm({ amount: inv.total_commission, transactionId: '', receiptScreenshot: null });
                                                        }}
                                                        className="bg-primary-500 hover:bg-primary-400 text-dark-950 text-xs font-black uppercase px-3 py-1.5 rounded-lg transition-all"
                                                    >
                                                        Upload Receipt
                                                    </button>
                                                ) : (
                                                    <span className="text-slate-500 text-xs">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {invoices.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="py-12 text-center text-slate-500">
                                                No monthly invoices generated yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Transaction Splits Ledger */}
                    <div className="bg-dark-900 border border-white/10 rounded-2xl p-6">
                        <h3 className="text-base font-bold text-white mb-2">Transaction Split Ledger</h3>
                        <p className="text-xs text-slate-400 mb-4">Detailed audit trail of accrued platform fees and compensation charges.</p>
                        <div className="overflow-x-auto max-h-96 custom-scrollbar">
                            <table className="w-full text-left text-xs md:text-sm text-slate-300 text-nowrap">
                                <thead className="sticky top-0 bg-dark-900 z-10">
                                    <tr className="border-b border-white/5 text-[10px] uppercase font-black tracking-wider text-slate-500">
                                        <th className="pb-3">Date</th>
                                        <th className="pb-3">Order ID</th>
                                        <th className="pb-3">Type</th>
                                        <th className="pb-3">Order Amount</th>
                                        <th className="pb-3">Rate</th>
                                        <th className="pb-3 text-right">Platform Cut</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ledgerEntries.map(entry => (
                                        <tr key={entry.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                            <td className="py-3">{new Date(entry.created_at).toLocaleString()}</td>
                                            <td className="py-3 font-bold text-white">#{entry.order_id}</td>
                                            <td className="py-3">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                                    entry.entry_type === 'COMMISSION' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-rose-500/10 text-rose-400'
                                                }`}>
                                                    {entry.entry_type === 'COMMISSION' ? 'Order Comm.' : 'Cancel Fee'}
                                                </span>
                                            </td>
                                            <td className="py-3 font-mono">{formatPrice(entry.order_amount)}</td>
                                            <td className="py-3 font-mono">{entry.commission_rate}%</td>
                                            <td className="py-3 font-mono text-right font-bold text-slate-200">
                                                {formatPrice(entry.commission_amount)}
                                            </td>
                                        </tr>
                                    ))}
                                    {ledgerEntries.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="py-12 text-center text-slate-500">
                                                No ledger transactions recorded yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeView === 'SETTINGS' && storeDetails && canSeeAdminStuff && (
                <div className="glass-dark border border-white/5 rounded-3xl p-6 max-w-4xl mx-auto w-full">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6"><Store className="text-primary-400" /> Store Settings</h2>
                    
                    <div className="bg-dark-900 border border-white/10 rounded-2xl p-6 mb-6">
                        <h3 className="text-lg font-bold text-white mb-4">Store Profile</h3>
                        <p className="text-sm text-slate-400 mb-6">Update your store details, contact info, and picture.</p>
                        
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const toastId = toast.loading('Saving store profile...');
                            const formData = new FormData(e.target);
                            apiClient.patch(`/stores/${storeDetails.id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' }})
                                .then(() => {
                                    toast.success('Store profile updated!', { id: toastId });
                                    fetchDashboard();
                                })
                                .catch(err => toast.error('Failed to update profile', { id: toastId }));
                        }} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Store Name</label>
                                    <input type="text" name="name" defaultValue={storeDetails.name} required className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none text-white" />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Contact Phone</label>
                                    <input type="text" name="contact_phone" defaultValue={storeDetails.contact_phone || ''} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none text-white" />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Contact Email</label>
                                    <input type="email" name="contact_email" defaultValue={storeDetails.contact_email || ''} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none text-white" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs text-slate-400 block mb-1">Location</label>
                                    <textarea name="location" defaultValue={storeDetails.location || ''} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none text-white h-20" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs text-slate-400 block mb-1">Store Picture</label>
                                    {storeDetails.image_url && (
                                        <div className="mb-2 w-32 h-32 rounded-xl overflow-hidden border border-white/10">
                                            <OptimizedImage src={storeDetails.image_url} alt="Store" className="w-full h-full object-cover" wrapperClassName="w-full h-full" eager />
                                        </div>
                                    )}
                                    <input type="file" name="image" accept="image/*" className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-500/10 file:text-primary-500" />
                                </div>
                            </div>
                            <div className="flex justify-end mt-4">
                                <button type="submit" className="bg-primary-500 hover:bg-primary-400 text-dark-900 font-bold px-6 py-2 rounded-lg text-sm shadow-lg">Save Profile</button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-dark-900 border border-white/10 rounded-2xl p-6 mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Payment Methods</h3>
                            <button 
                                onClick={() => setEditingPaymentMethod({ provider: '', account_name: '', account_number: '', instructions: '', is_active: true })}
                                className="bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 p-2 rounded-lg transition-colors flex items-center gap-1 text-sm font-bold"
                            >
                                <Plus size={16} /> Add Method
                            </button>
                        </div>
                        <p className="text-sm text-slate-400 mb-6">Configure the offline payment methods your customers can use during checkout.</p>
                        
                        {editingPaymentMethod && (
                            <form onSubmit={handleSavePaymentMethod} className="mb-6 bg-dark-950 border border-primary-500/30 p-4 rounded-xl space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Provider (e.g., M-Pesa, Cash)</label>
                                        <input type="text" name="provider" defaultValue={editingPaymentMethod.provider} required className="w-full bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none text-white" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Account Name (Optional)</label>
                                        <input type="text" name="account_name" defaultValue={editingPaymentMethod.account_name} className="w-full bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none text-white" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Account Number (Optional)</label>
                                        <input type="text" name="account_number" defaultValue={editingPaymentMethod.account_number} className="w-full bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none text-white" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Provider Logo (Optional)</label>
                                        <input type="file" name="image" accept="image/*" className="w-full bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-500/10 file:text-primary-500" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs text-slate-400 block mb-1">Instructions</label>
                                        <textarea name="instructions" defaultValue={editingPaymentMethod.instructions} className="w-full bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none text-white h-16" placeholder="e.g. Pay to Till Number 123456" />
                                    </div>
                                    <div className="md:col-span-2 flex items-center gap-2">
                                        <input type="checkbox" name="is_active" id="pm_is_active" defaultChecked={editingPaymentMethod.is_active} value="true" className="accent-primary-500 w-4 h-4 rounded" />
                                        <label htmlFor="pm_is_active" className="text-sm font-medium text-white cursor-pointer">Actively Available</label>
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end pt-2">
                                    <button type="button" onClick={() => setEditingPaymentMethod(null)} className="px-4 py-2 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors text-white">Cancel</button>
                                    <button type="submit" className="bg-primary-500 hover:bg-primary-400 text-dark-900 px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-primary-500/20">Save Method</button>
                                </div>
                            </form>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {(Array.isArray(storeDetails.payment_methods) ? storeDetails.payment_methods : []).map((pm, idx) => (
                                <div key={pm.id || idx} className="bg-dark-950 border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center group relative">
                                    {(pm.image_url || pm.image) && (
                                        <div className="w-20 h-20 mb-3 rounded-xl bg-white flex items-center justify-center p-2 shrink-0 overflow-hidden shadow-inner border border-white/10">
                                            <OptimizedImage 
                                                src={pm.image_url || pm.image} 
                                                alt={pm.provider} 
                                                className="w-full h-full object-contain" 
                                                wrapperClassName="w-full h-full"
                                                eager
                                            />
                                        </div>
                                    )}
                                    <h4 className="font-black text-sm text-primary-400 uppercase tracking-tight mb-1">{pm.provider}</h4>
                                    {pm.account_name && <p className="text-[10px] text-slate-200 font-bold line-clamp-1 mb-2">{pm.account_name}</p>}
                                    {pm.account_number && (
                                        <div className="w-full bg-dark-900 px-2 py-2 rounded-xl border border-white/10 mt-auto">
                                            <p className="text-lg font-black font-mono text-white select-all tracking-tight leading-none">{pm.account_number}</p>
                                            <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest mt-1">Lipa Number</p>
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-between w-full mt-3 pt-2 border-t border-white/5">
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest ${pm.is_active ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>
                                            {pm.is_active ? 'ACTIVE' : 'INACTIVE'}
                                        </span>
                                        <div className="flex gap-2">
                                            <button onClick={() => setEditingPaymentMethod(pm)} className="p-1 text-slate-400 hover:text-white bg-white/5 rounded transition-colors"><Edit2 size={12} /></button>
                                            <button onClick={() => handleDeletePaymentMethod(pm.id)} className="p-1 text-slate-400 hover:text-red-400 bg-white/5 rounded transition-colors"><Trash2 size={12} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!storeDetails.payment_methods || storeDetails.payment_methods.length === 0) && !editingPaymentMethod && (
                                <div className="text-center py-6 text-slate-500 bg-dark-950 rounded-xl border border-white/5 border-dashed">No payment methods configured yet.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Other views omitted for brevity, adding back QR and NOTICES */}
            {activeView === 'TEAM' && (userRole === 'SELLER' || userRole === 'ADMIN') && (
                <div className="glass-dark border border-white/5 rounded-3xl p-6 max-w-6xl mx-auto w-full">
                    <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/5">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2 uppercase tracking-tighter">
                                <Users className="text-primary-500" /> Team Management
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">Manage worker accounts and permissions for {storeDetails?.name}</p>
                        </div>
                        <button onClick={() => setShowHireModal(true)} className="bg-primary-500 hover:bg-primary-400 text-dark-950 font-bold px-4 py-2 rounded-xl flex items-center gap-2 text-sm transition-all shadow-lg shadow-primary-500/20">
                            <UserPlus size={18} /> Hire Staff
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {staffList.map(staff => (
                            <div key={staff.id} className={`bg-dark-900 border rounded-2xl p-5 relative overflow-hidden transition-all ${!staff.is_active ? 'opacity-50 grayscale border-white/5' : 'border-white/10 hover:border-primary-500/30'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-dark-800 flex items-center justify-center text-primary-500 border border-white/5 font-bold">
                                            {staff.first_name?.[0] || staff.username[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-sm">{staff.first_name} {staff.last_name}</h3>
                                            <p className="text-[10px] text-slate-500 font-mono">@{staff.username}</p>
                                        </div>
                                    </div>
                                    <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                                        staff.role === 'CHEF' ? 'bg-orange-500/20 text-orange-400' :
                                        staff.role === 'ACCOUNTANT' ? 'bg-indigo-500/20 text-indigo-400' :
                                        'bg-purple-500/20 text-purple-400'
                                    }`}>
                                        {staff.role}
                                    </div>
                                </div>
                                
                                <div className="space-y-2 mb-6">
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                        <Phone size={12} /> {staff.phone_number || 'No phone'}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                        <div className={`w-1.5 h-1.5 rounded-full ${staff.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                        {staff.is_active ? 'Active on Duty' : 'Deactivated / Fired'}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={() => handleResetStaffPassword(staff.id)} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2">
                                        <Key size={12} /> Reset Pass
                                    </button>
                                    {staff.is_active && (
                                        <button onClick={() => handleDeactivateStaff(staff.id)} className="px-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-2 rounded-lg transition-colors border border-red-500/20">
                                            <Power size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {staffList.length === 0 && <div className="col-span-full py-12 text-center text-slate-600"><Users size={48} className="mx-auto mb-4 opacity-20" /><p>No staff accounts found.</p></div>}
                    </div>
                </div>
            )}

            {/* Hire Staff Modal */}
            <AnimatePresence>
                {showHireModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHireModal(false)} className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-dark-900 border border-white/10 rounded-[2.5rem] p-8 w-full max-w-md relative z-10 shadow-2xl">
                            <h2 className="text-2xl font-black text-white uppercase italic tracking-tight mb-2">Onboard Staff</h2>
                            <p className="text-sm text-slate-400 mb-6">Create a secure account for your team member.</p>
                            
                            <form onSubmit={handleHire} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">First Name</label>
                                        <input required type="text" className="w-full bg-dark-950 border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-primary-500 outline-none" value={hireForm.first_name} onChange={e => setHireForm({...hireForm, first_name: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Last Name</label>
                                        <input required type="text" className="w-full bg-dark-950 border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-primary-500 outline-none" value={hireForm.last_name} onChange={e => setHireForm({...hireForm, last_name: e.target.value})} />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Username</label>
                                    <input required type="text" placeholder="e.g. juma_chef" className="w-full bg-dark-950 border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-primary-500 outline-none" value={hireForm.username} onChange={e => setHireForm({...hireForm, username: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Initial Password</label>
                                    <input required type="password" placeholder="Min 8 characters" className="w-full bg-dark-950 border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-primary-500 outline-none" value={hireForm.password} onChange={e => setHireForm({...hireForm, password: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Operational Role</label>
                                    <select className="w-full bg-dark-950 border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-primary-500 outline-none text-white" value={hireForm.role} onChange={e => setHireForm({...hireForm, role: e.target.value})}>
                                        <option value="CHEF">KITCHEN / CHEF</option>
                                        <option value="ACCOUNTANT">CASHIER / ACCOUNTANT</option>
                                        <option value="DELIVERY">DELIVERY DRIVER</option>
                                    </select>
                                </div>
                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={() => setShowHireModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all">Cancel</button>
                                    <button type="submit" className="flex-[2] bg-primary-500 hover:bg-primary-400 text-dark-950 font-bold py-4 rounded-2xl transition-all shadow-lg shadow-primary-500/20">Add to Team</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {activeView === 'NOTICES' && (
                <div className="glass-dark border border-white/5 rounded-3xl p-6 max-w-4xl mx-auto w-full">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6"><Bell className="text-primary-400" /> Staff Notices</h2>
                    <div className="space-y-4">
                        {notices.map(n => (
                            <div key={n.id} className={`bg-dark-900 border transition-all rounded-xl p-4 relative ${!n.is_read ? 'border-primary-500/30' : 'border-white/10'}`}>
                                {!n.is_read && <span className="absolute top-4 right-4 bg-primary-500 text-dark-950 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-lg shadow-primary-500/20">NEW</span>}
                                <h3 className="text-lg font-bold text-primary-400">{n.title}</h3>
                                <p className="text-slate-300 mt-2 whitespace-pre-wrap">{n.message}</p>
                                <div className="flex justify-between items-center mt-4">
                                    <span className="text-xs text-slate-500">From: Admin | {new Date(n.created_at).toLocaleString()}</span>
                                    {!n.is_read && (
                                        <button 
                                            onClick={() => handleMarkAsRead(n.id)}
                                            className="text-[10px] font-black uppercase text-primary-400 hover:text-white transition-colors flex items-center gap-1"
                                        >
                                            <CheckCircle2 size={12} /> Mark as Read
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {notices.length === 0 && <EmptyState icon={<Bell size={48} />} text="No notices currently." />}
                    </div>
                </div>
            )}

            {activeView === 'QR' && storeDetails && canSeeAdminStuff && (
                <div className="glass-dark border border-white/5 rounded-3xl p-6 max-w-xl mx-auto w-full flex flex-col items-center">
                    <h2 className="text-2xl font-bold text-white mb-6">Store QR Code</h2>
                    <div className="bg-white p-6 rounded-2xl mb-4">
                        <QRCodeSVG value={storeUrl} size={256} />
                    </div>
                    <p className="text-slate-400 text-center mb-6">Print this and place it on tables or counters so customers can easily access your digital menu.</p>
                    <a href={storeUrl} target="_blank" rel="noreferrer" className="text-primary-400 font-bold hover:underline break-all text-center">{storeUrl}</a>
                </div>
            )}

            {/* MODALS */}
            {/* POS MODAL */}
            {showPOSModal && (
                <div className="fixed inset-0 bg-dark-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-0 sm:p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className="bg-dark-900 w-full h-full sm:h-auto sm:max-w-5xl sm:rounded-3xl shadow-2xl flex flex-col sm:flex-row overflow-hidden border border-white/10"
                    >
                        {/* Product Picker */}
                        <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-white/5 bg-dark-950/30">
                            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-dark-900/50">
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Point of Sale</h3>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Select products to add to cart</p>
                                </div>
                                <button onClick={() => setShowPOSModal(false)} className="sm:hidden p-2 text-slate-400 hover:text-white"><X size={24} /></button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 custom-scrollbar">
                                {posProducts.map(product => (
                                    <button 
                                        key={product.id} 
                                        onClick={() => addToPosCart(product)}
                                        className="bg-dark-900 border border-white/5 rounded-2xl p-3 md:p-4 text-left hover:border-primary-500/50 transition-all group flex flex-col h-full shadow-lg"
                                    >
                                        <div className="w-full aspect-square rounded-xl bg-dark-950 mb-3 overflow-hidden border border-white/5">
                                            {product.image ? (
                                                <OptimizedImage src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" wrapperClassName="w-full h-full" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-800"><ShoppingBag size={32} /></div>
                                            )}
                                        </div>
                                        <h4 className="font-bold text-white text-sm md:text-base line-clamp-1 group-hover:text-primary-400 transition-colors">{product.name}</h4>
                                        <div className="mt-auto pt-2 flex justify-between items-center">
                                            <span className="text-primary-500 font-black text-sm md:text-base">{formatPrice(product.price)}</span>
                                            <div className="w-8 h-8 rounded-full bg-primary-500/10 text-primary-500 flex items-center justify-center group-hover:bg-primary-500 group-hover:text-dark-900 transition-all">
                                                <Plus size={16} />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Cart Summary */}
                        <div className="w-full sm:w-80 md:w-96 bg-dark-900 flex flex-col h-full border-t sm:border-t-0 sm:border-l border-white/10 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
                            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                <h4 className="font-black text-slate-400 uppercase tracking-widest text-xs">Current Order</h4>
                                <button onClick={() => setPosCart([])} className="text-[10px] font-black text-red-500 hover:text-red-400 uppercase tracking-widest">Clear All</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
                                {posCart.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full opacity-20 py-10">
                                        <ShoppingCart size={48} className="mb-4" />
                                        <p className="font-bold uppercase tracking-widest text-xs">Cart is empty</p>
                                    </div>
                                ) : (
                                    posCart.map(item => (
                                        <div key={item.id} className="flex gap-4 items-center bg-dark-950/50 p-3 rounded-2xl border border-white/5">
                                            <div className="flex-1">
                                                <h5 className="text-sm font-bold text-white line-clamp-1">{item.name}</h5>
                                                <p className="text-xs text-primary-500 font-black mt-1">{formatPrice(item.price * item.quantity)}</p>
                                            </div>
                                            <div className="flex items-center gap-2 bg-dark-900 rounded-xl p-1 border border-white/10">
                                                <button onClick={() => updatePosQty(item.id, -1)} className="p-1 hover:text-primary-400 text-slate-500 transition-colors"><X size={14} /></button>
                                                <span className="w-6 text-center text-sm font-black text-white">{item.quantity}</span>
                                                <button onClick={() => updatePosQty(item.id, 1)} className="p-1 hover:text-primary-400 text-slate-500 transition-colors"><Plus size={14} /></button>
                                            </div>
                                            <button onClick={() => removeFromPosCart(item.id)} className="text-red-500/50 hover:text-red-500 p-1"><Trash2 size={16} /></button>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-6 bg-dark-950/50 border-t border-white/10 space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Customer Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. John Doe"
                                        value={posCustomerName}
                                        onChange={e => setPosCustomerName(e.target.value)}
                                        className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-primary-500 outline-none transition-all font-medium"
                                    />
                                </div>
                                
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-10 h-6 rounded-full transition-colors relative ${posSkipKitchen ? 'bg-primary-500' : 'bg-dark-800'}`}>
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${posSkipKitchen ? 'left-5' : 'left-1'}`}></div>
                                    </div>
                                    <input type="checkbox" className="hidden" checked={posSkipKitchen} onChange={e => setPosSkipKitchen(e.target.checked)} />
                                    <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors">Skip Kitchen Queue</span>
                                </label>

                                <div className="pt-4 space-y-3">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Amount</span>
                                        <span className="text-2xl font-black text-white tracking-tight">
                                            {formatPrice(posCart.reduce((sum, i) => sum + (i.price * i.quantity), 0))}
                                        </span>
                                    </div>
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => setShowPOSModal(false)}
                                            className="flex-1 py-4 rounded-2xl bg-white/5 text-white font-bold text-sm hover:bg-white/10 transition-all border border-white/5"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            disabled={posCart.length === 0}
                                            onClick={handlePOSCheckout}
                                            className="flex-[2] py-4 rounded-2xl bg-primary-500 text-dark-900 font-black text-sm hover:bg-primary-400 transition-all shadow-[0_10px_30px_rgba(249,115,22,0.3)] disabled:opacity-50 disabled:shadow-none"
                                        >
                                            PLACE ORDER
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {verifyModal.open && (
                <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-dark-900 border border-indigo-500/30 w-full max-w-md rounded-3xl shadow-2xl p-6 overflow-y-auto max-h-[80vh]">
                        <h3 className="text-xl font-bold text-white mb-4">Verify Payment: #{verifyModal.order.id}</h3>
                        <div className="mb-4 text-slate-300">
                            Current Total: <strong className="text-primary-400">{formatPriceStatic(verifyModal.order.total_amount)}</strong>
                        </div>
                        
                        {/* Customer payment proof */}
                        {verifyModal.order.payment_message && (
                            <div className="mb-4 bg-dark-950 border border-white/10 rounded-xl p-4">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Payment Message / Ref</p>
                                <p className="text-white text-sm whitespace-pre-wrap">{verifyModal.order.payment_message}</p>
                            </div>
                        )}
                        {verifyModal.order.payment_receipt && (
                            <div className="mb-4">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Receipt Image</p>
                                <OptimizedImage
                                    src={`${BACKEND_URL}${verifyModal.order.payment_receipt}`}
                                    alt="Payment receipt"
                                    className="rounded-xl max-h-60 w-full object-contain border border-white/10"
                                    wrapperClassName="w-full"
                                    eager
                                />
                            </div>
                        )}
                        {/* Order items summary */}
                        <div className="mb-4">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Items Ordered</p>
                            {verifyModal.order.items?.map(item => (
                                <div key={item.id} className="flex justify-between text-sm text-slate-300 py-1">
                                    <span>{item.quantity}x {item.product.name}</span>
                                    <span className="text-white font-bold">{formatPriceStatic(item.unit_price * item.quantity)}</span>
                                </div>
                            ))}
                        </div>
                        {/* Customer info */}
                        <div className="flex gap-4 text-sm text-slate-400 mb-4">
                            <span>Mode: <strong className="text-white">{verifyModal.order.fulfillment_mode}</strong></span>
                            {verifyModal.order.customer_phone && (
                                <span>Phone: <strong className="text-white">{verifyModal.order.customer_phone}</strong></span>
                            )}
                        </div>

                        {verifyModal.order.fulfillment_mode === 'DELIVERY' && (
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-slate-400 mb-2">Assign Delivery Fee (If Applicable)</label>
                                <input
                                    type="number" step="0.01" min="0"
                                    value={verifyModal.fee}
                                    onChange={e => setVerifyModal({...verifyModal, fee: e.target.value})}
                                    placeholder="e.g. 5.00"
                                    className="w-full bg-dark-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                                />
                                <p className="text-xs text-slate-500 mt-2">This will be added to the customer's total.</p>
                            </div>
                        )}
                        <div className="flex gap-4">
                            <button onClick={() => setVerifyModal({open: false, order: null, fee: ''})} className="flex-1 py-3 rounded-xl bg-dark-800 text-white font-bold hover:bg-dark-700">Cancel</button>
                            <button 
                                onClick={() => {
                                    const payload = {};
                                    if (verifyModal.fee) payload.delivery_fee = verifyModal.fee;
                                    advanceOrderState(verifyModal.order.id, 'PAID', payload);
                                }} 
                                className="flex-1 py-3 rounded-xl bg-indigo-500 text-white font-bold hover:bg-indigo-400"
                            >
                                Confirm Paid
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Handoff Verification PIN Entry Modal */}
            <AnimatePresence>
                {handoffPinModal.open && (() => {
                    const currentOrder = readyForDelivery.find(o => o.id === handoffPinModal.orderId) || outForDeliveryOrders.find(o => o.id === handoffPinModal.orderId);
                    const isLocked = currentOrder?.is_locked;
                    return (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm"
                        >
                            <motion.div
                                initial={{ scale: 0.95, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 20 }}
                                className="bg-dark-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative"
                            >
                                <button
                                    onClick={() => setHandoffPinModal({ open: false, orderId: null, pin: '', loading: false })}
                                    className="absolute top-4 right-4 p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                                >
                                    <X size={18} />
                                </button>

                                <h3 className="text-xl font-bold text-white mb-2 text-center flex items-center justify-center gap-2">
                                    {isLocked ? (
                                        <>
                                            <AlertTriangle className="text-red-500 shrink-0" size={22} />
                                            <span className="text-red-500">Order Locked</span>
                                        </>
                                    ) : (
                                        "Fulfillment Handoff"
                                    )}
                                </h3>

                                {isLocked ? (
                                    <div className="space-y-4 text-center mt-4">
                                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-left">
                                            <p className="text-xs text-red-400 font-bold mb-2">⚠️ SAFETY POLICY WARNING</p>
                                            <p className="text-xs text-slate-300 leading-relaxed">
                                                Order is locked due to too many failed attempts (5/5). 
                                                {supportConfig.policy_warning}
                                            </p>
                                        </div>

                                        <button
                                            onClick={() => handleStaffManualVerify(handoffPinModal.orderId)}
                                            disabled={handoffPinModal.loading}
                                            className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg transition-all text-sm uppercase tracking-wider font-sans"
                                        >
                                            {handoffPinModal.loading ? 'Overriding...' : 'Force Manual Override'}
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-xs text-slate-400 text-center mb-6">
                                            Enter the 6-digit confirmation code provided by the customer for Order #{handoffPinModal.orderId}.
                                        </p>

                                        <div className="flex justify-center mb-6">
                                            <input
                                                type="text"
                                                maxLength="6"
                                                value={handoffPinModal.pin}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    setHandoffPinModal(prev => ({ ...prev, pin: val }));
                                                }}
                                                placeholder="000000"
                                                className="bg-dark-950 border border-white/10 rounded-xl px-4 py-3 text-center text-3xl font-black font-mono tracking-widest text-primary-500 focus:outline-none focus:border-primary-500 w-48 transition-all"
                                                autoFocus
                                            />
                                        </div>

                                        <button
                                            onClick={handleConfirmHandoffPin}
                                            disabled={handoffPinModal.loading || handoffPinModal.pin.length !== 6}
                                            className="w-full bg-primary-500 hover:bg-primary-400 disabled:opacity-50 text-dark-950 font-bold py-3 rounded-xl shadow-lg transition-all"
                                        >
                                            {handoffPinModal.loading ? 'Verifying...' : 'Verify & Complete'}
                                        </button>
                                    </>
                                )}
                            </motion.div>
                        </motion.div>
                    );
                })()}
            </AnimatePresence>

            {/* Invoice Payment Upload Modal */}
            <AnimatePresence>
                {showPaymentModal.open && showPaymentModal.invoice && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPaymentModal({ open: false, invoice: null })} className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-dark-900 border border-white/10 rounded-3xl p-6 w-full max-w-lg relative z-10 shadow-2xl">
                            <button
                                onClick={() => setShowPaymentModal({ open: false, invoice: null })}
                                className="absolute top-4 right-4 p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>

                            <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tight">Invoice Settlement</h3>
                            <p className="text-xs text-slate-400 mb-6">
                                Submit proof of payment for the monthly statement of {new Date(showPaymentModal.invoice.year, showPaymentModal.invoice.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}.
                            </p>

                            {/* Render active platform payment methods */}
                            {platformPaymentMethods.length > 0 && (
                                <div className="mb-6 space-y-3 bg-dark-950 p-4 rounded-2xl border border-white/5 text-left">
                                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500">Deposit Accounts</h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        {platformPaymentMethods.map(pm => (
                                            <div key={pm.id} className="text-xs border-b border-white/5 last:border-0 pb-2 last:pb-0">
                                                <div className="font-bold text-primary-400">{pm.provider}</div>
                                                <div className="text-slate-300 font-mono mt-0.5">Account: {pm.account_number} ({pm.account_name})</div>
                                                {pm.instructions && <div className="text-[10px] text-slate-500 italic mt-1">{pm.instructions}</div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSubmitPaymentProof} className="space-y-4">
                                <div className="text-left">
                                    <label className="text-[10px] font-black uppercase text-slate-500 mb-1.5 block">Amount Deposited</label>
                                    <input 
                                        required 
                                        type="number" step="0.01"
                                        value={paymentForm.amount}
                                        onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                        className="w-full bg-dark-950 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:border-primary-500 outline-none"
                                    />
                                </div>
                                <div className="text-left">
                                    <label className="text-[10px] font-black uppercase text-slate-500 mb-1.5 block">Transaction ID / Reference Number</label>
                                    <input 
                                        required 
                                        type="text" 
                                        placeholder="e.g. PP260522..."
                                        value={paymentForm.transactionId}
                                        onChange={e => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                                        className="w-full bg-dark-950 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:border-primary-500 outline-none"
                                    />
                                </div>
                                <div className="text-left">
                                    <label className="text-[10px] font-black uppercase text-slate-500 mb-1.5 block">Payment Screenshot / Receipt File</label>
                                    <input 
                                        required 
                                        type="file" 
                                        accept="image/*"
                                        onChange={e => setPaymentForm({ ...paymentForm, receiptScreenshot: e.target.files[0] })}
                                        className="w-full bg-dark-950 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:border-primary-500 outline-none file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-500/10 file:text-primary-500"
                                    />
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPaymentModal({ open: false, invoice: null })}
                                        className="flex-1 py-3.5 rounded-xl bg-white/5 text-white font-bold text-sm hover:bg-white/10 transition-all border border-white/5"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="flex-[2] py-3.5 rounded-xl bg-primary-500 text-dark-900 font-black text-sm hover:bg-primary-400 transition-all shadow-[0_10px_30px_rgba(249,115,22,0.3)]"
                                    >
                                        SUBMIT PAYMENT
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

const OrderCard = ({ order, markItemReadyFn, advanceOrderStateFn, onVerifyPayment, userRole, isSelected, onSelect, onOpenHandoffPinModal }) => {
    const isAwaitingPayment = order.state === 'AWAITING_PAYMENT';
    const isQueued = order.state === 'QUEUED' || order.state === 'PAID';
    const isPreparing = order.state === 'PREPARING';
    const isReadyColumn = order.state === 'READY';
    const isOutForDelivery = order.state === 'OUT_FOR_DELIVERY';

    const requiresPinToComplete = (o) => {
        return ['DELIVERY', 'PICKUP', 'TAKEAWAY'].includes(o.fulfillment_mode) &&
               (['OUT_FOR_DELIVERY', 'READY'].includes(o.state));
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className={`bg-dark-950/80 rounded-2xl p-5 border shadow-lg relative group ${isSelected ? 'ring-2 ring-primary-500 border-primary-500' : isReadyColumn ? 'border-green-500/30' : isPreparing ? 'border-primary-500/30' : isAwaitingPayment ? 'border-indigo-500/30' : 'border-white/5'}`}
        >
            {/* Selection Overlay/Checkbox */}
            <div 
                onClick={onSelect}
                className={`absolute top-3 right-3 w-6 h-6 rounded-full border-2 cursor-pointer z-10 flex items-center justify-center transition-all ${isSelected ? 'bg-primary-500 border-primary-500' : 'border-white/20 bg-black/20 opacity-0 group-hover:opacity-100'}`}
            >
                {isSelected && <CheckCircle2 size={16} className="text-dark-950" />}
            </div>

            <div className="flex justify-between items-start mb-4 text-left">
                <div>
                    <h4 className="text-xl font-black text-white">#{order.id}</h4>
                    <span className="text-xs text-primary-400 font-bold block mt-1">{formatPriceStatic(order.total_amount)} {order.delivery_fee > 0 && `(Fee: ${order.delivery_fee})`}</span>
                    {order.reservation_time && (
                        <div className="flex items-center gap-1.5 mt-2 bg-primary-500/10 text-primary-400 px-2 py-1 rounded-md border border-primary-500/20 w-fit">
                            <Calendar size={12} className="shrink-0" />
                            <span className="text-[10px] font-black uppercase tracking-tight">
                                Reserved: {new Date(order.reservation_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                {" "}(<CountdownTimer targetTime={order.reservation_time} />)
                            </span>
                        </div>
                    )}
                    {order.scheduled_time && (
                        <div className="flex items-center gap-1.5 mt-2 bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded-md border border-cyan-500/20 w-fit">
                            <Clock size={12} className="shrink-0" />
                            <span className="text-[10px] font-black uppercase tracking-tight">
                                Scheduled For: {new Date(order.scheduled_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    )}
                    <span className="text-xs text-slate-400 block mt-1">{new Date(order.created_at).toLocaleTimeString()}</span>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${order.fulfillment_mode === 'DELIVERY' ? 'bg-purple-500/20 text-purple-400' : 'bg-orange-500/20 text-orange-400'}`}>
                        {order.fulfillment_mode}
                    </span>
                    {order.delivery_location && (
                        <div className="mt-1 text-right bg-dark-900 border border-white/5 p-2 rounded-lg text-xs text-slate-300 max-w-[200px] break-words">
                            📍 {order.delivery_location} <br/> 📞 {order.customer_phone}
                        </div>
                    )}
                </div>
            </div>

            {/* Items */}
            <div className="space-y-2 mt-4 text-left">
                {order.items?.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-dark-800/50 rounded-lg p-2 border border-white/5">
                        <span className={`text-sm ${item.is_ready ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{item.quantity}x {item.product.name}</span>
                        {markItemReadyFn && isPreparing && !item.is_ready && (
                            <button onClick={() => markItemReadyFn(order.id, item.id)} className="bg-primary-500 text-dark-900 text-xs font-bold px-2 py-1 rounded">Ready</button>
                        )}
                    </div>
                ))}
            </div>

            {isAwaitingPayment && onVerifyPayment && ['ACCOUNTANT', 'SELLER', 'ADMIN'].includes(userRole) && (
                <button onClick={onVerifyPayment} className="w-full mt-4 bg-indigo-500 text-white font-bold py-2 rounded-xl">Verify Payment</button>
            )}

            {isQueued && advanceOrderStateFn && ['CHEF', 'SELLER', 'ADMIN'].includes(userRole) && (
                <button onClick={() => advanceOrderStateFn(order.id, 'PREPARING')} className="w-full mt-4 bg-dark-800 text-white font-bold py-2 rounded-xl">Start Preparing</button>
            )}

            {isPreparing && advanceOrderStateFn && ['CHEF', 'SELLER', 'ADMIN'].includes(userRole) && (
                <button onClick={() => advanceOrderStateFn(order.id, 'READY')} className="w-full mt-4 bg-primary-500 text-dark-900 font-bold py-2 rounded-xl">Mark All Ready</button>
            )}

            {isReadyColumn && advanceOrderStateFn && ['DELIVERY', 'SELLER', 'ADMIN'].includes(userRole) && order.fulfillment_mode === 'DELIVERY' && (
                <button onClick={() => advanceOrderStateFn(order.id, 'OUT_FOR_DELIVERY')} className="w-full mt-4 bg-purple-500 text-white font-bold py-2 rounded-xl">Out for Delivery</button>
            )}

            {isReadyColumn && advanceOrderStateFn && ['SELLER', 'ADMIN', 'CHEF'].includes(userRole) && order.fulfillment_mode !== 'DELIVERY' && (
                <button 
                    onClick={() => {
                        if (requiresPinToComplete(order)) {
                            onOpenHandoffPinModal(order.id);
                        } else {
                            advanceOrderStateFn(order.id, 'COMPLETED');
                        }
                    }} 
                    className="w-full mt-4 bg-green-500 text-dark-900 font-bold py-2 rounded-xl"
                >
                    Complete Order
                </button>
            )}

            {isOutForDelivery && advanceOrderStateFn && ['DELIVERY', 'SELLER', 'ADMIN'].includes(userRole) && (
                <button 
                    onClick={() => {
                        if (requiresPinToComplete(order)) {
                            onOpenHandoffPinModal(order.id);
                        } else {
                            advanceOrderStateFn(order.id, 'COMPLETED');
                        }
                    }} 
                    className="w-full mt-4 bg-green-500 text-dark-900 font-bold py-2 rounded-xl"
                >
                    Mark Delivered
                </button>
            )}
        </motion.div>
    );
}

const CountdownTimer = ({ targetTime }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const updateTimer = () => {
            const diff = new Date(targetTime) - new Date();
            if (diff <= 0) {
                setTimeLeft('Start prep now');
                return;
            }
            const hours = Math.floor(diff / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            
            const hStr = hours > 0 ? `${hours}h ` : '';
            const mStr = minutes > 0 || hours > 0 ? `${minutes}m ` : '';
            setTimeLeft(`${hStr}${mStr}${seconds}s`);
        };

        updateTimer();
        const timer = setInterval(updateTimer, 1000);
        return () => clearInterval(timer);
    }, [targetTime]);

    return <span>{timeLeft}</span>;
};

const ScheduledOrderCard = ({ order, onStartNow, onRespondReschedule }) => {
    const isPendingReschedule = order.reschedule_status === 'PENDING';
    
    return (
        <div className="bg-dark-950/80 rounded-2xl p-4 border border-white/10 shadow-lg flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-black text-white">Order #{order.id}</span>
                    <span className="bg-primary-500/10 text-primary-400 px-2 py-0.5 rounded text-[10px] font-bold border border-primary-500/20">
                        {order.fulfillment_mode}
                    </span>
                </div>
                
                <div className="space-y-1.5 text-xs text-slate-300 mb-3">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Scheduled For:</span>
                        <span className="font-bold text-white">
                            {new Date(order.scheduled_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-primary-400">
                        <span className="text-slate-500">Prep Starts In:</span>
                        <span className="font-black font-mono">
                            <CountdownTimer targetTime={order.scheduled_start_time} />
                        </span>
                    </div>
                </div>

                {isPendingReschedule && (
                    <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl mb-3 space-y-2">
                        <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider text-left">Reschedule Requested</p>
                        <p className="text-xs text-slate-200 text-left">
                            Requested Time: {new Date(order.reschedule_requested_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => onRespondReschedule(order.id, false)}
                                className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold py-1.5 rounded-lg text-[10px] uppercase transition-all"
                            >
                                Reject
                            </button>
                            <button 
                                onClick={() => onRespondReschedule(order.id, true)}
                                className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 font-bold py-1.5 rounded-lg text-[10px] uppercase transition-all"
                            >
                                Approve
                            </button>
                        </div>
                    </div>
                )}

                <div className="space-y-1 mb-4 border-t border-white/5 pt-2 max-h-24 overflow-y-auto custom-scrollbar text-left">
                    {order.items?.map(item => (
                        <div key={item.id} className="text-xs text-slate-400 flex justify-between">
                            <span>{item.quantity}x {item.product.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            <button 
                onClick={onStartNow}
                className="w-full bg-primary-500 hover:bg-primary-400 text-dark-950 font-black py-2 rounded-xl text-xs uppercase transition-all"
            >
                Start Cooking Now
            </button>
        </div>
    );
};

const LoadingSkeleton = () => <div className="bg-dark-950/50 rounded-2xl p-5 border border-white/5 animate-pulse h-40"></div>;
const EmptyState = ({ icon, text }) => <div className="flex flex-col items-center py-10 opacity-50">{icon}<p className="mt-2 font-medium">{text}</p></div>;
