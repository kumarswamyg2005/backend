/**
 * Order Tracking Page - Flipkart-like Real-World Tracking Experience
 * Features:
 * - Real-time order status tracking
 * - Visual timeline with delivery milestones
 * - Live location tracking (simulated)
 * - Production progress for custom orders
 * - Customer-Designer chat for custom orders
 * - Delivery partner information
 * - OTP display for delivery verification
 */

import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCompleteTracking,
  fetchOrderMessages,
  sendOrderMessage,
  selectTrackingData,
  selectMessages,
  selectOrdersLoading,
} from "../../store/slices/ordersSlice";
import { useAuth } from "../../context/AuthContext";
import { formatPrice } from "../../utils/currency";
import "./OrderTracking.css";

// Production milestones for custom orders
const PRODUCTION_MILESTONES = [
  {
    key: "design_review",
    label: "Design Review",
    icon: "bi-palette",
    description: "Reviewing your design specifications",
  },
  {
    key: "fabric_selection",
    label: "Fabric Selection",
    icon: "bi-layers",
    description: "Selecting premium fabric for your design",
  },
  {
    key: "cutting",
    label: "Cutting",
    icon: "bi-scissors",
    description: "Cutting fabric pieces as per design",
  },
  {
    key: "stitching",
    label: "Stitching",
    icon: "bi-needle",
    description: "Expert tailoring in progress",
  },
  {
    key: "embroidery",
    label: "Embroidery/Print",
    icon: "bi-brush",
    description: "Adding custom designs and prints",
  },
  {
    key: "finishing",
    label: "Finishing",
    icon: "bi-stars",
    description: "Final touches and refinements",
  },
  {
    key: "quality_check",
    label: "Quality Check",
    icon: "bi-check2-square",
    description: "Quality inspection before dispatch",
  },
  {
    key: "packaging",
    label: "Packaging",
    icon: "bi-box-seam",
    description: "Carefully packaging your order",
  },
  {
    key: "ready_for_pickup",
    label: "Ready for Delivery",
    icon: "bi-truck",
    description: "Waiting for delivery pickup",
  },
];

// Delivery timeline statuses
const DELIVERY_STATUSES = [
  { key: "confirmed", label: "Order Confirmed", icon: "bi-check-circle" },
  { key: "processing", label: "Processing", icon: "bi-gear" },
  { key: "ready_for_pickup", label: "Ready for Pickup", icon: "bi-box-seam" },
  { key: "picked_up", label: "Picked Up", icon: "bi-building" },
  { key: "in_transit", label: "In Transit", icon: "bi-truck" },
  { key: "out_for_delivery", label: "Out for Delivery", icon: "bi-bicycle" },
  { key: "delivered", label: "Delivered", icon: "bi-house-check" },
];

