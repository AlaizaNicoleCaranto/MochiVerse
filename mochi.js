// Initialize the SQL.js database instance
let DB = null;

// Show loading overlay with custom message
function showLoading(message = "Loading MochiVerse...🌸") {
  const overlay = document.getElementById('loading-overlay');
  const msg = document.getElementById('loading-message');
  if (msg) msg.textContent = message;
  if (overlay) {
    overlay.classList.add('active');
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
  }
}

// Hide loading overlay
function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    overlay.style.display = 'none';
  }
}

// Initialize database and create tables with seed data
async function initDB() {
  showLoading("Preparing your mochi experience...🌸");
  try {
    const SQL = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
    });
    DB = new SQL.Database();

    // Create products table to store mochi items
    DB.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            emoji TEXT DEFAULT '🍡',
            color TEXT DEFAULT '#F9A8BF',
            image TEXT,
            category TEXT DEFAULT 'prebuilt'
        )`);

    // Create orders table to store customer orders
    DB.run(`CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT,
            phone TEXT,
            address TEXT,
            delivery_type TEXT,
            items TEXT,
            total REAL,
            status TEXT DEFAULT 'pending',
            created_at TEXT,
            user TEXT
        )`);

    // Seed default products if table is empty
    const check = DB.exec("SELECT COUNT(*) as c FROM products");
    if (check[0].values[0][0] === 0) {
      // 12 mochi flavors with their details
      const seeds = [
        ["Sakura Bliss", "Classic pink mochi with sweet red bean", 65, "🌸", "#F9A8BF"],
        ["Matcha Dream", "Earthy matcha with white chocolate fill", 75, "🍵", "#A8D5A2"],
        ["Mango Fiesta", "Tropical mango with cream cheese filling", 70, "🥭", "#FFD166"],
        ["Strawberry Pop", "Bright strawberry with strawberry jam", 68, "🍓", "#FF6B8B"],
        ["Ube Royale", "Filipino ube with coconut cream", 72, "🍠", "#9B72CF"],
        ["Chocolate Lava", "Dark cocoa with fudge filling", 78, "🍫", "#8B5E3C"],
        ["Taro Milk Tea", "Creamy taro with milk tea filling", 74, "🧋", "#C4A4D4"],
        ["Lychee Pearl", "Delicate lychee with rose water", 70, "🍈", "#F5CBA7"],
        ["Black Sesame Crunch", "Silky black sesame with crunchy sesame brittle", 78, "⚫", "#6E6262"],
        ["Coconut Lychee", "Creamy coconut with juicy lychee center", 75, "🥥", "#E8DCC7"],
        ["Caramel Crunch", "Rich caramel with crispy crunch topping", 80, "🍯", "#D4A373"],
        ["Honeydew Mist", "Refreshing honeydew with a hint of mint", 72, "🍈", "#B5E48C"]
      ];
      seeds.forEach(([name, desc, price, emoji, color]) => {
        DB.run("INSERT INTO products (name, description, price, emoji, color) VALUES (?,?,?,?,?)",
          [name, desc, price, emoji, color]);
      });

      // Assign image filenames to each product
      const imageMap = {
        "Sakura Bliss": "assets/sakura-bliss.png",
        "Matcha Dream": "assets/matcha-dream.png",
        "Mango Fiesta": "assets/mango-fiesta.png",
        "Strawberry Pop": "assets/strawberry-pop.png",
        "Ube Royale": "assets/ube-royale.png",
        "Chocolate Lava": "assets/chocolate-lava.png",
        "Taro Milk Tea": "assets/taro-milktea.png",
        "Lychee Pearl": "assets/lychee-pearl.png",
        "Black Sesame Crunch": "assets/black-sesame-crunch.png",
        "Coconut Lychee": "assets/coconut-lychee.png",
        "Caramel Crunch": "assets/caramel_crust.png",
        "Honeydew Mist": "assets/honeydew.png"
      };
      Object.entries(imageMap).forEach(([name, image]) => {
        DB.run("UPDATE products SET image = ? WHERE name = ?", [image, name]);
      });
    }
    console.log("🌸 Database initialized successfully!");
    hideLoading();
  } catch (error) {
    console.error("Database initialization failed:", error);
    hideLoading();
    showToast("⚠️ Failed to load database. Please refresh the page.");
  }
}

// Execute a query and return results as array of objects
function dbQuery(sql, params = []) {
  try {
    const res = DB.exec(sql, params);
    if (!res.length) return [];
    const { columns, values } = res[0];
    return values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
  } catch (e) {
    console.error("Query error:", e);
    showToast("⚠️ Error loading data. Please try again.");
    return [];
  }
}

// Execute a write operation (INSERT, UPDATE, DELETE)
function dbRun(sql, params = []) {
  try {
    DB.run(sql, params);
    return true;
  } catch (e) {
    console.error("Database error:", e);
    showToast("⚠️ Failed to save data. Please try again.");
    return false;
  }
}

// Predefined demo accounts for testing
const ACCOUNTS = {
  user: { pass: "user123", role: "user" },
  admin: { pass: "admin123", role: "admin" },
};

let currentUser = null;
let authMode = "login";

// Switch between login and register modes
function setAuthMode(mode) {
  authMode = mode;
  const isRegister = mode === "register";
  document.querySelectorAll(".register-only").forEach(el => el.style.display = isRegister ? "block" : "none");
  document.getElementById("auth-btn").textContent = isRegister ? "Register 🌸" : "Sign In 🌸";
  document.getElementById("toggle-auth-text").textContent = isRegister ? "Already have an account?" : "Don't have an account?";
  document.getElementById("toggle-auth-btn").textContent = isRegister ? "Sign In" : "Register";
  const err = document.getElementById("error-msg");
  err.style.display = "none";
  err.classList.remove("success-msg");
}

// Toggle between login and register views
function toggleRegister() {
  setAuthMode(authMode === "login" ? "register" : "login");
}

// Handle authentication (login or register based on mode)
function doAuth() {
  return authMode === "register" ? doRegister() : doLogin();
}

// Login user with validation
function doLogin() {
  const u = document.getElementById("login-user").value.trim();
  const p = document.getElementById("login-pass").value;
  const err = document.getElementById("error-msg");
  err.classList.remove("success-msg");

  // Validate empty fields
  if (!u || !p) {
    err.textContent = "⚠️ Please enter both username and password.";
    err.style.display = "block";
    return;
  }

  const acc = ACCOUNTS[u];

  // Validate username exists
  if (!acc) {
    err.textContent = "❌ Username not found. Please check your username or register.";
    err.style.display = "block";
    return;
  }

  // Validate password matches
  if (acc.pass !== p) {
    err.textContent = "❌ Incorrect password. Please try again.";
    err.style.display = "block";
    return;
  }

  // Login successful
  err.style.display = "none";
  currentUser = { name: u, role: acc.role };
  showToast(`🌸 Welcome back, ${u}!`);
  startApp();
}

// Register new user with validation
function doRegister() {
  const u = document.getElementById("login-user").value.trim();
  const e = document.getElementById("login-email").value.trim();
  const p = document.getElementById("login-pass").value;
  const cp = document.getElementById("login-confirm-pass").value;
  const err = document.getElementById("error-msg");
  err.classList.remove("success-msg");

  // Validate all fields filled
  if (!u || !e || !p || !cp) {
    err.textContent = "⚠️ Please fill in all registration fields.";
    err.style.display = "block";
    return;
  }

  // Validate username length
  if (u.length < 3) {
    err.textContent = "⚠️ Username must be at least 3 characters long.";
    err.style.display = "block";
    return;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(e)) {
    err.textContent = "⚠️ Please enter a valid email address (e.g., name@domain.com).";
    err.style.display = "block";
    return;
  }

  // Validate password length
  if (p.length < 6) {
    err.textContent = "⚠️ Password must be at least 6 characters long.";
    err.style.display = "block";
    return;
  }

  // Validate passwords match
  if (p !== cp) {
    err.textContent = "❌ Passwords do not match. Please re-enter.";
    err.style.display = "block";
    return;
  }

  // Validate username not taken
  if (ACCOUNTS[u]) {
    err.textContent = "❌ That username is already taken. Please choose another one.";
    err.style.display = "block";
    return;
  }

  // Prevent using reserved admin username
  if (u.toLowerCase() === "admin") {
    err.textContent = "❌ The username 'admin' is reserved. Please choose another.";
    err.style.display = "block";
    return;
  }

  // Registration successful - create account
  ACCOUNTS[u] = { pass: p, email: e, role: "user" };
  err.textContent = "✅ Account created successfully! Please sign in.";
  err.style.display = "block";
  err.classList.add("success-msg");
  showToast("🎉 Account created! Please sign in.");

  // Reset form and switch to login mode
  setAuthMode("login");
  document.getElementById("login-pass").value = "";
  document.getElementById("login-confirm-pass").value = "";
  document.getElementById("login-email").value = "";
}

// Logout user and clear session
function doLogout() {
  // Save cart for this specific user before logging out
  if (currentUser) {
    const cartKey = 'mochi_cart_' + currentUser.name;
    sessionStorage.setItem(cartKey, JSON.stringify(cart));
    showToast(`👋 Goodbye, ${currentUser.name}!`);
  }
  currentUser = null;
  cart = [];
  document.getElementById("app").style.display = "none";
  document.getElementById("login-screen").style.display = "flex";
  document.getElementById("login-user").value = "";
  document.getElementById("login-pass").value = "";
  document.getElementById("login-confirm-pass").value = "";
  document.getElementById("login-email").value = "";
  setAuthMode("login");
}

// Initialize login screen on page load
window.addEventListener("DOMContentLoaded", () => setAuthMode("login"));

// Start the main application after successful login
function startApp() {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("app").style.display = "block";
  document.getElementById("user-label").textContent = currentUser.name;
  document.getElementById("user-avatar").textContent = currentUser.name[0].toUpperCase();

  // Restore cart for this specific user from session storage if it exists
  const cartKey = 'mochi_cart_' + currentUser.name;
  const savedCart = sessionStorage.getItem(cartKey);
  if (savedCart) {
    try {
      cart = JSON.parse(savedCart);
      updateCartBadge();
    } catch (e) {
      console.warn("Failed to restore cart:", e);
      cart = [];
      sessionStorage.removeItem(cartKey);
    }
  } else {
    // New user or no saved cart - start fresh
    cart = [];
    updateCartBadge();
  }

  // Show appropriate navigation based on user role
  const isAdmin = currentUser.role === "admin";
  document.getElementById("user-nav").style.display = isAdmin ? "none" : "flex";
  document.getElementById("admin-nav").style.display = isAdmin ? "flex" : "none";
  document.getElementById("cart-btn").style.display = isAdmin ? "none" : "flex";

  // Load the appropriate page
  if (isAdmin) {
    showPage("admin");
    renderAdminOrders();
    renderAdminProducts();
    renderStats();
  } else {
    showPage("home");
    renderShop();
    renderCustomizer();
    renderFeatured();
  }
}

// Navigate to a specific page
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const page = document.getElementById("page-" + id);
  if (page) page.classList.add("active");

  document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));

  // Update active nav link for user pages
  if (currentUser.role === "user") {
    const idx = ["home", "shop", "customize", "my-orders"].indexOf(id);
    if (idx >= 0) {
      const links = document.querySelectorAll("#user-nav .nav-link");
      if (links[idx]) links[idx].classList.add("active");
    }
    // Render page content based on which page is shown
    if (id === "my-orders") renderMyOrders();
    if (id === "shop") renderShop();
    if (id === "customize") renderCustomizer();
    if (id === "home") renderFeatured();
  }

  document.getElementById("cart-modal").classList.remove("open");
}

// Navigate to admin sub-pages
function showAdminTab(tab) {
  document.querySelectorAll(".admin-sub-page").forEach(p => p.classList.remove("active"));
  const target = document.getElementById(tab);
  if (target) target.classList.add("active");

  document.querySelectorAll(".admin-tab").forEach((t, i) => {
    t.classList.toggle("active", (tab === "admin-orders" && i === 0) || (tab === "admin-products" && i === 1));
  });
  document.querySelectorAll("#admin-nav .nav-link").forEach((l, i) => {
    l.classList.toggle("active", (tab === "admin-orders" && i === 0) || (tab === "admin-products" && i === 1));
  });
  // Render the appropriate admin content
  if (tab === "admin-orders") { renderAdminOrders(); renderStats(); }
  if (tab === "admin-products") renderAdminProducts();
}

// Display all products in shop with skeleton loading
function renderShop() {
  const grid = document.getElementById("product-grid");

  // Show skeleton loading cards while products load
  grid.innerHTML = `
        ${Array(6).fill(0).map(() => `
            <div class="skeleton-card">
                <div class="skeleton-img"></div>
                <div class="skeleton-body">
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line short"></div>
                    <div class="skeleton-line half"></div>
                </div>
            </div>
        `).join('')}
    `;

  // Query products from database
  const products = dbQuery("SELECT * FROM products WHERE category='prebuilt'");
  if (!products.length) {
    grid.innerHTML = `<p style="color:var(--muted);padding:20px;text-align:center;">🌸 No products available yet. Check back soon!</p>`;
    return;
  }
  // Set 3 column grid for 3x4 layout
  grid.style.gridTemplateColumns = "repeat(3, 1fr)";
  // Render each product card with consistent sizing
  grid.innerHTML = products.map(p => `
        <div class="product-card">
            <div class="product-img" style="background:${p.color}22">
                ${p.image ? `<img src="${p.image}" alt="${p.name}">` : p.emoji}
            </div>
            <div class="product-body">
                <div class="product-name">${p.name}</div>
                <div class="product-desc">${p.description || ''}</div>
                <div class="product-footer">
                    <span class="product-price">₱${p.price}</span>
                    <button type="button" class="add-btn" onclick='addPrebuiltToCart(${JSON.stringify(p)})'>Add 🛒</button>
                </div>
            </div>
        </div>
    `).join("");
}

// Display featured products on home page (limit 5)
function renderFeatured() {
  const products = dbQuery("SELECT * FROM products WHERE category='prebuilt' LIMIT 5");
  const grid = document.getElementById("featured-grid");
  if (!products.length) {
    grid.innerHTML = `<p style="color:var(--muted);padding:20px;text-align:center;">🌸 No featured products yet.</p>`;
    return;
  }
  grid.innerHTML = products.map(p => `
        <div class="product-card">
            <div class="product-img" style="background:${p.color}22">
                ${p.image ? `<img src="${p.image}" alt="${p.name}">` : p.emoji}
            </div>
            <div class="product-body">
                <div class="product-name">${p.name}</div>
                <div class="product-desc">${p.description || ''}</div>
                <div class="product-footer">
                    <span class="product-price">₱${p.price}</span>
                    <button type="button" class="add-btn" onclick='addPrebuiltToCart(${JSON.stringify(p)})'>Add 🛒</button>
                </div>
            </div>
        </div>
    `).join("");
}

// Shopping cart array
let cart = [];

// Add pre-built product to cart
function addPrebuiltToCart(p) {
  cart.push({
    name: p.name,
    emoji: p.emoji,
    price: p.price,
    qty: 1,
    details: p.description || ''
  });
  updateCartBadge();
  // Save cart for current user
  saveUserCart(); // Save in session storage
  showToast(`✅ ${p.emoji} ${p.name} added to cart!`);
}

// Save cart for current user to sessionStorage
function saveUserCart() {
  if (currentUser) {
    const cartKey = 'mochi_cart_' + currentUser.name;
    sessionStorage.setItem(cartKey, JSON.stringify(cart));
  }
}

// Update cart badge with total item count
function updateCartBadge() {
  const total = cart.reduce((a, i) => a + i.qty, 0);
  const badge = document.getElementById("cart-badge");
  badge.textContent = total;
  badge.style.display = total > 0 ? "flex" : "none";
}

// Toggle cart modal visibility
function toggleCart() {
  const modal = document.getElementById("cart-modal");
  modal.classList.toggle("open");
  if (modal.classList.contains("open")) {
    renderCart();
    resetOrderFlow();
  }
}

// Reset order workflow state when cart opens
function resetOrderFlow() {
  document.getElementById("delivery-section").classList.add("hidden");
  document.getElementById("place-order-btn").classList.add("hidden");
  document.getElementById("confirm-order-btn").classList.remove("hidden");
  document.getElementById("o-type").value = "Delivery";
  updateDeliveryFields();
}

// Render cart items in the modal
function renderCart() {
  const el = document.getElementById("cart-items");
  const footer = document.getElementById("cart-footer");

  // Show empty state if cart is empty
  if (!cart.length) {
    el.innerHTML = `
            <div class="cart-empty">
                <div class="cart-empty-emoji">🛒</div>
                <p>Your cart is empty</p>
                <p style="font-size:14px;color:var(--muted);margin-top:6px;">Add some delicious mochi to get started! 🍡</p>
            </div>
        `;
    footer.style.display = "none";
    return;
  }

  footer.style.display = "block";
  // Render each cart item
  el.innerHTML = cart.map((item, i) => `
        <div class="cart-item">
            <div class="cart-item-emoji">${item.emoji}</div>
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-details">${item.details || ''} × ${item.qty}</div>
            </div>
            <div class="cart-item-price">₱${(item.price * item.qty).toFixed(2)}</div>
            <button type="button" class="cart-item-remove" onclick="removeFromCart(${i})" title="Remove item">✕</button>
        </div>
    `).join("");

  // Calculate and display total
  const total = cart.reduce((a, i) => a + (i.price * i.qty), 0);
  document.getElementById("cart-total").textContent = `₱${total.toFixed(2)}`;
}

function showOrderOptions() {
  document.getElementById("delivery-section").classList.remove("hidden");
  document.getElementById("place-order-btn").classList.remove("hidden");
  document.getElementById("confirm-order-btn").classList.add("hidden");
}

function updateDeliveryFields() {
  const type = document.getElementById("o-type").value;
  const addressField = document.getElementById("address-field");
  if (type === "Delivery") {
    addressField.classList.remove("hidden");
  } else {
    addressField.classList.add("hidden");
  }
}

// Remove item from cart by index
function removeFromCart(i) {
  const item = cart[i];
  cart.splice(i, 1);
  updateCartBadge();
  // Save cart for current user after removal
  saveUserCart();
  renderCart();
  showToast(`🗑️ Removed ${item.name} from cart.`);
}

// Place order with validation and loading state
function placeOrder() {
  // Check if cart has items
  if (!cart.length) {
    showToast("⚠️ Your cart is empty! Add some mochi first.");
    return;
  }

  // Get form values
  const name = document.getElementById("o-name").value.trim();
  const phone = document.getElementById("o-phone").value.trim();
  const address = document.getElementById("o-address").value.trim();
  const type = document.getElementById("o-type").value;

  // Validate name is provided
  if (!name) {
    showToast("⚠️ Please enter your full name.");
    document.getElementById("o-name").focus();
    document.getElementById("o-name").style.borderColor = "var(--rose)";
    setTimeout(() => {
      document.getElementById("o-name").style.borderColor = "";
    }, 3000);
    return;
  }

  // Validate phone is provided
  if (!phone) {
    showToast("⚠️ Please enter your phone number.");
    document.getElementById("o-phone").focus();
    document.getElementById("o-phone").style.borderColor = "var(--rose)";
    setTimeout(() => {
      document.getElementById("o-phone").style.borderColor = "";
    }, 3000);
    return;
  }

  // Validate Philippine phone number format
  const phoneRegex = /^(09|\+639)\d{9}$/;
  if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
    showToast("⚠️ Please enter a valid Philippine phone number (e.g., 09123456789).");
    document.getElementById("o-phone").focus();
    document.getElementById("o-phone").style.borderColor = "var(--rose)";
    setTimeout(() => {
      document.getElementById("o-phone").style.borderColor = "";
    }, 3000);
    return;
  }

  // Validate address for delivery orders
  if (type === "Delivery" && !address) {
    showToast("⚠️ Please enter your delivery address.");
    document.getElementById("o-address").focus();
    document.getElementById("o-address").style.borderColor = "var(--rose)";
    setTimeout(() => {
      document.getElementById("o-address").style.borderColor = "";
    }, 3000);
    return;
  }

  // Show loading state on button
  const btn = document.querySelector('.place-order-btn');
  const originalText = btn.textContent;
  btn.innerHTML = '⏳ Processing<span class="loading-dots"></span>';
  btn.disabled = true;

  // Prepare order data
  const total = cart.reduce((a, i) => a + (i.price * i.qty), 0);
  const items = JSON.stringify(cart);
  const now = new Date().toLocaleString("en-PH");

  // Save order to database
  const success = dbRun(
    "INSERT INTO orders (customer_name,phone,address,delivery_type,items,total,status,created_at,user) VALUES (?,?,?,?,?,?,?,?,?)",
    [name, phone, address, type, items, total, "pending", now, currentUser.name]
  );

  // Restore button state
  btn.innerHTML = originalText;
  btn.disabled = false;

  if (success) {
    // Clear cart and close modal
    cart = [];
    // Remove user's cart from session storage
    const cartKey = 'mochi_cart_' + currentUser.name;
    sessionStorage.removeItem(cartKey);
    updateCartBadge();
    document.getElementById("cart-modal").classList.remove("open");
    // Clear form fields
    document.getElementById("o-name").value = "";
    document.getElementById("o-phone").value = "";
    document.getElementById("o-address").value = "";
    showToast(`🎉 Order placed successfully! Thank you, ${name}!`);
  }
}

// Customizer data arrays
const SKINS = [
  { name: "Original", emoji: "⬜", color: "#FFF0F0", price: 0 },
  { name: "Strawberry", emoji: "🍓", color: "#FF6B8B", price: 5 },
  { name: "Matcha", emoji: "🍵", color: "#A8D5A2", price: 5 },
  { name: "Ube", emoji: "🍠", color: "#9B72CF", price: 5 },
  { name: "Mango", emoji: "🥭", color: "#FFD166", price: 5 },
  { name: "Chocolate", emoji: "🍫", color: "#8B5E3C", price: 5 },
  { name: "Sakura", emoji: "🌸", color: "#F9A8BF", price: 8 },
  { name: "Taro", emoji: "🧋", color: "#C4A4D4", price: 8 },
];

const FILLINGS = [
  { name: "Red Bean", emoji: "🫘", price: 0 },
  { name: "Cream Cheese", emoji: "🧀", price: 10 },
  { name: "Choco Fudge", emoji: "🍫", price: 10 },
  { name: "Strawberry Jam", emoji: "🍓", price: 8 },
  { name: "Mango Cream", emoji: "🥭", price: 10 },
  { name: "Ube Halaya", emoji: "💜", price: 12 },
  { name: "Custard", emoji: "🍮", price: 10 },
  { name: "Nutella", emoji: "🌰", price: 12 },
];

const COATINGS = [
  { name: "None", emoji: "✨", price: 0 },
  { name: "Kinako", emoji: "🟤", price: 5 },
  { name: "Cocoa Powder", emoji: "☕", price: 5 },
  { name: "Sesame", emoji: "⚪", price: 5 },
  { name: "Rainbow Sugar", emoji: "🌈", price: 8 },
  { name: "Matcha Powder", emoji: "🍵", price: 8 },
];

const SIZES = [
  { name: "Mini", weight: "30g", emoji: "🔵", mult: 1 },
  { name: "Regular", weight: "50g", emoji: "🟣", mult: 1.3 },
  { name: "Large", weight: "70g", emoji: "🔴", mult: 1.6 },
];

const BASE_PRICE = 45;
let custom = { skin: null, filling: null, coating: null, size: SIZES[1], qty: 1 };

// Render customizer options
function renderCustomizer() {
  // Render skin options
  document.getElementById("skin-options").innerHTML = SKINS.map((s, i) => `
        <div class="option-chip ${custom.skin === i ? 'selected' : ''}" onclick="pickCustom('skin',${i})" style="${custom.skin === i ? 'background:' + s.color + '44;border-color:' + s.color : ''}">
            ${s.emoji} ${s.name} <span class="option-price">${s.price ? '+₱' + s.price : ''}</span>
        </div>
    `).join("");

  // Render filling options
  document.getElementById("filling-options").innerHTML = FILLINGS.map((f, i) => `
        <div class="option-chip ${custom.filling === i ? 'selected' : ''}" onclick="pickCustom('filling',${i})">
            ${f.emoji} ${f.name} <span class="option-price">${f.price ? '+₱' + f.price : ''}</span>
        </div>
    `).join("");

  // Render coating options
  document.getElementById("coating-options").innerHTML = COATINGS.map((c, i) => `
        <div class="option-chip ${custom.coating === i ? 'selected' : ''}" onclick="pickCustom('coating',${i})">
            ${c.emoji} ${c.name} <span class="option-price">${c.price ? '+₱' + c.price : ''}</span>
        </div>
    `).join("");

  // Render size options with price labels
  document.getElementById("size-options").innerHTML = SIZES.map((s, i) => {
    const sizePrice = (BASE_PRICE * s.mult).toFixed(2);
    return `
        <div class="size-option ${custom.size === SIZES[i] ? 'selected' : ''}" onclick="pickSize(${i})">
            <div class="size-emoji">${s.emoji}</div>
            <div>
              <div class="size-name">${s.name}</div>
              <div class="size-weight">${s.weight}</div>
            </div>
            <div class="size-price">₱${sizePrice}</div>
        </div>
      `;
  }).join("");

  document.getElementById("custom-qty").textContent = custom.qty;
  updatePreview();
}

// Pick a customizer option (skin, filling, or coating)
function pickCustom(type, idx) {
  custom[type] = idx;
  renderCustomizer();
}

// Pick a size
function pickSize(i) {
  custom.size = SIZES[i];
  renderCustomizer();
}

// Change quantity
function changeQty(d) {
  custom.qty = Math.max(1, custom.qty + d);
  document.getElementById("custom-qty").textContent = custom.qty;
  updatePreview();
}

// Calculate custom mochi unit price (before quantity)
function calculateCustomUnitPrice() {
  const skin = custom.skin !== null ? SKINS[custom.skin] : null;
  const filling = custom.filling !== null ? FILLINGS[custom.filling] : null;
  const coating = custom.coating !== null ? COATINGS[custom.coating] : null;
  const size = custom.size;

  const baseWithSize = BASE_PRICE * size.mult;
  const addons = (skin?.price || 0) + (filling?.price || 0) + (coating?.price || 0);
  return baseWithSize + addons;
}

// Update the live preview panel
function updatePreview() {
  const skin = custom.skin !== null ? SKINS[custom.skin] : null;
  const filling = custom.filling !== null ? FILLINGS[custom.filling] : null;
  const coating = custom.coating !== null ? COATINGS[custom.coating] : null;
  const size = custom.size;

  const emoji = skin?.emoji || "🍡";
  const color = skin?.color || "#F9A8BF";
  const unitPrice = calculateCustomUnitPrice();
  const totalPrice = unitPrice * custom.qty;

  // Update mochi visual
  const preview = document.getElementById("mochi-preview");
  preview.style.background = `radial-gradient(circle at 40% 35%, ${color}cc, ${color})`;
  preview.textContent = emoji;

  // Update name and price
  const parts = [skin?.name, filling?.name && filling.name + " filling", coating?.name !== "None" && coating?.name + " coating"].filter(Boolean);
  document.getElementById("preview-name").textContent = parts.length ? parts.join(", ") : "Your Custom Mochi";
  document.getElementById("preview-price").textContent = `₱ ${totalPrice.toFixed(2)}`;

  // Update ingredients list
  const ingredients = [
    { label: "Skin", value: skin ? `${skin.emoji} ${skin.name}` : "—" },
    { label: "Filling", value: filling ? `${filling.emoji} ${filling.name}` : "—" },
    { label: "Coating", value: coating ? `${coating.emoji} ${coating.name}` : "—" },
    { label: "Size", value: size ? `${size.emoji} ${size.name} (${size.weight})` : "—" },
    { label: "Quantity", value: custom.qty }
  ];

  const hasAllSelections = skin && filling && coating && size;
  const ingredientsHTML = ingredients.map(ing => `
        <div class="ingredient-item">
            <span class="ingredient-label">${ing.label}</span>
            <span class="ingredient-value">${ing.value}</span>
        </div>
    `).join("");

  document.getElementById("custom-ingredients").innerHTML = hasAllSelections ? ingredientsHTML : `<div class="ingredient-empty">👆 Select your ingredients above</div>`;
}

// Add custom mochi to cart
function addCustomToCart() {
  // Validate all steps are completed
  if (custom.skin === null || custom.filling === null || custom.coating === null) {
    showToast("⚠️ Please complete all customization steps (Skin, Filling, and Coating)!");
    return;
  }

  const skin = SKINS[custom.skin];
  const filling = FILLINGS[custom.filling];
  const coating = COATINGS[custom.coating];
  const size = custom.size;
  const unitPrice = calculateCustomUnitPrice();
  const notes = document.getElementById("special-notes").value;

  // Add custom mochi to cart
  cart.push({
    name: `Custom Mochi (${skin.name})`,
    emoji: skin.emoji,
    price: unitPrice,
    qty: custom.qty,
    details: `${filling.name} filling, ${coating.name} coating, ${size.name}${notes ? ', ' + notes : ''}`,
  });

  updateCartBadge();
  // Save cart for current user
  saveUserCart();
  showToast(`✅ ${skin.emoji} Custom mochi added to cart!`);

  // Reset customizer
  custom = { skin: null, filling: null, coating: null, size: SIZES[1], qty: 1 };
  document.getElementById("special-notes").value = "";
  renderCustomizer();
}

// Display user's order history
function renderMyOrders() {
  const orders = dbQuery("SELECT * FROM orders WHERE user=? ORDER BY id DESC", [currentUser.name]);
  const el = document.getElementById("my-orders-list");
  // Show empty state if no orders
  if (!orders.length) {
    el.innerHTML = `
            <div style="text-align:center;padding:60px;color:var(--muted)">
                <div style="font-size:48px;margin-bottom:12px">📦</div>
                <p>No orders yet — go shop some mochi! 🍡</p>
                <button type="button" class="btn-primary" style="width:auto;margin-top:20px;padding:12px 40px;" onclick="showPage('shop')">Start Shopping</button>
            </div>
        `;
    return;
  }
  // Render each order card
  el.innerHTML = orders.map(o => {
    const items = JSON.parse(o.items || "[]");
    return `
            <div class="order-hist-card">
                <div class="order-hist-header">
                    <div>
                        <div class="order-hist-id">Order #${o.id}</div>
                        <div class="order-hist-date">${o.created_at}</div>
                    </div>
                    <span class="status-badge status-${o.status}">${statusLabel(o.status, o.delivery_type)}</span>
                </div>
                <div class="order-hist-items">
                    ${items.map(i => `<div class="order-hist-item">${i.emoji} <strong>${i.name}</strong> × ${i.qty} &nbsp;—&nbsp; <span style="color:var(--muted);font-size:14px">${i.details || ''}</span></div>`).join("")}
                </div>
                <div class="order-hist-footer">
                    <span style="font-size:14px;color:var(--muted)">${o.delivery_type} · ${o.address || 'No address'}</span>
                    <strong style="color:var(--rose)">₱${Number(o.total).toFixed(2)}</strong>
                </div>
            </div>
        `;
  }).join("");
}

// ADMIN FUNCTIONS

// Display all orders in admin panel
function renderAdminOrders() {
  const orders = dbQuery("SELECT * FROM orders ORDER BY id DESC");
  const tbody = document.getElementById("orders-tbody");
  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--muted)">📭 No orders yet.</td></tr>`;
    return;
  }
  // Render each order row
  tbody.innerHTML = orders.map(o => {
    const items = JSON.parse(o.items || "[]");
    const itemNames = items.map(i =>
      `<div style="display:flex;align-items:center;gap:6px;padding:2px 0;">
         <span>${i.emoji}</span>
         <span>${i.name}</span>
         <span style="color:var(--muted);font-size:13px;">×${i.qty}</span>
       </div>`
    ).join('');
    return `
            <tr>
                <td><strong>#${o.id}</strong></td>
                <td>${o.customer_name}<br><span style="font-size:13px;color:var(--muted)">${o.phone}</span></td>
                <td style="font-size:14px;max-width:200px">${itemNames}</td>
                <td><strong style="color:var(--rose)">₱${Number(o.total).toFixed(2)}</strong></td>
                <td><span class="status-badge status-${o.status}">${statusLabel(o.status, o.delivery_type)}</span></td>
                <td style="font-size:13px;color:var(--muted)">${o.created_at}</td>
                <td style="font-weight:600;color:var(--plum)">${o.delivery_type || 'N/A'}</td>
                <td>${orderActions(o)}</td>
            </tr>
        `;
  }).join("");
}

