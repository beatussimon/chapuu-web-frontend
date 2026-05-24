import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAppStore } from './store/useStore';
import CustomerDashboard from './pages/CustomerDashboard';
import SellerDashboard from './pages/SellerDashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import StoreSelection from './pages/StoreSelection';
import Checkout from './pages/Checkout';
import GlobalCart from './pages/GlobalCart';
import OrderConfirmation from './pages/OrderConfirmation';
import OrderTracker from './pages/OrderTracker';
import ScanHandler from './pages/ScanHandler';
import TableQRCodes from './pages/TableQRCodes';
import ReservationForm from './pages/ReservationForm';
import ReservationManager from './pages/ReservationManager';
import InventoryDashboard from './pages/InventoryDashboard';
import AdminDashboard from './pages/AdminDashboard';
import MenuBuilder from './pages/seller/MenuBuilder';
import SellerAnalytics from './pages/seller/SellerAnalytics';
import CustomerOrders from './pages/CustomerOrders';
import DeliveryDashboard from './pages/staff/DeliveryDashboard';
import PublicDisplay from './pages/PublicDisplay';
import DiscoverPage from './pages/DiscoverPage';
import FAQ from './pages/FAQ';
import TermsAndConditions from './pages/TermsAndConditions';
import { Utensils, LayoutDashboard, LogOut, ShoppingBag, TerminalSquare, QrCode, Calendar, Package, Shield, Store, Menu, X, Navigation, Tv, BarChart3, Compass, UtensilsCrossed, HelpCircle, ListOrdered, ShoppingCart, TrendingUp, LayoutGrid } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { setStoreResetFn } from './api/client';

function ProtectedRoute({ children, role }) {
  const userRole = useAppStore(state => state.userRole);
  const location = useLocation();
  if (!userRole) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (role && userRole !== role && userRole !== 'ADMIN' && userRole !== 'SUPERUSER') {
    return <div className="p-8 text-center text-red-400">Access Denied</div>;
  }
  return children;
}

