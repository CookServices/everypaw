declare global {
  interface Window {
    fbq?: (action: string, eventName: string, params?: Record<string, unknown>) => void;
  }
}

export const pixelEvent = (eventName: string, params?: Record<string, unknown>): void => {
  if (typeof window === "undefined") return;
  if (typeof window.fbq !== "function") return;
  window.fbq("track", eventName, params);
};

export const trackCompleteRegistration = (): void => {
  pixelEvent("CompleteRegistration", {
    value: 0,
    currency: "USD",
    status: true,
  });
};

export const trackViewContent = (contentName: string): void => {
  pixelEvent("ViewContent", {
    content_name: contentName,
    content_category: "pet journal",
  });
};