// Generate action buttons for each order based on status
function orderActions(o) {
  if (o.status === "pending") return `<button type="button" class="action-btn prepare" onclick="updateStatus(${o.id},'preparing')">🔪 Prepare</button>`;
  if (o.status === "preparing") return `<button type="button" class="action-btn ready" onclick="updateStatus(${o.id},'ready')">✅ Mark Ready</button>`;
  if (o.status === "ready") {
    const actionLabel = o.delivery_type === "Pick-up" ? "🛍️ Picked Up" : "📦 Delivered";
    return `<button type="button" class="action-btn deliver" onclick="updateStatus(${o.id},'delivered')">${actionLabel}</button>`;
  }
  return `<span style="color:var(--muted);font-size:13px">✅ Done</span>`;
}

// Update order status
function updateStatus(id, status) {
  const statusLabels = {
    pending: "Pending",
    preparing: "Preparing",
    ready: "Ready",
    delivered: "Delivered"
  };

  // Confirm delivery status change
  if (status === "delivered") {
    const order = dbQuery("SELECT delivery_type FROM orders WHERE id=?", [id])[0] || {};
    const actionLabel = order.delivery_type === "Pick-up" ? "Picked Up" : "Delivered";
    if (!confirm(`✅ Mark Order #${id} as ${actionLabel}?\n\nThis will add ₱ to your revenue.`)) {
      return;
    }
  }

  showLoading(`Updating order status... 📦`);
  const success = dbRun("UPDATE orders SET status=? WHERE id=?", [status, id]);
  hideLoading();

  if (success) {
    renderAdminOrders();
    renderStats();
    showToast(`✅ Order #${id} updated to ${statusLabels[status] || status}!`);
  }
}

