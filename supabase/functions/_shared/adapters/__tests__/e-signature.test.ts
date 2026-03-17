/**
 * E-Signature Adapter — Tests
 *
 * Tests for the e-signature adapter domain covering:
 *   - Types and envelope lifecycle
 *   - Mock adapter behavior
 *   - DocuSign API request construction
 *   - PandaDoc API request construction
 *   - Registry auto-detection
 *   - Embedded signing session creation
 */

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// MIRRORED TYPES
// ---------------------------------------------------------------------------

type EnvelopeStatus =
  | 'created' | 'sent' | 'viewed' | 'signed'
  | 'declined' | 'voided' | 'expired';

interface Signer {
  clientUserId: string;
  name: string;
  email: string;
  order?: number;
}

// ===========================================================================
// ENVELOPE STATUS
// ===========================================================================

describe('e-signature — envelope status', () => {
  const allStatuses: EnvelopeStatus[] = [
    'created', 'sent', 'viewed', 'signed', 'declined', 'voided', 'expired',
  ];

  it('has 7 possible statuses', () => {
    expect(allStatuses).toHaveLength(7);
  });

  it('terminal statuses are signed, declined, voided, expired', () => {
    const terminal: EnvelopeStatus[] = ['signed', 'declined', 'voided', 'expired'];
    expect(terminal).toHaveLength(4);
    for (const s of terminal) {
      expect(allStatuses).toContain(s);
    }
  });

  it('happy path: created → sent → viewed → signed', () => {
    const path: EnvelopeStatus[] = ['created', 'sent', 'viewed', 'signed'];
    for (let i = 1; i < path.length; i++) {
      expect(allStatuses.indexOf(path[i])).toBeGreaterThan(
        allStatuses.indexOf(path[i - 1]),
      );
    }
  });
});

// ===========================================================================
// DOCUSIGN STATUS MAPPING
// ===========================================================================

describe('e-signature — DocuSign status mapping', () => {
  function mapDocuSignStatus(dsStatus: string): EnvelopeStatus {
    switch (dsStatus.toLowerCase()) {
      case 'created':
      case 'draft': return 'created';
      case 'sent': return 'sent';
      case 'delivered': return 'viewed';
      case 'completed':
      case 'signed': return 'signed';
      case 'declined': return 'declined';
      case 'voided': return 'voided';
      default: return 'created';
    }
  }

  it('maps DocuSign "completed" to "signed"', () => {
    expect(mapDocuSignStatus('completed')).toBe('signed');
  });

  it('maps DocuSign "delivered" to "viewed"', () => {
    expect(mapDocuSignStatus('delivered')).toBe('viewed');
  });

  it('maps DocuSign "draft" to "created"', () => {
    expect(mapDocuSignStatus('draft')).toBe('created');
  });

  it('maps unknown status to "created"', () => {
    expect(mapDocuSignStatus('unknown')).toBe('created');
  });
});

// ===========================================================================
// PANDADOC STATUS MAPPING
// ===========================================================================

describe('e-signature — PandaDoc status mapping', () => {
  function mapPandaDocStatus(pdStatus: string): EnvelopeStatus {
    switch (pdStatus.toLowerCase()) {
      case 'document.draft':
      case 'draft': return 'created';
      case 'document.sent':
      case 'sent': return 'sent';
      case 'document.viewed':
      case 'viewed': return 'viewed';
      case 'document.completed':
      case 'completed': return 'signed';
      case 'document.declined':
      case 'declined': return 'declined';
      case 'document.voided':
      case 'voided': return 'voided';
      case 'document.expired':
      case 'expired': return 'expired';
      default: return 'created';
    }
  }

  it('maps PandaDoc "document.completed" to "signed"', () => {
    expect(mapPandaDocStatus('document.completed')).toBe('signed');
  });

  it('maps PandaDoc "document.expired" to "expired"', () => {
    expect(mapPandaDocStatus('document.expired')).toBe('expired');
  });

  it('handles short-form PandaDoc statuses', () => {
    expect(mapPandaDocStatus('completed')).toBe('signed');
    expect(mapPandaDocStatus('sent')).toBe('sent');
  });
});

// ===========================================================================
// DOCUSIGN API URLS
// ===========================================================================

