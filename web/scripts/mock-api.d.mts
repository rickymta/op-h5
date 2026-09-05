import type { Plugin } from "vite";
/** Khi VITE_MOCK=1, tra src/mock/<duong>.json thay cho API that (xem mock-api.mjs). */
export function mockApi(prefixes?: string[]): Plugin;