// Get status label with emoji
function statusLabel(s, deliveryType = "Delivery") {
  if (s === "delivered") {
    return deliveryType === "Pick-up" ? "🛍️ Picked Up" : "📦 Delivered";
  }
  return { pending: "⏳ Pending", preparing: "🔪 Preparing", ready: "✅ Ready" }[s] || s;
}

// Render statistics on admin dashboard
function renderStats() {
  const orders = dbQuery("SELECT * FROM orders");
  const pending = orders.filter(o => o.status === "pending").length;
  const preparing = orders.filter(o => o.status === "preparing").length;
  const delivered = orders.filter(o => o.status === "delivered").length;
  const revenue = orders.filter(o => o.status === "delivered").reduce((a, o) => a + Number(o.total), 0);

  document.getElementById("stats-grid").innerHTML = `
        <div class="stat-card">
            <div class="stat-label">📦 Total Orders</div>
            <div class="stat-value">${orders.length}</div>
            <div class="stat-sub">All time orders</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">⏳ Pending</div>
            <div class="stat-value">${pending}</div>
            <div class="stat-sub">Awaiting preparation</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">🔪 Preparing</div>
            <div class="stat-value">${preparing}</div>
            <div class="stat-sub">In the kitchen</div>
        </div>
        <div class="stat-card" style="border-color: var(--rose);">
            <div class="stat-label">💰 Revenue</div>
            <div class="stat-value" style="color: var(--rose);">₱${revenue.toFixed(0)}</div>
            <div class="stat-sub" style="color: var(--muted);">
                ${delivered} orders delivered
                <span style="display:block;font-size:12px;color:var(--muted);margin-top:4px;">
                    💡 Only "Delivered" orders count toward revenue
                </span>
            </div>
        </div>
    `;
}

