# KUMAR's Contributions

**Email:** kumarswamy.g2005@gmail.com  
**Role:** Project Lead & 3D Features Developer  
**Total Commits:** 16

---

## Commits Summary

| #   | Commit                                | What We Used                                      | Logic Behind It                                                             |
| --- | ------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | Initialize React project with Vite    | Vite, React 18, npm                               | Vite is faster than CRA, provides instant hot reload for development        |
| 2   | Add 404 NotFound page                 | React Router `path="*"`                           | Catch-all route shows friendly error when URL doesn't match any page        |
| 3   | Add FlashContext and ThemeContext     | React Context, useState, setTimeout, localStorage | Share toast messages globally; auto-dismiss after 3s; persist theme         |
| 4   | Add Shop page with product filters    | useState, useEffect, Array.filter()               | Track filter state → API call → Filter products by category/gender/price    |
| 5   | Add Checkout page with payment        | useState, Form validation, API POST               | Collect address → Select payment → Validate → Create order → Clear cart     |
| 6   | Add Designer Dashboard                | useEffect, Array.filter()                         | Fetch orders where designerId matches current user → Display in cards       |
| 7   | Add Wishlist functionality            | MongoDB $push/$pull                               | Click heart → Add productId to user.wishlist array → Toggle on/off          |
| 8   | Add Delivery Dashboard with OTP       | useState, OTP verification, CSS animations        | Pick up order → Generate OTP → Customer tells OTP → Verify → Mark delivered |
| 9   | Add Admin OrderDetails view           | useParams, useEffect                              | Get orderId from URL → Fetch details → Show full order information          |
| 10  | Add 3D ModelViewer component          | Three.js, @react-three/fiber, GLB files           | Canvas renders 3D → Load GLB model → OrbitControls for rotate/zoom          |
| 11  | Add Design Studio for custom clothing | useState, 3D Viewer, Color picker                 | Select options → Update 3D model color → Calculate price → Add to cart      |
| 12  | Add 3D Model Showcase                 | Three.js Canvas, OrbitControls                    | Display 3D models for each category → User can rotate 360°                  |
| 13  | Add 3D clothing models config         | JavaScript object mapping                         | Map category+gender to model path: `tshirt_men → /models/tshirt_men.glb`    |
| 14  | Add 3D showcase styling               | CSS Flexbox, Media queries                        | Layout canvas with controls → Responsive design for mobile                  |
| 15  | Add source assets and 3D models       | GLB format, Public folder                         | Store compressed 3D models in /public/models/ for direct access             |
| 16  | Add team documentation                | Markdown                                          | Document each member's contributions                                        |

---

## Key Technologies

| Technology         | Purpose                     |
| ------------------ | --------------------------- |
| Three.js           | 3D rendering in browser     |
| @react-three/fiber | React wrapper for Three.js  |
| GLB Files          | Compressed 3D model format  |
| React Context      | Global state (Flash, Theme) |
| Vite               | Fast build tool             |
