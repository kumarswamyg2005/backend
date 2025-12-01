/**
 * Admin Dashboard Component - Redux Version
 * Demonstrates complete Redux integration with:
 * - useSelector for state management
 * - useDispatch for actions
 * - Async thunks for API calls
 * - Loading and error states
 * - Reusable components
 */

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

// Redux slices
import {
  fetchAllOrders,
  selectOrders,
  selectOrdersLoading,
  selectOrdersError,
  fetchOrderStatistics,
  selectOrderStatistics,
} from "../../store/slices/ordersSlice";
import {
  fetchProducts,
  selectProducts,
  selectProductsLoading,
} from "../../store/slices/productsSlice";
import { selectUser } from "../../store/slices/authSlice";
import { showToast } from "../../store/slices/uiSlice";

// Reusable components
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import DataTable from "../../components/DataTable";
import SearchBar from "../../components/SearchBar";

import { formatPrice } from "../../utils/currency";
import "./Dashboard.css";

const AdminDashboard = () => {
  const dispatch = useDispatch();

  // Redux state selectors
  const user = useSelector(selectUser);
  const orders = useSelector(selectOrders);
  const products = useSelector(selectProducts);
  const statistics = useSelector(selectOrderStatistics);
  const ordersLoading = useSelector(selectOrdersLoading);
  const productsLoading = useSelector(selectProductsLoading);
  const ordersError = useSelector(selectOrdersError);

  // Local state for filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredOrders, setFilteredOrders] = useState([]);

  // Fetch data on component mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Dispatch multiple async thunks
      await Promise.all([
        dispatch(fetchAllOrders("admin")).unwrap(),
        dispatch(fetchProducts()).unwrap(),
        dispatch(fetchOrderStatistics("admin")).unwrap(),
      ]);

      dispatch(
        showToast({
          message: "Dashboard data loaded successfully",
          type: "success",
        })
      );
    } catch (error) {
      dispatch(
        showToast({
          message: "Failed to load dashboard data",
          type: "error",
        })
      );
    }
  };

  // Filter orders based on search
  useEffect(() => {
    if (searchTerm) {
      const filtered = orders.filter(
        (order) =>
          order._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.status.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOrders(filtered);
    } else {
      setFilteredOrders(orders);
    }
  }, [searchTerm, orders]);

  // Table columns configuration
  const orderColumns = [
    {
      key: "_id",
      label: "Order ID",
      sortable: true,
      render: (value) => (
        <code className="order-id">{value.substring(0, 8)}...</code>
      ),
    },
    {
      key: "user",
      label: "Customer",
      render: (user) => user?.name || "N/A",
    },
    {
      key: "total",
      label: "Total",
      sortable: true,
      render: (value) => <strong>{formatPrice(value)}</strong>,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <span className={`badge badge-${getStatusColor(value)}`}>{value}</span>
      ),
    },
    {
      key: "createdAt",
      label: "Date",
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: "_id",
      label: "Actions",
      render: (value) => (
        <Link to={`/admin/orders/${value}`} className="btn btn-sm btn-primary">
          View
        </Link>
      ),
    },
  ];

  const getStatusColor = (status) => {
    const colors = {
      pending: "warning",
      assigned: "info",
      in_production: "primary",
      completed: "success",
      shipped: "info",
      out_for_delivery: "secondary",
      delivered: "success",
      cancelled: "danger",
    };
    return colors[status] || "secondary";
  };

  // Handle retry on error
  const handleRetry = () => {
    loadDashboardData();
  };

  // Show loading state
  if (ordersLoading && orders.length === 0) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  // Show error state
  if (ordersError && orders.length === 0) {
    return <ErrorMessage error={ordersError} onRetry={handleRetry} fullPage />;
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>
            <i className="fas fa-chart-line"></i> Admin Analytics Dashboard
          </h1>
          <p className="subtitle">
            Overview of business performance and metrics
          </p>
          <small className="info-text">
            <i className="fas fa-info-circle"></i> Order management is handled
            by managers. Product stock is managed by designers.
          </small>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card revenue">
          <div className="stat-content">
            <div className="stat-info">
              <h6>Total Revenue</h6>
              <h2>{formatPrice(statistics.revenue || 0)}</h2>
              <small className="trend-up">
                <i className="fas fa-arrow-up"></i> All time
              </small>
            </div>
            <div className="stat-icon">
              <i className="fas fa-rupee-sign"></i>
            </div>
          </div>
        </div>

        <div className="stat-card orders">
          <div className="stat-content">
            <div className="stat-info">
              <h6>Total Orders</h6>
              <h2>{statistics.total || orders.length}</h2>
              <small className="trend-neutral">
                <i className="fas fa-shopping-bag"></i> All time
              </small>
            </div>
            <div className="stat-icon">
              <i className="fas fa-receipt"></i>
            </div>
          </div>
        </div>

        <div className="stat-card products">
          <div className="stat-content">
            <div className="stat-info">
              <h6>Total Products</h6>
              <h2>{products.length}</h2>
              <small className="trend-neutral">
                <i className="fas fa-box"></i> In catalog
              </small>
            </div>
            <div className="stat-icon">
              <i className="fas fa-shopping-cart"></i>
            </div>
          </div>
        </div>

        <div className="stat-card pending">
          <div className="stat-content">
            <div className="stat-info">
              <h6>Pending Orders</h6>
              <h2>{statistics.pending || 0}</h2>
              <small className="trend-warning">
                <i className="fas fa-clock"></i> Needs attention
              </small>
            </div>
            <div className="stat-icon">
              <i className="fas fa-exclamation-circle"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          <Link to="/admin/orders" className="action-card">
            <i className="fas fa-list"></i>
            <span>View All Orders</span>
          </Link>
          <Link to="/admin/products" className="action-card">
            <i className="fas fa-box"></i>
            <span>Manage Products</span>
          </Link>
          <Link to="/admin/pending-managers" className="action-card">
            <i className="fas fa-user-check"></i>
            <span>Approve Managers</span>
          </Link>
          <Link to="/admin/feedbacks" className="action-card">
            <i className="fas fa-comments"></i>
            <span>View Feedbacks</span>
          </Link>
          <Link to="/admin/analytics" className="action-card">
            <i className="fas fa-chart-bar"></i>
            <span>Analytics</span>
          </Link>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="recent-orders">
        <div className="section-header">
          <h3>Recent Orders</h3>
          <SearchBar placeholder="Search orders..." onSearch={setSearchTerm} />
        </div>

        <DataTable
          data={filteredOrders.slice(0, 10)}
          columns={orderColumns}
          loading={ordersLoading}
          pagination={false}
          onRowClick={(order) =>
            (window.location.href = `/admin/orders/${order._id}`)
          }
          emptyMessage="No orders found"
        />

        <div className="table-footer">
          <Link to="/admin/orders" className="btn-view-all">
            View All Orders <i className="fas fa-arrow-right"></i>
          </Link>
        </div>
      </div>

      {/* Low Stock Alert */}
      <div className="low-stock-alert">
        <h3>
          <i className="fas fa-exclamation-triangle"></i> Low Stock Alert
        </h3>
        <div className="stock-list">
          {products
            .filter((p) => p.stock < 10)
            .slice(0, 5)
            .map((product) => (
              <div key={product._id} className="stock-item">
                <div className="product-info">
                  <img src={product.images?.[0]} alt={product.name} />
                  <div>
                    <strong>{product.name}</strong>
                    <small>Stock: {product.stock} units</small>
                  </div>
                </div>
                <Link to={`/admin/products`} className="btn-restock">
                  Manage
                </Link>
              </div>
            ))}
          {products.filter((p) => p.stock < 10).length === 0 && (
            <p className="text-muted">All products are well stocked!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