const OrderTracking = () => {
  const { orderId } = useParams();
  const dispatch = useDispatch();
  const { user } = useAuth();

  const trackingData = useSelector(selectTrackingData);
  const messages = useSelector(selectMessages);
  const loading = useSelector(selectOrdersLoading);

  const [activeTab, setActiveTab] = useState("tracking");
  const [newMessage, setNewMessage] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (orderId) {
      dispatch(fetchCompleteTracking(orderId));
    }
  }, [dispatch, orderId]);

  useEffect(() => {
    if (trackingData?.chat?.enabled) {
      dispatch(fetchOrderMessages(orderId));
    }
  }, [dispatch, orderId, trackingData?.chat?.enabled]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    await dispatch(sendOrderMessage({ orderId, message: newMessage }));
    setNewMessage("");
    dispatch(fetchOrderMessages(orderId));
  };

  // Get status index for progress
  const getStatusIndex = (currentStatus) => {
    const statusMap = {
      pending: 0,
      confirmed: 0,
      processing: 1,
      assigned_to_manager: 1,
      assigned_to_designer: 2,
      designer_accepted: 2,
      in_production: 2,
      production_completed: 3,
      ready_for_pickup: 3,
      picked_up: 4,
      in_transit: 5,
      out_for_delivery: 6,
      delivered: 7,
    };
    return statusMap[currentStatus] || 0;
  };

  if (loading && !trackingData) {
    return (
      <div className="order-tracking-page">
        <div className="container py-5">
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading order details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!trackingData) {
    return (
      <div className="order-tracking-page">
        <div className="container py-5">
          <div className="text-center">
            <i className="bi bi-exclamation-circle display-1 text-warning"></i>
            <h3 className="mt-3">Order Not Found</h3>
            <p className="text-muted">
              Unable to find tracking information for this order.
            </p>
            <Link to="/customer/dashboard" className="btn btn-primary">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const {
    order,
    shipping,
    deliveryPartner,
    deliveryPerson,
    otp,
    liveTracking,
    production,
    timeline,
    chat,
    proofOfDelivery,
  } = trackingData;
  const isCustomOrder = order.orderType === "custom";
  const currentStatusIndex = getStatusIndex(order.status);

  return (
    <div className="order-tracking-page">
      <div className="container py-4">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="tracking-header card shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <Link
                        to="/customer/dashboard"
                        className="btn btn-sm btn-outline-secondary"
                      >
                        <i className="bi bi-arrow-left"></i>
                      </Link>
                      <h4 className="mb-0">
                        Order #{order.orderNumber || order.id?.substring(0, 8)}
                      </h4>
                    </div>
                    <p className="text-muted mb-0">
                      Placed on{" "}
                      {new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-end">
                    <span
                      className={`badge ${
                        order.status === "delivered"
                          ? "bg-success"
                          : "bg-primary"
                      } fs-6`}
                    >
                      {order.status.replace(/_/g, " ").toUpperCase()}
                    </span>
                    <p className="mb-0 mt-2 fw-bold">
                      {formatPrice(order.totalAmount)}
                    </p>
                  </div>
                </div>

                {/* Order Type Badge */}
                <div className="mt-3">
                  <span
                    className={`badge ${
                      isCustomOrder ? "bg-purple" : "bg-teal"
                    } me-2`}
                  >
                    {isCustomOrder
                      ? "🎨 Custom Design Order"
                      : "🛍️ Ready-made Product"}
                  </span>
                  <span
                    className={`badge ${
                      order.paymentStatus === "completed"
                        ? "bg-success"
                        : "bg-warning"
                    }`}
                  >
                    {order.paymentMethod?.toUpperCase()} - {order.paymentStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <ul className="nav nav-tabs mb-4">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "tracking" ? "active" : ""}`}
              onClick={() => setActiveTab("tracking")}
            >
              <i className="bi bi-geo-alt me-2"></i>Tracking
            </button>
          </li>
          {isCustomOrder && (
            <li className="nav-item">
              <button
                className={`nav-link ${
                  activeTab === "production" ? "active" : ""
                }`}
                onClick={() => setActiveTab("production")}
              >
                <i className="bi bi-gear me-2"></i>Production
                {production?.progress && (
                  <span className="badge bg-primary ms-2">
                    {production.progress}%
                  </span>
                )}
              </button>
            </li>
          )}
          {chat?.enabled && (
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === "chat" ? "active" : ""}`}
                onClick={() => setActiveTab("chat")}
              >
                <i className="bi bi-chat-dots me-2"></i>Chat
                {chat.unreadMessages > 0 && (
                  <span className="badge bg-danger ms-2">
                    {chat.unreadMessages}
                  </span>
                )}
              </button>
            </li>
          )}
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "details" ? "active" : ""}`}
              onClick={() => setActiveTab("details")}
            >
              <i className="bi bi-info-circle me-2"></i>Details
            </button>
          </li>
        </ul>

        <div className="row">
          {/* Main Content */}
          <div className="col-lg-8">
            {/* Tracking Tab */}
            {activeTab === "tracking" && (
              <div className="card shadow-sm mb-4">
                <div className="card-header bg-white">
                  <h5 className="mb-0">
                    <i className="bi bi-geo-alt me-2"></i>
                    Delivery Tracking
                  </h5>
                </div>
                <div className="card-body">
                  {/* Delivery Partner Info */}
                  {deliveryPartner && (
                    <div className="delivery-partner-info mb-4 p-3 bg-light rounded">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <span className="text-muted">Shipped via</span>
                          <h6 className="mb-0">{deliveryPartner.name}</h6>
                        </div>
                        <div className="text-end">
                          <span className="text-muted d-block">
                            Tracking ID
                          </span>
                          <code className="fs-6">
                            {deliveryPartner.trackingNumber}
                          </code>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Estimated Delivery */}
                  {shipping?.estimatedDelivery && (
                    <div className="estimated-delivery mb-4 p-3 bg-success bg-opacity-10 rounded">
                      <div className="d-flex align-items-center">
                        <i className="bi bi-calendar-check text-success fs-4 me-3"></i>
                        <div>
                          <span className="text-muted">Estimated Delivery</span>
                          <h6 className="mb-0 text-success">
                            {new Date(
                              shipping.estimatedDelivery.from
                            ).toLocaleDateString("en-IN", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })}
                            {" - "}
                            {new Date(
                              shipping.estimatedDelivery.to
                            ).toLocaleDateString("en-IN", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })}
                          </h6>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* OTP Display (When out for delivery) */}
                  {otp && order.status === "out_for_delivery" && (
                    <div className="otp-display mb-4 p-4 bg-warning bg-opacity-10 rounded text-center">
                      <i className="bi bi-shield-lock fs-1 text-warning d-block mb-2"></i>
                      <p className="mb-2">Delivery OTP</p>
                      <h2 className="mb-2 text-warning fw-bold">{otp}</h2>
                      <small className="text-muted">
                        Share this OTP with delivery person for verification
                      </small>
                    </div>
                  )}

                  {/* Live Tracking */}
                  {liveTracking?.isActive && (
                    <div className="live-tracking mb-4 p-3 border rounded">
                      <div className="d-flex align-items-center mb-2">
                        <span className="live-indicator me-2"></span>
                        <h6 className="mb-0">Live Tracking Active</h6>
                      </div>
                      <p className="mb-0 text-muted">
                        <i className="bi bi-geo me-2"></i>
                        {liveTracking.currentLocation?.address ||
                          "Updating location..."}
                      </p>
                      {/* Map Placeholder */}
                      <div
                        className="map-placeholder mt-3 bg-light rounded d-flex align-items-center justify-content-center"
                        style={{ height: "200px" }}
                      >
                        <div className="text-center text-muted">
                          <i className="bi bi-map display-4"></i>
                          <p className="mb-0 mt-2">Live Map View</p>
                          <small>(Simulated for demo)</small>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Delivery Person Info */}
                  {deliveryPerson && (
                    <div className="delivery-person mb-4 p-3 border rounded">
                      <div className="d-flex align-items-center">
                        <div className="delivery-avatar me-3">
                          <i className="bi bi-person-circle fs-1"></i>
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="mb-0">{deliveryPerson.name}</h6>
                          <span className="text-muted">
                            Your Delivery Partner
                          </span>
                        </div>
                        {deliveryPerson.phone && (
                          <a
                            href={`tel:${deliveryPerson.phone}`}
                            className="btn btn-outline-success"
                          >
                            <i className="bi bi-telephone me-1"></i>Call
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Delivery Timeline */}
                  <div className="delivery-timeline">
                    <h6 className="mb-4">Order Journey</h6>
                    {DELIVERY_STATUSES.map((status, index) => {
                      const isCompleted = currentStatusIndex >= index;
                      const isCurrent = currentStatusIndex === index;
                      const timelineEntry = timeline?.find((t) =>
                        t.status?.includes(status.key)
                      );

                      return (
                        <div
                          key={status.key}
                          className={`timeline-item ${
                            isCompleted ? "completed" : ""
                          } ${isCurrent ? "current" : ""}`}
                        >
                          <div className="timeline-icon">
                            <i className={`bi ${status.icon}`}></i>
                          </div>
                          <div className="timeline-content">
                            <h6 className="mb-0">{status.label}</h6>
                            {timelineEntry && (
                              <>
                                <small className="text-muted d-block">
                                  {new Date(timelineEntry.at).toLocaleString(
                                    "en-IN"
                                  )}
                                </small>
                                {timelineEntry.location && (
                                  <small className="text-muted">
                                    <i className="bi bi-geo-alt me-1"></i>
                                    {timelineEntry.location}
                                  </small>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Proof of Delivery */}
                  {proofOfDelivery && (
                    <div className="proof-of-delivery mt-4 p-3 bg-success bg-opacity-10 rounded">
                      <h6 className="text-success mb-3">
                        <i className="bi bi-check-circle-fill me-2"></i>
                        Delivered Successfully
                      </h6>
                      <div className="row">
                        <div className="col-6">
                          <small className="text-muted">Received By</small>
                          <p className="mb-0 fw-semibold">
                            {proofOfDelivery.receivedBy}
                          </p>
                        </div>
                        <div className="col-6">
                          <small className="text-muted">Relationship</small>
                          <p className="mb-0">{proofOfDelivery.relationship}</p>
                        </div>
                        {proofOfDelivery.notes && (
                          <div className="col-12 mt-2">
                            <small className="text-muted">Notes</small>
                            <p className="mb-0">{proofOfDelivery.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Production Tab (Custom Orders) */}
            {activeTab === "production" && isCustomOrder && (
              <div className="card shadow-sm mb-4">
                <div className="card-header bg-white">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                      <i className="bi bi-gear me-2"></i>
                      Production Progress
                    </h5>
                    <span className="badge bg-primary fs-6">
                      {production?.progress || 0}%
                    </span>
                  </div>
                </div>
                <div className="card-body">
                  {/* Progress Bar */}
                  <div className="production-progress mb-4">
                    <div className="progress" style={{ height: "25px" }}>
                      <div
                        className="progress-bar bg-success progress-bar-striped progress-bar-animated"
                        style={{ width: `${production?.progress || 0}%` }}
                      >
                        {production?.progress || 0}% Complete
                      </div>
                    </div>
                  </div>

                  {/* Designer Info */}
                  {production?.designer && (
                    <div className="designer-info mb-4 p-3 bg-purple bg-opacity-10 rounded">
                      <div className="d-flex align-items-center">
                        <div className="designer-avatar me-3">
                          <i className="bi bi-palette fs-1 text-purple"></i>
                        </div>
                        <div>
                          <h6 className="mb-0">{production.designer.name}</h6>
                          <span className="text-muted">
                            Your Assigned Designer
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Current Milestone */}
                  {production?.currentMilestone && (
                    <div className="current-milestone mb-4 p-3 bg-info bg-opacity-10 rounded">
                      <div className="d-flex align-items-center">
                        <i className="bi bi-arrow-right-circle text-info fs-4 me-3"></i>
                        <div>
                          <small className="text-muted">
                            Currently Working On
                          </small>
                          <h6 className="mb-0 text-info">
                            {production.currentMilestone
                              .replace(/_/g, " ")
                              .toUpperCase()}
                          </h6>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Production Milestones */}
                  <div className="production-milestones">
                    <h6 className="mb-4">Production Stages</h6>
                    {PRODUCTION_MILESTONES.map((milestone) => {
                      const milestoneData = production?.milestones?.find(
                        (m) => m.name === milestone.key
                      );
                      const isCompleted = milestoneData?.status === "completed";
                      const isInProgress =
                        milestoneData?.status === "in_progress";

                      return (
                        <div
                          key={milestone.key}
                          className={`milestone-item ${
                            isCompleted ? "completed" : ""
                          } ${isInProgress ? "in-progress" : ""}`}
                        >
                          <div className="milestone-icon">
                            <i className={`bi ${milestone.icon}`}></i>
                          </div>
                          <div className="milestone-content">
                            <h6 className="mb-0">{milestone.label}</h6>
                            <small className="text-muted">
                              {milestone.description}
                            </small>
                            {milestoneData?.completedAt && (
                              <small className="d-block text-success">
                                Completed:{" "}
                                {new Date(
                                  milestoneData.completedAt
                                ).toLocaleDateString()}
                              </small>
                            )}
                            {milestoneData?.notes && (
                              <small className="d-block text-info mt-1">
                                <i className="bi bi-chat-left-text me-1"></i>
                                {milestoneData.notes}
                              </small>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Chat Tab */}
            {activeTab === "chat" && chat?.enabled && (
              <div className="card shadow-sm mb-4">
                <div className="card-header bg-white">
                  <h5 className="mb-0">
                    <i className="bi bi-chat-dots me-2"></i>
                    Chat with Designer
                  </h5>
                </div>
                <div className="card-body chat-container">
                  <div
                    className="chat-messages"
                    style={{ height: "400px", overflowY: "auto" }}
                  >
                    {messages.length === 0 ? (
                      <div className="text-center text-muted py-5">
                        <i className="bi bi-chat-left-text display-4"></i>
                        <p className="mt-3">
                          No messages yet. Start a conversation!
                        </p>
                      </div>
                    ) : (
                      messages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`message ${
                            msg.senderRole === "customer" ? "sent" : "received"
                          }`}
                        >
                          <div className="message-content">
                            <p className="mb-1">{msg.message}</p>
                            <small className="text-muted">
                              {new Date(msg.createdAt).toLocaleTimeString(
                                "en-IN",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </small>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef}></div>
                  </div>
                </div>
                <div className="card-footer bg-white">
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && handleSendMessage()
                      }
                    />
                    <button
                      className="btn btn-primary"
                      onClick={handleSendMessage}
                    >
                      <i className="bi bi-send"></i>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Details Tab */}
            {activeTab === "details" && (
              <div className="card shadow-sm mb-4">
                <div className="card-header bg-white">
                  <h5 className="mb-0">
                    <i className="bi bi-info-circle me-2"></i>
                    Order Details
                  </h5>
                </div>
                <div className="card-body">
                  {/* Order Items */}
                  <h6 className="mb-3">Items Ordered</h6>
                  {order.items?.map((item, idx) => (
                    <div
                      key={idx}
                      className="order-item d-flex align-items-center mb-3 p-2 border rounded"
                    >
                      <div className="item-image me-3">
                        <i className="bi bi-image display-6 text-muted"></i>
                      </div>
                      <div className="flex-grow-1">
                        <h6 className="mb-0">
                          {item.productId?.name ||
                            item.designId?.name ||
                            "Custom Design"}
                        </h6>
                        <small className="text-muted">
                          {item.size && `Size: ${item.size}`}
                          {item.color && ` | Color: ${item.color}`}
                          {` | Qty: ${item.quantity}`}
                        </small>
                      </div>
                      <div className="text-end">
                        <span className="fw-bold">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Shipping Address */}
                  <hr />
                  <h6 className="mb-3">Shipping Address</h6>
                  <div className="address-card p-3 bg-light rounded">
                    <p className="mb-1 fw-semibold">
                      {shipping?.address?.name}
                    </p>
                    <p className="mb-1">{shipping?.address?.street}</p>
                    {shipping?.address?.landmark && (
                      <p className="mb-1 text-muted">
                        Landmark: {shipping?.address?.landmark}
                      </p>
                    )}
                    <p className="mb-1">
                      {shipping?.address?.city}, {shipping?.address?.state} -{" "}
                      {shipping?.address?.zipCode}
                    </p>
                    <p className="mb-0">
                      <i className="bi bi-telephone me-1"></i>
                      {shipping?.address?.phone}
                    </p>
                  </div>

                  {/* Payment Info */}
                  <hr />
                  <h6 className="mb-3">Payment Information</h6>
                  <div className="payment-info p-3 bg-light rounded">
                    <div className="d-flex justify-content-between mb-2">
                      <span>Payment Method</span>
                      <span className="fw-semibold">
                        {order.paymentMethod?.toUpperCase()}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Payment Status</span>
                      <span
                        className={`badge ${
                          order.paymentStatus === "completed"
                            ? "bg-success"
                            : "bg-warning"
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Order Summary */}
                  <hr />
                  <h6 className="mb-3">Order Summary</h6>
                  <div className="order-summary">
                    <div className="d-flex justify-content-between mb-2">
                      <span>Subtotal</span>
                      <span>{formatPrice(order.totalAmount * 0.82)}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>GST (18%)</span>
                      <span>{formatPrice(order.totalAmount * 0.15)}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Shipping</span>
                      <span>{formatPrice(100)}</span>
                    </div>
                    <hr />
                    <div className="d-flex justify-content-between">
                      <span className="fw-bold">Total</span>
                      <span className="fw-bold fs-5">
                        {formatPrice(order.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Quick Info */}
          <div className="col-lg-4">
            {/* Quick Actions */}
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-white">
                <h6 className="mb-0">Quick Actions</h6>
              </div>
              <div className="card-body">
                <div className="d-grid gap-2">
                  <button className="btn btn-outline-primary">
                    <i className="bi bi-download me-2"></i>Download Invoice
                  </button>
                  <button className="btn btn-outline-secondary">
                    <i className="bi bi-question-circle me-2"></i>Need Help?
                  </button>
                  {order.status !== "delivered" &&
                    order.status !== "cancelled" && (
                      <button className="btn btn-outline-danger">
                        <i className="bi bi-x-circle me-2"></i>Cancel Order
                      </button>
                    )}
                </div>
              </div>
            </div>

            {/* Delivery Partner Card */}
            {deliveryPartner && (
              <div className="card shadow-sm mb-4">
                <div className="card-header bg-white">
                  <h6 className="mb-0">Delivery Partner</h6>
                </div>
                <div className="card-body text-center">
                  <i className="bi bi-truck display-4 text-success mb-2"></i>
                  <h6>{deliveryPartner.name}</h6>
                  <p className="text-muted mb-0">
                    Tracking: <code>{deliveryPartner.trackingNumber}</code>
                  </p>
                  <a
                    href={deliveryPartner.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-outline-primary mt-2"
                  >
                    Track on Partner Site
                  </a>
                </div>
              </div>
            )}

            {/* Help Card */}
            <div className="card shadow-sm">
              <div className="card-body">
                <h6 className="mb-3">
                  <i className="bi bi-headset me-2"></i>
                  Need Assistance?
                </h6>
                <p className="text-muted small">
                  If you have any questions about your order, feel free to
                  contact us.
                </p>
                <div className="d-grid gap-2">
                  <a
                    href="tel:1800-123-4567"
                    className="btn btn-sm btn-outline-success"
                  >
                    <i className="bi bi-telephone me-2"></i>1800-123-4567
                  </a>
                  <a
                    href="mailto:support@designden.com"
                    className="btn btn-sm btn-outline-primary"
                  >
                    <i className="bi bi-envelope me-2"></i>Email Support
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
