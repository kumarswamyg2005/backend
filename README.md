# 🎨 DesignDen React - Complete Migration Guide

> **STATUS**: Core infrastructure is 100% complete. The app builds and runs successfully. 19 pages need full implementation (currently stubs).

## 🚀 Quick Start

```bash
cd design-den-react
npm install
npm run dev
```

Visit `http://localhost:5173`

## ✅ What's Already Done

### Infrastructure (100% Complete)

- ✅ React 18 + Vite setup
- ✅ React Router v6 with all 25+ routes
- ✅ Context API (Auth, Cart, Theme, Flash)
- ✅ API service layer (axios + all endpoints)
- ✅ Form validation utilities
- ✅ Shared components (Header, Footer, Layout, ProtectedRoute, FlashMessages)
- ✅ CSS migration (1415 lines + dark theme)
- ✅ Asset migration (images, 3D models)
- ✅ Role-based access control
- ✅ Working pages: Home, Login, Signup, 404

### Build Status

```
✓ 130 modules transformed
✓ Built successfully in 783ms
✓ No errors
```

## ⚠️ What Needs Implementation

19 pages currently have placeholder stubs. Each needs to be converted from EJS:

### Shop (2 pages)

- `src/pages/shop/ShopIndex.jsx` ← `views/shop/index.ejs`
- `src/pages/shop/ProductDetails.jsx` ← `views/shop/product-details.ejs`

### Customer (5 pages)

- `src/pages/customer/Dashboard.jsx` ← `views/customer/dashboard.ejs`
- `src/pages/customer/Cart.jsx` ← `views/customer/cart.ejs`
- `src/pages/customer/Checkout.jsx` ← `views/customer/checkout.ejs`
- `src/pages/customer/DesignStudio.jsx` ← `views/customer/design-studio.ejs`
- `src/pages/customer/OrderDetails.jsx` ← `views/customer/order-details.ejs`

### Designer (3 pages)

- `src/pages/designer/Dashboard.jsx` ← `views/designer/dashboard.ejs`
- `src/pages/designer/Products.jsx` ← `views/designer/products.ejs`
- `src/pages/designer/OrderDetails.jsx` ← `views/designer/order-details.ejs`

### Manager (3 pages)

- `src/pages/manager/Dashboard.jsx` ← `views/manager/dashboard.ejs`
- `src/pages/manager/Pending.jsx` ← `views/manager/pending.ejs`
- `src/pages/manager/OrderDetails.jsx` ← `views/manager/order-details.ejs`

### Admin (6 pages)

- `src/pages/admin/Dashboard.jsx` ← `views/admin/dashboard.ejs`
- `src/pages/admin/Orders.jsx` ← `views/admin/orders.ejs`
- `src/pages/admin/Products.jsx` ← `views/admin/products.ejs`
- `src/pages/admin/PendingManagers.jsx` ← `views/admin/pending-managers.ejs`
- `src/pages/admin/Feedbacks.jsx` ← `views/admin/feedbacks.ejs`
- `src/pages/admin/OrderDetails.jsx` ← `views/admin/order-details.ejs`

## 📝 How to Convert a Page (Step-by-Step)

### 1. Find the Original EJS File

Example: `views/customer/dashboard.ejs`

### 2. Identify EJS Patterns

| EJS                             | React                                 |
| ------------------------------- | ------------------------------------- |
| `<%= variable %>`               | `{variable}`                          |
| `<% if (condition) { %>`        | `{condition && (...)}`                |
| `<% array.forEach(item => { %>` | `{array.map(item => (...))}`          |
| `<%- include('partial') %>`     | `import Component from './Component'` |

### 3. Use Existing API Services

All APIs are ready in `src/services/api.js`:

```jsx
import { customerAPI } from "../../services/api";

const fetchOrders = async () => {
  const response = await customerAPI.getOrders();
  setOrders(response.data.orders);
};
```

Available APIs:

- `authAPI` - login, signup, logout
- `customerAPI` - cart, orders, designs
- `designerAPI` - products, earnings
- `managerAPI` - production management
- `adminAPI` - system management
- `shopAPI` - product browsing
- `feedbackAPI` - customer feedback

### 4. Use Context Hooks

```jsx
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useFlash } from "../../context/FlashContext";
import { useTheme } from "../../context/ThemeContext";

const MyPage = () => {
  const { user, isCustomer } = useAuth();
  const { cart, addToCart } = useCart();
  const { success, error } = useFlash();
  const { isDark } = useTheme();
  // ...
};
```

### 5. Example Conversion

**EJS** (`views/customer/dashboard.ejs`):

