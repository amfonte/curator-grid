export function dialkitDevOptions(id: string) {
  return process.env.NODE_ENV === "development"
    ? ({ id, persist: true } as const)
    : ({ id } as const)
}
