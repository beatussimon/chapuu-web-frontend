import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, ArrowLeft, Settings, LayoutGrid, ShoppingBag, ShieldCheck, Check, Sparkles, Phone, Mail, MapPin, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StoreBrandingPrint() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [store, setStore] = useState(null);
    const [loading, setLoading] = useState(true);

    // Configuration states
    const [packagingType, setPackagingType] = useState('stickers'); // 'stickers', 'bag', 'seal'
    
    // Toggle states for element visibility
    const [showStoreName, setShowStoreName] = useState(true);
    const [showTagline, setShowTagline] = useState(true);
    const [showLogo, setShowLogo] = useState(true);
    const [showQR, setShowQR] = useState(true);
    const [showContact, setShowContact] = useState(true);
    
    // CHAPUU branding is mandatory
    const showBranding = true;
    
    // Transparent Mode toggle
    const [transparentMode, setTransparentMode] = useState(false);
    
    // Client-side Custom Logo Upload
    const [customLogoUrl, setCustomLogoUrl] = useState(null);

    const [stickerSize, setStickerSize] = useState('medium'); // 'small', 'medium', 'large'
    const [customTagline, setCustomTagline] = useState('Thank you for ordering with us!');
    const [accentColor, setAccentColor] = useState('#00b4d8'); // Default brand blue

    const storeAppUrl = window.location.origin;
    const storeMenuUrl = `${storeAppUrl}/menu?store_id=${id}`;

    useEffect(() => {
        apiClient.get(`/stores/${id}/`)
            .then(res => {
                setStore(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load store for printing:", err);
                toast.error("Failed to fetch store details");
                setLoading(false);
            });
    }, [id]);

    const handlePrint = () => {
        window.print();
    };

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/admin');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-dark-950 text-white flex items-center justify-center flex-col gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary-500"></div>
                <p className="text-slate-400 font-medium">Resolving store branding assets...</p>
            </div>
        );
    }

    if (!store) {
        return (
            <div className="min-h-screen bg-dark-950 text-white flex items-center justify-center flex-col gap-4">
                <p className="text-red-400 font-bold">Store not found</p>
                <button onClick={handleBack} className="bg-white/10 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-white/20">
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>
            </div>
        );
    }

    // Determine sticker grid items count based on size
    const getStickerCount = () => {
        if (stickerSize === 'small') return 24; // 4x6 grid
        if (stickerSize === 'medium') return 12; // 3x4 grid
        return 6; // 2x3 grid
    };

    const logoSrc = customLogoUrl || store.image_url;
    
    // Sticker layout millimeter sizing
    const sizeInMm = stickerSize === 'small' ? 40 : stickerSize === 'medium' ? 55 : 85;
    const paddingInMm = stickerSize === 'small' ? 4 : stickerSize === 'medium' ? 6 : 10;
    
    const storeNameFontSize = stickerSize === 'small' ? '9.5px' : stickerSize === 'medium' ? '12px' : '18px';
    const brandingFontSize = stickerSize === 'small' ? '6.5px' : stickerSize === 'medium' ? '8px' : '11px';
    const taglineFontSize = stickerSize === 'small' ? '6.5px' : stickerSize === 'medium' ? '8.5px' : '12px';
    
    const logoDimensionClass = stickerSize === 'small' ? 'w-5 h-5 mb-0.5' : stickerSize === 'medium' ? 'w-9 h-9 mb-1' : 'w-14 h-14 mb-1.5';
    const logoIconSize = stickerSize === 'small' ? 10 : stickerSize === 'medium' ? 14 : 22;
    const qrCodeSize = stickerSize === 'small' ? 48 : stickerSize === 'medium' ? 70 : 115;

    return (
        <div className="min-h-screen bg-dark-950 text-white flex flex-col md:flex-row print:bg-white print:text-black">
            {/* Embedded Print CSS rules to guarantee millimeter scale and prevent overlaps */}
            <style>{`
                .print-canvas {
                    width: 210mm;
                    min-height: 297mm;
                    padding: 15mm;
                    box-sizing: border-box;
                }
                .sticker-grid {
                    display: grid !important;
                    justify-items: center;
                    justify-content: center;
                    align-items: center;
                    width: 100%;
                    box-sizing: border-box;
                }
                .sticker-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    flex-shrink: 0;
                    box-sizing: border-box;
                    border-radius: 9999px;
                    overflow: hidden;
                    gap: 1.5px;
                }
                .bag-layout {
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    align-items: center;
                    text-align: center;
                    padding: 32px;
                    min-height: 260mm;
                    position: relative;
                    overflow: hidden;
                    box-sizing: border-box;
                    border-radius: 2.5rem;
                }
                @media print {
                    .print-canvas {
                        width: 210mm !important;
                        min-height: 297mm !important;
                        padding: 10mm !important;
                        box-shadow: none !important;
                        border: none !important;
                        background: transparent !important;
                    }
                    .bag-layout {
                        min-height: 0 !important;
                        height: 100% !important;
                    }
                }
            `}</style>

            {/* Options Panel (Hidden during Print) */}
            <div className="w-full md:w-80 shrink-0 bg-dark-900 border-b md:border-b-0 md:border-r border-white/5 p-6 flex flex-col no-print md:h-screen md:sticky md:top-0">
                <div className="flex items-center gap-3 mb-6">
                    <button 
                        onClick={handleBack}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
                        title="Back"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h2 className="font-bold text-lg leading-tight">Branding Hub</h2>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Packaging Designer</span>
                    </div>
                </div>

                <div className="flex-1 space-y-6 text-left overflow-y-auto pr-1">
                    {/* Store Title Badge */}
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Target Store</span>
                        <h3 className="font-black text-white mt-1 line-clamp-1">{store.name}</h3>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{store.location}</p>
                    </div>

                    {/* Packaging Types Selection */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5"><LayoutGrid size={12} /> Packaging Template</label>
                        <div className="grid grid-cols-1 gap-1.5">
                            {[
                                { id: 'stickers', name: 'Sticker Sheet (A4)', desc: 'Grid of circular seal stickers', icon: <LayoutGrid size={16} /> },
                                { id: 'bag', name: 'Paper Bag Layout', desc: 'Direct print layout for packaging bags', icon: <ShoppingBag size={16} /> },
                                { id: 'seal', name: 'Container Safety Seal', desc: 'Rectangular strip seal labels', icon: <ShieldCheck size={16} /> }
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setPackagingType(t.id)}
                                    className={`p-3 rounded-xl border flex items-center gap-3 text-left transition-all ${
                                        packagingType === t.id 
                                            ? 'bg-primary-500/10 border-primary-500 text-primary-400' 
                                            : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10 hover:text-white'
                                    }`}
                                >
                                    <div className="shrink-0">{t.icon}</div>
                                    <div className="min-w-0">
                                        <h4 className="text-xs font-bold leading-tight">{t.name}</h4>
                                        <p className="text-[9px] text-slate-500 truncate mt-0.5">{t.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Logo Upload */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5"><Upload size={12} /> Custom Brand Logo</label>
                        {customLogoUrl ? (
                            <div className="flex items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/10">
                                <img src={customLogoUrl} alt="Custom Logo" className="w-8 h-8 rounded object-cover" />
                                <span className="text-[10px] text-slate-400 flex-1 truncate">Custom logo loaded</span>
                                <button 
                                    type="button" 
                                    onClick={() => setCustomLogoUrl(null)} 
                                    className="p-1.5 hover:bg-white/10 text-red-400 hover:text-red-300 rounded-lg transition-colors cursor-pointer"
                                    title="Remove Custom Logo"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                            setCustomLogoUrl(reader.result);
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }}
                                className="w-full bg-dark-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-400 file:mr-2.5 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-black file:bg-white/10 file:text-white file:hover:bg-white/20 file:cursor-pointer outline-none"
                            />
                        )}
                    </div>

                    {/* Display Options */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5"><Settings size={12} /> Design Options</label>
                        
                        <div className="grid grid-cols-1 gap-2.5 pt-1">
                            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    checked={showStoreName}
                                    onChange={e => setShowStoreName(e.target.checked)}
                                    className="accent-primary-500 w-4 h-4 rounded"
                                />
                                Show Store Name
                            </label>

                            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    checked={showLogo}
                                    onChange={e => setShowLogo(e.target.checked)}
                                    className="accent-primary-500 w-4 h-4 rounded"
                                />
                                Render Brand Logo
                            </label>

                            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    checked={showQR}
                                    onChange={e => setShowQR(e.target.checked)}
                                    className="accent-primary-500 w-4 h-4 rounded"
                                />
                                Include Order QR Code
                            </label>

                            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    checked={showTagline}
                                    onChange={e => setShowTagline(e.target.checked)}
                                    className="accent-primary-500 w-4 h-4 rounded"
                                />
                                Include Tagline
                            </label>

                            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    checked={showContact}
                                    onChange={e => setShowContact(e.target.checked)}
                                    className="accent-primary-500 w-4 h-4 rounded"
                                />
                                Include Contact Info
                            </label>

                            <div className="h-px bg-white/5 my-1.5"></div>

                            <label className="flex items-center gap-2.5 text-xs text-amber-400 font-bold cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    checked={transparentMode}
                                    onChange={e => setTransparentMode(e.target.checked)}
                                    className="accent-amber-500 w-4 h-4 rounded"
                                />
                                Transparent Mode (PNG Prints)
                            </label>
                        </div>

                        {/* Custom Tagline input */}
                        {showTagline && (
                            <div className="space-y-1 pt-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custom Tagline</label>
                                <input 
                                    type="text"
                                    value={customTagline}
                                    onChange={e => setCustomTagline(e.target.value)}
                                    className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:border-primary-500 outline-none"
                                    placeholder="Thank you!"
                                />
                            </div>
                        )}

                        {/* Sticker Size Options (Only for Stickers) */}
                        {packagingType === 'stickers' && (
                            <div className="space-y-1.5 pt-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sticker Label Size</label>
                                <div className="grid grid-cols-3 gap-1">
                                    {['small', 'medium', 'large'].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setStickerSize(s)}
                                            className={`py-1 rounded-md text-[10px] font-bold border transition-colors capitalize ${
                                                stickerSize === s
                                                    ? 'bg-primary-500/10 border-primary-500 text-primary-400'
                                                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                                            }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Brand Theme Accent Picker */}
                        <div className="space-y-1.5 pt-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Accent Color Highlight</label>
                            <div className="flex flex-wrap gap-2 pt-1">
                                {[
                                    { id: '#00b4d8', name: 'Sky Blue' },
                                    { id: '#3f37c9', name: 'Indigo' },
                                    { id: '#7209b7', name: 'Purple' },
                                    { id: '#ec4899', name: 'Rose Pink' },
                                    { id: '#ef4444', name: 'Crimson' },
                                    { id: '#f97316', name: 'Orange' },
                                    { id: '#eab308', name: 'Gold' },
                                    { id: '#10b981', name: 'Emerald' },
                                    { id: '#06b6d4', name: 'Teal' },
                                    { id: '#4a5759', name: 'Sage' },
                                    { id: '#3f3f46', name: 'Dark Slate' },
                                    { id: '#18181b', name: 'Pitch Black' },
                                    { id: '#ff6b6b', name: 'Coral' },
                                    { id: '#c77dff', name: 'Lavender' },
                                    { id: '#70e000', name: 'Lime' },
                                    { id: '#dda15e', name: 'Clay Amber' },
                                    { id: '#1d3557', name: 'Navy Blue' }
                                ].map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => setAccentColor(c.id)}
                                        style={{ backgroundColor: c.id }}
                                        className={`w-6 h-6 rounded-full border-2 transition-transform shrink-0 cursor-pointer ${
                                            accentColor === c.id ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                                        }`}
                                        title={c.name}
                                    >
                                        {accentColor === c.id && <Check size={12} className="mx-auto text-white fill-current" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-white/5 mt-auto">
                    <button
                        onClick={handlePrint}
                        className="w-full bg-primary-500 hover:bg-primary-400 text-dark-900 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
                    >
                        <Printer size={18} /> Print Design Template
                    </button>
                </div>
            </div>

            {/* Print canvas preview pane */}
            <div className="flex-grow p-8 bg-dark-950 flex justify-center items-start overflow-y-auto no-scrollbar print:p-0 print:bg-white print:overflow-visible">
                <div className={`print-canvas ${transparentMode ? 'bg-transparent text-black' : 'bg-white text-black'} shadow-2xl rounded-[1.5rem] border border-white/5 relative print:shadow-none print:rounded-none print:border-none print:w-full print:min-h-0`}>
                    
                    {/* Sticker layout */}
                    {packagingType === 'stickers' && (
                        <div className="w-full h-full flex flex-col justify-between">
                            <div className="mb-6 flex justify-between items-center pb-3 border-b border-slate-200 no-print">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5"><Sparkles className="text-amber-500" size={16} /> A4 Stickers Sheet Preview</h3>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Prints {getStickerCount()} standard round label templates with cut boundaries.</p>
                                </div>
                                <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">{stickerSize} size</span>
                            </div>

                            <div 
                                style={{
                                    gridTemplateColumns: stickerSize === 'small' ? 'repeat(4, 1fr)' : stickerSize === 'medium' ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
                                    gap: stickerSize === 'small' ? '5mm' : stickerSize === 'medium' ? '6mm' : '10mm'
                                }}
                                className="sticker-grid"
                            >
                                {[...Array(getStickerCount())].map((_, i) => (
                                    <div 
                                        key={i} 
                                        style={{ 
                                            width: `${sizeInMm}mm`,
                                            height: `${sizeInMm}mm`,
                                            padding: `${paddingInMm}mm`,
                                            borderColor: transparentMode ? 'transparent' : accentColor,
                                            backgroundColor: transparentMode ? 'transparent' : '#ffffff',
                                            boxShadow: transparentMode ? 'none' : 'inset 0 0 8px rgba(0,0,0,0.03)'
                                        }}
                                        className="sticker-item border-2 border-dashed"
                                    >
                                        {/* Store Name */}
                                        {showStoreName && (
                                            <h4 className="font-black text-center text-slate-900 tracking-tight line-clamp-1 max-w-[95%] mb-0.5" style={{ fontSize: storeNameFontSize }}>
                                                {store.name}
                                            </h4>
                                        )}

                                        {/* Mandatory CHAPUU Branding (Clean subtitle directly under store name) */}
                                        {showBranding && (
                                            <span 
                                                className="font-bold text-slate-400 uppercase tracking-[0.2em] block mb-1 text-center" 
                                                style={{ fontSize: brandingFontSize }}
                                            >
                                                CHAPUU
                                            </span>
                                        )}

                                        {/* Store Logo Thumbnail */}
                                        {showLogo && (logoSrc ? (
                                            <img 
                                                src={logoSrc} 
                                                alt={store.name} 
                                                className={`rounded-full object-cover border border-slate-200 shadow-sm ${logoDimensionClass}`} 
                                            />
                                        ) : (
                                            <div className={`rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 ${logoDimensionClass}`}>
                                                <ShoppingBag size={logoIconSize} className="text-slate-400" />
                                            </div>
                                        ))}

                                        {/* Menu QR Code */}
                                        {showQR && (
                                            <div className="p-1 bg-white border border-slate-100 rounded-xl shadow-sm">
                                                <QRCodeSVG 
                                                    value={storeMenuUrl} 
                                                    size={qrCodeSize} 
                                                    level="H" 
                                                />
                                            </div>
                                        )}

                                        {/* Tagline */}
                                        {showTagline && customTagline && (
                                            <span className="text-center text-slate-500 font-extrabold tracking-wide italic mt-1 max-w-[95%] line-clamp-1" style={{ fontSize: taglineFontSize }}>
                                                "{customTagline}"
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Paper bag direct template */}
                    {packagingType === 'bag' && (
                        <div 
                            style={{ 
                                borderColor: transparentMode ? 'transparent' : accentColor,
                                backgroundColor: transparentMode ? 'transparent' : '#ffffff',
                                borderWidth: transparentMode ? '0px' : '4px'
                            }}
                            className="bag-layout border-double"
                        >
                            {/* Elegant double-line frame inside */}
                            {!transparentMode && (
                                <div className="absolute inset-2 border border-slate-100 rounded-[2rem] pointer-events-none"></div>
                            )}

                            <div className="w-full flex justify-between items-center border-b border-slate-100 pb-4 mb-6 no-print">
                                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5"><ShoppingBag className="text-primary-500" size={16} /> Paper Bag Layout (Centered Print)</h3>
                                <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Bag Template</span>
                            </div>

                            {/* Header Watermark */}
                            {showBranding && (
                                <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-[0.25em] mb-4">
                                    <span>CHAPUU Partner Network</span>
                                </div>
                            )}

                            {/* Accent highlight bar */}
                            {!transparentMode && (
                                <div style={{ backgroundColor: accentColor }} className="w-20 h-1 rounded-full mb-8"></div>
                            )}

                            {/* Main branding header */}
                            <div className="space-y-6 my-auto flex-grow flex flex-col justify-center items-center">
                                {showLogo && (logoSrc ? (
                                    <img 
                                        src={logoSrc} 
                                        alt={store.name} 
                                        className="w-36 h-36 rounded-[2.5rem] object-cover border-4 border-slate-100 shadow-xl mb-4" 
                                    />
                                ) : (
                                    showLogo && (
                                        <div className="w-32 h-32 rounded-[2rem] bg-slate-50 border-2 border-slate-100 flex items-center justify-center mb-4">
                                            <ShoppingBag size={48} className="text-slate-300" />
                                        </div>
                                    )
                                ))}

                                {showStoreName && (
                                    <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-2">{store.name}</h2>
                                )}

                                {showTagline && customTagline && (
                                    <p className="text-sm font-semibold text-slate-500 italic max-w-md">"{customTagline}"</p>
                                )}
                                
                                {showQR && (
                                    <div className="space-y-3 pt-6">
                                        <div className="p-3 bg-white border border-slate-100 rounded-2xl shadow-md inline-block">
                                            <QRCodeSVG value={storeMenuUrl} size={130} level="H" />
                                        </div>
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Scan to View Menu & Order Online</p>
                                    </div>
                                )}
                            </div>

                            {/* Contact and address metadata */}
                            <div className="w-full pt-8 border-t border-slate-100 mt-8 space-y-3">
                                {showContact && (
                                    <>
                                        <div className="flex justify-center gap-6 text-xs font-bold text-slate-600">
                                            {store.contact_phone && (
                                                <span className="flex items-center gap-1.5">
                                                    <Phone size={12} className="text-slate-400" /> 
                                                    {store.contact_phone}
                                                </span>
                                            )}
                                            {store.contact_email && (
                                                <span className="flex items-center gap-1.5">
                                                    <Mail size={12} className="text-slate-400" /> 
                                                    {store.contact_email}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] font-medium text-slate-400 flex items-center justify-center gap-1">
                                            <MapPin size={10} className="text-slate-300" />
                                            {store.location}
                                        </p>
                                    </>
                                )}
                                
                                {showBranding && (
                                    <div className="pt-4 flex justify-between items-center text-[8.5px] font-bold text-slate-300 uppercase tracking-widest w-full border-t border-dashed border-slate-100">
                                        <span>CHAPUU | {store.name}</span>
                                        <span>Branded & Powered by Chapuu</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Container safety strip seal template */}
                    {packagingType === 'seal' && (
                        <div className="w-full h-full flex flex-col justify-between">
                            <div className="mb-6 flex justify-between items-center pb-3 border-b border-slate-200 no-print">
                                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5"><ShieldCheck className="text-emerald-500" size={16} /> Container Seal Strip Preview</h3>
                                <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Safety Seals</span>
                            </div>

                            {/* Render multiple seal strips per page */}
                            <div className="space-y-6 my-auto">
                                {[...Array(4)].map((_, i) => (
                                    <div 
                                        key={i} 
                                        style={{ 
                                            borderLeftColor: transparentMode ? 'transparent' : accentColor, 
                                            borderRightColor: transparentMode ? 'transparent' : accentColor,
                                            backgroundColor: transparentMode ? 'transparent' : '#ffffff',
                                            borderYColor: transparentMode ? 'transparent' : '#e2e8f0',
                                            boxShadow: transparentMode ? 'none' : '0 1px 3px rgba(0,0,0,0.05)'
                                        }}
                                        className="w-full h-[40mm] border-l-[12px] border-r-[12px] border-y bg-white p-4 flex items-center justify-between relative"
                                    >
                                        {/* Left Side: Security Warning */}
                                        <div className="flex items-center gap-3 text-left">
                                            <div className="p-2 bg-slate-100 rounded-xl shrink-0">
                                                <ShieldCheck size={20} className="text-slate-600" />
                                            </div>
                                            <div>
                                                <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-wide">Safety Sealed</h4>
                                                <p className="text-[8px] text-slate-500 font-medium max-w-[180px] mt-0.5 leading-relaxed">Check that this seal is unbroken before accepting your delivery.</p>
                                            </div>
                                        </div>

                                        {/* Center: Store Details */}
                                        <div className="text-center flex flex-col items-center flex-1 px-4">
                                            {showStoreName && (
                                                <h3 className="font-black text-xs tracking-tight text-slate-900">{store.name}</h3>
                                            )}
                                            {showTagline && customTagline && (
                                                <span className="text-[8px] font-bold text-slate-400 mt-0.5 italic line-clamp-1">"{customTagline}"</span>
                                            )}
                                            {showBranding && (
                                                <span className="text-[6.5px] font-black tracking-widest text-slate-300 uppercase mt-1">CHAPUU | {store.name}</span>
                                            )}
                                        </div>

                                        {/* Right Side: QR Code scan to review/order */}
                                        {showQR && (
                                            <div className="flex items-center gap-2.5 shrink-0">
                                                <div className="text-right">
                                                    <span className="text-[7px] font-black uppercase text-slate-400 tracking-wider block">Scan to rate</span>
                                                    <span className="text-[8px] font-black uppercase text-slate-900 tracking-wider block">Rate & Reorder</span>
                                                </div>
                                                <div className="p-1 bg-white border border-slate-100 rounded-lg shadow-sm">
                                                    <QRCodeSVG value={storeMenuUrl} size={42} level="H" />
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Fine dotted cut guide */}
                                        {!transparentMode && (
                                            <div className="absolute -bottom-3 left-0 right-0 border-b border-dashed border-slate-200 no-print"></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
