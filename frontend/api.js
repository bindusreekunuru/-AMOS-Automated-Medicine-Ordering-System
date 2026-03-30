/**
 * AMOS Shared API Helper
 * ----------------------
 * Include via <script src="api.js"></script> before page-specific scripts.
 * Provides: API_BASE, getToken, setToken, clearToken, api(), requireAuth()
 */

const API_BASE = "http://localhost:3001/api";

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
    window.location.href = "login.html";
    throw new Error("Session expired");
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
