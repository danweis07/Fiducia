/**
 * Banking Validators
 *
 * Validation helpers for banking-specific formats.
 * Supports both US-domestic and international formats.
 */

/**
 * Validate a US phone number format.
 */
export function isValidUSPhone(phone: string): boolean {
  return isValidPhone(phone, 'US');
}

/**
 * Validate a phone number for a given country.
 * When no country is specified, accepts E.164 international format.
 */
export function isValidPhone(phone: string, country?: string): boolean {
  const digits = phone.replace(/\D/g, '');

  if (country === 'US' || country === 'CA') {
    return digits.length === 10 || (digits.length === 11 && digits[0] === '1');
  }
  if (country === 'GB') {
    return digits.length === 10 || (digits.length === 11 && digits.startsWith('44'));
  }
  // E.164: 7–15 digits (including country code)
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Validate email format.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate an IBAN using MOD-97 checksum (ISO 13616).
 */
export function isValidIBAN(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/.test(cleaned)) return false;

  // Move first 4 chars to end, convert letters to numbers (A=10, B=11, ...)
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));

  // MOD-97 on large number (process in chunks to avoid BigInt)
  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + parseInt(digit, 10)) % 97;
  }

  return remainder === 1;
}

/**
 * Validate a BIC/SWIFT code (8 or 11 characters).
 */
export function isValidBIC(bic: string): boolean {
  const cleaned = bic.replace(/\s/g, '').toUpperCase();
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(cleaned);
}

/**
 * Validate a UK sort code (6 digits, with or without dashes).
 */
export function isValidSortCode(sortCode: string): boolean {
  const digits = sortCode.replace(/[-\s]/g, '');
  return /^\d{6}$/.test(digits);
}

/**
 * Validate a UK sort code + account number using a simplified modulus check.
 * Based on the Vocalink standard modulus checking algorithm (simplified).
 * Returns true if the format is valid. For full production use, integrate
 * the Vocalink modulus weight table (valacdos.txt).
 */
export function isValidUKAccount(sortCode: string, accountNumber: string): boolean {
  const sc = sortCode.replace(/[-\s]/g, '');
  const acct = accountNumber.replace(/[-\s]/g, '');
  if (!/^\d{6}$/.test(sc)) return false;
  if (!/^\d{6,8}$/.test(acct)) return false;
  // Pad account number to 8 digits
  const padded = acct.padStart(8, '0');
  // Standard modulus 11 check (MOD11) on the combined 14 digits
  // Weights: 0 0 0 0 0 0 2 1 2 6 3 7 9 10 (sort code 6 + account 8)
  const combined = sc + padded;
  const weights = [0, 0, 0, 0, 0, 0, 2, 1, 2, 6, 3, 7, 9, 10];
  let total = 0;
  for (let i = 0; i < 14; i++) {
    total += parseInt(combined[i], 10) * weights[i];
  }
  // MOD11: remainder should be 0 for a valid account
  // In the simplified version, we also accept MOD10 (some sort codes use it)
  return total % 11 === 0 || total % 10 === 0;
}

/**
 * Validate a Brazilian CPF (Cadastro de Pessoas Físicas).
 * 11 digits with two check digits using mod-11 algorithm.
 */
export function isValidCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  // Reject known invalid sequences (all same digit)
  if (/^(\d)\1{10}$/.test(digits)) return false;

  // First check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i], 10) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits[9], 10)) return false;

  // Second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i], 10) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  return remainder === parseInt(digits[10], 10);
}

/**
 * Validate a Brazilian CNPJ (Cadastro Nacional de Pessoa Jurídica).
 * 14 digits with two check digits using mod-11 algorithm.
 */
export function isValidCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  // First check digit
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i], 10) * weights1[i];
  }
  let remainder = sum % 11;
  const check1 = remainder < 2 ? 0 : 11 - remainder;
  if (check1 !== parseInt(digits[12], 10)) return false;

  // Second check digit
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(digits[i], 10) * weights2[i];
  }
  remainder = sum % 11;
  const check2 = remainder < 2 ? 0 : 11 - remainder;
  return check2 === parseInt(digits[13], 10);
}

/**
 * Validate a Mexican CLABE (Clave Bancaria Estandarizada).
 * 18 digits with mod-10 checksum.
 */
export function isValidCLABE(clabe: string): boolean {
  const digits = clabe.replace(/\D/g, '');
  if (digits.length !== 18) return false;

  const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7];
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += (parseInt(digits[i], 10) * weights[i]) % 10;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(digits[17], 10);
}

/**
 * Validate a Mexican CURP (Clave Única de Registro de Población).
 * 18 characters: 4 letters + 6 digits (DOB) + 1 letter (sex) +
 * 2 letters (state) + 3 consonants + 1 digit/letter + 1 check digit.
 */
export function isValidCURP(curp: string): boolean {
  const cleaned = curp.toUpperCase().trim();
  if (cleaned.length !== 18) return false;
  // Basic format validation
  return /^[A-Z]{4}\d{6}[HM][A-Z]{2}[A-Z]{3}[A-Z0-9]\d$/.test(cleaned);
}

/**
 * Validate a US ABA routing number (9 digits with checksum).
 */
export function isValidRoutingNumber(routing: string): boolean {
  const digits = routing.replace(/\s/g, '');
  if (!/^\d{9}$/.test(digits)) return false;

  // ABA checksum: 3*d1 + 7*d2 + d3 + 3*d4 + 7*d5 + d6 + 3*d7 + 7*d8 + d9 ≡ 0 (mod 10)
  const d = digits.split('').map(Number);
  const checksum = 3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8]);
  return checksum % 10 === 0;
}
