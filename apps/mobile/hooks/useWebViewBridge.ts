import { useEffect, useRef, useCallback } from 'react';
import { WebViewMessageEvent } from 'react-native-webview';
import { useUser } from '../context/UserContext';
import { NativeState } from '../types';

export function useWebViewBridge(
  isFocused: boolean,
  webViewRef: React.RefObject<any>,
  onStateUpdate?: (state: Partial<NativeState> | null) => void
) {
  const {
    token,
    userRole,
    cart,
    userLocation,
    savedStores,
    updateCart,
    updateUser,
    updateSavedStores,
    updateActiveOrderCount,
  } = useUser();

  const lastSyncedCart = useRef(JSON.stringify(cart));
  const lastSyncedToken = useRef(token);
  const lastSyncedRole = useRef(userRole);
  const lastSyncedLocation = useRef(JSON.stringify(userLocation));
  const lastSyncedSavedStores = useRef(JSON.stringify(savedStores));

  const updateCartRef = useRef(updateCart);
  const updateUserRef = useRef(updateUser);
  const updateSavedStoresRef = useRef(updateSavedStores);
  const updateActiveOrderCountRef = useRef(updateActiveOrderCount);
  const onStateUpdateRef = useRef(onStateUpdate);

  useEffect(() => {
    updateCartRef.current = updateCart;
    updateUserRef.current = updateUser;
    updateSavedStoresRef.current = updateSavedStores;
    updateActiveOrderCountRef.current = updateActiveOrderCount;
    onStateUpdateRef.current = onStateUpdate;
  }, [updateCart, updateUser, updateSavedStores, updateActiveOrderCount, onStateUpdate]);

  useEffect(() => {
    if (webViewRef.current && isFocused) {
      const cartStr = JSON.stringify(cart);
      const locStr = JSON.stringify(userLocation);
      const savedStr = JSON.stringify(savedStores);

      lastSyncedCart.current = cartStr;
      lastSyncedToken.current = token;
      lastSyncedRole.current = userRole;
      lastSyncedLocation.current = locStr;
      lastSyncedSavedStores.current = savedStr;

      const stateObj = {
        state: {
          token,
          userRole,
          cart,
          userLocation,
          savedStores,
        },
      };

      setTimeout(() => {
        if (webViewRef.current) {
          webViewRef.current.postMessage(
            JSON.stringify({
              type: 'STATE_SYNC',
              payload: stateObj,
            })
          );
        }
      }, 50);
    }
  }, [token, userRole, cart, userLocation, savedStores, isFocused, webViewRef]);

  const handleMessage = useCallback((event: WebViewMessageEvent, setIsAtTop: (v: any) => void) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);

      if (message.type === 'STORAGE_UPDATE') {
        const state = message.payload?.state || null;
        if (state) {
          const incomingCartStr = JSON.stringify(state.cart);
          const incomingSavedStr = JSON.stringify(state.savedStores);
          const hasCartChanged = incomingCartStr !== lastSyncedCart.current;
          const hasSavedChanged = incomingSavedStr !== lastSyncedSavedStores.current;
          const hasTokenChanged = state.token !== lastSyncedToken.current;
          const hasRoleChanged = state.userRole !== lastSyncedRole.current;

          if (hasCartChanged && state.cart) {
            lastSyncedCart.current = incomingCartStr;
            updateCartRef.current(state.cart);
          }
          if (hasSavedChanged && state.savedStores) {
            lastSyncedSavedStores.current = incomingSavedStr;
            updateSavedStoresRef.current(state.savedStores);
          }
          if ((hasTokenChanged || hasRoleChanged) && onStateUpdateRef.current) {
            if (hasTokenChanged) lastSyncedToken.current = state.token;
            if (hasRoleChanged) lastSyncedRole.current = state.userRole;
            onStateUpdateRef.current(state);
          }
        } else if (onStateUpdateRef.current) {
          onStateUpdateRef.current(null);
        }
      } else if (message.type === 'ACTIVE_ORDERS_COUNT') {
        updateActiveOrderCountRef.current(message.payload?.count || 0);
      } else if (message.type === 'UNAUTHORIZED') {
        updateUserRef.current('CUSTOMER', null, null);
      } else if (message.type === 'SCROLL_POSITION') {
        const y = message.payload?.y ?? 0;
        const atTop = y <= 5;
        setIsAtTop((prev: boolean) => {
          if (prev !== atTop) return atTop;
          return prev;
        });
      } else if (message.type === 'ORDER_STATUS_NOTIFICATION') {
        // Notification logic should be handled by a notification service, keeping it here for continuity 
        const { orderId, state, storeName, fulfillmentMode } = message.payload;
        // ... omitted logic, keeping this hook scoped to pure bridge parsing for now, 
        // will integrate proper notifications later.
        console.log("Status update:", orderId, state);
      }
    } catch (e) {
      // Ignored
    }
  }, []);

  return { handleMessage };
}
