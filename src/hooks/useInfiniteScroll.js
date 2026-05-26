import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../api/client';

export default function useInfiniteScroll(endpoint, params = {}) {
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState(null);

    const prevParamsStrRef = useRef('');
    const prevEndpointRef = useRef('');

    const reset = useCallback(() => {
        setItems([]);
        setPage(1);
        setHasMore(true);
        setError(null);
    }, []);

    const paramsStr = JSON.stringify(params);

    // Reset when endpoint or parameters change
    useEffect(() => {
        if (prevEndpointRef.current !== endpoint || prevParamsStrRef.current !== paramsStr) {
            prevEndpointRef.current = endpoint;
            prevParamsStrRef.current = paramsStr;
            reset();
        }
    }, [endpoint, paramsStr, reset]);

    const fetchPage = useCallback(async (pageToFetch, isLoadMore = false) => {
        if (isLoadMore) {
            setIsLoadingMore(true);
        } else {
            setIsLoading(true);
        }
        setError(null);

        try {
            const response = await apiClient.get(endpoint, {
                params: {
                    ...params,
                    page: pageToFetch
                }
            });

            // Handle both paginated response structure and raw arrays (for fallback)
            const data = response.data;
            let newItems = [];
            let nextHasMore = false;

            if (data && typeof data === 'object' && 'results' in data) {
                newItems = Array.isArray(data.results) ? data.results : [];
                nextHasMore = !!data.next;
            } else if (Array.isArray(data)) {
                newItems = data;
                nextHasMore = false;
            }

            setItems(prev => isLoadMore ? [...prev, ...newItems] : newItems);
            setHasMore(nextHasMore);
            setPage(pageToFetch);
        } catch (err) {
            setError(err);
            console.error(`Error fetching page ${pageToFetch} from ${endpoint}:`, err);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [endpoint, paramsStr, params]);

    // Trigger initial load when reset clears items
    useEffect(() => {
        if (items.length === 0 && hasMore && !isLoading && !isLoadingMore) {
            fetchPage(1, false);
        }
    }, [items.length, hasMore, isLoading, isLoadingMore, fetchPage]);

    const loadMore = useCallback(() => {
        if (hasMore && !isLoading && !isLoadingMore) {
            fetchPage(page + 1, true);
        }
    }, [hasMore, isLoading, isLoadingMore, page, fetchPage]);

    const refresh = useCallback(() => {
        reset();
    }, [reset]);

    return {
        items,
        loadMore,
        hasMore,
        isLoading,
        isLoadingMore,
        error,
        refresh
    };
}
