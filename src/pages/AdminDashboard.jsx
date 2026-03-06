import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Store, Users, UserPlus, Home, Save, BarChart3, TrendingUp, DollarSign, ListOrdered } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';
import apiClient from '../api/client';
import { useCurrency } from '../utils/useCurrency';

export default function AdminDashboard() {
    const [stores, setStores] = useState([]);
    const [users, setUsers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [selectedOwner, setSelectedOwner] = useState('');
    const { formatPrice } = useCurrency();

    // Dashboard View State
    const [activeTab, setActiveTab] = useState('MANAGEMENT'); // 'MANAGEMENT' or 'ANALYTICS'

    // New Seller Form State
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
    const [editStoreData, setEditStoreData] = useState({ name: '', location: '', contact_phone: '', contact_email: '' });
    const [editStoreImage, setEditStoreImage] = useState(null);

    const fetchData = () => {
        apiClient.get('/stores/')
            .then(res => setStores(res.data))
            .catch(err => console.error("Failed to load stores", err));

        apiClient.get('/users/')
            .then(res => setUsers(res.data))
            .catch(err => console.error("Failed to load users", err));

        apiClient.get('/orders/')
            .then(res => setOrders(res.data))
            .catch(err => console.error("Failed to load orders", err));
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleCreateSeller = (e) => {
        e.preventDefault();
        apiClient.post('/users/', {
            username: newUsername,
            password: newPassword,
            role: 'SELLER'
        })
            .then(res => {
                toast.success(`Seller ${newUsername} created successfully!`);
                setNewUsername('');
                setNewPassword('');
                fetchData();
            })
            .catch(err => toast.error("Failed to create seller user."));
    };

    const handleCreateStore = (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('name', newStoreName);
        formData.append('location', newStoreAddress);
        formData.append('owner', selectedOwner);
        formData.append('store_type', newStoreType);
        formData.append('is_active', true);
        if (newContactPhone) formData.append('contact_phone', newContactPhone);
        if (newContactEmail) formData.append('contact_email', newContactEmail);
        if (newStoreImage) formData.append('image', newStoreImage);

        apiClient.post('/stores/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
            .then(res => {
                toast.success(`Store ${newStoreName} created!`);
                setNewStoreName('');
                setNewStoreAddress('');
                setNewContactPhone('');
                setNewContactEmail('');
                setNewStoreImage(null);
                setNewStoreType('RESTAURANT');
                setSelectedOwner('');
                fetchData();
            })
            .catch(err => toast.error("Failed to create store."));
    };

    const handleUpdateStore = (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('name', editStoreData.name);
        formData.append('location', editStoreData.location);
        formData.append('contact_phone', editStoreData.contact_phone);
        formData.append('contact_email', editStoreData.contact_email);
        if (editStoreImage) {
            formData.append('image', editStoreImage);
        }

        apiClient.patch(`/stores/${editingStore.id}/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
            .then(res => {
                toast.success(`Store updated!`);
                setEditingStore(null);
                setEditStoreImage(null);
                fetchData();
            })
            .catch(err => toast.error("Failed to update store."));
    };

    const sellers = users.filter(u => u.role === 'SELLER' || u.role === 'ADMIN');

    return (
        <div className="w-full min-h-screen py-6 px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
                    <Shield className="text-purple-500" /> Platform Admin Center
                </h1>

                <div className="flex bg-dark-900 border border-white/10 rounded-xl p-1">
                    <button
                        onClick={() => setActiveTab('MANAGEMENT')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'MANAGEMENT' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Store size={16} /> Management
                    </button>
                    <button
                        onClick={() => setActiveTab('ANALYTICS')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'ANALYTICS' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        <BarChart3 size={16} /> Advanced Analytics
                    </button>
                </div>
            </div>

            {activeTab === 'MANAGEMENT' ? (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        {/* Onboard User Board */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-dark border border-white/5 rounded-3xl p-6">
                            <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2"><UserPlus className="text-blue-400" /> Mint Vendor Account</h2>

                            <form onSubmit={handleCreateSeller} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Temporary Username</label>
                                    <input
                                        type="text"
                                        required
                                        value={newUsername}
                                        onChange={e => setNewUsername(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Temporary Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors">
                                    Provision Seller Account
                                </button>
                            </form>
                        </motion.div>

                        {/* Create Store Board */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-dark border border-white/5 rounded-3xl p-6">
                            <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2"><Store className="text-green-400" /> Register New Store</h2>

                            <form onSubmit={handleCreateStore} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Store Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={newStoreName}
                                        onChange={e => setNewStoreName(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-green-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Address / Location</label>
                                    <input
                                        type="text"
                                        required
                                        value={newStoreAddress}
                                        onChange={e => setNewStoreAddress(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-green-500"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Contact Phone</label>
                                        <input
                                            type="tel"
                                            value={newContactPhone}
                                            onChange={e => setNewContactPhone(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-green-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Contact Email</label>
                                        <input
                                            type="email"
                                            value={newContactEmail}
                                            onChange={e => setNewContactEmail(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-green-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Store Profile Image</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => setNewStoreImage(e.target.files[0])}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-green-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-500/10 file:text-green-500 hover:file:bg-green-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Assign to Vendor</label>
                                    <select
                                        required
                                        value={selectedOwner}
                                        onChange={e => setSelectedOwner(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-green-500"
                                    >
                                        <option value="" disabled>Select User</option>
                                        {sellers.map(s => (
                                            <option key={s.id} value={s.id}>{s.username} (ID: {s.id})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Store Type</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setNewStoreType('RESTAURANT')}
                                            className={`py-2 px-4 rounded-xl text-sm font-medium transition-colors ${newStoreType === 'RESTAURANT' ? 'bg-primary-500 text-dark-950' : 'bg-black/20 border border-white/10 text-slate-400 hover:text-white'}`}
                                        >
                                            🍽️ Restaurant
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewStoreType('SHOP')}
                                            className={`py-2 px-4 rounded-xl text-sm font-medium transition-colors ${newStoreType === 'SHOP' ? 'bg-purple-500 text-white' : 'bg-black/20 border border-white/10 text-slate-400 hover:text-white'}`}
                                        >
                                            🛍️ Shop
                                        </button>
                                    </div>
                                </div>
                                <button type="submit" className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors">
                                    Launch Store Instances
                                </button>
                            </form>
                        </motion.div>
                    </div>

                    <div className="glass-dark border border-white/5 rounded-3xl p-6">
                        <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2"><Home className="text-purple-400" /> Active Platform Tenants</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {stores.map(s => (
                                <div key={s.id} className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:border-purple-500/50 transition-colors flex flex-col">
                                    {s.image_url && (
                                        <img src={s.image_url} alt={s.name} className="w-full h-32 object-cover rounded-xl mb-3 border border-white/5" />
                                    )}
                                    <h3 className="font-bold text-lg mb-1">{s.name}</h3>
                                    <p className="text-sm text-slate-400 mb-1">{s.address}</p>
                                    <p className="text-xs text-slate-500 mb-3">{s.contact_phone} | {s.contact_email}</p>
                                    <div className="flex justify-between items-center text-xs mt-auto pt-2 border-t border-white/5">
                                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-md">Live Platform Node</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-500">Owner ID: {s.owner}</span>
                                            <button
                                                onClick={() => {
                                                    setEditingStore(s);
                                                    setEditStoreData({ name: s.name, location: s.location, contact_phone: s.contact_phone || '', contact_email: s.contact_email || '' });
                                                }}
                                                className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-md hover:bg-blue-500/30 transition-colors"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass-dark border border-white/5 rounded-3xl p-6 mt-8">
                        <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">Global Live Orders</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="bg-white/5 text-slate-400">
                                    <tr>
                                        <th className="p-4 rounded-tl-xl font-medium">Order ID</th>
                                        <th className="p-4 font-medium">Store</th>
                                        <th className="p-4 font-medium">Total Amount</th>
                                        <th className="p-4 font-medium">Status</th>
                                        <th className="p-4 rounded-tr-xl font-medium">Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.slice(0, 15).map(o => (
                                        <tr key={o.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="p-4 font-mono text-primary-400">#{o.id.toString().padStart(4, '0')}</td>
                                            <td className="p-4">{stores.find(s => s.id === o.store)?.name || o.store}</td>
                                            <td className="p-4">{formatPrice(o.total_amount)}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 bg-white/10 rounded-lg text-xs font-semibold
                                            ${o.state === 'CANCELLED' ? 'text-red-400' : ''}
                                            ${o.state === 'COMPLETED' ? 'text-green-400' : ''}
                                            ${o.state === 'AWAITING_PAYMENT' ? 'text-orange-400' : ''}
                                            ${o.state === 'PREPARING' || o.state === 'QUEUED' ? 'text-indigo-400' : ''}
                                            ${o.state === 'READY' ? 'text-teal-400' : ''}
                                        `}>
                                                    {o.state.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-500">{new Date(o.created_at).toLocaleTimeString()}</td>
                                        </tr>
                                    ))}
                                    {orders.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="p-8 text-center text-slate-500">No recent platform orders found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex flex-col gap-6">
                    {/* Key Metrics Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="glass-dark border border-white/5 rounded-3xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <p className="text-slate-400 text-sm font-medium mb-1">Total Platform Volume</p>
                                    <h3 className="text-4xl font-bold text-white mb-2">
                                        {formatPrice(orders.filter(o => o.state === 'COMPLETED').reduce((sum, o) => sum + parseFloat(o.total_amount), 0))}
                                    </h3>
                                    <div className="flex items-center gap-1 text-xs text-green-400 font-medium">
                                        <TrendingUp size={14} /> +All Time
                                    </div>
                                </div>
                                <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl">
                                    <DollarSign size={24} />
                                </div>
                            </div>
                        </div>

                        <div className="glass-dark border border-white/5 rounded-3xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <p className="text-slate-400 text-sm font-medium mb-1">Total Orders</p>
                                    <h3 className="text-4xl font-bold text-white mb-2">
                                        {orders.length}
                                    </h3>
                                    <div className="flex items-center gap-1 text-xs text-blue-400 font-medium tracking-wide border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 rounded-md">
                                        Lifetime Orders
                                    </div>
                                </div>
                                <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
                                    <ListOrdered size={24} />
                                </div>
                            </div>
                        </div>

                        <div className="glass-dark border border-white/5 rounded-3xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <p className="text-slate-400 text-sm font-medium mb-1">Active Tenants</p>
                                    <h3 className="text-4xl font-bold text-white mb-2">
                                        {stores.filter(s => s.is_active).length}
                                    </h3>
                                    <div className="flex items-center gap-1 text-xs text-orange-400 font-medium tracking-wide">
                                        Operating Across Platform
                                    </div>
                                </div>
                                <div className="p-3 bg-orange-500/20 text-orange-400 rounded-xl">
                                    <Home size={24} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="glass-dark border border-white/5 rounded-3xl p-6 h-[400px]">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><TrendingUp size={18} className="text-purple-400" /> Revenue vs Order Volume (Last 10 Orders)</h3>
                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={orders.slice(0, 10).reverse().map(o => ({
                                    name: `#${o.id}`,
                                    revenue: parseFloat(o.total_amount),
                                    items: o.items?.length || 1
                                }))}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatPrice(value)} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                        itemStyle={{ color: '#e2e8f0' }}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="glass-dark border border-white/5 rounded-3xl p-6 h-[400px]">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Store size={18} className="text-blue-400" /> Gross Merchandise Value (GMV) by Store</h3>
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={stores.map(s => {
                                    const storeOrders = orders.filter(o => o.store === s.id && o.state === 'COMPLETED');
                                    const revenue = storeOrders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
                                    return { name: s.name, GMV: revenue };
                                }).filter(d => d.GMV > 0)}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatPrice(value)} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                    />
                                    <Bar dataKey="GMV" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Store Modal */}
            {editingStore && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-dark-900 border border-white/10 rounded-3xl p-8 max-w-lg w-full shadow-2xl relative">
                        <h2 className="text-2xl font-bold text-white mb-6">Edit Tenant: {editingStore.name}</h2>
                        <form onSubmit={handleUpdateStore} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Store Name</label>
                                <input type="text" value={editStoreData.name} onChange={e => setEditStoreData({ ...editStoreData, name: e.target.value })} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Location</label>
                                <input type="text" value={editStoreData.location} onChange={e => setEditStoreData({ ...editStoreData, location: e.target.value })} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Contact Phone</label>
                                    <input type="text" value={editStoreData.contact_phone} onChange={e => setEditStoreData({ ...editStoreData, contact_phone: e.target.value })} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Contact Email</label>
                                    <input type="email" value={editStoreData.contact_email} onChange={e => setEditStoreData({ ...editStoreData, contact_email: e.target.value })} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Update Premium Underlay Image</label>
                                <input type="file" accept="image/*" onChange={e => setEditStoreImage(e.target.files[0])} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:bg-blue-500/10 file:text-blue-500 text-sm" />
                            </div>

                            <div className="flex gap-4 pt-4 mt-6 border-t border-white/5">
                                <button type="button" onClick={() => { setEditingStore(null); setEditStoreImage(null); }} className="flex-1 py-3 text-slate-400 hover:text-white transition-colors font-medium">Cancel</button>
                                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"><Save size={18} /> Update Tenant</button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
