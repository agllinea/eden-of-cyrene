import { createContext, useContext } from "react";

interface ToastContextValue {
	addToast: (message: string) => void;
}

export const ToastContext = createContext<ToastContextValue>({ addToast: () => {} });

export function useToast() {
	return useContext(ToastContext);
}
