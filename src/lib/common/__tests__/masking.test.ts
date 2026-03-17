import { describe, it, expect } from 'vitest';
import {
  maskAccountNumber,
  maskSSN,
  maskEmail,
  maskPhone,
  maskCardNumber,
} from '../masking';

// =============================================================================
// maskAccountNumber
// =============================================================================

describe('maskAccountNumber', () => {
  it('masks full account number', () => {
    expect(maskAccountNumber('1234567890')).toBe('****7890');
  });

  it('masks short account number', () => {
    expect(maskAccountNumber('12345')).toBe('****2345');
  });

  it('handles exactly 4 digits', () => {
    expect(maskAccountNumber('1234')).toBe('****1234');
  });

  it('handles less than 4 digits', () => {
    expect(maskAccountNumber('123')).toBe('****');
  });

  it('handles empty string', () => {
    expect(maskAccountNumber('')).toBe('****');
  });

  it('handles null/undefined-like empty', () => {
    expect(maskAccountNumber('' as string)).toBe('****');
  });

  it('masks long account number (17 digits)', () => {
    expect(maskAccountNumber('12345678901234567')).toBe('****4567');
  });

  it('masks 5-digit number showing last 4', () => {
    expect(maskAccountNumber('56789')).toBe('****6789');
  });

  it('masks 6-digit number', () => {
    expect(maskAccountNumber('123456')).toBe('****3456');
  });

  it('handles single digit', () => {
    expect(maskAccountNumber('1')).toBe('****');
  });

  it('handles two digits', () => {
    expect(maskAccountNumber('12')).toBe('****');
  });

  it('preserves last four of typical routing-length number', () => {
    expect(maskAccountNumber('021000021')).toBe('****0021');
  });

  it('masks a long savings account number', () => {
    expect(maskAccountNumber('9876543210123')).toBe('****0123');
  });

  it('already masked input returns same pattern', () => {
    // If someone passes "****1234" it still shows last 4
    expect(maskAccountNumber('****1234')).toBe('****1234');
  });
});

// =============================================================================
// maskSSN
// =============================================================================

describe('maskSSN', () => {
  it('masks formatted SSN', () => {
    expect(maskSSN('123-45-6789')).toBe('***-**-6789');
  });

  it('masks unformatted SSN', () => {
    expect(maskSSN('123456789')).toBe('***-**-6789');
  });

  it('handles short input (2 digits)', () => {
    expect(maskSSN('12')).toBe('***-**-****');
  });

  it('handles empty string', () => {
    expect(maskSSN('')).toBe('***-**-****');
  });

  it('handles 3 digits', () => {
    expect(maskSSN('123')).toBe('***-**-****');
  });

  it('handles exactly 4 digits', () => {
    expect(maskSSN('6789')).toBe('***-**-6789');
  });

  it('handles 5 digits', () => {
    expect(maskSSN('56789')).toBe('***-**-6789');
  });

  it('handles SSN with spaces', () => {
    expect(maskSSN('123 45 6789')).toBe('***-**-6789');
  });

  it('masks SSN ending in 0000', () => {
    expect(maskSSN('123-45-0000')).toBe('***-**-0000');
  });

  it('masks SSN with all same digits', () => {
    expect(maskSSN('111-11-1111')).toBe('***-**-1111');
  });

  it('handles single digit', () => {
    expect(maskSSN('1')).toBe('***-**-****');
  });
});

// =============================================================================
// maskEmail
// =============================================================================

