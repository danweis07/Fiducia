import { describe, it, expect } from "vitest";
import {
  isValidUSPhone,
  isValidEmail,
  isValidIBAN,
  isValidBIC,
  isValidSortCode,
  isValidUKAccount,
  isValidRoutingNumber,
  isValidCPF,
  isValidCNPJ,
  isValidCLABE,
  isValidCURP,
} from "../validators";

// =============================================================================
// isValidUSPhone
// =============================================================================

describe("isValidUSPhone", () => {
  it("accepts 10-digit number", () => {
    expect(isValidUSPhone("5551234567")).toBe(true);
  });

  it("accepts 11-digit starting with 1", () => {
    expect(isValidUSPhone("15551234567")).toBe(true);
  });

  it("accepts formatted number with parens", () => {
    expect(isValidUSPhone("(555) 123-4567")).toBe(true);
  });

  it("rejects 9 digits", () => {
    expect(isValidUSPhone("555123456")).toBe(false);
  });

  it("rejects 11-digit not starting with 1", () => {
    expect(isValidUSPhone("25551234567")).toBe(false);
  });

  it("accepts phone with dashes", () => {
    expect(isValidUSPhone("555-123-4567")).toBe(true);
  });

  it("accepts phone with dots", () => {
    expect(isValidUSPhone("555.123.4567")).toBe(true);
  });

  it("accepts phone with spaces", () => {
    expect(isValidUSPhone("555 123 4567")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isValidUSPhone("")).toBe(false);
  });

  it("rejects 12+ digits", () => {
    expect(isValidUSPhone("155512345678")).toBe(false);
  });

  it("accepts +1 prefix after stripping non-digits", () => {
    // +1 becomes "1" after strip, so it's 15551234567
    expect(isValidUSPhone("+15551234567")).toBe(true);
  });

  it("rejects 8 digits", () => {
    expect(isValidUSPhone("55512345")).toBe(false);
  });

  it("rejects alpha characters (no digits)", () => {
    expect(isValidUSPhone("abcdefghij")).toBe(false);
  });

  it("accepts 1-800 style number", () => {
    expect(isValidUSPhone("1-800-555-1234")).toBe(true);
  });
});

// =============================================================================
// isValidEmail
// =============================================================================

describe("isValidEmail", () => {
  it("accepts valid email", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
  });

  it("accepts email with subdomain", () => {
    expect(isValidEmail("user@mail.example.com")).toBe(true);
  });

  it("rejects missing @", () => {
    expect(isValidEmail("userexample.com")).toBe(false);
  });

  it("rejects missing domain", () => {
    expect(isValidEmail("user@")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidEmail("")).toBe(false);
  });

  it("rejects spaces", () => {
    expect(isValidEmail("user @example.com")).toBe(false);
  });

  it("accepts email with plus tag", () => {
    expect(isValidEmail("user+tag@example.com")).toBe(true);
  });

  it("accepts email with dots in local part", () => {
    expect(isValidEmail("first.last@example.com")).toBe(true);
  });

  it("accepts email with numbers", () => {
    expect(isValidEmail("user123@example.com")).toBe(true);
  });

  it("accepts email with hyphens in domain", () => {
    expect(isValidEmail("user@my-domain.com")).toBe(true);
  });

  it("rejects double @", () => {
    expect(isValidEmail("user@@example.com")).toBe(false);
  });

  it("rejects missing TLD", () => {
    expect(isValidEmail("user@example")).toBe(false);
  });

  it("rejects just @", () => {
    expect(isValidEmail("@")).toBe(false);
  });

  it("accepts long TLD", () => {
    expect(isValidEmail("user@example.technology")).toBe(true);
  });

  it("accepts email with underscore", () => {
    expect(isValidEmail("user_name@example.com")).toBe(true);
  });

  it("rejects email with space in middle", () => {
    expect(isValidEmail("user name@example.com")).toBe(false);
  });

  it("accepts .co.uk domain", () => {
    expect(isValidEmail("user@example.co.uk")).toBe(true);
  });
});

// =============================================================================
// isValidIBAN
// =============================================================================

describe("isValidIBAN", () => {
  it("accepts valid German IBAN", () => {
    expect(isValidIBAN("DE89370400440532013000")).toBe(true);
  });

  it("accepts valid GB IBAN", () => {
    expect(isValidIBAN("GB29 NWBK 6016 1331 9268 19")).toBe(true);
  });

  it("accepts valid French IBAN", () => {
    expect(isValidIBAN("FR7630006000011234567890189")).toBe(true);
  });

  it("rejects invalid checksum", () => {
    expect(isValidIBAN("DE00370400440532013000")).toBe(false);
  });

  it("rejects too short", () => {
    expect(isValidIBAN("DE89")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidIBAN("")).toBe(false);
  });
});

// =============================================================================
// isValidBIC
// =============================================================================

describe("isValidBIC", () => {
  it("accepts 8-char BIC", () => {
    expect(isValidBIC("DEUTDEFF")).toBe(true);
  });

  it("accepts 11-char BIC", () => {
    expect(isValidBIC("DEUTDEFFXXX")).toBe(true);
  });

  it("rejects 9-char BIC", () => {
    expect(isValidBIC("DEUTDEFFA")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidBIC("")).toBe(false);
  });
});

