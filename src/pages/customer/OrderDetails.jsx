import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { customerAPI } from "../../services/api";
import { formatPrice } from "../../utils/currency";
import { useFlash } from "../../context/FlashContext";

const OrderDetails = () => {
  const { id } = useParams();
  const { showFlash } = useFlash();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedback, setFeedback] = useState({ rating: 5, comment: "" });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await customerAPI.getOrderDetails(id);
      setOrder(response.data.order);
    } catch (error) {
      showFlash("Failed to load order details", "error");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      pending: "bg-warning text-dark",
      assigned_to_manager: "bg-info",
      assigned_to_designer: "bg-primary",
      "in-production": "bg-primary",
      in_production: "bg-primary",
      production_completed: "bg-success",
      ready_for_pickup: "bg-info",
      picked_up: "bg-info",
      in_transit: "bg-info",
      out_for_delivery: "bg-warning text-dark",
      completed: "bg-success",
      delivered: "bg-success",
      shipped: "bg-info",
      cancelled: "bg-danger",
    };
    return statusMap[status] || "bg-secondary";
  };

  const getStatusLabel = (status) => {
    const labelMap = {
      pending: "Pending",
      assigned_to_manager: "Assigned to Manager",
      assigned_to_designer: "Assigned to Designer",
      "in-production": "In Production",
      in_production: "In Production",
      production_completed: "Production Completed",
      ready_for_pickup: "Ready for Pickup",
      picked_up: "Picked Up by Delivery",
      in_transit: "In Transit",
      out_for_delivery: "🚚 Out for Delivery",
      completed: "Completed",
      delivered: "Delivered",
      shipped: "Shipped",
      cancelled: "Cancelled",
    };
    return labelMap[status] || status?.replace(/_/g, " ") || status;
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();

    if (!feedback.comment || feedback.comment.length < 10) {
      showFlash("Please provide at least 10 characters of feedback", "error");
      return;
    }

    try {
      setSubmittingFeedback(true);
      await customerAPI.submitFeedback({
        orderId: order._id,
        rating: feedback.rating,
        comment: feedback.comment,
      });
      showFlash("Thank you for your feedback!", "success");
      setShowFeedbackForm(false);
      fetchOrderDetails(); // Refresh order data
    } catch (error) {
      showFlash("Failed to submit feedback", "error");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!window.confirm("Are you sure you want to cancel this order?")) {
      return;
    }

    try {
      setCancellingOrder(true);
      await customerAPI.cancelOrder(order._id);
      showFlash("Order cancelled successfully", "success");
      fetchOrderDetails(); // Refresh order data
    } catch (error) {
      showFlash(
        error.response?.data?.message || "Failed to cancel order",
        "error"
      );
    } finally {
      setCancellingOrder(false);
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
        <Link to="/customer/dashboard" className="btn btn-primary">
          Back to Dashboard
        </Link>
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
                  <p className="text-muted mb-0">
                    Order ID: <code>{order._id}</code>
                  </p>
                </div>
                <Link
                  to="/customer/dashboard"
                  className="btn btn-outline-primary"
                >
                  Back to Dashboard
                </Link>
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
                <div className="list-group list-group-flush">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="list-group-item">
                      <div className="row align-items-center">
                        {/* Product/Design Image */}
                        <div className="col-md-2">
                          {item.designId?.graphic ? (
                            <img
                              src={`/images/graphics/${item.designId.graphic}`}
                              alt="Design"
                              className="img-fluid rounded"
                              style={{
                                maxHeight: "80px",
                                objectFit: "contain",
                              }}
                            />
                          ) : item.productId?.images?.[0] ? (
                            <img
                              src={item.productId.images[0]}
                              alt="Product"
                              className="img-fluid rounded"
                              style={{
                                maxHeight: "80px",
                                objectFit: "contain",
                              }}
                            />
                          ) : (
                            <div
                              className="bg-light rounded d-flex align-items-center justify-content-center"
                              style={{ height: "80px" }}
                            >
                              <i className="fas fa-image fa-2x text-muted"></i>
                            </div>
                          )}
                        </div>

                        {/* Product/Design Details */}
                        <div className="col-md-7">
                          <h5 className="mb-1">
                            {item.designId ? (
                              <>
                                <i className="fas fa-paint-brush text-primary me-2"></i>
                                Custom Design
                              </>
                            ) : (
                              <>
                                <i className="fas fa-tshirt text-success me-2"></i>
                                {item.productId?.name || "Product"}
                              </>
                            )}
                          </h5>

                          {item.designId && (
                            <div className="small text-muted">
                              <span className="me-3">
                                <strong>Name:</strong> {item.designId.name}
                              </span>
                              <span className="me-3">
                                <strong>Category:</strong>{" "}
                                {item.designId.category || "T-Shirt"}
                              </span>
                              <span className="me-3">
                                <strong>Fabric:</strong>{" "}
                                {item.designId.fabric || "Cotton"}
                              </span>
                              <div>
                                <span className="me-3">
                                  <strong>Color:</strong>{" "}
                                  {item.designId.color || "N/A"}
                                </span>
                                <span className="me-3">
                                  <strong>Size:</strong>{" "}
                                  {item.designId.size || "N/A"}
                                </span>
                                {item.designId.customText && (
                                  <span>
                                    <strong>Custom Text:</strong>{" "}
                                    {item.designId.customText}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {item.productId && (
                            <p className="small text-muted mb-0">
                              {item.productId.description}
                            </p>
                          )}
                        </div>

                        {/* Quantity and Price */}
                        <div className="col-md-3 text-end">
                          <div className="mb-2">
                            <span className="badge bg-secondary">
                              Qty: {item.quantity}
                            </span>
                          </div>
                          <h5 className="mb-0">
                            {formatPrice(item.price * item.quantity)}
                          </h5>
                          <small className="text-muted">
                            {formatPrice(item.price)} each
                          </small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted">No items found</p>
              )}
            </div>
          </div>

          {order.shippingAddress && (
            <div className="card shadow-sm mb-4">
              <div className="card-header">
                <h3>Delivery Address</h3>
              </div>
              <div className="card-body">
                {order.shippingAddress.name && (
                  <p className="mb-1 fw-bold">{order.shippingAddress.name}</p>
                )}
                {order.shippingAddress.email && (
                  <p className="mb-1">Email: {order.shippingAddress.email}</p>
                )}
                {order.shippingAddress.street && (
                  <p className="mb-1">{order.shippingAddress.street}</p>
                )}
                {order.shippingAddress.city && order.shippingAddress.state && (
                  <p className="mb-1">
                    {order.shippingAddress.city}, {order.shippingAddress.state}
                  </p>
                )}
                {order.shippingAddress.zipCode && (
                  <p className="mb-1">
                    Pincode: {order.shippingAddress.zipCode}
                  </p>
                )}
                {order.shippingAddress.phone && (
                  <p className="mb-1">Phone: {order.shippingAddress.phone}</p>
                )}
                {order.shippingAddress.alternativePhone && (
                  <p className="mb-0">
                    Alt Phone: {order.shippingAddress.alternativePhone}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Order Timeline */}
          {order.timeline && order.timeline.length > 0 && (
            <div className="card shadow-sm">
              <div className="card-header">
                <h3>
                  <i className="fas fa-clock me-2"></i>Order Timeline
                </h3>
              </div>
              <div className="card-body">
                <div className="timeline">
                  {order.timeline.map((event, idx) => (
                    <div
                      key={idx}
                      className="timeline-item mb-3 pb-3"
                      style={{
                        borderLeft:
                          idx < order.timeline.length - 1
                            ? "2px solid #dee2e6"
                            : "none",
                        paddingLeft: "20px",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: "-8px",
                          top: "0",
                          width: "14px",
                          height: "14px",
                          borderRadius: "50%",
                          backgroundColor: "#0d6efd",
                          border: "2px solid #fff",
                        }}
                      ></div>
                      <div>
                        <h6 className="mb-1">{getStatusLabel(event.status)}</h6>
                        <small className="text-muted">
                          {new Date(event.at).toLocaleString()}
                        </small>
                        {event.note && (
                          <p className="mb-0 mt-1 small text-muted">
                            {event.note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="col-md-4">
          {/* OTP Display - Show prominently when order is being delivered */}
          {order.deliveryOTPCode &&
            [
              "out_for_delivery",
              "picked_up",
              "in_transit",
              "ready_for_pickup",
            ].includes(order.status) && (
              <div className="card shadow-sm mb-3 border-warning">
                <div className="card-header bg-warning text-dark">
                  <h5 className="mb-0">
                    <i className="fas fa-shield-alt me-2"></i>
                    Delivery OTP
                  </h5>
                </div>
                <div className="card-body text-center">
                  <p className="text-muted mb-3">
                    Share this OTP with the delivery person to confirm delivery
                  </p>
                  <div
                    style={{
                      backgroundColor: "#fff3cd",
                      padding: "20px",
                      borderRadius: "10px",
                      border: "3px dashed #ffc107",
                    }}
                  >
                    <h1
                      style={{
                        fontSize: "3rem",
                        fontWeight: "bold",
                        letterSpacing: "12px",
                        color: "#856404",
                        fontFamily: "monospace",
                        marginBottom: "0",
                      }}
                    >
                      {order.deliveryOTPCode}
                    </h1>
                  </div>
                  <div className="mt-3">
                    <small className="text-muted">
                      <i className="fas fa-info-circle me-1"></i>
                      Only share this when the delivery person arrives
                    </small>
                  </div>
                  {order.deliveryPersonId && (
                    <div className="mt-3 pt-3 border-top">
                      <small className="text-muted d-block">
                        Delivery Person:
                      </small>
                      <strong>{order.deliveryPersonId.name}</strong>
                      {order.deliveryPersonId.contactNumber && (
                        <div>
                          <a
                            href={`tel:${order.deliveryPersonId.contactNumber}`}
                            className="text-decoration-none"
                          >
                            <i className="fas fa-phone me-1"></i>
                            {order.deliveryPersonId.contactNumber}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

          <div className="card shadow-sm mb-3">
            <div className="card-header">
              <h3>Order Status</h3>
            </div>
            <div className="card-body">
              <span
                className={`badge ${getStatusBadgeClass(order.status)} fs-6`}
              >
                {getStatusLabel(order.status)}
              </span>
              <p className="mt-3 mb-0 text-muted small">
                Ordered on: {new Date(order.createdAt).toLocaleDateString()}
              </p>
              {order.progressPercentage !== undefined &&
                order.status === "in-production" && (
                  <div className="mt-3">
                    <small className="text-muted">Production Progress:</small>
                    <div className="progress mt-1" style={{ height: "20px" }}>
                      <div
                        className="progress-bar"
                        role="progressbar"
                        style={{ width: `${order.progressPercentage}%` }}
                        aria-valuenow={order.progressPercentage}
                        aria-valuemin="0"
                        aria-valuemax="100"
                      >
                        {order.progressPercentage}%
                      </div>
                    </div>
                  </div>
                )}
              {order.trackingNumber && (
                <div className="mt-3">
                  <small className="text-muted">Tracking Number:</small>
                  <p className="mb-0 fw-bold">{order.trackingNumber}</p>
                </div>
              )}
              <div className="mt-3">
                <Link
                  to={`/customer/track/${order._id}`}
                  className="btn btn-primary w-100"
                >
                  <i className="fas fa-truck me-2"></i>Track Delivery
                </Link>
              </div>
              {order.status === "pending" && (
                <div className="mt-2">
                  <button
                    className="btn btn-danger w-100"
                    onClick={handleCancelOrder}
                    disabled={cancellingOrder}
                  >
                    {cancellingOrder ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-times me-2"></i>Cancel Order
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="card shadow-sm mb-3">
            <div className="card-header">
              <h3>Payment Summary</h3>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between mb-2">
                <span>Total Amount:</span>
                <span>{formatPrice(order.totalAmount)}</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between">
                <strong>Payment Status:</strong>
                <strong>
                  <span
                    className={`badge ${
                      order.paymentStatus === "paid"
                        ? "bg-success"
                        : "bg-warning text-dark"
                    }`}
                  >
                    {order.paymentStatus?.toUpperCase() || "PENDING"}
                  </span>
                </strong>
              </div>
              <div className="mt-3">
                <span
                  className={`badge ${
                    order.paymentStatus === "paid" ? "bg-success" : "bg-warning"
                  }`}
                >
                  Payment: {order.paymentStatus || "unpaid"}
                </span>
              </div>
            </div>
          </div>

          {/* Feedback Section */}
          {order.status === "delivered" && !order.hasFeedback && (
            <div className="card shadow-sm">
              <div className="card-header">
                <h3>Feedback</h3>
              </div>
              <div className="card-body">
                {!showFeedbackForm ? (
                  <button
                    className="btn btn-primary w-100"
                    onClick={() => setShowFeedbackForm(true)}
                  >
                    <i className="fas fa-star me-2"></i>
                    Submit Feedback
                  </button>
                ) : (
                  <form onSubmit={handleFeedbackSubmit}>
                    <div className="mb-3">
                      <label className="form-label">Rating</label>
                      <div className="btn-group d-flex" role="group">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            className={`btn ${
                              feedback.rating >= star
                                ? "btn-warning"
                                : "btn-outline-warning"
                            }`}
                            onClick={() =>
                              setFeedback({ ...feedback, rating: star })
                            }
                          >
                            <i className="fas fa-star"></i>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Comment</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={feedback.comment}
                        onChange={(e) =>
                          setFeedback({ ...feedback, comment: e.target.value })
                        }
                        placeholder="Share your experience..."
                        required
                      ></textarea>
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        type="submit"
                        className="btn btn-primary flex-grow-1"
                        disabled={submittingFeedback}
                      >
                        {submittingFeedback ? "Submitting..." : "Submit"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowFeedbackForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