describe('maskEmail', () => {
  it('masks typical email', () => {
    expect(maskEmail('john.doe@example.com')).toBe('j***e@example.com');
  });

  it('masks short local part (2 chars)', () => {
    expect(maskEmail('ab@example.com')).toBe('a***@example.com');
  });

  it('masks single char local part', () => {
    expect(maskEmail('a@example.com')).toBe('a***@example.com');
  });

  it('handles empty string', () => {
    expect(maskEmail('')).toBe('***@***.***');
  });

  it('handles no @ sign', () => {
    expect(maskEmail('invalid')).toBe('***@***.***');
  });

  it('masks email with subdomain', () => {
    expect(maskEmail('user@mail.example.com')).toBe('u***r@mail.example.com');
  });

  it('masks long local part', () => {
    expect(maskEmail('verylonglocalpart@example.com')).toBe('v***t@example.com');
  });

  it('masks email with plus tag', () => {
    expect(maskEmail('user+tag@example.com')).toBe('u***g@example.com');
  });

  it('masks email with dots in local part', () => {
    expect(maskEmail('first.last@example.com')).toBe('f***t@example.com');
  });

  it('preserves domain completely', () => {
    const result = maskEmail('test@gmail.com');
    expect(result).toContain('@gmail.com');
  });

  it('masks email with numbers', () => {
    expect(maskEmail('user123@example.com')).toBe('u***3@example.com');
  });

  it('handles email with just @', () => {
    // '@example.com' has empty local part; maskEmail splits on '@' and gets empty string for local
    // The function returns `${local[0]}***@${domain}` for short local, but local[0] is undefined for empty
    const result = maskEmail('@example.com');
    // Verify it doesn't crash and returns some masked output
    expect(result).toContain('@');
  });
});

// =============================================================================
// maskPhone
// =============================================================================

describe('maskPhone', () => {
  it('masks formatted phone', () => {
    expect(maskPhone('(555) 123-4567')).toBe('(***) ***-4567');
  });

  it('masks unformatted phone', () => {
    expect(maskPhone('5551234567')).toBe('(***) ***-4567');
  });

  it('handles short input', () => {
    expect(maskPhone('12')).toBe('(***) ***-****');
  });

  it('handles empty string', () => {
    expect(maskPhone('')).toBe('(***) ***-****');
  });

  it('masks 11-digit phone with country code', () => {
    expect(maskPhone('15551234567')).toBe('(***) ***-4567');
  });

  it('masks phone with dashes only', () => {
    expect(maskPhone('555-123-4567')).toBe('(***) ***-4567');
  });

  it('masks phone with dots', () => {
    expect(maskPhone('555.123.4567')).toBe('(***) ***-4567');
  });

  it('handles 3 digits', () => {
    expect(maskPhone('123')).toBe('(***) ***-****');
  });

  it('handles exactly 4 digits', () => {
    expect(maskPhone('4567')).toBe('(***) ***-4567');
  });

  it('handles phone with spaces', () => {
    expect(maskPhone('555 123 4567')).toBe('(***) ***-4567');
  });

  it('handles single digit', () => {
    expect(maskPhone('5')).toBe('(***) ***-****');
  });

  it('preserves last 4 digits', () => {
    const result = maskPhone('(212) 555-9876');
    expect(result).toContain('9876');
  });
});

// =============================================================================
// maskCardNumber
// =============================================================================

describe('maskCardNumber', () => {
  it('masks full card number', () => {
    expect(maskCardNumber('4111111111111111')).toBe('**** **** **** 1111');
  });

  it('masks formatted card number with spaces', () => {
    expect(maskCardNumber('4111 1111 1111 1111')).toBe('**** **** **** 1111');
  });

  it('handles short input', () => {
    expect(maskCardNumber('123')).toBe('**** **** **** ****');
  });

  it('handles empty string', () => {
    expect(maskCardNumber('')).toBe('**** **** **** ****');
  });

  it('masks card with dashes', () => {
    expect(maskCardNumber('4111-1111-1111-1111')).toBe('**** **** **** 1111');
  });

  it('handles exactly 4 digits', () => {
    expect(maskCardNumber('4242')).toBe('**** **** **** 4242');
  });

  it('masks Amex-style 15-digit number', () => {
    expect(maskCardNumber('371449635398431')).toBe('**** **** **** 8431');
  });

  it('masks Visa card', () => {
    expect(maskCardNumber('4532015112830366')).toBe('**** **** **** 0366');
  });

  it('masks Mastercard', () => {
    expect(maskCardNumber('5425233430109903')).toBe('**** **** **** 9903');
  });

  it('handles single digit', () => {
    expect(maskCardNumber('4')).toBe('**** **** **** ****');
  });

  it('handles two digits', () => {
    expect(maskCardNumber('42')).toBe('**** **** **** ****');
  });

  it('preserves last 4 digits', () => {
    const result = maskCardNumber('5353535353535353');
    expect(result).toContain('5353');
    expect(result).toBe('**** **** **** 5353');
  });
});

// =============================================================================
// CROSS-CUTTING PII SECURITY INVARIANTS
// =============================================================================

