import { createContext, useContext, useState } from "react";

const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    // Initialize theme from localStorage
    try {
      const saved = localStorage.getItem("designden_theme");
      if (saved === "dark") {
        document.body.classList.add("dark-theme");
        return true;
      }
    } catch (e) {
      console.error("Failed to load theme:", e);
    }
    return false;
  });

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);

    if (newTheme) {
      document.body.classList.add("dark-theme");
      try {
        localStorage.setItem("designden_theme", "dark");
      } catch (e) {
        console.error("Failed to save theme:", e);
      }
    } else {
      document.body.classList.remove("dark-theme");
      try {
        localStorage.setItem("designden_theme", "light");
      } catch (e) {
        console.error("Failed to save theme:", e);
      }
    }
  };

  const value = {
    isDark,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
