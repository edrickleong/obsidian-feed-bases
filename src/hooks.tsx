import { useContext } from "react";
import { App } from "obsidian";
import { AppContext } from "./context";

export const useApp = (): App => {
  const app = useContext(AppContext);
  if (!app) {
    throw new Error("useApp must be used within an AppContext provider");
  }
  return app;
};