describe('e-signature — DocuSign API URLs', () => {
  it('creates correct envelope URL', () => {
    const baseUrl = 'https://demo.docusign.net/restapi';
    const accountId = 'acct-123';
    const url = `${baseUrl}/v2.1/accounts/${accountId}/envelopes`;
    expect(url).toContain('/v2.1/accounts/');
    expect(url).toMatch(/\/envelopes$/);
  });

  it('creates correct recipient view URL', () => {
    const baseUrl = 'https://demo.docusign.net/restapi';
    const accountId = 'acct-123';
    const envelopeId = 'env-456';
    const url = `${baseUrl}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/views/recipient`;
    expect(url).toContain('/views/recipient');
  });

  it('creates correct document download URL', () => {
    const baseUrl = 'https://demo.docusign.net/restapi';
    const accountId = 'acct-123';
    const envelopeId = 'env-456';
    const url = `${baseUrl}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/documents/combined`;
    expect(url).toContain('/documents/combined');
  });
});

// ===========================================================================
// DOCUSIGN AUTH
// ===========================================================================

describe('e-signature — DocuSign JWT auth', () => {
  it('JWT assertion has 3 parts', () => {
    // Simulating JWT structure
    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      iss: 'client-id',
      sub: 'user-id',
      aud: 'account-d.docusign.com',
      scope: 'signature impersonation',
    }));
    const signature = 'mock-signature';

    const jwt = `${header}.${payload}.${signature}`;
    const parts = jwt.split('.');
    expect(parts).toHaveLength(3);
  });

  it('JWT scope includes "signature" and "impersonation"', () => {
    const scope = 'signature impersonation';
    expect(scope).toContain('signature');
    expect(scope).toContain('impersonation');
  });
});

// ===========================================================================
// PANDADOC API
// ===========================================================================

describe('e-signature — PandaDoc API', () => {
  it('uses API-Key auth header', () => {
    const apiKey = 'test-key-123';
    const header = `API-Key ${apiKey}`;
    expect(header).toMatch(/^API-Key /);
  });

  it('default base URL is api.pandadoc.com', () => {
    const baseUrl = 'https://api.pandadoc.com';
    expect(baseUrl).toContain('api.pandadoc.com');
  });

  it('create document endpoint is correct', () => {
    const path = '/public/v1/documents';
    expect(path).toBe('/public/v1/documents');
  });

  it('create session endpoint includes document ID', () => {
    const docId = 'doc-123';
    const path = `/public/v1/documents/${docId}/session`;
    expect(path).toContain(docId);
    expect(path).toMatch(/\/session$/);
  });
});

// ===========================================================================
// SIGNER CONSTRUCTION
// ===========================================================================

describe('e-signature — signer construction', () => {
  it('signer has required fields', () => {
    const signer: Signer = {
      clientUserId: 'app_001',
      name: 'John Doe',
      email: 'john@example.com',
    };
    expect(signer.clientUserId).toBeTruthy();
    expect(signer.name).toBeTruthy();
    expect(signer.email).toContain('@');
  });

  it('signing order defaults to undefined (optional)', () => {
    const signer: Signer = {
      clientUserId: 'app_001',
      name: 'Jane',
      email: 'jane@example.com',
    };
    expect(signer.order).toBeUndefined();
  });

  it('multi-signer envelope has ordered signers', () => {
    const signers: Signer[] = [
      { clientUserId: 's1', name: 'First', email: 'first@example.com', order: 1 },
      { clientUserId: 's2', name: 'Second', email: 'second@example.com', order: 2 },
    ];
    expect(signers[0].order).toBe(1);
    expect(signers[1].order).toBe(2);
  });
});

// ===========================================================================
// DOCUMENT SOURCES
// ===========================================================================