// Display all products in admin panel
function renderAdminProducts() {
  const products = dbQuery("SELECT * FROM products ORDER BY id");
  const el = document.getElementById("product-list-admin");
  if (!products.length) {
    el.innerHTML = `<p style="padding:20px;color:var(--muted);text-align:center;">🌸 No products yet. Add one below!</p>`;
    return;
  }
  // Render each product with edit and delete buttons
  el.innerHTML = products.map(p => `
        <div class="product-list-item">
            <div class="pli-emoji">${p.emoji}</div>
            <div class="pli-info">
                <div class="pli-name">${p.name}</div>
                <div class="pli-category">${p.description || ''}</div>
            </div>
            <div class="pli-price">₱${p.price}</div>
            <div class="pli-actions">
                <button type="button" class="pli-edit" onclick="openEditModal(${p.id})">✏️ Edit</button>
                <button type="button" class="pli-del" onclick="deleteProduct(${p.id})">🗑️</button>
            </div>
        </div>
    `).join("");
}

// Open edit product modal with pre-filled data
function openEditModal(id) {
  const product = dbQuery("SELECT * FROM products WHERE id=?", [id]);
  if (!product.length) {
    showToast("⚠️ Product not found.");
    return;
  }
  const p = product[0];
  // Populate form fields with product data
  document.getElementById("edit-product-id").value = p.id;
  document.getElementById("edit-name").value = p.name;
  document.getElementById("edit-desc").value = p.description || '';
  document.getElementById("edit-price").value = p.price;
  document.getElementById("edit-emoji").value = p.emoji || '🍡';
  document.getElementById("edit-color").value = p.color || '#F9A8BF';
  document.getElementById("edit-modal").classList.add("open");
}

