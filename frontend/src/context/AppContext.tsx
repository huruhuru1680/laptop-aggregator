/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useReducer, type ReactNode } from 'react';
import type { LaptopFilters } from '../types';

export interface AppState {
  filters: LaptopFilters;
  comparisonIds: string[];
  searchQuery: string;
  sortOption: string;
}

export type Action =
  | { type: 'SET_FILTERS'; payload: Partial<LaptopFilters> }
  | { type: 'RESET_FILTERS' }
  | { type: 'ADD_TO_COMPARISON'; payload: string }
  | { type: 'REMOVE_FROM_COMPARISON'; payload: string }
  | { type: 'CLEAR_COMPARISON' }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SORT'; payload: string };

export const initialState: AppState = {
  filters: {
    brands: [],
    cpuBrands: [],
    cpuModels: [],
    gpuBrands: [],
    gpuModels: [],
    ram: [],
    storage: [],
    storageTypes: [],
    displaySizes: [],
    refreshRates: [],
    priceRange: [0, 500000],
    weightRange: [0, 10],
    sources: [],
  },
  comparisonIds: [],
  searchQuery: '',
  sortOption: 'price_asc',
};

export interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case 'RESET_FILTERS':
      return { ...state, filters: initialState.filters };
    case 'ADD_TO_COMPARISON':
      if (state.comparisonIds.length >= 4 || state.comparisonIds.includes(action.payload)) {
        return state;
      }
      return { ...state, comparisonIds: [...state.comparisonIds, action.payload] };
    case 'REMOVE_FROM_COMPARISON':
      return { ...state, comparisonIds: state.comparisonIds.filter(id => id !== action.payload) };
    case 'CLEAR_COMPARISON':
      return { ...state, comparisonIds: [] };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_SORT':
      return { ...state, sortOption: action.payload };
    default:
      return state;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}
