/**
 * PII Masking Utilities
 *
 * Used to mask sensitive data in UI displays.
 * The backend should also mask data — this is a defense-in-depth layer.
 */

/**
 * Mask an account number, showing only last 4 digits.
 * @example maskAccountNumber("1234567890") => "****7890"
 */
export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber.length < 4) return '****';
  const lastFour = accountNumber.slice(-4);
  return `****${lastFour}`;
}

/**
 * Mask an SSN, showing only last 4 digits.
 * @example maskSSN("123-45-6789") => "***-**-6789"
 */
export function maskSSN(ssn: string): string {
  if (!ssn) return '***-**-****';
  const digits = ssn.replace(/\D/g, '');
  if (digits.length < 4) return '***-**-****';
  return `***-**-${digits.slice(-4)}`;
}

/**
 * Mask an email address.
 * @example maskEmail("john.doe@example.com") => "j***e@example.com"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***.***';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Mask a phone number, showing only last 4 digits.
 * @example maskPhone("(555) 123-4567") => "(***) ***-4567"
 */
export function maskPhone(phone: string): string {
  if (!phone) return '(***) ***-****';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '(***) ***-****';
  return `(***) ***-${digits.slice(-4)}`;
}

/**
 * Mask a card number, showing only last 4 digits.
 * @example maskCardNumber("4111111111111111") => "**** **** **** 1111"
 */
export function maskCardNumber(cardNumber: string): string {
  if (!cardNumber) return '**** **** **** ****';
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 4) return '**** **** **** ****';
  return `**** **** **** ${digits.slice(-4)}`;
}
