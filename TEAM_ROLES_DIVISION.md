# DesignDen - Team Roles & Responsibilities Division

## Project Overview

**DesignDen** - Custom Clothing E-commerce Platform with Design Studio

---

## 👥 TEAM MEMBER 1: Authentication & Customer Shopping Module

### **Role: Customer Experience Lead**

### Frontend Files (React):

```
src/pages/
├── Home.jsx                    # Landing page
├── Login.jsx                   # Login page
├── Signup.jsx                  # Registration page
└── shop/
    ├── ShopIndex.jsx           # Product listing with filters
    ├── ProductDetails.jsx      # Single product view
    └── Model3DShowcase.jsx     # 3D model display

src/context/
├── AuthContext.jsx             # Authentication state management
└── ThemeContext.jsx            # Theme management

src/components/
├── Header.jsx                  # Navigation header
├── Footer.jsx                  # Footer component
├── Layout.jsx                  # Main layout wrapper
└── ProtectedRoute.jsx          # Route protection
```

### Backend APIs (server.cjs - Lines):

| API Endpoint                            | Line | Purpose            |
| --------------------------------------- | ---- | ------------------ |
| `POST /api/auth/login`                  | 550  | User login         |
| `POST /api/auth/signup`                 | 603  | User registration  |
| `GET /api/auth/session`                 | 659  | Check session      |
| `POST /api/auth/logout`                 | 667  | User logout        |
| `GET /api/shop/products`                | 677  | List all products  |
| `GET /api/shop/products/:id`            | 734  | Get single product |
| `GET /api/shop/featured`                | 749  | Featured products  |
| `GET /api/products/:productId/reviews`  | 761  | Product reviews    |
| `POST /api/products/:productId/reviews` | 902  | Add review         |

### Database Schemas:

- `userSchema` (Line 18-37)
- `productSchema` (Line 41-56)
- `reviewSchema` (Line 69-83)

### Key Features to Explain:

1. **User Authentication** - Login/Signup with session management
2. **Product Catalog** - Browse products with filters (gender, size, price)
3. **Product Reviews** - View and add product reviews
4. **Protected Routes** - Role-based access control

---

## 👥 TEAM MEMBER 2: Customer Dashboard & Order Module

### **Role: Customer Orders Lead**

### Frontend Files (React):

```
src/pages/customer/
├── Dashboard.jsx               # Customer home dashboard
├── Cart.jsx                    # Shopping cart
├── Checkout.jsx                # Checkout process
├── OrderDetails.jsx            # Order details view
├── OrderTracking.jsx           # Track order status
├── TrackOrder.jsx              # Order tracking page
├── Wishlist.jsx                # Wishlist management
└── DesignStudio.jsx            # Custom design creator

src/context/
├── CartContext.jsx             # Cart state management
└── FlashContext.jsx            # Flash messages

src/components/
├── PaymentModal.jsx            # Payment processing
└── FlashMessages.jsx           # Notification system

src/hooks/
└── useCartAnimation.js         # Cart animation hook
```

### Backend APIs (server.cjs - Lines):

| API Endpoint                           | Line | Purpose                 |
| -------------------------------------- | ---- | ----------------------- |
| `GET /customer/dashboard`              | 2598 | Customer dashboard data |
| `GET /customer/api/orders`             | 2631 | List customer orders    |
| `GET /customer/order/:id`              | 2651 | Order details           |
| `POST /customer/order/:id/cancel`      | 1282 | Cancel order            |
| `GET /api/customer/cart`               | 2845 | Get cart                |
| `POST /api/customer/cart`              | 2882 | Add to cart             |
| `PUT /api/customer/cart/:itemId`       | 2980 | Update cart item        |
| `DELETE /api/customer/cart/:itemId`    | 3047 | Remove from cart        |
| `GET /api/customer/addresses`          | 3089 | Get addresses           |
| `POST /api/customer/addresses`         | 3111 | Add address             |
| `POST /customer/api/process-checkout`  | 3300 | Process checkout        |
| `POST /customer/save-design`           | 2709 | Save custom design      |
| `GET /customer/designs`                | 2729 | Get saved designs       |
| `GET /customer/api/order/:id/tracking` | 3991 | Order tracking          |
| `GET /customer/wishlist/list`          | 2806 | Get wishlist            |
| `POST /customer/wishlist/add`          | 2772 | Add to wishlist         |

### Database Schemas:

- `orderSchema` (Line 86-148)
- `cartSchema` (Line 163-178)
- `designSchema` (Line 180-200)
- `wishlistSchema` (Line 202-214)

### Key Features to Explain:

1. **Shopping Cart** - Add/remove items, quantity management
2. **Checkout Process** - Address selection, payment, order creation
3. **Order Tracking** - Real-time order status with OTP verification
4. **Design Studio** - Custom clothing design with graphics
5. **Wishlist** - Save favorite products

---

## 👥 TEAM MEMBER 3: Manager Dashboard Module

### **Role: Manager Operations Lead**

