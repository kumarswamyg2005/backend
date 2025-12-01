/**
 * Manager Dashboard - Complete Workflow Implementation
 * Handles both Shop Orders and Custom Design Orders
 * Can assign designers (custom orders) and delivery persons (both types)
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAllOrders,
  assignOrderToDesigner,
  assignOrderToDelivery,
  fetchDesigners,
  fetchDeliveryPersons,
  selectOrders,
  selectOrdersLoading,
  selectDesigners,
  selectDeliveryPersons,
} from "../../store/slices/ordersSlice";
import { useAuth } from "../../context/AuthContext";
import { formatPrice } from "../../utils/currency";
import LoadingSpinner from "../../components/LoadingSpinner";
import "./ManagerDashboard.css";

const Dashboard = () => {
  const { user } = useAuth();
  const dispatch = useDispatch();

  const orders = useSelector(selectOrders);
  const loading = useSelector(selectOrdersLoading);
  const designers = useSelector(selectDesigners);
  const deliveryPersons = useSelector(selectDeliveryPersons);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [assignType, setAssignType] = useState(null); // 'designer' or 'delivery'
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all"); // 'shop', 'custom', 'all'

  useEffect(() => {
    dispatch(fetchAllOrders("manager"));
    dispatch(fetchDesigners());
    dispatch(fetchDeliveryPersons());
  }, [dispatch]);

  // Detect order type
  const isCustomOrder = (order) => {
    return order.items?.some((item) => item.designId && !item.productId);
  };

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const statusMatch = filterStatus === "all" || order.status === filterStatus;
    const typeMatch =
      filterType === "all" ||
      (filterType === "custom" && isCustomOrder(order)) ||
      (filterType === "shop" && !isCustomOrder(order));
    return statusMatch && typeMatch;
  });

  // Calculate statistics
  const stats = {
    total: orders.length,
    pendingAssignment: orders.filter((o) => o.status === "assigned_to_manager")
      .length,
    awaitingProduction: orders.filter(
      (o) =>
        o.status === "assigned_to_designer" || o.status === "designer_accepted"
    ).length,
    inProduction: orders.filter((o) => o.status === "in_production").length,
    productionCompleted: orders.filter(
      (o) => o.status === "production_completed"
    ).length,
    readyForDelivery: orders.filter((o) => o.status === "ready_for_delivery")
      .length,
    outForDelivery: orders.filter((o) => o.status === "out_for_delivery")
      .length,
    delivered: orders.filter((o) => o.status === "delivered").length,
  };

  // Handle assignment
  const handleAssign = () => {
    if (!selectedOrder || !selectedPersonId) return;

    if (assignType === "designer") {
      dispatch(
        assignOrderToDesigner({
          orderId: selectedOrder._id,
          designerId: selectedPersonId,
        })
      ).then(() => {
        closeAssignModal();
        dispatch(fetchAllOrders("manager"));
      });
    } else if (assignType === "delivery") {
      dispatch(
        assignOrderToDelivery({
          orderId: selectedOrder._id,
          deliveryPersonId: selectedPersonId,
        })
      ).then(() => {
        closeAssignModal();
        dispatch(fetchAllOrders("manager"));
      });
    }
  };

  const openAssignModal = (order, type) => {
    setSelectedOrder(order);
    setAssignType(type);
    setSelectedPersonId("");
  };

  const closeAssignModal = () => {
    setSelectedOrder(null);
    setAssignType(null);
    setSelectedPersonId("");
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: "bg-secondary",
      assigned_to_manager: "bg-info",
      assigned_to_designer: "bg-primary",
      designer_accepted: "bg-success",
      in_production: "bg-warning text-dark",
      production_completed: "bg-success",
      ready_for_delivery: "bg-info",
      out_for_delivery: "bg-primary",
      delivered: "bg-success",
      cancelled: "bg-danger",
    };
    return badges[status] || "bg-secondary";
  };

  const canAssignDesigner = (order) => {
    return (
      isCustomOrder(order) &&
      order.status === "assigned_to_manager" &&
      !order.designerId
    );
  };

  const canAssignDelivery = (order) => {
    if (isCustomOrder(order)) {
      return order.status === "production_completed" && !order.deliveryPersonId;
    } else {
      return order.status === "assigned_to_manager" && !order.deliveryPersonId;
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="manager-dashboard">
      <div className="container-fluid my-4">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card dashboard-header shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                  <div>
                    <h2 className="mb-2">
                      <i className="fas fa-tasks me-2"></i>
                      Manager Dashboard
                    </h2>
                    <p className="text-muted mb-0">
                      Welcome, {user?.username}! Manage orders and assign tasks
                      to designers and delivery personnel.
                    </p>
                  </div>
                  <div className="d-flex gap-2">
                    <Link
                      to="/manager/orders"
                      className="btn btn-outline-primary"
                    >
                      <i className="fas fa-list me-2"></i>
                      All Orders
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="row mb-4">
          <div className="col-md-3 col-sm-6 mb-3">
            <div className="stat-card card shadow-sm border-left-info">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="stat-icon bg-info">
                    <i className="fas fa-inbox"></i>
                  </div>
                  <div className="ms-3">
                    <div className="stat-label">Pending Assignment</div>
                    <div className="stat-value">{stats.pendingAssignment}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-3 col-sm-6 mb-3">
            <div className="stat-card card shadow-sm border-left-warning">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="stat-icon bg-warning">
                    <i className="fas fa-paint-brush"></i>
                  </div>
                  <div className="ms-3">
                    <div className="stat-label">In Production</div>
                    <div className="stat-value">{stats.inProduction}</div>
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
                    <i className="fas fa-truck"></i>
                  </div>
                  <div className="ms-3">
                    <div className="stat-label">Ready for Delivery</div>
                    <div className="stat-value">{stats.readyForDelivery}</div>
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
                    <i className="fas fa-check-circle"></i>
                  </div>
                  <div className="ms-3">
                    <div className="stat-label">Delivered</div>
                    <div className="stat-value">{stats.delivered}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="row mb-3">
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold">
                      Filter by Status
                    </label>
                    <select
                      className="form-select"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="assigned_to_manager">
                        Pending Assignment
                      </option>
                      <option value="assigned_to_designer">
                        Assigned to Designer
                      </option>
                      <option value="designer_accepted">
                        Designer Accepted
                      </option>
                      <option value="in_production">In Production</option>
                      <option value="production_completed">
                        Production Completed
                      </option>
                      <option value="ready_for_delivery">
                        Ready for Delivery
                      </option>
                      <option value="out_for_delivery">Out for Delivery</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Filter by Type</label>
                    <select
                      className="form-select"
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                    >
                      <option value="all">All Orders</option>
                      <option value="shop">Shop Orders Only</option>
                      <option value="custom">Custom Orders Only</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="row">
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-header bg-white">
                <h5 className="mb-0">
                  <i className="fas fa-list me-2"></i>
                  Orders ({filteredOrders.length})
                </h5>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Order ID</th>
                        <th>Type</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Assigned To</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="text-center py-4">
                            <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                            <p className="text-muted">No orders found</p>
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((order) => (
                          <tr key={order._id}>
                            <td>
                              <Link
                                to={`/manager/orders/${order._id}`}
                                className="text-decoration-none fw-bold"
                              >
                                #{order._id.substring(0, 8)}
                              </Link>
                            </td>
                            <td>
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
                            </td>
                            <td>{order.userId?.name || "N/A"}</td>
                            <td className="fw-bold">
                              {formatPrice(order.totalAmount)}
                            </td>
                            <td>
                              <span
                                className={`badge ${getStatusBadge(
                                  order.status
                                )}`}
                              >
                                {order.status.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td>
                              <div className="assigned-personnel">
                                {order.designerId && (
                                  <small className="d-block text-muted">
                                    <i className="fas fa-paint-brush me-1"></i>
                                    Designer
                                  </small>
                                )}
                                {order.deliveryPersonId && (
                                  <small className="d-block text-muted">
                                    <i className="fas fa-truck me-1"></i>
                                    Delivery
                                  </small>
                                )}
                                {!order.designerId &&
                                  !order.deliveryPersonId && (
                                    <small className="text-muted">
                                      Unassigned
                                    </small>
                                  )}
                              </div>
                            </td>
                            <td>
                              <small>
                                {new Date(order.createdAt).toLocaleDateString()}
                              </small>
                            </td>
                            <td>
                              <div className="btn-group btn-group-sm">
                                {canAssignDesigner(order) && (
                                  <button
                                    className="btn btn-outline-primary"
                                    onClick={() =>
                                      openAssignModal(order, "designer")
                                    }
                                    title="Assign Designer"
                                  >
                                    <i className="fas fa-user-plus"></i>
                                  </button>
                                )}
                                {canAssignDelivery(order) && (
                                  <button
                                    className="btn btn-outline-success"
                                    onClick={() =>
                                      openAssignModal(order, "delivery")
                                    }
                                    title="Assign Delivery"
                                  >
                                    <i className="fas fa-truck"></i>
                                  </button>
                                )}
                                <Link
                                  to={`/manager/orders/${order._id}`}
                                  className="btn btn-outline-secondary"
                                  title="View Details"
                                >
                                  <i className="fas fa-eye"></i>
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assignment Modal */}
      {selectedOrder && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {assignType === "designer"
                    ? "Assign Designer"
                    : "Assign Delivery Person"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeAssignModal}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <p className="text-muted">
                    Order: <strong>#{selectedOrder._id.substring(0, 8)}</strong>
                  </p>
                  <p className="text-muted">
                    Type:{" "}
                    <strong>
                      {isCustomOrder(selectedOrder)
                        ? "Custom Design"
                        : "Shop Order"}
                    </strong>
                  </p>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold">
                    Select{" "}
                    {assignType === "designer" ? "Designer" : "Delivery Person"}
                  </label>
                  <select
                    className="form-select"
                    value={selectedPersonId}
                    onChange={(e) => setSelectedPersonId(e.target.value)}
                  >
                    <option value="">Choose...</option>
                    {assignType === "designer"
                      ? designers.map((designer) => (
                          <option key={designer._id} value={designer._id}>
                            {designer.name} ({designer.email})
                          </option>
                        ))
                      : deliveryPersons.map((person) => (
                          <option key={person._id} value={person._id}>
                            {person.name} ({person.email})
                          </option>
                        ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeAssignModal}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAssign}
                  disabled={!selectedPersonId}
                >
                  <i className="fas fa-check me-2"></i>
                  Assign
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
