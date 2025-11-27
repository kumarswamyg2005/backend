/**
 * Products Slice - Manages product catalog and inventory
 * Handles fetching, filtering, searching, and stock management
 */

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

// Initial state
const initialState = {
  products: [],
  currentProduct: null,
  filteredProducts: [],
  loading: false,
  error: null,
  filters: {
    category: "all",
    priceRange: [0, 10000],
    searchQuery: "",
    sortBy: "name",
    inStock: false,
  },
  pagination: {
    currentPage: 1,
    totalPages: 1,
    itemsPerPage: 12,
  },
  categories: [],
};

// Async thunks

// Fetch all products
export const fetchProducts = createAsyncThunk(
  "products/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/api/products");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to fetch products" }
      );
    }
  }
);

// Fetch single product
export const fetchProductById = createAsyncThunk(
  "products/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/products/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to fetch product" }
      );
    }
  }
);

// Create product (Admin/Manager)
export const createProduct = createAsyncThunk(
  "products/create",
  async (productData, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/api/products", productData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to create product" }
      );
    }
  }
);

// Update product
export const updateProduct = createAsyncThunk(
  "products/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/admin/api/products/${id}`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to update product" }
      );
    }
  }
);

// Delete product
export const deleteProduct = createAsyncThunk(
  "products/delete",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/admin/api/products/${id}`);
      return { id, ...response.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to delete product" }
      );
    }
  }
);

// Update stock
export const updateStock = createAsyncThunk(
  "products/updateStock",
  async ({ id, stock }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/admin/api/products/${id}/stock`, {
        stock,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to update stock" }
      );
    }
  }
);

// Fetch categories
export const fetchCategories = createAsyncThunk(
  "products/fetchCategories",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/api/categories");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to fetch categories" }
      );
    }
  }
);

// Products slice
const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    // Set filters
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.currentPage = 1; // Reset to first page
    },
    // Clear filters
    clearFilters: (state) => {
      state.filters = initialState.filters;
      state.filteredProducts = state.products;
    },
    // Set search query
    setSearchQuery: (state, action) => {
      state.filters.searchQuery = action.payload;
    },
    // Set category filter
    setCategoryFilter: (state, action) => {
      state.filters.category = action.payload;
    },
    // Set price range
    setPriceRange: (state, action) => {
      state.filters.priceRange = action.payload;
    },
    // Set sort
    setSortBy: (state, action) => {
      state.filters.sortBy = action.payload;
    },
    // Set page
    setCurrentPage: (state, action) => {
      state.pagination.currentPage = action.payload;
    },
    // Apply filters locally
    applyFilters: (state) => {
      let filtered = [...state.products];

      // Search filter
      if (state.filters.searchQuery) {
        const query = state.filters.searchQuery.toLowerCase();
        filtered = filtered.filter(
          (product) =>
            product.name.toLowerCase().includes(query) ||
            product.description?.toLowerCase().includes(query)
        );
      }

      // Category filter
      if (state.filters.category !== "all") {
        filtered = filtered.filter(
          (product) => product.category === state.filters.category
        );
      }

      // Price range filter
      filtered = filtered.filter(
        (product) =>
          product.price >= state.filters.priceRange[0] &&
          product.price <= state.filters.priceRange[1]
      );

      // In stock filter
      if (state.filters.inStock) {
        filtered = filtered.filter((product) => product.stock > 0);
      }

      // Sort
      switch (state.filters.sortBy) {
        case "price-low":
          filtered.sort((a, b) => a.price - b.price);
          break;
        case "price-high":
          filtered.sort((a, b) => b.price - a.price);
          break;
        case "name":
          filtered.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case "newest":
          filtered.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );
          break;
        default:
          break;
      }

      state.filteredProducts = filtered;
      state.pagination.totalPages = Math.ceil(
        filtered.length / state.pagination.itemsPerPage
      );
    },
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Products
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload.products || action.payload;
        state.filteredProducts = action.payload.products || action.payload;
        state.error = null;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch products";
      });

    // Fetch Product by ID
    builder
      .addCase(fetchProductById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProduct = action.payload.product || action.payload;
        state.error = null;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch product";
      });

    // Create Product
    builder
      .addCase(createProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.products.push(action.payload.product);
        state.filteredProducts.push(action.payload.product);
        state.error = null;
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to create product";
      });

    // Update Product
    builder
      .addCase(updateProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.products.findIndex(
          (p) => p._id === action.payload.product._id
        );
        if (index !== -1) {
          state.products[index] = action.payload.product;
        }
        const filteredIndex = state.filteredProducts.findIndex(
          (p) => p._id === action.payload.product._id
        );
        if (filteredIndex !== -1) {
          state.filteredProducts[filteredIndex] = action.payload.product;
        }
        state.error = null;
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to update product";
      });

    // Delete Product
    builder
      .addCase(deleteProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.products = state.products.filter(
          (p) => p._id !== action.payload.id
        );
        state.filteredProducts = state.filteredProducts.filter(
          (p) => p._id !== action.payload.id
        );
        state.error = null;
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to delete product";
      });

    // Update Stock
    builder
      .addCase(updateStock.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateStock.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.products.findIndex(
          (p) => p._id === action.payload.product._id
        );
        if (index !== -1) {
          state.products[index].stock = action.payload.product.stock;
        }
      })
      .addCase(updateStock.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to update stock";
      });

    // Fetch Categories
    builder.addCase(fetchCategories.fulfilled, (state, action) => {
      state.categories = action.payload.categories || action.payload;
    });
  },
});

// Export actions
export const {
  setFilters,
  clearFilters,
  setSearchQuery,
  setCategoryFilter,
  setPriceRange,
  setSortBy,
  setCurrentPage,
  applyFilters,
  clearError,
} = productsSlice.actions;

// Selectors
export const selectProducts = (state) => state.products.products;
export const selectFilteredProducts = (state) =>
  state.products.filteredProducts;
export const selectCurrentProduct = (state) => state.products.currentProduct;
export const selectProductsLoading = (state) => state.products.loading;
export const selectProductsError = (state) => state.products.error;
export const selectFilters = (state) => state.products.filters;
export const selectPagination = (state) => state.products.pagination;
export const selectCategories = (state) => state.products.categories;

// Export reducer
export default productsSlice.reducer;
