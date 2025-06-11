import { create } from 'zustand';
import { Component } from '@pmndrs/uikit';

interface ComponentStore {
  selectedComponent: Component<any> | null;
  rootContainer: Component<any> | null;
  setSelectedComponent: (component: Component<any> | null) => void;
  setRootContainer: (component: Component<any> | null) => void;
}

export const useComponentStore = create<ComponentStore>((set) => ({
  selectedComponent: null,
  rootContainer: null,
  setSelectedComponent: (component) => set({ selectedComponent: component }),
  setRootContainer: (component) => set({ rootContainer: component }),
}));