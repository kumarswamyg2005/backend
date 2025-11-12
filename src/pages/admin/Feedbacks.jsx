import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { adminAPI } from "../../services/api";
import { useFlash } from "../../context/FlashContext";

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
      const response = await adminAPI.getFeedbacks();
      setFeedbacks(response.data.feedbacks || []);
    } catch (error) {
      showFlash("Failed to load feedbacks", "error");
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <i
        key={i}
        className={`fas fa-star ${i < rating ? "text-warning" : "text-muted"}`}
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
                <Link to="/admin/dashboard" className="btn btn-outline-primary">
                  Back to Dashboard
                </Link>
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
                      {feedbacks.map((feedback) => (
                        <tr key={feedback._id}>
                          <td>{feedback.userId?.username || "Anonymous"}</td>
                          <td>
                            <code>
                              {feedback.orderId?.toString().substring(0, 8) ||
                                "N/A"}
                              ...
                            </code>
                          </td>
                          <td>{renderStars(feedback.rating)}</td>
                          <td>{feedback.comment || "No comment"}</td>
                          <td>
                            {new Date(feedback.createdAt).toLocaleDateString()}
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

export default Feedbacks;
