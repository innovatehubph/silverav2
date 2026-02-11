import { useState, useEffect } from 'react';
import { MapPin, User, Phone, Home, ChevronDown } from 'lucide-react';

interface Region {
  code: string;
  name: string;
}

interface Province {
  name: string;
  region_code: string;
}

interface Municipality {
  name: string;
  province: string;
  region_code: string;
  zip_code: string;
}

interface Barangay {
  name: string;
  municipality: string;
}

interface AddressData {
  id?: number;
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
  is_default?: boolean;
}

interface AddressFormProps {
  initialData?: Partial<AddressData>;
  onSubmit: (data: AddressData) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

export default function AddressForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  submitLabel = 'Save Address' 
}: AddressFormProps) {
  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  
  const [formData, setFormData] = useState<AddressData>({
    label: initialData?.label || 'Home',
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    region_code: initialData?.region_code || '',
    region: initialData?.region || '',
    province: initialData?.province || '',
    municipality: initialData?.municipality || '',
    barangay: initialData?.barangay || '',
    street_address: initialData?.street_address || '',
    zip_code: initialData?.zip_code || '',
  });

  // Load regions on mount
  useEffect(() => {
    fetch('/api/psgc/regions')
      .then(res => res.json())
      .then(data => setRegions(data))
      .catch(err => console.error('Failed to load regions:', err));
  }, []);

  // Load provinces when region changes
  useEffect(() => {
    if (formData.region_code) {
      fetch(`/api/psgc/provinces/${formData.region_code}`)
        .then(res => res.json())
        .then(data => setProvinces(data))
        .catch(err => console.error('Failed to load provinces:', err));
    } else {
      setProvinces([]);
    }
  }, [formData.region_code]);

  // Load municipalities when province changes
  useEffect(() => {
    if (formData.region_code && formData.province) {
      fetch(`/api/psgc/municipalities/${formData.region_code}/${encodeURIComponent(formData.province)}`)
        .then(res => res.json())
        .then(data => setMunicipalities(data))
        .catch(err => console.error('Failed to load municipalities:', err));
    } else {
      setMunicipalities([]);
    }
  }, [formData.region_code, formData.province]);

  // Load barangays when municipality changes
  useEffect(() => {
    if (formData.region_code && formData.province && formData.municipality) {
      fetch(`/api/psgc/barangays/${formData.region_code}/${encodeURIComponent(formData.province)}/${encodeURIComponent(formData.municipality)}`)
        .then(res => res.json())
        .then(data => setBarangays(data))
        .catch(err => console.error('Failed to load barangays:', err));
      
      // Auto-populate zip code
      const selectedMunicipality = municipalities.find(m => m.name === formData.municipality);
      if (selectedMunicipality?.zip_code) {
        setFormData(prev => ({ ...prev, zip_code: selectedMunicipality.zip_code }));
      }
    } else {
      setBarangays([]);
    }
  }, [formData.region_code, formData.province, formData.municipality, municipalities]);

  const handleRegionChange = (regionCode: string) => {
    const selectedRegion = regions.find(r => r.code === regionCode);
    setFormData(prev => ({
      ...prev,
      region_code: regionCode,
      region: selectedRegion?.name || '',
      province: '',
      municipality: '',
      barangay: '',
      zip_code: ''
    }));
  };

  const handleProvinceChange = (provinceName: string) => {
    setFormData(prev => ({
      ...prev,
      province: provinceName,
      municipality: '',
      barangay: '',
      zip_code: ''
    }));
  };

  const handleMunicipalityChange = (municipalityName: string) => {
    const selectedMunicipality = municipalities.find(m => m.name === municipalityName);
    setFormData(prev => ({
      ...prev,
      municipality: municipalityName,
      barangay: '',
      zip_code: selectedMunicipality?.zip_code || prev.zip_code
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  const labelOptions = ['Home', 'Work', 'Office', 'Other'];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Address Label */}
      <div>
        <label className="block text-sm font-medium text-txt-secondary mb-2">Address Label</label>
        <div className="flex gap-2 flex-wrap">
          {labelOptions.map(label => (
            <button
              key={label}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, label }))}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                formData.label === label 
                  ? 'bg-accent-gold text-bg-primary' 
                  : 'bg-bg-tertiary text-txt-secondary hover:bg-bg-secondary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Name & Phone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-txt-secondary mb-2">
            <User className="inline w-4 h-4 mr-1" /> Full Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
            className="input-field"
            placeholder="Juan Dela Cruz"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-txt-secondary mb-2">
            <Phone className="inline w-4 h-4 mr-1" /> Phone Number *
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            required
            className="input-field"
            placeholder="09XX XXX XXXX"
          />
        </div>
      </div>

      {/* Region */}
      <div>
        <label className="block text-sm font-medium text-txt-secondary mb-2">
          <MapPin className="inline w-4 h-4 mr-1" /> Region *
        </label>
        <div className="relative">
          <select
            value={formData.region_code}
            onChange={(e) => handleRegionChange(e.target.value)}
            required
            className="input-field appearance-none pr-10"
          >
            <option value="">Select Region</option>
            {regions.map(region => (
              <option key={region.code} value={region.code}>{region.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-txt-tertiary pointer-events-none" />
        </div>
      </div>

      {/* Province */}
      <div>
        <label className="block text-sm font-medium text-txt-secondary mb-2">Province *</label>
        <div className="relative">
          <select
            value={formData.province}
            onChange={(e) => handleProvinceChange(e.target.value)}
            required
            disabled={!formData.region_code}
            className="input-field appearance-none pr-10 disabled:opacity-50"
          >
            <option value="">Select Province</option>
            {provinces.map(province => (
              <option key={province.name} value={province.name}>{province.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-txt-tertiary pointer-events-none" />
        </div>
      </div>

      {/* Municipality */}
      <div>
        <label className="block text-sm font-medium text-txt-secondary mb-2">City/Municipality *</label>
        <div className="relative">
          <select
            value={formData.municipality}
            onChange={(e) => handleMunicipalityChange(e.target.value)}
            required
            disabled={!formData.province}
            className="input-field appearance-none pr-10 disabled:opacity-50"
          >
            <option value="">Select City/Municipality</option>
            {municipalities.map(municipality => (
              <option key={municipality.name} value={municipality.name}>{municipality.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-txt-tertiary pointer-events-none" />
        </div>
      </div>

      {/* Barangay */}
      <div>
        <label className="block text-sm font-medium text-txt-secondary mb-2">Barangay</label>
        <div className="relative">
          <select
            value={formData.barangay}
            onChange={(e) => setFormData(prev => ({ ...prev, barangay: e.target.value }))}
            disabled={!formData.municipality}
            className="input-field appearance-none pr-10 disabled:opacity-50"
          >
            <option value="">Select Barangay (Optional)</option>
            {barangays.map(barangay => (
              <option key={barangay.name} value={barangay.name}>{barangay.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-txt-tertiary pointer-events-none" />
        </div>
      </div>

      {/* Street Address & Zip Code */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-txt-secondary mb-2">
            <Home className="inline w-4 h-4 mr-1" /> Street Address / House No.
          </label>
          <input
            type="text"
            value={formData.street_address}
            onChange={(e) => setFormData(prev => ({ ...prev, street_address: e.target.value }))}
            className="input-field"
            placeholder="123 Main St., Blk 1 Lot 2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-txt-secondary mb-2">ZIP Code</label>
          <input
            type="text"
            value={formData.zip_code}
            onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
            className="input-field bg-bg-tertiary"
            placeholder="Auto-filled"
            readOnly
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="btn-primary flex-1"
        >
          {loading ? 'Saving...' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
