# Order Workflow System - Complete Guide

## Overview

DesignDen implements **TWO DISTINCT WORKFLOWS** for order management:

1. **Shop Orders** (Ready-made Clothes) - Simplified workflow
2. **Custom Design Orders** - Extended workflow with designer involvement

---

## 🛒 Workflow 1: Shop Orders (Ready-Made Clothes)

### Flow Diagram

```
Customer → Manager → Delivery Boy → Customer
```

### Status Flow

```
pending
  ↓
assigned_to_manager
  ↓
ready_for_delivery
  ↓
out_for_delivery
  ↓
delivered
```

### Step-by-Step Process

#### 1. **Order Placement** (Customer)

- Customer adds ready-made products to cart
- Completes checkout process
- **Status**: `pending` → `assigned_to_manager` (automatic)
- **Notification**: Manager receives new order notification

#### 2. **Manager Receives Order**

- Manager views order in dashboard
- Verifies order details
- Prepares items for delivery
- **Action**: Assign to delivery boy
- **Endpoint**: `POST /manager/api/order/:id/assign-delivery`
- **Status**: `assigned_to_manager` → `ready_for_delivery`

#### 3. **Delivery Assignment**

- Manager assigns order to available delivery person
- **Notification**: Delivery person notified
- **Notification**: Customer notified (ready for delivery)

#### 4. **Delivery Pickup** (Delivery Person)

- Delivery person picks up order from manager
- **Action**: Mark as picked up
- **Endpoint**: `POST /delivery/api/order/:id/pickup`
- **Status**: `ready_for_delivery` → `out_for_delivery`
- **Notification**: Customer notified (out for delivery)

#### 5. **Delivery Completion** (Delivery Person)

- Delivery person delivers to customer
- **Action**: Mark as delivered
- **Endpoint**: `POST /delivery/api/order/:id/deliver`
- **Status**: `out_for_delivery` → `delivered`
- **Notification**: Customer notified (delivered)
- **Notification**: Manager notified (completed)

---

## 🎨 Workflow 2: Custom Design Orders

### Flow Diagram

```
Customer → Manager → Designer → Manager → Delivery Boy → Customer
```

### Status Flow

```
pending
  ↓
assigned_to_manager
  ↓
assigned_to_designer
  ↓
designer_accepted
  ↓
in_production
  ↓
production_completed
  ↓
ready_for_delivery
  ↓
out_for_delivery
  ↓
delivered
```

### Step-by-Step Process

#### 1. **Order Placement** (Customer)

- Customer creates custom design using 3D Design Studio
- Adds design to cart
- Completes checkout
- **Status**: `pending` → `assigned_to_manager` (automatic)
- **Notification**: Manager receives new custom order

#### 2. **Manager Receives Order**

- Manager reviews custom design requirements
- **Action**: Assign to designer
- **Endpoint**: `POST /manager/api/order/:id/assign-designer`
- **Status**: `assigned_to_manager` → `assigned_to_designer`
- **Notification**: Designer notified
- **Notification**: Customer notified (assigned to designer)

#### 3. **Designer Receives Assignment**

- Designer views order in dashboard
- Reviews design specifications
- **Action**: Accept order
- **Endpoint**: `POST /designer/api/order/:id/accept`
- **Status**: `assigned_to_designer` → `designer_accepted`
- **Progress**: 10%
- **Notification**: Manager notified (accepted)
- **Notification**: Customer notified (work starting)

#### 4. **Production Start** (Designer)

- Designer begins production
- **Action**: Start production
- **Endpoint**: `POST /designer/api/order/:id/start-production`
- **Status**: `designer_accepted` → `in_production`
- **Progress**: 30%
- **Notification**: Customer notified

#### 5. **Production Progress** (Designer)

- Designer updates progress periodically
- **Action**: Update progress
- **Endpoint**: `PUT /designer/api/order/:id/progress`
- **Body**: `{ progressPercentage: 50, note: "Half complete" }`
- **Progress**: Updates from 30% → 100%
- **Notification**: Customer notified at milestones (25%, 50%, 75%, 100%)

#### 6. **Production Completion** (Designer)

- Designer completes custom design
- **Action**: Complete production
- **Endpoint**: `POST /designer/api/order/:id/complete`
- **Status**: `in_production` → `production_completed`
- **Progress**: 100%
- **Notification**: Manager notified (ready for delivery assignment)
- **Notification**: Customer notified (production complete)

