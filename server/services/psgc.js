/**
 * Philippine Standard Geographic Code (PSGC) Service
 * Provides cascading dropdown data for Region > Province > Municipality > Barangay
 */

const fs = require('fs');
const path = require('path');

// Load PSGC data
let psgcData = null;

// ZIP code mapping (municipality -> zip code)
// Based on common Philippine postal codes
const zipCodes = {
  // NCR
  'MANILA': '1000', 'QUEZON CITY': '1100', 'MAKATI': '1200', 'PASIG': '1600',
  'TAGUIG': '1630', 'PARANAQUE': '1700', 'LAS PINAS': '1740', 'MUNTINLUPA': '1770',
  'PASAY': '1300', 'CALOOCAN': '1400', 'MALABON': '1470', 'NAVOTAS': '1480',
  'VALENZUELA': '1440', 'MARIKINA': '1800', 'SAN JUAN': '1500', 'MANDALUYONG': '1550',
  'PATEROS': '1620',
  // Region III
  'ANGELES CITY': '2009', 'SAN FERNANDO': '2000', 'OLONGAPO CITY': '2200',
  // Region IV-A
  'ANTIPOLO': '1870', 'BACOOR': '4102', 'CAVITE CITY': '4100', 'DASMARINAS': '4114',
  'IMUS': '4103', 'CALAMBA': '4027', 'SAN PABLO CITY': '4000', 'BATANGAS CITY': '4200',
  'LIPA CITY': '4217', 'LUCENA CITY': '4301',
  // Region VII
  'CEBU CITY': '6000', 'MANDAUE CITY': '6014', 'LAPU-LAPU CITY': '6015',
  // Region XI
  'DAVAO CITY': '8000',
  // Default for unknown
  '_DEFAULT': '0000'
};

class PSGCService {
  constructor() {
    this.loadData();
  }

  loadData() {
    try {
      const dataPath = path.join(__dirname, '../data/psgc.json');
      const rawData = fs.readFileSync(dataPath, 'utf8');
      psgcData = JSON.parse(rawData);
      console.log('✅ PSGC data loaded');
    } catch (error) {
      console.error('❌ Failed to load PSGC data:', error.message);
      psgcData = {};
    }
  }

  /**
   * Get all regions
   */
  getRegions() {
    if (!psgcData) return [];
    
    return Object.entries(psgcData).map(([code, data]) => ({
      code,
      name: data.region_name
    })).sort((a, b) => a.code.localeCompare(b.code));
  }

  /**
   * Get provinces by region code
   */
  getProvinces(regionCode) {
    if (!psgcData || !psgcData[regionCode]) return [];
    
    const region = psgcData[regionCode];
    return Object.keys(region.province_list || {}).map(name => ({
      name,
      region_code: regionCode
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get municipalities/cities by province
   */
  getMunicipalities(regionCode, provinceName) {
    if (!psgcData || !psgcData[regionCode]) return [];
    
    const region = psgcData[regionCode];
    const province = region.province_list?.[provinceName];
    if (!province) return [];
    
    return Object.keys(province.municipality_list || {}).map(name => ({
      name,
      province: provinceName,
      region_code: regionCode,
      zip_code: this.getZipCode(name)
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get barangays by municipality
   */
  getBarangays(regionCode, provinceName, municipalityName) {
    if (!psgcData || !psgcData[regionCode]) return [];
    
    const region = psgcData[regionCode];
    const province = region.province_list?.[provinceName];
    if (!province) return [];
    
    const municipality = province.municipality_list?.[municipalityName];
    if (!municipality) return [];
    
    const barangays = municipality.barangay_list || [];
    return barangays.map(name => ({
      name,
      municipality: municipalityName
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get ZIP code for a municipality
   */
  getZipCode(municipalityName) {
    const normalized = municipalityName.toUpperCase().replace(/[^A-Z\s]/g, '').trim();
    return zipCodes[normalized] || zipCodes['_DEFAULT'];
  }

  /**
   * Search locations (for autocomplete)
   */
  search(query, limit = 20) {
    if (!psgcData || !query || query.length < 2) return [];
    
    const results = [];
    const q = query.toUpperCase();
    
    for (const [regionCode, region] of Object.entries(psgcData)) {
      for (const [provinceName, province] of Object.entries(region.province_list || {})) {
        for (const municipalityName of Object.keys(province.municipality_list || {})) {
          if (municipalityName.includes(q)) {
            results.push({
              type: 'municipality',
              name: municipalityName,
              province: provinceName,
              region: region.region_name,
              region_code: regionCode,
              zip_code: this.getZipCode(municipalityName)
            });
            if (results.length >= limit) return results;
          }
        }
      }
    }
    
    return results;
  }
}

module.exports = new PSGCService();
