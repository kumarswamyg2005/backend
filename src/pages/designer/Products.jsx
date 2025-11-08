import { useState, useEffect } from "react";
import { designerAPI } from "../../services/api";
import { formatPrice } from "../../utils/currency";
import { useFlash } from "../../context/FlashContext";

const Products = () => {
  const { showFlash } = useFlash();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingStock, setTogglingStock] = useState({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await designerAPI.getProducts();
      setProducts(response.data.products || []);
    } catch (error) {
      showFlash("Failed to load graphics", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleStockToggle = async (productId, currentStatus) => {
    try {
      setTogglingStock((prev) => ({ ...prev, [productId]: true }));
      await designerAPI.updateProductStock(productId, !currentStatus);
      showFlash(
        `Graphic ${
          !currentStatus ? "marked as in stock" : "marked as out of stock"
        }`,
        "success"
      );
      fetchProducts();
    } catch (error) {
      showFlash("Failed to update stock status", "error");
    } finally {
      setTogglingStock((prev) => ({ ...prev, [productId]: false }));
    }
  };

  return (
    <div className="container my-4">
      <div className="row mb-4">
        <div className="col-md-12">
          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="card-title">Manage Graphics</h2>
              <p className="card-text">
                View and manage graphic availability for customer designs.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {loading ? (
          <div className="col-12 text-center py-5">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="col-12">
            <div className="alert alert-info">No products found.</div>
          </div>
        ) : (
          products.map((product) => (
            <div className="col-md-4 mb-4" key={product._id}>
              <div className="card h-100 shadow-sm">
                <div
                  style={{
                    height: "250px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#f8f9fa",
                    padding: "20px",
                  }}
                >
                  <img
                    src={`http://localhost:3000${product.graphic}`}
                    alt={product.name || "Graphic"}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                    }}
                    onError={(e) => {
                      e.target.src =
                        "http://localhost:3000/images/graphics/dragon_1.jpg";
                    }}
                  />
                </div>
                <div className="card-body">
                  <h5 className="card-title">
                    {product.name || "Graphic Design"}
                  </h5>
                  <p className="card-text text-muted">
                    {product.category || "Custom"}
                  </p>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="h5 mb-0">
                      {formatPrice(
                        product.basePrice || product.estimatedPrice || 500
                      )}
                    </span>
                    <span
                      className={`badge ${
                        product.inStock !== false ? "bg-success" : "bg-danger"
                      }`}
                    >
                      {product.inStock !== false ? "In Stock" : "Out of Stock"}
                    </span>
                  </div>
                  <button
                    className={`btn w-100 ${
                      product.inStock !== false
                        ? "btn-outline-danger"
                        : "btn-outline-success"
                    }`}
                    onClick={() =>
                      handleStockToggle(product._id, product.inStock !== false)
                    }
                    disabled={togglingStock[product._id]}
                  >
                    {togglingStock[product._id] ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Updating...
                      </>
                    ) : (
                      <>
                        {product.inStock !== false ? (
                          <>
                            <i className="fas fa-times-circle me-2"></i>
                            Mark Out of Stock
                          </>
                        ) : (
                          <>
                            <i className="fas fa-check-circle me-2"></i>
                            Mark In Stock
                          </>
                        )}
                      </>
                    )}
                  </button>
                  <small className="text-muted d-block mt-2">
                    Created: {new Date(product.createdAt).toLocaleDateString()}
                  </small>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Products;