#### 7. **Delivery Assignment** (Manager)

- Manager assigns to delivery person
- **Action**: Assign to delivery
- **Endpoint**: `POST /manager/api/order/:id/assign-delivery`
- **Status**: `production_completed` → `ready_for_delivery`
- **Notification**: Delivery person notified
- **Notification**: Customer notified

#### 8. **Delivery Pickup** (Delivery Person)

- Delivery person picks up completed order
- **Action**: Mark as picked up
- **Endpoint**: `POST /delivery/api/order/:id/pickup`
- **Status**: `ready_for_delivery` → `out_for_delivery`
- **Notification**: Customer notified

#### 9. **Delivery Completion** (Delivery Person)

- Delivery person delivers to customer
- **Action**: Mark as delivered
- **Endpoint**: `POST /delivery/api/order/:id/deliver`
- **Status**: `out_for_delivery` → `delivered`
- **Notification**: Customer, Manager notified

---

## 📊 Complete Status Reference

| Status                 | Description                     | Applicable To | Next Action By                  |
| ---------------------- | ------------------------------- | ------------- | ------------------------------- |
| `pending`              | Order just placed               | Both          | System (auto-assign to manager) |
| `assigned_to_manager`  | Manager received order          | Both          | Manager                         |
| `assigned_to_designer` | Designer assigned (custom only) | Custom        | Designer                        |
| `designer_accepted`    | Designer accepted work          | Custom        | Designer                        |
| `in_production`        | Designer working                | Custom        | Designer                        |
| `production_completed` | Production finished             | Custom        | Manager                         |
| `ready_for_delivery`   | Assigned to delivery            | Both          | Delivery                        |
| `out_for_delivery`     | Delivery in progress            | Both          | Delivery                        |
| `delivered`            | Successfully delivered          | Both          | None (Complete)                 |
| `cancelled`            | Order cancelled                 | Both          | None                            |

---

## 🔐 Role-Based Access

### Customer

- **Can**:
  - Place orders (shop or custom)
  - View order tracking
  - See complete timeline
  - View assigned personnel
  - Cancel pending orders
- **Endpoints**:
  - `POST /customer/api/process-checkout` - Place order
  - `GET /customer/api/order/:id/tracking` - Track order
  - `GET /customer/api/orders` - List orders
  - `POST /customer/order/:id/cancel` - Cancel order

### Manager

- **Can**:
  - View all orders
  - Distinguish shop vs custom orders
  - Assign designers (custom orders only)
  - Assign delivery persons (both order types)
  - View order statistics
- **Endpoints**:
  - `GET /manager/api/orders` - List all orders
  - `POST /manager/api/order/:id/assign-designer` - Assign designer
  - `POST /manager/api/order/:id/assign-delivery` - Assign delivery
  - `GET /manager/api/designers` - List designers
  - `GET /manager/api/delivery-persons` - List delivery persons

### Designer

- **Can**:
  - View assigned orders
  - Accept orders
  - Start production
  - Update progress
  - Complete production
- **Endpoints**:
  - `GET /designer/api/orders` - List assigned orders
  - `POST /designer/api/order/:id/accept` - Accept order
  - `POST /designer/api/order/:id/start-production` - Start work
  - `PUT /designer/api/order/:id/progress` - Update progress
  - `POST /designer/api/order/:id/complete` - Complete work

### Delivery Person

- **Can**:
  - View assigned deliveries
  - Pickup orders
  - Mark as delivered
- **Endpoints**:
  - `GET /delivery/api/orders` - List assigned deliveries
  - `POST /delivery/api/order/:id/pickup` - Pickup order
  - `POST /delivery/api/order/:id/deliver` - Mark delivered

---

## 🔔 Notification System

Every workflow transition triggers notifications to relevant parties:

### Notification Triggers

| Event                | Notified Parties          |
| -------------------- | ------------------------- |
| Order placed         | Manager, Customer         |
| Designer assigned    | Designer, Customer        |
| Designer accepted    | Manager, Customer         |
| Production started   | Customer                  |
| Progress milestone   | Customer (every 25%)      |
| Production completed | Manager, Customer         |
| Delivery assigned    | Delivery person, Customer |
| Out for delivery     | Customer                  |
| Delivered            | Customer, Manager         |

