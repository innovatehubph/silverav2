import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Settings,
  Store,
  Truck,
  CreditCard,
  Mail,
  Save,
  Upload,
  Facebook,
  Instagram,
  Twitter,
  Loader2,
} from 'lucide-react';
import api from '../../utils/api';

interface StoreSettings {
  // General
  store_name: string;
  store_logo: string;
  contact_email: string;
  contact_phone: string;
  store_address: string;
  currency: string;
  social_facebook: string;
  social_instagram: string;
  social_twitter: string;
  // Shipping
  free_shipping_threshold: string;
  default_shipping_fee: string;
  // Payment
  payment_cod_enabled: string;
  payment_gcash_enabled: string;
  payment_card_enabled: string;
  // Email
  email_sender_name: string;
  email_sender_email: string;
}

const defaultSettings: StoreSettings = {
  store_name: 'Silvera',
  store_logo: '',
  contact_email: '',
  contact_phone: '',
  store_address: '',
  currency: 'PHP',
  social_facebook: '',
  social_instagram: '',
  social_twitter: '',
  free_shipping_threshold: '2000',
  default_shipping_fee: '150',
  payment_cod_enabled: 'true',
  payment_gcash_enabled: 'true',
  payment_card_enabled: 'true',
  email_sender_name: 'Silvera',
  email_sender_email: '',
};

