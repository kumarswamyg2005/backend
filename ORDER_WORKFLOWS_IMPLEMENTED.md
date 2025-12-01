# ✅ Complete Order Workflows Implementation

## 🔄 Two Different Order Flows

### Quick Reference

| Feature                | Shop Orders                                      | Custom Design Orders                                                                    |
| ---------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| **Product Type**       | Ready-made from inventory                        | 3D designed, needs production                                                           |
| **Designer Involved?** | ❌ NO                                            | ✅ YES                                                                                  |
| **Detection**          | `item.productId !== null`                        | `item.productId === null`                                                               |
| **Status Flow**        | pending → shipped → out_for_delivery → delivered | pending → assigned → in_production → completed → shipped → out_for_delivery → delivered |
| **Timeline**           | ~Same day                                        | 3-7 days                                                                                |

---

## 📦 WORKFLOW 1: SHOP ORDERS (Ready-Made)

### Status Flow

```
pending → shipped → out_for_delivery → delivered
```

### Step-by-Step Process

1. **Customer Orders** (`pending`)

   - Browse `/shop`
   - Add products to cart
   - Checkout via `/customer/api/process-checkout`
   - Order created with `items[].productId` set (not null)

2. **Manager Assigns Delivery** (`shipped`)

   - Manager views order in dashboard
   - Calls `POST /manager/order/:id/assign-delivery`
   - Status changes to `shipped`
   - Notifications sent to customer and delivery person

3. **Delivery Boy Picks Up** (`out_for_delivery`)

   - Delivery person views at `/delivery/dashboard`
   - Picks up from manager's warehouse
   - Calls `POST /delivery/order/:id/update-status` with status: `out_for_delivery`
   - Customer notified

4. **Delivery Boy Delivers** (`delivered`)
   - Calls `POST /delivery/order/:id/update-status` with status: `delivered`
   - Customer, manager, and designer notified
   - Payment marked as completed

---

## 🎨 WORKFLOW 2: CUSTOM DESIGN ORDERS

### Status Flow

```
pending → assigned → in_production → completed → shipped → out_for_delivery → delivered
```

### Step-by-Step Process

1. **Customer Creates Design** (`pending`)

   - Create 3D design at `/customer/design-studio`
   - Save design to database
   - Place order (creates order with `items[].productId = null`)
   - Order status: `pending`

2. **Manager Assigns Designer** (`assigned`)

   - Manager calls `POST /manager/order/:id/assign`
   - **RESTRICTION**: Only `designer@designden.com` can be assigned
   - Status changes to `assigned`
   - Notifications to designer and customer

3. **Designer Starts Production** (`in_production`)

   - Designer calls `POST /designer/order/:id/start-production`
   - Status changes to `in_production`
   - Customer notified production has started

4. **Designer Marks Ready** (`completed`)

   - Designer completes work
   - Calls `POST /designer/order/:id/mark-ready`
   - Status changes to `completed`
   - Notifications to all managers and customer
   - Designer sends physical product to manager

5. **Manager Assigns Delivery** (`shipped`)

   - Manager receives completed product from designer
   - Calls `POST /manager/order/:id/assign-delivery`
   - Status changes to `shipped`
   - Notifications to customer, designer, and delivery person

6. **Delivery Boy Picks Up** (`out_for_delivery`)

   - Delivery person picks up from manager
   - Calls `POST /delivery/order/:id/update-status` with status: `out_for_delivery`
   - Customer notified

7. **Delivery Boy Delivers** (`delivered`)
   - Calls `POST /delivery/order/:id/update-status` with status: `delivered`
   - Customer, manager, and designer notified
   - Payment marked as completed

---

## 🔧 Backend Implementation Details

### Order Schema Helper Methods

```javascript
orderSchema.methods.isCustomOrder = async function () {
  return this.items.some((item) => !item.productId);
};

orderSchema.methods.isShopOrder = async function () {
  return this.items.every((item) => item.productId);
};
```

### API Endpoints Implemented

#### Manager Endpoints

- `POST /manager/order/:id/assign` - Assign designer (custom orders only)
- `POST /manager/order/:id/assign-delivery` - Assign delivery person (both types)

#### Designer Endpoints

- `POST /designer/order/:id/start-production` - Start working on custom design
- `POST /designer/order/:id/mark-ready` - Mark custom order as completed
- `GET /designer/dashboard` - View assigned custom orders

#### Delivery Endpoints

- `GET /delivery/dashboard` - View assigned deliveries
- `GET /delivery/orders` - List all assigned orders
- `GET /delivery/order/:id` - View specific order details
- `POST /delivery/order/:id/update-status` - Update delivery status

### Status Validations

**Custom Orders:**

- `pending` → Can assign designer
- `assigned` → Can start production
- `in_production` → Can mark as ready/completed
- `completed` → Can assign delivery
- `shipped` → Can mark out for delivery
- `out_for_delivery` → Can mark delivered

**Shop Orders:**

- `pending` → Can assign delivery directly
- `shipped` → Can mark out for delivery
- `out_for_delivery` → Can mark delivered

### Notifications Created

**Custom Order Flow:**

- Designer assigned → Customer & Designer notified
- Production started → Customer notified
- Production completed → Customer & All Managers notified
- Delivery assigned → Customer & Designer notified
- Out for delivery → Customer notified
- Delivered → Customer, All Managers & Designer notified

**Shop Order Flow:**

- Delivery assigned → Customer notified
- Out for delivery → Customer notified
- Delivered → Customer & All Managers notified

---

## 🎯 Key Differences

| Aspect                     | Shop Orders                     | Custom Orders                            |
| -------------------------- | ------------------------------- | ---------------------------------------- |
| **Manager's First Action** | Assign delivery                 | Assign designer                          |
| **Production Time**        | Instant (in stock)              | 3-7 days                                 |
| **Designer Role**          | None                            | Creates product                          |
| **Status Count**           | 4 statuses                      | 7 statuses                               |
| **Complexity**             | Simple                          | Complex                                  |
| **Physical Flow**          | Warehouse → Delivery → Customer | Designer → Manager → Delivery → Customer |

---

## ✅ Implementation Complete

All endpoints, status transitions, notifications, and workflows are now fully implemented and ready for use!