### Frontend Files (React):

```
src/pages/manager/
├── Dashboard.jsx               # Manager main dashboard
├── OrderDetails.jsx            # Order management view
├── Pending.jsx                 # Pending orders
├── StockManagement.jsx         # Product stock management
└── ManagerDashboard.css        # Manager styles
```

### Backend APIs (server.cjs - Lines):

| API Endpoint                                  | Line | Purpose                    |
| --------------------------------------------- | ---- | -------------------------- |
| `GET /manager/dashboard`                      | 1803 | Manager dashboard stats    |
| `GET /manager/api/orders`                     | 1850 | All orders for manager     |
| `GET /manager/order/:id`                      | 1895 | Single order details       |
| `PUT /manager/order/:id/status`               | 1927 | Update order status        |
| `POST /manager/order/:id/assign`              | 1954 | Assign order               |
| `POST /manager/api/order/:id/assign-designer` | 3536 | Assign to designer         |
| `POST /manager/api/order/:id/assign-delivery` | 3620 | Assign to delivery         |
| `POST /manager/api/order/:id/ship`            | 4403 | Ship order (generates OTP) |
| `GET /manager/api/delivery-persons`           | 4068 | List delivery persons      |
| `GET /manager/api/designers`                  | 4086 | List designers             |
| `GET /manager/api/products`                   | 4104 | Products for stock mgmt    |
| `PUT /manager/api/product/:id/stock`          | 4128 | Update stock               |
| `POST /manager/api/product`                   | 4159 | Add new product            |
| `DELETE /manager/api/product/:id`             | 4214 | Delete product             |

### Key Features to Explain:

1. **Order Management** - View and manage all orders
2. **Designer Assignment** - Assign orders to designers
3. **Delivery Assignment** - Assign orders to delivery persons
4. **Stock Management** - CRUD operations on products
5. **OTP Generation** - Generate delivery OTP when shipping

### Order Flow Responsibility:

```
New Order → Assign Designer → Designer Completes → Mark Ready → Assign Delivery → Ship
```

---

## 👥 TEAM MEMBER 4: Designer Dashboard Module

### **Role: Designer Workflow Lead**

### Frontend Files (React):

```
src/pages/designer/
├── Dashboard.jsx               # Designer main dashboard
├── OrderDetails.jsx            # Design order view
├── Products.jsx                # Designer's products
└── DesignerDashboard.css       # Designer styles

src/utils/
├── clothingModels.js           # 3D model configurations
└── currency.js                 # Currency formatting

src/components/
└── ModelViewer.jsx             # 3D model viewer component
```

### Backend APIs (server.cjs - Lines):

| API Endpoint                                    | Line | Purpose                     |
| ----------------------------------------------- | ---- | --------------------------- |
| `GET /designer/dashboard`                       | 1421 | Designer dashboard stats    |
| `GET /designer/api/orders`                      | 1514 | Orders assigned to designer |
| `GET /designer/order/:id`                       | 1474 | Single order details        |
| `PUT /designer/order/:id/status`                | 2163 | Update design status        |
| `POST /designer/api/order/:id/accept`           | 3711 | Accept order                |
| `POST /designer/api/order/:id/start-production` | 3790 | Start production            |
| `PUT /designer/api/order/:id/progress`          | 3849 | Update progress %           |
| `POST /designer/api/order/:id/complete`         | 3910 | Complete design             |
| `GET /api/designer/products`                    | 1556 | Designer's products         |
| `PUT /api/designer/products/:id/stock`          | 1673 | Update stock                |
| `GET /api/graphics/all`                         | 1698 | All available graphics      |
| `GET /api/graphics/available`                   | 1789 | Active graphics             |

### Database Schemas:

- `graphicSchema` (for design graphics)
- Order status flow for designer

### Key Features to Explain:

1. **Order Queue** - View assigned orders
2. **Accept Orders** - Accept or reject design orders
3. **Production Tracking** - Start production, update progress
4. **Complete Design** - Mark designs as complete
5. **Graphics Library** - Manage design graphics/templates

### Designer Workflow:

```
Order Assigned → Accept → Start Production → Update Progress (0-100%) → Complete → Ready for Pickup
```

---

## 👥 TEAM MEMBER 5: Admin & Delivery Dashboard Module

### **Role: Admin & Delivery Lead**

### Frontend Files (React):

```
src/pages/admin/
├── Dashboard.jsx               # Admin main dashboard
├── Orders.jsx                  # All orders view
├── OrderDetails.jsx            # Order details
├── Products.jsx                # Product management
├── Feedbacks.jsx               # Customer feedbacks
├── PendingManagers.jsx         # Pending manager approvals
└── Analytics.jsx               # Analytics dashboard

src/pages/delivery/
├── Dashboard.jsx               # Delivery person dashboard
└── DeliveryDashboard.css       # Delivery styles
```

### Backend APIs - ADMIN (server.cjs - Lines):

