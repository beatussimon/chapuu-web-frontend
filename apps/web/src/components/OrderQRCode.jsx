import { QRCodeSVG } from 'qrcode.react';

export default function OrderQRCode({ orderId, status = "RECEIVED" }) {

    // In production, this would be a secure, verifiable token mapping to an order check endpoint
    const verificationUrl = `${window.location.origin}/verify/order/${orderId}`;

    return (
        <div className="flex flex-col items-center bg-white p-6 rounded-2xl shadow-xl border-4 border-slate-100 max-w-[300px] w-full mx-auto relative overflow-hidden">
            {/* Ticket jagged edge aesthetic */}
            <div className="absolute top-0 left-0 w-full h-3 border-t-8 border-dotted border-slate-200"></div>

            <div className="mb-4 text-center w-full">
                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-1">Receipt ID</p>
                <h3 className="text-3xl font-black text-slate-800 tracking-tighter">#{orderId}</h3>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-6 w-full">
                <QRCodeSVG
                    value={verificationUrl}
                    size={200}
                    bgColor={"#ffffff"}
                    fgColor={"#0f172a"}
                    level={"H"}
                    marginSize={1}
                    className="w-full h-auto"
                />
            </div>

            <div className="w-full text-center">
                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold mx-auto border ${status === 'READY' ? 'bg-green-100 text-green-700 border-green-200' :
                        status === 'COMPLETED' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                            'bg-yellow-100 text-yellow-700 border-yellow-200'
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${status === 'READY' ? 'bg-green-500 animate-pulse' : status === 'COMPLETED' ? 'bg-slate-400' : 'bg-yellow-500 animate-pulse'}`}></span>
                    {status}
                </div>
            </div>

            <p className="text-xs text-slate-400 font-medium text-center mt-6">Present to counter for pickup</p>
            <div className="absolute bottom-0 left-0 w-full h-3 border-b-8 border-dotted border-slate-200"></div>
        </div>
    );
}
