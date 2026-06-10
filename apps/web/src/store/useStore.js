import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient, { BACKEND_URL } from '../api/client';

export const useAppStore = create(
    persist(
        (set) => ({
            cart: [],
            addToCart: (product, qty = 1) => set((state) => {
                const safeCart = Array.isArray(state.cart) ? state.cart : [];
                const existing = safeCart.find(item => item.product.id === product.id);
                let newQty = existing ? existing.quantity + qty : qty;
                
                if (product.requires_inventory && product.stock_quantity !== null) {
                    if (newQty > product.stock_quantity) {
                        newQty = product.stock_quantity;
                        import('react-hot-toast').then(({ default: toast }) => {
                            toast.error(`Only ${product.stock_quantity} available in stock.`);
                        });
                    }
                }
                
                const storeObj = state.selectedStore;
                if (existing) {
                    return { cart: safeCart.map(i => i.product.id === product.id ? { ...i, quantity: newQty } : i) };
                }
                return { cart: [...safeCart, { product, quantity: newQty, store: storeObj }] };
            }),
            removeFromCart: (productId) => set((state) => ({
                cart: (Array.isArray(state.cart) ? state.cart : []).filter(item => item.product.id !== productId)
            })),
            clearCart: () => set({ cart: [] }),
            clearStoreCart: (storeId) => set((state) => ({
                cart: (Array.isArray(state.cart) ? state.cart : []).filter(item => item.store?.id !== storeId)
            })),
            updateQuantity: (productId, qty) => set((state) => {
                const safeCart = Array.isArray(state.cart) ? state.cart : [];
                if (qty < 1) return { cart: safeCart.filter(item => item.product.id !== productId) };
                
                const item = safeCart.find(i => i.product.id === productId);
                if (!item) return state;
                
                let newQty = qty;
                if (item.product.requires_inventory && item.product.stock_quantity !== null) {
                    if (newQty > item.product.stock_quantity) {
                        newQty = item.product.stock_quantity;
                        import('react-hot-toast').then(({ default: toast }) => {
                            toast.error(`Only ${item.product.stock_quantity} available in stock.`);
                        });
                    }
                }
                
                return { cart: safeCart.map(i => i.product.id === productId ? { ...i, quantity: newQty } : i) };
            }),

            // Auth
            token: null,
            userRole: null,

            login: async (username, password) => {
                // 1. CLEAN SLATE
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                
                // 2. NUCLEAR OPTION: Use native browser FETCH to bypass ALL axios logic/interceptors
                const response = await fetch(`${BACKEND_URL}/api/token/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || errorData.error || 'Invalid credentials');
                }

                const data = await response.json();
                const { access, refresh } = data;

                localStorage.setItem('access_token', access);
                localStorage.setItem('refresh_token', refresh);

                // 3. Fetch role and profile (using main client is safe now)
                let role = 'CUSTOMER';
                let favorites = [];
                try {
                    const meRes = await apiClient.get('/auth/users/me/');
                    role = meRes.data.role || 'CUSTOMER';
                    const rawFavorites = meRes.data.favorite_stores || [];
                    favorites = rawFavorites.map(s => typeof s === 'object' ? s.id : s);
                } catch (meErr) {
                    console.error("Profile fetch failed, defaulting to CUSTOMER", meErr);
                }

                set({ token: access, userRole: role, savedStores: favorites });
                return role;
            },

            clearAuth: () => {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                set({ token: null, userRole: null });
            },

            refreshUserRole: async () => {
                const token = localStorage.getItem('access_token');
                if (!token) return;
                try {
                    const res = await fetch(`${BACKEND_URL}/api/auth/users/me/`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        const rawFavorites = data.favorite_stores || [];
                        const favorites = rawFavorites.map(s => typeof s === 'object' ? s.id : s);
                        set({ 
                            userRole: data.role || 'CUSTOMER',
                            savedStores: favorites
                        });
                    }
                } catch (e) {
                    console.error("Failed to refresh user role", e);
                }
            },

            // Multi-Vendor
            selectedStore: null,
            setSelectedStore: (store) => set((state) => ({
                selectedStore: store
            })),

            // Reservations
            activeReservation: null,
            setActiveReservation: (resId) => set({ activeReservation: resId }),
            clearActiveReservation: () => set({ activeReservation: null }),

            // Location Slice
            userLocation: { lat: null, lng: null, name: null, granted: false },
            setUserLocation: (loc) => set((state) => ({
                userLocation: { ...state.userLocation, ...loc }
            })),
            clearUserLocation: () => set({
                userLocation: { lat: null, lng: null, name: null, granted: false }
            }),

            // Favorites Slice
            savedStores: [],
            toggleSaveStore: (storeId) => {
                let isCurrentlySaved = false;
                // Optimistic UI update
                set((state) => {
                    const safeSaved = Array.isArray(state.savedStores) ? state.savedStores : [];
                    isCurrentlySaved = safeSaved.includes(storeId);
                    if (isCurrentlySaved) {
                        return { savedStores: safeSaved.filter(id => id !== storeId) };
                    }
                    return { savedStores: [...safeSaved, storeId] };
                });
                
                // Background API Sync
                const token = localStorage.getItem('access_token');
                if (token) {
                    // Get current state to send full list
                    const stateObj = get();
                    const newSavedStores = isCurrentlySaved
                        ? stateObj.savedStores.filter(id => id !== storeId)
                        : [...stateObj.savedStores, storeId];

                    const syncPromise = apiClient.patch('/auth/users/me/', { favorite_stores: newSavedStores });
                    syncPromise.catch(err => {
                        console.error("Failed to sync favorite to backend", err);
                        // Revert optimistic update on failure
                        set((state) => {
                            const safeSaved = Array.isArray(state.savedStores) ? state.savedStores : [];
                            if (isCurrentlySaved) {
                                // Put it back if we removed it
                                const alreadyInList = safeSaved.includes(storeId);
                                return { savedStores: alreadyInList ? safeSaved : [...safeSaved, storeId] };
                            } else {
                                // Remove it if we added it
                                return { savedStores: safeSaved.filter(id => id !== storeId) };
                            }
                        });
                    });
                }
            }
        }),
        {
            name: 'chapuu-storage',
            partialize: (state) => ({
                token: state.token,
                userRole: state.userRole,
                cart: state.cart,
                selectedStore: state.selectedStore,
                activeReservation: state.activeReservation,
                userLocation: state.userLocation,
                savedStores: state.savedStores
            }),
        }
    )
);
