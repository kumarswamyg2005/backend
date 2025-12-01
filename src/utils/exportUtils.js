/**
 * Export orders to CSV format
 * @param {Array} orders - Array of order objects
 * @param {string} filename - Name for the CSV file
 */
export const exportOrdersToCSV = (orders, filename = "orders-export.csv") => {
  if (!orders || orders.length === 0) {
    alert("No orders to export");
    return;
  }

  // Define CSV headers
  const headers = [
    "Order ID",
    "Customer Name",
    "Customer Email",
    "Phone",
    "Items Count",
    "Total Amount",
    "Payment Method",
    "Payment Status",
    "Order Status",
    "Delivery Address",
    "City",
    "State",
    "Pincode",
    "Designer",
    "Tracking Number",
    "Order Date",
    "Shipped Date",
    "Delivered Date",
  ];

  // Convert orders to CSV rows
  const rows = orders.map((order) => {
    const customer = order.userId || {};
    const address = order.deliveryAddress || {};
    const designer = order.designerId || {};

    return [
      order._id || "",
      address.name || customer.username || "",
      customer.email || "",
      address.phone || customer.contactNumber || "",
      order.items?.length || 0,
      order.totalAmount || 0,
      order.paymentMethod || "",
      order.paymentStatus || "",
      order.status || "",
      address.street || "",
      address.city || "",
      address.state || "",
      address.pincode || "",
      designer.username || "Not Assigned",
      order.trackingNumber || "",
      order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "",
      order.shippedAt ? new Date(order.shippedAt).toLocaleDateString() : "",
      order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString() : "",
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((cell) => {
          // Escape commas and quotes in cell values
          const cellStr = String(cell);
          if (
            cellStr.includes(",") ||
            cellStr.includes('"') ||
            cellStr.includes("\n")
          ) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(",")
    ),
  ].join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  if (navigator.msSaveBlob) {
    // IE 10+
    navigator.msSaveBlob(blob, filename);
  } else {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

/**
 * Export detailed order report including items
 * @param {Array} orders - Array of order objects
 * @param {string} filename - Name for the CSV file
 */
export const exportDetailedOrdersToCSV = (
  orders,
  filename = "detailed-orders-export.csv"
) => {
  if (!orders || orders.length === 0) {
    alert("No orders to export");
    return;
  }

  // Define CSV headers for detailed export
  const headers = [
    "Order ID",
    "Customer Name",
    "Customer Email",
    "Phone",
    "Product/Design Name",
    "Quantity",
    "Size",
    "Color",
    "Item Price",
    "Subtotal",
    "Tax",
    "Shipping",
    "Total Amount",
    "Payment Method",
    "Payment Status",
    "Order Status",
    "Delivery City",
    "Delivery State",
    "Order Date",
  ];

  // Flatten orders to include each item as a row
  const rows = [];
  orders.forEach((order) => {
    const customer = order.userId || {};
    const address = order.deliveryAddress || {};

    if (order.items && order.items.length > 0) {
      order.items.forEach((item) => {
        const product = item.productId || {};
        const design = item.designId || {};
        const itemName = product.name || design.name || "Unknown Item";

        rows.push([
          order._id || "",
          address.name || customer.username || "",
          customer.email || "",
          address.phone || customer.contactNumber || "",
          itemName,
          item.quantity || 1,
          item.size || "",
          item.color || "",
          item.price || product.price || 0,
          order.subtotal || 0,
          order.tax || 0,
          order.shipping || 0,
          order.totalAmount || 0,
          order.paymentMethod || "",
          order.paymentStatus || "",
          order.status || "",
          address.city || "",
          address.state || "",
          order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "",
        ]);
      });
    } else {
      // Order with no items
      rows.push([
        order._id || "",
        address.name || customer.username || "",
        customer.email || "",
        address.phone || customer.contactNumber || "",
        "No items",
        0,
        "",
        "",
        0,
        order.subtotal || 0,
        order.tax || 0,
        order.shipping || 0,
        order.totalAmount || 0,
        order.paymentMethod || "",
        order.paymentStatus || "",
        order.status || "",
        address.city || "",
        address.state || "",
        order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "",
      ]);
    }
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const cellStr = String(cell);
          if (
            cellStr.includes(",") ||
            cellStr.includes('"') ||
            cellStr.includes("\n")
          ) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(",")
    ),
  ].join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  if (navigator.msSaveBlob) {
    navigator.msSaveBlob(blob, filename);
  } else {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

/**
 * Generate timestamp for filename
 * @returns {string} Formatted timestamp
 */
export const getExportTimestamp = () => {
  const now = new Date();
  return now.toISOString().split("T")[0]; // YYYY-MM-DD
};