// Close edit modal
function closeEditModal() {
  document.getElementById("edit-modal").classList.remove("open");
}

// Save product edits
function saveProductEdit() {
  const id = parseInt(document.getElementById("edit-product-id").value);
  const name = document.getElementById("edit-name").value.trim();
  const description = document.getElementById("edit-desc").value.trim();
  const price = parseFloat(document.getElementById("edit-price").value);
  const emoji = document.getElementById("edit-emoji").value.trim() || '🍡';
  const color = document.getElementById("edit-color").value;

  // Validate inputs
  if (!name) {
    showToast("⚠️ Please enter a product name.");
    document.getElementById("edit-name").focus();
    document.getElementById("edit-name").style.borderColor = "var(--rose)";
    setTimeout(() => {
      document.getElementById("edit-name").style.borderColor = "";
    }, 3000);
    return;
  }

  if (isNaN(price) || price <= 0) {
    showToast("⚠️ Please enter a valid price (must be greater than 0).");
    document.getElementById("edit-price").focus();
    document.getElementById("edit-price").style.borderColor = "var(--rose)";
    setTimeout(() => {
      document.getElementById("edit-price").style.borderColor = "";
    }, 3000);
    return;
  }

  showLoading(`Updating ${emoji} ${name}...`);
  // Update product in database
  const success = dbRun(
    "UPDATE products SET name=?, description=?, price=?, emoji=?, color=? WHERE id=?",
    [name, description, price, emoji, color, id]
  );
  hideLoading();

  if (success) {
    closeEditModal();
    renderAdminProducts();
    renderShop();
    renderFeatured();
    showToast(`✅ ${emoji} ${name} updated successfully!`);
  }
}

