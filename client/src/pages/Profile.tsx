import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Phone, Package, Heart, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../stores';
import api from '../utils/api';

export default function Profile() {
  const { user, logout, login } = useAuthStore();
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

  return (
    <div className="container-custom py-8 animate-fade-in">
      <h1 className="section-title mb-8">My Profile</h1>

      {user && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="md:col-span-2">
            <div className="card p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">{user.name[0]?.toUpperCase()}</span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{user.name}</h2>
                  <p className="text-txt-tertiary capitalize">{user.role}</p>
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-txt-secondary mb-1">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-txt-secondary mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-txt-secondary mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="input-field"
                      placeholder="+63 912 345 6789"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
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
                <div className="space-y-4">
                  <div className="flex items-center gap-3 py-3 border-b border-bdr">
                    <User className="w-5 h-5 text-txt-tertiary" />
                    <div>
                      <p className="text-sm text-txt-tertiary">Name</p>
                      <p className="font-medium">{user.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 py-3 border-b border-bdr">
                    <Mail className="w-5 h-5 text-txt-tertiary" />
                    <div>
                      <p className="text-sm text-txt-tertiary">Email</p>
                      <p className="font-medium">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 py-3 border-b border-bdr">
                    <Phone className="w-5 h-5 text-txt-tertiary" />
                    <div>
                      <p className="text-sm text-txt-tertiary">Phone</p>
                      <p className="font-medium">{user.phone || 'Not set'}</p>
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
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Link to="/orders" className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
              <Package className="w-5 h-5 text-gold" />
              <span className="font-medium">My Orders</span>
            </Link>
            <Link to="/wishlist" className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
              <Heart className="w-5 h-5 text-gold" />
              <span className="font-medium">Wishlist</span>
            </Link>
            <button
              onClick={handleLogout}
              className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow w-full text-left text-red-600"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
