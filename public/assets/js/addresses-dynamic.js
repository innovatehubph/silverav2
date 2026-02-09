// Dynamic Addresses Page - Load and manage user addresses

document.addEventListener('DOMContentLoaded', async () => {
  if (!checkAuthenticationRequired()) return;

  try {
    // Update user greeting and cart badge
    updateUserGreeting();
    await loadCartBadge();

    // Load addresses
    await loadAddresses();

    // Setup add address button
    const addAddressButton = document.querySelector('a[href*="AddNewAddress"]');
    if (addAddressButton) {
      addAddressButton.addEventListener('click', resetAddressForm);
    }

    // Setup save address button
    const saveButton = document.querySelector('.offcanvas-footer .btn');
    if (saveButton) {
      saveButton.addEventListener('click', handleSaveAddress);
    }
  } catch (error) {
    console.error('Error loading page:', error);
  }
});

// Load all user addresses
async function loadAddresses() {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch('/api/addresses', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch addresses');
      return;
    }

    const addresses = await response.json();
    const container = document.querySelector('.page-content');

    // Remove hardcoded addresses
    const existingAddresses = container.querySelectorAll('h6.fw-bold:not([id]), .card.rounded-3:not([id])');
    existingAddresses.forEach(el => {
      if (el.textContent.includes('Default Address') || el.textContent.includes('Other Address') || el.classList.contains('rounded-3')) {
        if (el.nextElementSibling && el.nextElementSibling.classList.contains('card')) {
          el.nextElementSibling.remove();
        }
        if (el.classList.contains('rounded-3') && el.textContent.includes('Address')) {
          el.remove();
        }
      }
    });

    // Create new address elements
    if (addresses.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'text-center py-5';
      emptyState.innerHTML = `
        <i class="bi bi-geo" style="font-size: 48px; color: #ccc;"></i>
        <h5 class="mt-3">No addresses saved</h5>
        <p class="text-muted">Add your first address to get started</p>
      `;
      container.insertBefore(emptyState, container.querySelector('.card.rounded-3:last-of-type'));
    } else {
      // Find insertion point
      const pageContent = document.querySelector('.page-content');
      const addressContainer = document.createElement('div');
      addressContainer.id = 'addressesContainer';

      addresses.forEach((addr, index) => {
        const card = createAddressCard(addr, index === 0 && addresses.length > 0);
        addressContainer.appendChild(card);
      });

      // Insert after page-content starts but before hardcoded addresses
      const firstCard = pageContent.querySelector('.card.rounded-3');
      if (firstCard) {
        firstCard.parentNode.insertBefore(addressContainer, firstCard);
      }
    }
  } catch (error) {
    console.error('Error loading addresses:', error);
  }
}

// Create address card element
function createAddressCard(address, isFirst) {
  const card = document.createElement('div');
  card.className = 'card rounded-3 mb-3';
  card.id = `address-${address.id}`;
  card.innerHTML = `
    <div class="card-body">
      <div class="d-flex flex-row gap-3">
        <div class="address-info form-check flex-grow-1">
          <input class="form-check-input address-radio" type="radio" name="flexRadioDefaultAddress" id="addr${address.id}" ${address.is_default ? 'checked' : ''} onchange="setDefaultAddress(${address.id})">
          <label class="form-check-label" for="addr${address.id}">
            <span class="fw-bold mb-0 h6">${address.name}</span><br>
            ${address.address}${address.locality ? ', ' + address.locality : ''}<br>
            ${address.city}${address.state ? ', ' + address.state : ''} ${address.pin_code ? address.pin_code : ''}<br>
            Mobile: <span class="text-dark fw-bold">${address.phone}</span>
          </label>
        </div>
        <div class="vr"></div>
        <div class="d-grid gap-2 align-self-start align-self-center">
          <button type="button" class="btn btn-sm rounded-3" onclick="deleteAddress(${address.id})"><i class="bi bi-trash"></i></button>
          <button type="button" class="btn btn-sm rounded-3" onclick="editAddress(${address.id})"><i class="bi bi-pencil"></i></button>
        </div>
      </div>
    </div>
  `;
  return card;
}


