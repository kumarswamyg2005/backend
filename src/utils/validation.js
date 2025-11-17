/**
 * Validate required fields
 * @param {object} data - Data object to validate
 * @param {string[]} fields - Array of required field names
 * @returns {object} - { valid: boolean, missing: string[] }
 */
export function validateRequiredFields(data, fields) {
  const missing = [];

  for (const field of fields) {
    if (
      !data[field] ||
      (typeof data[field] === "string" && data[field].trim() === "")
    ) {
      missing.push(field);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Sanitize string input (trim and limit length)
 * @param {string} str - Input string
 * @param {number} maxLength - Maximum length (default: 1000)
 * @returns {string} - Sanitized string
 */
export function sanitizeString(str, maxLength = 1000) {
  if (typeof str !== "string") return "";
  return str.trim().substring(0, maxLength);
}

/**
 * Escape HTML to prevent XSS
 * @param {string} str - Input string
 * @returns {string} - Escaped string
 */
export function escapeHtml(str) {
  if (typeof str !== "string") return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Validate email address
 * @param {string} email
 * @returns {object} - { valid: boolean, message: string }
 */
export function validateEmail(email) {
  if (!email || typeof email !== "string") {
    return { valid: false, message: "Email is required" };
  }

  const trimmedEmail = email.trim();

  if (trimmedEmail.length === 0) {
    return { valid: false, message: "Email cannot be empty" };
  }

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return { valid: false, message: "Invalid email format" };
  }

  // Check for common suspicious patterns
  if (
    trimmedEmail.includes("..") ||
    trimmedEmail.startsWith(".") ||
    trimmedEmail.endsWith(".")
  ) {
    return { valid: false, message: "Email contains invalid patterns" };
  }

  return { valid: true, message: "Email is valid" };
}

/**
 * Validate password strength
 * @param {string} password
 * @returns {object} - { valid: boolean, message: string }
 */
export function validatePassword(password) {
  if (!password || typeof password !== "string") {
    return { valid: false, message: "Password is required" };
  }

  if (password.length < 8) {
    return {
      valid: false,
      message: "Password must be at least 8 characters long",
    };
  }

  if (password.length > 128) {
    return {
      valid: false,
      message: "Password must not exceed 128 characters",
    };
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one uppercase letter",
    };
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one lowercase letter",
    };
  }

  // Check for at least one digit
  if (!/\d/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one number",
    };
  }

  // Check for at least one special character
  // eslint-disable-next-line no-useless-escape
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>?/]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one special character",
    };
  }

  return { valid: true, message: "Password is strong" };
}

/**
 * Validate Indian phone number (10 digits starting with 6-9)
 * @param {string} phone
 * @returns {object} - { valid: boolean, message: string }
 */
export function validateIndianPhoneNumber(phone) {
  if (!phone || typeof phone !== "string") {
    return { valid: false, message: "Phone number is required" };
  }

  const trimmedPhone = phone.trim();

  // Remove any spaces, hyphens, or parentheses
  const cleanedPhone = trimmedPhone.replace(/[\s\-()]/g, "");

  // Check if it's exactly 10 digits
  if (!/^\d{10}$/.test(cleanedPhone)) {
    return {
      valid: false,
      message: "Phone number must be exactly 10 digits",
    };
  }

  // Check if it starts with 6, 7, 8, or 9 (valid Indian mobile numbers)
  if (!/^[6-9]/.test(cleanedPhone)) {
    return {
      valid: false,
      message: "Phone number must start with 6, 7, 8, or 9",
    };
  }

  return { valid: true, message: "Phone number is valid" };
}

/**
 * Validate Indian pincode (6 digits)
 * @param {string} pincode
 * @returns {object} - { valid: boolean, message: string }
 */
export function validateIndianPincode(pincode) {
  if (!pincode || typeof pincode !== "string") {
    return { valid: false, message: "Pincode is required" };
  }

  const trimmedPincode = pincode.trim();

  // Check if it's exactly 6 digits
  if (!/^\d{6}$/.test(trimmedPincode)) {
    return {
      valid: false,
      message: "Pincode must be exactly 6 digits",
    };
  }

  // Indian pincodes typically don't start with 0
  if (trimmedPincode.startsWith("0")) {
    return {
      valid: false,
      message: "Invalid pincode format",
    };
  }

  return { valid: true, message: "Pincode is valid" };
}

/**
 * Validate price (positive number)
 * @param {number|string} price
 * @returns {object} - { valid: boolean, message: string }
 */
export function validatePrice(price) {
  const numPrice = Number(price);

  if (isNaN(numPrice)) {
    return { valid: false, message: "Price must be a valid number" };
  }

  if (numPrice <= 0) {
    return { valid: false, message: "Price must be greater than 0" };
  }

  if (numPrice > 1000000) {
    return { valid: false, message: "Price is too high" };
  }

  return { valid: true, message: "Price is valid" };
}
