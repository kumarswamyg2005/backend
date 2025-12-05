# DesignDen - Technical Implementation Guide

## Project Overview

DesignDen is a full-stack e-commerce platform for custom and ready-made clothing with role-based access for Customers, Designers, Managers, Admin, and Delivery personnel.

---

## 1. Authentication System

### How Login Works

```
User enters email/password → Frontend sends POST to /api/auth/login
→ Backend finds user in MongoDB → bcrypt.compare() verifies password
→ Session created → User redirected based on role
```

**AuthContext.jsx** - Manages user state across the app

```javascript
// We use React Context to share user data everywhere
const AuthContext = createContext();

// Login function sends credentials to backend
const login = async (credentials) => {
  const response = await api.post("/api/auth/login", credentials);
  setUser(response.data.user); // Store user in state
  return response.data;
};

// Check session on app load
useEffect(() => {
  api.get("/api/auth/session").then((res) => {
    if (res.data.user) setUser(res.data.user);
  });
}, []);
```

**Password Hashing (server.cjs)**

```javascript
// Signup: Hash password before saving
const hashedPassword = await bcrypt.hash(password, 10);
await User.save({ password: hashedPassword });

// Login: Compare with hashed password
const isValid = await bcrypt.compare(inputPassword, user.password);
```

---

## 2. Role-Based Access Control

### ProtectedRoute Component

```javascript
// Wraps routes that need authentication
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  // Not logged in? Go to login
  if (!user) return <Navigate to="/login" />;

  // Wrong role? Show 403
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};
```

### Route Configuration (App.jsx)

```javascript
// Each role has protected routes
<Route path="/admin/*" element={
  <ProtectedRoute allowedRoles={['admin']}>
    <AdminDashboard />
  </ProtectedRoute>
} />

<Route path="/customer/*" element={
  <ProtectedRoute allowedRoles={['customer']}>
    <CustomerDashboard />
  </ProtectedRoute>
} />
```

---

## 3. Shopping Cart System

### CartContext.jsx - State Management

```javascript
const CartContext = createContext();

const [cartItems, setCartItems] = useState([]);

// Add item to cart
const addToCart = async (product, quantity, size, color) => {
  // Update local state immediately (optimistic update)
  setCartItems((prev) => [...prev, { product, quantity, size, color }]);

  // Sync with backend
  await api.post("/api/cart/add", { productId, quantity, size, color });
};

// Calculate total
const cartTotal = cartItems.reduce((sum, item) => {
  return sum + item.product.price * item.quantity;
}, 0);
```

### Cart Animation Hook

```javascript
// useCartAnimation.js - Flying animation when adding to cart
const useCartAnimation = () => {
  const animateToCart = (element) => {
    const cartIcon = document.querySelector(".cart-icon");
    const rect = element.getBoundingClientRect();

    // Create flying element
    const flyingEl = element.cloneNode(true);
    flyingEl.style.position = "fixed";
    flyingEl.style.transition = "all 0.5s ease-in-out";

    // Animate to cart position
    flyingEl.style.top = cartIcon.offsetTop + "px";
    flyingEl.style.left = cartIcon.offsetLeft + "px";
    flyingEl.style.opacity = "0";
  };
};
```

---

## 4. Redux State Management

### Store Configuration

```javascript
// src/store/index.js
import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";

const store = configureStore({
  reducer: {
    auth: authReducer,
    products: productsReducer,
    cart: cartReducer,
    orders: ordersReducer,
    notifications: notificationsReducer,
    ui: uiReducer,
  },
});

// Persist cart and auth to localStorage
const persistConfig = {
  key: "design-den",
  storage: localStorage,
  whitelist: ["auth", "cart"], // Only these are saved
};
```

### Orders Slice Example

```javascript
// ordersSlice.js - Async thunk for fetching orders
export const fetchOrders = createAsyncThunk(
  "orders/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/api/orders");
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Reducer handles loading/success/error states
const ordersSlice = createSlice({
  name: "orders",
  initialState: { items: [], loading: false, error: null },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});
```

---

## 5. Custom Design Studio (3D Feature)

### How 3D Model Viewer Works

```javascript
// ModelViewer.jsx - Using Three.js
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";

const ModelViewer = ({ modelPath, color }) => {
  return (
    <Canvas camera={{ position: [0, 0, 5] }}>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} />

      {/* 3D Model */}
      <ClothingModel path={modelPath} color={color} />

      {/* User can rotate/zoom */}
      <OrbitControls enableZoom={true} />
    </Canvas>
  );
};

// Load and display GLB model
const ClothingModel = ({ path, color }) => {
  const { scene } = useGLTF(path);

  // Apply selected color to model
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.material.color.set(color);
      }
    });
  }, [color]);

  return <primitive object={scene} />;
};
```

### Design Studio Flow

```
1. User selects category (T-Shirt, Hoodie, etc.)
2. User selects gender → Loads appropriate 3D model
3. User picks color → Model color updates in real-time
4. User selects fabric/pattern → Price calculated
5. User adds graphic (optional) → Overlaid on model
6. "Add to Cart" → Custom design saved to order
```

---

## 6. Order Workflow System

### Order Status Flow

```
SHOP ORDERS:
placed → assigned_to_manager → ready_for_delivery →
out_for_delivery → delivered

CUSTOM ORDERS:
placed → assigned_to_manager → assigned_to_designer →
in_production → production_completed → ready_for_delivery →
out_for_delivery → delivered
```

### Order Tracking Component

