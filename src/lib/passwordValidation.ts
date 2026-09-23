export interface PasswordRules {
  minLength: boolean;
  hasNumber: boolean;
  noName: boolean;
}

export interface PasswordValidation {
  rules: PasswordRules;
  allValid: boolean;
}

export function validatePassword(password: string, fullName: string): PasswordValidation {
  const minLength = password.length >= 12;
  const hasNumber = /\d/.test(password);

  const nameParts = fullName
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((p) => p.length >= 3);

  const passwordLower = password.toLowerCase();
  const noName = nameParts.length === 0 || !nameParts.some((part) => passwordLower.includes(part));

  const allValid = minLength && hasNumber && noName;

  return { rules: { minLength, hasNumber, noName }, allValid };
}
