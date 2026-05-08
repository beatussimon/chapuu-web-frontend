import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAppStore } from './store/useStore';
import CustomerDashboard from './pages/CustomerDashboard';
import SellerDashboard from './pages/SellerDashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import StoreSelection from './pages/StoreSelection';
import Checkout from './pages/Checkout';
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
import { Utensils, LayoutDashboard, LogOut, ShoppingBag, TerminalSquare, QrCode, Calendar, Package, Shield, Store, Menu, X, Navigation, Tv, BarChart3, Compass, UtensilsCrossed, HelpCircle, ListOrdered, ShoppingCart, TrendingUp } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

function ProtectedRoute({ children, role }) {
  const userRole = useAppStore(state => state.userRole);
  const location = useLocation();
  if (!userRole) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (role && userRole !== role && userRole !== 'ADMIN') return <div className="p-8 text-center text-red-400">Access Denied</div>;
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
    <nav className="sticky top-0 z-50 glass-dark border-b border-white/5 h-16 md:h-20 px-4 md:px-12 flex items-center justify-between transition-opacity duration-300">
      <Link to="/" className="flex items-center h-full text-primary-500 hover:text-primary-400 transition-colors cursor-pointer group py-2 gap-2 md:gap-3">
        <img src="/logo.png" alt="Chapuu Logo" className="h-8 md:h-full object-contain" />
        <h1 className="text-xl md:text-2xl font-bold tracking-wider text-white">CHAPUU</h1>
      </Link>

      <div className="flex items-center gap-4">
        {!token ? (
          <>
            <Link to="/faq" className="px-5 py-2 text-slate-300 hover:text-white text-sm font-medium transition-colors">FAQ</Link>
            <Link to="/login" className="px-5 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-all">
              Login
            </Link>
          </>
        ) : (
          <>
            {/* Desktop Navigation */}
            <div className="hidden lg:flex flex-wrap items-center justify-end gap-1 xl:gap-2 max-w-[75vw]">
              <div className="flex items-center gap-2 text-sm text-slate-400 mr-4 border-r border-white/10 pr-4 h-6">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="font-medium">{userRole}</span>
              </div>

              {['SELLER', 'ADMIN', 'CHEF', 'ACCOUNTANT', 'DELIVERY'].includes(userRole) ? (
                <>
                  <Link to="/seller" className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors"><TerminalSquare size={16} /><span className="text-sm font-medium">Dashboard</span></Link>
                  {['SELLER', 'ADMIN'].includes(userRole) && (
                    <>
                      <Link to="/seller/reservations" className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors"><Calendar size={16} /><span className="text-sm font-medium">Host</span></Link>
                      <Link to="/seller/menu" className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors"><Utensils size={16} /><span className="text-sm font-medium">Menu</span></Link>
                      <Link to="/seller/analytics" className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors"><BarChart3 size={16} /><span className="text-sm font-medium">Analytics</span></Link>
                      <Link to="/seller/inventory" className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors"><Package size={16} /><span className="text-sm font-medium">Stock</span></Link>
                      <Link to="/seller/qrcodes" className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors"><QrCode size={16} /><span className="text-sm font-medium">QRs</span></Link>
                    </>
                  )}
                  <Link to="/tv/1" target="_blank" className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors"><Tv size={16} /><span className="text-sm font-medium">TV</span></Link>
                  {userRole === 'ADMIN' && (
                    <Link to="/admin" className="flex items-center gap-2 px-3 py-2 text-purple-400 hover:text-purple-300 transition-colors ml-2"><Shield size={16} /><span className="text-sm font-medium">Admin</span></Link>
                  )}
                </>
              ) : null}

              {userRole === 'CUSTOMER' ? (
                <>
                  <Link to="/" className="md:hidden flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors"><TrendingUp size={16} /><span className="text-sm font-medium">Trending</span></Link>
                  <Link to="/stores?type=RESTAURANT" className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors"><UtensilsCrossed size={16} /><span className="text-sm font-medium">Restaurants</span></Link>
                  <Link to="/stores?type=SHOP" className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors"><Store size={16} /><span className="text-sm font-medium">Shops</span></Link>
                  <Link to="/orders" className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors"><ListOrdered size={16} /><span className="text-sm font-medium">Orders</span></Link>
                  <Link to="/reserve" className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors"><Calendar size={16} /><span className="text-sm font-medium">Reserve</span></Link>
                  <Link to="/faq" className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors"><HelpCircle size={16} /><span className="text-sm font-medium">FAQ</span></Link>

                  {/* Global Cart Button */}
                  <Link to="/checkout" className="flex items-center gap-2 ml-4 px-4 py-2 rounded-full bg-primary-500 text-dark-950 font-bold hover:bg-primary-400 transition-colors shadow-lg shadow-primary-500/20 relative">
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

              <button onClick={handleLogout} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors ml-4 border border-white/5 hover:border-red-400/30" title="Logout">
                <LogOut size={18} />
              </button>
            </div>

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

function BottomNav() {
  const { userRole, cart } = useAppStore();
  const location = useLocation();
  if (!userRole) return null;

  const isActive = (path) => {
    const [pathname, search] = path.split('?');
    if (search) return location.pathname === pathname && location.search.includes(search);
    return location.pathname === pathname;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden glass-dark border-t border-white/10 flex items-center justify-around px-2 py-2 safe-area-pb">
      {userRole === 'CUSTOMER' && (
        <>
          <Link to="/" className={`flex flex-col items-center p-2 ${isActive('/') ? 'text-primary-500' : 'text-slate-400'}`}><Compass size={20} /><span className="text-[10px] mt-1">Discover</span></Link>
          <Link to="/stores?type=RESTAURANT" className={`flex flex-col items-center p-2 ${isActive('/stores?type=RESTAURANT') ? 'text-primary-500' : 'text-slate-400'}`}><UtensilsCrossed size={20} /><span className="text-[10px] mt-1">Restaurants</span></Link>
          <Link to="/checkout" className={`flex flex-col items-center p-2 relative ${isActive('/checkout') ? 'text-primary-500' : 'text-slate-400'}`}>
            <ShoppingCart size={20} />
            {cart.length > 0 && <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] font-bold px-1 rounded-full">{cart.reduce((s, i) => s + i.quantity, 0)}</span>}
            <span className="text-[10px] mt-1">Cart</span>
          </Link>
          <Link to="/orders" className={`flex flex-col items-center p-2 ${isActive('/orders') ? 'text-primary-500' : 'text-slate-400'}`}><ShoppingBag size={20} /><span className="text-[10px] mt-1">Orders</span></Link>
          <Link to="/reserve" className={`flex flex-col items-center p-2 ${isActive('/reserve') ? 'text-primary-500' : 'text-slate-400'}`}><Calendar size={20} /><span className="text-[10px] mt-1">Reserve</span></Link>
        </>
      )}
      {['SELLER', 'ADMIN', 'CHEF'].includes(userRole) && (
        <>
          <Link to="/seller" className={`flex flex-col items-center p-2 ${isActive('/seller') ? 'text-primary-500' : 'text-slate-400'}`}><TerminalSquare size={20} /><span className="text-[10px] mt-1">Dashboard</span></Link>
          <Link to="/seller/menu" className={`flex flex-col items-center p-2 ${isActive('/seller/menu') ? 'text-primary-500' : 'text-slate-400'}`}><Utensils size={20} /><span className="text-[10px] mt-1">Menu</span></Link>
          <Link to="/seller/analytics" className={`flex flex-col items-center p-2 ${isActive('/seller/analytics') ? 'text-primary-500' : 'text-slate-400'}`}><BarChart3 size={20} /><span className="text-[10px] mt-1">Analytics</span></Link>
          <Link to="/seller/inventory" className={`flex flex-col items-center p-2 ${isActive('/seller/inventory') ? 'text-primary-500' : 'text-slate-400'}`}><Package size={20} /><span className="text-[10px] mt-1">Stock</span></Link>
        </>
      )}
      {userRole === 'ACCOUNTANT' && (
        <>
          <Link to="/seller" className={`flex flex-col items-center p-2 ${isActive('/seller') ? 'text-primary-500' : 'text-slate-400'}`}><TerminalSquare size={20} /><span className="text-[10px] mt-1">Dashboard</span></Link>
        </>
      )}
      {userRole === 'DELIVERY' && (
        <>
          <Link to="/seller" className={`flex flex-col items-center p-2 ${isActive('/seller') ? 'text-primary-500' : 'text-slate-400'}`}><TerminalSquare size={20} /><span className="text-[10px] mt-1">Dashboard</span></Link>
          <Link to="/delivery" className={`flex flex-col items-center p-2 ${isActive('/delivery') ? 'text-primary-500' : 'text-slate-400'}`}><Navigation size={20} /><span className="text-[10px] mt-1">Deliveries</span></Link>
        </>
      )}
    </nav>
  );
}

function App() {
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
            <Route path="/tv/:storeId?" element={<PublicDisplay />} />

            {/* Customer Routes (Accessible by any authenticated user) */}
            <Route path="/stores" element={<ProtectedRoute><StoreSelection /></ProtectedRoute>} />
            <Route path="/menu" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
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
        <BottomNav />
      </div>
    </Router>
  );
}

export default App;