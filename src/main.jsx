import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App.jsx";

import { AuthProvider } from "./contexts/AuthContext.jsx";
import { ThemeProvider } from "./contexts/ThemeContext.jsx";
import { SystemStateProvider } from "./contexts/SystemStateContext.jsx";
import { LocationProvider } from "./contexts/LocationContext.jsx";
import { NotificationProvider } from "./contexts/NotificationContext.jsx";

import "./index.css";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <LocationProvider>
          <NotificationProvider>
            <SystemStateProvider>
              <App />
            </SystemStateProvider>
          </NotificationProvider>
        </LocationProvider>
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>
);