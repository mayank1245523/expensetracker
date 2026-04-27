require('dotenv').config();
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcrypt");

const User = require("./models/User");
const Admin = require("./models/Admin");
const Expense = require("./models/Expense");
const { categorizeExpense, chatWithExpenses, generateInsights } = require("./utils/ai");

const app = express();
let dbConnected = false;

mongoose.connect("mongodb://127.0.0.1:27017/expense-tracker")
  .then(() => {
    dbConnected = true;
    console.log("MongoDB connected");
    seedAdmin();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Set EJS as template engine
app.set("view engine", "ejs");

// Session
app.use(session({
  secret: "supersecretkey",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24
  }
}));

app.use(async (req, res, next) => {
  if (dbConnected) {
    if (req.session.userId) {
      const user = await User.findById(req.session.userId).select("name email");
      if (user) {
        res.locals.currentUser = user;
      }
    }

    if (req.session.adminId) {
      const admin = await Admin.findById(req.session.adminId).select("username");
      if (admin) {
        res.locals.currentAdmin = admin;
      }
    }
  }

  next();
});

async function seedAdmin() {
  if (!dbConnected) {
    return;
  }

  const existingAdmin = await Admin.findOne({ username: "admin" });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("Admin@123", 10);
    await Admin.create({ username: "admin", passwordHash });
    console.log("Seeded default admin: admin / Admin@123");
  }
}

function ensureAuth(req, res, next) {
  if (!dbConnected) {
    return res.status(503).render("error", { message: "Database unavailable. Please start MongoDB and reload." });
  }
  if (req.session.userId) {
    return next();
  }
  return res.redirect("/login");
}

function ensureAdmin(req, res, next) {
  if (!dbConnected) {
    return res.status(503).render("error", { message: "Database unavailable. Please start MongoDB and reload." });
  }
  if (req.session.adminId) {
    return next();
  }
  return res.redirect("/admin");
}

function getSuggestions(expenses) {
  if (!expenses.length) {
    return [
      "Add your first expense to see personalized spending tips and suggestions."
    ];
  }

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const categoryTotals = {};
  expenses.forEach((expense) => {
    categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
  });

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const [topCategory, topAmount] = sortedCategories[0];
  const categoryPercent = ((topAmount / total) * 100).toFixed(0);
  const average = total / Math.max(1, expenses.length);
  const largeExpense = expenses.slice().sort((a, b) => b.amount - a.amount)[0];

  const suggestions = [
    `Your highest spending category is ${topCategory} with ₹${topAmount.toFixed(2)}, which is ${categoryPercent}% of your total spending.`,
    `Try reducing your ${topCategory} spending by 10% to save more each month.`,
    `Your average expense amount is ₹${average.toFixed(2)}. Keep routine expenses below this level where possible.`,
    `The largest expense is "${largeExpense.title}" for ₹${largeExpense.amount.toFixed(2)} on ${largeExpense.date.toDateString()}. Review whether this item is essential.`
  ];

  if (sortedCategories.length > 1) {
    suggestions.push(`Also keep an eye on ${sortedCategories[1][0]} and ${sortedCategories[2] ? sortedCategories[2][0] : "other"} to improve your budget.`);
  }

  return suggestions;
}

app.get("/", (req, res) => {
  res.render("home", { user: res.locals.currentUser });
});

app.get("/signup", (req, res) => {
  if (!dbConnected) {
    return res.status(503).render("error", { message: "Database unavailable. Please start MongoDB and reload." });
  }
  if (req.session.userId) {
    return res.redirect("/dashboard");
  }
  res.render("signup", { error: null });
});

