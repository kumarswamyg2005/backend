/**
 * Orders Slice - Manages order state
 * Handles creating, fetching, updating orders and order tracking
 * Includes real-world delivery partner integration, chat, and production milestones
 */

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

// Initial state
const initialState = {
  orders: [],
  currentOrder: null,
  trackingData: null, // For detailed order tracking
  deliveryPersons: [], // Available delivery persons
  designers: [], // Available designers
  deliveryPartners: [], // Available delivery partners (like Ekart)
  messages: [], // Chat messages for current order
  milestones: [], // Production milestones for custom orders
  deliveryStatistics: null, // Delivery person stats
  loading: false,
  error: null,
  filters: {
    status: "all",
    dateRange: "all",
    orderType: "all", // 'shop' or 'custom'
  },
  statistics: {
    total: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
    revenue: 0,
  },
};

// Async thunks

// Fetch user orders (customer)
export const fetchUserOrders = createAsyncThunk(
  "orders/fetchUserOrders",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/customer/api/orders");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to fetch orders" }
      );
    }
  }
);

// Fetch all orders (admin/manager)
export const fetchAllOrders = createAsyncThunk(
  "orders/fetchAll",
  async (role, { rejectWithValue }) => {
    try {
      const endpoint =
        role === "admin" ? "/admin/api/orders" : "/manager/api/orders";
      const response = await api.get(endpoint);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to fetch orders" }
      );
    }
  }
);

// Fetch designer orders
export const fetchDesignerOrders = createAsyncThunk(
  "orders/fetchDesignerOrders",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/designer/api/orders");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to fetch orders" }
      );
    }
  }
);

// Fetch delivery orders
export const fetchDeliveryOrders = createAsyncThunk(
  "orders/fetchDeliveryOrders",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/delivery/api/orders");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to fetch delivery orders" }
      );
    }
  }
);

// Fetch order by ID
export const fetchOrderById = createAsyncThunk(
  "orders/fetchById",
  async ({ orderId, role }, { rejectWithValue }) => {
    try {
      let endpoint;
      switch (role) {
        case "admin":
          endpoint = `/admin/api/orders/${orderId}`;
          break;
        case "manager":
          endpoint = `/manager/order/${orderId}`;
          break;
        case "designer":
          endpoint = `/designer/order/${orderId}`;
          break;
        case "delivery":
          endpoint = `/delivery/order/${orderId}`;
          break;
        default:
          endpoint = `/customer/api/orders/${orderId}`;
      }
      const response = await api.get(endpoint);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to fetch order" }
      );
    }
  }
);

// Create order
export const createOrder = createAsyncThunk(
  "orders/create",
  async (orderData, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/customer/api/process-checkout",
        orderData
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to create order" }
      );
    }
  }
);

// Update order status (manager/designer/delivery)
export const updateOrderStatus = createAsyncThunk(
  "orders/updateStatus",
  async ({ orderId, status, role }, { rejectWithValue }) => {
    try {
      let endpoint;
      switch (role) {
        case "designer":
          endpoint = `/designer/order/${orderId}/${
            status === "in_production" ? "start-production" : "mark-ready"
          }`;
          break;
        case "delivery":
          endpoint = `/delivery/order/${orderId}/update-status`;
          break;
        case "manager":
          endpoint = `/manager/order/${orderId}/update-status`;
          break;
        default:
          endpoint = `/admin/api/orders/${orderId}`;
      }
      const response = await api.post(endpoint, { status });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to update order status" }
      );
    }
  }
);

