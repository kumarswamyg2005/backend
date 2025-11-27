/**
 * Cart Slice - Manages shopping cart state
 * Handles adding, removing, updating items and cart persistence
 */

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

// Initial state
const initialState = {
  items: [],
  total: 0,
  itemCount: 0,
  loading: false,
  error: null,
  lastAdded: null, // For animation purposes
};

// Async thunks

// Fetch cart from backend
export const fetchCart = createAsyncThunk(
  "cart/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/customer/api/cart");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to fetch cart" }
      );
    }
  }
);

// Add item to cart
export const addToCartAsync = createAsyncThunk(
  "cart/addItem",
  async (
    { productId, quantity, size, color, customDesign },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post("/customer/api/cart/add", {
        productId,
        quantity,
        size,
        color,
        customDesign,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to add to cart" }
      );
    }
  }
);

// Update cart item
export const updateCartItemAsync = createAsyncThunk(
  "cart/updateItem",
  async ({ itemId, quantity }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/customer/api/cart/update/${itemId}`, {
        quantity,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to update cart item" }
      );
    }
  }
);

// Remove cart item
export const removeCartItemAsync = createAsyncThunk(
  "cart/removeItem",
  async (itemId, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/customer/api/cart/remove/${itemId}`);
      return { itemId, ...response.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to remove cart item" }
      );
    }
  }
);

// Clear cart
export const clearCartAsync = createAsyncThunk(
  "cart/clear",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.delete("/customer/api/cart/clear");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to clear cart" }
      );
    }
  }
);

// Cart slice
const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    // Local cart operations (for immediate UI feedback)
    addToCart: (state, action) => {
      const { productId, name, price, quantity, size, color, image } =
        action.payload;
      const existingItem = state.items.find(
        (item) =>
          item.productId === productId &&
          item.size === size &&
          item.color === color
      );

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        state.items.push({
          productId,
          name,
          price,
          quantity,
          size,
          color,
          image,
          _id: Date.now().toString(), // Temporary ID
        });
      }

      state.lastAdded = productId;
      cartSlice.caseReducers.calculateTotal(state);
    },

    updateCartItem: (state, action) => {
      const { itemId, quantity } = action.payload;
      const item = state.items.find((item) => item._id === itemId);
      if (item) {
        item.quantity = quantity;
        cartSlice.caseReducers.calculateTotal(state);
      }
    },

    removeCartItem: (state, action) => {
      state.items = state.items.filter((item) => item._id !== action.payload);
      cartSlice.caseReducers.calculateTotal(state);
    },

    clearCart: (state) => {
      state.items = [];
      state.total = 0;
      state.itemCount = 0;
      state.lastAdded = null;
    },

    // Calculate total
    calculateTotal: (state) => {
      state.total = state.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      state.itemCount = state.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
    },

    // Clear last added (after animation)
    clearLastAdded: (state) => {
      state.lastAdded = null;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Cart
    builder
      .addCase(fetchCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items || [];
        state.total = action.payload.total || 0;
        state.itemCount = action.payload.itemCount || 0;
        state.error = null;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch cart";
      });

    // Add to Cart
    builder
      .addCase(addToCartAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addToCartAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.items =
          action.payload.cart?.items || action.payload.items || state.items;
        state.lastAdded = action.payload.productId;
        cartSlice.caseReducers.calculateTotal(state);
        state.error = null;
      })
      .addCase(addToCartAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to add to cart";
      });

    // Update Cart Item
    builder
      .addCase(updateCartItemAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateCartItemAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.items =
          action.payload.cart?.items || action.payload.items || state.items;
        cartSlice.caseReducers.calculateTotal(state);
      })
      .addCase(updateCartItemAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to update cart";
      });

    // Remove Cart Item
    builder
      .addCase(removeCartItemAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(removeCartItemAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter(
          (item) => item._id !== action.payload.itemId
        );
        cartSlice.caseReducers.calculateTotal(state);
      })
      .addCase(removeCartItemAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to remove item";
      });

    // Clear Cart
    builder
      .addCase(clearCartAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(clearCartAsync.fulfilled, (state) => {
        state.loading = false;
        state.items = [];
        state.total = 0;
        state.itemCount = 0;
        state.lastAdded = null;
      })
      .addCase(clearCartAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to clear cart";
      });
  },
});

// Export actions
export const {
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  calculateTotal,
  clearLastAdded,
  clearError,
} = cartSlice.actions;

// Selectors
export const selectCart = (state) => state.cart;
export const selectCartItems = (state) => state.cart.items;
export const selectCartTotal = (state) => state.cart.total;
export const selectCartItemCount = (state) => state.cart.itemCount;
export const selectCartLoading = (state) => state.cart.loading;
export const selectCartError = (state) => state.cart.error;
export const selectLastAdded = (state) => state.cart.lastAdded;

// Export reducer
export default cartSlice.reducer;
