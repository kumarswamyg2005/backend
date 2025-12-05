/**
 * OrderTracking Component
 * Displays detailed order tracking timeline with visual progress
 * Shows different workflows for shop orders vs custom design orders
 */

import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCompleteTracking,
  selectTrackingData,
  selectOrdersLoading,
} from "../store/slices/ordersSlice";
import LoadingSpinner from "./LoadingSpinner";
import "./OrderTracking.css";

const OrderTracking = ({ orderId }) => {
  const dispatch = useDispatch();
  const trackingData = useSelector(selectTrackingData);
  const loading = useSelector(selectOrdersLoading);

  useEffect(() => {
    if (orderId) {
      dispatch(fetchCompleteTracking(orderId));
    }
  }, [dispatch, orderId]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!trackingData) {
    return (
      <div className="tracking-empty">
        <p>No tracking information available</p>
      </div>
    );
  }

  const isCustomOrder = trackingData.orderType === "Custom Design";

  // Define workflow steps based on order type
  // These must match the actual statuses used in the database
  const shopWorkflow = [
    { status: "pending", label: "Order Placed", icon: "🛒" },
    { status: "assigned_to_manager", label: "Received by Manager", icon: "👔" },
    { status: "ready_for_pickup", label: "Ready for Delivery", icon: "📦" },
    { status: "out_for_delivery", label: "Out for Delivery", icon: "🚚" },
    { status: "delivered", label: "Delivered", icon: "✅" },
  ];

  const customWorkflow = [
    { status: "pending", label: "Order Placed", icon: "🛒" },
    { status: "assigned_to_manager", label: "Received by Manager", icon: "👔" },
    {
      status: "assigned_to_designer",
      label: "Assigned to Designer",
      icon: "👨‍🎨",
    },
    { status: "designer_accepted", label: "Designer Accepted", icon: "✔️" },
    { status: "in_production", label: "In Production", icon: "⚙️" },
    {
      status: "production_completed",
      label: "Production Complete",
      icon: "✨",
    },
    { status: "ready_for_pickup", label: "Ready for Delivery", icon: "📦" },
    { status: "out_for_delivery", label: "Out for Delivery", icon: "🚚" },
    { status: "delivered", label: "Delivered", icon: "✅" },
  ];

  const workflow = isCustomOrder ? customWorkflow : shopWorkflow;

  // Map status to workflow index - handles statuses that aren't directly in workflow
  const getStatusIndex = (status) => {
    // Direct match
    const directIndex = workflow.findIndex((step) => step.status === status);
    if (directIndex !== -1) return directIndex;

    // Map intermediate statuses to their logical position
    const statusMapping = {
      // These statuses come after ready_for_pickup but before out_for_delivery
      picked_up: workflow.findIndex((s) => s.status === "out_for_delivery"),
      in_transit: workflow.findIndex((s) => s.status === "out_for_delivery"),
      // Legacy status mappings
      assigned: workflow.findIndex((s) => s.status === "assigned_to_manager"),
      shipped: workflow.findIndex((s) => s.status === "out_for_delivery"),
      completed: workflow.findIndex((s) => s.status === "delivered"),
    };

    return statusMapping[status] ?? -1;
  };

  // Get current status index
  const currentStatusIndex = getStatusIndex(trackingData.currentStatus);

  // Debug logging
  console.log("OrderTracking Debug:", {
    currentStatus: trackingData.currentStatus,
    currentStatusIndex,
    isCustomOrder,
    workflowLength: workflow.length,
  });

  // Check if status is completed
  const isStatusCompleted = (index) => {
    if (trackingData.currentStatus === "cancelled") return false;
    if (currentStatusIndex === -1) return false;
    return index <= currentStatusIndex;
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="order-tracking-container">
      {/* Header */}
      <div className="tracking-header">
        <h3>Order Tracking</h3>
        <div className="tracking-meta">
          <span className="order-number">#{trackingData.orderNumber}</span>
          <span className={`order-type ${isCustomOrder ? "custom" : "shop"}`}>
            {trackingData.orderType}
          </span>
          <span className={`order-status status-${trackingData.currentStatus}`}>
            {trackingData.currentStatus.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* Progress Bar (for custom orders) */}
      {isCustomOrder && trackingData.progressPercentage > 0 && (
        <div className="progress-section">
          <div className="progress-label">
            <span>Production Progress</span>
            <span className="progress-percentage">
              {trackingData.progressPercentage}%
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${trackingData.progressPercentage}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* OTP Display - Show when delivery is active */}
      {trackingData.otp &&
        [
          "ready_for_pickup",
          "picked_up",
          "in_transit",
          "out_for_delivery",
        ].includes(trackingData.currentStatus) && (
          <div className="otp-display-section">
            <div
              className="alert alert-warning border-warning"
              style={{
                backgroundColor: "#fff3cd",
                borderLeft: "4px solid #ffc107",
                padding: "20px",
                marginBottom: "20px",
              }}
            >
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div>
                  <h4 className="mb-2" style={{ color: "#856404" }}>
                    <i className="fas fa-shield-alt me-2"></i>
                    Delivery OTP
                  </h4>
                  <p className="mb-0" style={{ color: "#856404" }}>
                    Share this OTP with the delivery person for successful
                    delivery
                  </p>
                </div>
                <div
                  className="text-center"
                  style={{
                    backgroundColor: "#fff",
                    padding: "15px 30px",
                    borderRadius: "8px",
                    border: "2px dashed #ffc107",
                    minWidth: "150px",
                  }}
                >
                  <small className="d-block text-muted mb-1">Your OTP</small>
                  <h2
                    className="mb-0 fw-bold"
                    style={{
                      fontSize: "2rem",
                      color: "#ffc107",
                      letterSpacing: "8px",
                      fontFamily: "monospace",
                    }}
                  >
                    {trackingData.otp}
                  </h2>
                </div>
              </div>
              <div
                className="mt-3 pt-3"
                style={{ borderTop: "1px solid #ffc107" }}
              >
                <small className="text-muted">
                  <i className="fas fa-info-circle me-1"></i>
                  This OTP is required for delivery verification. Keep it ready
                  when the delivery person arrives.
                </small>
              </div>
            </div>
          </div>
        )}

      {/* Visual Timeline */}
      <div className="tracking-timeline">
        {workflow.map((step, index) => {
          const isCompleted = isStatusCompleted(index);
          const isCurrent = index === currentStatusIndex;

          return (
            <div
              key={step.status}
              className={`timeline-step ${isCompleted ? "completed" : ""} ${
                isCurrent ? "current" : ""
              }`}
              style={{
                opacity: isCompleted || isCurrent ? 1 : 0.5,
              }}
            >
              <div
                className="timeline-icon"
                style={{
                  background: isCompleted
                    ? "#d1e7dd"
                    : isCurrent
                    ? "#cfe2ff"
                    : "#e9ecef",
                  borderColor: isCompleted
                    ? "#2ecc71"
                    : isCurrent
                    ? "#3498db"
                    : "#dee2e6",
                  borderWidth: "3px",
                  borderStyle: "solid",
                }}
              >
                {step.icon}
              </div>
              <div className="timeline-content">
                <h4
                  style={{
                    color: isCompleted || isCurrent ? "#2c3e50" : "#6c757d",
                  }}
                >
                  {step.label}
                </h4>
                {isCompleted && (
                  <p className="timeline-time">
                    {formatDate(
                      getTimestampForStatus(step.status, trackingData)
                    )}
                  </p>
                )}
              </div>
              {index < workflow.length - 1 && (
                <div
                  className={`timeline-connector ${
                    isCompleted ? "completed" : ""
                  }`}
                  style={{
                    background: isCompleted ? "#2ecc71" : "#dee2e6",
                  }}
                ></div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detailed Timeline History */}
      {trackingData.timeline && trackingData.timeline.length > 0 && (
        <div className="timeline-history">
          <h4>Order History</h4>
          <div className="history-list">
            {trackingData.timeline
              .slice()
              .reverse()
              .map((event, index) => (
                <div key={index} className="history-item">
                  <div className="history-time">{formatDate(event.at)}</div>
                  <div className="history-details">
                    <span className="history-status">
                      {event.status.replace(/_/g, " ")}
                    </span>
                    {event.note && <p className="history-note">{event.note}</p>}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Shipping Address */}
      {trackingData.shippingAddress && (
        <div className="shipping-info">
          <h4>Delivery Address</h4>
          <p>{trackingData.shippingAddress.name}</p>
          <p>{trackingData.shippingAddress.street}</p>
          <p>
            {trackingData.shippingAddress.city},{" "}
            {trackingData.shippingAddress.state}{" "}
            {trackingData.shippingAddress.zipCode}
          </p>
          <p>Phone: {trackingData.shippingAddress.phone}</p>
        </div>
      )}
    </div>
  );
};

// Helper function to get timestamp for a specific status
const getTimestampForStatus = (status, trackingData) => {
  const { timestamps, timeline } = trackingData;

  // Check timestamps object first
  switch (status) {
    case "pending":
      return timestamps?.orderPlaced;
    case "assigned_to_manager":
      return timestamps?.managerAssigned;
    case "assigned_to_designer":
      return timestamps?.designerAssigned;
    case "designer_accepted":
      return timestamps?.designerAccepted;
    case "production_completed":
      return timestamps?.productionCompleted;
    case "ready_for_pickup":
    case "ready_for_delivery":
      return timestamps?.deliveryAssigned;
    default:
      break;
  }

  // Fall back to timeline
  if (timeline) {
    const timelineEvent = timeline.find((event) => event.status === status);
    return timelineEvent?.at;
  }
  return null;
};

export default OrderTracking;