// Assign designer (manager)
export const assignDesigner = createAsyncThunk(
  "orders/assignDesigner",
  async ({ orderId, designerId }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/manager/order/${orderId}/assign`, {
        designerId,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to assign designer" }
      );
    }
  }
);

// Assign delivery person (manager)
export const assignDelivery = createAsyncThunk(
  "orders/assignDelivery",
  async ({ orderId, deliveryPersonId }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        `/manager/order/${orderId}/assign-delivery`,
        { deliveryPersonId }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to assign delivery person" }
      );
    }
  }
);

// Cancel order
export const cancelOrder = createAsyncThunk(
  "orders/cancel",
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await api.post(`/customer/api/orders/${orderId}/cancel`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to cancel order" }
      );
    }
  }
);

// Fetch order statistics
export const fetchOrderStatistics = createAsyncThunk(
  "orders/fetchStatistics",
  async (role, { rejectWithValue }) => {
    try {
      const endpoint =
        role === "admin" ? "/admin/api/statistics" : "/manager/api/statistics";
      const response = await api.get(endpoint);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to fetch statistics" }
      );
    }
  }
);

// ============================================
// NEW WORKFLOW THUNKS
// ============================================

// Manager - Assign order to designer (custom orders)
export const assignOrderToDesigner = createAsyncThunk(
  "orders/assignOrderToDesigner",
  async ({ orderId, designerId }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        `/manager/api/order/${orderId}/assign-designer`,
        { designerId }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to assign designer" }
      );
    }
  }
);

// Manager - Assign order to delivery (shop orders or completed custom orders)
export const assignOrderToDelivery = createAsyncThunk(
  "orders/assignOrderToDelivery",
  async ({ orderId, deliveryPersonId }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        `/manager/api/order/${orderId}/assign-delivery`,
        { deliveryPersonId }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to assign delivery person" }
      );
    }
  }
);

// Designer - Accept assigned order
export const acceptOrder = createAsyncThunk(
  "orders/acceptOrder",
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await api.post(`/designer/api/order/${orderId}/accept`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to accept order" }
      );
    }
  }
);

// Designer - Start production
export const startProduction = createAsyncThunk(
  "orders/startProduction",
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await api.post(
        `/designer/api/order/${orderId}/start-production`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to start production" }
      );
    }
  }
);

// Designer - Update production progress
export const updateProgress = createAsyncThunk(
  "orders/updateProgress",
  async ({ orderId, progressPercentage, note }, { rejectWithValue }) => {
    try {
      const response = await api.put(
        `/designer/api/order/${orderId}/progress`,
        { progressPercentage, note }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to update progress" }
      );
    }
  }
);

// Designer - Complete production
export const completeProduction = createAsyncThunk(
  "orders/completeProduction",
  async ({ orderId, notes }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        `/designer/api/order/${orderId}/complete`,
        { notes }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to complete production" }
      );
    }
  }
);

// Delivery - Pickup order from manager
export const pickupOrder = createAsyncThunk(
  "orders/pickupOrder",
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await api.post(`/delivery/api/order/${orderId}/pickup`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to pickup order" }
      );
    }
  }
);

// Delivery - Mark order as delivered
export const deliverOrder = createAsyncThunk(
  "orders/deliverOrder",
  async ({ orderId, deliveryNotes, deliveredTo }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        `/delivery/api/order/${orderId}/deliver`,
        { deliveryNotes, deliveredTo }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to deliver order" }
      );
    }
  }
);

// Customer - Get order tracking
export const fetchOrderTracking = createAsyncThunk(
  "orders/fetchTracking",
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/customer/api/order/${orderId}/tracking`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to fetch tracking" }
      );
    }
  }
);

// Fetch delivery persons (for manager)
export const fetchDeliveryPersons = createAsyncThunk(
  "orders/fetchDeliveryPersons",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/manager/api/delivery-persons");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to fetch delivery persons" }
      );
    }
  }
);

// Fetch designers (for manager)
export const fetchDesigners = createAsyncThunk(
  "orders/fetchDesigners",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/manager/api/designers");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to fetch designers" }
      );
    }
  }
);

// ============================================
// REAL-WORLD DELIVERY PARTNER THUNKS
// ============================================

