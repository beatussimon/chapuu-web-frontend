import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAppStore } from '../store/useStore';
import toast from 'react-hot-toast';
import { QrCode } from 'lucide-react';

export default function ScanHandler() {
    const [searchParams] = useSearchParams();
    const storeId = searchParams.get('store_id') || searchParams.get('store');
    const tableId = searchParams.get('table_id') || searchParams.get('table');
    const action = searchParams.get('action'); // 'review', 'reserve', or null (menu)
    const navigate = useNavigate();
    const { setSelectedStore } = useAppStore();

    useEffect(() => {
        if (!storeId) {
            toast.error("Invalid QR code — no store specified.");
            navigate('/stores');
            return;
        }

        apiClient.get(`/stores/${storeId}/`)
            .then(res => {
                setSelectedStore(res.data);

                // Save table context if provided
                if (tableId) {
                    localStorage.setItem('scanned_table_id', tableId);
                    localStorage.setItem('scanned_table_time', Date.now().toString());
                } else {
                    const scanTime = localStorage.getItem('scanned_table_time');
                    if (scanTime) {
                        const elapsed = Date.now() - parseInt(scanTime, 10);
                        if (elapsed > 4 * 60 * 60 * 1000) { // 4 hours
                            localStorage.removeItem('scanned_table_id');
                            localStorage.removeItem('scanned_table_time');
                        }
                    }
                }

                // Route based on action
                switch (action) {
                    case 'review':
                        toast.success(`Leave a review for ${res.data.name}!`);
                        navigate('/menu?tab=reviews');
                        break;
                    case 'reserve':
                        toast.success(`Make a reservation at ${res.data.name}!`);
                        navigate('/reserve');
                        break;
                    default:
                        toast.success(`Welcome to ${res.data.name}!`);
                        navigate('/menu');
                        break;
                }
            })
            .catch(err => {
                toast.error("Could not load store from QR code.");
                navigate('/stores');
            });
    }, [storeId, tableId, action, navigate, setSelectedStore]);

    return (
        <div className="flex justify-center items-center h-[calc(100vh-200px)] px-4">
            <div className="glass-dark border border-white/10 p-8 rounded-3xl max-w-sm w-full text-center flex flex-col items-center gap-6 animate-pulse shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400">
                    <QrCode size={32} className="animate-pulse" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-wide">Syncing Scan Details</h3>
                    <p className="text-slate-400 text-sm font-medium">
                        {action === 'review' ? 'Opening review portal...' :
                            action === 'reserve' ? 'Opening VIP reservations...' :
                                'Loading your digital menu...'}
                    </p>
                </div>
                <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                    <div className="absolute top-0 bottom-0 left-0 bg-primary-500 w-1/2 rounded-full animate-pulse"></div>
                </div>
            </div>
        </div>
    );
}

