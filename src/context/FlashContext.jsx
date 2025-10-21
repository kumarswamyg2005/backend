import { createContext, useContext, useState, useCallback } from "react";

const FlashContext = createContext(null);

export const useFlash = () => {
  const context = useContext(FlashContext);
  if (!context) {
    throw new Error("useFlash must be used within FlashProvider");
  }
  return context;
};

export const FlashProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);

  const addMessage = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setMessages((prev) => [...prev, { id, message, type }]);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      setMessages((prev) => prev.filter((msg) => msg.id !== id));
    }, 3000);
  }, []);

  const removeMessage = useCallback((id) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  }, []);

  const success = useCallback(
    (message) => addMessage(message, "success"),
    [addMessage]
  );
  const error = useCallback(
    (message) => addMessage(message, "danger"),
    [addMessage]
  );
  const info = useCallback(
    (message) => addMessage(message, "info"),
    [addMessage]
  );
  const warning = useCallback(
    (message) => addMessage(message, "warning"),
    [addMessage]
  );

  // Alias for backwards compatibility
  const showFlash = useCallback(
    (message, type = "info") => addMessage(message, type),
    [addMessage]
  );

  const value = {
    messages,
    addMessage,
    removeMessage,
    success,
    error,
    info,
    warning,
    showFlash,
  };

  return (
    <FlashContext.Provider value={value}>{children}</FlashContext.Provider>
  );
};