// Fetch delivery partners
export const fetchDeliveryPartners = createAsyncThunk(
  "orders/fetchDeliveryPartners",
  async (pincode, { rejectWithValue }) => {
    try {
      const response = await api.get(
        `/api/delivery-partners${pincode ? `?pincode=${pincode}` : ""}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to fetch delivery partners" }
      );
    }
  }
);

// Manager - Ship order (assign delivery partner and person)
export const shipOrder = createAsyncThunk(
  "orders/shipOrder",
  async (
    { orderId, deliveryPersonId, deliveryPartnerId, deliverySlot },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post(`/manager/api/order/${orderId}/ship`, {
        deliveryPersonId,
        deliveryPartnerId,
        deliverySlot,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to ship order" }
      );
    }
  }
);

// Delivery - Mark in transit
export const markInTransit = createAsyncThunk(
  "orders/markInTransit",
  async ({ orderId, location }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        `/delivery/api/order/${orderId}/in-transit`,
        { location }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to update status" }
      );
    }
  }
);

// Delivery - Mark out for delivery
export const markOutForDelivery = createAsyncThunk(
  "orders/markOutForDelivery",
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await api.post(
        `/delivery/api/order/${orderId}/out-for-delivery`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to update status" }
      );
    }
  }
);

// Delivery - Update location
export const updateDeliveryLocation = createAsyncThunk(
  "orders/updateDeliveryLocation",
  async ({ orderId, lat, lng, address }, { rejectWithValue }) => {
    try {
      const response = await api.put(
        `/delivery/api/order/${orderId}/location`,
        {
          lat,
          lng,
          address,
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to update location" }
      );
    }
  }
);

// Enhanced deliver order with OTP verification
export const deliverOrderWithOTP = createAsyncThunk(
  "orders/deliverOrderWithOTP",
  async (
    { orderId, otp, receivedBy, relationship, signature, photo, notes },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post(
        `/delivery/api/order/${orderId}/deliver`,
        {
          otp,
          receivedBy,
          relationship,
          signature,
          photo,
          notes,
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to deliver order" }
      );
    }
  }
);

// Fetch delivery statistics
export const fetchDeliveryStatistics = createAsyncThunk(
  "orders/fetchDeliveryStatistics",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/delivery/api/statistics");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to fetch statistics" }
      );
    }
  }
);

// ============================================
// CUSTOMER-DESIGNER CHAT THUNKS
// ============================================

// Fetch messages for an order
export const fetchOrderMessages = createAsyncThunk(
  "orders/fetchOrderMessages",
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/order/${orderId}/messages`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to fetch messages" }
      );
    }
  }
);

// Send message in order chat
export const sendOrderMessage = createAsyncThunk(
  "orders/sendOrderMessage",
  async ({ orderId, message, attachments }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/order/${orderId}/messages`, {
        message,
        attachments,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to send message" }
      );
    }
  }
);

// Get unread message count
export const fetchUnreadMessageCount = createAsyncThunk(
  "orders/fetchUnreadMessageCount",
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/order/${orderId}/messages/unread`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to fetch unread count" }
      );
    }
  }
);

// ============================================
// PRODUCTION MILESTONES THUNKS
// ============================================

// Fetch milestones for an order
export const fetchOrderMilestones = createAsyncThunk(
  "orders/fetchOrderMilestones",
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/order/${orderId}/milestones`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to fetch milestones" }
      );
    }
  }
);

// Designer - Update production milestone
export const updateProductionMilestone = createAsyncThunk(
  "orders/updateProductionMilestone",
  async (
    { orderId, milestone, status, notes, images },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post(`/api/order/${orderId}/milestones`, {
        milestone,
        status,
        notes,
        images,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to update milestone" }
      );
    }
  }
);

// ============================================
// COMPREHENSIVE ORDER TRACKING
// ============================================

// Fetch complete tracking info
export const fetchCompleteTracking = createAsyncThunk(
  "orders/fetchCompleteTracking",
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/order/${orderId}/track`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to fetch tracking" }
      );
    }
  }
);