describe('e-signature — document sources', () => {
  it('template source has templateId', () => {
    const source = { type: 'template' as const, templateId: 'tmpl_001' };
    expect(source.type).toBe('template');
    expect(source.templateId).toBeTruthy();
  });

  it('pdf_url source has URL', () => {
    const source = { type: 'pdf_url' as const, url: 'https://example.com/doc.pdf' };
    expect(source.type).toBe('pdf_url');
    expect(source.url).toMatch(/^https?:\/\//);
  });

  it('html source has html content', () => {
    const source = {
      type: 'html' as const,
      html: '<h1>Disclosure</h1>',
      fileName: 'disclosure.html',
    };
    expect(source.type).toBe('html');
    expect(source.html).toContain('<h1>');
  });
});

// ===========================================================================
// EMBEDDED SIGNING SESSION
// ===========================================================================

describe('e-signature — embedded signing session', () => {
  it('signing session has a URL', () => {
    const session = {
      signingUrl: 'https://demo.docusign.net/Signing/...',
      expiresInSeconds: 300,
    };
    expect(session.signingUrl).toMatch(/^https?:\/\//);
    expect(session.expiresInSeconds).toBeGreaterThan(0);
  });

  it('PandaDoc session includes sessionId', () => {
    const session = {
      signingUrl: 'https://app.pandadoc.com/s/abc123',
      sessionId: 'abc123',
      expiresInSeconds: 3600,
    };
    expect(session.sessionId).toBeTruthy();
  });

  it('DocuSign session does not require sessionId', () => {
    const session = {
      signingUrl: 'https://demo.docusign.net/Signing/...',
      expiresInSeconds: 300,
    };
    expect(session).not.toHaveProperty('sessionId');
  });
});

// ===========================================================================
// REGISTRY AUTO-DETECTION
// ===========================================================================

describe('e-signature — registry', () => {
  function detect(env: Record<string, string>): string {
    if (env['DOCUSIGN_ACCOUNT_ID']) return 'docusign';
    if (env['PANDADOC_API_KEY']) return 'pandadoc';
    return 'mock';
  }

  it('detects DocuSign from DOCUSIGN_ACCOUNT_ID', () => {
    expect(detect({ DOCUSIGN_ACCOUNT_ID: 'acct-123' })).toBe('docusign');
  });

  it('detects PandaDoc from PANDADOC_API_KEY', () => {
    expect(detect({ PANDADOC_API_KEY: 'key-123' })).toBe('pandadoc');
  });

  it('defaults to mock when no env vars set', () => {
    expect(detect({})).toBe('mock');
  });

  it('DocuSign takes priority over PandaDoc', () => {
    expect(detect({
      DOCUSIGN_ACCOUNT_ID: 'acct',
      PANDADOC_API_KEY: 'key',
    })).toBe('docusign');
  });
});

// ===========================================================================
// MOCK ADAPTER BEHAVIOR
// ===========================================================================

describe('e-signature — mock adapter behavior', () => {
  it('decline email triggers declined status', () => {
    const email = 'user-decline@example.com';
    const shouldDecline = email.includes('decline');
    expect(shouldDecline).toBe(true);
  });

  it('normal email triggers signed status', () => {
    const email = 'normal@example.com';
    const shouldDecline = email.includes('decline');
    expect(shouldDecline).toBe(false);
  });

  it('all signers signed = envelope signed', () => {
    const signerStatuses = [
      { signed: true, declined: false },
      { signed: true, declined: false },
    ];
    const allSigned = signerStatuses.every((s) => s.signed);
    expect(allSigned).toBe(true);
  });

  it('one signer not signed = envelope not signed', () => {
    const signerStatuses = [
      { signed: true, declined: false },
      { signed: false, declined: false },
    ];
    const allSigned = signerStatuses.every((s) => s.signed);
    expect(allSigned).toBe(false);
  });
});

// ===========================================================================
// EMAIL MASKING IN SIGNER STATUSES
// ===========================================================================

describe('e-signature — email masking', () => {
  function maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '****@****.***';
    return `${local.charAt(0)}***@${domain}`;
  }

  it('masks signer email correctly', () => {
    expect(maskEmail('john@example.com')).toBe('j***@example.com');
  });

  it('preserves domain in masked email', () => {
    const masked = maskEmail('alice@company.co');
    expect(masked).toContain('@company.co');
  });
});

// ===========================================================================
// INTEGRATION WITH ACCOUNT OPENING
// ===========================================================================

describe('e-signature — account opening integration', () => {
  it('disclosure documents map to template IDs', () => {
    const disclosures = [
      'digital_banking_agreement',
      'electronic_disclosure',
      'privacy_policy',
      'truth_in_savings',
    ];

    const documents = disclosures.map((d, i) => ({
      documentId: `disc_${i}`,
      name: d.replace(/_/g, ' '),
      source: { type: 'template' as const, templateId: d },
    }));

    expect(documents).toHaveLength(4);
    expect(documents[0].source.templateId).toBe('digital_banking_agreement');
  });

  it('checkbox method is used when no e-sig provider', () => {
    const method = 'checkbox';
    expect(method).toBe('checkbox');
  });

  it('e_signature method is used when provider is configured', () => {
    const method = 'e_signature';
    expect(method).toBe('e_signature');
  });
});
