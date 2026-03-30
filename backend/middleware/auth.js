const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "amos-secret-key-change-in-production";

/**
 * Middleware: verifies the JWT from the Authorization header.
 * Attaches decoded payload to `req.user` ({ id, username, email }).
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required. Please log in." });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username, email, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token. Please log in again." });
  }
}

/**
 * Optional auth — if a valid token is present it is decoded,
 * otherwise the request proceeds without `req.user`.
 */
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      req.user = jwt.verify(header.split(" ")[1], JWT_SECRET);
    } catch (_) {
      // ignore invalid tokens in optional mode
    }
  }
  next();
}

module.exports = { authenticate, optionalAuth, JWT_SECRET };
