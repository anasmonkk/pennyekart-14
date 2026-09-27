import { useSyncExternalStore } from "react";

let chatAvailable: boolean | null = null;
const listeners = new Set<() => void>();

export function setChatAvailable(value: boolean) {
  chatAvailable = value;
  listeners.forEach((listener) => listener());
}

export function useChatAvailable() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => chatAvailable,
    () => null,
  );
}

export function openChat() {
  window.dispatchEvent(new Event("penny:open-chat"));
}