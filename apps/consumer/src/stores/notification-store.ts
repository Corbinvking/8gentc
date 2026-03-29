import { create } from "zustand";

interface NotificationState {
  unreadCount: number;
  isDropdownOpen: boolean;
  setUnreadCount: (count: number) => void;
  toggleDropdown: () => void;
  setDropdownOpen: (open: boolean) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  isDropdownOpen: false,
  setUnreadCount: (count) => set({ unreadCount: count }),
  toggleDropdown: () => set((s) => ({ isDropdownOpen: !s.isDropdownOpen })),
  setDropdownOpen: (open) => set({ isDropdownOpen: open }),
}));
