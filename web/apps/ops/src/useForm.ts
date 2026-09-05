import { useState } from "react";

type TextKeys<T> = { [K in keyof T]: T[K] extends string ? K : never }[keyof T];

/** Trạng thái một form phẳng: `set` cho mọi kiểu, `text` gói sẵn onChange cho ô chữ/select. */
export function useForm<T extends object>(init: T | (() => T)) {
  const [f, setF] = useState<T>(init);
  const set = <K extends keyof T>(k: K, v: T[K]) => setF((p) => ({ ...p, [k]: v }));
  const text = (k: TextKeys<T>) => (e: { target: { value: string } }) =>
    set(k, e.target.value as unknown as T[typeof k]);
  return { f, set, text, reset: (v: T) => setF(v) };
}
