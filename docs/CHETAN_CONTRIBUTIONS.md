# CHETAN's Contributions

**Email:** chetankrishna.g23@iiits.in  
**Role:** Backend & Frontend Integration Specialist  
**Total Commits:** 13

---

## Commits Summary

| #   | Commit                                  | What We Used                                  | Logic Behind It                                                                 |
| --- | --------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------- |
| 1   | Add React entry point and App component | React Router, Context Providers               | App.jsx is root → Define all routes → Wrap with AuthContext, CartContext        |
| 2   | Setup Axios API service                 | Axios, Interceptors, Cookies                  | Configure base URL → Add auth headers → Handle errors globally                  |
| 3   | Setup Express backend with MongoDB      | Express.js, Mongoose, bcrypt, express-session | Create server → Connect MongoDB → Define schemas → API endpoints → Session auth |
| 4   | Add Header component with navigation    | React Router Link, useAuth                    | Show logo → Role-based nav links → Cart count badge → Login/Logout              |
| 5   | Add ProductDetails page with reviews    | useParams, useEffect, useState                | Get productId → Fetch product → Display images/details → Show reviews           |
| 6   | Add Customer OrderDetails with OTP      | useParams, Conditional render                 | Fetch order → Show timeline → If status='out_for_delivery' show OTP             |
| 7   | Add Manager Dashboard with statistics   | useEffect, Array.reduce()                     | Fetch all orders → Calculate stats (pending, delivered) → Display cards         |
| 8   | Add Designer OrderDetails               | useParams, Status update                      | Show custom order details → Designer can update production status               |
| 9   | Add Admin Products inventory            | useEffect, CRUD operations                    | List all products → Edit stock → Update prices → Toggle in-stock                |
| 10  | Add FlashMessages component             | useFlash hook, CSS transitions                | Subscribe to flash context → Render toast stack → Animate in/out                |
| 11  | Add DataTable and SearchBar             | Props, Array.filter()                         | Reusable table → Accept data as prop → Sort/filter/paginate                     |
| 12  | Add 3D showcase styling                 | CSS Grid, Custom properties                   | Style the 3D model display page with proper layout                              |
| 13  | Add currency formatting utilities       | Intl.NumberFormat                             | Format numbers as ₹1,999.00 with Indian locale                                  |

---

## Key Technologies

| Technology       | Purpose                      |
| ---------------- | ---------------------------- |
| Express.js       | Backend server framework     |
| MongoDB/Mongoose | Database and ODM             |
| bcrypt           | Password hashing             |
| express-session  | Session-based authentication |
| Axios            | HTTP client for API calls    |
