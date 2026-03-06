import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCurrency } from '../utils/useCurrency';
import { Package, Plus, Minus, Power, AlertTriangle, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../api/client';

export default function InventoryDashboard() {
    const [inventory, setInventory] = useState([]);
    const [products, setProducts] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    const [recipes, setRecipes] = useState([]);
    const [activeTab, setActiveTab] = useState('stock'); // 'stock' or 'recipes'
    const [search, setSearch] = useState('');
    const [storeId, setStoreId] = useState(null);
    const { formatPrice } = useCurrency();

    const [newIngredient, setNewIngredient] = useState({ name: '', unit_of_measure: '', image: null });
    const [newRecipe, setNewRecipe] = useState({ product: '', ingredient: '', quantity_required: '' });

    const fetchData = () => {
        apiClient.get('/stores/')
            .then(res => {
                if (res.data.length > 0) setStoreId(res.data[0].id);
            });

        apiClient.get('/inventory/')
            .then(res => setInventory(res.data))
            .catch(err => console.error("Failed to load inventory:", err));

        apiClient.get('/products/')
            .then(res => setProducts(res.data))
            .catch(err => console.error("Failed to load products:", err));

        apiClient.get('/ingredients/')
            .then(res => setIngredients(res.data))
            .catch(err => console.error("Failed to load ingredients:", err));

        apiClient.get('/recipes/')
            .then(res => setRecipes(res.data))
            .catch(err => console.error("Failed to load recipes:", err));
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleAdjustStock = (stockId, adjustment) => {
        apiClient.post(`/inventory/${stockId}/adjust/`, { adjustment })
            .then(res => {
                toast.success(`Stock adjusted by ${adjustment > 0 ? '+' : ''}${adjustment}`);
                fetchData();
            })
            .catch(err => toast.error(err.response?.data?.error || "Failed to adjust stock"));
    };

    const handleToggleProduct = (productId) => {
        apiClient.post(`/products/${productId}/toggle_status/`)
            .then(res => {
                toast.success(res.data.is_active ? "Product is now Active" : "Product marked Out-of-Stock");
                fetchData();
            })
            .catch(err => toast.error("Failed to toggle product status"));
    };

    const handleCreateIngredient = (e) => {
        e.preventDefault();
        if (!storeId) {
            toast.error("No store active for this user.");
            return;
        }

        const formData = new FormData();
        formData.append('name', newIngredient.name);
        formData.append('unit_of_measure', newIngredient.unit_of_measure);
        formData.append('store', storeId);
        if (newIngredient.image) {
            formData.append('image', newIngredient.image);
        }

        apiClient.post('/ingredients/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
            .then(res => {
                toast.success('Ingredient created!');
                setNewIngredient({ name: '', unit_of_measure: '', image: null });
                fetchData();
            })
            .catch(err => toast.error('Failed to create ingredient'));
    };

    const handleCreateRecipe = (e) => {
        e.preventDefault();
        apiClient.post('/recipes/', newRecipe)
            .then(res => {
                toast.success('Recipe linked!');
                setNewRecipe({ product: '', ingredient: '', quantity_required: '' });
                fetchData();
            })
            .catch(err => toast.error('Failed to link recipe'));
    };

    const handleDeleteRecipe = (id) => {
        apiClient.delete(`/recipes/${id}/`)
            .then(() => {
                toast.success('Recipe unlinked');
                fetchData();
            })
            .catch(err => toast.error('Failed to unlink recipe'));
    };

    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    const filteredInventory = inventory.filter(i =>
        (i.product_name && i.product_name.toLowerCase().includes(search.toLowerCase())) ||
        (i.ingredient_name && i.ingredient_name.toLowerCase().includes(search.toLowerCase()))
    );
    const filteredIngredients = ingredients.filter(ing => ing.name.toLowerCase().includes(search.toLowerCase()));
    const filteredRecipesProducts = products.filter(p =>
        recipes.some(r => r.product === p.id) &&
        (p.name.toLowerCase().includes(search.toLowerCase()) || recipes.some(r => r.product === p.id && r.ingredient_name && r.ingredient_name.toLowerCase().includes(search.toLowerCase())))
    );

    return (
        <div className="w-full min-h-screen py-6 px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h1 className="text-3xl font-bold flex items-center gap-3"><Package className="text-orange-500" /> Stock Management</h1>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search items..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:border-orange-500"
                    />
                </div>
            </div>

            <div className="flex gap-4 mb-6 border-b border-white/10 pb-4 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('stock')}
                    className={`px-6 py-2 rounded-xl font-medium transition-colors whitespace-nowrap ${activeTab === 'stock' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
                >
                    Stock & Availability
                </button>
                <button
                    onClick={() => setActiveTab('recipes')}
                    className={`px-6 py-2 rounded-xl font-medium transition-colors whitespace-nowrap ${activeTab === 'recipes' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
                >
                    Ingredients & Recipes
                </button>
            </div>

            {activeTab === 'stock' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Product Availability Toggle */}
                    <div className="glass-dark border border-white/5 rounded-3xl p-6">
                        <h2 className="text-xl font-bold mb-4 text-white flex justify-between items-center">
                            Menu Availability
                            <span className="text-sm font-normal text-slate-400">Toggle Out-of-Stock</span>
                        </h2>

                        <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                            {filteredProducts.map(p => (
                                <motion.div layout key={p.id} className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${p.is_active ? 'bg-white/5 border-white/10' : 'bg-red-500/10 border-red-500/30'}`}>
                                    <div>
                                        <h3 className={`font-semibold ${!p.is_active && 'text-red-400 line-through'}`}>{p.name}</h3>
                                        <p className="text-sm text-slate-400">{formatPrice(p.price)}</p>
                                    </div>

                                    <button
                                        onClick={() => handleToggleProduct(p.id)}
                                        className={`p-3 rounded-xl flex items-center gap-2 transition-all ${p.is_active ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-red-500/30 text-red-400 hover:bg-red-500/40'}`}
                                    >
                                        <Power size={18} />
                                        {p.is_active ? 'Active' : 'Disabled'}
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Raw Inventory Counts */}
                    <div className="glass-dark border border-white/5 rounded-3xl p-6">
                        <h2 className="text-xl font-bold mb-4 text-white flex justify-between items-center">
                            Physical Stock Counts
                            <span className="text-sm font-normal text-slate-400">Restock / Waste</span>
                        </h2>

                        <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                            {filteredInventory.map(inv => {
                                const isLow = inv.quantity <= inv.low_stock_threshold;
                                return (
                                    <motion.div layout key={inv.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border ${isLow ? 'bg-orange-500/10 border-orange-500/30' : 'bg-white/5 border-white/10'}`}>
                                        <div className="mb-3 sm:mb-0">
                                            <h3 className="font-semibold">{inv.product_name || inv.ingredient_name}</h3>
                                            <p className="text-sm text-slate-400">Tracking: {inv.product ? 'End Product' : 'Raw Ingredient'}</p>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col items-end mr-2">
                                                <span className={`text-xl font-bold ${isLow ? 'text-orange-400' : 'text-primary-400'}`}>{parseFloat(inv.quantity).toFixed(0)}</span>
                                                {isLow && <span className="text-xs text-orange-400 flex items-center gap-1"><AlertTriangle size={12} /> Low Stock!</span>}
                                            </div>

                                            <div className="flex items-center bg-black/40 rounded-lg overflow-hidden border border-white/10">
                                                <button onClick={() => handleAdjustStock(inv.id, -1)} className="p-2 hover:bg-white/10 text-red-400 transition-colors"><Minus size={16} /></button>
                                                <button onClick={() => handleAdjustStock(inv.id, -10)} className="px-2 py-2 hover:bg-white/10 text-red-400 text-xs font-bold border-x border-white/5 transition-colors">-10</button>
                                                <button onClick={() => handleAdjustStock(inv.id, 10)} className="px-2 py-2 hover:bg-white/10 text-green-400 text-xs font-bold border-r border-white/5 transition-colors">+10</button>
                                                <button onClick={() => handleAdjustStock(inv.id, 1)} className="p-2 hover:bg-white/10 text-green-400 transition-colors"><Plus size={16} /></button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                            {filteredInventory.length === 0 && (
                                <div className="text-center py-10 text-slate-500">No inventory tracked items found.</div>
                            )}
                        </div>
                    </div>

                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Ingredients Column */}
                    <div className="flex flex-col gap-6">
                        <div className="glass-dark border border-white/5 rounded-3xl p-6">
                            <h2 className="text-xl font-bold mb-4 text-white">Create Ingredient</h2>
                            <form onSubmit={handleCreateIngredient} className="flex flex-col gap-4">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <input
                                        type="text"
                                        placeholder="Name (e.g. Flour)"
                                        required
                                        value={newIngredient.name}
                                        onChange={e => setNewIngredient({ ...newIngredient, name: e.target.value })}
                                        className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Unit (e.g. kg)"
                                        required
                                        value={newIngredient.unit_of_measure}
                                        onChange={e => setNewIngredient({ ...newIngredient, unit_of_measure: e.target.value })}
                                        className="w-32 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                                    />
                                </div>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => setNewIngredient({ ...newIngredient, image: e.target.files[0] })}
                                        className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-500/10 file:text-orange-500 hover:file:bg-orange-500/20 text-sm"
                                    />
                                    <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-xl transition-colors font-medium h-full min-h-[44px]">Add</button>
                                </div>
                            </form>
                        </div>

                        <div className="glass-dark border border-white/5 rounded-3xl p-6">
                            <h2 className="text-xl font-bold mb-4 text-white">Ingredient Database</h2>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                {filteredIngredients.map(ing => (
                                    <div key={ing.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                                        {ing.image ? (
                                            <img src={ing.image} alt={ing.name} className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-dark-900 border border-white/10 flex items-center justify-center">
                                                <Package size={16} className="text-slate-500" />
                                            </div>
                                        )}
                                        <div className="flex-1 flex justify-between items-center">
                                            <span className="font-semibold">{ing.name}</span>
                                            <span className="text-sm px-2 py-1 bg-black/40 rounded-lg text-slate-400">{ing.unit_of_measure}</span>
                                        </div>
                                    </div>
                                ))}
                                {filteredIngredients.length === 0 && <p className="text-center text-slate-500 py-4">No ingredients match search.</p>}
                            </div>
                        </div>
                    </div>

                    {/* Recipes Column */}
                    <div className="flex flex-col gap-6">
                        <div className="glass-dark border border-white/5 rounded-3xl p-6">
                            <h2 className="text-xl font-bold mb-4 text-white">Map Recipe (BOM)</h2>
                            <form onSubmit={handleCreateRecipe} className="flex flex-col gap-4">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <select required value={newRecipe.product} onChange={e => setNewRecipe({ ...newRecipe, product: e.target.value })} className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500">
                                        <option value="" disabled>Select Product...</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <select required value={newRecipe.ingredient} onChange={e => setNewRecipe({ ...newRecipe, ingredient: e.target.value })} className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500">
                                        <option value="" disabled>Select Ingredient...</option>
                                        {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit_of_measure})</option>)}
                                    </select>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Qty"
                                        required
                                        value={newRecipe.quantity_required}
                                        onChange={e => setNewRecipe({ ...newRecipe, quantity_required: e.target.value })}
                                        className="w-24 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500"
                                    />
                                    <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl transition-colors font-medium">Link</button>
                                </div>
                            </form>
                        </div>

                        <div className="glass-dark border border-white/5 rounded-3xl p-6">
                            <h2 className="text-xl font-bold mb-4 text-white">Active Product Recipes</h2>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                {filteredRecipesProducts.map(product => (
                                    <div key={product.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                                        <h3 className="font-bold text-primary-400 mb-3 border-b border-white/10 pb-2">{product.name}</h3>
                                        <div className="space-y-2">
                                            {recipes.filter(r => r.product === product.id).map(recipe => (
                                                <div key={recipe.id} className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-300">• {recipe.quantity_required} {recipe.unit_of_measure} of {recipe.ingredient_name}</span>
                                                    <button onClick={() => handleDeleteRecipe(recipe.id)} className="text-red-400 hover:text-red-300 p-1"><Minus size={14} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {filteredRecipesProducts.length === 0 && <p className="text-center text-slate-500 py-4">No matching recipes mapped.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
