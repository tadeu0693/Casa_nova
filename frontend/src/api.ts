import Constants from "expo-constants";
import { storage } from "@/src/utils/storage";

export const API = `${Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || ""}/api`;
export const TOKEN_KEY = "constroi_facil_session";

export async function request(path: string, options: RequestInit = {}) {
  const token = await storage.secureGet(TOKEN_KEY, null);
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || "Algo deu errado");
  return data;
}
