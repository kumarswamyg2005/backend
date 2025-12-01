# Quick Start Guide - 3D Models

## 🚀 Getting Started

### Step 1: Start the Server

```bash
cd design-den-react
npm run dev
```

The application will start at `http://localhost:5173`

### Step 2: Access the 3D Showcase

Navigate to: **`http://localhost:5173/shop/3d-showcase`**

---

## 🎯 What You'll See

### Main Interface

```
┌─────────────────────────────────────────────────────────┐
│                  3D Model Showcase                       │
│                                                          │
│  [GLB Models] [Procedural Models] ← Toggle Tabs        │
│                                                          │
│  ┌──────────────────┐  ┌──────────────────────────┐   │
│  │   Controls       │  │   3D Viewer              │   │
│  │                  │  │                          │   │
│  │  Category: ▼     │  │      [3D Model]         │   │
│  │  Gender: ▼       │  │                          │   │
│  │  Color: ◉◉◉      │  │   Drag to Rotate →      │   │
│  │  Pattern: ▼      │  │   Scroll to Zoom ↕      │   │
│  │  Graphic: ▼      │  │   [Reset] Button        │   │
│  │                  │  │                          │   │
│  │  [Reset]         │  └──────────────────────────┘   │
│  └──────────────────┘                                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 Features to Try

### 1. GLB Models Tab

✅ High-quality pre-made 3D models

- Select Category: T-Shirt, Hoodie, Dress, etc.
- Choose Gender: Men, Women, Unisex
- Pick Color: 8 presets or custom
- Add Graphic: Logo, skull, star designs

### 2. Procedural Models Tab

✅ Dynamically generated 3D models

- All the same options as GLB models
- **Plus**: Pattern selection (Checkered, Striped, Polka Dot, Floral)
- Instant loading, no file download needed

### 3. 3D Controls

- **Left Click + Drag**: Rotate the model
- **Mouse Scroll**: Zoom in/out
- **Right Click + Drag**: Pan the view
- **Reset Button**: Return to default position

---

## 📁 File Locations

### New Components

```
design-den-react/
├── src/
│   ├── components/
│   │   └── ModelViewer.jsx (Enhanced)
│   ├── pages/
│   │   └── shop/
│   │       └── Model3DShowcase.jsx (New!)
│   ├── styles/
│   │   └── Model3DShowcase.css (New!)
│   └── utils/
│       └── clothingModels.js (New!)
```

### 3D Model Files

```
design-den-main 2/
└── public/
    └── models/
        ├── tshirt_men.glb
        ├── tshirt_women.glb
        ├── hoodie_men.glb
        ├── hoodie_women.glb
        ├── dress_women.glb
        ├── shalwar-kameez.glb
        └── jeans.glb
```

---

## 🔗 Navigation

### From Home Page

```
Home → Shop → 3D Showcase
```

### Direct URL

```
http://localhost:5173/shop/3d-showcase
```

### In Design Studio

The ModelViewer component is also used in:

```
http://localhost:5173/customer/design-studio
```

---

## 🛠️ Code Examples

### Using in Your Component

```jsx
import ModelViewer from '../components/ModelViewer';

// GLB Model
<ModelViewer
  category="T-Shirt"
  gender="Men"
  color="#4a90e2"
  graphic="logo.png"
  useProceduralModel={false}
/>

// Procedural Model with Pattern
<ModelViewer
  category="Hoodie"
  color="#e74c3c"
  pattern="Striped"
  graphic="star.png"
  useProceduralModel={true}
/>
```

---

## 🎭 Available Options

### Categories

- T-Shirt
- Shirt
- Hoodie
- Dress
- Kurthi
- Jeans

### Genders (GLB only)

- Men
- Women
- Unisex

### Patterns (Procedural only)

- Solid
- Checkered
- Striped
- Polka Dot
- Floral

### Graphics

- None
- logo.png
- skull.png
- model.png
- star.png

### Color Presets

- White (#ffffff)
- Black (#000000)
- Red (#e74c3c)
- Blue (#4a90e2)
- Green (#2ecc71)
- Yellow (#f39c12)
- Purple (#9b59b6)
- Pink (#e91e63)

---

## 🐛 Troubleshooting

### Models Not Loading?

1. Check that both servers are running:
   - Backend: `http://localhost:3000`
   - Frontend: `http://localhost:5173`
2. Verify model files exist in `/public/models/`
3. Check browser console for errors

### Performance Issues?

1. Try using Procedural models (lighter)
2. Close other browser tabs
3. Reduce window size for better FPS

### Colors Not Applying?

1. Make sure a model is loaded first
2. Try switching tabs and back
3. Click the Reset button

---

## 📚 Documentation

For detailed documentation, see:

- **`3D_MODEL_INTEGRATION.md`** - Technical details
- **`3D_MODEL_SUMMARY.md`** - Implementation overview

---

## ✨ Pro Tips

1. **Compare Models**: Switch between GLB and Procedural to see the difference
2. **Custom Colors**: Use the color picker for exact hex values
3. **Pattern Preview**: Procedural models show patterns more clearly
4. **Save Settings**: Note your favorite combinations for future use
5. **Mobile Friendly**: Works on touch devices too!

---

**Happy Designing! 🎨👕**
