import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function PaginationControls({ page, totalPages, onPageChange, isLoading }) {
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 mt-4 glass-dark border border-white/5 rounded-2xl">
            {/* Mobile layout */}
            <div className="flex flex-1 justify-between sm:hidden">
                <button
                    disabled={page <= 1 || isLoading}
                    onClick={() => onPageChange(page - 1)}
                    className="relative inline-flex items-center rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    Previous
                </button>
                <span className="text-xs font-mono font-bold text-slate-400 self-center">
                    Page {page} of {totalPages}
                </span>
                <button
                    disabled={page >= totalPages || isLoading}
                    onClick={() => onPageChange(page + 1)}
                    className="relative ml-3 inline-flex items-center rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    Next
                </button>
            </div>
            
            {/* Desktop/Tablet layout */}
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-bold text-slate-400">
                        Showing page <span className="font-mono text-white">{page}</span> of{' '}
                        <span className="font-mono text-white">{totalPages}</span>
                    </p>
                </div>
                <div>
                    <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm gap-1" aria-label="Pagination">
                        <button
                            disabled={page <= 1 || isLoading}
                            onClick={() => onPageChange(page - 1)}
                            className="relative inline-flex items-center rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum = i + 1;
                            if (page > 3 && totalPages > 5) {
                                if (page + 2 <= totalPages) {
                                    pageNum = page - 2 + i;
                                } else {
                                    pageNum = totalPages - 5 + i + 1;
                                }
                            }
                            return (
                                <button
                                    key={pageNum}
                                    disabled={isLoading}
                                    onClick={() => onPageChange(pageNum)}
                                    className={`relative inline-flex items-center rounded-xl px-3 py-2 text-xs font-bold font-mono transition-all border ${
                                        page === pageNum
                                            ? 'bg-primary-500 text-dark-950 border-primary-500 shadow-md shadow-primary-500/25 font-black'
                                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}

                        <button
                            disabled={page >= totalPages || isLoading}
                            onClick={() => onPageChange(page + 1)}
                            className="relative inline-flex items-center rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </nav>
                </div>
            </div>
        </div>
    );
}
