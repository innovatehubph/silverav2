'use client';

import { useState } from 'react';
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Textarea,
  Alert,
} from '@/components/ui';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    storeName: 'Silvera Shop',
    storeEmail: 'support@silveraph.shop',
    storePhone: '+63 9XX XXXXXXX',
    storeAddress: '123 Main Street, Metro Manila, Philippines',
    businessHoursStart: '09:00',
    businessHoursEnd: '18:00',
    shippingPolicy: 'Free shipping for orders above ₱1000',
    returnPolicy: '30-day money-back guarantee',
    currency: 'PHP',
    taxRate: '12',
  });

  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Saving store settings:', settings);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div>
      <PageHeader
        title="Store Settings"
        description="Configure your store information and policies"
      />

      {success && (
        <Alert type="success">Settings saved successfully!</Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Store Information */}
        <Card>
          <CardHeader>
            <CardTitle>Store Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Store Name"
              name="storeName"
              value={settings.storeName}
              onChange={handleChange}
              placeholder="Your store name"
            />
            <Input
              label="Store Email"
              name="storeEmail"
              type="email"
              value={settings.storeEmail}
              onChange={handleChange}
              placeholder="support@example.com"
            />
            <Input
              label="Store Phone"
              name="storePhone"
              value={settings.storePhone}
              onChange={handleChange}
              placeholder="+63 9XX XXXXXXX"
            />
            <Textarea
              label="Store Address"
              name="storeAddress"
              value={settings.storeAddress}
              onChange={handleChange}
              placeholder="Full store address"
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Business Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Business Hours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Opening Time"
                name="businessHoursStart"
                type="time"
                value={settings.businessHoursStart}
                onChange={handleChange}
              />
              <Input
                label="Closing Time"
                name="businessHoursEnd"
                type="time"
                value={settings.businessHoursEnd}
                onChange={handleChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Policies */}
        <Card>
          <CardHeader>
            <CardTitle>Shipping & Return Policies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              label="Shipping Policy"
              name="shippingPolicy"
              value={settings.shippingPolicy}
              onChange={handleChange}
              placeholder="Describe your shipping policy"
              rows={4}
            />
            <Textarea
              label="Return Policy"
              name="returnPolicy"
              value={settings.returnPolicy}
              onChange={handleChange}
              placeholder="Describe your return policy"
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Regional Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Regional Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Currency</label>
                <select
                  value={settings.currency}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      currency: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="PHP">Philippine Peso (₱)</option>
                  <option value="USD">US Dollar ($)</option>
                  <option value="EUR">Euro (€)</option>
                </select>
              </div>
              <Input
                label="Tax Rate (%)"
                name="taxRate"
                type="number"
                value={settings.taxRate}
                onChange={handleChange}
                step="0.01"
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex gap-4">
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Save Settings
          </Button>
          <Button
            type="button"
            className="bg-slate-300 hover:bg-slate-400 text-slate-900"
            onClick={() => window.location.reload()}
          >
            Discard Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
