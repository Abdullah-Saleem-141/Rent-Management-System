const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const app = express();
const PORT = process.env.PORT || 3000;

// Set your password
const PASSWORD = "1234"; // change this to your desired password

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Setup session
app.use(session({
  secret: "rent-secret-key",
  resave: false,
  saveUninitialized: true
}));

// ✅ Connect to MongoDB Atlas
const mongoURL = "<YOUR_MONGODB_CONNECTION_STRING>"; // replace with your Atlas connection string
mongoose.connect(mongoURL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.log("❌ MongoDB connection error:", err));

// ✅ Payment schema & model
const paymentSchema = new mongoose.Schema({
  name: String,
  amount: Number
});
const Payment = mongoose.model("Payment", paymentSchema);

// Middleware to protect routes
function authMiddleware(req, res, next) {
  if (req.session && req.session.loggedIn) next();
  else res.redirect("/");
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
    req.session.loggedIn = true;
    res.redirect("/dashboard");
  } else {
    res.send("❌ Wrong password! <br><a href='/'>Go Back</a>");
  }
});

// ✅ Dashboard: add payment
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

// ✅ Save payment
app.post("/save", authMiddleware, async (req, res) => {
  const { name, amount } = req.body;
  const payment = new Payment({ name, amount });
  await payment.save();
  res.send("Payment saved successfully! <br><a href='/dashboard'>Go Back</a>");
});

// ✅ View all payments
app.get("/payments", authMiddleware, async (req, res) => {
  const payments = await Payment.find();
  let html = "<h2>All Payments</h2><ul>";
  payments.forEach(p => {
    html += `<li><strong>${p.name}</strong> paid <strong>${p.amount}</strong> 
      <a href="/delete/${p._id}" onclick="return confirm('Delete this payment?')">Delete</a>
    </li>`;
  });
  html += "</ul><br><a href='/dashboard'>Add New Payment</a>";
  res.send(html);
});

// ✅ Delete payment
app.get("/delete/:id", authMiddleware, async (req, res) => {
  const id = req.params.id;
  await Payment.findByIdAndDelete(id);
  res.redirect("/payments");
});

// ✅ Logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
});
