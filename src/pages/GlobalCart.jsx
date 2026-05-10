import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useStore';
import { useCurrency } from '../utils/useCurrency';
import { ShoppingCart, Store, ArrowLeft, Trash2, ArrowRight } from 'lucide-react';
import OptimizedImage from '../components/OptimizedImage';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';

export default function GlobalCart() {
    const { cart, removeFromCart, setSelectedStore } = useAppStore();
    const navigate = useNavigate();
    const { formatPrice } = useCurrency();

    const safeCart = Array.isArray(cart) ? cart : [];

    // Group items by store
    const groupedCart = safeCart.reduce((acc, item) => {
        const storeId = item.store?.id || 'unknown';
        if (!acc[storeId]) {
            acc[storeId] = {
                store: item.store,
                items: [],
                total: 0
            };
        }
        acc[storeId].items.push(item);
        acc[storeId].total += item.product.price * item.quantity;
        return acc;
    }, {});

    const handleCheckoutStore = (store) => {
        triggerHaptic(hapticPatterns.medium);
        setSelectedStore(store);
        navigate('/checkout');
    };

    return (
        <div className="w-full max-w-3xl mx-auto py-8 text-white min-h-[60vh]">
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-3xl font-bold">Global Cart</h1>
                    <p className="text-slate-400 text-sm mt-1">Review your unpurchased items</p>
                </div>
            </div>

            {safeCart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                    <ShoppingCart size={64} className="text-slate-600 mb-6" />
                    <h2 className="text-2xl font-bold mb-2">Your Cart is Empty</h2>
                    <p className="text-slate-400 mb-6">Looks like you haven't added anything yet.</p>
                    <button onClick={() => navigate('/stores')} className="bg-primary-500 text-dark-950 font-bold px-6 py-3 rounded-xl transition-transform hover:-translate-y-1">
                        Browse Stores
                    </button>
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.values(groupedCart).map((group) => {
                        const store = group.store;
                        const hasStore = !!store;

                        return (
                            <div key={store?.id || 'unknown'} className="glass-dark border border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                                {store?.image_url && (
                                    <div className="absolute inset-0 -z-10 opacity-[0.03] pointer-events-none">
                                        <OptimizedImage src={store.image_url} alt="" className="w-full h-full object-cover" eager />
                                    </div>
                                )}
                                
                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                                    <div className="flex items-center gap-3">
                                        {store?.image_url ? (
                                            <OptimizedImage src={store.image_url} alt={store.name} className="w-10 h-10 rounded-xl object-cover" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                                                <Store size={20} className="text-slate-400" />
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="text-lg font-bold text-white">{hasStore ? store.name : 'Unknown Store'}</h3>
                                            <p className="text-xs text-slate-400">{group.items.length} item{group.items.length > 1 ? 's' : ''}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-6">
                                    {group.items.map((item) => (
                                        <div key={item.product.id} className="flex justify-between items-center bg-dark-900/50 p-3 rounded-2xl border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-white/5 px-3 py-1.5 rounded-lg text-sm font-bold text-white">
                                                    {item.quantity}x
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-200 line-clamp-1">{item.product.name}</p>
                                                    <p className="text-xs text-slate-500">{formatPrice(item.product.price)} each</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-primary-400 font-bold">{formatPrice(item.product.price * item.quantity)}</span>
                                                <button
                                                    onClick={() => removeFromCart(item.product.id)}
                                                    className="p-2 text-red-400/70 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-white/10 gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-400">Store Subtotal:</span>
                                        <span className="text-xl font-bold text-white">{formatPrice(group.total)}</span>
                                    </div>
                                    <button
                                        onClick={() => handleCheckoutStore(store)}
                                        disabled={!hasStore}
                                        className="w-full sm:w-auto bg-primary-500 hover:bg-primary-400 text-dark-950 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-primary-500/20 disabled:opacity-50"
                                    >
                                        Checkout this Store <ArrowRight size={18} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
