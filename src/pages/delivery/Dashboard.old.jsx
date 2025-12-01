/**
 * Delivery Dashboard - Complete Workflow Implementation
 * Handles delivery of both Shop Orders and Custom Design Orders
 * - View assigned deliveries
 * - Pickup orders from manager
 * - Mark orders as delivered
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./DeliveryDashboard.css";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchDeliveryOrders,
  pickupOrder,
  deliverOrder,
  selectOrders,
  selectOrdersLoading,
} from "../../store/slices/ordersSlice";
import { useAuth } from "../../context/AuthContext";
import { formatPrice } from "../../utils/currency";
import LoadingSpinner from "../../components/LoadingSpinner";
import "./DeliveryDashboard.css";

const Dashboard = () => {
  const { user } = useAuth();
  const dispatch = useDispatch();

  const orders = useSelector(selectOrders);
  const loading = useSelector(selectOrdersLoading);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [deliveredTo, setDeliveredTo] = useState("");
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    dispatch(fetchDeliveryOrders());
  }, [dispatch]);

  // Detect order type
  const isCustomOrder = (order) => {
    return order.items?.some((item) => item.designId && !item.productId);
  };

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    if (filterStatus === "all") return true;
    return order.status === filterStatus;
  });

  // Calculate statistics
  const stats = {
    readyForPickup: orders.filter((o) => o.status === "ready_for_delivery")
      .length,
    outForDelivery: orders.filter((o) => o.status === "out_for_delivery")
      .length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    total: orders.length,
  };

  // Actions
  const handlePickup = (orderId) => {
    if (window.confirm("Confirm pickup of this order?")) {
      dispatch(pickupOrder(orderId)).then(() => {
        dispatch(fetchDeliveryOrders());
      });
    }
  };

  const openDeliverModal = (order) => {
    setSelectedOrder(order);
    setDeliveryNotes("");
    setDeliveredTo(order.shippingAddress?.name || "");
    setShowDeliverModal(true);
  };

  const handleDeliver = () => {
    if (!selectedOrder) return;

    dispatch(
      deliverOrder({
        orderId: selectedOrder._id,
        deliveryNotes,
        deliveredTo,
      })
    ).then(() => {
      setShowDeliverModal(false);
      dispatch(fetchDeliveryOrders());
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      ready_for_delivery: "bg-info",
      out_for_delivery: "bg-primary",
      delivered: "bg-success",
    };
    return badges[status] || "bg-secondary";
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="delivery-dashboard">
      <div className="container-fluid my-4">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card dashboard-header shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                  <div>
                    <h2 className="mb-2">
                      <i className="fas fa-truck me-2"></i>
                      Delivery Dashboard
                    </h2>
                    <p className="text-muted mb-0">
                      Welcome, {user?.username}! Manage your delivery
                      assignments and track deliveries.
                    </p>
                  </div>
                  <div className="delivery-badge">
                    <i className="fas fa-shipping-fast"></i>
                    <span>Delivery Person</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="row mb-4">
          <div className="col-md-4 col-sm-6 mb-3">
            <div className="stat-card card shadow-sm border-left-info">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="stat-icon bg-info">
                    <i className="fas fa-box"></i>
                  </div>
                  <div className="ms-3">
                    <div className="stat-label">Ready for Pickup</div>
                    <div className="stat-value">{stats.readyForPickup}</div>
                    <small className="text-muted">Waiting at manager</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-4 col-sm-6 mb-3">
            <div className="stat-card card shadow-sm border-left-primary">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="stat-icon bg-primary">
                    <i className="fas fa-shipping-fast"></i>
                  </div>
                  <div className="ms-3">
                    <div className="stat-label">Out for Delivery</div>
                    <div className="stat-value">{stats.outForDelivery}</div>
                    <small className="text-muted">Currently delivering</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-4 col-sm-6 mb-3">
            <div className="stat-card card shadow-sm border-left-success">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="stat-icon bg-success">
                    <i className="fas fa-check-circle"></i>
                  </div>
                  <div className="ms-3">
                    <div className="stat-label">Delivered</div>
                    <div className="stat-value">{stats.delivered}</div>
                    <small className="text-muted">Successfully completed</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="row mb-3">
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-body">
                <label className="form-label fw-bold">Filter by Status</label>
                <select
                  className="form-select"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Deliveries</option>
                  <option value="ready_for_delivery">Ready for Pickup</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Grid */}
        <div className="row">
          {filteredOrders.length === 0 ? (
            <div className="col-12">
              <div className="card shadow-sm">
                <div className="card-body text-center py-5">
                  <i className="fas fa-inbox fa-4x text-muted mb-3"></i>
                  <h4 className="text-muted">No deliveries found</h4>
                  <p className="text-muted">
                    {filterStatus === "all"
                      ? "You have no assigned deliveries at the moment"
                      : "No deliveries with this status"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div key={order._id} className="col-lg-6 mb-4">
                <div className="delivery-card card shadow-sm h-100">
                  <div className="card-header bg-white">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h5 className="mb-0">
                          Order #{order._id.substring(0, 8)}
                        </h5>
                        <small className="text-muted">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </small>
                      </div>
                      <div>
                        <span
                          className={`badge ${getStatusBadge(
                            order.status
                          )} me-2`}
                        >
                          {order.status.replace(/_/g, " ")}
                        </span>
                        {isCustomOrder(order) ? (
                          <span className="badge bg-purple">
                            <i className="fas fa-palette me-1"></i>
                            Custom
                          </span>
                        ) : (
                          <span className="badge bg-teal">
                            <i className="fas fa-store me-1"></i>
                            Shop
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="card-body">
                    {/* Customer Info */}
                    <div className="delivery-section">
                      <h6 className="section-title">
                        <i className="fas fa-user me-2"></i>
                        Customer Information
                      </h6>
                      <div className="info-row">
                        <strong>{order.shippingAddress?.name || "N/A"}</strong>
                      </div>
                      <div className="info-row">
                        <i className="fas fa-phone me-2 text-muted"></i>
                        {order.shippingAddress?.phone || "N/A"}
                      </div>
                      <div className="info-row">
                        <i className="fas fa-envelope me-2 text-muted"></i>
                        {order.shippingAddress?.email || "N/A"}
                      </div>
                    </div>

                    {/* Delivery Address */}
                    <div className="delivery-section">
                      <h6 className="section-title">
                        <i className="fas fa-map-marker-alt me-2"></i>
                        Delivery Address
                      </h6>
                      <div className="address-box">
                        <div>{order.shippingAddress?.street}</div>
                        <div>
                          {order.shippingAddress?.city},{" "}
                          {order.shippingAddress?.state}
                        </div>
                        <div>PIN: {order.shippingAddress?.zipCode}</div>
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div className="delivery-section">
                      <h6 className="section-title">
                        <i className="fas fa-shopping-bag me-2"></i>
                        Order Summary
                      </h6>
                      {order.items?.slice(0, 2).map((item, idx) => (
                        <div key={idx} className="item-row">
                          <span>
                            {item.productId?.name ||
                              item.designId?.name ||
                              "Custom Design"}
                          </span>
                          <span className="text-muted">x{item.quantity}</span>
                        </div>
                      ))}
                      {order.items?.length > 2 && (
                        <div className="text-muted small">
                          +{order.items.length - 2} more items
                        </div>
                      )}
                    </div>

                    {/* Total Amount */}
                    <div className="order-total">
                      <strong>Total: </strong>
                      <span className="text-success fw-bold">
                        {formatPrice(order.totalAmount)}
                      </span>
                    </div>
                  </div>
                  <div className="card-footer bg-white">
                    <div className="d-flex gap-2 flex-wrap">
                      {/* Ready for pickup - Show Pickup button */}
                      {order.status === "ready_for_delivery" && (
                        <button
                          className="btn btn-primary flex-fill"
                          onClick={() => handlePickup(order._id)}
                        >
                          <i className="fas fa-hand-holding-box me-2"></i>
                          Pickup Order
                        </button>
                      )}

                      {/* Out for delivery - Show Deliver button */}
                      {order.status === "out_for_delivery" && (
                        <button
                          className="btn btn-success flex-fill"
                          onClick={() => openDeliverModal(order)}
                        >
                          <i className="fas fa-check-circle me-2"></i>
                          Mark as Delivered
                        </button>
                      )}

                      {/* Delivered - Show success message */}
                      {order.status === "delivered" && (
                        <div className="alert alert-success mb-0 flex-fill">
                          <i className="fas fa-check-double me-2"></i>
                          Delivery Completed
                        </div>
                      )}

                      {/* View Details button */}
                      <Link
                        to={`/delivery/orders/${order._id}`}
                        className="btn btn-outline-secondary"
                      >
                        <i className="fas fa-eye me-2"></i>
                        Details
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Deliver Modal */}
      {showDeliverModal && selectedOrder && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Confirm Delivery</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowDeliverModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <p className="text-muted">
                    Order: <strong>#{selectedOrder._id.substring(0, 8)}</strong>
                  </p>
                  <div className="alert alert-info">
                    <i className="fas fa-info-circle me-2"></i>
                    Please confirm that you have successfully delivered this
                    order to the customer.
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold">Delivered To</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Name of person who received"
                    value={deliveredTo}
                    onChange={(e) => setDeliveredTo(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold">
                    Delivery Notes (Optional)
                  </label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Add any notes about the delivery..."
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDeliverModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleDeliver}
                  disabled={!deliveredTo.trim()}
                >
                  <i className="fas fa-check-double me-2"></i>
                  Confirm Delivery
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
