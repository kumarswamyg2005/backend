# DesignDen - Key Features & Implementation Logic

---

## 1. 3D Model Viewer

### What We Used

- **Three.js** - JavaScript 3D library for rendering
- **@react-three/fiber** - React renderer for Three.js
- **@react-three/drei** - Helper components (OrbitControls, useGLTF)
- **GLB Files** - 3D model format (compressed GLTF)

### Logic Behind It

**Problem:** Users want to see how clothes look before buying, especially for custom designs.

**Solution:** Load 3D clothing models that users can rotate, zoom, and change colors in real-time.

**How It Works:**

1. **Loading the Model**

   - We store `.glb` 3D model files in `/public/models/`
   - Each clothing category has a model (tshirt_men.glb, hoodie_women.glb, etc.)
   - `useGLTF` hook loads the model asynchronously

2. **Rendering with Three.js**

   - `<Canvas>` creates a WebGL context
   - `<ambientLight>` and `<directionalLight>` illuminate the model
   - `<primitive object={scene}>` renders the loaded 3D model

3. **User Interaction**

   - `<OrbitControls>` allows drag-to-rotate and scroll-to-zoom
   - User can view the model from any angle

4. **Color Changing**
   - When user selects a color, we traverse all mesh children
   - Update `material.color` property with the new color
   - Three.js re-renders automatically

```
User selects color → React state updates → useEffect triggers →
Model material color changes → Canvas re-renders
```

---

## 2. OTP Verification for Delivery

### What We Used

- **Math.random()** - Generate 4-digit random number
- **MongoDB** - Store OTP with order
- **Express Session** - Verify delivery person identity

### Logic Behind It

**Problem:** How to confirm the right person received the order? Delivery person could mark "delivered" without actually delivering.

**Solution:** Generate OTP when delivery starts, show to customer, delivery person must enter it to complete.

**How It Works:**

1. **OTP Generation (When Picked Up)**

   ```
   Delivery person clicks "Pick Up" →
   Backend generates: Math.floor(1000 + Math.random() * 9000) →
   Saves to order.deliveryOTP →
   Order status changes to "out_for_delivery"
   ```

2. **Customer Sees OTP**

   ```
   Customer opens Order Details →
   If status === "out_for_delivery" →
   Display OTP in a highlighted box →
   Customer tells OTP to delivery person
   ```

3. **Verification (When Delivered)**
   ```
   Delivery person enters OTP →
   Backend compares: enteredOTP === order.deliveryOTP →
   If match: status = "delivered", deliveredAt = now →
   If wrong: Show error, don't complete delivery
   ```

**Why 4 Digits?**

- Easy for customer to remember and tell
- 9000 possible combinations (1000-9999) - hard to guess
- Simple to enter on mobile

---

## 3. Custom Design Studio

### What We Used

- **React useState** - Track user selections
- **3D Model Viewer** - Show live preview
- **Dynamic Pricing** - Calculate based on selections

### Logic Behind It

**Problem:** Users want to design their own clothes with specific colors, fabrics, and graphics.

**Solution:** Step-by-step design builder with real-time 3D preview.

**How It Works:**

1. **Selection State**

   ```javascript
   const [design, setDesign] = useState({
     category: "", // T-Shirt, Hoodie, etc.
     gender: "", // Men, Women, Unisex
     color: "#ffffff", // Hex color
     fabric: "", // Cotton, Silk, etc.
     pattern: "", // Solid, Striped, etc.
     graphic: null, // Selected graphic image
   });
   ```

2. **Model Loading Based on Selection**

   ```
   User selects "T-Shirt" + "Men" →
   modelPath = "/models/tshirt_men.glb" →
   3D viewer loads this model
   ```

3. **Live Color Preview**

   ```
   User picks color from color picker →
   setDesign({ ...design, color: newColor }) →
   3D model color updates instantly
   ```

4. **Price Calculation**

   ```javascript
   const calculatePrice = () => {
     let price = basePrice[category]; // Base: ₹500
     price += fabricPrices[fabric]; // Cotton: +₹100
     price += patternPrices[pattern]; // Striped: +₹50
     if (graphic) price += 200; // Graphic: +₹200
     return price;
   };
   ```

5. **Add to Cart**
   ```
   User clicks "Add to Cart" →
   Save design details to cart item →
   Mark as isCustomOrder: true →
   Goes through designer workflow
   ```

---

## 4. Role-Based Dashboard Access

### What We Used

- **React Context** - Share user data globally
- **React Router** - Protected routes
- **Express Session** - Server-side role verification

