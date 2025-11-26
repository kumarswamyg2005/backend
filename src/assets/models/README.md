# 3D Models Directory

This directory contains 3D models for the clothing items in the DesignDen application.

## Currently Available Models:
- tshirt_men.glb - 3D oversized t-shirt model for men (17.7 MB)
- tshirt_women.glb - 3D oversized t-shirt model for women (17.7 MB)
- dress_women.glb - 3D formal dress model for women (958 KB)
- hoodie_men.glb - 3D hoodie model for men (36.8 MB)
- hoodie_women.glb - 3D hoodie model for women (36.8 MB)
- obj/Men's Shirt.obj - 3D formal shirt model for men (11.2 MB) with textures

## Additional Models Needed:
- jeans_men.glb - 3D model for men's jeans
- kurthi_women.glb - 3D model for women's kurthis
- jeans_women.glb - 3D model for women's jeans

The application will automatically use GLB models when available, falling back to procedural Three.js models when GLB files are not found.

## Model Requirements:
- File format: GLB (preferred) or GLTF
- Recommended size: Keep under 20MB for web performance
- Orientation: Models should face forward (positive Z-axis)
- Scale: Models will be automatically scaled to fit the viewer
\`\`\`

```html file="public/textures/README.md"
# Textures Directory

This directory contains texture images for the clothing patterns in the DesignDen application.

In a real application, you would place actual texture images here with filenames matching those referenced in the customization code.

For example:
- checkered.jpg - Checkered pattern texture for clothing
- striped.jpg - Striped pattern texture for clothing
- polkadot.jpg - Polka dot pattern texture for clothing
- floral.jpg - Floral pattern texture for clothing
- graphic.jpg - Graphic print texture for clothing

For the college project demonstration, you can use placeholder textures or create simple textures using image editing tools.
\`\`\`

```html file="views/shop/index.ejs"
<%- include('../partials/header', { user: typeof user !== 'undefined' ? user : undefined }) %>

<div class="row mb-4">
  <div class="col-md-12">
    <div class="card shadow-sm">
      <div class="card-body">
        <h2 class="card-title">Shop Ready-Made Designs</h2>
        <p class="card-text">Browse our collection of pre-designed clothing items for men and women.</p>
      </div>
    </div>
  </div>
</div>

