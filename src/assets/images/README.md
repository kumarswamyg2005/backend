# Product Images Directory

This directory contains images for the clothing items in the DesignDen application.

In a real application, you would place actual product images here with filenames matching those referenced in the product database.

For the college project demonstration, you can use placeholder images or create simple product images using image editing tools.
\`\`\`

Now let's update the customer/order-details.ejs file to use rupees instead of dollars:

```html file="views/customer/order-details.ejs"
<%- include('../partials/header') %>

<div class="row mb-4">
  <div class="col-md-12">
    <div class="card shadow-sm">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center">
          <h2 class="card-title mb-0">Order Details</h2>
          <a href="/customer/dashboard" class="btn btn-outline-primary">Back to Dashboard</a>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="row">
  <div class="col-md-8">
    <div class="card shadow-sm">
      <div class="card-header">
        <h3>Order #<%= order._id.toString().substring(0, 8) %>...</h3>
      </div>
      <div class="card-body">
        <div class="row mb-4">
          <div class="col-md-6">
            <h5>Order Information</h5>
            <ul class="list-group list-group-flush">
              <li class="list-group-item d-flex justify-content-between">
                <span>Order Date:</span>
                <span><%= new Date(order.orderDate).toLocaleDateString() %></span>
              </li>
              <li class="list-group-item d-flex justify-content-between">
                <span>Status:</span>
                <span class="badge <%= 
                  order.status === 'Pending' ? 'bg-warning' : 
                  order.status === 'Assigned' ? 'bg-info' : 
                  order.status === 'In Progress' ? 'bg-primary' : 
                  order.status === 'Completed' ? 'bg-success' : 
                  'bg-danger' 
                %>">
                  <%= order.status %>
                </span>
              </li>
              <li class="list-group-item d-flex justify-content-between">
                <span>Quantity:</span>
                <span><%= order.quantity %></span>
              </li>
              <li class="list-group-item d-flex justify-content-between">
                <span>Total Price:</span>
                <span>₹<%= order.totalPrice.toFixed(2) %></span>
              </li>
            </ul>
          </div>
          <div class="col-md-6">
            <h5>Delivery Information</h5>
            <ul class="list-group list-group-flush">
              <li class="list-group-item">
                <span>Delivery Address:</span>
                <p class="mb-0 mt-1"><%= order.deliveryAddress %></p>
              </li>
              <% if (order.designerId) { %>
                <li class="list-group-item">
                  <span>Assigned Designer:</span>
                  <p class="mb-0 mt-1"><%= order.designerId.username %></p>
                </li>
              <% } %>
            </ul>
          </div>
        </div>
        
        <div class="order-timeline mb-4">
          <h5>Order Timeline</h5>
          <div class="timeline">
            <div class="timeline-item <%= order.status === 'Pending' || order.status === 'Assigned' || order.status === 'In Progress' || order.status === 'Completed' ? 'active' : '' %>">
              <div class="timeline-badge bg-primary"></div>
              <div class="timeline-content">
                <h6>Order Placed</h6>
                <p><%= new Date(order.orderDate).toLocaleDateString() %></p>
              </div>
            </div>
            <div class="timeline-item <%= order.status === 'Assigned' || order.status === 'In Progress' || order.status === 'Completed' ? 'active' : '' %>">
              <div class="timeline-badge bg-primary"></div>
              <div class="timeline-content">
                <h6>Designer Assigned</h6>
                <p><%= order.status === 'Pending' ? 'Pending' : 'Completed' %></p>
              </div>
            </div>
            <div class="timeline-item <%= order.status === 'In Progress' || order.status === 'Completed' ? 'active' : '' %>">
              <div class="timeline-badge bg-primary"></div>
              <div class="timeline-content">
                <h6>Production Started</h6>
                <p><%= order.status === 'Pending' || order.status === 'Assigned' ? 'Pending' : 'In Progress' %></p>
              </div>
            </div>
            <div class="timeline-item <%= order.status === 'Completed' ? 'active' : '' %>">
              <div class="timeline-badge bg-primary"></div>
              <div class="timeline-content">
                <h6>Order Completed</h6>
                <p><%= order.status === 'Completed' ? 'Completed' : 'Pending' %></p>
              </div>
            </div>
          </div>
        </div>
        
        <% if (order.status === 'Completed') { %>
          <div class="d-grid">
            <a href="/feedback/submit/<%= order._id %>" class="btn btn-success">Leave Feedback</a>
          </div>
        <% } %>
      </div>
    </div>
  </div>
  
  <div class="col-md-4">
    <div class="card shadow-sm">
      <div class="card-header">
        <h3>Design Details</h3>
      </div>
      <div class="card-body">
        <div id="modelContainer" class="text-center mb-3" style="height: 200px; width: 100%; position: relative;">
          &lt;!-- 3D model will be rendered here -->
        </div>
        <h4><%= order.designId.name %></h4>
        <ul class="list-group list-group-flush">
          <li class="list-group-item d-flex justify-content-between">
            <span>Fabric:</span>
            <span><%= order.designId.fabric %></span>
          </li>
          <li class="list-group-item d-flex justify-content-between">
            <span>Color:</span>
            <span><%= order.designId.color %></span>
          </li>
          <li class="list-group-item d-flex justify-content-between">
            <span>Pattern:</span>
            <span><%= order.designId.pattern %></span>
          </li>
          <li class="list-group-item d-flex justify-content-between">
            <span>Size:</span>
            <span><%= order.designId.size %></span>
          </li>
        </ul>
        <% if (order.designId.additionalNotes) { %>
          <div class="mt-3">
            <h5>Additional Notes:</h5>
            <p><%= order.designId.additionalNotes %></p>
          </div>
        <% } %>
      </div>
    </div>
  </div>
</div>

&lt;!-- Include Three.js -->
<script src="https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.min.js"></script>
&lt;!-- Include our custom 3D models -->
<script src="/js/3d-models.js"></script>

<script>
  document.addEventListener("DOMContentLoaded", () => {
    // Simple 3D preview of the design
    const modelContainer = document.getElementById('modelContainer');
    if (modelContainer) {
      // Create scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf8f9fa);
      
      // Create camera
      const camera = new THREE.PerspectiveCamera(75, modelContainer.clientWidth / modelContainer.clientHeight, 0.1, 1000);
      camera.position.z = 2;
      
      // Create renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(modelContainer.clientWidth, modelContainer.clientHeight);
      modelContainer.appendChild(renderer.domElement);
      
      // Add lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(1, 1, 1);
      scene.add(directionalLight);
      
      // Create model based on design
      const model = ClothingModels.getModel(scene, '<%= order.designId.category || "Shirt" %>', 'Unisex');
      
      // Convert color name to hex
      const colorMap = {
        'Red': 0xff0000,
        'Blue': 0x0000ff,
        'Green': 0x00ff00,
        'Black': 0x000000,
        'White': 0xffffff,
        'Gray': 0x808080,
        'Yellow': 0xffff00,
        'Purple': 0x800080,
        'Pink': 0xffc0cb,
        'Maroon': 0x800000
      };
      
      const colorHex = colorMap['<%= order.designId.color %>'] || 0xcccccc;
      
      // Update model with design details
      model.update({
        color: colorHex,
        pattern: '<%= order.designId.pattern %>',
        fabric: '<%= order.designId.fabric %>'
      });
      
      // Auto-rotate the model
      function animate() {
        requestAnimationFrame(animate);
        if (model && model.group) {
          model.group.rotation.y += 0.01;
        }
        renderer.render(scene, camera);
      }
      
      animate();
    }
  });
</script>

<%- include('../partials/footer') %>
