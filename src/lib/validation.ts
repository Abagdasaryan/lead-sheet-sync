// Input validation and sanitization utilities

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export const validatePassword = (password: string): { isValid: boolean; message?: string } => {
  if (password.length < 8) {
    return { isValid: false, message: "Password must be at least 8 characters long" };
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return { isValid: false, message: "Password must contain at least one lowercase letter" };
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return { isValid: false, message: "Password must contain at least one uppercase letter" };
  }
  if (!/(?=.*\d)/.test(password)) {
    return { isValid: false, message: "Password must contain at least one number" };
  }
  return { isValid: true };
};

export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes to prevent injection
    .substring(0, 1000); // Limit length
};

export const validateNumericInput = (value: string): { isValid: boolean; number?: number; message?: string } => {
  const trimmed = value.trim();
  if (trimmed === '') {
    return { isValid: false, message: "Value is required" };
  }
  
  const number = parseFloat(trimmed);
  if (isNaN(number)) {
    return { isValid: false, message: "Must be a valid number" };
  }
  
  if (number < 0) {
    return { isValid: false, message: "Must be a positive number" };
  }
  
  if (number > 1000000) {
    return { isValid: false, message: "Value too large" };
  }
  
  return { isValid: true, number };
};

export const validateUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'https:' || urlObj.protocol === 'http:';
  } catch {
    return false;
  }
};

export const sanitizeJobNumber = (jobNumber: string): string => {
  return jobNumber
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, '') // Only allow alphanumeric, hyphens, and underscores
    .substring(0, 50);
};

export const sanitizeClientName = (clientName: string): string => {
  return clientName
    .trim()
    .replace(/[<>{}]/g, '') // Remove potentially dangerous characters
    .substring(0, 200);
};