---

## 📱 Customer Tracking Experience

Customers can track their orders with:

1. **Visual Timeline**

   - Shows all steps in workflow
   - Current status highlighted
   - Completed steps marked with checkmarks

2. **Progress Percentage** (Custom orders only)

   - Real-time production progress
   - Updated by designer

3. **Assigned Personnel**

   - Manager name
   - Designer name (if custom)
   - Delivery person name

4. **Timeline History**

   - Complete chronological history
   - Timestamp for each event
   - Notes from staff

5. **Estimated Delivery**
   - Based on current status
   - Realistic time estimates

---

## 🚀 Redux Integration

All workflow actions are available through Redux:

```javascript
import { useDispatch } from "react-redux";
import {
  // Manager actions
  assignOrderToDesigner,
  assignOrderToDelivery,

  // Designer actions
  acceptOrder,
  startProduction,
  updateProgress,
  completeProduction,

  // Delivery actions
  pickupOrder,
  deliverOrder,

  // Tracking
  fetchOrderTracking,
} from "../store/slices/ordersSlice";

// Example: Manager assigns designer
dispatch(assignOrderToDesigner({ orderId, designerId }));

// Example: Designer updates progress
dispatch(
  updateProgress({ orderId, progressPercentage: 75, note: "Almost done" })
);

// Example: Customer tracks order
dispatch(fetchOrderTracking(orderId));
```

---

## 🧪 Testing the Workflows

### Test Shop Order Workflow

```bash
# 1. Login as customer
# 2. Add ready-made products to cart
# 3. Complete checkout
# 4. Login as manager
# 5. Assign to delivery person
# 6. Login as delivery person
# 7. Pickup order
# 8. Deliver order
```

### Test Custom Order Workflow

```bash
# 1. Login as customer
# 2. Use Design Studio to create custom design
# 3. Add to cart and checkout
# 4. Login as manager
# 5. Assign to designer
# 6. Login as designer
# 7. Accept order
# 8. Start production
# 9. Update progress (multiple times)
# 10. Complete production
# 11. Login as manager
# 12. Assign to delivery person
# 13. Login as delivery person
# 14. Pickup order
# 15. Deliver order
```

---

## 📋 Database Schema Updates

### Order Schema Fields

```javascript
{
  // Status tracking
  status: String, // See status reference above

  // Personnel assignments
  managerId: ObjectId,
  designerId: ObjectId, // Custom orders only
  deliveryPersonId: ObjectId,

  // Timestamps
  managerAssignedAt: Date,
  designerAssignedAt: Date,
  designerAcceptedAt: Date,
  deliveryAssignedAt: Date,
  productionCompletedAt: Date,

  // Progress tracking
  progressPercentage: Number, // 0-100 for custom orders

  // Timeline
  timeline: [{
    status: String,
    note: String,
    at: Date
  }]
}
```

---

## ✅ Implementation Checklist

- [x] Backend endpoints for both workflows
- [x] Status enum updated with all states
- [x] Auto-assignment to manager on order creation
- [x] Manager assignment endpoints (designer/delivery)
- [x] Designer workflow endpoints (accept/start/progress/complete)
- [x] Delivery workflow endpoints (pickup/deliver)
- [x] Notification system for all transitions
- [x] Redux actions for all workflow steps
- [x] Customer tracking component with visual timeline
- [x] Progress tracking for custom orders
- [x] Timeline history display
- [x] Role-based access control

---

## 🎯 Key Features

1. **Automatic Manager Assignment**: Orders automatically assigned to first available manager
2. **Order Type Detection**: System automatically detects shop vs custom orders
3. **Progress Tracking**: Real-time progress updates for custom orders (0-100%)
4. **Comprehensive Notifications**: All parties notified at each step
5. **Timeline History**: Complete audit trail of order journey
6. **Visual Tracking**: Customer-friendly visual timeline with icons
7. **Personnel Visibility**: Customers can see who's handling their order
8. **Status Validation**: Prevents invalid status transitions

---

## 📞 Support

For questions about the workflow system, contact:

- Technical Lead: developer@designden.com
- Manager Support: manager@designden.com

---

**Last Updated**: December 2025
**Version**: 2.0 - Complete Dual Workflow Implementation
