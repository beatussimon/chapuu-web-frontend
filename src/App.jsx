import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from './store/useStore';
import CustomerDashboard from './pages/CustomerDashboard';
import SellerDashboard from './pages/SellerDashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import LandingPage from './pages/LandingPage';
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
import { Utensils, LayoutDashboard, LogOut, ShoppingBag, TerminalSquare, QrCode, Calendar, Package, Shield, Store, Menu, X, Navigation, Tv, BarChart3, Compass, UtensilsCrossed } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

function ProtectedRoute({ children, role }) {
  const userRole = useAppStore(state => state.userRole);
  if (!userRole) return <div className="p-8 text-center text-slate-400">Please login to access this area.</div>;
  if (role && userRole !== role && userRole !== 'ADMIN') return <div className="p-8 text-center text-red-400">Access Denied</div>;
  return children;
}

function NavLink({ to, icon, label, bgClass, textClass, onClick }) {
  return (
    <Link onClick={onClick} to={to} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${bgClass} ${textClass}`}>
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  );
}

function TopNavigation() {
  const { token, userRole, clearAuth } = useAppStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <nav className="sticky top-0 z-50 glass-dark border-b border-white/5 py-4 px-4 md:px-12 flex items-center justify-between">
      <Link onClick={closeMenu} to="/" className="flex items-center gap-3 text-primary-500 hover:text-primary-400 transition-colors cursor-pointer group">
        <div className="bg-primary-500/20 p-2 rounded-xl border border-primary-500/30 overflow-hidden">
          <Utensils size={24} className="text-primary-500 relative z-10" />
        </div>
        <h1 className="text-xl font-bold tracking-wider">CHAPUU</h1>
      </Link>

      <div className="flex items-center gap-4">
        {!token ? (
          <Link to="/login" className="px-5 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-all">
            Login
          </Link>
        ) : (
          <>
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-400 mr-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                {userRole}
              </div>

              {userRole === 'SELLER' || userRole === 'ADMIN' ? (
                <>
                  <Link to="/seller" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-600/20 text-primary-500 hover:bg-primary-600/30 transition-colors"><TerminalSquare size={16} /><span className="text-sm">POS</span></Link>
                  <Link to="/seller/reservations" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 transition-colors"><Calendar size={16} /><span className="text-sm">Host</span></Link>
                  <Link to="/seller/menu" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-pink-600/20 text-pink-400 hover:bg-pink-600/30 transition-colors"><Utensils size={16} /><span className="text-sm">Menu</span></Link>
                  <Link to="/seller/analytics" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 transition-colors"><BarChart3 size={16} /><span className="text-sm">Analytics</span></Link>
                  <Link to="/seller/inventory" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-600/20 text-orange-400 hover:bg-orange-600/30 transition-colors"><Package size={16} /><span className="text-sm">Stock</span></Link>
                  <Link to="/seller/qrcodes" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"><QrCode size={16} /><span className="text-sm">QRs</span></Link>
                  <Link to="/tv/1" target="_blank" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-600/20 text-yellow-500 hover:bg-yellow-600/30 transition-colors"><Tv size={16} /><span className="text-sm">TV Mode</span></Link>
                  {userRole === 'ADMIN' && (
                    <Link to="/admin" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 transition-colors"><Shield size={16} /><span className="text-sm">Admin</span></Link>
                  )}
                </>
              ) : null}

              {userRole === 'CHEF' && (
                <Link to="/seller" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-600/20 text-primary-500 hover:bg-primary-600/30 transition-colors"><TerminalSquare size={16} /><span className="text-sm">KDS System</span></Link>
              )}

              {userRole === 'CUSTOMER' ? (
                <>
                  <Link to="/discover" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-600/20 text-primary-400 hover:bg-primary-600/30 transition-colors"><Compass size={16} /><span className="text-sm">Discover</span></Link>
                  <Link to="/stores?type=RESTAURANT" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-600/20 text-orange-400 hover:bg-orange-600/30 transition-colors"><UtensilsCrossed size={16} /><span className="text-sm">Restaurants</span></Link>
                  <Link to="/stores?type=SHOP" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 transition-colors"><Store size={16} /><span className="text-sm">Shops</span></Link>
                  <Link to="/orders" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"><ShoppingBag size={16} /><span className="text-sm">My Orders</span></Link>
                  <Link to="/reserve" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"><Calendar size={16} /><span className="text-sm">Reserve</span></Link>
                </>
              ) : null}

              <button onClick={handleLogout} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors ml-2" title="Logout">
                <LogOut size={20} />
              </button>
            </div>

            {/* Mobile Hamburger Button */}
            <div className="lg:hidden flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                {userRole}
              </div>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 bg-white/5 rounded-xl text-slate-300 hover:text-white transition-colors"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && token && (
        <div className="absolute top-[100%] left-0 w-full bg-dark-950 border-b border-white/5 shadow-2xl p-4 flex flex-col gap-2 lg:hidden animate-in slide-in-from-top-4 duration-200">

          {userRole === 'SELLER' || userRole === 'ADMIN' ? (
            <div className="grid grid-cols-2 gap-2 mb-2">
              <NavLink to="/seller" icon={<TerminalSquare size={18} />} label="POS System" bgClass="bg-primary-600/10 hover:bg-primary-600/20" textClass="text-primary-400" onClick={closeMenu} />
              <NavLink to="/seller/reservations" icon={<Calendar size={18} />} label="Host Stand" bgClass="bg-indigo-600/10 hover:bg-indigo-600/20" textClass="text-indigo-400" onClick={closeMenu} />
              <NavLink to="/seller/menu" icon={<Utensils size={18} />} label="Menu Builder" bgClass="bg-pink-600/10 hover:bg-pink-600/20" textClass="text-pink-400" onClick={closeMenu} />
              <NavLink to="/seller/analytics" icon={<BarChart3 size={18} />} label="Analytics" bgClass="bg-cyan-600/10 hover:bg-cyan-600/20" textClass="text-cyan-400" onClick={closeMenu} />
              <NavLink to="/seller/inventory" icon={<Package size={18} />} label="Stock Manage" bgClass="bg-orange-600/10 hover:bg-orange-600/20" textClass="text-orange-400" onClick={closeMenu} />
              <NavLink to="/seller/qrcodes" icon={<QrCode size={18} />} label="Table QRs" bgClass="bg-white/5 hover:bg-white/10" textClass="text-slate-200" onClick={closeMenu} />
              <NavLink to="/tv/1" icon={<Tv size={18} />} label="Launch TV Dashboard" bgClass="bg-yellow-600/10 hover:bg-yellow-600/20" textClass="text-yellow-500" onClick={closeMenu} />
              {userRole === 'ADMIN' && (
                <NavLink to="/admin" icon={<Shield size={18} />} label="Platform Admin" bgClass="bg-purple-600/10 hover:bg-purple-600/20" textClass="text-purple-400 col-span-2 justify-center" onClick={closeMenu} />
              )}
            </div>
          ) : null}

          {userRole === 'CHEF' && (
            <div className="flex flex-col gap-2 mb-2">
              <NavLink to="/seller" icon={<TerminalSquare size={18} />} label="KDS System" bgClass="bg-primary-600/10 hover:bg-primary-600/20" textClass="text-primary-400" onClick={closeMenu} />
            </div>
          )}

          {userRole === 'CUSTOMER' ? (
            <div className="flex flex-col gap-2 mb-2">
              <NavLink to="/discover" icon={<Compass size={18} />} label="Discover" bgClass="bg-primary-600/10 hover:bg-primary-600/20" textClass="text-primary-400" onClick={closeMenu} />
              <NavLink to="/stores?type=RESTAURANT" icon={<UtensilsCrossed size={18} />} label="Restaurants" bgClass="bg-orange-600/10 hover:bg-orange-600/20" textClass="text-orange-400" onClick={closeMenu} />
              <NavLink to="/stores?type=SHOP" icon={<Store size={18} />} label="Shops" bgClass="bg-purple-600/10 hover:bg-purple-600/20" textClass="text-purple-400" onClick={closeMenu} />
              <NavLink to="/orders" icon={<ShoppingBag size={18} />} label="My Orders" bgClass="bg-white/5 hover:bg-white/10" textClass="text-slate-200" onClick={closeMenu} />
              <NavLink to="/reserve" icon={<Calendar size={18} />} label="Reserve Table" bgClass="bg-white/5 hover:bg-white/10" textClass="text-slate-200" onClick={closeMenu} />
            </div>
          ) : null}

          {userRole === 'DELIVERY' ? (
            <div className="flex flex-col gap-2 mb-2">
              <NavLink to="/delivery" icon={<Navigation size={18} />} label="Deliveries" bgClass="bg-green-600/10 hover:bg-green-600/20" textClass="text-green-400" onClick={closeMenu} />
            </div>
          ) : null}

          <button onClick={handleLogout} className="flex items-center justify-center gap-2 p-3 mt-2 rounded-xl text-red-400 bg-red-400/10 hover:bg-red-400/20 transition-colors font-medium">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
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

        <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
          <Routes>
            {/* Public App Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Signup />} />
            <Route path="/tv/:storeId?" element={<PublicDisplay />} />

            {/* Protected Role-Based Routes */}
            <Route path="/stores" element={<ProtectedRoute role="CUSTOMER"><StoreSelection /></ProtectedRoute>} />
            <Route path="/menu" element={<ProtectedRoute role="CUSTOMER"><CustomerDashboard /></ProtectedRoute>} />
            <Route path="/checkout" element={<ProtectedRoute role="CUSTOMER"><Checkout /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute role="CUSTOMER"><CustomerOrders /></ProtectedRoute>} />
            <Route path="/order/confirmation/:id" element={<ProtectedRoute role="CUSTOMER"><OrderConfirmation /></ProtectedRoute>} />
            <Route path="/order/track/:id" element={<ProtectedRoute role="CUSTOMER"><OrderTracker /></ProtectedRoute>} />
            <Route path="/scan" element={<ProtectedRoute role="CUSTOMER"><ScanHandler /></ProtectedRoute>} />
            <Route path="/reserve" element={<ProtectedRoute role="CUSTOMER"><ReservationForm /></ProtectedRoute>} />
            <Route path="/discover" element={<ProtectedRoute role="CUSTOMER"><DiscoverPage /></ProtectedRoute>} />
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
      </div>
    </Router>
  );
}

export default App;
