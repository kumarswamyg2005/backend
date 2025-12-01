#!/bin/bash

# Customer OrderDetails
cat > src/pages/customer/OrderDetails.jsx << 'EOF'
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { customerAPI } from '../../services/api';
import { formatPrice } from '../../utils/currency';
import { useFlash } from '../../context/FlashContext';

const OrderDetails = () => {
  const { id } = useParams();
  const { showFlash } = useFlash();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const data = await customerAPI.getOrderById(id);
      setOrder(data.order);
    } catch (error) {
      showFlash('Failed to load order details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      'pending': 'bg-warning',
      'assigned': 'bg-info',
      'in_production': 'bg-primary',
      'completed': 'bg-success',
      'delivered': 'bg-success',
      'shipped': 'bg-info',
      'cancelled': 'bg-danger'
    };
    return statusMap[status] || 'bg-secondary';
  };

  if (loading) {
    return (
      <div className="container my-4">
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container my-4">
        <div className="alert alert-warning">Order not found</div>
        <Link to="/customer/dashboard" className="btn btn-primary">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="container my-4">
      <div className="row mb-4">
        <div className="col-md-12">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="card-title mb-2">Order Details</h2>
                  <p className="text-muted mb-0">Order ID: <code>{order._id}</code></p>
                </div>
                <Link to="/customer/dashboard" className="btn btn-outline-primary">Back to Dashboard</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-8">
          <div className="card shadow-sm mb-4">
            <div className="card-header">
              <h3>Order Items</h3>
            </div>
            <div className="card-body">
              {order.items && order.items.length > 0 ? (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Details</th>
                        <th>Quantity</th>
                        <th>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.name || 'Custom Design'}</td>
                          <td><small className="text-muted">{item.details || 'N/A'}</small></td>
                          <td>{item.quantity}</td>
                          <td>{formatPrice(item.price * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted">No items found</p>
              )}
            </div>
          </div>

          {order.deliveryAddress && (
            <div className="card shadow-sm">
              <div className="card-header">
                <h3>Delivery Address</h3>
              </div>
              <div className="card-body">
                <p className="mb-1">{order.deliveryAddress.name}</p>
                <p className="mb-1">{order.deliveryAddress.street}</p>
                <p className="mb-1">{order.deliveryAddress.city}, {order.deliveryAddress.state}</p>
                <p className="mb-1">Pincode: {order.deliveryAddress.pincode}</p>
                <p className="mb-0">Phone: {order.deliveryAddress.phone}</p>
              </div>
            </div>
          )}
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm mb-3">
            <div className="card-header">
              <h3>Order Status</h3>
            </div>
            <div className="card-body">
              <span className={`badge ${getStatusBadgeClass(order.status)} fs-6`}>
                {order.status.toUpperCase()}
              </span>
              <p className="mt-3 mb-0 text-muted small">
                Ordered on: {new Date(order.orderDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-header">
              <h3>Payment Summary</h3>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal:</span>
                <span>{formatPrice(order.subtotal || order.totalPrice)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Tax:</span>
                <span>{formatPrice(order.tax || 0)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Shipping:</span>
                <span>{formatPrice(order.shipping || 0)}</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between">
                <strong>Total:</strong>
                <strong>{formatPrice(order.totalPrice)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
EOF

# Designer Dashboard
cat > src/pages/designer/Dashboard.jsx << 'EOF'
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { designerAPI } from '../../services/api';
import { formatPrice } from '../../utils/currency';
import { useAuth } from '../../context/AuthContext';
import { useFlash } from '../../context/FlashContext';

const Dashboard = () => {
  const { user } = useAuth();
  const { showFlash } = useFlash();
  const [stats, setStats] = useState({});
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await designerAPI.getDashboard();
      setStats(data.stats || {});
      setOrders(data.orders || []);
    } catch (error) {
      showFlash('Failed to load dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container my-4">
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container my-4">
      <div className="row mb-4">
        <div className="col-md-12">
          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="card-title">Designer Dashboard</h2>
              <p className="card-text">Welcome, {user?.username}! Manage your designs and orders.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <h5 className="card-title">Active Orders</h5>
              <h2 className="text-primary">{stats.activeOrders || 0}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <h5 className="card-title">Completed</h5>
              <h2 className="text-success">{stats.completedOrders || 0}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <h5 className="card-title">Total Designs</h5>
              <h2 className="text-info">{stats.totalDesigns || 0}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <h5 className="card-title">Earnings</h5>
              <h2 className="text-warning">{formatPrice(stats.totalEarnings || 0)}</h2>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-12">
          <div className="card shadow-sm">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3>Assigned Orders</h3>
              <Link to="/designer/products" className="btn btn-primary btn-sm">Manage Products</Link>
            </div>
            <div className="card-body">
              {orders.length === 0 ? (
                <div className="alert alert-info">No orders assigned yet.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Items</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(order => (
                        <tr key={order._id}>
                          <td><code>{order._id.substring(0, 8)}...</code></td>
                          <td>{order.customerId?.username || 'N/A'}</td>
                          <td>{order.items?.length || 0}</td>
                          <td><span className="badge bg-info">{order.status.toUpperCase()}</span></td>
                          <td>
                            <Link to={`/designer/order/${order._id}`} className="btn btn-sm btn-outline-primary">
                              View Details
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
EOF

# Designer Products
cat > src/pages/designer/Products.jsx << 'EOF'
import { useState, useEffect } from 'react';
import { designerAPI } from '../../services/api';
import { formatPrice } from '../../utils/currency';
import { useFlash } from '../../context/FlashContext';

const Products = () => {
  const { showFlash } = useFlash();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await designerAPI.getProducts();
      setProducts(data.products || []);
    } catch (error) {
      showFlash('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container my-4">
      <div className="row mb-4">
        <div className="col-md-12">
          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="card-title">Manage Products</h2>
              <p className="card-text">View and manage your product designs.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {loading ? (
          <div className="col-12 text-center py-5">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="col-12">
            <div className="alert alert-info">No products found.</div>
          </div>
        ) : (
          products.map(product => (
            <div className="col-md-4 mb-4" key={product._id}>
              <div className="card h-100 shadow-sm">
                <img 
                  src={product.imageUrl || '/images/casual-tshirt.jpeg'} 
                  className="card-img-top" 
                  alt={product.name}
                  style={{ height: '250px', objectFit: 'cover' }}
                />
                <div className="card-body">
                  <h5 className="card-title">{product.name}</h5>
                  <p className="card-text text-muted">{product.category} - {product.gender}</p>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="h5 mb-0">{formatPrice(product.price)}</span>
                    <span className={`badge ${product.inStock ? 'bg-success' : 'bg-danger'}`}>
                      {product.inStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Products;
EOF

# Designer OrderDetails
cat > src/pages/designer/OrderDetails.jsx << 'EOF'
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { designerAPI } from '../../services/api';
import { formatPrice } from '../../utils/currency';
import { useFlash } from '../../context/FlashContext';

const OrderDetails = () => {
  const { id } = useParams();
  const { showFlash } = useFlash();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const data = await designerAPI.getOrderById(id);
      setOrder(data.order);
    } catch (error) {
      showFlash('Failed to load order', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      await designerAPI.updateOrderStatus(id, newStatus);
      showFlash('Order status updated successfully', 'success');
      fetchOrderDetails();
    } catch (error) {
      showFlash('Failed to update status', 'error');
    }
  };

  if (loading) {
    return (
      <div className="container my-4">
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container my-4">
        <div className="alert alert-warning">Order not found</div>
        <Link to="/designer/dashboard" className="btn btn-primary">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="container my-4">
      <div className="row mb-4">
        <div className="col-md-12">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="card-title mb-2">Order Details</h2>
                  <p className="text-muted mb-0">Order ID: <code>{order._id}</code></p>
                </div>
                <Link to="/designer/dashboard" className="btn btn-outline-primary">Back to Dashboard</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-8">
          <div className="card shadow-sm">
            <div className="card-header">
              <h3>Order Items</h3>
            </div>
            <div className="card-body">
              {order.items && order.items.length > 0 ? (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Quantity</th>
                        <th>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.name || 'Custom Design'}</td>
                          <td>{item.quantity}</td>
                          <td>{formatPrice(item.price * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted">No items found</p>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm mb-3">
            <div className="card-header">
              <h3>Order Status</h3>
            </div>
            <div className="card-body">
              <span className="badge bg-info fs-6 mb-3">{order.status.toUpperCase()}</span>
              
              <div className="d-grid gap-2">
                {order.status === 'assigned' && (
                  <button 
                    onClick={() => handleStatusUpdate('in_production')}
                    className="btn btn-primary btn-sm"
                  >
                    Start Production
                  </button>
                )}
                {order.status === 'in_production' && (
                  <button 
                    onClick={() => handleStatusUpdate('completed')}
                    className="btn btn-success btn-sm"
                  >
                    Mark as Completed
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-header">
              <h3>Summary</h3>
            </div>
            <div className="card-body">
              <p className="mb-2"><strong>Total:</strong> {formatPrice(order.totalPrice)}</p>
              <p className="mb-0 text-muted small">
                Ordered: {new Date(order.orderDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
EOF

echo "✓ All Designer pages created"

# Manager Dashboard
cat > src/pages/manager/Dashboard.jsx << 'EOF'
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { managerAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useFlash } from '../../context/FlashContext';

const Dashboard = () => {
  const { user } = useAuth();
  const { showFlash } = useFlash();
  const [stats, setStats] = useState({});
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await managerAPI.getDashboard();
      setStats(data.stats || {});
      setOrders(data.orders || []);
    } catch (error) {
      showFlash('Failed to load dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container my-4">
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container my-4">
      <div className="row mb-4">
        <div className="col-md-12">
          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="card-title">Manager Dashboard</h2>
              <p className="card-text">Welcome, {user?.username}! Manage production and orders.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <h5 className="card-title">Pending Orders</h5>
              <h2 className="text-warning">{stats.pendingOrders || 0}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <h5 className="card-title">In Production</h5>
              <h2 className="text-primary">{stats.inProduction || 0}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <h5 className="card-title">Completed</h5>
              <h2 className="text-success">{stats.completed || 0}</h2>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-12">
          <div className="card shadow-sm">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3>Recent Orders</h3>
              <Link to="/manager/pending" className="btn btn-primary btn-sm">View Pending</Link>
            </div>
            <div className="card-body">
              {orders.length === 0 ? (
                <div className="alert alert-info">No orders found.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(order => (
                        <tr key={order._id}>
                          <td><code>{order._id.substring(0, 8)}...</code></td>
                          <td>{order.customerId?.username || 'N/A'}</td>
                          <td><span className="badge bg-info">{order.status.toUpperCase()}</span></td>
                          <td>{new Date(order.orderDate).toLocaleDateString()}</td>
                          <td>
                            <Link to={`/manager/order/${order._id}`} className="btn btn-sm btn-outline-primary">
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
EOF

# Manager Pending
cat > src/pages/manager/Pending.jsx << 'EOF'
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { managerAPI } from '../../services/api';
import { useFlash } from '../../context/FlashContext';

const Pending = () => {
  const { showFlash } = useFlash();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  const fetchPendingOrders = async () => {
    try {
      setLoading(true);
      const data = await managerAPI.getPendingOrders();
      setOrders(data.orders || []);
    } catch (error) {
      showFlash('Failed to load pending orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (orderId, designerId) => {
    try {
      await managerAPI.assignOrder(orderId, designerId);
      showFlash('Order assigned successfully', 'success');
      fetchPendingOrders();
    } catch (error) {
      showFlash('Failed to assign order', 'error');
    }
  };

  return (
    <div className="container my-4">
      <div className="row mb-4">
        <div className="col-md-12">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <h2 className="card-title mb-0">Pending Orders</h2>
                <Link to="/manager/dashboard" className="btn btn-outline-primary">Back to Dashboard</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-12">
          <div className="card shadow-sm">
            <div className="card-body">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : orders.length === 0 ? (
                <div className="alert alert-info">No pending orders.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Items</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(order => (
                        <tr key={order._id}>
                          <td><code>{order._id.substring(0, 8)}...</code></td>
                          <td>{order.customerId?.username || 'N/A'}</td>
                          <td>{order.items?.length || 0}</td>
                          <td>{new Date(order.orderDate).toLocaleDateString()}</td>
                          <td>
                            <Link to={`/manager/order/${order._id}`} className="btn btn-sm btn-outline-primary">
                              View & Assign
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pending;
EOF

# Manager OrderDetails
cat > src/pages/manager/OrderDetails.jsx << 'EOF'
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { managerAPI } from '../../services/api';
import { formatPrice } from '../../utils/currency';
import { useFlash } from '../../context/FlashContext';

const OrderDetails = () => {
  const { id } = useParams();
  const { showFlash } = useFlash();
  const [order, setOrder] = useState(null);
  const [designers, setDesigners] = useState([]);
  const [selectedDesigner, setSelectedDesigner] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [orderData, designersData] = await Promise.all([
        managerAPI.getOrderById(id),
        managerAPI.getDesigners()
      ]);
      setOrder(orderData.order);
      setDesigners(designersData.designers || []);
    } catch (error) {
      showFlash('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedDesigner) {
      showFlash('Please select a designer', 'error');
      return;
    }

    try {
      await managerAPI.assignOrder(id, selectedDesigner);
      showFlash('Order assigned successfully', 'success');
      fetchData();
    } catch (error) {
      showFlash('Failed to assign order', 'error');
    }
  };

  if (loading) {
    return (
      <div className="container my-4">
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container my-4">
        <div className="alert alert-warning">Order not found</div>
        <Link to="/manager/dashboard" className="btn btn-primary">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="container my-4">
      <div className="row mb-4">
        <div className="col-md-12">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="card-title mb-2">Order Details</h2>
                  <p className="text-muted mb-0">Order ID: <code>{order._id}</code></p>
                </div>
                <Link to="/manager/dashboard" className="btn btn-outline-primary">Back to Dashboard</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-8">
          <div className="card shadow-sm">
            <div className="card-header">
              <h3>Order Items</h3>
            </div>
            <div className="card-body">
              {order.items && order.items.length > 0 ? (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Quantity</th>
                        <th>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.name || 'Custom Design'}</td>
                          <td>{item.quantity}</td>
                          <td>{formatPrice(item.price * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted">No items found</p>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm mb-3">
            <div className="card-header">
              <h3>Assign Designer</h3>
            </div>
            <div className="card-body">
              {order.status === 'pending' ? (
                <>
                  <select 
                    className="form-select mb-3"
                    value={selectedDesigner}
                    onChange={(e) => setSelectedDesigner(e.target.value)}
                  >
                    <option value="">Select Designer</option>
                    {designers.map(designer => (
                      <option key={designer._id} value={designer._id}>
                        {designer.username}
                      </option>
                    ))}
                  </select>
                  <button 
                    onClick={handleAssign}
                    className="btn btn-primary w-100"
                  >
                    Assign Order
                  </button>
                </>
              ) : (
                <div className="alert alert-info mb-0">
                  Order already assigned to: {order.designerId?.username || 'N/A'}
                </div>
              )}
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-header">
              <h3>Summary</h3>
            </div>
            <div className="card-body">
              <p className="mb-2"><strong>Status:</strong> <span className="badge bg-info">{order.status.toUpperCase()}</span></p>
              <p className="mb-2"><strong>Total:</strong> {formatPrice(order.totalPrice)}</p>
              <p className="mb-0 text-muted small">
                Ordered: {new Date(order.orderDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
EOF

echo "✓ All Manager pages created"

echo "✅ All role-specific pages created successfully!"
