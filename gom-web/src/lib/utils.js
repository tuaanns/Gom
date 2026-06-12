import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import i18n from '../i18n';

// Combine class names with Tailwind merge
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format currency VND
export function formatVND(amount) {
  if (amount == null || isNaN(amount)) return '0₫';
  return new Intl.NumberFormat('vi-VN').format(amount) + '₫';
}

// Format number Vietnamese locale
export function formatNumber(value) {
  if (value == null || isNaN(value)) return '0';
  return new Intl.NumberFormat('vi-VN').format(value);
}

// Format date dynamically based on active locale
export function formatDate(date, opts = { dateStyle: 'medium', timeStyle: 'short' }) {
  if (!date) return '—';
  try {
    const lang = i18n?.language || 'vi';
    const locale = String(lang).toLowerCase().startsWith('en') ? 'en-US' : 'vi-VN';
    return new Intl.DateTimeFormat(locale, opts).format(new Date(date));
  } catch {
    return '—';
  }
}

// Truncate string
export function truncate(str, max = 80) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

// Sleep helper
export function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

// Format card number 4-4-4-4
export function formatCardNumber(v) {
  const digits = String(v || '').replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

// Format expiry MM/YY
export function formatExpiry(v) {
  const digits = String(v || '').replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits;
}

// Copy to clipboard
export async function copyToClipboard(text) {
  if (!navigator?.clipboard) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Email validation
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

// Get error message from axios error
export function getErrorMessage(err, fallback) {
  const defaultFallback = i18n?.t ? i18n.t('errors.server') : 'Đã có lỗi xảy ra';
  const activeFallback = fallback || defaultFallback;
  if (!err) return activeFallback;

  // Extract specific validation errors from Laravel's ValidationException response
  // Response shape: { success: false, message: "Validation failed", errors: { field: ["msg1", ...] } }
  const responseData = err?.response?.data;
  const errors = responseData?.errors;
  if (responseData?.code === 'VALIDATION_ERROR' && errors && typeof errors === 'object') {
    const firstFieldErrors = Object.values(errors).flat();
    if (firstFieldErrors.length > 0) {
      return firstFieldErrors[0];
    }
  }

  return (
    responseData?.message ||
    responseData?.error ||
    err?.message ||
    activeFallback
  );
}

// Localize package name based on current language
export function getLocalisedPackageName(name) {
  if (!name) return '—';
  const lang = i18n?.language || 'vi';
  const isEn = String(lang).toLowerCase().startsWith('en');
  if (!isEn) return name;
  const lower = name.toLowerCase().trim();
  if (lower === 'cơ bản' || lower === 'basic') return 'Basic';
  if (lower === 'phổ biến' || lower === 'popular') return 'Popular';
  if (lower === 'chuyên gia' || lower === 'expert') return 'Expert';
  return name;
}