// =============================================================================
// isValidSortCode
// =============================================================================

describe("isValidSortCode", () => {
  it("accepts 6 digits", () => {
    expect(isValidSortCode("601613")).toBe(true);
  });

  it("accepts dashed format", () => {
    expect(isValidSortCode("60-16-13")).toBe(true);
  });

  it("rejects 5 digits", () => {
    expect(isValidSortCode("60161")).toBe(false);
  });

  it("rejects letters", () => {
    expect(isValidSortCode("60AB13")).toBe(false);
  });
});

// =============================================================================
// isValidUKAccount (sort code + account modulus check)
// =============================================================================

describe("isValidUKAccount", () => {
  it("accepts valid format with 8-digit account", () => {
    // Format validation — 6-digit sort code + 8-digit account
    expect(isValidUKAccount("601613", "31926819")).toBe(true);
  });

  it("rejects invalid sort code format", () => {
    expect(isValidUKAccount("6016", "31926819")).toBe(false);
  });

  it("rejects account number too short", () => {
    expect(isValidUKAccount("601613", "12345")).toBe(false);
  });

  it("rejects account number too long", () => {
    expect(isValidUKAccount("601613", "123456789")).toBe(false);
  });
});

// =============================================================================
// isValidRoutingNumber
// =============================================================================

describe("isValidRoutingNumber", () => {
  it("accepts valid routing number", () => {
    expect(isValidRoutingNumber("091000019")).toBe(true);
  });

  it("accepts another valid routing number", () => {
    expect(isValidRoutingNumber("021000021")).toBe(true);
  });

  it("rejects invalid checksum", () => {
    expect(isValidRoutingNumber("091000010")).toBe(false);
  });

  it("rejects too short", () => {
    expect(isValidRoutingNumber("0910000")).toBe(false);
  });

  it("rejects letters", () => {
    expect(isValidRoutingNumber("09100001A")).toBe(false);
  });
});

// =============================================================================
// isValidCPF (Brazil)
// =============================================================================

describe("isValidCPF", () => {
  it("accepts valid CPF", () => {
    // 529.982.247-25 is a known valid CPF
    expect(isValidCPF("52998224725")).toBe(true);
  });

  it("accepts formatted CPF", () => {
    expect(isValidCPF("529.982.247-25")).toBe(true);
  });

  it("rejects all same digits", () => {
    expect(isValidCPF("11111111111")).toBe(false);
    expect(isValidCPF("00000000000")).toBe(false);
  });

  it("rejects wrong check digit", () => {
    expect(isValidCPF("52998224726")).toBe(false);
  });

  it("rejects too short", () => {
    expect(isValidCPF("5299822472")).toBe(false);
  });

  it("rejects too long", () => {
    expect(isValidCPF("529982247250")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidCPF("")).toBe(false);
  });

  it("accepts another valid CPF", () => {
    expect(isValidCPF("453.178.287-91")).toBe(true);
  });
});

// =============================================================================
// isValidCNPJ (Brazil)
// =============================================================================

describe("isValidCNPJ", () => {
  it("accepts valid CNPJ", () => {
    // 11.222.333/0001-81 is a known valid CNPJ
    expect(isValidCNPJ("11222333000181")).toBe(true);
  });

  it("accepts formatted CNPJ", () => {
    expect(isValidCNPJ("11.222.333/0001-81")).toBe(true);
  });

  it("rejects all same digits", () => {
    expect(isValidCNPJ("11111111111111")).toBe(false);
  });

  it("rejects wrong check digit", () => {
    expect(isValidCNPJ("11222333000182")).toBe(false);
  });

  it("rejects too short", () => {
    expect(isValidCNPJ("1122233300018")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidCNPJ("")).toBe(false);
  });
});

// =============================================================================
// isValidCLABE (Mexico)
// =============================================================================

describe("isValidCLABE", () => {
  it("accepts valid CLABE", () => {
    // Known valid CLABE: 032180000118359719
    expect(isValidCLABE("032180000118359719")).toBe(true);
  });

  it("rejects wrong check digit", () => {
    expect(isValidCLABE("032180000118359710")).toBe(false);
  });

  it("rejects too short", () => {
    expect(isValidCLABE("03218000011835971")).toBe(false);
  });

  it("rejects too long", () => {
    expect(isValidCLABE("0321800001183597190")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidCLABE("")).toBe(false);
  });

  it("rejects letters", () => {
    expect(isValidCLABE("03218000011835971A")).toBe(false);
  });
});

// =============================================================================
// isValidCURP (Mexico)
// =============================================================================

describe("isValidCURP", () => {
  it("accepts valid male CURP", () => {
    expect(isValidCURP("GARC850101HDFRRL09")).toBe(true);
  });

  it("accepts valid female CURP", () => {
    expect(isValidCURP("LOPM900215MMCPRT01")).toBe(true);
  });

  it("rejects too short", () => {
    expect(isValidCURP("GARC850101HDFRR")).toBe(false);
  });

  it("rejects invalid sex character", () => {
    expect(isValidCURP("GARC850101XDFRRL09")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidCURP("")).toBe(false);
  });

  it("is case insensitive", () => {
    expect(isValidCURP("garc850101hdfrrl09")).toBe(true);
  });
});