// Reset address form for adding new address
function resetAddressForm() {
  document.getElementById('floatingName').value = '';
  document.getElementById('floatingMobileNo').value = '';
  document.getElementById('floatingPinCode').value = '';
  document.getElementById('floatingAddress').value = '';
  document.getElementById('floatingLocalityTown').value = '';
  document.getElementById('floatingCity').value = '';
  document.getElementById('floatingState').value = '';
  document.getElementById('floatingName').focus();
}

// Edit address
async function editAddress(addressId) {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`/api/addresses/${addressId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      alert('Failed to load address');
      return;
    }

    const address = await response.json();

    // Populate form
    document.getElementById('floatingName').value = address.name;
    document.getElementById('floatingMobileNo').value = address.phone;
    document.getElementById('floatingPinCode').value = address.pin_code || '';
    document.getElementById('floatingAddress').value = address.address;
    document.getElementById('floatingLocalityTown').value = address.locality || '';
    document.getElementById('floatingCity').value = address.city;
    document.getElementById('floatingState').value = address.state || '';

    // Store the ID for updating
    document.getElementById('floatingName').dataset.addressId = addressId;

    // Change button text
    const saveButton = document.querySelector('.offcanvas-footer .btn');
    saveButton.textContent = 'Update Address';

    // Show offcanvas
    const offcanvas = new bootstrap.Offcanvas(document.getElementById('AddNewAddress'));
    offcanvas.show();
  } catch (error) {
    console.error('Error editing address:', error);
    alert('Error loading address');
  }
}

// Save or update address
async function handleSaveAddress(event) {
  event.preventDefault();

  try {
    const token = localStorage.getItem('auth_token');
    const name = document.getElementById('floatingName').value.trim();
    const phone = document.getElementById('floatingMobileNo').value.trim();
    const pinCode = document.getElementById('floatingPinCode').value.trim();
    const address = document.getElementById('floatingAddress').value.trim();
    const locality = document.getElementById('floatingLocalityTown').value.trim();
    const city = document.getElementById('floatingCity').value.trim();
    const state = document.getElementById('floatingState').value.trim();

    // Validate
    if (!name || !phone || !address || !city) {
      alert('Please fill in all required fields');
      return;
    }

    const body = JSON.stringify({
      name, phone, address, locality, city, state,
      pin_code: pinCode
    });

    const addressId = document.getElementById('floatingName').dataset.addressId;
    const method = addressId ? 'PUT' : 'POST';
    const url = addressId ? `/api/addresses/${addressId}` : '/api/addresses';

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body
    });

    if (!response.ok) {
      const error = await response.json();
      alert(error.error || 'Failed to save address');
      return;
    }

    alert(addressId ? 'Address updated successfully' : 'Address added successfully');

    // Close offcanvas
    const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('AddNewAddress'));
    if (offcanvas) offcanvas.hide();

    // Clear the address ID
    document.getElementById('floatingName').dataset.addressId = '';

    // Reset button text
    const saveButton = document.querySelector('.offcanvas-footer .btn');
    saveButton.textContent = 'Save Address';

    // Reload addresses
    await loadAddresses();
  } catch (error) {
    console.error('Error saving address:', error);
    alert('Error saving address. Please try again.');
  }
}

// Delete address
async function deleteAddress(addressId) {
  if (!confirm('Are you sure you want to delete this address?')) {
    return;
  }

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`/api/addresses/${addressId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      alert('Failed to delete address');
      return;
    }

    alert('Address deleted successfully');
    await loadAddresses();
  } catch (error) {
    console.error('Error deleting address:', error);
    alert('Error deleting address');
  }
}

// Set address as default
async function setDefaultAddress(addressId) {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`/api/addresses/${addressId}/default`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      alert('Failed to set default address');
      return;
    }

    // Reload to update UI
    await loadAddresses();
  } catch (error) {
    console.error('Error setting default address:', error);
  }
}