function TopNavigation() {
  const { token, userRole, clearAuth, cart } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const isTvMode = location.pathname.startsWith('/tv');
  if (isTvMode && !scrolled) return null;

  return (
    <nav className="sticky top-0 z-50 bg-dark-950/95 backdrop-blur-md border-b border-white/5 h-16 md:h-20 px-4 md:px-12 flex items-center justify-between transition-opacity duration-300">
      {/* Left: Logo */}
      <div className="flex-none flex items-center h-full">
        <Link to="/" className="flex items-center text-primary-500 hover:text-primary-400 transition-colors cursor-pointer group py-2 gap-2 md:gap-3">
          <img src="/logo.png" alt="Chapuu Logo" className="h-8 md:h-12 object-contain animate-pulse-slow" />
          <h1 className="text-lg md:text-2xl font-bold tracking-wider text-white">CHAPUU</h1>
        </Link>
      </div>

      {/* Center: Desktop Navigation Links */}
      <div className="hidden lg:flex flex-1 min-w-0 items-center justify-center gap-1 xl:gap-2 mx-4">
        {token && (
          <>
            <div className="flex items-center gap-2 text-sm text-slate-400 mr-4 border-r border-white/10 pr-4 h-6 flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="font-medium">{userRole}</span>
            </div>

            {['SELLER', 'ADMIN', 'SUPERUSER', 'CHEF', 'ACCOUNTANT', 'DELIVERY'].includes(userRole) ? (
              <>
                <Link to="/seller" className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors flex-shrink-0"><TerminalSquare size={16} /><span className="text-sm font-medium">Dashboard</span></Link>
                {['SELLER', 'ADMIN', 'SUPERUSER'].includes(userRole) && (
                  <>
                    <Link to="/seller/reservations" className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors flex-shrink-0"><Calendar size={16} /><span className="text-sm font-medium">Host</span></Link>
                    <Link to="/seller/menu" className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors flex-shrink-0"><Utensils size={16} /><span className="text-sm font-medium">Menu</span></Link>
                    <Link to="/seller/analytics" className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors flex-shrink-0"><BarChart3 size={16} /><span className="text-sm font-medium">Analytics</span></Link>
                    <Link to="/seller/inventory" className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors flex-shrink-0"><Package size={16} /><span className="text-sm font-medium">Stock</span></Link>
                    <Link to="/seller/qrcodes" className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors flex-shrink-0"><QrCode size={16} /><span className="text-sm font-medium">QRs</span></Link>
                  </>
                )}
                <Link to="/tv/1" target="_blank" className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors flex-shrink-0"><Tv size={16} /><span className="text-sm font-medium">TV</span></Link>
                {['ADMIN', 'SUPERUSER'].includes(userRole) && (
                  <Link to="/admin" className="flex items-center gap-2 px-3 py-2 text-purple-400 hover:text-purple-300 transition-colors ml-2 flex-shrink-0"><Shield size={16} /><span className="text-sm font-medium">Admin</span></Link>
                )}
              </>
            ) : null}

            {userRole === 'CUSTOMER' ? (
              <>
                <Link to="/" className="md:hidden flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors flex-shrink-0"><TrendingUp size={16} /><span className="text-sm font-medium">Trending</span></Link>
                <Link to="/stores?type=RESTAURANT" className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors flex-shrink-0"><UtensilsCrossed size={16} /><span className="text-sm font-medium">Restaurants</span></Link>
                <Link to="/stores?type=SHOP" className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors flex-shrink-0"><Store size={16} /><span className="text-sm font-medium">Shops</span></Link>
                <Link to="/orders" className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors flex-shrink-0"><ListOrdered size={16} /><span className="text-sm font-medium">Orders</span></Link>
                <Link to="/reserve" className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors flex-shrink-0"><Calendar size={16} /><span className="text-sm font-medium">Reserve</span></Link>
                <Link to="/faq" className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors flex-shrink-0"><HelpCircle size={16} /><span className="text-sm font-medium">FAQ</span></Link>

                {/* Global Cart Button */}
                <Link to="/cart" className="flex items-center gap-2 ml-4 px-4 py-2 rounded-full bg-primary-500 text-dark-950 font-bold hover:bg-primary-400 transition-colors shadow-lg shadow-primary-500/20 relative flex-shrink-0">
                  <ShoppingCart size={16} />
                  <span className="text-sm">Cart</span>
                  {cart.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-dark-950">
                      {cart.reduce((s, i) => s + i.quantity, 0)}
                    </span>
                  )}
                </Link>
              </>
            ) : null}
          </>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex-none flex items-center gap-2 sm:gap-4">
        {!token ? (
          <>
            <Link to="/faq" className="px-3 py-1.5 md:px-5 md:py-2 text-slate-300 hover:text-white text-xs md:text-sm font-medium transition-colors">FAQ</Link>
            <Link to="/login" className="px-3.5 py-1.5 md:px-5 md:py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs md:text-sm font-medium transition-all">
              Login
            </Link>
          </>
        ) : (
          <>
            <button onClick={handleLogout} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors ml-4 border border-white/5 hover:border-red-400/30 lg:flex items-center gap-2 hidden" title="Logout">
              <LogOut size={18} />
              <span className="text-xs font-bold uppercase hidden xl:inline">Logout</span>
            </button>

            {/* Mobile Actions */}
            <div className="lg:hidden flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                {userRole}
              </div>
              <button onClick={handleLogout} className="p-2 bg-white/5 rounded-xl text-slate-300 hover:text-red-400 transition-colors" title="Logout">
                <LogOut size={20} />
              </button>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}

const getBottomNavPaths = (role) => {
  if (role === 'CUSTOMER') {
    return ['/', '/stores?type=RESTAURANT', '/cart', '/orders', '/reserve'];
  }
  if (['SELLER', 'ADMIN', 'SUPERUSER', 'CHEF'].includes(role)) {
    return ['/seller', '/seller/menu', '/seller/analytics', '/seller/inventory'];
  }
  if (role === 'ACCOUNTANT') {
    return ['/seller'];
  }
  if (role === 'DELIVERY') {
    return ['/seller', '/delivery'];
  }
  return [];
};

const getDrawerLinks = (userRole) => {
  const links = [];
  if (!userRole) return links;

  // Admin / Superuser exclusive
  if (['ADMIN', 'SUPERUSER'].includes(userRole)) {
    links.push({
      path: '/admin',
      label: 'Platform Admin',
      icon: <Shield className="text-purple-400" size={20} />,
      description: 'Global system overview & settings'
    });
  }

  // Seller / Admin / Superuser
  if (['SELLER', 'ADMIN', 'SUPERUSER'].includes(userRole)) {
    links.push(
      {
        path: '/seller',
        label: 'Seller Dashboard',
        icon: <TerminalSquare className="text-primary-400" size={20} />,
        description: 'Live order feeds & queue metrics'
      },
      {
        path: '/seller/reservations',
        label: 'Host / Reservations',
        icon: <Calendar className="text-green-400" size={20} />,
        description: 'Floor plans & seated guest sheets'
      },
      {
        path: '/seller/menu',
        label: 'Menu Builder',
        icon: <Utensils className="text-amber-400" size={20} />,
        description: 'Manage products, prices & categories'
      },
      {
        path: '/seller/inventory',
        label: 'Stock / Inventory',
        icon: <Package className="text-blue-400" size={20} />,
        description: 'Inventory levels & stock adjustments'
      },
      {
        path: '/seller/analytics',
        label: 'Analytics',
        icon: <BarChart3 className="text-rose-400" size={20} />,
        description: 'Platform revenue & daily trends'
      },
      {
        path: '/seller/qrcodes',
        label: 'Table QR Codes',
        icon: <QrCode className="text-indigo-400" size={20} />,
        description: 'Generate scan-to-order codes'
      },
      {
        path: '/tv/1',
        label: 'Public TV Display',
        icon: <Tv className="text-teal-400" size={20} />,
        description: 'Real-time kitchen order board'
      }
    );
  } else {
    // Specialized staff roles (Chef, Accountant, Delivery)
    if (userRole === 'CHEF') {
      links.push(
        {
          path: '/seller',
          label: 'Kitchen Dashboard',
          icon: <TerminalSquare className="text-amber-400" size={20} />,
          description: 'Live kitchen orders & prep queue'
        },
        {
          path: '/tv/1',
          label: 'TV Display',
          icon: <Tv className="text-teal-400" size={20} />,
          description: 'Public kitchen order board'
        }
      );
    }
    if (userRole === 'ACCOUNTANT') {
      links.push({
        path: '/seller',
        label: 'Accounting Center',
        icon: <TerminalSquare className="text-emerald-400" size={20} />,
        description: 'Payment verification & invoices'
      });
    }
    if (userRole === 'DELIVERY') {
      links.push(
        {
          path: '/seller',
          label: 'Driver Dashboard',
          icon: <TerminalSquare className="text-blue-400" size={20} />,
          description: 'Dispatch feeds & order queue'
        },
        {
          path: '/delivery',
          label: 'Driver Dispatch',
          icon: <Navigation className="text-indigo-400" size={20} />,
          description: 'Fulfillment & active deliveries'
        }
      );
    }
  }

  const bottomNavPaths = getBottomNavPaths(userRole);
  return links.filter(link => !bottomNavPaths.includes(link.path));
};

function BottomNav({ moreMenuOpen, onToggleMore }) {
  const { userRole, cart } = useAppStore();
  const location = useLocation();
  if (!userRole) return null;

  const isActive = (path) => {
    const [pathname, search] = path.split('?');
    if (search) return location.pathname === pathname && location.search.includes(search);
    return location.pathname === pathname;
  };

  const hasMore = getDrawerLinks(userRole).length > 0;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-dark-950/95 backdrop-blur-md border-t border-white/10 flex items-center justify-around px-2 py-2 safe-area-pb">
      {userRole === 'CUSTOMER' && (
        <>
          <Link to="/" className={`flex flex-col items-center p-2 ${isActive('/') ? 'text-primary-500' : 'text-slate-400'}`}><Compass size={20} /><span className="text-[10px] mt-1">Discover</span></Link>
          <Link to="/stores?type=RESTAURANT" className={`flex flex-col items-center p-2 ${isActive('/stores?type=RESTAURANT') ? 'text-primary-500' : 'text-slate-400'}`}><UtensilsCrossed size={20} /><span className="text-[10px] mt-1">Restaurants</span></Link>
          <Link to="/cart" className={`flex flex-col items-center p-2 relative ${isActive('/cart') ? 'text-primary-500' : 'text-slate-400'}`}>
            <ShoppingCart size={20} />
            {cart.length > 0 && <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] font-bold px-1 rounded-full">{cart.reduce((s, i) => s + i.quantity, 0)}</span>}
            <span className="text-[10px] mt-1">Cart</span>
          </Link>
          <Link to="/orders" className={`flex flex-col items-center p-2 ${isActive('/orders') ? 'text-primary-500' : 'text-slate-400'}`}><ShoppingBag size={20} /><span className="text-[10px] mt-1">Orders</span></Link>
          <Link to="/reserve" className={`flex flex-col items-center p-2 ${isActive('/reserve') ? 'text-primary-500' : 'text-slate-400'}`}><Calendar size={20} /><span className="text-[10px] mt-1">Reserve</span></Link>
        </>
      )}
      {['SELLER', 'ADMIN', 'SUPERUSER', 'CHEF'].includes(userRole) && (
        <>
          <Link to="/seller" className={`flex flex-col items-center p-2 ${isActive('/seller') ? 'text-primary-500' : 'text-slate-400'}`}><TerminalSquare size={20} /><span className="text-[10px] mt-1">Dashboard</span></Link>
          <Link to="/seller/menu" className={`flex flex-col items-center p-2 ${isActive('/seller/menu') ? 'text-primary-500' : 'text-slate-400'}`}><Utensils size={20} /><span className="text-[10px] mt-1">Menu</span></Link>
          <Link to="/seller/analytics" className={`flex flex-col items-center p-2 ${isActive('/seller/analytics') ? 'text-primary-500' : 'text-slate-400'}`}><BarChart3 size={20} /><span className="text-[10px] mt-1">Analytics</span></Link>
          <Link to="/seller/inventory" className={`flex flex-col items-center p-2 ${isActive('/seller/inventory') ? 'text-primary-500' : 'text-slate-400'}`}><Package size={20} /><span className="text-[10px] mt-1">Stock</span></Link>
          {hasMore && (
            <button onClick={onToggleMore} className={`flex flex-col items-center p-2 transition-colors ${moreMenuOpen ? 'text-primary-500' : 'text-slate-400 hover:text-white'}`}><LayoutGrid size={20} /><span className="text-[10px] mt-1">More</span></button>
          )}
        </>
      )}
      {userRole === 'ACCOUNTANT' && (
        <>
          <Link to="/seller" className={`flex flex-col items-center p-2 ${isActive('/seller') ? 'text-primary-500' : 'text-slate-400'}`}><TerminalSquare size={20} /><span className="text-[10px] mt-1">Dashboard</span></Link>
          {hasMore && (
            <button onClick={onToggleMore} className={`flex flex-col items-center p-2 transition-colors ${moreMenuOpen ? 'text-primary-500' : 'text-slate-400 hover:text-white'}`}><LayoutGrid size={20} /><span className="text-[10px] mt-1">More</span></button>
          )}
        </>
      )}
      {userRole === 'DELIVERY' && (
        <>
          <Link to="/seller" className={`flex flex-col items-center p-2 ${isActive('/seller') ? 'text-primary-500' : 'text-slate-400'}`}><TerminalSquare size={20} /><span className="text-[10px] mt-1">Dashboard</span></Link>
          <Link to="/delivery" className={`flex flex-col items-center p-2 ${isActive('/delivery') ? 'text-primary-500' : 'text-slate-400'}`}><Navigation size={20} /><span className="text-[10px] mt-1">Deliveries</span></Link>
          {hasMore && (
            <button onClick={onToggleMore} className={`flex flex-col items-center p-2 transition-colors ${moreMenuOpen ? 'text-primary-500' : 'text-slate-400 hover:text-white'}`}><LayoutGrid size={20} /><span className="text-[10px] mt-1">More</span></button>
          )}
        </>
      )}
    </nav>
  );
}

function BottomDrawer({ isOpen, onClose }) {
  const { userRole, clearAuth } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  if (!userRole) return null;

  const handleLinkClick = (path) => {
    onClose();
    navigate(path);
  };

  const handleLogout = () => {
    onClose();
    clearAuth();
    navigate('/login');
  };

  const links = getDrawerLinks(userRole);
  if (links.length === 0) return null;

  return (
    <>
      {/* Backdrop Overlay */}
      <div 
        onClick={onClose}
        className={`fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Slide-Up Drawer */}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-[101] max-h-[85vh] bg-dark-950/98 backdrop-blur-xl border-t border-white/10 rounded-t-[2.5rem] px-6 pt-4 pb-8 transition-transform duration-300 ease-out transform ${isOpen ? 'translate-y-0' : 'translate-y-full'} overflow-y-auto`}
      >
        {/* Handle bar */}
        <div className="flex justify-center mb-6">
          <div className="w-12 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-wider">
              {['ADMIN', 'SUPERUSER'].includes(userRole) ? 'Control Directory' : 'More Options'}
            </h3>
            <p className="text-xs text-slate-400">
              {['ADMIN', 'SUPERUSER'].includes(userRole) ? 'All tools authorized for your role' : 'Manage all your tools in one place'}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 2-Column Grid Directory */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {links.map((link, idx) => {
            const active = location.pathname === link.path;
            return (
              <button
                key={idx}
                onClick={() => handleLinkClick(link.path)}
                className={`flex items-start gap-4 p-4 rounded-2xl text-left transition-all border ${active ? 'bg-primary-500/10 border-primary-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'}`}
              >
                <div className={`p-3 rounded-xl ${active ? 'bg-primary-500/20 text-primary-400' : 'bg-dark-900 text-slate-400'}`}>
                  {link.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`block text-sm font-bold truncate ${active ? 'text-primary-400' : 'text-white'}`}>
                    {link.label}
                  </span>
                  <span className="block text-xs text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                    {link.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-slate-400 uppercase font-black tracking-widest">{userRole}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-xs font-bold uppercase tracking-wider"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>
    </>
  );
}

function App() {
  const clearAuth = useAppStore(state => state.clearAuth);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  useEffect(() => {
    setStoreResetFn(clearAuth);
  }, [clearAuth]);

  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <TopNavigation />
        <Toaster position="bottom-right" toastOptions={{
          style: { background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } }
        }} />

        <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
          <Routes>
            {/* Public App Routes */}
            <Route path="/" element={<DiscoverPage />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Signup />} />
            <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/tv/:storeId?" element={<PublicDisplay />} />

            {/* Customer Routes (Accessible by any authenticated user) */}
            <Route path="/stores" element={<ProtectedRoute><StoreSelection /></ProtectedRoute>} />
            <Route path="/menu" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
            <Route path="/cart" element={<ProtectedRoute><GlobalCart /></ProtectedRoute>} />
            <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><CustomerOrders /></ProtectedRoute>} />
            <Route path="/order/confirmation/:id" element={<ProtectedRoute><OrderConfirmation /></ProtectedRoute>} />
            <Route path="/order/track/:id" element={<ProtectedRoute><OrderTracker /></ProtectedRoute>} />
            <Route path="/scan" element={<ProtectedRoute><ScanHandler /></ProtectedRoute>} />
            <Route path="/reserve" element={<ProtectedRoute><ReservationForm /></ProtectedRoute>} />
            <Route path="/seller" element={<ProtectedRoute><SellerDashboard /></ProtectedRoute>} />
            <Route path="/seller/menu" element={<ProtectedRoute role="SELLER"><MenuBuilder /></ProtectedRoute>} />
            <Route path="/seller/reservations" element={<ProtectedRoute role="SELLER"><ReservationManager /></ProtectedRoute>} />
            <Route path="/seller/inventory" element={<ProtectedRoute role="SELLER"><InventoryDashboard /></ProtectedRoute>} />
            <Route path="/seller/analytics" element={<ProtectedRoute role="SELLER"><SellerAnalytics /></ProtectedRoute>} />
            <Route path="/seller/qrcodes" element={<ProtectedRoute role="SELLER"><TableQRCodes /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminDashboard /></ProtectedRoute>} />

            {/* Delivery Routes */}
            <Route path="/delivery" element={<ProtectedRoute role="DELIVERY"><DeliveryDashboard /></ProtectedRoute>} />
          </Routes>
        </main>
        <BottomNav moreMenuOpen={moreMenuOpen} onToggleMore={() => setMoreMenuOpen(!moreMenuOpen)} />
        <BottomDrawer isOpen={moreMenuOpen} onClose={() => setMoreMenuOpen(false)} />
      </div>
    </Router>
  );
}

export default App;