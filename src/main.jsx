import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App.jsx";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { ThemeProvider } from "./contexts/ThemeContext.jsx";
import { SystemStateProvider } from "./contexts/SystemStateContext.jsx";
import { LocationProvider } from "./contexts/LocationContext.jsx";
import { NotificationProvider } from "./contexts/NotificationContext.jsx";

import "./index.css";
import "./App.css";

const googleClientId =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "your_google_client_id_here.apps.googleusercontent.com";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
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
    </GoogleOAuthProvider>
  </React.StrictMode>
);