### Logic Behind It

**Problem:** Different users need different features. Customer shouldn't access admin pages.

**Solution:** Check user role before showing any page.

**How It Works:**

1. **Login Sets Role**

   ```
   User logs in → Backend returns { role: 'customer' } →
   Stored in AuthContext → Available everywhere
   ```

2. **ProtectedRoute Component**

   ```
   User tries to access /admin/dashboard →
   ProtectedRoute checks: user.role === 'admin'? →
   If yes: Show page →
   If no: Redirect to unauthorized
   ```

3. **Navigation Shows Role-Specific Links**

   ```javascript
   {
     user.role === "admin" && <Link to="/admin">Admin Panel</Link>;
   }
   {
     user.role === "customer" && <Link to="/cart">My Cart</Link>;
   }
   ```

4. **Backend Also Verifies**
   ```
   Even if someone bypasses frontend →
   API checks session.user.role →
   Returns 403 Forbidden if wrong role
   ```

---

## 5. Order Tracking Timeline

### What We Used

- **CSS Flexbox** - Horizontal timeline layout
- **Array.indexOf()** - Find current step position
- **Conditional Styling** - Green for completed steps

### Logic Behind It

**Problem:** Customer wants to know where their order is in the process.

**Solution:** Visual timeline showing all steps with current status highlighted.

**How It Works:**

1. **Define Workflow Steps**

   ```javascript
   // Different workflows for different order types
   const shopSteps = [
     "placed",
     "assigned_to_manager",
     "ready_for_delivery",
     "out_for_delivery",
     "delivered",
   ];

   const customSteps = [
     "placed",
     "assigned_to_manager",
     "assigned_to_designer",
     "in_production",
     "production_completed",
     "ready_for_delivery",
     "out_for_delivery",
     "delivered",
   ];
   ```

2. **Find Current Position**

   ```javascript
   const currentIndex = steps.indexOf(order.status); // e.g., 3
   ```

3. **Render with Styling**

   ```javascript
   steps.map((step, index) => (
     <div className={index <= currentIndex ? "completed" : "pending"}>
       {index < currentIndex ? "✓" : index + 1}
       {formatStepName(step)}
     </div>
   ));
   ```

4. **Visual Result**
   ```
   ✓ Placed → ✓ Assigned → ✓ In Production → 4. Ready → 5. Delivered
   (green)    (green)      (green)           (current)  (gray)
   ```

---

## 6. Shopping Cart with Persistence

### What We Used

- **React Context** - Cart state management
- **MongoDB** - Store cart for logged-in users
- **localStorage** - Backup for guests
- **Redux Persist** - Auto-save to storage

### Logic Behind It

**Problem:** User adds items to cart, closes browser, comes back - cart should still be there.

**Solution:** Save cart to database (logged in) or localStorage (guest).

**How It Works:**

1. **Add to Cart**

   ```
   User clicks "Add to Cart" →
   Update React state (instant UI update) →
   POST to /api/cart/add (save to database) →
   Redux persist saves to localStorage (backup)
   ```

2. **Load Cart on Login**

   ```
   User logs in →
   Fetch cart from /api/cart →
   Merge with any localStorage items →
   Display in cart page
   ```

3. **Cart Calculations**
   ```javascript
   const subtotal = items.reduce(
     (sum, item) => sum + item.price * item.quantity,
     0
   );
   const shipping = subtotal > 999 ? 0 : 50;
   const total = subtotal + shipping;
   ```

---

## 7. Stock Management

### What We Used

- **MongoDB $inc operator** - Atomic increment/decrement
- **Mongoose middleware** - Auto-update on save

### Logic Behind It

**Problem:** When order is placed, stock should decrease. Manager should see low stock alerts.

**Solution:** Automatically update stock on order, show warnings when low.

**How It Works:**

1. **Order Placed - Reduce Stock**

   ```javascript
   // For each item in order
   await Product.findByIdAndUpdate(productId, {
     $inc: { stockQuantity: -quantity }, // Atomic decrement
   });
   ```

2. **Check Stock Before Adding to Cart**

   ```javascript
   if (product.stockQuantity < requestedQuantity) {
     return error("Only " + product.stockQuantity + " available");
   }
   ```

3. **Low Stock Alert**

   ```javascript
   const lowStockProducts = products.filter((p) => p.stockQuantity < 10);
   // Show warning badge in manager dashboard
   ```

