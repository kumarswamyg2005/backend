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
