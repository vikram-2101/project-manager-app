// import React, { createContext, useContext, useState, useEffect } from 'react';
// import axios from 'axios';

// const AuthContext = createContext();

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// };

// export const AuthProvider = ({ children }) => {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [token, setToken] = useState(localStorage.getItem('token'));

//   const API_URL = process.env.REACT_APP_BACKEND_URL;

//   useEffect(() => {
//     if (token) {
//       axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
//       fetchCurrentUser();
//     } else {
//       setLoading(false);
//     }
//   }, [token]);

//   const fetchCurrentUser = async () => {
//     try {
//       const response = await axios.get(`${API_URL}/api/auth/me`);
//       setUser(response.data);
//     } catch (error) {
//       console.error('Failed to fetch current user:', error);
//       logout();
//     } finally {
//       setLoading(false);
//     }
//   };

//   const login = async (email, password) => {
//     try {
//       const response = await axios.post(`${API_URL}/api/auth/login`, {
//         email,
//         password
//       });

//       const { access_token, user: userData } = response.data;

//       localStorage.setItem('token', access_token);
//       setToken(access_token);
//       setUser(userData);
//       axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

//       return { success: true };
//     } catch (error) {
//       return {
//         success: false,
//         message: error.response?.data?.detail || 'Login failed'
//       };
//     }
//   };

//   const signup = async (email, password, fullName, role) => {
//     try {
//       const response = await axios.post(`${API_URL}/api/auth/signup`, {
//         email,
//         password,
//         full_name: fullName,
//         role
//       });

//       const { access_token, user: userData } = response.data;

//       localStorage.setItem('token', access_token);
//       setToken(access_token);
//       setUser(userData);
//       axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

//       return { success: true };
//     } catch (error) {
//       return {
//         success: false,
//         message: error.response?.data?.detail || 'Signup failed'
//       };
//     }
//   };

//   const logout = () => {
//     localStorage.removeItem('token');
//     setToken(null);
//     setUser(null);
//     delete axios.defaults.headers.common['Authorization'];
//   };

//   const isAdmin = () => {
//     return user?.role === 'admin';
//   };

//   const isTeamMember = () => {
//     return user?.role === 'team_member';
//   };

//   const value = {
//     user,
//     loading,
//     login,
//     signup,
//     logout,
//     isAdmin,
//     isTeamMember,
//     isAuthenticated: !!user
//   };

//   return (
//     <AuthContext.Provider value={value}>
//       {children}
//     </AuthContext.Provider>
//   );
// };

import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // Assuming you use React Router for navigation

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const navigate = useNavigate(); // Initialize useNavigate

  // Define your API base URL
  const API_URL =
    process.env.REACT_APP_BACKEND_URL || "http://localhost:5000/api/v1"; // Fallback for development

  // Axios instance with default headers for authenticated requests
  const authAxios = axios.create({
    baseURL: API_URL,
    // If your backend uses cookies for JWT (HttpOnly), you'll need withCredentials
    // For localStorage token approach, this might not be strictly necessary here,
    // but good practice if you ever switch to cookie-based auth.
    withCredentials: true,
  });

  // Interceptor for handling token expiration/unauthorized responses
  authAxios.interceptors.response.use(
    (response) => response,
    async (error) => {
      // Check for 401 Unauthorized or 403 Forbidden responses
      if (
        error.response &&
        (error.response.status === 401 || error.response.status === 403)
      ) {
        console.error(
          "Authentication error, logging out:",
          error.response.data.message
        );
        await logout(); // Attempt to log out
        // Redirect to login page only if not already on it
        if (window.location.pathname !== "/auth") {
          navigate("/auth");
        }
        return Promise.reject(error);
      }
      return Promise.reject(error);
    }
  );

  useEffect(() => {
    if (token) {
      // Set Authorization header for all future requests using the token
      authAxios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]); // Depend on 'token' to re-run when token changes

  const fetchCurrentUser = async () => {
    try {
      // This endpoint should return the current logged-in user's details
      const response = await authAxios.get(`${API_URL}/auth/me`);
      setUser(response.data.data.user); // Assuming your backend wraps user data in 'data.user'
    } catch (error) {
      console.error(
        "Failed to fetch current user:",
        error.response?.data?.message || error.message
      );
      logout(); // Log out if token is invalid or user doesn't exist
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(
        `${API_URL}/auth/login`,
        {
          email,
          password,
        },
        {
          withCredentials: true, // Important for receiving HttpOnly cookies if used
        }
      );

      // Assuming your backend returns { token, data: { user } }
      const {
        token: receivedToken,
        data: { user: userData },
      } = response.data;

      localStorage.setItem("token", receivedToken);
      setToken(receivedToken); // Update state to trigger useEffect
      setUser(userData);

      // Set the token for subsequent requests in the authAxios instance
      authAxios.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${receivedToken}`;

      return { success: true };
    } catch (error) {
      console.error(
        "Login failed:",
        error.response?.data?.message || error.message
      );
      return {
        success: false,
        message: error.response?.data?.message || "Login failed",
      };
    }
  };

  const signup = async (email, password, name, confirmPassword) => {
    // Removed 'role' parameter
    console.log(password);
    console.log(confirmPassword);
    try {
      const response = await axios.post(
        `${API_URL}/auth/register`,
        {
          // Changed to /auth/register
          email,
          password,
          name, // Match backend user model
          confirmPassword,
          // role is removed from here. It will be 'team-member' by default on backend.
        },
        {
          withCredentials: true,
        }
      );

      // Assuming your backend returns { token, data: { user } }
      const {
        token: receivedToken,
        data: { user: userData },
      } = response.data;
      console.log(receivedToken);
      localStorage.setItem("token", receivedToken);
      setToken(receivedToken);
      setUser(userData);

      authAxios.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${receivedToken}`;

      return { success: true };
    } catch (error) {
      console.error(
        "Signup failed:",
        error.response?.data?.message || error.message
      );
      return {
        success: false,
        message: error.response?.data?.message || "Signup failed",
      };
    }
  };

  const logout = async () => {
    try {
      // Call backend logout endpoint if it handles server-side sessions/token invalidation
      await authAxios.get(`${API_URL}/auth/logout`);
    } catch (error) {
      console.error("Error during server-side logout:", error);
      // Continue with client-side logout even if server-side fails
    } finally {
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
      delete authAxios.defaults.headers.common["Authorization"];
      navigate("/login"); // Redirect to login page after logout
    }
  };

  const isAdmin = () => {
    return user?.role === "admin";
  };

  const isTeamMember = () => {
    return user?.role === "team-member"; // Ensure this matches your backend enum
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    isAdmin,
    isTeamMember,
    isAuthenticated: !!user,
    authAxios, // Expose the configured axios instance for authenticated requests
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