```html
<h2>Welcome, <%= user.username %></h2>
<% if (orders.length === 0) { %>
<p>No orders</p>
<% } else { %> <% orders.forEach(order => { %>
<div>Order #<%= order._id %></div>
<% }); %> <% } %>
```

**React** (`src/pages/customer/Dashboard.jsx`):

```jsx
import { useState, useEffect } from "react";
import { customerAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const Dashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    customerAPI.getOrders().then((res) => setOrders(res.data.orders));
  }, []);

  return (
    <>
      <h2>Welcome, {user?.username}</h2>
      {orders.length === 0 ? (
        <p>No orders</p>
      ) : (
        orders.map((order) => <div key={order._id}>Order #{order._id}</div>)
      )}
    </>
  );
};

export default Dashboard;
```

## 🎯 Recommended Implementation Order

1. **Shop pages** (ShopIndex, ProductDetails) - Core browsing
2. **Customer Cart** - Shopping functionality
3. **Customer Checkout** - Purchase flow
4. **Customer Dashboard** - Order tracking
5. **Design Studio** - 3D customization
6. **Designer/Manager/Admin** - Role-specific features

## 🛠️ Common Patterns

### Form Handling

```jsx
const [formData, setFormData] = useState({ email: "", password: "" });
const [errors, setErrors] = useState({});

const handleChange = (e) => {
  setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
};

const handleSubmit = async (e) => {
  e.preventDefault();
  // Validate & submit
};
```

### Data Fetching

```jsx
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function fetch() {
    try {
      const res = await someAPI.getData();
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }
  fetch();
}, []);

if (loading) return <div>Loading...</div>;
```

### Flash Messages

```jsx
const { success, error } = useFlash();

try {
  await someAPI.action();
  success("Success!");
} catch (err) {
  error(err.message);
}
```

## 📁 Project Structure

```
src/
├── components/      ✅ Header, Footer, Layout, etc.
├── context/         ✅ Auth, Cart, Theme, Flash
├── pages/
│   ├── Home.jsx           ✅ Complete
│   ├── Login.jsx          ✅ Complete
│   ├── Signup.jsx         ✅ Complete
│   ├── NotFound.jsx       ✅ Complete
│   ├── shop/              ⚠️ 2 stubs
│   ├── customer/          ⚠️ 5 stubs
│   ├── designer/          ⚠️ 3 stubs
│   ├── manager/           ⚠️ 3 stubs
│   └── admin/             ⚠️ 6 stubs
├── services/        ✅ api.js (all endpoints)
├── styles/          ✅ styles.css, globals.css
├── utils/           ✅ validation, currency, logger
└── assets/          ✅ images, models
```

## 🔧 Environment Setup

Create `.env`:

```env
VITE_API_URL=http://localhost:3000
```

## 📦 Available Packages

- React 18 + Vite
- React Router v6
- Axios
- Bootstrap 5 (via CDN)
- Font Awesome (via CDN)
- Three.js + @react-three/fiber (for 3D)

## 🧪 Testing the App

```bash
# Development
npm run dev

# Build
npm run build

# Preview production
npm run preview
```

## 🚢 Deployment

1. Update `.env` with production API URL
2. Build: `npm run build`
3. Deploy `dist/` folder to Vercel/Netlify
4. Ensure backend supports CORS

## 📞 Common Issues

**Images not loading?**

```jsx
import image from "../assets/images/image.jpg";
<img src={image} alt="..." />;
```

**API calls failing?**

- Check backend is running
- Verify `.env` has correct URL
- Check CORS settings

**Routes not working?**

- All routes are configured in `App.jsx`
- Use `<Link to="/path">` not `<a href>`
- Protected routes check authentication

## ✨ Features Already Working

- ✅ Login/Signup with validation
- ✅ Session-based auth
- ✅ Role-based routing
- ✅ Dark/Light theme
- ✅ Flash messages
- ✅ Cart context
- ✅ Currency formatting (₹)
- ✅ Responsive Bootstrap UI

## 📊 Progress Tracking

- Infrastructure: 100% ✅
- Authentication: 100% ✅
- Public pages: 75% ✅
- Shop pages: 0% ⚠️
- Customer pages: 0% ⚠️
- Designer pages: 0% ⚠️
- Manager pages: 0% ⚠️
- Admin pages: 0% ⚠️

**Overall: ~25% Complete**

---

**Next Step**: Pick a page from the list above, locate its EJS file, and start converting! Follow the patterns in Login.jsx and Signup.jsx as examples.

The foundation is rock-solid. Now it's just systematic page-by-page conversion! 🚀
