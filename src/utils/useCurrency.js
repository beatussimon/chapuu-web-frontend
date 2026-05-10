import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';

// In-memory cache so we don't re-fetch every component mount
let _currencyCache = null;
let _fetchPromise = null;

/**
 * Fetches currencies from the API (once, then cached).
 * Returns { currencies, defaultCurrency, formatPrice }.
 *
 * Usage:
 *   const { formatPrice } = useCurrency();
 *   <span>{formatPrice(product.price)}</span>  // "TSh 15,000"
 */
export function useCurrency() {
    const [currencies, setCurrencies] = useState(_currencyCache || []);
    const [ready, setReady] = useState(!!_currencyCache);

    useEffect(() => {
        if (_currencyCache) {
            setCurrencies(_currencyCache);
            setReady(true);
            return;
        }

        if (!_fetchPromise) {
            _fetchPromise = apiClient.get('/currencies/')
                .then(res => {
                    _currencyCache = res.data;
                    return res.data;
                })
                .catch(err => {
                    console.error("Failed to load currencies", err);
                    _fetchPromise = null; // Clear promise so we can retry on next mount
                    const fallback = [{ code: 'TZS', symbol: 'TSh', rate_to_base: '1.000000', is_default: true }];
                    return fallback;
                });
        }

        // Use the persistent promise to ensure we only wait for one request
        let isMounted = true;
        _fetchPromise.then(data => {
            if (isMounted) {
                const safeData = Array.isArray(data) ? data : [];
                setCurrencies(safeData);
                setReady(true);
            }
        });

        return () => { isMounted = false; };
    }, []);

    const currenciesArray = Array.isArray(currencies) ? currencies : [];
    const defaultCurrency = currenciesArray.find(c => c.is_default) || currenciesArray[0] || { code: 'TZS', symbol: 'TSh', rate_to_base: '1.000000' };

    /**
     * Format a price amount (stored in base currency TZS) for display.
     * @param {number|string} amount - The amount in the base currency
     * @param {string} [currencyCode] - Override display currency (default: the is_default currency)
     * @returns {string} Formatted price, e.g. "TSh 15,000" or "$ 6.00"
     */
    const formatPrice = useCallback((amount, currencyCode) => {
        const num = Number(amount);
        if (isNaN(num)) return `${defaultCurrency.symbol} 0`;

        const target = currencyCode
            ? currenciesArray.find(c => c.code === currencyCode)
            : defaultCurrency;

        if (!target) return `TSh ${num.toLocaleString()}`;

        const rate = Number(target.rate_to_base);
        // Convert from base (TZS) to target: divide by rate
        const converted = rate > 0 ? num / rate : num;

        // TZS-like currencies: no decimals; USD-like: 2 decimals
        const decimals = rate >= 10 ? 0 : 2;

        return `${target.symbol} ${converted.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        })}`;
    }, [currencies, defaultCurrency]);

    return { currencies, defaultCurrency, formatPrice, ready };
}

/**
 * Standalone (non-hook) formatter for use outside components.
 * Falls back to TZS if currencies haven't loaded yet.
 */
export function formatPriceStatic(amount) {
    const num = Number(amount);
    if (isNaN(num)) return 'TSh 0';

    if (_currencyCache) {
        const def = _currencyCache.find(c => c.is_default) || _currencyCache[0];
        if (def) {
            const rate = Number(def.rate_to_base);
            const converted = rate > 0 ? num / rate : num;
            const decimals = rate >= 10 ? 0 : 2;
            return `${def.symbol} ${converted.toLocaleString(undefined, {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            })}`;
        }
    }

    return `TSh ${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