app.post("/signup", async (req, res) => {
  if (!dbConnected) {
    return res.status(503).render("error", { message: "Database unavailable. Please start MongoDB and reload." });
  }

  const { name, email, password } = req.body;
  const existingUser = await User.findOne({ email: email.toLowerCase().trim() });

  if (existingUser) {
    return res.render("signup", { error: "Email is already registered" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash
  });

  req.session.userId = user._id;
  return res.redirect("/dashboard");
});

app.get("/login", (req, res) => {
  if (!dbConnected) {
    return res.status(503).render("error", { message: "Database unavailable. Please start MongoDB and reload." });
  }
  if (req.session.userId) {
    return res.redirect("/dashboard");
  }
  res.render("login", { error: null });
});

app.post("/login", async (req, res) => {
  if (!dbConnected) {
    return res.status(503).render("error", { message: "Database unavailable. Please start MongoDB and reload." });
  }

  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return res.render("login", { error: "Invalid email or password" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.render("login", { error: "Invalid email or password" });
  }

  req.session.userId = user._id;
  return res.redirect("/dashboard");
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

app.get("/dashboard", ensureAuth, async (req, res) => {
  const expenses = await Expense.find({ user: req.session.userId }).sort({ date: -1 });
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const categoryTotals = {};
  expenses.forEach((expense) => {
    categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
  });

  const chartLabels = Object.keys(categoryTotals);
  const chartData = Object.values(categoryTotals).map((value) => Number(value.toFixed(2)));
  const suggestions = getSuggestions(expenses);
  const topCategory = chartLabels.length ? chartLabels[0] : "No category yet";

  // Get AI insights
  const aiInsights = await generateInsights(expenses);

  res.render("dashboard", {
    expenses,
    total,
    chartLabels,
    chartData,
    suggestions,
    aiInsights,
    topCategory
  });
});

app.get("/add-expense", ensureAuth, (req, res) => {
  res.render("add-expense", { error: null });
});

app.post("/add-expense", ensureAuth, async (req, res) => {
  const { title, category, amount, date } = req.body;
  if (!title || !category || !amount || !date) {
    return res.render("add-expense", { error: "All fields are required" });
  }

  if (!dbConnected) {
    return res.status(503).render("error", { message: "Database unavailable. Please start MongoDB and reload." });
  }

  await Expense.create({
    user: req.session.userId,
    title: title.trim(),
    category: category.trim(),
    amount: Number(amount),
    date: new Date(date)
  });

  res.redirect("/dashboard");
});

app.get("/admin", (req, res) => {
  if (!dbConnected) {
    return res.status(503).render("error", { message: "Database unavailable. Please start MongoDB and reload." });
  }
  if (req.session.adminId) {
    return res.redirect("/admin/dashboard");
  }
  res.render("admin-login", { error: null });
});

app.post("/admin", async (req, res) => {
  if (!dbConnected) {
    return res.status(503).render("error", { message: "Database unavailable. Please start MongoDB and reload." });
  }

  const { username, password } = req.body;
  const admin = await Admin.findOne({ username: username.trim() });
  if (!admin) {
    return res.render("admin-login", { error: "Invalid username or password" });
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    return res.render("admin-login", { error: "Invalid username or password" });
  }

  req.session.adminId = admin._id;
  return res.redirect("/admin/dashboard");
});

app.get("/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

app.get("/admin/dashboard", ensureAdmin, (req, res) => {
  res.render("admin-dashboard");
});

app.get("/admin/expenses", ensureAdmin, async (req, res) => {
  const expenses = await Expense.find().populate("user", "name email").sort({ date: -1 });
  res.render("admin-expenses", { expenses });
});

app.get("/admin/users", ensureAdmin, async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.render("admin-users", { users });
});

app.get("/admin/settings", ensureAdmin, (req, res) => {
  res.render("admin-settings");
});

// AI Routes
app.post("/ai/categorize", ensureAuth, async (req, res) => {
  const { title } = req.body;
  if (!title) {
    return res.json({ category: "Other" });
  }
  const category = await categorizeExpense(title);
  res.json({ category });
});

app.post("/ai/chat", ensureAuth, async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.json({ response: "Please ask me something about your expenses." });
  }
  const expenses = await Expense.find({ user: req.session.userId }).sort({ date: -1 });
  const response = await chatWithExpenses(query, expenses);
  res.json({ response });
});

app.get("/ai/insights", ensureAuth, async (req, res) => {
  const expenses = await Expense.find({ user: req.session.userId }).sort({ date: -1 });
  const insights = await generateInsights(expenses);
  res.json({ insights });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});