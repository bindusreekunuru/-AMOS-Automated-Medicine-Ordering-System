# AMOS - Automated Medicine Ordering System

AMOS is an intelligent, AI-powered platform designed to help patients manage their long-term medications seamlessly. It ensures treatment continuity by predicting medicine depletion, sending timely reminders, and automating the reordering process from nearby pharmacies.

## 🌟 Features

- **Patient-Centric Interface**: A single, intuitive interface for all medication management needs.
- **User Authentication**: Secure registration and login system with email and phone verification.
- **Smart Medicine Tracking**:
  - Upload prescriptions via camera or gallery.
  - OCR technology extracts medicine details (name, dosage, quantity).
  - AI predicts medicine depletion based on intake patterns.
- **Intelligent Reminders**:
  - Daily reminders for medication adherence.
  - Proactive notifications when medicine levels are running low.
- **Automated Reordering**:
  - Detects low stock and triggers reorder requests.
  - Identifies nearest pharmacies using geolocation.
  - Secure payment gateway integration.
  - Order confirmation and tracking.
- **User Profile Management**:
  - Detailed medical profile including allergies, blood group, and emergency contacts.

## 🚀 Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **AI/ML**: OCR (Tesseract.js integration)
- **Notifications**: FCM (Firebase Cloud Messaging)

## 📂 Project Structure

```
AMOS/
├── backend/                # Server-side logic and API
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic and AI services
│   ├── middleware/         # Authentication and validation
│   ├── db.js               # Database configuration
│   └── server.js           # Express server entry point
├── frontend/               # Client-side application
│   ├── index.html          # Main application page
│   ├── css/                # Stylesheets
│   └── js/                 # Client-side JavaScript
├── uploads/                # User-uploaded prescription images
├── node_modules/           # Project dependencies
├── package.json            # Project dependencies and scripts
└── README.md               # Project documentation
```

## 🛠️ Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AMOS
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies** (if applicable)
   ```bash
   cd ../frontend
   npm install
   ```

4. **Configure environment variables**
   Create a `.env` file in the `backend/` directory with the following variables:
   ```env
   PORT=3000
   DB_PATH=./amos.db
   ```

5. **Run the server**
   ```bash
   cd backend
   node server.js
   ```

6. **Access the application**
   Open `frontend/index.html` in your web browser or access the backend API at `http://localhost:3000`.

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Medicines
- `GET /api/medicines` - Get all medicines for the logged-in user
- `POST /api/medicines` - Add a new medicine
- `PUT /api/medicines/:id` - Update medicine details
- `DELETE /api/medicines/:id` - Delete a medicine

### Orders
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create a new order
- `PUT /api/orders/:id/status` - Update order status

### Prescriptions
- `POST /api/prescriptions` - Upload a prescription
- `GET /api/prescriptions` - Get all prescriptions

### Reminders
- `GET /api/reminders` - Get all reminders
- `POST /api/reminders` - Create a new reminder
- `PUT /api/reminders/:id/done` - Mark reminder as done

## 🤖 AI & OCR

The system uses Tesseract.js for OCR-based text extraction from prescription images. The extracted data is then used to populate the medicine database and calculate depletion timelines.

## 🔐 Security

- Password hashing using bcrypt
- JWT-based authentication
- Input validation and sanitization
- Secure file upload handling

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues or questions, please open an issue in the repository.

---

**Built with ❤️ for AMOS**