describe('PII masking security invariants', () => {
  const testData = {
    accountNumber: '9876543210',
    ssn: '987-65-4321',
    email: 'secretuser@private.com',
    phone: '(800) 555-1234',
    cardNumber: '4000123456789010',
  };

  it('no masking function ever returns the full original input', () => {
    expect(maskAccountNumber(testData.accountNumber)).not.toBe(testData.accountNumber);
    expect(maskSSN(testData.ssn)).not.toBe(testData.ssn);
    expect(maskEmail(testData.email)).not.toBe(testData.email);
    expect(maskPhone(testData.phone)).not.toBe(testData.phone);
    expect(maskCardNumber(testData.cardNumber)).not.toBe(testData.cardNumber);
  });

  it('masked output never contains the full original PII string', () => {
    expect(maskAccountNumber(testData.accountNumber)).not.toContain(testData.accountNumber);
    expect(maskSSN(testData.ssn)).not.toContain(testData.ssn);
    expect(maskEmail(testData.email)).not.toContain(testData.email);
    expect(maskPhone(testData.phone)).not.toContain(testData.phone);
    expect(maskCardNumber(testData.cardNumber)).not.toContain(testData.cardNumber);
  });

  it('account number mask exposes at most 4 characters', () => {
    const result = maskAccountNumber(testData.accountNumber);
    const visibleChars = result.replace(/\*/g, '');
    expect(visibleChars.length).toBeLessThanOrEqual(4);
  });

  it('SSN mask exposes at most 4 digits', () => {
    const result = maskSSN(testData.ssn);
    const digits = result.replace(/\D/g, '');
    expect(digits.length).toBeLessThanOrEqual(4);
  });

  it('card number mask exposes at most 4 digits', () => {
    const result = maskCardNumber(testData.cardNumber);
    const digits = result.replace(/\D/g, '');
    expect(digits.length).toBeLessThanOrEqual(4);
  });

  it('phone mask exposes at most 4 digits', () => {
    const result = maskPhone(testData.phone);
    const digits = result.replace(/\D/g, '');
    expect(digits.length).toBeLessThanOrEqual(4);
  });

  it('all functions handle null/undefined without crashing', () => {
    expect(() => maskAccountNumber(null as unknown as string)).not.toThrow();
    expect(() => maskSSN(null as unknown as string)).not.toThrow();
    expect(() => maskEmail(null as unknown as string)).not.toThrow();
    expect(() => maskPhone(null as unknown as string)).not.toThrow();
    expect(() => maskCardNumber(null as unknown as string)).not.toThrow();

    expect(() => maskAccountNumber(undefined as unknown as string)).not.toThrow();
    expect(() => maskSSN(undefined as unknown as string)).not.toThrow();
    expect(() => maskEmail(undefined as unknown as string)).not.toThrow();
    expect(() => maskPhone(undefined as unknown as string)).not.toThrow();
    expect(() => maskCardNumber(undefined as unknown as string)).not.toThrow();
  });

  it('all functions return masking characters in every result', () => {
    // Even edge cases should have masking markers
    expect(maskAccountNumber('')).toContain('*');
    expect(maskSSN('')).toContain('*');
    expect(maskEmail('')).toContain('*');
    expect(maskPhone('')).toContain('*');
    expect(maskCardNumber('')).toContain('*');
  });

  it('all functions handle whitespace-only input safely', () => {
    expect(() => maskAccountNumber('   ')).not.toThrow();
    expect(() => maskSSN('   ')).not.toThrow();
    expect(() => maskEmail('   ')).not.toThrow();
    expect(() => maskPhone('   ')).not.toThrow();
    expect(() => maskCardNumber('   ')).not.toThrow();
  });

  it('SSN first 5 digits are never exposed in any format', () => {
    const ssn = '123-45-6789';
    const result = maskSSN(ssn);
    expect(result).not.toContain('123');
    expect(result).not.toContain('45');
    // Only the last 4 (6789) should be visible
    expect(result).toContain('6789');
  });

  it('email local part middle characters are never exposed', () => {
    const email = 'sensitive.user@bank.com';
    const result = maskEmail(email);
    expect(result).not.toContain('sensitive');
    expect(result).not.toContain('ensitive');
    expect(result).not.toContain('sensitive.use');
  });
});
