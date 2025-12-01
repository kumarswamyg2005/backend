#!/bin/bash

# Customer Cart Page
cat > src/pages/customer/Cart.jsx << 'EOF'
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { customerAPI } from '../../services/api';
import { formatPrice } from '../../utils/currency';
import { useFlash } from '../../context/FlashContext';

const Cart = () => {
  const navigate = useNavigate();
  const { cart, updateCartItem, removeFromCart, fetchCart } = useCart();
  const { showFlash } = useFlash();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCart();
  }, []);

  const handleUpdateQuantity = async (customizationId, newQuantity) => {
    if (newQuantity < 1) return;
    
    try {
      await updateCartItem(customizationId, newQuantity);
      showFlash('Cart updated successfully', 'success');
    } catch (error) {
      showFlash('Failed to update cart', 'error');
    }
  };

  const handleRemoveItem = async (customizationId) => {
    if (!window.confirm('Remove this item from cart?')) return;
    
    try {
      await removeFromCart(customizationId);
      showFlash('Item removed from cart', 'success');
    } catch (error) {
      showFlash('Failed to remove item', 'error');
    }
  };

  const calculateSubtotal = () => {
    if (!cart?.items) return 0;
    return cart.items.reduce((sum, item) => {
      const price = item.customizationId?.price || 50;
      return sum + (price * item.quantity);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const tax = subtotal * 0.18; // 18% GST
  const shipping = subtotal > 0 ? 100 : 0;
  const total = subtotal + tax + shipping;

  return (
    <div className="container my-4">
      <div className="row mb-4">
        <div className="col-md-12">
          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="card-title">Your Cart</h2>
              <p className="card-text">Review your saved designs and proceed to checkout.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-8">
          <div className="card shadow-sm">
            <div className="card-header">
              <h3>Saved Designs</h3>
            </div>
            <div className="card-body">
              {!cart?.items || cart.items.length === 0 ? (
                <div className="alert alert-info">
                  Your cart is empty. <Link to="/customer/design-studio">Create a design</Link> or <Link to="/shop">shop ready-made designs</Link> to add items to your cart.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Design</th>
                        <th>Details</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.items.map((item) => {
                        const customization = item.customizationId;
                        const imageUrl = customization?.customImage || '/images/casual-tshirt.jpeg';
                        const name = customization?.customText?.split(',')[0] || 'Custom Design';
                        const price = customization?.price || 50;

                        return (
                          <tr key={item._id}>
                            <td>
                              <div className="d-flex align-items-center">
                                <img 
                                  src={imageUrl} 
                                  alt={name}
                                  className="me-3"
                                  style={{ height: '72px', width: '72px', objectFit: 'cover', borderRadius: '8px' }}
                                />
                                <div>
                                  <h6 className="mb-0">{name}</h6>
                                </div>
                              </div>
                            </td>
                            <td>
                              {customization?.customText ? (
                                <small className="text-muted">{customization.customText}</small>
                              ) : (
                                <small className="text-muted">Custom item</small>
                              )}
                            </td>
                            <td>
                              <div className="d-flex align-items-center">
                                <input 
                                  type="number" 
                                  className="form-control form-control-sm" 
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateQuantity(customization._id, parseInt(e.target.value) || 1)}
                                  min="1"
                                  style={{ width: '60px' }}
                                />
                              </div>
                            </td>
                            <td>{formatPrice(price * item.quantity)}</td>
                            <td>
                              <button 
                                onClick={() => handleRemoveItem(customization._id)}
                                className="btn btn-sm btn-outline-danger"
                              >
                                <i className="fas fa-trash"></i> Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-header">
              <h3>Order Summary</h3>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal:</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Tax (18% GST):</span>
                <span>{formatPrice(tax)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Shipping:</span>
                <span>{formatPrice(shipping)}</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between mb-3">
                <strong>Total:</strong>
                <strong>{formatPrice(total)}</strong>
              </div>
              
              {cart?.items && cart.items.length > 0 && (
                <div className="d-grid gap-2">
                  <button 
                    onClick={() => navigate('/customer/checkout')}
                    className="btn btn-primary btn-lg"
                  >
                    Proceed to Checkout
                  </button>
                  <Link to="/shop" className="btn btn-outline-secondary">
                    Continue Shopping
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
EOF

echo "✓ Cart.jsx created"

# Customer Checkout Page
cat > src/pages/customer/Checkout.jsx << 'EOF'
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { customerAPI } from '../../services/api';
import { formatPrice } from '../../utils/currency';
import { validateIndianPhoneNumber, validateIndianPincode } from '../../utils/validation';
import { useFlash } from '../../context/FlashContext';

const Checkout = () => {
  const navigate = useNavigate();
  const { cart } = useCart();
  const { user } = useAuth();
  const { showFlash } = useFlash();
  
  const [formData, setFormData] = useState({
    name: user?.username || '',
    email: user?.email || '',
    phone: user?.contactNumber || '',
    alternativePhone: '',
    deliveryAddress: '',
    city: '',
    state: '',
    pincode: ''
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!cart?.items || cart.items.length === 0) {
      showFlash('Your cart is empty', 'error');
      navigate('/customer/cart');
    }
  }, [cart]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name || formData.name.length < 3) {
      newErrors.name = 'Full name is required (minimum 3 characters)';
    }
    
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Valid email is required';
    }
    
    if (!formData.phone || !validateIndianPhoneNumber(formData.phone)) {
      newErrors.phone = 'Valid 10-digit Indian phone number required';
    }
    
    if (formData.alternativePhone && !validateIndianPhoneNumber(formData.alternativePhone)) {
      newErrors.alternativePhone = 'Valid 10-digit Indian phone number required';
    }
    
    if (!formData.deliveryAddress || formData.deliveryAddress.length < 10) {
      newErrors.deliveryAddress = 'Delivery address is required (minimum 10 characters)';
    }
    
    if (!formData.city || formData.city.length < 2) {
      newErrors.city = 'City is required';
    }
    
    if (!formData.state || formData.state.length < 2) {
      newErrors.state = 'State is required';
    }
    
    if (!formData.pincode || !validateIndianPincode(formData.pincode)) {
      newErrors.pincode = 'Valid 6-digit Indian pincode required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showFlash('Please fix the errors in the form', 'error');
      return;
    }
    
    try {
      setSubmitting(true);
      await customerAPI.processCheckout(formData);
      showFlash('Order placed successfully!', 'success');
      navigate('/customer/dashboard');
    } catch (error) {
      showFlash(error.response?.data?.message || 'Failed to process checkout', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateSubtotal = () => {
    if (!cart?.items) return 0;
    return cart.items.reduce((sum, item) => {
      const price = item.customizationId?.price || 50;
      return sum + (price * item.quantity);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const tax = subtotal * 0.18;
  const shipping = 100;
  const total = subtotal + tax + shipping;

  return (
    <div className="container my-4">
      <div className="row mb-4">
        <div className="col-md-12">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <h2 className="card-title mb-0">Checkout</h2>
                <Link to="/customer/cart" className="btn btn-outline-primary">Back to Cart</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-8">
          <div className="card shadow-sm mb-4">
            <div className="card-header">
              <h3>Shipping Information</h3>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="name" className="form-label">Full Name <span className="text-danger">*</span></label>
                  <input 
                    type="text" 
                    className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                    id="name" 
                    name="name" 
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                  {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                </div>

                <div className="mb-3">
                  <label htmlFor="email" className="form-label">Email <span className="text-danger">*</span></label>
                  <input 
                    type="email" 
                    className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                    id="email" 
                    name="email" 
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                  {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                </div>

                <div className="mb-3">
                  <label htmlFor="phone" className="form-label">Phone Number <span className="text-danger">*</span></label>
                  <input 
                    type="tel" 
                    className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                    id="phone" 
                    name="phone" 
                    value={formData.phone}
                    onChange={handleChange}
                    maxLength="10"
                    required
                  />
                  {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
                  <div className="form-text">Must be 10 digits starting with 6, 7, 8, or 9</div>
                </div>

                <div className="mb-3">
                  <label htmlFor="alternativePhone" className="form-label">Alternative Phone Number <span className="text-muted">(Optional)</span></label>
                  <input 
                    type="tel" 
                    className={`form-control ${errors.alternativePhone ? 'is-invalid' : ''}`}
                    id="alternativePhone" 
                    name="alternativePhone" 
                    value={formData.alternativePhone}
                    onChange={handleChange}
                    maxLength="10"
                  />
                  {errors.alternativePhone && <div className="invalid-feedback">{errors.alternativePhone}</div>}
                </div>

                <div className="mb-3">
                  <label htmlFor="deliveryAddress" className="form-label">Delivery Address <span className="text-danger">*</span></label>
                  <textarea 
                    className={`form-control ${errors.deliveryAddress ? 'is-invalid' : ''}`}
                    id="deliveryAddress" 
                    name="deliveryAddress" 
                    value={formData.deliveryAddress}
                    onChange={handleChange}
                    rows="3"
                    required
                  />
                  {errors.deliveryAddress && <div className="invalid-feedback">{errors.deliveryAddress}</div>}
                </div>

                <div className="mb-3">
                  <label htmlFor="city" className="form-label">City <span className="text-danger">*</span></label>
                  <input 
                    type="text" 
                    className={`form-control ${errors.city ? 'is-invalid' : ''}`}
                    id="city" 
                    name="city" 
                    value={formData.city}
                    onChange={handleChange}
                    required
                  />
                  {errors.city && <div className="invalid-feedback">{errors.city}</div>}
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label htmlFor="state" className="form-label">State <span className="text-danger">*</span></label>
                    <input 
                      type="text" 
                      className={`form-control ${errors.state ? 'is-invalid' : ''}`}
                      id="state" 
                      name="state" 
                      value={formData.state}
                      onChange={handleChange}
                      required
                    />
                    {errors.state && <div className="invalid-feedback">{errors.state}</div>}
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="pincode" className="form-label">Pincode <span className="text-danger">*</span></label>
                    <input 
                      type="text" 
                      className={`form-control ${errors.pincode ? 'is-invalid' : ''}`}
                      id="pincode" 
                      name="pincode" 
                      value={formData.pincode}
                      onChange={handleChange}
                      maxLength="6"
                      required
                    />
                    {errors.pincode && <div className="invalid-feedback">{errors.pincode}</div>}
                    <div className="form-text">Must be 6 digits starting with 1-9</div>
                  </div>
                </div>

                <div className="d-grid">
                  <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Processing...
                      </>
                    ) : (
                      'Place Order'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-header">
              <h3>Order Summary</h3>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal:</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Tax (18% GST):</span>
                <span>{formatPrice(tax)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Shipping:</span>
                <span>{formatPrice(shipping)}</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between">
                <strong>Total:</strong>
                <strong>{formatPrice(total)}</strong>
              </div>
            </div>
          </div>

          <div className="card shadow-sm mt-3">
            <div className="card-header">
              <h5>Items ({cart?.items?.length || 0})</h5>
            </div>
            <div className="card-body">
              {cart?.items?.map((item) => {
                const customization = item.customizationId;
                const name = customization?.customText?.split(',')[0] || 'Custom Design';
                const price = customization?.price || 50;
                
                return (
                  <div key={item._id} className="d-flex justify-content-between align-items-center mb-2">
                    <small>{name} × {item.quantity}</small>
                    <small>{formatPrice(price * item.quantity)}</small>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
EOF

echo "✓ Checkout.jsx created"

echo "✅ All customer pages created successfully!"