<div class="row">
  <!-- Filters Sidebar -->
  <div class="col-md-3 mb-4">
    <div class="card shadow-sm">
      <div class="card-header">
        <h3 class="h5 mb-0">Filters</h3>
      </div>
      <div class="card-body">
        <form action="/shop" method="GET" id="filterForm">
          <!-- Category Filter -->
          <div class="mb-3">
            <label class="form-label fw-bold">Category</label>
            <div class="d-grid gap-2">
              <div class="form-check">
                <input class="form-check-input" type="radio" name="category" id="categoryAll" value="" 
                  <%= !filters.category ? 'checked' : '' %> onchange="this.form.submit()">
                <label class="form-check-label" for="categoryAll">All Categories</label>
              </div>
              <% if (typeof categories !== 'undefined') { %>
                <% categories.forEach(category => { %>
                  <div class="form-check">
                    <input class="form-check-input" type="radio" name="category" id="category<%= category %>" 
                      value="<%= category %>" <%= filters.category === category ? 'checked' : '' %> onchange="this.form.submit()">
                    <label class="form-check-label" for="category<%= category %>"><%= category %></label>
                  </div>
                <% }) %>
              <% } %>
            </div>
          </div>
          
          <hr>
          
          <!-- Gender Filter -->
          <div class="mb-3">
            <label class="form-label fw-bold">Gender</label>
            <div class="d-grid gap-2">
              <div class="form-check">
                <input class="form-check-input" type="radio" name="gender" id="genderAll" value="" 
                  <%= !filters.gender ? 'checked' : '' %> onchange="this.form.submit()">
                <label class="form-check-label" for="genderAll">All</label>
              </div>
              <% if (typeof genders !== 'undefined') { %>
                <% genders.forEach(gender => { %>
                  <div class="form-check">
                    <input class="form-check-input" type="radio" name="gender" id="gender<%= gender %>" 
                      value="<%= gender %>" <%= filters.gender === gender ? 'checked' : '' %> onchange="this.form.submit()">
                    <label class="form-check-label" for="gender<%= gender %>"><%= gender %></label>
                  </div>
                <% }) %>
              <% } %>
            </div>
          </div>
          
          <hr>
          
          <!-- Size Filter -->
          <div class="mb-3">
            <label class="form-label fw-bold">Size</label>
            <div class="d-grid gap-2">
              <div class="form-check">
                <input class="form-check-input" type="radio" name="size" id="sizeAll" value="" 
                  <%= !filters.size ? 'checked' : '' %> onchange="this.form.submit()">
                <label class="form-check-label" for="sizeAll">All Sizes</label>
              </div>
              <% if (typeof sizes !== 'undefined') { %>
                <% sizes.forEach(size => { %>
                  <div class="form-check">
                    <input class="form-check-input" type="radio" name="size" id="size<%= size %>" 
                      value="<%= size %>" <%= filters.size === size ? 'checked' : '' %> onchange="this.form.submit()">
                    <label class="form-check-label" for="size<%= size %>"><%= size %></label>
                  </div>
                <% }) %>
              <% } %>
            </div>
          </div>
          
          <hr>
          
          <!-- Price Range Filter -->
          <div class="mb-3">
            <label class="form-label fw-bold">Price Range</label>
            <div class="row g-2">
              <div class="col">
                <input type="number" class="form-control" name="minPrice" id="minPrice" 
                  placeholder="Min" value="<%= filters.minPrice %>" min="0">
              </div>
              <div class="col">
                <input type="number" class="form-control" name="maxPrice" id="maxPrice" 
                  placeholder="Max" value="<%= filters.maxPrice %>">
              </div>
            </div>
            <div class="d-grid mt-2">
              <button type="submit" class="btn btn-sm btn-outline-primary">Apply Price</button>
            </div>
          </div>
          
          <hr>
          
          <!-- Reset Filters -->
          <div class="d-grid">
            <a href="/shop" class="btn btn-outline-secondary">Reset All Filters</a>
          </div>
        </form>
      </div>
    </div>
  </div>
  
  <!-- Products Grid -->
  <div class="col-md-9">
    <!-- Sort Options -->
    <div class="card shadow-sm mb-4">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <% if (typeof products !== 'undefined') { %>
              <span class="text-muted"><%= products.length %> products found</span>
            <% } %>
          </div>
          <div class="d-flex align-items-center">
            <label class="me-2">Sort by:</label>
            <select class="form-select form-select-sm" id="sortSelect" onchange="updateSort(this.value)">
              <option value="newest" <%= filters.sort === 'newest' ? 'selected' : '' %>>Newest</option>
              <option value="price-low-high" <%= filters.sort === 'price-low-high' ? 'selected' : '' %>>Price: Low to High</option>
              <option value="price-high-low" <%= filters.sort === 'price-high-low' ? 'selected' : '' %>>Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Products -->
    <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
      <% if (typeof products !== 'undefined' && products.length > 0) { %>
        <% products.forEach(product => { %>
          <div class="col">
            <div class="card h-100 product-card">
              <div class="position-relative">
                <img src="<%= product.images && product.images.length > 0 ? product.images[0] : '/placeholder.svg?height=300&width=300' %>" 
                  class="card-img-top" alt="<%= product.name %>">
                <% if (!product.inStock) { %>
                  <div class="position-absolute top-0 end-0 bg-danger text-white m-2 px-2 py-1 rounded">Out of Stock</div>
                <% } %>
                <% if (product.customizable) { %>
                  <div class="position-absolute top-0 start-0 bg-success text-white m-2 px-2 py-1 rounded">Customizable</div>
                <% } %>
              </div>
              <div class="card-body">
                <h5 class="card-title"><%= product.name %></h5>
                <p class="card-text text-muted"><%= product.category %> | <%= product.gender %></p>
                <div class="d-flex justify-content-between align-items-center">
                  <span class="fw-bold">₹<%= product.price.toFixed(2) %></span>
                  <a href="/shop/product/<%= product._id %>" class="btn btn-sm btn-primary">View Details</a>
                </div>
              </div>
            </div>
          </div>
        <% }) %>
      <% } else { %>
        <div class="col-12">
          <div class="alert alert-info">
            No products found matching your filters. <a href="/shop">Clear all filters</a> to see all products.
          </div>
        </div>
      <% } %>
    </div>
  </div>
</div>

<script>
  function updateSort(sortValue) {
    // Get current URL
    const url = new URL(window.location.href);
    
    // Update or add the sort parameter
    url.searchParams.set('sort', sortValue);
    
    // Redirect to the new URL
    window.location.href = url.toString();
  }
</script>

<%- include('../partials/footer') %>
