export const CONNECTED_PASSWORD_MIN_LENGTH = 8;
export const CONNECTED_PASSWORD_MAX_LENGTH = 8;
export const CURRENT_PASSWORD_MAX_LENGTH = 256;

export type PasswordRequirement = "length" | "lowercase" | "uppercase" | "number" | "symbol";

export function connectedPasswordRequirements(password: string): Record<PasswordRequirement, boolean> {
  return {
    length: password.length >= CONNECTED_PASSWORD_MIN_LENGTH && password.length <= CONNECTED_PASSWORD_MAX_LENGTH,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
}

export function isConnectedPasswordStrong(password: string) {
  return Object.values(connectedPasswordRequirements(password)).every(Boolean);
}
