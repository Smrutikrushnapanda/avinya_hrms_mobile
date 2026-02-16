import { create } from "zustand";

interface MessageState {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  incrementUnread: (by?: number) => void;
  decrementUnread: (by?: number) => void;
}

const useMessageStore = create<MessageState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),
  incrementUnread: (by = 1) =>
    set((state) => ({ unreadCount: state.unreadCount + Math.max(0, by) })),
  decrementUnread: (by = 1) =>
    set((state) => ({
      unreadCount: Math.max(0, state.unreadCount - Math.max(0, by)),
    })),
}));

export default useMessageStore;