// Orders slice
const ordersSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    // Set filters
    setOrderFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    // Clear filters
    clearOrderFilters: (state) => {
      state.filters = initialState.filters;
    },
    // Clear current order
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
    },
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch User Orders
    builder
      .addCase(fetchUserOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload.orders || action.payload;
        state.error = null;
      })
      .addCase(fetchUserOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch orders";
      });

    // Fetch All Orders
    builder
      .addCase(fetchAllOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload.orders || action.payload;
        state.error = null;
      })
      .addCase(fetchAllOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch orders";
      });

    // Fetch Designer Orders
    builder
      .addCase(fetchDesignerOrders.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDesignerOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload.orders || action.payload;
      })
      .addCase(fetchDesignerOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch orders";
      });

    // Fetch Delivery Orders
    builder
      .addCase(fetchDeliveryOrders.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDeliveryOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload.orders || action.payload;
      })
      .addCase(fetchDeliveryOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch orders";
      });

    // Fetch Order by ID
    builder
      .addCase(fetchOrderById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrder = action.payload.order || action.payload;
        state.error = null;
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch order";
      });

    // Create Order
    builder
      .addCase(createOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.orders.unshift(action.payload.order);
        state.currentOrder = action.payload.order;
        state.error = null;
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to create order";
      });

    // Update Order Status
    builder
      .addCase(updateOrderStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.orders.findIndex(
          (o) => o._id === action.payload.order._id
        );
        if (index !== -1) {
          state.orders[index] = action.payload.order;
        }
        if (state.currentOrder?._id === action.payload.order._id) {
          state.currentOrder = action.payload.order;
        }
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to update order";
      });

    // Assign Designer
    builder.addCase(assignDesigner.fulfilled, (state, action) => {
      const index = state.orders.findIndex(
        (o) => o._id === action.payload.order._id
      );
      if (index !== -1) {
        state.orders[index] = action.payload.order;
      }
    });

    // Assign Delivery
    builder.addCase(assignDelivery.fulfilled, (state, action) => {
      const index = state.orders.findIndex(
        (o) => o._id === action.payload.order._id
      );
      if (index !== -1) {
        state.orders[index] = action.payload.order;
      }
    });

    // Cancel Order
    builder.addCase(cancelOrder.fulfilled, (state, action) => {
      const index = state.orders.findIndex(
        (o) => o._id === action.payload.order._id
      );
      if (index !== -1) {
        state.orders[index] = action.payload.order;
      }
    });

    // Fetch Statistics
    builder.addCase(fetchOrderStatistics.fulfilled, (state, action) => {
      state.statistics = action.payload;
    });

    // ============================================
    // NEW WORKFLOW REDUCERS
    // ============================================

    // Assign Order to Designer
    builder
      .addCase(assignOrderToDesigner.pending, (state) => {
        state.loading = true;
      })
      .addCase(assignOrderToDesigner.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.orders.findIndex(
          (o) => o._id === action.payload.order._id
        );
        if (index !== -1) {
          state.orders[index] = action.payload.order;
        }
        if (state.currentOrder?._id === action.payload.order._id) {
          state.currentOrder = action.payload.order;
        }
      })
      .addCase(assignOrderToDesigner.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to assign designer";
      });

    // Assign Order to Delivery
    builder
      .addCase(assignOrderToDelivery.pending, (state) => {
        state.loading = true;
      })
      .addCase(assignOrderToDelivery.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.orders.findIndex(
          (o) => o._id === action.payload.order._id
        );
        if (index !== -1) {
          state.orders[index] = action.payload.order;
        }
        if (state.currentOrder?._id === action.payload.order._id) {
          state.currentOrder = action.payload.order;
        }
      })
      .addCase(assignOrderToDelivery.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload?.message || "Failed to assign delivery person";
      });

    // Accept Order (Designer)
    builder
      .addCase(acceptOrder.pending, (state) => {
        state.loading = true;
      })
      .addCase(acceptOrder.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.orders.findIndex(
          (o) => o._id === action.payload.order._id
        );
        if (index !== -1) {
          state.orders[index] = action.payload.order;
        }
        if (state.currentOrder?._id === action.payload.order._id) {
          state.currentOrder = action.payload.order;
        }
      })
      .addCase(acceptOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to accept order";
      });

    // Start Production (Designer)
    builder
      .addCase(startProduction.pending, (state) => {
        state.loading = true;
      })
      .addCase(startProduction.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.orders.findIndex(
          (o) => o._id === action.payload.order._id
        );
        if (index !== -1) {
          state.orders[index] = action.payload.order;
        }
        if (state.currentOrder?._id === action.payload.order._id) {
          state.currentOrder = action.payload.order;
        }
      })
      .addCase(startProduction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to start production";
      });

    // Update Progress (Designer)
    builder
      .addCase(updateProgress.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateProgress.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.orders.findIndex(
          (o) => o._id === action.payload.order._id
        );
        if (index !== -1) {
          state.orders[index] = action.payload.order;
        }
        if (state.currentOrder?._id === action.payload.order._id) {
          state.currentOrder = action.payload.order;
        }
      })
      .addCase(updateProgress.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to update progress";
      });

    // Complete Production (Designer)
    builder
      .addCase(completeProduction.pending, (state) => {
        state.loading = true;
      })
      .addCase(completeProduction.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.orders.findIndex(
          (o) => o._id === action.payload.order._id
        );
        if (index !== -1) {
          state.orders[index] = action.payload.order;
        }
        if (state.currentOrder?._id === action.payload.order._id) {
          state.currentOrder = action.payload.order;
        }
      })
      .addCase(completeProduction.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload?.message || "Failed to complete production";
      });

    // Pickup Order (Delivery)
    builder
      .addCase(pickupOrder.pending, (state) => {
        state.loading = true;
      })
      .addCase(pickupOrder.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.orders.findIndex(
          (o) => o._id === action.payload.order._id
        );
        if (index !== -1) {
          state.orders[index] = action.payload.order;
        }
        if (state.currentOrder?._id === action.payload.order._id) {
          state.currentOrder = action.payload.order;
        }
      })
      .addCase(pickupOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to pickup order";
      });

    // Deliver Order (Delivery)
    builder
      .addCase(deliverOrder.pending, (state) => {
        state.loading = true;
      })
      .addCase(deliverOrder.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.orders.findIndex(
          (o) => o._id === action.payload.order._id
        );
        if (index !== -1) {
          state.orders[index] = action.payload.order;
        }
        if (state.currentOrder?._id === action.payload.order._id) {
          state.currentOrder = action.payload.order;
        }
      })
      .addCase(deliverOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to deliver order";
      });

    // Fetch Order Tracking
    builder
      .addCase(fetchOrderTracking.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchOrderTracking.fulfilled, (state, action) => {
        state.loading = false;
        state.trackingData = action.payload.tracking;
        if (action.payload.order) {
          state.currentOrder = action.payload.order;
        }
      })
      .addCase(fetchOrderTracking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch tracking";
      });

    // Fetch Delivery Persons
    builder
      .addCase(fetchDeliveryPersons.fulfilled, (state, action) => {
        state.deliveryPersons = action.payload.deliveryPersons || [];
      })
      .addCase(fetchDeliveryPersons.rejected, (state, action) => {
        state.error =
          action.payload?.message || "Failed to fetch delivery persons";
      });

    // Fetch Designers
    builder
      .addCase(fetchDesigners.fulfilled, (state, action) => {
        state.designers = action.payload.designers || [];
      })
      .addCase(fetchDesigners.rejected, (state, action) => {
        state.error = action.payload?.message || "Failed to fetch designers";
      });

    // ============================================
    // REAL-WORLD DELIVERY PARTNER REDUCERS
    // ============================================

    // Fetch Delivery Partners
    builder
      .addCase(fetchDeliveryPartners.fulfilled, (state, action) => {
        state.deliveryPartners = action.payload.partners || [];
      })
      .addCase(fetchDeliveryPartners.rejected, (state, action) => {
        state.error =
          action.payload?.message || "Failed to fetch delivery partners";
      });

    // Ship Order
    builder
      .addCase(shipOrder.pending, (state) => {
        state.loading = true;
      })
      .addCase(shipOrder.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.orders.findIndex(
          (o) => o._id === action.payload.order?._id
        );
        if (index !== -1) {
          state.orders[index] = action.payload.order;
        }
        if (state.currentOrder?._id === action.payload.order?._id) {
          state.currentOrder = action.payload.order;
        }
      })
      .addCase(shipOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to ship order";
      });

    // Mark In Transit
    builder.addCase(markInTransit.fulfilled, (state, action) => {
      const index = state.orders.findIndex(
        (o) => o._id === action.payload.order?._id
      );
      if (index !== -1) {
        state.orders[index] = action.payload.order;
      }
    });

    // Mark Out For Delivery
    builder.addCase(markOutForDelivery.fulfilled, (state, action) => {
      const index = state.orders.findIndex(
        (o) => o._id === action.payload.order?._id
      );
      if (index !== -1) {
        state.orders[index] = action.payload.order;
      }
    });

    // Deliver Order With OTP
    builder
      .addCase(deliverOrderWithOTP.pending, (state) => {
        state.loading = true;
      })
      .addCase(deliverOrderWithOTP.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.orders.findIndex(
          (o) => o._id === action.payload.order?._id
        );
        if (index !== -1) {
          state.orders[index] = action.payload.order;
        }
        if (state.currentOrder?._id === action.payload.order?._id) {
          state.currentOrder = action.payload.order;
        }
      })
      .addCase(deliverOrderWithOTP.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to deliver order";
      });

    // Fetch Delivery Statistics
    builder.addCase(fetchDeliveryStatistics.fulfilled, (state, action) => {
      state.deliveryStatistics = action.payload.statistics;
    });

    // ============================================
    // CHAT REDUCERS
    // ============================================

    // Fetch Order Messages
    builder
      .addCase(fetchOrderMessages.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchOrderMessages.fulfilled, (state, action) => {
        state.loading = false;
        state.messages = action.payload.messages || [];
      })
      .addCase(fetchOrderMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch messages";
      });

    // Send Order Message
    builder.addCase(sendOrderMessage.fulfilled, (state, action) => {
      state.messages.push(action.payload.message);
    });

    // ============================================
    // MILESTONES REDUCERS
    // ============================================

    // Fetch Order Milestones
    builder.addCase(fetchOrderMilestones.fulfilled, (state, action) => {
      state.milestones = action.payload.milestones || [];
    });

    // Update Production Milestone
    builder
      .addCase(updateProductionMilestone.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateProductionMilestone.fulfilled, (state, action) => {
        state.loading = false;
        // Update or add milestone
        const index = state.milestones.findIndex(
          (m) => m.milestone === action.payload.milestone?.milestone
        );
        if (index !== -1) {
          state.milestones[index] = action.payload.milestone;
        } else if (action.payload.milestone) {
          state.milestones.push(action.payload.milestone);
        }
      })
      .addCase(updateProductionMilestone.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to update milestone";
      });

    // ============================================
    // COMPLETE TRACKING REDUCERS
    // ============================================

    // Fetch Complete Tracking
    builder
      .addCase(fetchCompleteTracking.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCompleteTracking.fulfilled, (state, action) => {
        state.loading = false;
        state.trackingData = action.payload.tracking;
      })
      .addCase(fetchCompleteTracking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch tracking";
      });
  },
});

// Export actions
export const {
  setOrderFilters,
  clearOrderFilters,
  clearCurrentOrder,
  clearError,
} = ordersSlice.actions;

// Selectors
export const selectOrders = (state) => state.orders.orders;
export const selectCurrentOrder = (state) => state.orders.currentOrder;
export const selectOrdersLoading = (state) => state.orders.loading;
export const selectOrdersError = (state) => state.orders.error;
export const selectOrderFilters = (state) => state.orders.filters;
export const selectOrderStatistics = (state) => state.orders.statistics;
export const selectTrackingData = (state) => state.orders.trackingData;
export const selectDeliveryPersons = (state) => state.orders.deliveryPersons;
export const selectDesigners = (state) => state.orders.designers;
export const selectDeliveryPartners = (state) => state.orders.deliveryPartners;
export const selectMessages = (state) => state.orders.messages;
export const selectMilestones = (state) => state.orders.milestones;
export const selectDeliveryStatistics = (state) =>
  state.orders.deliveryStatistics;

// Export reducer
export default ordersSlice.reducer;
