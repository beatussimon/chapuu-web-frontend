import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { Plus, Edit2, Trash2, Save, X, Tag, Package, Image as ImageIcon } from 'lucide-react';
import { useCurrency } from '../../utils/useCurrency';
import toast from 'react-hot-toast';

export default function MenuBuilder() {
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const { formatPrice } = useCurrency();

    // Form logic
    const [editingCategory, setEditingCategory] = useState(null);
    const [editingProduct, setEditingProduct] = useState(null);
    const [productImageFile, setProductImageFile] = useState(null);

    const [storeId, setStoreId] = useState(null);

    const fetchData = (sid) => {
        setLoading(true);
        Promise.all([
            apiClient.get(`/categories/?store=${sid}`),
            apiClient.get(`/products/?store=${sid}`)
        ]).then(([catRes, prodRes]) => {
            setCategories(catRes.data);
            setProducts(prodRes.data);
            setLoading(false);
        }).catch(err => {
            toast.error("Failed to load catalog data");
            setLoading(false);
        });
    };

    useEffect(() => {
        apiClient.get('/stores/my_store/')
            .then(res => {
                if (res.data && res.data.id) {
                    const sid = res.data.id;
                    setStoreId(sid);
                    fetchData(sid);
                }
            })
            .catch(err => {
                setLoading(false);
                toast.error("You don't have an active store to manage.");
                console.error("Failed to load store for MenuBuilder:", err);
            });
    }, []);

    // --- Category Logic ---
    const handleSaveCategory = (e) => {
        e.preventDefault();
        const toastId = toast.loading("Saving category...");
        const payload = {
            store: storeId,
            name: editingCategory.name
        };

        const req = editingCategory.id
            ? apiClient.put(`/categories/${editingCategory.id}/`, payload)
            : apiClient.post(`/categories/`, payload);

        req.then(() => {
            toast.success("Category saved!", { id: toastId });
            setEditingCategory(null);
            if (storeId) fetchData(storeId);
        }).catch(err => toast.error("Error saving category.", { id: toastId }));
    };

    const handleDeleteCategory = (id) => {
        if (!window.confirm("Delete this category? Products in it will be uncategorized.")) return;
        apiClient.delete(`/categories/${id}/`).then(() => { if (storeId) fetchData(storeId); }).catch(() => toast.error("Failed to delete"));
    };

    // --- Product Logic ---
    const handleSaveProduct = (e) => {
        e.preventDefault();
        const toastId = toast.loading("Saving product...");

        const formData = new FormData();
        formData.append('store', storeId);
        formData.append('name', editingProduct.name);
        formData.append('description', editingProduct.description);
        formData.append('price', editingProduct.price);
        if (editingProduct.category) {
            formData.append('category', editingProduct.category);
        }
        formData.append('requires_kitchen', editingProduct.requires_kitchen);
        formData.append('is_active', editingProduct.is_active);

        if (!editingProduct.requires_kitchen && editingProduct.initial_stock) {
            formData.append('initial_stock', editingProduct.initial_stock);
        }

        if (productImageFile) {
            formData.append('image', productImageFile);
        }

        const req = editingProduct.id
            ? apiClient.patch(`/products/${editingProduct.id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
            : apiClient.post(`/products/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

        req.then(() => {
            toast.success("Product saved!", { id: toastId });
            setEditingProduct(null);
            setProductImageFile(null);
            if (storeId) fetchData(storeId);
        }).catch(err => toast.error("Error saving product.", { id: toastId }));
    };

    const handleDeleteProduct = (id) => {
        if (!window.confirm("Delete this product permanently?")) return;
        apiClient.delete(`/products/${id}/`).then(() => { if (storeId) fetchData(storeId); }).catch(() => toast.error("Failed to delete"));
    };

    if (loading) return <div className="p-8 text-white flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary-500"></div></div>;

    return (
        <div className="w-full max-w-7xl mx-auto py-8 text-white">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Menu Builder</h1>
                    <p className="text-slate-400">Create categories and products for your restaurant.</p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">

                {/* Categories Column */}
                <div className="w-full lg:w-1/3 space-y-6">
                    <div className="glass-dark border border-white/10 rounded-3xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2"><Tag className="text-primary-500" size={20} /> Categories</h2>
                            <button
                                onClick={() => setEditingCategory({ name: '' })}
                                className="bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 p-2 rounded-lg transition-colors"
                            >
                                <Plus size={18} />
                            </button>
                        </div>

                        {editingCategory && (
                            <form onSubmit={handleSaveCategory} className="mb-6 bg-dark-900 border border-primary-500/30 p-4 rounded-xl">
                                <input
                                    type="text"
                                    placeholder="Category Name"
                                    required
                                    value={editingCategory.name}
                                    onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                    className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 mb-3 text-sm focus:border-primary-500 outline-none"
                                />
                                <div className="flex gap-2">
                                    <button type="submit" className="flex-1 bg-primary-500 text-dark-900 font-bold py-2 rounded-lg text-sm">Save</button>
                                    <button type="button" onClick={() => setEditingCategory(null)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-medium py-2 rounded-lg text-sm">Cancel</button>
                                </div>
                            </form>
                        )}

                        <div className="space-y-3">
                            {categories.map(c => (
                                <div key={c.id} className="flex justify-between items-center bg-dark-900/50 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                    <span className="font-medium">{c.name}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => setEditingCategory(c)} className="text-slate-400 hover:text-white p-1"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDeleteCategory(c.id)} className="text-slate-400 hover:text-red-400 p-1"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                            {categories.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No categories yet.</p>}
                        </div>
                    </div>
                </div>

                {/* Products Column */}
                <div className="w-full lg:w-2/3 space-y-6">
                    <div className="glass-dark border border-white/10 rounded-3xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2"><Package className="text-primary-500" size={20} /> Products</h2>
                            <button
                                onClick={() => {
                                    setEditingProduct({ name: '', description: '', price: '', category: '', requires_kitchen: true, is_active: true, initial_stock: '' });
                                    setProductImageFile(null);
                                }}
                                className="bg-primary-500 hover:bg-primary-400 text-dark-900 font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-primary-500/20"
                            >
                                <Plus size={18} /> Add Product
                            </button>
                        </div>

                        {editingProduct && (
                            <form onSubmit={handleSaveProduct} className="mb-8 bg-dark-900 border border-primary-500/30 p-6 rounded-2xl shadow-xl">
                                <h3 className="text-lg font-bold mb-4">{editingProduct.id ? 'Edit Product' : 'New Product'}</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1 block">Name</label>
                                        <input type="text" required value={editingProduct.name} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1 block">Price</label>
                                        <input type="number" step="0.01" required value={editingProduct.price} onChange={e => setEditingProduct({ ...editingProduct, price: e.target.value })} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs text-slate-400 mb-1 block">Description</label>
                                        <textarea value={editingProduct.description} onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none h-20" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1 block">Category</label>
                                        <select value={editingProduct.category || ''} onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none">
                                            <option value="">No Category</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    {!editingProduct.requires_kitchen && (
                                        <div>
                                            <label className="text-xs text-slate-400 mb-1 block">Stock Quantity (Optional)</label>
                                            <input type="number" step="0.01" min="0" value={editingProduct.initial_stock || ''} onChange={e => setEditingProduct({ ...editingProduct, initial_stock: e.target.value })} className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none" placeholder="Leave empty for unlimited" />
                                        </div>
                                    )}
                                    <div className="md:col-span-2">
                                        <label className="text-xs text-slate-400 mb-1 block">Product Image</label>
                                        {editingProduct.image_url && !productImageFile && (
                                            <div className="mb-2 w-24 h-24 rounded-xl overflow-hidden border border-white/10">
                                                <img src={editingProduct.image_url} alt="Current" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={e => setProductImageFile(e.target.files[0])}
                                            className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-500/10 file:text-primary-500 hover:file:bg-primary-500/20"
                                        />
                                    </div>
                                    <div className="flex items-center gap-6 pt-6 pb-2">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                                            <input type="checkbox" checked={editingProduct.requires_kitchen} onChange={e => setEditingProduct({ ...editingProduct, requires_kitchen: e.target.checked })} className="accent-primary-500 w-4 h-4 rounded" />
                                            Send to Kitchen
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                                            <input type="checkbox" checked={editingProduct.is_active} onChange={e => setEditingProduct({ ...editingProduct, is_active: e.target.checked })} className="accent-primary-500 w-4 h-4 rounded" />
                                            Actively Available
                                        </label>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-2">
                                    <button type="button" onClick={() => setEditingProduct(null)} className="px-5 py-2 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                                    <button type="submit" className="bg-primary-500 hover:bg-primary-400 text-dark-900 px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-primary-500/20">Save Product</button>
                                </div>
                            </form>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {products.map(p => (
                                <div key={p.id} className="bg-dark-900/50 border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-colors flex flex-col">
                                    {p.image_url && (
                                        <div className="w-full h-32 mb-3 rounded-xl overflow-hidden border border-white/5">
                                            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-lg">{p.name}</h3>
                                        <span className="font-bold text-primary-400">{formatPrice(p.price)}</span>
                                    </div>
                                    <p className="text-sm text-slate-400 line-clamp-2 mb-4 flex-grow">{p.description}</p>

                                    <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-auto">
                                        <div className="flex gap-2">
                                            {p.is_active ? <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Active</span> : <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Hidden</span>}
                                            {p.requires_kitchen && <span className="bg-orange-500/20 text-orange-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Kitchen</span>}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => {
                                                setEditingProduct({
                                                    id: p.id,
                                                    name: p.name,
                                                    description: p.description,
                                                    price: p.price,
                                                    category: p.category,
                                                    requires_kitchen: p.requires_kitchen,
                                                    is_active: p.is_active,
                                                    image_url: p.image_url
                                                });
                                                setProductImageFile(null);
                                            }} className="p-2 text-slate-400 hover:text-white bg-white/5 rounded-lg"><Edit2 size={14} /></button>
                                            <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-slate-400 hover:text-red-400 bg-white/5 rounded-lg"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {products.length === 0 && <p className="text-slate-500 text-center py-8">No products yet. Click "Add Product" to start building your menu!</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
