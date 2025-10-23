import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useFlash } from "../context/FlashContext";
import {
  validateEmail,
  validatePassword,
  validateIndianPhoneNumber,
} from "../utils/validation";

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { error: showError, success: showSuccess } = useFlash();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    contactNumber: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // For phone number, only allow digits
    if (name === "contactNumber") {
      const cleaned = value.replace(/[^0-9]/g, "").slice(0, 10);
      setFormData((prev) => ({ ...prev, [name]: cleaned }));
    }
    // For pincode, only allow digits
    else if (name === "pincode") {
      const cleaned = value.replace(/[^0-9]/g, "").slice(0, 6);
      setFormData((prev) => ({ ...prev, [name]: cleaned }));
    }
    // For first and last name, only allow alphabets and spaces
    else if (name === "firstName" || name === "lastName") {
      const cleaned = value.replace(/[^a-zA-Z\s]/g, "");
      setFormData((prev) => ({ ...prev, [name]: cleaned }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};

    // First name validation
    const firstName = formData.firstName.trim();
    if (!firstName) {
      newErrors.firstName = "First name is required";
    } else if (!/^[a-zA-Z\s]+$/.test(firstName)) {
      newErrors.firstName = "First name can only contain alphabets";
    } else if (firstName.length < 2 || firstName.length > 50) {
      newErrors.firstName = "First name must be between 2 and 50 characters";
    }

    // Last name validation
    const lastName = formData.lastName.trim();
    if (!lastName) {
      newErrors.lastName = "Last name is required";
    } else if (!/^[a-zA-Z\s]+$/.test(lastName)) {
      newErrors.lastName = "Last name can only contain alphabets";
    } else if (lastName.length < 2 || lastName.length > 50) {
      newErrors.lastName = "Last name must be between 2 and 50 characters";
    }

    // Username validation
    const username = formData.username.trim();
    if (username.length < 3 || username.length > 50) {
      newErrors.username = "Username must be between 3 and 50 characters";
    }

    // Email validation
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.valid) {
      newErrors.email = emailValidation.message;
    }

    // Password validation
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      newErrors.password = passwordValidation.message;
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // Phone validation
    const phoneValidation = validateIndianPhoneNumber(formData.contactNumber);
    if (!phoneValidation.valid) {
      newErrors.contactNumber = phoneValidation.message;
    }

    // Address validation
    if (!formData.street.trim()) {
      newErrors.street = "Street address is required";
    }
    if (!formData.city.trim()) {
      newErrors.city = "City is required";
    }
    if (!formData.state.trim()) {
      newErrors.state = "State is required";
    }
    if (!formData.pincode.trim()) {
      newErrors.pincode = "Pincode is required";
    } else if (!/^[0-9]{6}$/.test(formData.pincode)) {
      newErrors.pincode = "Pincode must be 6 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      await signup({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        name: `${formData.firstName.trim()} ${formData.lastName.trim()}`, // Full name for display
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        contactNumber: formData.contactNumber,
        address: {
          street: formData.street.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          pincode: formData.pincode.trim(),
        },
      });
      showSuccess("Account created successfully!");
      navigate("/");
    } catch (err) {
      const message =
        err.response?.data?.message || "Signup failed. Please try again.";
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-6">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h2 className="text-center mb-4">Create an Account</h2>
            <form onSubmit={handleSubmit} noValidate>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="firstName" className="form-label">
                    First Name
                  </label>
                  <input
                    type="text"
                    className={`form-control ${
                      errors.firstName ? "is-invalid" : ""
                    }`}
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    placeholder="Enter first name"
                  />
                  {errors.firstName && (
                    <div className="invalid-feedback">{errors.firstName}</div>
                  )}
                </div>

                <div className="col-md-6 mb-3">
                  <label htmlFor="lastName" className="form-label">
                    Last Name
                  </label>
                  <input
                    type="text"
                    className={`form-control ${
                      errors.lastName ? "is-invalid" : ""
                    }`}
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    placeholder="Enter last name"
                  />
                  {errors.lastName && (
                    <div className="invalid-feedback">{errors.lastName}</div>
                  )}
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="username" className="form-label">
                  Username
                </label>
                <input
                  type="text"
                  className={`form-control ${
                    errors.username ? "is-invalid" : ""
                  }`}
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  placeholder="Enter username (3-50 characters)"
                />
                {errors.username && (
                  <div className="invalid-feedback">{errors.username}</div>
                )}
              </div>

              <div className="mb-3">
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <input
                  type="email"
                  className={`form-control ${errors.email ? "is-invalid" : ""}`}
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter valid email address"
                />
                {errors.email && (
                  <div className="invalid-feedback">{errors.email}</div>
                )}
              </div>

              <div className="mb-3">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <input
                  type="password"
                  className={`form-control ${
                    errors.password ? "is-invalid" : ""
                  }`}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Enter password"
                />
                {errors.password && (
                  <div className="invalid-feedback">{errors.password}</div>
                )}
                <div className="form-text">
                  Password must be at least 8 characters with uppercase,
                  lowercase, number, and special character
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="confirmPassword" className="form-label">
                  Confirm Password
                </label>
                <input
                  type="password"
                  className={`form-control ${
                    errors.confirmPassword ? "is-invalid" : ""
                  }`}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Re-enter your password"
                />
                {errors.confirmPassword && (
                  <div className="invalid-feedback">
                    {errors.confirmPassword}
                  </div>
                )}
              </div>

              <div className="mb-3">
                <label htmlFor="contactNumber" className="form-label">
                  Contact Number
                </label>
                <input
                  type="tel"
                  className={`form-control ${
                    errors.contactNumber ? "is-invalid" : ""
                  }`}
                  id="contactNumber"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  required
                  placeholder="Enter 10-digit phone number"
                  maxLength="10"
                />
                {errors.contactNumber && (
                  <div className="invalid-feedback">{errors.contactNumber}</div>
                )}
                <div className="form-text">
                  Must be 10 digits starting with 6, 7, 8, or 9
                </div>
              </div>

              <h5 className="mt-4 mb-3">Delivery Address</h5>

              <div className="mb-3">
                <label htmlFor="street" className="form-label">
                  Street Address
                </label>
                <input
                  type="text"
                  className={`form-control ${
                    errors.street ? "is-invalid" : ""
                  }`}
                  id="street"
                  name="street"
                  value={formData.street}
                  onChange={handleChange}
                  required
                  placeholder="House/Flat no., Street name"
                />
                {errors.street && (
                  <div className="invalid-feedback">{errors.street}</div>
                )}
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="city" className="form-label">
                    City
                  </label>
                  <input
                    type="text"
                    className={`form-control ${
                      errors.city ? "is-invalid" : ""
                    }`}
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    placeholder="Enter city"
                  />
                  {errors.city && (
                    <div className="invalid-feedback">{errors.city}</div>
                  )}
                </div>

                <div className="col-md-6 mb-3">
                  <label htmlFor="state" className="form-label">
                    State
                  </label>
                  <input
                    type="text"
                    className={`form-control ${
                      errors.state ? "is-invalid" : ""
                    }`}
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    required
                    placeholder="Enter state"
                  />
                  {errors.state && (
                    <div className="invalid-feedback">{errors.state}</div>
                  )}
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="pincode" className="form-label">
                  Pincode
                </label>
                <input
                  type="text"
                  className={`form-control ${
                    errors.pincode ? "is-invalid" : ""
                  }`}
                  id="pincode"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  required
                  placeholder="Enter 6-digit pincode"
                  maxLength="6"
                />
                {errors.pincode && (
                  <div className="invalid-feedback">{errors.pincode}</div>
                )}
              </div>

              <div className="d-grid">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? "Creating Account..." : "Sign Up"}
                </button>
              </div>
            </form>

            <div className="text-center mt-3">
              <p>
                Already have an account? <Link to="/login">Login</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
