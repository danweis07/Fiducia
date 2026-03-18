# Legal Disclaimer

Fiducia is an experimental software framework provided as-is for research and educational purposes.

## Disclaimer & Responsibility

1. **Regulatory Compliance:** Usage of this code does not grant or constitute a banking license. The adopting institution is solely responsible for its own regulatory filings, capital requirements, and adherence to local financial laws in their respective jurisdictions.

2. **Security & Production Readiness:** While this framework includes architectural security patterns (Row Level Security, encryption at rest, audit logging), the adopting institution is responsible for performing its own security audits, penetration testing, and ensuring the software is production-ready for their specific environment. No guarantee is made regarding the completeness or effectiveness of any security measure included in this codebase.

3. **Liability:** This software is provided under the [MIT License](LICENSE). The author assumes no liability for financial loss, data breaches, or regulatory non-compliance resulting from the use or modification of this code.

4. **No Financial Advice:** Nothing in this software, its documentation, or associated materials constitutes financial, legal, or investment advice. Consult qualified professionals before making decisions based on or related to this software.

5. **Third-Party Integrations:** This framework references and provides adapter interfaces for third-party services (core banking systems, payment processors, KYC providers, AI services). These references do not imply endorsement, partnership, or affiliation with any third-party vendor. Use of third-party services is subject to their own terms, licensing, and compliance requirements.

6. **Demo & Mock Data:** Sample data, mock adapters, and demo mode functionality are provided solely for development and testing purposes. They do not represent real financial institutions, accounts, or transactions and must never be used in a production environment as a substitute for real integrations.

7. **Multi-Tenant Isolation:** While this framework enforces tenant isolation at the database level via PostgreSQL Row Level Security, the adopting institution is responsible for validating that isolation guarantees meet their regulatory and contractual obligations. No warranty is made that RLS policies are sufficient for any specific compliance framework.

8. **Jurisdictional Scope:** This framework includes configuration templates for multiple regulatory environments (US/FFIEC, EU/PSD2, UK/FCA, and others). These templates are starting points only and are not guaranteed to be current, complete, or legally sufficient. Regulatory requirements change frequently, and the adopting institution must independently verify compliance with all applicable laws.

## Contact

For questions about licensing or commercial use, open an issue on the [GitHub repository](https://github.com/danweis07/Fiducia).
