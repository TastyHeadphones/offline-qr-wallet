export type ISODateString = string;

export const nowIso = (): ISODateString => new Date().toISOString();
