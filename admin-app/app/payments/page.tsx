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
  Alert,
} from '@/components/ui';

export default function PaymentsPage() {
  const [settings, setSettings] = useState({
    gcash_enabled: true,
    paymaya_enabled: true,
    cod_enabled: true,
    bank_transfer_enabled: false,
    credit_card_enabled: true,
    gcash_phone: '',
    paymaya_email: '',
    bank_account: '',
  });

  const [success, setSuccess] = useState(false);

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: typeof prev[key] === 'boolean' ? !prev[key] : prev[key],
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Saving payment settings:', settings);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div>
      <PageHeader
        title="Payment Settings"
        description="Configure payment methods and gateways"
      />

      {success && (
        <Alert type="success">Payment settings saved successfully!</Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* GCash */}
            <div className="flex items-center justify-between p-4 border rounded">
              <div>
                <h3 className="font-medium">GCash</h3>
                <p className="text-sm text-slate-600">Mobile payment gateway</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.gcash_enabled}
                  onChange={() => handleToggle('gcash_enabled')}
                  className="w-4 h-4"
                />
                <span className="text-sm">
                  {settings.gcash_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>

            {/* PayMaya */}
            <div className="flex items-center justify-between p-4 border rounded">
              <div>
                <h3 className="font-medium">PayMaya</h3>
                <p className="text-sm text-slate-600">Digital payments platform</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.paymaya_enabled}
                  onChange={() => handleToggle('paymaya_enabled')}
                  className="w-4 h-4"
                />
                <span className="text-sm">
                  {settings.paymaya_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>

            {/* Cash on Delivery */}
            <div className="flex items-center justify-between p-4 border rounded">
              <div>
                <h3 className="font-medium">Cash on Delivery (COD)</h3>
                <p className="text-sm text-slate-600">Pay when order arrives</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.cod_enabled}
                  onChange={() => handleToggle('cod_enabled')}
                  className="w-4 h-4"
                />
                <span className="text-sm">
                  {settings.cod_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>

            {/* Bank Transfer */}
            <div className="flex items-center justify-between p-4 border rounded">
              <div>
                <h3 className="font-medium">Bank Transfer</h3>
                <p className="text-sm text-slate-600">Direct bank payment</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.bank_transfer_enabled}
                  onChange={() => handleToggle('bank_transfer_enabled')}
                  className="w-4 h-4"
                />
                <span className="text-sm">
                  {settings.bank_transfer_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>

            {/* Credit Card */}
            <div className="flex items-center justify-between p-4 border rounded">
              <div>
                <h3 className="font-medium">Credit/Debit Card</h3>
                <p className="text-sm text-slate-600">Online card payments</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.credit_card_enabled}
                  onChange={() => handleToggle('credit_card_enabled')}
                  className="w-4 h-4"
                />
                <span className="text-sm">
                  {settings.credit_card_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Payment Gateway Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Gateway Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.gcash_enabled && (
              <Input
                label="GCash Account Number"
                name="gcash_phone"
                value={settings.gcash_phone}
                onChange={handleChange}
                placeholder="09XXXXXXXXX"
              />
            )}

            {settings.paymaya_enabled && (
              <Input
                label="PayMaya Email"
                name="paymaya_email"
                value={settings.paymaya_email}
                onChange={handleChange}
                placeholder="your.email@paymaya.com"
              />
            )}

            {settings.bank_transfer_enabled && (
              <Input
                label="Bank Account Details"
                name="bank_account"
                value={settings.bank_account}
                onChange={handleChange}
                placeholder="Bank name and account number"
              />
            )}
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
            Reset
          </Button>
        </div>
      </form>
    </div>
  );
}
