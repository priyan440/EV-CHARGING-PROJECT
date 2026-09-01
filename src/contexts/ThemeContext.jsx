import { createContext, useContext, useState, useEffect } from "react";
import { KEYS } from "../utils/storage";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem(KEYS.THEME) || "dark";
  });

  const [fontSize, setFontSizeState] = useState(() => {
    return localStorage.getItem("ev_font_size") || "md";
  });

  useEffect(() => {
    localStorage.setItem(KEYS.THEME, theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
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