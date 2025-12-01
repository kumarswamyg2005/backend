# 3D Model Integration for DesignDen React

This document describes the 3D model functionality that has been integrated into the DesignDen React application.

## Overview

The application now supports two types of 3D models:

1. **GLB Models**: High-quality 3D assets loaded from external `.glb` files
2. **Procedural Models**: Dynamically generated 3D models using Three.js primitives

## Files Added/Modified

### New Files Created

1. **`src/utils/clothingModels.js`**

   - Contains the `ClothingModels` class with methods to generate procedural 3D models
   - Includes models for: T-Shirt, Shirt, Hoodie, Kurthi, Dress, and Jeans
   - Provides pattern generation methods: Checkered, Striped, Polka Dot, and Floral

2. **`src/pages/shop/Model3DShowcase.jsx`**

   - Interactive showcase page for demonstrating both GLB and procedural models
   - Allows users to switch between model types and customize colors, patterns, and graphics
   - Provides real-time 3D visualization

3. **`src/styles/Model3DShowcase.css`**
   - Styling for the 3D model showcase page
   - Responsive design with animations and transitions

### Modified Files

1. **`src/components/ModelViewer.jsx`**

   - Enhanced to support both GLB and procedural models
   - Added `useProceduralModel` prop to toggle between model types
   - Added `pattern` prop for applying patterns to procedural models
   - Improved material handling and texture application

2. **`src/App.jsx`**
   - Added route for the 3D showcase page: `/shop/3d-showcase`
   - Imported the `Model3DShowcase` component

## Features

### GLB Models

- Load pre-made 3D models from the `/public/models/` directory
- Support for multiple clothing items (t-shirts, hoodies, dresses, etc.)
- Gender-specific model variants
- Color and graphic customization

### Procedural Models

- Dynamically generated using Three.js geometry primitives
- Lightweight and fast to render
- Support for patterns (Checkered, Striped, Polka Dot, Floral)
- Fully customizable colors and graphics
- Perfect for rapid prototyping

### Interactive Controls

- **Rotate**: Left-click and drag
- **Zoom**: Mouse scroll
- **Pan**: Right-click and drag
- **Reset**: Button to return to default view

## Available Models

### GLB Models (in `/public/models/`)

- `tshirt_men.glb`
- `tshirt_women.glb`
- `hoodie_men.glb`
- `hoodie_women.glb`
- `dress_women.glb`
- `free_model--bow_knot_dress.glb`
- `shalwar-kameez.glb`
- `jeans.glb`

### Procedural Models

- T-Shirt
- Shirt
- Hoodie
- Kurthi
- Dress
- Jeans

## Usage Examples

### Using ModelViewer with GLB Models

```jsx
import ModelViewer from "../components/ModelViewer";

<ModelViewer
  category="T-Shirt"
  gender="Men"
  color="#4a90e2"
  graphic="logo.png"
  useProceduralModel={false}
/>;
```

### Using ModelViewer with Procedural Models

```jsx
import ModelViewer from "../components/ModelViewer";

<ModelViewer
  category="Shirt"
  gender="Men"
  color="#e74c3c"
  pattern="Checkered"
  graphic="star.png"
  useProceduralModel={true}
/>;
```

### Creating Custom Procedural Models

```jsx
import ClothingModels from "../utils/clothingModels";
import * as THREE from "three";

// In your component
const scene = new THREE.Scene();
const model = ClothingModels.createTShirtModel(scene, 0xff0000);

// Apply a pattern
ClothingModels.applyPattern(
  model.materials,
  new THREE.Color(0xff0000),
  "Striped"
);
```

## Accessing the Showcase

Visit the showcase page at: **`http://localhost:5173/shop/3d-showcase`**

The showcase allows you to:

- Switch between GLB and Procedural models
- Select different clothing categories
- Choose gender variants
- Pick colors from presets or custom color picker
- Apply patterns (procedural models only)
- Add graphics/logos
- View real-time 3D updates

## Technical Details

### Dependencies

- **three**: 3D rendering engine
- **@react-three/fiber**: React renderer for Three.js (installed but not used in current implementation)
- **@react-three/drei**: Helper components for Three.js (installed but not used in current implementation)

### Three.js Loaders Used

- `GLTFLoader`: For loading `.glb` model files
- `OrbitControls`: For camera controls and interaction

### Pattern Generation

Patterns are generated using HTML5 Canvas and converted to Three.js textures:

- Canvas size: 512x512 pixels
- Texture wrapping: RepeatWrapping
- Texture repeat: 4x4 for tiling effect

## Performance Considerations

- **GLB Models**: Larger file size but high quality, may take time to load
- **Procedural Models**: Instant loading, lower memory footprint
- Both model types support color and texture changes without reloading
- Camera controls use damping for smooth interactions

## Future Enhancements

Potential improvements for the 3D model system:

1. **Advanced Materials**: Add support for metallic, roughness, and normal maps
2. **Animation**: Implement model animations (e.g., fabric simulation)
3. **AR Support**: Add augmented reality preview using WebXR
4. **Model Variations**: Create more detailed procedural models with accessories
5. **Export**: Allow users to export customized models
6. **Lighting Controls**: Let users adjust lighting for different preview scenarios
7. **Comparison View**: Side-by-side comparison of multiple designs

## Troubleshooting

### Models Not Loading

- Check that the server is running on `http://localhost:3000`
- Verify that model files exist in `/public/models/`
- Check browser console for CORS or 404 errors

### Texture Issues

- Ensure graphic files exist in `/public/images/graphics/`
- Verify file names match exactly (case-sensitive)
- Check browser console for texture loading errors

### Performance Issues

- Try using procedural models instead of GLB for faster rendering
- Reduce the number of lights in the scene
- Lower the antialiasing settings in the renderer

## Credits

- Three.js library: https://threejs.org/
- OrbitControls: Three.js examples
- GLTFLoader: Three.js examples
- 3D Models: Various sources (see `/public/models/README.md`)

## License

This code is part of the DesignDen project and follows the same license as the main application.
