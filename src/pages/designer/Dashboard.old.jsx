/**
 * Designer Dashboard - Complete Workflow Implementation
 * Handles custom design orders workflow:
 * - Accept assigned orders
 * - Start production
 * - Update progress (0-100%)
 * - Complete production and send back to manager
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchDesignerOrders,
  acceptOrder,
  startProduction,
  updateProgress,
  completeProduction,
  selectOrders,
  selectOrdersLoading,
} from "../../store/slices/ordersSlice";
import { useAuth } from "../../context/AuthContext";
import { formatPrice } from "../../utils/currency";
import LoadingSpinner from "../../components/LoadingSpinner";
import "./DesignerDashboard.css";

const Dashboard = () => {
  const { user } = useAuth();
  const dispatch = useDispatch();

  const orders = useSelector(selectOrders);
  const loading = useSelector(selectOrdersLoading);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [progressValue, setProgressValue] = useState(0);
  const [progressNote, setProgressNote] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  useEffect(() => {
    dispatch(fetchDesignerOrders());
  }, [dispatch]);

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    if (filterStatus === "all") return true;
    return order.status === filterStatus;
  });

  // Calculate statistics
  const stats = {
    pending: orders.filter((o) => o.status === "assigned_to_designer").length,
    accepted: orders.filter((o) => o.status === "designer_accepted").length,
    inProduction: orders.filter((o) => o.status === "in_production").length,
    completed: orders.filter((o) => o.status === "production_completed").length,
    total: orders.length,
  };

  // Actions
  const handleAcceptOrder = (orderId) => {
    dispatch(acceptOrder(orderId)).then(() => {
      dispatch(fetchDesignerOrders());
    });
  };

  const handleStartProduction = (orderId) => {
    dispatch(startProduction(orderId)).then(() => {
      dispatch(fetchDesignerOrders());
    });
  };

  const openProgressModal = (order) => {
    setSelectedOrder(order);
    setProgressValue(order.progressPercentage || 0);
    setProgressNote("");
    setShowProgressModal(true);
  };

  const handleUpdateProgress = () => {
    if (!selectedOrder) return;

    dispatch(
      updateProgress({
        orderId: selectedOrder._id,
        progressPercentage: progressValue,
        note: progressNote,
      })
    ).then(() => {
      setShowProgressModal(false);
      dispatch(fetchDesignerOrders());
    });
  };

  const openCompleteModal = (order) => {
    setSelectedOrder(order);
    setCompletionNotes("");
    setShowCompleteModal(true);
  };

  const handleCompleteProduction = () => {
    if (!selectedOrder) return;

    dispatch(
      completeProduction({
        orderId: selectedOrder._id,
        notes: completionNotes,
      })
    ).then(() => {
      setShowCompleteModal(false);
      dispatch(fetchDesignerOrders());
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      assigned_to_designer: "bg-warning text-dark",
      designer_accepted: "bg-info",
      in_production: "bg-primary",
      production_completed: "bg-success",
    };
    return badges[status] || "bg-secondary";
  };

  const getProgressColor = (progress) => {
    if (progress < 25) return "danger";
    if (progress < 50) return "warning";
    if (progress < 75) return "info";
    if (progress < 100) return "primary";
    return "success";
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="designer-dashboard">
      <div className="container-fluid my-4">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card dashboard-header shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                  <div>
                    <h2 className="mb-2">
                      <i className="fas fa-paint-brush me-2"></i>
                      Designer Workspace
                    </h2>
                    <p className="text-muted mb-0">
                      Welcome, {user?.username}! Manage your custom design
                      orders and track production progress.
                    </p>
                  </div>
                  <div className="designer-badge">
                    <i className="fas fa-palette"></i>
                    <span>Designer</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="row mb-4">
          <div className="col-md-3 col-sm-6 mb-3">
            <div className="stat-card card shadow-sm border-left-warning">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="stat-icon bg-warning">
                    <i className="fas fa-clock"></i>
                  </div>
                  <div className="ms-3">
                    <div className="stat-label">Pending</div>
                    <div className="stat-value">{stats.pending}</div>
                    <small className="text-muted">Awaiting acceptance</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-3 col-sm-6 mb-3">
            <div className="stat-card card shadow-sm border-left-info">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="stat-icon bg-info">
                    <i className="fas fa-check-circle"></i>
                  </div>
                  <div className="ms-3">
                    <div className="stat-label">Accepted</div>
                    <div className="stat-value">{stats.accepted}</div>
                    <small className="text-muted">Ready to start</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-3 col-sm-6 mb-3">
            <div className="stat-card card shadow-sm border-left-primary">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="stat-icon bg-primary">
                    <i className="fas fa-cogs"></i>
                  </div>
                  <div className="ms-3">
                    <div className="stat-label">In Production</div>
                    <div className="stat-value">{stats.inProduction}</div>
                    <small className="text-muted">Currently working</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-3 col-sm-6 mb-3">
            <div className="stat-card card shadow-sm border-left-success">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="stat-icon bg-success">
                    <i className="fas fa-check-double"></i>
                  </div>
                  <div className="ms-3">
                    <div className="stat-label">Completed</div>
                    <div className="stat-value">{stats.completed}</div>
                    <small className="text-muted">Sent to manager</small>
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
                  <option value="all">All Orders</option>
                  <option value="assigned_to_designer">
                    Pending (Need Acceptance)
                  </option>
                  <option value="designer_accepted">
                    Accepted (Need to Start)
                  </option>
                  <option value="in_production">In Production</option>
                  <option value="production_completed">Completed</option>
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
                  <h4 className="text-muted">No orders found</h4>
                  <p className="text-muted">
                    {filterStatus === "all"
                      ? "You have no assigned orders at the moment"
                      : "No orders with this status"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div key={order._id} className="col-lg-6 mb-4">
                <div className="order-card card shadow-sm h-100">
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
                      <span className={`badge ${getStatusBadge(order.status)}`}>
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                  <div className="card-body">
                    {/* Customer Info */}
                    <div className="mb-3">
                      <small className="text-muted d-block">Customer</small>
                      <strong>{order.userId?.name || "N/A"}</strong>
                    </div>

                    {/* Order Items */}
                    <div className="mb-3">
                      <small className="text-muted d-block mb-2">Items</small>
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="item-row mb-2">
                          <div className="d-flex justify-content-between">
                            <span>
                              {item.designId?.name || "Custom Design"}
                              <small className="text-muted ms-2">
                                x{item.quantity}
                              </small>
                            </span>
                            <span className="fw-bold">
                              {formatPrice(item.price * item.quantity)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Progress Bar (for in production orders) */}
                    {order.status === "in_production" && (
                      <div className="mb-3">
                        <div className="d-flex justify-content-between mb-2">
                          <small className="text-muted">Progress</small>
                          <small className="fw-bold">
                            {order.progressPercentage || 0}%
                          </small>
                        </div>
                        <div className="progress" style={{ height: "10px" }}>
                          <div
                            className={`progress-bar progress-bar-striped progress-bar-animated bg-${getProgressColor(
                              order.progressPercentage || 0
                            )}`}
                            role="progressbar"
                            style={{
                              width: `${order.progressPercentage || 0}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Total Amount */}
                    <div className="order-total">
                      <strong>Total: </strong>
                      <span className="text-primary fw-bold">
                        {formatPrice(order.totalAmount)}
                      </span>
                    </div>
                  </div>
                  <div className="card-footer bg-white">
                    <div className="d-flex gap-2 flex-wrap">
                      {/* Pending - Show Accept button */}
                      {order.status === "assigned_to_designer" && (
                        <button
                          className="btn btn-success flex-fill"
                          onClick={() => handleAcceptOrder(order._id)}
                        >
                          <i className="fas fa-check me-2"></i>
                          Accept Order
                        </button>
                      )}

                      {/* Accepted - Show Start Production button */}
                      {order.status === "designer_accepted" && (
                        <button
                          className="btn btn-primary flex-fill"
                          onClick={() => handleStartProduction(order._id)}
                        >
                          <i className="fas fa-play me-2"></i>
                          Start Production
                        </button>
                      )}

                      {/* In Production - Show Update Progress and Complete buttons */}
                      {order.status === "in_production" && (
                        <>
                          <button
                            className="btn btn-info flex-fill"
                            onClick={() => openProgressModal(order)}
                          >
                            <i className="fas fa-tasks me-2"></i>
                            Update Progress
                          </button>
                          {order.progressPercentage >= 100 && (
                            <button
                              className="btn btn-success flex-fill"
                              onClick={() => openCompleteModal(order)}
                            >
                              <i className="fas fa-check-double me-2"></i>
                              Complete
                            </button>
                          )}
                        </>
                      )}

                      {/* View Details button (always available) */}
                      <Link
                        to={`/designer/orders/${order._id}`}
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

      {/* Progress Update Modal */}
      {showProgressModal && selectedOrder && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Update Production Progress</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowProgressModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <p className="text-muted">
                    Order: <strong>#{selectedOrder._id.substring(0, 8)}</strong>
                  </p>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold">
                    Progress Percentage: {progressValue}%
                  </label>
                  <input
                    type="range"
                    className="form-range"
                    min="0"
                    max="100"
                    step="5"
                    value={progressValue}
                    onChange={(e) => setProgressValue(Number(e.target.value))}
                  />
                  <div className="progress mt-2" style={{ height: "20px" }}>
                    <div
                      className={`progress-bar bg-${getProgressColor(
                        progressValue
                      )}`}
                      role="progressbar"
                      style={{ width: `${progressValue}%` }}
                    >
                      {progressValue}%
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold">Note (Optional)</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Add a note about current progress..."
                    value={progressNote}
                    onChange={(e) => setProgressNote(e.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowProgressModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleUpdateProgress}
                >
                  <i className="fas fa-save me-2"></i>
                  Update Progress
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complete Production Modal */}
      {showCompleteModal && selectedOrder && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Complete Production</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowCompleteModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <p className="text-muted">
                    Order: <strong>#{selectedOrder._id.substring(0, 8)}</strong>
                  </p>
                  <div className="alert alert-success">
                    <i className="fas fa-check-circle me-2"></i>
                    This will mark the order as completed and send it back to
                    the manager for delivery assignment.
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold">
                    Completion Notes (Optional)
                  </label>
                  <textarea
                    className="form-control"
                    rows="4"
                    placeholder="Add final notes about the completed work..."
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCompleteModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleCompleteProduction}
                >
                  <i className="fas fa-check-double me-2"></i>
                  Complete Production
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
