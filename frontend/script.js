// REGISTER FUNCTION
function registerUser() {
  const username = document.getElementById("username").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!username || !email || !password) {
    alert("All fields are required!");
    return;
  }

  const user = { username, email, password };

  localStorage.setItem("user", JSON.stringify(user));

  alert("Registered Successfully!");
}

// LOGIN FUNCTION
function loginUser() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const user = JSON.parse(localStorage.getItem("user"));

  if (user && user.email === email && user.password === password) {
    alert("Login Successful!");
    window.location.href = "home.html";
  } else {
    alert("Invalid Credentials");
  }
}

// SUBMIT PRESCRIPTION
function submitPrescription() {
  const medicine = document.getElementById("medicine").value;
  const dosage = document.getElementById("dosage").value;
  const days = document.getElementById("days").value;

  if (!medicine || !dosage || !days) {
    alert("Please fill all fields!");
    return;
  }

  const data = { medicine, dosage, days };

  let list = JSON.parse(localStorage.getItem("prescriptions")) || [];
  list.push(data);

  localStorage.setItem("prescriptions", JSON.stringify(list));

  suggestMedicine(days);

  alert("Prescription Saved!");
}

// SHOW SAVED PRESCRIPTIONS
function loadPrescriptions() {
  const list = JSON.parse(localStorage.getItem("prescriptions")) || [];

  let output = "";

  if (list.length === 0) {
    output = "<p>No prescriptions found</p>";
  } else {
    list.forEach((p, index) => {
      output += `<p>${index + 1}. ${p.medicine} - ${p.dosage}/day for ${p.days} days</p>`;
    });
  }

  document.getElementById("output").innerHTML = output;
}

// SIMPLE AI-LIKE SUGGESTION
function suggestMedicine(days) {
  if (days > 5) {
    alert("Long course detected. Consider consulting a doctor.");
  } else {
    alert("Short-term medication recorded.");
  }
}
