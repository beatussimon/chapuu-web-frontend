import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '../api/client';

export const useAppStore = create(
    persist(
        (set) => ({
            cart: [],
            addToCart: (product, qty = 1) => set((state) => {
                const existing = state.cart.find(item => item.product.id === product.id);
                if (existing) {
                    return { cart: state.cart.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + qty } : i) };
                }
                return { cart: [...state.cart, { product, quantity: qty }] };
            }),
            removeFromCart: (productId) => set((state) => ({
                cart: state.cart.filter(item => item.product.id !== productId)
            })),
            clearCart: () => set({ cart: [] }),
            updateQuantity: (productId, qty) => set((state) => {
                if (qty < 1) return { cart: state.cart.filter(item => item.product.id !== productId) };
                return { cart: state.cart.map(i => i.product.id === productId ? { ...i, quantity: qty } : i) };
            }),

            // Auth
            token: null,
            userRole: null,

            login: async (username, password) => {
                const response = await apiClient.post('/token/', { username, password });
                const { access, refresh } = response.data;

                localStorage.setItem('access_token', access);
                localStorage.setItem('refresh_token', refresh);

                // Fetch real role from the backend instead of guessing from username
                const meRes = await apiClient.get('/auth/users/me/', {
                    headers: { Authorization: `Bearer ${access}` }
                });
                const role = meRes.data.role || 'CUSTOMER';

                set({ token: access, userRole: role });
                return role;
            },

            clearAuth: () => {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                set({ token: null, userRole: null });
            },

            // Multi-Vendor
            selectedStore: null,
            setSelectedStore: (store) => set({ selectedStore: store }),

            // Reservations
            activeReservation: null,
            setActiveReservation: (resId) => set({ activeReservation: resId }),
            clearActiveReservation: () => set({ activeReservation: null })
        }),
        {
            name: 'chapuu-storage',
            partialize: (state) => ({
                token: state.token,
                userRole: state.userRole,
                cart: state.cart,
                selectedStore: state.selectedStore,
                activeReservation: state.activeReservation // Keep it in local storage in case of refresh
            }),
        }
    )
);
