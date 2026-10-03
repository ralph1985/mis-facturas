---
name: invoice-analysis
description: "Use when analysing electricity invoices in mis-facturas. Surface discrepancies and preserve the source document as authority."
version: 1.0.0
license: MIT
platforms: [linux, macos]
metadata:
  hermes:
    tags: [mis-facturas, invoices, electricity, reconciliation, provenance]
---

# Invoice analysis in mis-facturas

Apply these project-specific rules when analysing electricity invoices or reviewing imported bill data.

## Rules

- Review the original invoice before correcting any inconsistent line item, total, date, period, consumption value, or payment information.
- Surface reconciliation discrepancies explicitly: identify the affected field or line, the stated source value, the calculated value, and whether the difference remains unresolved.
- Do not silently adjust line items to make them reconcile with a total. Preserve the source values and record the discrepancy for review.
- Keep provenance for extracted values, including the source document and relevant page or section when available.
- Distinguish an invoice fact from an interpretation or normalization; leave unsupported fields unset rather than guessing.
- Verify the corrected or imported record against the source document and the user-visible application view before reporting completion.
- Do not expose full household identifiers, connection strings, credentials, or unnecessary invoice contents in chat or logs.

## Completion criterion

An invoice analysis is complete only when the source document has been reviewed, all reconciliation differences are reported, and any write-back has been verified without concealing unresolved inconsistencies.
