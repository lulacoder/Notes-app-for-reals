"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type SearchHandler = (() => void) | null;
const NavigationContext = createContext<{
  openSearch: SearchHandler;
  registerSearch: (handler: () => void) => () => void;
}>({ openSearch: null, registerSearch: () => () => {} });

export function WorkspaceNavigationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [openSearch, setOpenSearch] = useState<SearchHandler>(null);
  const registerSearch = useCallback((handler: () => void) => {
    setOpenSearch(() => handler);
    return () =>
      setOpenSearch((current) => (current === handler ? null : current));
  }, []);
  return (
    <NavigationContext value={{ openSearch, registerSearch }}>
      {children}
    </NavigationContext>
  );
}

export function useWorkspaceNavigation() {
  return useContext(NavigationContext);
}
