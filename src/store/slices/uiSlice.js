/**
 * UI Slice - Manages global UI state
 * Handles loading states, modals, sidebars, themes, and toast messages
 */

import { createSlice } from "@reduxjs/toolkit";

// Initial state
const initialState = {
  // Loading states
  globalLoading: false,

  // Modal states
  modals: {
    cartModal: false,
    loginModal: false,
    productModal: false,
    confirmModal: false,
  },

  // Sidebar/Menu states
  sidebar: {
    isOpen: false,
    activeMenu: null,
  },

  // Toast/Flash messages
  toast: {
    show: false,
    message: "",
    type: "info", // 'success', 'error', 'warning', 'info'
    duration: 3000,
  },

  // Theme
  theme: "light", // 'light' or 'dark'

  // Search/Filter panel
  filterPanel: {
    isOpen: false,
  },

  // Mobile menu
  mobileMenu: {
    isOpen: false,
  },

  // Current page title
  pageTitle: "Design Den",

  // Breadcrumbs
  breadcrumbs: [],
};

// UI slice
const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    // Global loading
    setGlobalLoading: (state, action) => {
      state.globalLoading = action.payload;
    },

    // Modal controls
    openModal: (state, action) => {
      state.modals[action.payload] = true;
    },
    closeModal: (state, action) => {
      state.modals[action.payload] = false;
    },
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach((key) => {
        state.modals[key] = false;
      });
    },

    // Sidebar controls
    toggleSidebar: (state) => {
      state.sidebar.isOpen = !state.sidebar.isOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebar.isOpen = action.payload;
    },
    setActiveMenu: (state, action) => {
      state.sidebar.activeMenu = action.payload;
    },

    // Toast messages
    showToast: (state, action) => {
      state.toast = {
        show: true,
        message: action.payload.message,
        type: action.payload.type || "info",
        duration: action.payload.duration || 3000,
      };
    },
    hideToast: (state) => {
      state.toast.show = false;
    },

    // Theme
    toggleTheme: (state) => {
      state.theme = state.theme === "light" ? "dark" : "light";
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
    },

    // Filter panel
    toggleFilterPanel: (state) => {
      state.filterPanel.isOpen = !state.filterPanel.isOpen;
    },
    setFilterPanelOpen: (state, action) => {
      state.filterPanel.isOpen = action.payload;
    },

    // Mobile menu
    toggleMobileMenu: (state) => {
      state.mobileMenu.isOpen = !state.mobileMenu.isOpen;
    },
    setMobileMenuOpen: (state, action) => {
      state.mobileMenu.isOpen = action.payload;
    },

    // Page title
    setPageTitle: (state, action) => {
      state.pageTitle = action.payload;
    },

    // Breadcrumbs
    setBreadcrumbs: (state, action) => {
      state.breadcrumbs = action.payload;
    },
    addBreadcrumb: (state, action) => {
      state.breadcrumbs.push(action.payload);
    },
    clearBreadcrumbs: (state) => {
      state.breadcrumbs = [];
    },
  },
});

// Export actions
export const {
  setGlobalLoading,
  openModal,
  closeModal,
  closeAllModals,
  toggleSidebar,
  setSidebarOpen,
  setActiveMenu,
  showToast,
  hideToast,
  toggleTheme,
  setTheme,
  toggleFilterPanel,
  setFilterPanelOpen,
  toggleMobileMenu,
  setMobileMenuOpen,
  setPageTitle,
  setBreadcrumbs,
  addBreadcrumb,
  clearBreadcrumbs,
} = uiSlice.actions;

// Selectors
export const selectGlobalLoading = (state) => state.ui.globalLoading;
export const selectModals = (state) => state.ui.modals;
export const selectSidebar = (state) => state.ui.sidebar;
export const selectToast = (state) => state.ui.toast;
export const selectTheme = (state) => state.ui.theme;
export const selectFilterPanel = (state) => state.ui.filterPanel;
export const selectMobileMenu = (state) => state.ui.mobileMenu;
export const selectPageTitle = (state) => state.ui.pageTitle;
export const selectBreadcrumbs = (state) => state.ui.breadcrumbs;

// Export reducer
export default uiSlice.reducer;
