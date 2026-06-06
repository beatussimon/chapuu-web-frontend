import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useStore';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import { Search, UserCheck, Store, MapPin, Phone, Mail, Upload, Plus, X, ArrowRight, RefreshCcw, Image as ImageIcon, ClipboardList } from 'lucide-react';

export default function StaffPortal() {
  const { userRole } = useAppStore();
  const [activeTab, setActiveTab] = useState('REGISTER');

  // Lookup State
  const [searchUsername, setSearchUsername] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    store_name: '',
    store_type: 'RESTAURANT',
    location: '',
    latitude: '',
    longitude: '',
    directions: '',
    contact_phone: '',
    contact_email: '',
    estimated_customer_base: '',
    service_quality_rating: 'MID',
    staff_notes: '',
    trial_period_days: 0,
  });
  const [venuePhotos, setVenuePhotos] = useState([]); // Array of File objects
  const [existingPhotos, setExistingPhotos] = useState([]); // Array of existing photos
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Submissions State
  const [submissions, setSubmissions] = useState([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);

  // Edit Mode State
  const [editAppId, setEditAppId] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (activeTab === 'SUBMISSIONS') {
      fetchSubmissions();
    }
  }, [activeTab]);

  const fetchSubmissions = async () => {
    setIsLoadingSubmissions(true);
    try {
      const res = await apiClient.get('/seller-applications/');
      const appsData = res.data?.results || res.data;
      setSubmissions(Array.isArray(appsData) ? appsData : []);
    } catch (err) {
      toast.error("Failed to load submissions.");
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchUsername.trim()) return;
    setIsSearching(true);
    setFoundUser(null);
    try {
      const res = await apiClient.get(`/seller-applications/lookup_user/?q=${searchUsername}`);
      setFoundUser(res.data);
      setFormData(prev => ({ ...prev, contact_phone: res.data.phone_number || '', contact_email: res.data.email || '' }));
    } catch (err) {
      toast.error(err.response?.data?.error || "User not found");
    } finally {
      setIsSearching(false);
    }
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported by browser");
      return;
    }
    toast.loading("Locating...", { id: "geo" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        }));
        toast.success("Location captured!", { id: "geo" });
      },
      (error) => {
        toast.error("Failed to get location", { id: "geo" });
      }
    );
  };

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files);
    if (venuePhotos.length + files.length > 5) {
      toast.error("Maximum 5 venue photos allowed.");
      return;
    }
    setVenuePhotos([...venuePhotos, ...files]);
  };

  const removePhoto = (index) => {
    setVenuePhotos(venuePhotos.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFoundUser(null);
    setSearchUsername('');
    setFormData({
      store_name: '', store_type: 'RESTAURANT', location: '', latitude: '', longitude: '', directions: '', contact_phone: '', contact_email: '', estimated_customer_base: '', service_quality_rating: 'MID', staff_notes: '', trial_period_days: 0
    });
    setVenuePhotos([]);
    setExistingPhotos([]);
    setEditAppId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!foundUser && !editAppId) {
      toast.error("Please find a customer first.");
      return;
    }
    if (venuePhotos.length === 0 && !editAppId) {
      toast.error("At least one venue photo is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      let appId = editAppId;

      if (!editAppId) {
        // Create new application
        const payload = {
          ...formData,
          applicant: foundUser.id
        };
        const res = await apiClient.post('/seller-applications/', payload);
        appId = res.data.id;
      } else {
        // Edit rejected application
        await apiClient.patch(`/seller-applications/${editAppId}/`, formData);
      }

      // Upload new photos sequentially
      for (const photo of venuePhotos) {
        if (photo instanceof File) {
          const formData = new FormData();
          formData.append('image', photo);
          await apiClient.post(`/seller-applications/${appId}/upload_photos/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
      }

      toast.success(editAppId ? "Application re-submitted successfully!" : "Application submitted successfully!");
      resetForm();
      setActiveTab('SUBMISSIONS');
    } catch (err) {
      toast.error(err.response?.data?.error || "Submission failed. Check details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditRejected = async (appId) => {
    toast.loading("Loading application details...", { id: "edit" });
    try {
      const res = await apiClient.get(`/seller-applications/${appId}/`);
      const app = res.data;
      setEditAppId(app.id);
      setFormData({
        store_name: app.store_name,
        store_type: app.store_type,
        location: app.location,
        latitude: app.latitude || '',
        longitude: app.longitude || '',
        directions: app.directions,
        contact_phone: app.contact_phone,
        contact_email: app.contact_email,
        estimated_customer_base: app.estimated_customer_base || '',
        service_quality_rating: app.service_quality_rating || 'MID',
        staff_notes: app.staff_notes || '',
        trial_period_days: app.trial_period_days || 0,
      });
      // Look up the user to populate the card
      const userRes = await apiClient.get(`/seller-applications/lookup_user/?q=${app.applicant_username}`);
      setFoundUser(userRes.data);
      setVenuePhotos([]); // Clear local photos, existing ones are on server
      setExistingPhotos(app.venue_photos || []);
      setActiveTab('REGISTER');
      toast.dismiss("edit");
    } catch (err) {
      toast.error("Failed to load application.", { id: "edit" });
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'AWAITING_SIGNATURE': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      'PENDING_REVIEW': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      'UNDER_REVIEW': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'APPROVED': 'bg-green-500/20 text-green-400 border-green-500/30',
      'REJECTED': 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return <span className={`px-2 py-1 text-xs font-bold rounded-full border ${badges[status] || badges['PENDING_REVIEW']}`}>{status.replace('_', ' ')}</span>;
  };

  if (userRole !== 'CHAPUUSTAFF') return null;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-wider">Staff Portal</h1>
          <p className="text-slate-400">Register new sellers and manage your submissions.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-white/10 pb-4">
        <button onClick={() => setActiveTab('REGISTER')} className={`px-4 py-2 rounded-xl font-bold transition-all ${activeTab === 'REGISTER' ? 'bg-primary-500 text-dark-950' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
          {editAppId ? 'Edit Application' : 'Register New Seller'}
        </button>
        <button onClick={() => setActiveTab('SUBMISSIONS')} className={`px-4 py-2 rounded-xl font-bold transition-all ${activeTab === 'SUBMISSIONS' ? 'bg-primary-500 text-dark-950' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
          My Submissions
        </button>
      </div>

      {activeTab === 'REGISTER' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Customer Lookup */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-dark-900 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">1. Find Customer</h2>
              {!editAppId ? (
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" value={searchUsername} onChange={(e) => setSearchUsername(e.target.value)} placeholder="Username..." className="w-full bg-dark-950 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:outline-none focus:border-primary-500 transition-colors" />
                  </div>
                  <button type="submit" disabled={isSearching} className="bg-white/10 hover:bg-white/20 text-white px-4 rounded-xl font-bold transition-colors">
                    {isSearching ? '...' : 'Find'}
                  </button>
                </form>
              ) : (
                <p className="text-xs text-amber-400 bg-amber-500/10 p-2 rounded-lg">Editing application #{editAppId}. Customer cannot be changed.</p>
              )}

              {foundUser && (
                <div className="mt-6 p-4 rounded-xl border border-primary-500/30 bg-primary-500/5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400">
                      <UserCheck size={20} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold">{foundUser.first_name} {foundUser.last_name}</h3>
                      <p className="text-xs text-slate-400">@{foundUser.username}</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm mt-4">
                    <p className="text-slate-300">📧 {foundUser.email}</p>
                    <p className="text-slate-300">📱 {foundUser.phone_number || 'N/A'}</p>
                  </div>
                  
                  {foundUser.role === 'SELLER' && (
                    <div className="mt-4 p-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-xs font-bold">
                      ⚠️ This user is already a SELLER.
                    </div>
                  )}
                  {foundUser.has_active_application && !editAppId && (
                    <div className="mt-4 p-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-xs font-bold">
                      ⚠️ This user already has an active application.
                    </div>
                  )}
                  {foundUser.role === 'CUSTOMER' && !foundUser.has_active_application && !editAppId && (
                    <div className="mt-4 p-2 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-xs font-bold">
                      ✅ Eligible for Seller Application
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Store Details & Submission */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-dark-900 border border-white/10 rounded-2xl p-6 space-y-6">
              <h2 className="text-lg font-bold text-white mb-4">2. Store & Venue Details</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Store Name *</label>
                  <input required type="text" name="store_name" value={formData.store_name} onChange={handleFormChange} className="w-full bg-dark-950 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary-500 transition-colors" placeholder="e.g. Mama Ntilie's Kitchen" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Store Type *</label>
                  <select name="store_type" value={formData.store_type} onChange={handleFormChange} className="w-full bg-dark-950 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary-500 transition-colors">
                    <option value="RESTAURANT">Restaurant / Food</option>
                    <option value="SHOP">Retail Shop</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Location Name *</label>
                <input required type="text" name="location" value={formData.location} onChange={handleFormChange} className="w-full bg-dark-950 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary-500 transition-colors" placeholder="e.g. Masaki, Dar es Salaam" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex justify-between">
                    <span>GPS Coordinates</span>
                    <button type="button" onClick={handleGeolocate} className="text-primary-400 hover:text-primary-300">Auto Locate 📍</button>
                  </label>
                  <div className="flex gap-2">
                    <input type="text" name="latitude" value={formData.latitude} onChange={handleFormChange} placeholder="Lat" className="w-1/2 bg-dark-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-slate-300" />
                    <input type="text" name="longitude" value={formData.longitude} onChange={handleFormChange} placeholder="Lng" className="w-1/2 bg-dark-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-slate-300" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Directions / Landmarks</label>
                  <input type="text" name="directions" value={formData.directions} onChange={handleFormChange} className="w-full bg-dark-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-slate-300" placeholder="Near the big baobab tree" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Store Phone</label>
                  <input type="text" name="contact_phone" value={formData.contact_phone} onChange={handleFormChange} className="w-full bg-dark-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-slate-300" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Store Email</label>
                  <input type="email" name="contact_email" value={formData.contact_email} onChange={handleFormChange} className="w-full bg-dark-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-slate-300" />
                </div>
              </div>

              {/* Staff Evaluation Checklist */}
              <div className="pt-4 border-t border-white/10 space-y-4">
                <h3 className="text-sm font-bold text-primary-400">Staff Evaluation Checklist</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Estimated Customer Base</label>
                    <input type="text" name="estimated_customer_base" value={formData.estimated_customer_base} onChange={handleFormChange} className="w-full bg-dark-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-slate-300" placeholder="e.g. 50-100 daily" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Service Quality Rating *</label>
                    <select name="service_quality_rating" value={formData.service_quality_rating} onChange={handleFormChange} className="w-full bg-dark-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-primary-500 transition-colors">
                      <option value="LOW">Low</option>
                      <option value="MID">Mid</option>
                      <option value="HIGH">High</option>
                      <option value="SUPER">Super</option>
                      <option value="PERFECT">Perfect</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Free Trial Offer</label>
                  <select name="trial_period_days" value={formData.trial_period_days} onChange={handleFormChange} className="w-full bg-dark-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-primary-500 transition-colors">
                    <option value={0}>None</option>
                    <option value={7}>7 Days</option>
                    <option value={14}>14 Days</option>
                    <option value={30}>30 Days</option>
                    <option value={60}>60 Days</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Staff Notes & Explanation</label>
                  <textarea name="staff_notes" value={formData.staff_notes} onChange={handleFormChange} rows={3} className="w-full bg-dark-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-slate-300 resize-none" placeholder="Provide extra info about the venue, owner, or potential..." />
                </div>
              </div>

              {/* Photos */}
              <div className="pt-4 border-t border-white/10">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Venue Photos (1-5 required) *</label>
                <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handlePhotoSelect} />
                
                <div className="flex flex-wrap gap-4 mt-4">
                  {existingPhotos.map((photo) => (
                    <div key={photo.id} className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/10 bg-dark-950 group">
                      <img src={photo.image} alt="existing" className="w-full h-full object-cover opacity-60 grayscale-[50%]" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="text-[9px] uppercase font-bold text-white tracking-widest bg-dark-950/80 px-2 py-1 rounded">Saved</span>
                      </div>
                    </div>
                  ))}
                  {venuePhotos.map((photo, index) => (
                    <div key={index} className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/10 bg-dark-950 group">
                      <img src={URL.createObjectURL(photo)} alt="preview" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removePhoto(index)} className="absolute top-1 right-1 w-6 h-6 bg-black/50 hover:bg-red-500 rounded-full flex items-center justify-center text-white transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  
                  {venuePhotos.length < 5 && (
                    <button type="button" onClick={() => fileInputRef.current.click()} className="w-24 h-24 rounded-xl border-2 border-dashed border-white/20 hover:border-primary-500/50 hover:bg-primary-500/5 flex flex-col items-center justify-center text-slate-400 hover:text-primary-400 transition-all">
                      <Plus size={24} className="mb-1" />
                      <span className="text-[10px] uppercase font-bold">Add Photo</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 flex justify-end gap-4">
                {editAppId && (
                  <button type="button" onClick={resetForm} className="px-6 py-3 rounded-xl font-bold text-slate-300 hover:bg-white/10 transition-colors">Cancel Edit</button>
                )}
                <button 
                  type="submit" 
                  disabled={isSubmitting || !foundUser || (venuePhotos.length === 0 && !editAppId)} 
                  className="px-8 py-3 rounded-xl font-bold bg-primary-500 text-dark-950 hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? 'Submitting...' : (editAppId ? 'Submit Corrections' : 'Send to Customer to Sign')}
                  {!isSubmitting && <ArrowRight size={18} />}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'SUBMISSIONS' && (
        <div className="bg-dark-900 border border-white/10 rounded-2xl overflow-hidden">
          {isLoadingSubmissions ? (
            <div className="p-8 text-center text-slate-400">Loading...</div>
          ) : submissions.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <ClipboardList size={48} className="mx-auto mb-4 opacity-20" />
              <p>You haven't submitted any applications yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-dark-950/50 text-xs uppercase font-black text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Store Name</th>
                    <th className="px-6 py-4">Photos</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {submissions.map((app) => (
                    <tr key={app.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">{new Date(app.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">{app.applicant_name}</div>
                        <div className="text-xs text-slate-500">@{app.applicant_username}</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-white">{app.store_name}</td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1 text-xs text-slate-400"><ImageIcon size={14} /> {app.venue_photos_count}</span>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(app.status)}</td>
                      <td className="px-6 py-4 text-right">
                        {app.status === 'REJECTED' && (
                          <button onClick={() => handleEditRejected(app.id)} className="text-xs font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ml-auto">
                            <RefreshCcw size={12} /> Edit & Resubmit
                          </button>
                        )}
                        {app.status !== 'REJECTED' && (
                          <span className="text-xs text-slate-500">Locked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
