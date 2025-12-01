#!/bin/bash

# Admin Dashboard
cat > src/pages/admin/Dashboard.jsx << 'EOF'
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { formatPrice } from '../../utils/currency';
import { useFlash } from '../../context/FlashContext';

const Dashboard = () => {
  const { showFlash } = useFlash();
  const [stats, setStats] = useState({});
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getDashboard();
      setStats(data.stats || {});
      setRecentOrders(data.recentOrders || []);
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
              <h2 className="card-title">Admin Dashboard</h2>
              <p className="card-text">System overview and management</p>
            </div>
          </div>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <h5 className="card-title">Total Users</h5>
              <h2 className="text-primary">{stats.totalUsers || 0}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <h5 className="card-title">Total Orders</h5>
              <h2 className="text-info">{stats.totalOrders || 0}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <h5 className="card-title">Total Revenue</h5>
              <h2 className="text-success">{formatPrice(stats.totalRevenue || 0)}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <h5 className="card-title">Pending Managers</h5>
              <h2 className="text-warning">{stats.pendingManagers || 0}</h2>
            </div>
          </div>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-md-12">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="row text-center">
                <div className="col-md-3">
                  <Link to="/admin/orders" className="btn btn-outline-primary btn-lg w-100 mb-2">
                    <i className="fas fa-shopping-cart me-2"></i>
                    Manage Orders
                  </Link>
                </div>
                <div className="col-md-3">
                  <Link to="/admin/products" className="btn btn-outline-success btn-lg w-100 mb-2">
                    <i className="fas fa-box me-2"></i>
                    Manage Products
                  </Link>
                </div>
                <div className="col-md-3">
                  <Link to="/admin/pending-managers" className="btn btn-outline-warning btn-lg w-100 mb-2">
                    <i className="fas fa-user-check me-2"></i>
                    Approve Managers
                  </Link>
                </div>
                <div className="col-md-3">
                  <Link to="/admin/feedbacks" className="btn btn-outline-info btn-lg w-100 mb-2">
                    <i className="fas fa-comments me-2"></i>
                    View Feedbacks
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-12">
          <div className="card shadow-sm">
            <div className="card-header">
              <h3>Recent Orders</h3>
            </div>
            <div className="card-body">
              {recentOrders.length === 0 ? (
                <div className="alert alert-info">No recent orders.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map(order => (
                        <tr key={order._id}>
                          <td><code>{order._id.substring(0, 8)}...</code></td>
                          <td>{order.customerId?.username || 'N/A'}</td>
                          <td>{formatPrice(order.totalPrice)}</td>
                          <td><span className="badge bg-info">{order.status.toUpperCase()}</span></td>
                          <td>{new Date(order.orderDate).toLocaleDateString()}</td>
                          <td>
                            <Link to={`/admin/order/${order._id}`} className="btn btn-sm btn-outline-primary">
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

# Admin Orders
cat > src/pages/admin/Orders.jsx << 'EOF'
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { formatPrice } from '../../utils/currency';
import { useFlash } from '../../context/FlashContext';

const Orders = () => {
  const { showFlash } = useFlash();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getOrders({ status: filter === 'all' ? '' : filter });
      setOrders(data.orders || []);
    } catch (error) {
      showFlash('Failed to load orders', 'error');
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
              <div className="d-flex justify-content-between align-items-center">
                <h2 className="card-title mb-0">All Orders</h2>
                <Link to="/admin/dashboard" className="btn btn-outline-primary">Back to Dashboard</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-md-12">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="btn-group" role="group">
                <button 
                  className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setFilter('all')}
                >
                  All
                </button>
                <button 
                  className={`btn ${filter === 'pending' ? 'btn-warning' : 'btn-outline-warning'}`}
                  onClick={() => setFilter('pending')}
                >
                  Pending
                </button>
                <button 
                  className={`btn ${filter === 'in_production' ? 'btn-info' : 'btn-outline-info'}`}
                  onClick={() => setFilter('in_production')}
                >
                  In Production
                </button>
                <button 
                  className={`btn ${filter === 'completed' ? 'btn-success' : 'btn-outline-success'}`}
                  onClick={() => setFilter('completed')}
                >
                  Completed
                </button>
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
                <div className="alert alert-info">No orders found.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Items</th>
                        <th>Total</th>
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
                          <td>{order.items?.length || 0}</td>
                          <td>{formatPrice(order.totalPrice)}</td>
                          <td><span className="badge bg-info">{order.status.toUpperCase()}</span></td>
                          <td>{new Date(order.orderDate).toLocaleDateString()}</td>
                          <td>
                            <Link to={`/admin/order/${order._id}`} className="btn btn-sm btn-outline-primary">
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

export default Orders;
EOF

# Admin Products
cat > src/pages/admin/Products.jsx << 'EOF'
import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { formatPrice } from '../../utils/currency';
import { useFlash } from '../../context/FlashContext';
import { Link } from 'react-router-dom';

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
      const data = await adminAPI.getProducts();
      setProducts(data.products || []);
    } catch (error) {
      showFlash('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStock = async (productId, currentStatus) => {
    try {
      await adminAPI.updateProductStock(productId, !currentStatus);
      showFlash('Product stock updated', 'success');
      fetchProducts();
    } catch (error) {
      showFlash('Failed to update product', 'error');
    }
  };

  return (
    <div className="container my-4">
      <div className="row mb-4">
        <div className="col-md-12">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <h2 className="card-title mb-0">Manage Products</h2>
                <Link to="/admin/dashboard" className="btn btn-outline-primary">Back to Dashboard</Link>
              </div>
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
                  <p className="card-text text-muted small">{product.category} - {product.gender}</p>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="h5 mb-0">{formatPrice(product.price)}</span>
                    <span className={`badge ${product.inStock ? 'bg-success' : 'bg-danger'}`}>
                      {product.inStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleToggleStock(product._id, product.inStock)}
                    className={`btn btn-sm w-100 ${product.inStock ? 'btn-outline-danger' : 'btn-outline-success'}`}
                  >
                    {product.inStock ? 'Mark Out of Stock' : 'Mark In Stock'}
                  </button>
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

# Admin PendingManagers
cat > src/pages/admin/PendingManagers.jsx << 'EOF'
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { useFlash } from '../../context/FlashContext';

const PendingManagers = () => {
  const { showFlash } = useFlash();
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingManagers();
  }, []);

  const fetchPendingManagers = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getPendingManagers();
      setManagers(data.managers || []);
    } catch (error) {
      showFlash('Failed to load pending managers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (managerId) => {
    try {
      await adminAPI.approveManager(managerId);
      showFlash('Manager approved successfully', 'success');
      fetchPendingManagers();
    } catch (error) {
      showFlash('Failed to approve manager', 'error');
    }
  };

  const handleReject = async (managerId) => {
    if (!window.confirm('Are you sure you want to reject this manager application?')) return;
    
    try {
      await adminAPI.rejectManager(managerId);
      showFlash('Manager application rejected', 'success');
      fetchPendingManagers();
    } catch (error) {
      showFlash('Failed to reject manager', 'error');
    }
  };

  return (
    <div className="container my-4">
      <div className="row mb-4">
        <div className="col-md-12">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <h2 className="card-title mb-0">Pending Manager Approvals</h2>
                <Link to="/admin/dashboard" className="btn btn-outline-primary">Back to Dashboard</Link>
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
              ) : managers.length === 0 ? (
                <div className="alert alert-info">No pending manager applications.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Contact</th>
                        <th>Registered On</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {managers.map(manager => (
                        <tr key={manager._id}>
                          <td>{manager.username}</td>
                          <td>{manager.email}</td>
                          <td>{manager.contactNumber || 'N/A'}</td>
                          <td>{new Date(manager.createdAt).toLocaleDateString()}</td>
                          <td>
                            <button 
                              onClick={() => handleApprove(manager._id)}
                              className="btn btn-sm btn-success me-2"
                            >
                              <i className="fas fa-check me-1"></i> Approve
                            </button>
                            <button 
                              onClick={() => handleReject(manager._id)}
                              className="btn btn-sm btn-danger"
                            >
                              <i className="fas fa-times me-1"></i> Reject
                            </button>
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

export default PendingManagers;
EOF

# Admin Feedbacks
cat > src/pages/admin/Feedbacks.jsx << 'EOF'
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { useFlash } from '../../context/FlashContext';

const Feedbacks = () => {
  const { showFlash } = useFlash();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getFeedbacks();
      setFeedbacks(data.feedbacks || []);
    } catch (error) {
      showFlash('Failed to load feedbacks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <i 
        key={i} 
        className={`fas fa-star ${i < rating ? 'text-warning' : 'text-muted'}`}
      ></i>
    ));
  };

  return (
    <div className="container my-4">
      <div className="row mb-4">
        <div className="col-md-12">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <h2 className="card-title mb-0">Customer Feedbacks</h2>
                <Link to="/admin/dashboard" className="btn btn-outline-primary">Back to Dashboard</Link>
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
              ) : feedbacks.length === 0 ? (
                <div className="alert alert-info">No feedbacks yet.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Order ID</th>
                        <th>Rating</th>
                        <th>Comment</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feedbacks.map(feedback => (
                        <tr key={feedback._id}>
                          <td>{feedback.customerId?.username || 'Anonymous'}</td>
                          <td><code>{feedback.orderId?.toString().substring(0, 8)}...</code></td>
                          <td>{renderStars(feedback.rating)}</td>
                          <td>{feedback.comment || 'No comment'}</td>
                          <td>{new Date(feedback.createdAt).toLocaleDateString()}</td>
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

export default Feedbacks;
EOF

# Admin OrderDetails
cat > src/pages/admin/OrderDetails.jsx << 'EOF'
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
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
      const data = await adminAPI.getOrderById(id);
      setOrder(data.order);
    } catch (error) {
      showFlash('Failed to load order details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      await adminAPI.updateOrderStatus(id, newStatus);
      showFlash('Order status updated', 'success');
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
        <Link to="/admin/orders" className="btn btn-primary">Back to Orders</Link>
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
                <Link to="/admin/orders" className="btn btn-outline-primary">Back to Orders</Link>
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

          <div className="card shadow-sm">
            <div className="card-header">
              <h3>Customer Information</h3>
            </div>
            <div className="card-body">
              <p className="mb-2"><strong>Name:</strong> {order.customerId?.username || 'N/A'}</p>
              <p className="mb-2"><strong>Email:</strong> {order.customerId?.email || 'N/A'}</p>
              <p className="mb-0"><strong>Contact:</strong> {order.customerId?.contactNumber || 'N/A'}</p>
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
                <select 
                  className="form-select mb-2"
                  value={order.status}
                  onChange={(e) => handleStatusUpdate(e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_production">In Production</option>
                  <option value="completed">Completed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              
              <p className="mt-3 mb-0 text-muted small">
                Ordered: {new Date(order.orderDate).toLocaleDateString()}
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

echo "✅ All Admin pages created successfully!"
