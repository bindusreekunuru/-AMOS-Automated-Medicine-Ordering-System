const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db");

const authRoutes = require("./routes/auth");
const medicineRoutes = require("./routes/medicines");
const orderRoutes = require("./routes/orders");
const profileRoutes = require("./routes/profile");
const dashboardRoutes = require("./routes/dashboard");
const prescriptionRoutes = require("./routes/prescriptions");
const reminderRoutes = require("./routes/reminders");
const tokenRoutes = require("./routes/tokens");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/tokens", tokenRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// DB connectivity check — useful for diagnosing Vercel env var issues
app.get("/api/health/db", async (req, res) => {
  try {
    const result = await db.query("SELECT 1 AS connected");
    res.json({ status: "ok", db: "connected", row: result.rows[0] });
  } catch (err) {
    res.status(500).json({
      status: "error",
      db: "disconnected",
      message: err.message,
      hint: "Check that PGHOST, PGPASSWORD, PGUSER, PGDATABASE, PGPORT are set in Vercel environment variables."
    });
  }
});


// In Vercel, we only export the app and don't call app.listen()
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`AMOS backend running on port ${PORT}`);
  });
}

module.exports = app;
