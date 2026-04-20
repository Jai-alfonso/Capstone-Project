import { useEffect, useRef } from "react";
import {
  registerListener,
  unregisterListener,
  isLogoutInProgress,
} from "@/lib/auth-service";

export const useFirestoreCleanup = (componentName: string = "unknown") => {
  const listenerIds = useRef<string[]>([]);

  const register = (unsubscribe: () => void): string => {
    const id = registerListener(unsubscribe, componentName);
    listenerIds.current.push(id);
    return id;
  };

  const unregister = (id: string) => {
    const index = listenerIds.current.indexOf(id);
    if (index > -1) {
      listenerIds.current.splice(index, 1);
    }
    unregisterListener(id);
  };

  useEffect(() => {
    return () => {
      listenerIds.current.forEach((id) => {
        unregisterListener(id);
      });
      listenerIds.current = [];
      console.log(`[${componentName}] Cleaned up all listeners`);
    };
  }, []);

  return { register, unregister, isLogoutInProgress };
};
