import React, { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

export default function InfiniteScrollTrigger({ loadMore, hasMore, isLoading, isLoadingMore }) {
    const triggerRef = useRef(null);

    useEffect(() => {
        const trigger = triggerRef.current;
        if (!trigger || !hasMore || isLoading || isLoadingMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadMore();
                }
            },
            { threshold: 0.1, rootMargin: '150px' } // Load slightly early for smoother scrolling
        );

        observer.observe(trigger);

        return () => {
            if (trigger) observer.unobserve(trigger);
        };
    }, [loadMore, hasMore, isLoading, isLoadingMore]);

    return (
        <div ref={triggerRef} className="w-full py-8 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
            {(isLoading || isLoadingMore) ? (
                <div className="flex items-center gap-2 text-primary-400 font-bold">
                    <Loader2 size={16} className="animate-spin text-primary-500" />
                    <span>Loading more...</span>
                </div>
            ) : !hasMore ? (
                <span className="font-mono text-slate-600 uppercase tracking-widest text-[10px]">You've reached the end</span>
            ) : (
                <span className="text-[10px] text-slate-700 animate-pulse font-mono uppercase tracking-wider">Scroll for more</span>
            )}
        </div>
    );
}
