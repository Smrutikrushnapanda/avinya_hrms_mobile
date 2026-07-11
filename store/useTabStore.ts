import { create } from "zustand";

interface TabState {
  currentTabName: string;
  prevTabName: string;
  setTabName: (name: string) => void;
}

export const useTabStore = create<TabState>((set) => ({
  currentTabName: "index",
  prevTabName: "index",
  setTabName: (name) =>
    set((state) => {
      if (state.currentTabName === name) return {};
      return {
        prevTabName: state.currentTabName,
        currentTabName: name,
      };
    }),
}));

export default useTabStore;