| API Endpoint                        | Line | Purpose               |
| ----------------------------------- | ---- | --------------------- |
| `GET /admin/dashboard`              | 1091 | Admin dashboard stats |
| `GET /admin/api/orders`             | 1140 | All orders            |
| `GET /admin/order/:id`              | 1164 | Single order          |
| `PUT /admin/order/:id/status`       | 1193 | Update status         |
| `GET /admin/feedbacks`              | 1226 | Customer feedbacks    |
| `GET /admin/api/users`              | 4238 | All users list        |
| `GET /admin/api/products`           | 4264 | All products          |
| `GET /admin/api/user-stats`         | 4283 | User statistics       |
| `GET /api/admin/products`           | 1050 | Products management   |
| `PUT /api/admin/products/:id/stock` | 1063 | Update stock          |

### Backend APIs - DELIVERY (server.cjs - Lines):

| API Endpoint                                    | Line | Purpose             |
| ----------------------------------------------- | ---- | ------------------- |
| `GET /delivery/dashboard`                       | 2363 | Delivery dashboard  |
| `GET /delivery/api/orders`                      | 5289 | Assigned deliveries |
| `GET /delivery/api/statistics`                  | 5327 | Delivery stats      |
| `POST /delivery/api/order/:id/pickup`           | 4543 | Pickup order        |
| `PUT /delivery/api/order/:id/location`          | 4612 | Update location     |
| `POST /delivery/api/order/:id/in-transit`       | 4649 | Mark in transit     |
| `POST /delivery/api/order/:id/out-for-delivery` | 4684 | Out for delivery    |
| `POST /delivery/api/order/:id/deliver`          | 4726 | Complete with OTP   |

### Key Features to Explain:

1. **Admin Dashboard** - Overview of all system data
2. **User Management** - View all customers, managers, designers, delivery
3. **Feedback System** - View customer feedbacks
4. **Delivery Workflow** - Pickup → In Transit → Out for Delivery → Deliver
5. **OTP Verification** - Verify OTP from customer to complete delivery

### Delivery Workflow:

```
Assigned → Pickup → In Transit → Out for Delivery → Customer gives OTP → Delivered
```

---

## 📊 SHARED COMPONENTS & UTILITIES

### All Members Should Know:

```
src/services/
└── api.js                      # API client (Axios config)

src/styles/
├── globals.css                 # Global styles
├── styles.css                  # Common styles
└── cartAnimation.css           # Cart animations

src/utils/
├── validation.js               # Form validation
├── currency.js                 # Currency formatting (₹)
└── logger.js                   # Logging utility
```

### Database Connection (Line 488-531 in server.cjs):

- MongoDB connection with Mongoose
- Session management with express-session

---

## 🔄 COMPLETE ORDER FLOW

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  CUSTOMER   │────▶│   MANAGER   │────▶│  DESIGNER   │────▶│   MANAGER   │────▶│  DELIVERY   │
│  (Member 2) │     │  (Member 3) │     │  (Member 4) │     │  (Member 3) │     │  (Member 5) │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
     │                    │                   │                   │                   │
     ▼                    ▼                   ▼                   ▼                   ▼
 Places Order      Assigns Designer    Creates Design      Assigns Delivery    Delivers with OTP
```

---

## 📁 FILE SUMMARY BY MEMBER

| Member                   | Frontend Files | Backend API Count | Key Schemas                   |
| ------------------------ | -------------- | ----------------- | ----------------------------- |
| **1 - Auth & Shop**      | 10 files       | 9 APIs            | User, Product, Review         |
| **2 - Customer**         | 12 files       | 16 APIs           | Order, Cart, Design, Wishlist |
| **3 - Manager**          | 4 files        | 14 APIs           | Order management              |
| **4 - Designer**         | 4 files        | 8 APIs            | Graphics, Design flow         |
| **5 - Admin & Delivery** | 8 files        | 16 APIs           | Feedback, Delivery            |

---

## 🔑 LOGIN CREDENTIALS FOR TESTING

| Role     | Email                   | Password    |
| -------- | ----------------------- | ----------- |
| Admin    | admin@designden.com     | admin123    |
| Manager  | manager@designden.com   | manager123  |
| Designer | designer1@designden.com | designer123 |
| Delivery | delivery1@designden.com | delivery123 |
| Customer | customer1@designden.com | customer123 |

---

## 🚀 HOW TO RUN

```bash
# Terminal 1 - Start MongoDB
mongod

# Terminal 2 - Start Backend
cd design-den-react
node server.cjs

# Terminal 3 - Start Frontend
cd design-den-react
npm run dev
```

**Backend runs on:** http://localhost:5174
**Frontend runs on:** http://localhost:5173

---

## 📝 EVALUATION TIPS

1. **Each member** should be able to explain their module's flow
2. **Demo** the complete order flow from customer to delivery
3. **Show** the database schemas you're responsible for
4. **Explain** the API endpoints and their purpose
5. **Know** how your module connects with others

Good luck with your evaluation! 🎉
