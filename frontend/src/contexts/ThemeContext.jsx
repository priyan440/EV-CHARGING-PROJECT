import { createContext, useContext, useState, useEffect } from "react";
import { KEYS } from "../utils/storage";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    // 1. Check localStorage for theme, ev-theme, or ev_theme
    const saved =
      localStorage.getItem("theme") ||
      localStorage.getItem("ev-theme") ||
      localStorage.getItem(KEYS.THEME);

    if (saved === "light" || saved === "dark") {
      return saved;
    }

    // 2. Default is strictly LIGHT mode as per requirement
    return "light";
  });

  const [fontSize, setFontSizeState] = useState(() => {
    return localStorage.getItem("ev_font_size") || "md";
  });

  useEffect(() => {
    // Persist across all standard keys
    localStorage.setItem("theme", theme);
    localStorage.setItem("ev-theme", theme);
    localStorage.setItem(KEYS.THEME, theme);

    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    if (document.body) {
      document.body.setAttribute("data-theme", theme);
    }

    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
      root.style.colorScheme = "light";
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-font-size", fontSize);
    localStorage.setItem("ev_font_size", fontSize);
  }, [fontSize]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const setTheme = (newTheme) => {
    if (newTheme === "dark" || newTheme === "light") {
      setThemeState(newTheme);
    }
  };

  const setFontSize = (size) => {
    if (["sm", "md", "lg", "xl"].includes(size)) {
      setFontSizeState(size);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === "dark",
        toggleTheme,
        setTheme,
        fontSize,
        setFontSize,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
export default ThemeContext;