// Add new product
function addProduct() {
  const name = document.getElementById("np-name").value.trim();
  const desc = document.getElementById("np-desc").value.trim();
  const price = parseFloat(document.getElementById("np-price").value);
  const emoji = document.getElementById("np-emoji").value.trim() || "🍡";
  const color = document.getElementById("np-color").value;

  // Validate inputs
  if (!name) {
    showToast("⚠️ Please enter a product name.");
    document.getElementById("np-name").focus();
    document.getElementById("np-name").style.borderColor = "var(--rose)";
    setTimeout(() => {
      document.getElementById("np-name").style.borderColor = "";
    }, 3000);
    return;
  }

  if (isNaN(price) || price <= 0) {
    showToast("⚠️ Please enter a valid price (must be greater than 0).");
    document.getElementById("np-price").focus();
    document.getElementById("np-price").style.borderColor = "var(--rose)";
    setTimeout(() => {
      document.getElementById("np-price").style.borderColor = "";
    }, 3000);
    return;
  }

  showLoading(`Adding ${emoji} ${name}...`);
  // Insert new product into database
  const success = dbRun(
    "INSERT INTO products (name,description,price,emoji,color) VALUES (?,?,?,?,?)",
    [name, desc, price, emoji, color]
  );
  hideLoading();

  if (success) {
    renderAdminProducts();
    renderShop();
    renderFeatured();
    showToast(`✅ ${emoji} ${name} added successfully!`);
    // Clear form fields
    ["np-name", "np-desc", "np-price", "np-emoji"].forEach(id => {
      document.getElementById(id).value = "";
    });
  }
}

// Delete product with confirmation
function deleteProduct(id) {
  const product = dbQuery("SELECT name, emoji FROM products WHERE id=?", [id]);
  if (product.length > 0) {
    const p = product[0];
    if (!confirm(`🗑️ Are you sure you want to delete "${p.emoji} ${p.name}"?\n\nThis action cannot be undone.`)) {
      return;
    }
  }

  showLoading(`Deleting product...`);
  const success = dbRun("DELETE FROM products WHERE id=?", [id]);
  hideLoading();

  if (success) {
    renderAdminProducts();
    renderShop();
    renderFeatured();
    showToast("🗑️ Product removed successfully.");
  }
}

// Toast notification system
let toastTimer;

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
}

// Initialize database and start the application
initDB().then(() => {
  console.log("🌸 MochiVerse DB ready!");
}).catch(error => {
  console.error("Failed to initialize:", error);
  showToast("⚠️ Failed to load the app. Please refresh the page.");
});