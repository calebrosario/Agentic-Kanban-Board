export interface ValidationResult {
  isValid: boolean;
  error: string;
}

export interface ValidationRules {
  minLength?: number;
  maxLength?: number;
  required?: boolean;
}

export const validateUsername = (
  value: string,
  t: (key: string) => string
): ValidationResult => {
  if (!value) {
    return {
      isValid: false,
      error: t('auth:errors.usernameRequired')
    };
  }
  if (value.length < 3) {
    return {
      isValid: false,
      error: t('auth:errors.usernameMinLength')
    };
  }
  if (value.length > 20) {
    return {
      isValid: false,
      error: t('auth:errors.usernameMaxLength')
    };
  }
  return {
    isValid: true,
    error: ''
  };
};

export const validatePassword = (
  value: string,
  t: (key: string) => string
): ValidationResult => {
  if (!value) {
    return {
      isValid: false,
      error: t('auth:errors.passwordRequired')
    };
  }
  if (value.length < 6) {
    return {
      isValid: false,
      error: t('auth:errors.passwordMinLength')
    };
  }
  return {
    isValid: true,
    error: ''
  };
};

export const validateEmail = (
  value: string,
  t: (key: string) => string
): ValidationResult => {
  if (!value) {
    return {
      isValid: false,
      error: t('auth:errors.emailRequired')
    };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return {
      isValid: false,
      error: t('auth:errors.emailInvalid')
    };
  }
  return {
    isValid: true,
    error: ''
  };
};
