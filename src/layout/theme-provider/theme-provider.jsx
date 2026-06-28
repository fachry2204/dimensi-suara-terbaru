// app/components/theme-provider.jsx
"use client";

import { createContext, useContext, useState, useEffect } from "react";

// Create the context
const ThemeContext = createContext();

// Helper hook to use the context
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

// The main provider component
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light"); // Force light

  // On mount, force light and clear any dark theme from localStorage
  useEffect(() => {
    setTheme("light");
    document.documentElement.setAttribute("data-bs-theme", "light");
    localStorage.setItem("theme", "light");
  }, []);

  const toggleTheme = () => {
    // Disable toggling, always stay light
    setTheme("light");
    document.documentElement.setAttribute("data-bs-theme", "light");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}