import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAppStore } from '../store/useStore';
import toast from 'react-hot-toast';

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
                } else {
                    localStorage.removeItem('scanned_table_id');
                }

                // Route based on action
                switch (action) {
                    case 'review':
                        toast.success(`Leave a review for ${res.data.name}!`);
                        navigate('/orders'); // Goes to orders page which has review links
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
        <div className="flex justify-center flex-col items-center h-[calc(100vh-200px)]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mb-4"></div>
            <p className="text-slate-400">
                {action === 'review' ? 'Opening review...' :
                    action === 'reserve' ? 'Opening reservations...' :
                        'Loading your menu...'}
            </p>
        </div>
    );
}
