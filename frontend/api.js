/**
 * AMOS Shared API Helper
 * ----------------------
 * Include via <script src="api.js"></script> before page-specific scripts.
 * Provides: API_BASE, getToken, setToken, clearToken, api(), requireAuth()
 */

// Support local development and production on Vercel
const isLocal = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
const API_BASE = isLocal ? "http://127.0.0.1:3001/api" : "/api";

function getToken() {
  return localStorage.getItem("amosToken");
}

function setToken(token) {
  localStorage.setItem("amosToken", token);
}

function clearToken() {
  localStorage.removeItem("amosToken");
  localStorage.removeItem("amosUser");
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("amosUser"));
  } catch (e) {
    return null;
  }
}

function setUser(user) {
  localStorage.setItem("amosUser", JSON.stringify(user));
}

/**
 * Authenticated fetch wrapper.
 * Automatically attaches JWT and handles 401 (redirect to login).
 */
async function api(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) {
    headers["Authorization"] = "Bearer " + token;
  }

  const options = { method, headers };
  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(API_BASE + path, options);

  if (res.status === 401) {
    clearToken();
    if (!window.location.pathname.includes('login.html')) {
      window.location.href = "login.html";
    }
    throw new Error("Session expired");
  }

  // Check if response is actually JSON
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const text = await res.text();
    console.error("Non-JSON response from server:", text);
    throw new Error(`Server Error (${res.status}): ${text.slice(0, 100)}${text.length > 100 ? '...' : ''}`);
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

/**
 * Call on page load for any protected page.
 * Redirects to login.html if no token is present.
 */
function requireAuth() {
  if (!getToken()) {
    window.location.href = "login.html";
  }
}

/**
 * Logout: clear token and redirect
 */
function logout() {
  clearToken();
  window.location.href = "login.html";
}

// ============================================================================
// GLOBAL LOW STOCK ALERT SYSTEM
// ============================================================================
async function checkGlobalLowStock() {
  // Only check if logged in and on a protected page
  if (!getToken() || window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html') || window.location.pathname.includes('payment.html')) return;

  try {
    const medicines = await api("GET", "/medicines");
    const lowStockItems = medicines.filter(m => m.tabletsQty <= m.reorderLevel);

    for (const item of lowStockItems) {
      // Don't pester if they've dismissed this exact medicine in this session
      if (sessionStorage.getItem('snooze_lowStock_' + item.id)) continue;

      triggerLowStockModal(item);
      break; // Only show one modal at a time to avoid overwhelming the user
    }
  } catch (err) {
    console.log("Could not check stock levels silently:", err);
  }
}

function triggerLowStockModal(medicine) {
  // Inject CSS mapping and modal styling if not present
  if (!document.getElementById('global-alert-styles')) {
    const style = document.createElement('style');
    style.id = 'global-alert-styles';
    style.innerHTML = `
      .g-modal-overlay {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(17, 24, 39, 0.7); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        z-index: 9999; opacity: 0; transition: opacity 0.3s;
      }
      .g-modal-content {
        background: white; width: 90%; max-width: 500px;
        border-radius: 16px; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        transform: translateY(20px); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        text-align: center;
      }
      .g-modal-header { color: #dc2626; font-size: 24px; margin-bottom: 15px; }
      .g-modal-body { color: #4b5563; font-size: 16px; margin-bottom: 20px; text-align: left; background: #fef2f2; padding: 15px; border-radius: 8px;}
      .g-pharmacy-box { text-align: left; background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;}
      .g-btn-row { display: flex; gap: 10px; margin-top:20px; }
      .g-btn { flex: 1; padding: 12px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s;}
      .g-btn-snooze { background: #e5e7eb; color: #374151; }
      .g-btn-snooze:hover { background: #d1d5db; }
      .g-btn-order { background: #4f46e5; color: white; display:flex; justify-content:center; align-items:center; gap:8px;}
      .g-btn-order:hover { background: #4338ca; }
      .g-spinner { animation: g-spin 1s linear infinite; }
      @keyframes g-spin { 100% { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
  }

  const overlay = document.createElement('div');
  overlay.className = 'g-modal-overlay';
  
  const content = document.createElement('div');
  content.className = 'g-modal-content';

  content.innerHTML = `
    <h2 class="g-modal-header">⚠️ Low Stock Alert</h2>
    <div class="g-modal-body">
      <strong>${medicine.medicineName}</strong> is running low!<br>
      You only have <strong>${medicine.tabletsQty} tablets</strong> left (Reorder level is ${medicine.reorderLevel}).
    </div>
    
    <div class="g-pharmacy-box" id="g-pharmacy-finder">
      <div id="g-pharmacy-status" style="text-align:center;"><i class="fa-solid fa-spinner g-spinner"></i> Searching for nearest pharmacy...</div>
    </div>

    <div class="g-btn-row">
      <button class="g-btn g-btn-snooze" id="g-btn-snooze">Remind Me Later</button>
      <button class="g-btn g-btn-order" id="g-btn-order" disabled>Order Now</button>
    </div>
  `;

  overlay.appendChild(content);
  document.body.appendChild(overlay);

  // Animate in
  setTimeout(() => {
    overlay.style.opacity = '1';
    content.style.transform = 'translateY(0)';
  }, 10);

  let selectedPharmacy = "Local Pharmacy";

  // Snooze action
  document.getElementById('g-btn-snooze').addEventListener('click', () => {
    sessionStorage.setItem('snooze_lowStock_' + medicine.id, 'true');
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 300);
  });

  // Reorder action
  const orderBtn = document.getElementById('g-btn-order');
  orderBtn.addEventListener('click', () => {
    // Redirect to complete payment flow page
    window.location.href = `payment.html?medicineName=${encodeURIComponent(medicine.medicineName)}&pharmacy=${encodeURIComponent(selectedPharmacy)}`;
  });

  // Geolocation and Pharmacy Locator
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const query = `[out:json];node["amenity"="pharmacy"](around:5000, ${lat}, ${lon});out body;`;
        
        try {
          const res = await fetch("https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(query));
          const data = await res.json();
          if (data.elements && data.elements.length > 0) {
            const p = data.elements[0]; // Take nearest/first
            selectedPharmacy = p.tags.name || "Local Pharmacy";
            document.getElementById('g-pharmacy-finder').innerHTML = `
              <strong>Nearest Pharmacy Found:</strong><br>
              ${selectedPharmacy}<br>
              <span style="font-size:13px; color:#6b7280;">${p.tags['addr:street'] || 'Nearby'}</span>
            `;
          } else {
            document.getElementById('g-pharmacy-finder').innerHTML = "No pharmacies found within 5km. (Continuing with default provider)";
          }
        } catch (e) {
          document.getElementById('g-pharmacy-finder').innerHTML = "Network error searching for pharmacies.";
        }
        orderBtn.disabled = false;
      },
      (err) => {
        document.getElementById('g-pharmacy-finder').innerHTML = "Location disabled. Cannot find nearest pharmacy.";
        orderBtn.disabled = false;
      }
    );
  } else {
    document.getElementById('g-pharmacy-finder').innerHTML = "Geolocation not supported.";
    orderBtn.disabled = false;
  }
}

// Run the stock check a few seconds after page load to ensure UI paints first
setTimeout(checkGlobalLowStock, 2000);
