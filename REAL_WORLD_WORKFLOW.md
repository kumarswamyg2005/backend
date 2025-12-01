# Real-World E-Commerce Workflow Implementation

## Flipkart/Ekart Style Delivery & Order Management

### Overview

This project implements a complete real-world e-commerce workflow with two main flows:

1. **Readymade Products** - Shop → Manager → Delivery → Customer
2. **Custom Designs** - Design Studio → Manager → Designer → Production → Manager → Delivery → Customer

---

## 🛒 Readymade Products Workflow

### Customer Flow

1. Browse products in `/shop`
2. Add to cart and checkout
3. Order created with status `pending`
4. Order automatically assigned to manager
5. Track order at `/customer/tracking/:orderId`

### Manager Flow (`/manager/dashboard`)

1. View pending readymade orders
2. Assign delivery partner with ratings
3. Optionally set delivery slot (morning/afternoon/evening)
4. Order status updates to `ready_for_delivery`

### Delivery Partner Flow (`/delivery/dashboard`)

1. View assigned orders with priority
2. **Pickup from warehouse** - Generates OTP for customer
3. **Mark In Transit** - Updates location
4. **Out for Delivery** - Final leg
5. **Deliver with OTP** - Customer provides OTP for verification

### Customer Verification

1. Receives OTP notification when order is out for delivery
2. Shows OTP to delivery partner
3. Delivery partner verifies OTP to complete delivery
4. Order marked as `delivered`

---

## 🎨 Custom Design Workflow

### Customer Flow

1. Use Design Studio at `/customer/design-studio`
2. Customize clothing with graphics, colors, text
3. Order the custom design
4. Track progress at `/customer/tracking/:orderId`
5. Chat with designer for updates

### Manager Flow

1. View pending custom orders
2. Assign to available designer
3. Monitor production progress
4. Assign delivery partner when production complete

### Designer Flow (`/designer/dashboard`)

1. View assigned orders
2. **Accept Order** - Confirm taking the work
3. **Start Production** - Begin working
4. **Update Progress** - Select milestones or set percentage
   - Design Review (10%)
   - Material Selection (25%)
   - Pattern Making (40%)
   - Fabric Cutting (55%)
   - Stitching (70%)
   - Quality Check (85%)
   - Final Touches (95%)
   - Ready for Delivery (100%)
5. **Chat with Customer** - Share updates, images, get feedback
6. **Complete Production** - Send to manager

### Production Milestones

| Milestone          | Percentage | Description              |
| ------------------ | ---------- | ------------------------ |
| Design Review      | 10%        | Reviewing specifications |
| Material Selection | 25%        | Selecting premium fabric |
| Pattern Making     | 40%        | Creating design pattern  |
| Fabric Cutting     | 55%        | Cutting fabric pieces    |
| Stitching          | 70%        | Assembly work            |
| Quality Check      | 85%        | Inspection               |
| Final Touches      | 95%        | Finishing details        |
| Ready              | 100%       | Complete                 |

---

## 📱 Key Features

### Real-Time Tracking

- Visual timeline like Flipkart
- Live location updates (simulated)
- Estimated delivery time
- Current status with icons

### OTP Verification (Like Flipkart)

- 4-digit OTP generated when order is out for delivery
- Displayed to customer in tracking page
- Delivery partner must enter OTP to complete
- Prevents unauthorized deliveries

### Delivery Slots

- Morning (9 AM - 12 PM)
- Afternoon (12 PM - 5 PM)
- Evening (5 PM - 9 PM)
- Customer can select preferred slot
- Reschedule option available

### Chat System (Custom Orders)

- Real-time messaging between customer and designer
- Progress updates sent as chat messages
- Quick action buttons for common messages
- File/image sharing for design proofs

### Delivery Partner Stats

- Today's earnings
- Total deliveries
- Rating (5-star system)
- Pending queue count

---

## 🔐 User Roles & Access

| Role     | Dashboard             | Key Actions                      |
| -------- | --------------------- | -------------------------------- |
| Customer | `/customer/dashboard` | View orders, track, chat         |
| Designer | `/designer/dashboard` | Accept, produce, update progress |
| Manager  | `/manager/dashboard`  | Assign designers & delivery      |
| Delivery | `/delivery/dashboard` | Pickup, transit, deliver         |
| Admin    | `/admin/dashboard`    | View all, analytics              |

---

## 📊 Order Status Flow

### Readymade Products

```
pending → assigned_to_manager → ready_for_delivery → out_for_delivery → delivered
```

### Custom Designs

```
pending → assigned_to_manager → assigned_to_designer → designer_accepted →
in_production → production_completed → ready_for_delivery → out_for_delivery → delivered
```

---

## 🧪 Demo Credentials

```
Customer: customer1@test.com / password123
Designer: designer1@test.com / password123
Manager: manager1@test.com / password123
Delivery: delivery1@test.com / password123
Admin: admin@test.com / password123
```

---

## 🎯 Evaluator Demonstration Points

1. **Complete Order Flow** - Place order → Track all stages → Verify delivery
2. **OTP Verification** - Shows real-world delivery security
3. **Chat System** - Customer-designer communication
4. **Progress Tracking** - Visual milestones for custom orders
5. **Role-Based Dashboards** - Each role has specialized features
6. **Real-Time Updates** - Status changes reflect immediately
7. **Delivery Slots** - Time preference like Flipkart
8. **Rating System** - Delivery partner ratings

---

## 📁 Key Files

### Backend (server.cjs)

- Order Schema with OTP, delivery slots, live location
- DeliveryPartner Schema for logistics
- ChatMessage Schema for communication
- 30+ API endpoints for real-world workflow

### Frontend Pages

- `/src/pages/customer/OrderTracking.jsx` - Flipkart-like tracking
- `/src/pages/delivery/Dashboard.jsx` - Delivery partner experience
- `/src/pages/designer/Dashboard.jsx` - Production with chat
- `/src/pages/manager/Dashboard.jsx` - Assignment workflow

### Redux Store

- `/src/store/slices/ordersSlice.js` - Complete workflow state management

---

## 🚀 Running the Project

```bash
# Start backend
node server.cjs

# Start frontend
npm run dev
```

Access at: http://localhost:5174

---

_Implemented with ❤️ for DesignDen E-Commerce Platform_
