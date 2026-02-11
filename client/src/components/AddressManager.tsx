import { useState, useEffect } from 'react';
import { MapPin, Plus, Pencil, Trash2, Star, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import AddressForm from './AddressForm';

interface Address {
  id: number;
  label: string;
  name: string;
  phone: string;
  region_code: string;
  region: string;
  province: string;
  municipality: string;
  barangay: string;
  street_address: string;
  zip_code: string;
  is_default: boolean;
}

interface AddressManagerProps {
  onAddressSelect?: (address: Address) => void;
  selectable?: boolean;
  selectedId?: number;
}

export default function AddressManager({ 
  onAddressSelect, 
  selectable = false,
  selectedId 
}: AddressManagerProps) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchAddresses = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/addresses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAddresses(data);
      }
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleSubmit = async (data: any) => {
    const token = localStorage.getItem('token');
    const url = editingAddress 
      ? `/api/addresses/${editingAddress.id}` 
      : '/api/addresses';
    const method = editingAddress ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        toast.success(editingAddress ? 'Address updated!' : 'Address saved!');
        setShowForm(false);
        setEditingAddress(null);
        fetchAddresses();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to save address');
      }
    } catch (error) {
      toast.error('Failed to save address');
    }
  };

  const handleDelete = async (id: number) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/addresses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success('Address deleted');
        setDeletingId(null);
        fetchAddresses();
      } else {
        toast.error('Failed to delete address');
      }
    } catch (error) {
      toast.error('Failed to delete address');
    }
  };

  const handleSetDefault = async (id: number) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/addresses/${id}/default`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success('Default address updated');
        fetchAddresses();
      }
    } catch (error) {
      toast.error('Failed to set default');
    }
  };

  const formatAddress = (addr: Address) => {
    const parts = [
      addr.street_address,
      addr.barangay,
      addr.municipality,
      addr.province,
      addr.region,
      addr.zip_code
    ].filter(Boolean);
    return parts.join(', ');
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-bg-tertiary rounded w-1/3"></div>
          <div className="h-24 bg-bg-tertiary rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-txt-primary flex items-center gap-2">
          <MapPin className="w-5 h-5 text-accent-gold" />
          {selectable ? 'Select Delivery Address' : 'My Addresses'}
        </h3>
        {!showForm && !editingAddress && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary-sm flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Add New
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {(showForm || editingAddress) && (
        <div className="glass rounded-xl p-6">
          <h4 className="text-md font-medium text-txt-primary mb-4">
            {editingAddress ? 'Edit Address' : 'New Address'}
          </h4>
          <AddressForm
            initialData={editingAddress || undefined}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingAddress(null);
            }}
            submitLabel={editingAddress ? 'Update Address' : 'Save Address'}
          />
        </div>
      )}

      {/* Address List */}
      {!showForm && !editingAddress && (
        <div className="space-y-3">
          {addresses.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center">
              <MapPin className="w-12 h-12 text-txt-tertiary mx-auto mb-3" />
              <p className="text-txt-secondary">No saved addresses</p>
              <p className="text-txt-tertiary text-sm mt-1">Add an address for faster checkout</p>
            </div>
          ) : (
            addresses.map(address => (
              <div
                key={address.id}
                onClick={() => selectable && onAddressSelect?.(address)}
                className={`glass rounded-xl p-4 transition-all ${
                  selectable ? 'cursor-pointer hover:border-accent-gold' : ''
                } ${selectedId === address.id ? 'border-2 border-accent-gold' : 'border border-transparent'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-bg-tertiary text-txt-secondary">
                        {address.label}
                      </span>
                      {address.is_default && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-accent-gold/20 text-accent-gold flex items-center gap-1">
                          <Star className="w-3 h-3" /> Default
                        </span>
                      )}
                      {selectedId === address.id && (
                        <Check className="w-4 h-4 text-accent-gold" />
                      )}
                    </div>
                    <p className="font-medium text-txt-primary">{address.name}</p>
                    <p className="text-sm text-txt-secondary">{address.phone}</p>
                    <p className="text-sm text-txt-tertiary mt-1">{formatAddress(address)}</p>
                  </div>

                  {!selectable && (
                    <div className="flex items-center gap-2 ml-4">
                      {!address.is_default && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetDefault(address.id);
                          }}
                          className="p-2 text-txt-tertiary hover:text-accent-gold transition-colors"
                          title="Set as default"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAddress(address);
                        }}
                        className="p-2 text-txt-tertiary hover:text-accent-gold transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {deletingId === address.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(address.id);
                            }}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                            title="Confirm delete"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingId(null);
                            }}
                            className="p-2 text-txt-tertiary hover:text-txt-primary transition-colors"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingId(address.id);
                          }}
                          className="p-2 text-txt-tertiary hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