```javascript
// OrderTracking.jsx
const OrderTracking = ({ order }) => {
  const steps = getWorkflowSteps(order.isCustom);
  const currentIndex = steps.indexOf(order.status);

  return (
    <div className="tracking-timeline">
      {steps.map((step, index) => (
        <div
          key={step}
          className={`step ${index <= currentIndex ? "completed" : ""}`}
        >
          <div className="step-icon">
            {index < currentIndex ? "✓" : index + 1}
          </div>
          <div className="step-label">{formatStatus(step)}</div>
        </div>
      ))}
    </div>
  );
};
```

---

## 7. Delivery OTP Verification

### How OTP Works

```javascript
// Backend: Generate OTP when order is out for delivery
app.post("/api/delivery/pickup/:orderId", async (req, res) => {
  const otp = Math.floor(1000 + Math.random() * 9000); // 4-digit OTP

  await Order.findByIdAndUpdate(orderId, {
    status: "out_for_delivery",
    deliveryOTP: otp,
  });

  // Customer sees OTP in their order details
});

// Delivery person enters OTP to complete delivery
app.post("/api/delivery/complete/:orderId", async (req, res) => {
  const { otp } = req.body;
  const order = await Order.findById(orderId);

  if (order.deliveryOTP !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  order.status = "delivered";
  order.deliveredAt = new Date();
  await order.save();
});
```

---

## 8. Stock Management

### Stock Update Logic

```javascript
// When order is placed, reduce stock
app.post("/api/orders", async (req, res) => {
  const { items } = req.body;

  for (const item of items) {
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { stockQuantity: -item.quantity },
    });
  }

  // Create order...
});

// Manager can update stock manually
app.put("/api/manager/products/:id/stock", async (req, res) => {
  const { stockQuantity } = req.body;

  await Product.findByIdAndUpdate(req.params.id, {
    stockQuantity,
    inStock: stockQuantity > 0,
  });
});
```

---

## 9. Flash Messages (Toast Notifications)

### FlashContext Implementation

```javascript
// FlashContext.jsx
const FlashContext = createContext();

const [messages, setMessages] = useState([]);

const success = (text) => {
  const id = Date.now();
  setMessages((prev) => [...prev, { id, type: "success", text }]);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, 3000);
};

const error = (text) => {
  setMessages((prev) => [...prev, { id: Date.now(), type: "error", text }]);
};

// Usage in components:
const { success, error } = useFlash();
success("Item added to cart!");
error("Payment failed");
```

---

## 10. Theme Context (Dark/Light Mode)

```javascript
// ThemeContext.jsx
const ThemeContext = createContext();

const [theme, setTheme] = useState("light");

const toggleTheme = () => {
  const newTheme = theme === "light" ? "dark" : "light";
  setTheme(newTheme);
  document.body.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
};

// Load saved theme on startup
useEffect(() => {
  const saved = localStorage.getItem("theme") || "light";
  setTheme(saved);
  document.body.setAttribute("data-theme", saved);
}, []);
```

---

## 11. API Service Configuration

```javascript
// src/services/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5174",
  withCredentials: true, // Send cookies for session
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Session expired - handled by ProtectedRoute
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## 12. Form Validation Utilities

```javascript
// src/utils/validation.js

export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return { valid: false, message: "Email is required" };
  if (!regex.test(email))
    return { valid: false, message: "Invalid email format" };
  return { valid: true };
};

export const validatePhone = (phone) => {
  const regex = /^[0-9]{10}$/;
  if (!phone) return { valid: false, message: "Phone is required" };
  if (!regex.test(phone)) return { valid: false, message: "Must be 10 digits" };
  return { valid: true };
};

export const validatePassword = (password) => {
  if (!password) return { valid: false, message: "Password is required" };
  if (password.length < 6) return { valid: false, message: "Min 6 characters" };
  return { valid: true };
};
```

---

## Database Schema Overview

```javascript
// MongoDB Collections

User: {
  username, name, email, password (hashed),
  role: ['customer', 'designer', 'manager', 'admin', 'delivery'],
  addresses: [{ street, city, state, pincode }]
}

Product: {
  name, description, category, gender,
  price, sizes[], colors[], stockQuantity,
  images[], modelPath (for 3D)
}

Order: {
  userId, items[], totalAmount,
  status, shippingAddress,
  designerId, deliveryPersonId,
  deliveryOTP, isCustomOrder
}

Cart: {
  userId, items: [{ productId, quantity, size, color }]
}

Design: {
  userId, category, gender, color,
  fabric, pattern, graphic, price
}
```

---

## Technology Stack

| Layer            | Technology                  |
| ---------------- | --------------------------- |
| Frontend         | React 18, Vite, Bootstrap 5 |
| State Management | Redux Toolkit, Context API  |
| 3D Rendering     | Three.js, React Three Fiber |
| Backend          | Express.js, Node.js         |
| Database         | MongoDB, Mongoose           |
| Authentication   | bcrypt, express-session     |
| HTTP Client      | Axios                       |
| Persistence      | redux-persist, localStorage |

---

## Running the Project

```bash
# Install dependencies
npm install

# Start backend server (Port 5174)
node server.cjs

# Start frontend (Port 5173)
npm run dev

# Access the app
http://localhost:5173
```

---

## Test Credentials

| Role     | Email                  | Password    |
| -------- | ---------------------- | ----------- |
| Admin    | admin@designden.com    | admin123    |
| Manager  | manager@designden.com  | manager123  |
| Designer | designer@designden.com | designer123 |
| Delivery | delivery@designden.com | delivery123 |
| Customer | (signup to create)     | -           |
