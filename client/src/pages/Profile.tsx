import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Phone, Package, Heart, LogOut, MapPin, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../stores';
import api from '../utils/api';
import AddressManager from '../components/AddressManager';
import { SEO } from '../components/SEO';

type Tab = 'profile' | 'addresses';

export default function Profile() {
  const { user, logout, login } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await api.put('/users/profile', formData);
      login(response.data.user, localStorage.getItem('auth_token') || '');
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const tabs = [
    { id: 'profile' as Tab, label: 'Profile', icon: User },
    { id: 'addresses' as Tab, label: 'Addresses', icon: MapPin },
  ];

  return (
    <>
      <SEO title="My Profile" description="Manage your Silvera PH account settings, addresses, and preferences." url="https://silvera.innoserver.cloud/profile" />
      <div className="container-custom py-8 animate-fade-in">
      <h1 className="section-title mb-8">My Account</h1>

      {user && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* User Card */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-gold rounded-full flex items-center justify-center">
                  <span className="text-bg-primary text-lg font-bold">{user.name[0]?.toUpperCase()}</span>
                </div>
                <div>
                  <h2 className="font-semibold text-txt-primary">{user.name}</h2>
                  <p className="text-sm text-txt-tertiary capitalize">{user.role}</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="glass rounded-xl overflow-hidden">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full p-4 flex items-center gap-3 transition-colors border-b border-bdr last:border-b-0 ${
                    activeTab === tab.id 
                      ? 'bg-accent-gold/10 text-accent-gold' 
                      : 'text-txt-secondary hover:bg-bg-tertiary'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="font-medium flex-1 text-left">{tab.label}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ))}
            </div>

            {/* Quick Links */}
            <div className="glass rounded-xl overflow-hidden">
              <Link to="/orders" className="p-4 flex items-center gap-3 hover:bg-bg-tertiary transition-colors border-b border-bdr">
                <Package className="w-5 h-5 text-accent-gold" />
                <span className="font-medium text-txt-primary flex-1">My Orders</span>
                <ChevronRight className="w-4 h-4 text-txt-tertiary" />
              </Link>
              <Link to="/wishlist" className="p-4 flex items-center gap-3 hover:bg-bg-tertiary transition-colors border-b border-bdr">
                <Heart className="w-5 h-5 text-accent-gold" />
                <span className="font-medium text-txt-primary flex-1">Wishlist</span>
                <ChevronRight className="w-4 h-4 text-txt-tertiary" />
              </Link>
              <button
                onClick={handleLogout}
                className="w-full p-4 flex items-center gap-3 hover:bg-red-500/10 transition-colors text-red-500"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium flex-1 text-left">Sign Out</span>
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'profile' && (
              <div className="glass rounded-xl p-6">
                <h3 className="text-lg font-semibold text-txt-primary mb-6 flex items-center gap-2">
                  <User className="w-5 h-5 text-accent-gold" />
                  Profile Information
                </h3>

                {isEditing ? (
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-txt-secondary mb-2">Full Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-txt-secondary mb-2">Email Address</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-txt-secondary mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="input-field"
                        placeholder="09XX XXX XXXX"
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="btn-primary"
                      >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setFormData({ name: user.name, email: user.email, phone: user.phone || '' });
                        }}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-md">
                    <div className="flex items-center gap-3 py-3 border-b border-bdr">
                      <User className="w-5 h-5 text-txt-tertiary" />
                      <div className="flex-1">
                        <p className="text-sm text-txt-tertiary">Full Name</p>
                        <p className="font-medium text-txt-primary">{user.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 py-3 border-b border-bdr">
                      <Mail className="w-5 h-5 text-txt-tertiary" />
                      <div className="flex-1">
                        <p className="text-sm text-txt-tertiary">Email Address</p>
                        <p className="font-medium text-txt-primary">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 py-3 border-b border-bdr">
                      <Phone className="w-5 h-5 text-txt-tertiary" />
                      <div className="flex-1">
                        <p className="text-sm text-txt-tertiary">Phone Number</p>
                        <p className="font-medium text-txt-primary">{user.phone || 'Not set'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="btn-primary mt-4"
                    >
                      Edit Profile
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'addresses' && (
              <AddressManager />
            )}
          </div>
        </div>
      )}
      </div>
    </>
  );
}
