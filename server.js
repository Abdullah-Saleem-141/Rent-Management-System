const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = 3000;

// Set your password
const PASSWORD = "1234"; // change this to your desired password

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Setup session
app.use(session({
  secret: "rent-secret-key", // change this to a random secret
  resave: false,
  saveUninitialized: true
}));

// Path for data folder and file
const dataFolder = path.join(__dirname, "data");
const dataFile = path.join(dataFolder, "payments.json");

if (!fs.existsSync(dataFolder)) {
  fs.mkdirSync(dataFolder);
}

// Middleware to protect routes
function authMiddleware(req, res, next) {
  if (req.session && req.session.loggedIn) {
    next();
  } else {
    res.redirect("/");
  }
}

// ✅ Login page
app.get("/", (req, res) => {
  res.send(`
    <h1>Rent Management Login</h1>
    <form action="/login" method="post">
      <label>Password:</label>
      <input type="password" name="password" required />
      <button type="submit">Login</button>
    </form>
  `);
});

// ✅ Handle login
app.post("/login", (req, res) => {
  const { password } = req.body;
  if (password === PASSWORD) {
    req.session.loggedIn = true; // mark user as logged in
    res.redirect("/dashboard");
  } else {
    res.send("❌ Wrong password! <br><a href='/'>Go Back</a>");
  }
});

// ✅ Dashboard: Payment form (protected)
app.get("/dashboard", authMiddleware, (req, res) => {
  res.send(`
    <h1>Rent Management System</h1>
    <form action="/save" method="post">
      <label>Name:</label>
      <input type="text" name="name" required /><br><br>
      <label>Amount Paid:</label>
      <input type="number" name="amount" required /><br><br>
      <button type="submit">Save</button>
    </form>
    <br>
    <a href="/payments">View All Payments</a>
    <br><br>
    <a href="/logout">Logout</a>
  `);
});

// ✅ Save payment (protected)
app.post("/save", authMiddleware, (req, res) => {
  const { name, amount } = req.body;
  let payments = [];

  if (fs.existsSync(dataFile)) {
    payments = JSON.parse(fs.readFileSync(dataFile));
  }

  payments.push({ name, amount });
  fs.writeFileSync(dataFile, JSON.stringify(payments, null, 2));

  res.send("Payment saved successfully! <br><a href='/dashboard'>Go Back</a>");
});

// ✅ View payments (protected)
app.get("/payments", authMiddleware, (req, res) => {
  let payments = [];
  if (fs.existsSync(dataFile)) {
    payments = JSON.parse(fs.readFileSync(dataFile));
  }

  let html = "<h2>All Payments</h2><ul>";
  payments.forEach((p, index) => {
    html += `<li><strong>${p.name}</strong> paid <strong>${p.amount}</strong> 
      <a href="/delete/${index}" onclick="return confirm('Delete this payment?')">Delete</a>
    </li>`;
  });
  html += "</ul><br><a href='/dashboard'>Add New Payment</a>";
  res.send(html);
});

// ✅ Delete payment (protected)
app.get("/delete/:id", authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  if (fs.existsSync(dataFile)) {
    let payments = JSON.parse(fs.readFileSync(dataFile));
    if (id >= 0 && id < payments.length) {
      payments.splice(id, 1);
      fs.writeFileSync(dataFile, JSON.stringify(payments, null, 2));
    }
  }
  res.redirect("/payments");
});

// ✅ Logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
