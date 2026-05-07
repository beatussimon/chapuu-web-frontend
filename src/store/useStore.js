import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient, { BACKEND_URL } from '../api/client';

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

                // 3. Fetch role (using main client is safe now)
                let role = 'CUSTOMER';
                try {
                    const meRes = await apiClient.get('/auth/users/me/');
                    role = meRes.data.role || 'CUSTOMER';
                } catch (meErr) {
                    console.error("Profile fetch failed, defaulting to CUSTOMER", meErr);
                }

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
            setSelectedStore: (store) => set((state) => ({
                selectedStore: store,
                cart: state.selectedStore?.id === store?.id ? state.cart : []
            })),

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
                activeReservation: state.activeReservation
            }),
        }
    )
);
