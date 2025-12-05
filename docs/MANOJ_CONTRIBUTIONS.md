# MANOJ's Contributions

**Email:** manojkumarreddymummadi10@gmail.com  
**Role:** State Management & Cart Features  
**Total Commits:** 13

---

## Commits Summary

| #   | Commit                               | What We Used                                 | Logic Behind It                                                        |
| --- | ------------------------------------ | -------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | Create CartContext for shopping cart | React Context, useState, useEffect           | Store cart items → add/remove/update functions → Sync with backend     |
| 2   | Add Redux store with slices          | Redux Toolkit, createSlice, createAsyncThunk | Configure store → Create slices (auth, cart, orders) → Async API calls |
| 3   | Add Home page with featured products | useEffect, Carousel/Grid                     | Fetch featured products → Hero banner → Category links → CTA buttons   |
| 4   | Add ProtectedRoute component         | useAuth, Navigate                            | Check if user logged in → Check role → Allow or redirect to login      |
| 5   | Add Cart page with quantity controls | useCart, increment/decrement                 | Display items → +/- buttons → Update quantity → Recalculate total      |
| 6   | Add ProductReviews component         | useState, Star rating input                  | Fetch reviews → Display with stars → Form to submit new review         |
| 7   | Add Wishlist page                    | useEffect, Grid layout                       | Fetch user's wishlist → Display products → Move to cart button         |
| 8   | Add Admin Orders management          | useEffect, Filters, Search                   | Fetch all orders → Filter by status → Search by ID → Update status     |
| 9   | Add Analytics page                   | Chart.js or Recharts, useEffect              | Fetch order data → Calculate daily/weekly stats → Render charts        |
| 10  | Add Order Tracking styling           | CSS timeline, Pseudo-elements                | Vertical line → Circle markers → Color completed steps green           |
| 11  | Add OrderTracking component          | Array.indexOf(), Conditional styles          | Get current step index → Loop steps → Apply 'completed' class if past  |
| 12  | Add Delivery Dashboard styling       | CSS Cards, Animations                        | Order cards → Status badges → Success checkmark animation              |
| 13  | Add global and common CSS            | CSS Variables, Utility classes               | Button styles → Form inputs → Card shadows → Animation keyframes       |

---

## Key Technologies

| Technology       | Purpose                    |
| ---------------- | -------------------------- |
| Redux Toolkit    | Global state management    |
| createAsyncThunk | Async API calls in Redux   |
| redux-persist    | Save state to localStorage |
| React Context    | Cart state management      |
| CSS Animations   | Visual feedback            |
