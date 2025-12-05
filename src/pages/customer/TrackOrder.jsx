import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { customerAPI } from "../../services/api";
import { formatPrice } from "../../utils/currency";
import { useFlash } from "../../context/FlashContext";
import OrderTracking from "../../components/OrderTracking";

const TrackOrder = () => {
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
      const response = await customerAPI.getOrderDetails(id);
      setOrder(response.data.order);
    } catch (error) {
      showFlash("Failed to load order details", "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container my-5">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container my-5">
        <div className="alert alert-warning">
          <i className="fas fa-exclamation-triangle me-2"></i>
          Order not found
        </div>
        <Link to="/customer/dashboard" className="btn btn-primary">
          <i className="fas fa-arrow-left me-2"></i>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="container my-5">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div>
                  <h2 className="mb-2">
                    <i className="fas fa-shipping-fast me-2 text-primary"></i>
                    Track Your Order
                  </h2>
                  <p className="text-muted mb-0">
                    Order ID: <code>{order._id}</code>
                  </p>
                </div>
                <Link
                  to="/customer/dashboard"
                  className="btn btn-outline-primary"
                >
                  <i className="fas fa-arrow-left me-2"></i>
                  Back to Orders
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Order Tracking Component */}
      <OrderTracking orderId={id} />

      {/* Order Items */}
      <div className="row mt-4">
        <div className="col-md-8">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title mb-4">
                <i className="fas fa-shopping-bag me-2"></i>
                Order Items
              </h5>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Quantity</th>
                      <th>Size</th>
                      <th>Price</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items?.map((item, index) => (
                      <tr key={index}>
                        <td>
                          {item.productId?.name ||
                            item.designId?.name ||
                            "Custom Design"}
                          {item.designId && (
                            <span className="badge bg-info text-dark ms-2">
                              Custom
                            </span>
                          )}
                        </td>
                        <td>{item.quantity}</td>
                        <td>{item.size || "N/A"}</td>
                        <td>{formatPrice(item.price)}</td>
                        <td>{formatPrice(item.price * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="4" className="text-end fw-bold">
                        Total:
                      </td>
                      <td className="fw-bold">
                        {formatPrice(order.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Order Summary */}
        <div className="col-md-4">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">
                <i className="fas fa-receipt me-2"></i>
                Order Summary
              </h5>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between mb-2">
                <span>Total Amount:</span>
                <strong>{formatPrice(order.totalAmount)}</strong>
              </div>
              <hr />
              <div className="d-flex justify-content-between">
                <span>Payment Status:</span>
                <span
                  className={`badge ${
                    order.paymentStatus === "completed" ||
                    order.paymentStatus === "paid"
                      ? "bg-success"
                      : "bg-warning text-dark"
                  }`}
                >
                  {order.paymentStatus === "completed"
                    ? "PAID"
                    : order.paymentStatus?.toUpperCase() || "PENDING"}
                </span>
              </div>
              <hr />
              <div className="d-flex justify-content-between">
                <span>Payment Method:</span>
                <span className="text-uppercase">
                  {order.paymentMethod || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Order Date */}
          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <h6 className="card-title mb-3">
                <i className="fas fa-calendar-alt me-2"></i>
                Order Date
              </h6>
              <p className="mb-0">
                {new Date(order.createdAt).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          {/* Help & Support */}
          <div className="card shadow-sm border-primary">
            <div className="card-body text-center">
              <i className="fas fa-headset fa-3x text-primary mb-3"></i>
              <h5 className="card-title">Need Help?</h5>
              <p className="card-text text-muted small">
                Contact our customer support team for any queries about your
                order.
              </p>
              <a
                href="mailto:support@designden.com"
                className="btn btn-primary btn-sm"
              >
                <i className="fas fa-envelope me-2"></i>
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackOrder;
