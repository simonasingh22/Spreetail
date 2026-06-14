import { create } from 'zustand';
import { Group } from '../types';

interface GroupState {
  activeGroup: Group | null;
  setActiveGroup: (group: Group | null) => void;
}

export const useGroupStore = create<GroupState>((set) => ({
  activeGroup: null,
  setActiveGroup: (group) => set({ activeGroup: group })
}));