4. **Manager Updates Stock**
   ```
   Manager enters new quantity →
   PUT /api/manager/products/:id/stock →
   Update stockQuantity and inStock boolean
   ```

---

## 8. Real-Time Flash Messages

### What We Used

- **React Context** - Global message state
- **setTimeout** - Auto-dismiss after 3 seconds
- **CSS Animations** - Slide in/out effect

### Logic Behind It

**Problem:** User performs action, needs feedback. "Item added!" or "Error occurred!"

**Solution:** Toast notifications that appear temporarily and auto-dismiss.

**How It Works:**

1. **Show Message**

   ```javascript
   const success = (text) => {
     const id = Date.now(); // Unique ID
     setMessages((prev) => [...prev, { id, type: "success", text }]);

     // Auto-remove after 3 seconds
     setTimeout(() => removeMessage(id), 3000);
   };
   ```

2. **Usage in Components**

   ```javascript
   const { success, error } = useFlash();

   try {
     await addToCart(product);
     success("Added to cart!"); // Green toast
   } catch (err) {
     error("Failed to add"); // Red toast
   }
   ```

3. **Display Component**
   ```javascript
   <div className="flash-container">
     {messages.map((msg) => (
       <div key={msg.id} className={`flash flash-${msg.type}`}>
         {msg.text}
       </div>
     ))}
   </div>
   ```

---

## 9. Payment Integration

### What We Used

- **Modal Component** - Payment popup
- **Form Validation** - Check card details
- **Order Status** - Track payment state

### Logic Behind It

**Problem:** User needs to pay for orders. Support both COD and online payment.

**Solution:** Payment modal with method selection.

**How It Works:**

1. **Payment Methods**

   ```javascript
   const paymentMethods = [
     { id: "cod", name: "Cash on Delivery", icon: "💵" },
     { id: "card", name: "Credit/Debit Card", icon: "💳" },
     { id: "upi", name: "UPI", icon: "📱" },
   ];
   ```

2. **COD Flow**

   ```
   Select COD → Confirm order →
   paymentStatus: 'pending' →
   Collect money on delivery →
   Mark as 'paid' when delivered
   ```

3. **Online Payment Flow**
   ```
   Select Card/UPI → Enter details →
   Validate inputs → Process payment →
   If success: paymentStatus: 'paid' →
   If fail: Show error, let user retry
   ```

---

## 10. Session-Based Authentication

### What We Used

- **express-session** - Server-side sessions
- **MongoDB Session Store** - Persist sessions
- **Cookies** - Store session ID in browser

### Logic Behind It

**Problem:** How to keep user logged in across page refreshes?

**Solution:** Store session on server, send session ID as cookie.

**How It Works:**

1. **Login Creates Session**

   ```javascript
   // Backend
   req.session.user = {
     id: user._id,
     name: user.name,
     role: user.role,
   };
   // Session ID sent as cookie automatically
   ```

2. **Every Request Checks Session**

   ```javascript
   // API requests include cookie
   // Backend reads session from cookie
   if (req.session.user) {
     // User is logged in
   }
   ```

3. **Frontend Checks on Load**

   ```javascript
   useEffect(() => {
     api.get("/api/auth/session").then((res) => {
       if (res.data.user) setUser(res.data.user);
     });
   }, []);
   ```

4. **Logout Destroys Session**
   ```javascript
   req.session.destroy(); // Clear server session
   res.clearCookie("connect.sid"); // Clear cookie
   ```

---

## Summary Table

| Feature          | Technology                | Key Logic                                                    |
| ---------------- | ------------------------- | ------------------------------------------------------------ |
| 3D Models        | Three.js, GLB files       | Load model → Render in Canvas → Change material color        |
| OTP Verification | Math.random(), MongoDB    | Generate on pickup → Customer sees → Verify on delivery      |
| Design Studio    | React State, 3D Viewer    | Track selections → Update model → Calculate price            |
| Role Access      | Context, Protected Routes | Check role → Allow/deny page access                          |
| Order Tracking   | Array.indexOf(), CSS      | Find current step → Highlight completed steps                |
| Cart Persistence | Context, Redux Persist    | Save to DB/localStorage → Load on return                     |
| Stock Management | MongoDB $inc              | Atomic decrement on order → Alert when low                   |
| Flash Messages   | Context, setTimeout       | Show toast → Auto-dismiss after 3s                           |
| Payment          | Modal, Form Validation    | Select method → Validate → Process → Update status           |
| Authentication   | express-session, Cookies  | Login creates session → Cookie stores ID → Check on requests |
