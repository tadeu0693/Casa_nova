import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { storage } from "@/src/utils/storage";

export const API = `${Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || ""}/api`;
export const TOKEN_KEY = "constroi_facil_session";

// The free-tier backend goes to sleep after ~15 minutes idle and can take up to a
// minute to wake back up. Without this, the first screen after a while looks frozen.
// For GET requests, if the network hasn't answered within CACHE_RACE_MS and we have a
// previous successful response saved, we hand that back immediately so the screen
// isn't blank/stuck — the real network call keeps running in the background and
// refreshes the cache for next time, it's just not shown until the NEXT screen visit.
const CACHE_RACE_MS = 3000;
const cacheKeyFor = (path: string) => `cache:${path}`;

export async function request(path: string, options: RequestInit = {}) {
  const token = await storage.secureGet(TOKEN_KEY, null);
  const isGet = !options.method || options.method.toUpperCase() === "GET";
  const cacheable = isGet && !path.startsWith("/auth");

  const doFetch = async () => {
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
  };

  if (!cacheable) return doFetch();

  const key = cacheKeyFor(path);
  const fetchPromise = doFetch()
    .then((data) => {
      AsyncStorage.setItem(key, JSON.stringify(data)).catch(() => {});
      return data;
    });

  const timeoutRace = new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), CACHE_RACE_MS));
  const first = await Promise.race([fetchPromise, timeoutRace]).catch(() => "error" as const);

  if (first === "timeout" || first === "error") {
    try {
      const cachedRaw = await AsyncStorage.getItem(key);
      if (cachedRaw) {
        // Let the real request keep going in the background so the cache is fresh
        // next time, but don't let a slow/failed backend crash this screen.
        fetchPromise.catch(() => {});
        return JSON.parse(cachedRaw);
      }
    } catch {
      // fall through to await the real request below
    }
    return fetchPromise; // no cache available — wait for the real thing (or its error)
  }
  return first;
}
