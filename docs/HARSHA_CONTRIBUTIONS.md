# HARSHA's Contributions

**Email:** kondapulaharsha@gmail.com  
**Role:** Authentication & Dashboard Developer  
**Total Commits:** 13

---

## Commits Summary

| #   | Commit                                | What We Used                        | Logic Behind It                                                       |
| --- | ------------------------------------- | ----------------------------------- | --------------------------------------------------------------------- |
| 1   | Create AuthContext for authentication | React Context, useState, useEffect  | Store user state → login/logout functions → Check session on load     |
| 2   | Add Signup page with registration     | useState, Form validation, API POST | Collect name/email/password → Validate → POST to /api/auth/signup     |
| 3   | Add Layout wrapper component          | React children prop                 | Header + {children} + Footer → Wrap all pages → Consistent structure  |
| 4   | Add Customer Dashboard                | useEffect, Statistics cards         | Fetch user orders → Calculate totals → Display recent orders list     |
| 5   | Add Admin Dashboard with overview     | useEffect, Array.reduce()           | Fetch orders + users + products → Calculate revenue → Show charts     |
| 6   | Add PendingManagers approval          | useEffect, API PUT                  | Fetch users where approved=false → Approve/Reject buttons → Update DB |
| 7   | Add Pending orders page               | Array.filter(), Status check        | Filter orders where status='pending' → Display for quick action       |
| 8   | Add TrackOrder page                   | useParams, Timeline component       | Get orderId → Fetch order → Display tracking timeline with OTP        |
| 9   | Add form validation utilities         | Regex patterns, Return objects      | validateEmail() → Check format → Return {valid, message}              |
| 10  | Add project configuration files       | ESLint, Vite config                 | Code quality rules → Build optimization → Path aliases                |
| 11  | Add documentation and scripts         | Node.js scripts, Markdown           | Seed database scripts → README instructions                           |
| 12  | Add LoadingSpinner and ErrorMessage   | CSS animations, Props               | Spinner: rotate animation; Error: message + retry button              |
| 13  | Add Designer Dashboard styling        | CSS Flexbox, Status colors          | Card layout → Badge colors based on status → Responsive grid          |

---

## Key Technologies

| Technology      | Purpose                    |
| --------------- | -------------------------- |
| React Context   | Global auth state          |
| bcrypt          | Password hashing (backend) |
| express-session | Session management         |
| Regex           | Input validation           |
| ESLint          | Code quality               |
