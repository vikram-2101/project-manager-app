import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext"; // Assuming useAuth provides authAxios and socket
import { useNavigate } from "react-router-dom";
import moment from "moment"; // For formatting timestamps, install: npm install moment

const NotificationPanel = ({ onClose }) => {
  const { authAxios, user, socket, setUnreadNotificationsCount } = useAuth(); // Get authAxios, user, socket, and the setter for unread count
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Function to fetch notifications from the backend
  const fetchNotifications = useCallback(async () => {
    if (!user) {
      // Don't fetch if user is not logged in
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await authAxios.get("/notifications"); // Your backend endpoint
      // Assuming your backend returns data in response.data.data.notifications
      setNotifications(response.data.data.notifications);
      // Update unread count from fetched data
      const unread = response.data.data.notifications.filter(
        (n) => !n.isRead
      ).length;
      setUnreadNotificationsCount(unread);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError("Failed to load notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user, authAxios, setUnreadNotificationsCount]);

  // Effect to fetch notifications on component mount and when user changes
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Effect to listen for real-time updates via Socket.IO
  useEffect(() => {
    if (!socket || !user) return;

    const handleNewNotification = (newNotification) => {
      console.log("Received real-time newNotification:", newNotification);
      setNotifications((prev) => [newNotification, ...prev]); // Add new notification to top
      setUnreadNotificationsCount((prev) => prev + 1); // Increment unread count
      // Optional: Show a small toast notification here
    };

    const handleNotificationUpdated = (updatedNotification) => {
      console.log(
        "Received real-time notificationUpdated:",
        updatedNotification
      );
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === updatedNotification._id ? updatedNotification : n
        )
      );
      // Re-calculate unread count based on updated list
      setUnreadNotificationsCount(
        (prev) => prev - (updatedNotification.isRead ? 1 : 0)
      );
    };

    const handleUnreadCountUpdate = (count) => {
      setUnreadNotificationsCount(count);
    };

    socket.on("newNotification", handleNewNotification);
    socket.on("notificationUpdated", handleNotificationUpdated);
    socket.on("unreadNotificationCount", handleUnreadCountUpdate); // Listen for explicit count updates

    return () => {
      socket.off("newNotification", handleNewNotification);
      socket.off("notificationUpdated", handleNotificationUpdated);
      socket.off("unreadNotificationCount", handleUnreadCountUpdate);
    };
  }, [socket, user, setUnreadNotificationsCount]); // Depend on socket and user

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      try {
        // Mark as read on backend
        // This will trigger the 'notificationUpdated' event via socket.io from backend
        // if your backend emits it after successful update
        await authAxios.patch(`/notifications/${notification._id}/read`);
        // If the socket doesn't update the state immediately, you can optimistically update
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notification._id ? { ...n, isRead: true } : n
          )
        );
        setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
        // Handle error, maybe revert optimistic update
      }
    }
    // Navigate to the linked page
    if (notification.link) {
      navigate(notification.link);
      onClose(); // Close the panel after navigation
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await authAxios.patch("/notifications/mark-all-read"); // Your backend endpoint
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true }))); // Optimistic update
      setUnreadNotificationsCount(0); // Reset count
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      setError("Failed to mark all as read. Please try again.");
    }
  };

  const getNotificationIcon = (type) => {
    // Ensure types match backend `notification.type` enum: ['task', 'comment', 'project', 'system']
    switch (type) {
      case "task":
        return (
          <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-primary-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 0 002-2M9 5a2 2 0 012-2h2a2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </div>
        );
      case "comment":
        return (
          <div className="h-8 w-8 bg-accent-100 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-accent-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
        );
      case "project": // For project assigned/updated
        return (
          <div className="h-8 w-8 bg-secondary-100 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-secondary-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 12a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zM4 19a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2z"
              />
            </svg>
          </div>
        );
      case "system": // For general system messages
        return (
          <div className="h-8 w-8 bg-neutral-100 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-neutral-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        );
      default:
        return (
          <div className="h-8 w-8 bg-neutral-100 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-neutral-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-5 5V17z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 3L3 14h8l-2 7 10-11h-8l2-7z"
              />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="w-80 bg-white border-l border-neutral-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900">
          Notifications
        </h3>
        <button
          onClick={onClose}
          className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg transition-colors duration-200"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-neutral-500">
            Loading notifications...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="h-12 w-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-neutral-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-5 5V17z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 3L3 14h8l-2 7 10-11h-8l2-7z"
                />
              </svg>
            </div>
            <p className="text-neutral-500 text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="p-2">
            {notifications.map((notification) => (
              <div
                key={notification._id} // Use _id from MongoDB
                onClick={() => handleNotificationClick(notification)}
                className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors duration-200 ${
                  notification.isRead
                    ? "hover:bg-neutral-50"
                    : "bg-primary-50 hover:bg-primary-100 border border-primary-200"
                }`}
              >
                <div className="flex items-start space-x-3">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${
                        notification.isRead
                          ? "text-neutral-700"
                          : "text-neutral-900 font-medium"
                      }`}
                    >
                      {notification.message}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      {moment(notification.createdAt).fromNow()}{" "}
                      {/* Format time */}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <div className="h-2 w-2 bg-primary-500 rounded-full"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && ( // Only show if there are notifications
        <div className="p-4 border-t border-neutral-200">
          <button
            onClick={handleMarkAllAsRead}
            className="w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Mark all as read
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