const tabs = [
  { id: 'general', label: 'General', icon: Store },
  { id: 'shipping', label: 'Shipping', icon: Truck },
  { id: 'payment', label: 'Payment', icon: CreditCard },
  { id: 'email', label: 'Email', icon: Mail },
];

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/admin/settings');
      const loadedSettings = { ...defaultSettings };
      
      // Map array of {key, value} to object
      if (Array.isArray(response.data)) {
        response.data.forEach((item: { key: string; value: string }) => {
          if (item.key in loadedSettings) {
            (loadedSettings as any)[item.key] = item.value;
          }
        });
      }
      
      setSettings(loadedSettings);
      if (loadedSettings.store_logo) {
        setLogoPreview(loadedSettings.store_logo);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: keyof StoreSettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleToggle = (key: keyof StoreSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: prev[key] === 'true' ? 'false' : 'true',
    }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await api.post('/admin/upload/category-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      if (response.data.image?.url) {
        handleChange('store_logo', response.data.image.url);
        toast.success('Logo uploaded successfully');
      }
    } catch (error) {
      console.error('Failed to upload logo:', error);
      toast.error('Failed to upload logo');
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/admin/settings', { settings });
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-accent-gold" />
          <span className="text-sm text-txt-secondary">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings className="text-accent-gold" size={28} />
          <h1 className="text-2xl font-bold">
            <span className="text-gradient-gold">Settings</span>
          </h1>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save size={18} />
          )}
          Save All Settings
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-bdr-subtle pb-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
              ${activeTab === tab.id
                ? 'bg-gold/10 text-accent-gold border border-accent-gold/30'
                : 'text-txt-secondary hover:text-txt-primary hover:bg-bg-hover'
              }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="card p-6">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-txt-primary mb-4">Store Information</h2>
            
            {/* Store Logo */}
            <div>
              <label className="block text-sm font-medium text-txt-secondary mb-2">
                Store Logo
              </label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-lg border border-bdr bg-bg-secondary flex items-center justify-center overflow-hidden">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Store size={32} className="text-txt-tertiary" />
                  )}
                </div>
                <label className="btn-secondary flex items-center gap-2 cursor-pointer">
                  <Upload size={18} />
                  Upload Logo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Store Name */}
            <div>
              <label className="block text-sm font-medium text-txt-secondary mb-2">
                Store Name
              </label>
              <input
                type="text"
                value={settings.store_name}
                onChange={(e) => handleChange('store_name', e.target.value)}
                className="input w-full"
                placeholder="Enter store name"
              />
            </div>

            {/* Contact Email */}
            <div>
              <label className="block text-sm font-medium text-txt-secondary mb-2">
                Contact Email
              </label>
              <input
                type="email"
                value={settings.contact_email}
                onChange={(e) => handleChange('contact_email', e.target.value)}
                className="input w-full"
                placeholder="contact@yourstore.com"
              />
            </div>

            {/* Contact Phone */}
            <div>
              <label className="block text-sm font-medium text-txt-secondary mb-2">
                Contact Phone
              </label>
              <input
                type="tel"
                value={settings.contact_phone}
                onChange={(e) => handleChange('contact_phone', e.target.value)}
                className="input w-full"
                placeholder="+63 XXX XXX XXXX"
              />
            </div>

            {/* Store Address */}
            <div>
              <label className="block text-sm font-medium text-txt-secondary mb-2">
                Store Address
              </label>
              <textarea
                value={settings.store_address}
                onChange={(e) => handleChange('store_address', e.target.value)}
                className="input w-full h-24 resize-none"
                placeholder="Enter full store address"
              />
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-txt-secondary mb-2">
                Currency
              </label>
              <select
                value={settings.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="input w-full"
              >
                <option value="PHP">PHP - Philippine Peso (₱)</option>
                <option value="USD">USD - US Dollar ($)</option>
                <option value="EUR">EUR - Euro (€)</option>
              </select>
            </div>

            {/* Social Media Links */}
            <div className="pt-4 border-t border-bdr-subtle">
              <h3 className="text-md font-semibold text-txt-primary mb-4">Social Media Links</h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-900/30 flex items-center justify-center">
                    <Facebook size={20} className="text-blue-400" />
                  </div>
                  <input
                    type="url"
                    value={settings.social_facebook}
                    onChange={(e) => handleChange('social_facebook', e.target.value)}
                    className="input flex-1"
                    placeholder="https://facebook.com/yourpage"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-pink-900/30 flex items-center justify-center">
                    <Instagram size={20} className="text-pink-400" />
                  </div>
                  <input
                    type="url"
                    value={settings.social_instagram}
                    onChange={(e) => handleChange('social_instagram', e.target.value)}
                    className="input flex-1"
                    placeholder="https://instagram.com/yourpage"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-sky-900/30 flex items-center justify-center">
                    <Twitter size={20} className="text-sky-400" />
                  </div>
                  <input
                    type="url"
                    value={settings.social_twitter}
                    onChange={(e) => handleChange('social_twitter', e.target.value)}
                    className="input flex-1"
                    placeholder="https://twitter.com/yourpage"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Shipping Tab */}
        {activeTab === 'shipping' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-txt-primary mb-4">Shipping Configuration</h2>

            {/* Free Shipping Threshold */}
            <div>
              <label className="block text-sm font-medium text-txt-secondary mb-2">
                Free Shipping Threshold (₱)
              </label>
              <input
                type="number"
                value={settings.free_shipping_threshold}
                onChange={(e) => handleChange('free_shipping_threshold', e.target.value)}
                className="input w-full"
                placeholder="2000"
                min="0"
              />
              <p className="text-xs text-txt-tertiary mt-1">
                Orders above this amount get free shipping. Set to 0 to disable.
              </p>
            </div>

            {/* Default Shipping Fee */}
            <div>
              <label className="block text-sm font-medium text-txt-secondary mb-2">
                Default Shipping Fee (₱)
              </label>
              <input
                type="number"
                value={settings.default_shipping_fee}
                onChange={(e) => handleChange('default_shipping_fee', e.target.value)}
                className="input w-full"
                placeholder="150"
                min="0"
              />
              <p className="text-xs text-txt-tertiary mt-1">
                Standard shipping fee for orders below the free shipping threshold.
              </p>
            </div>

            {/* Coming Soon */}
            <div className="p-4 rounded-lg bg-bg-tertiary/50 border border-bdr-subtle">
              <h3 className="text-sm font-medium text-txt-secondary mb-2">Coming Soon</h3>
              <ul className="text-sm text-txt-tertiary space-y-1">
                <li>• Shipping zones configuration</li>
                <li>• Weight-based shipping rates</li>
                <li>• Carrier integration (LBC, J&T, etc.)</li>
              </ul>
            </div>
          </div>
        )}

        {/* Payment Tab */}
        {activeTab === 'payment' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-txt-primary mb-4">Payment Methods</h2>
            <p className="text-sm text-txt-tertiary mb-4">
              Enable or disable payment methods available at checkout.
            </p>

            {/* COD */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-bg-tertiary/50 border border-bdr-subtle">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-900/30 flex items-center justify-center">
                  <span className="text-green-400 font-bold text-xs">COD</span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-txt-primary">Cash on Delivery</h3>
                  <p className="text-xs text-txt-tertiary">Pay when you receive your order</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('payment_cod_enabled')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.payment_cod_enabled === 'true' ? 'bg-accent-gold' : 'bg-bg-secondary'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.payment_cod_enabled === 'true' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* GCash */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-bg-tertiary/50 border border-bdr-subtle">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-900/30 flex items-center justify-center">
                  <span className="text-blue-400 font-bold text-xs">GC</span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-txt-primary">GCash</h3>
                  <p className="text-xs text-txt-tertiary">Pay via GCash QR or number</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('payment_gcash_enabled')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.payment_gcash_enabled === 'true' ? 'bg-accent-gold' : 'bg-bg-secondary'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.payment_gcash_enabled === 'true' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Card */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-bg-tertiary/50 border border-bdr-subtle">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-900/30 flex items-center justify-center">
                  <CreditCard size={20} className="text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-txt-primary">Credit/Debit Card</h3>
                  <p className="text-xs text-txt-tertiary">Visa, Mastercard, etc.</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('payment_card_enabled')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.payment_card_enabled === 'true' ? 'bg-accent-gold' : 'bg-bg-secondary'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.payment_card_enabled === 'true' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Note */}
            <div className="p-4 rounded-lg bg-yellow-900/20 border border-yellow-700/30">
              <p className="text-sm text-yellow-400">
                <strong>Note:</strong> Payment gateway API keys are configured in environment variables for security. Contact your administrator to update payment credentials.
              </p>
            </div>
          </div>
        )}

        {/* Email Tab */}
        {activeTab === 'email' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-txt-primary mb-4">Email Configuration</h2>

            {/* Sender Name */}
            <div>
              <label className="block text-sm font-medium text-txt-secondary mb-2">
                Sender Name
              </label>
              <input
                type="text"
                value={settings.email_sender_name}
                onChange={(e) => handleChange('email_sender_name', e.target.value)}
                className="input w-full"
                placeholder="Silvera Shop"
              />
              <p className="text-xs text-txt-tertiary mt-1">
                Name that appears as the sender in customer emails.
              </p>
            </div>

            {/* Sender Email */}
            <div>
              <label className="block text-sm font-medium text-txt-secondary mb-2">
                Sender Email
              </label>
              <input
                type="email"
                value={settings.email_sender_email}
                onChange={(e) => handleChange('email_sender_email', e.target.value)}
                className="input w-full"
                placeholder="noreply@yourstore.com"
              />
              <p className="text-xs text-txt-tertiary mt-1">
                Email address used for sending transactional emails.
              </p>
            </div>

            {/* Coming Soon */}
            <div className="p-4 rounded-lg bg-bg-tertiary/50 border border-bdr-subtle">
              <h3 className="text-sm font-medium text-txt-secondary mb-2">Coming Soon</h3>
              <ul className="text-sm text-txt-tertiary space-y-1">
                <li>• Email template customization</li>
                <li>• Order confirmation template</li>
                <li>• Shipping notification template</li>
                <li>• Marketing email settings</li>
              </ul>
            </div>

            {/* Note */}
            <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-700/30">
              <p className="text-sm text-blue-400">
                <strong>Note:</strong> SMTP credentials and email provider settings are configured in environment variables. Contact your administrator to update email service configuration.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
