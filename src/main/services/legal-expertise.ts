const SKILLS: Record<string, string> = {
  "confidentiality-nda": `# Confidentiality and Non-Disclosure Agreement Expertise

A Non-Disclosure Agreement (NDA) protects Confidential Information shared between parties evaluating a business relationship, conducting due diligence, or performing contracted services. The drafter must clearly scope what counts as Confidential Information, who may receive it, how long confidentiality survives, and the remedies available on breach.

## Core Defined Terms
- **Confidential Information**: typically defined by category (technical, commercial, financial, business plans, customer lists, source code, trade secrets) and expressly excludes information that is public, independently developed, rightfully received from a third party, or disclosed under legal compulsion.
- **Receiving Party** and **Disclosing Party**: identify each side and any permitted affiliates, employees, contractors and professional advisers who have a need to know.
- **Permitted Purpose**: narrow the use of the information to the specific transaction or engagement (e.g., "evaluating a proposed software licensing arrangement between the parties").
- **Representative**: the defined subset of personnel and advisers who may receive disclosure.

## Key Clauses
1. Definition of Confidential Information and carve-outs.
2. Obligations of confidence (use restriction, non-disclosure, protection using at least reasonable care, no reverse engineering or decompilation unless expressly permitted).
3. Permitted disclosures to Representatives under a need-to-know basis, bound by equivalent confidentiality.
4. Compelled disclosure procedure (notice to Disclosing Party where lawful, cooperation in seeking protective orders).
5. Return or destruction of Confidential Information on termination or on written request, with certification of destruction.
6. Term of confidentiality: a fixed survival period (commonly 3 to 5 years for commercial information; indefinite for trade secrets).
7. No licence or warranty of intellectual property, no obligation to proceed with any transaction.
8. Remedies: injunctive relief acknowledgment, cumulative remedies, indemnity for breach (where negotiated).
9. Governing law and jurisdiction.

## Enforceability Considerations
- Avoid over-broad definitions that a court may strike as unreasonable restraints.
- In jurisdictions including New South Wales, equity will still imply a duty of confidence but an express contract provides clearer remedies.
- Consider carve-outs for residual knowledge where the Receiving Party has pre-existing expertise.
- For mutual NDAs, ensure the obligations are genuinely reciprocal or clearly asymmetric where appropriate.

## Standard Provisions
- No assignment without consent.
- No waiver by failure to enforce.
- Entire agreement and amendment in writing.
- Notices and counterpart execution (including electronic signature).`,

  "confidentiality-agreement": `# Confidentiality Agreement Expertise

A standalone Confidentiality Agreement protects sensitive business information disclosed outside a transactional context: employee onboarding, supplier engagements, advisory relationships, or exploratory discussions. Unlike an NDA scoped to a single transaction, a Confidentiality Agreement may be ongoing and broader in coverage.

## Core Concepts
- Define **Confidential Information** broadly but with specificity sufficient to put the Receiving Party on notice.
- Identify the **Receiving Party** and any permitted recipients.
- State the **Purpose** for disclosure — even if general, a stated purpose narrows the obligation.

## Key Clauses
1. Definition of Confidential Information with standard exclusions (public domain, independent development, third-party receipt, legal compulsion).
2. Use restriction and protection standard (at least the same care used for own information, but no less than reasonable care).
3. Permitted disclosures to employees, contractors and professional advisers with a need to know and bound by equivalent obligations.
4. Return or destruction on request or termination.
5. Survival: indefinite for trade secrets; 3–5 years for general commercial information.
6. No licence of intellectual property.
7. Remedies including injunctive relief.
8. Governing law and courts.

## Enforceability Notes
- Over-broad restraints risk being struck down; tailoring to the legitimate business interest is essential.
- Some jurisdictions (including parts of Australia) recognise an equitable duty of confidence independent of contract, but express terms provide clearer remedies.`,

  "employee-nda": `# Employee Non-Disclosure Agreement Expertise

An Employee NDA restricts the disclosure of employer Confidential Information by staff during and after employment. It complements an employment contract, a confidentiality invention assignment agreement, and any restrictive covenants.

## Core Defined Terms
- **Employer Confidential Information**: trade secrets, source code, customer lists, financial data, strategic plans, know-how, and any non-public information learned during employment.
- **Employee**: includes the individual and, where relevant, their personal representatives.
- **Term of employment** and **Survival period** (commonly 2–5 years post-employment for commercial information; indefinite for trade secrets).

## Key Clauses
1. Definition of Confidential Information with carve-outs for general knowledge and skills.
2. Non-disclosure and non-use obligations during and after employment.
3. Return of materials on termination.
4. No solicitation of customers or employees where enforceable.
5. Notification of third-party requests (e.g., subpoenas).
6. Remedies including injunctive relief.
7. Governing law.

## Enforceability Notes
- Post-employment restraints must be reasonable in scope, duration and geography.
- Australian courts (NSW Restraints of Trade Act) will read down unreasonable restraints unless severance is expressly preserved.
- Avoid capturing the employee's general skill and know-how.`,

  "confidentiality-invention-assignment": `# Confidentiality, Invention Assignment Agreement Expertise

A Confidentiality, Invention Assignment Agreement (CIA or PIIA) binds an employee or contractor to protect employer information and assign rights to inventions created during the engagement.

## Core Defined Terms
- **Confidential Information**: as per the standard NDA scope.
- **Inventions**: inventions, designs, works of authorship, software, and other intellectual property developed during the engagement.
- **Prior Inventions**: pre-existing IP listed in an exhibit and excluded from assignment.

## Key Clauses
1. Confidentiality obligations (use, non-disclosure, protection, return).
2. Assignment of Inventions: present-tense assignment ("hereby assigns") of all rights, title and interest, including the right to register and enforce.
3. Moral rights waiver where permissible, or consent to use.
4. Assistance clause: the employee agrees to execute documents and provide reasonable assistance to perfect or enforce IP rights.
5. Pre-existing Inventions exclusion list.
6. No obligation to use employee materials not assigned.
7. Survival and remedies.

## Enforceability Notes
- California Labor Code §2870-2872 and analogous statutes in several US states limit assignment of employee inventions developed on own time without employer equipment.
- In Australia, the Copyright Act and Patents Act recognise assignments but specific formalities must be met for future copyright.
- Avoid over-broad moral rights waivers that may be unenforceable.`,

  "consulting-services-agreement": `# Consulting and Master Services Agreement Expertise

A Master Services Agreement (MSA) or Consulting Services Agreement establishes the framework under which a service provider delivers professional services to a client, typically through one or more Statements of Work (SOWs). The MSA governs terms common across engagements; the SOW scopes each engagement.

## Core Defined Terms
- **Services**: the professional services to be performed, scoped in each SOW.
- **Deliverables**: tangible outputs produced under a SOW.
- **Change Order**: the agreed mechanism for modifying scope, schedule or price.
- **Acceptance Criteria**: objective standards for measuring Deliverable conformity.

## Key Clauses
1. Engagement structure and SOW process.
2. Fees: time and materials, fixed fee, or milestone payments; expenses; taxes.
3. Payment terms including late-payment interest.
4. Performance standards and warranties; remedies for non-conformance.
5. Change control procedure.
6. Term, termination (convenience, cause, insolvency), and transition/exit obligations.
7. IP ownership: work product assignment, pre-existing IP licences, open-source obligations.
8. Confidentiality.
9. Indemnities: IP infringement, third-party claims, breach of warranty.
10. Limitation of liability: caps, exclusions of indirect/consequential loss, super-cap for certain claims.
11. Insurance requirements.
12. Non-solicitation of personnel.
13. Dispute resolution and governing law.

## Enforceability Notes
- Limitation of liability is heavily negotiated; verify the cap reflects the fee base.
- Indemnity triggers and procedures must be clear; watch for defence control vs reimbursement obligations.`,

  "executive-employment-agreement": `# Executive Employment Agreement Expertise

An Executive Employment Agreement governs the employment of a senior executive, addressing compensation, duties, term, restrictive covenants, and termination. The drafter must align contract terms with applicable employment legislation and tax rules.

## Core Defined Terms
- **Employer** and **Executive**.
- **Position** and reporting line.
- **Effective Date** and **Term** (fixed or indefinite).
- **Base Salary**, **Bonus**, **Equity** and **Benefits**.
- **Good Reason** and **Cause** (for termination provisions).
- **Change of Control** (affects severance).

## Key Clauses
1. Appointment, duties and reporting.
2. Compensation: base salary, STI (short-term incentive), LTI (long-term incentive), equity grants, sign-on and retention payments.
3. Benefits: leave, superannuation/pension, insurance, expense reimbursement.
4. Confidentiality, IP assignment, and post-employment restraints (non-compete, non-solicitation).
5. Termination: by notice, for cause, for good reason, on death or disability, on change of control.
6. Severance payments and benefits continuation.
7. Garden leave and payment in lieu of notice.
8. Clawback and recoupment policies.
9. Compliance with policies and applicable law.
10. Dispute resolution and governing law.

## Enforceability Notes
- Post-employment restraints must be reasonable; in NSW the Restraints of Trade Act 1971 allows courts to read down unreasonable restraints if severance is preserved.
- Equity treatment on termination varies by plan; align contract with plan terms.
- Comply with ASIC and tax (Div 7A in Australia, 409A in the US) rules.`,

  "at-will-employment-offer-letter": `# At-Will Employment Offer Letter Expertise

An At-Will Employment Offer Letter is the standard US hiring document confirming the terms of an at-will employment relationship. Because the employment is at-will, either party may terminate at any time, with or without notice or cause.

## Core Elements
- Employer and employee identity.
- Position and reporting line.
- Start date.
- Compensation (salary, bonus eligibility, equity).
- Benefits summary.
- At-will employment statement.
- Confidentiality and IP assignment acknowledgment (or cross-reference to separate agreement).
- Background check and right-to-work conditions.
- Governing law.

## Key Clauses
1. Offer and acceptance mechanics.
2. Position, duties, and full-time effort.
3. Compensation: base salary, bonus plan, equity grant summary.
4. Benefits eligibility.
5. At-will employment statement in bold or capital letters.
6. Confidentiality, IP assignment, and restrictive covenants (where applicable).
7. Background and reference check consent.
8. Compliance with company policies.
9. No-contract-by-representation clause.
10. Governing law and dispute resolution.

## Enforceability Notes
- The at-will statement must be conspicuous to preserve the employment-at-will status under US case law.
- Avoid language that could create an implied contract of continued employment.
- Equity grants should be governed by a separate plan; the offer letter is summary only.`,

  "independent-contractor-agreement": `# Independent Contractor Agreement Expertise

An Independent Contractor Agreement engages a contractor to perform services while preserving their status as an independent business, not an employee. Misclassification risk is significant; the contract must reflect genuine independence.

## Core Defined Terms
- **Contractor** (not Employee).
- **Services** scoped by SOW or schedule.
- **Deliverables** and **Acceptance Criteria**.
- **Fees** and **Expenses**.

## Key Clauses
1. Engagement scope and SOW process.
2. Independent contractor status: no employment relationship, no benefits, no tax withholding, contractor responsible for own superannuation/pension and insurance.
3. Fees and invoicing.
4. Direction and control: contractor determines means and methods, subject to milestone review.
5. IP assignment and pre-existing IP carve-outs.
6. Confidentiality.
7. Warranties and indemnities.
8. Limitation of liability.
9. Term and termination.
10. Non-solicitation of personnel where enforceable.
11. Compliance with laws and company policies.
12. Governing law.

## Enforceability Notes
- US common law multi-factor test (IRS 20-factor and economic realities) and Australian multi-factor test examine actual relationship, not just contract labels.
- Include substitution clauses only if genuinely intended.
- Recharacterisation can trigger back taxes, superannuation, and penalties.`,

  "employee-arbitration-agreement": `# Employee Arbitration Agreement Expertise

An Employee Arbitration Agreement requires workplace disputes to be resolved through binding arbitration rather than court. Enforceability varies by jurisdiction and is subject to statutory limits on what claims may be arbitrated.

## Core Defined Terms
- **Covered Claims**: typically statutory and common-law employment claims (discrimination, harassment, wrongful termination, wage claims).
- **Excluded Claims**: claims before administrative agencies, unemployment, workers' compensation, and benefits plan claims governed by ERISA.
- **Arbitration Rules** (e.g., AAA Employment Arbitration Rules, JAMS).

## Key Clauses
1. Agreement to arbitrate Covered Claims.
2. Excluded claims.
3. Arbitration procedure: rules, arbitrator selection, location, language.
4. Fees: employer pays arbitrator and forum fees; each side bears own costs subject to statutory allocation.
5. Discovery: limited and reasonable.
6. Remedies: all remedies available in court.
7. Class and collective action waiver (where enforceable under the Federal Arbitration Act and applicable state law).
8. Confidentiality.
9. Severability and survival.
10. Governing law and 60-day opt-out window (if offered).

## Enforceability Notes
- The US Federal Arbitration Act favours arbitration but the National Labor Relations Act limits class waivers in some contexts.
- Some US states (notably California under AB 51 as challenged) restrict mandatory arbitration for employment.
- Cost-sharing must not disadvantage employees (Armendariz requirements in California).
- The Australian Fair Work Act does not generally permit compulsory arbitration of statutory claims; parties may agree to mediation only.`,

  "employee-retention-agreement": `# Employee Retention Agreement Expertise

A Retention Agreement (or Retention Bonus Agreement) provides incentives for key employees to remain employed through a critical period, such as a corporate transaction or major project delivery.

## Core Defined Terms
- **Retention Period**: the period during which the employee must remain employed.
- **Retention Bonus**: the cash or equity payment earned on completion of the Retention Period.
- **Qualifying Termination**: termination events that still trigger the bonus (e.g., termination without cause, resignation for good reason).

## Key Clauses
1. Retention Bonus amount and form (cash, equity, or both).
2. Retention Period and conditions.
3. Payment timing: lump sum on completion, or installments.
4. Treatment on qualifying termination (typically pro-rata or full payout).
5. Treatment on voluntary resignation without good reason (typically forfeiture).
6. Tax gross-up or tax assistance provisions.
7. Confidentiality of terms.
8. Governing law and relationship to primary employment agreement.

## Enforceability Notes
- Align vesting and payment triggers with tax rules (e.g., short-term deferral exceptions under IRC §409A).
- For Australian executives, consider the impact on termination entitlements under the Fair Work Act and any applicable modern award or enterprise agreement.`,

  "employee-separation-release": `# Employee Separation and Release Agreement Expertise

A Separation and Release Agreement governs the terms on which an employee departs, providing consideration (severance) in exchange for a release of claims.

## Core Defined Terms
- **Separation Date**.
- **Severance** (payments and benefits).
- **Released Claims**: all known and unknown claims arising before the execution date.
- **Protected Claims** that survive the release (e.g., workers' compensation, unemployment, vested benefits).

## Key Clauses
1. Separation date and final pay (wages, accrued leave).
2. Severance payments and schedule.
3. Release of claims (statutory and common-law).
4. Carve-outs: claims that cannot be released (e.g., workers' compensation, unemployment, vested retirement benefits, indemnification).
5. Non-disparagement and confidentiality.
6. Return of company property.
7. Non-solicitation of employees and customers (where enforceable).
8. Cooperation with post-employment investigations and litigation.
9. Non-admission of liability.
10. Tax treatment and Section 409A compliance (US) or appropriate withholding (AU).
11. Revocation period (e.g., 7 days under the Older Workers Benefit Protection Act in the US).
12. Governing law.

## Enforceability Notes
- US releases of age discrimination claims under the ADEA require 21/45-day consideration periods and a 7-day revocation period.
- Australian releases must be genuine; general releases of future claims may be unenforceable.
- Consider reasonable compromise agreements under Fair Work Act section 399 for certain statutory claims.`,

  "employee-handbook": `# Employee Handbook Expertise

An Employee Handbook communicates workplace policies, expectations, and benefits to employees. While not itself a contract, disclaimers and drafting choices affect contractual and tort exposure.

## Core Sections
1. Welcome and company overview.
2. Employment relationship statement (at-will or applicable employment standards).
3. Equal employment opportunity and anti-discrimination policies.
4. Anti-harassment and grievance procedure.
5. Code of conduct and ethics.
6. Attendance, hours of work, and remote work.
7. Leave policies (annual, personal, parental, long service).
8. Compensation, bonuses, and expense reimbursement.
9. Confidentiality, IP assignment, and acceptable use of IT.
10. Health, safety, and wellbeing.
11. Drug and alcohol policy.
12. Social media policy.
13. Whistleblower protections.
14. Discipline and termination.
15. Privacy and data protection.
16. Acknowledgment of receipt.

## Enforceability Notes
- Include a clear disclaimer that the handbook is not a contract of employment.
- Reserve the right to amend policies unilaterally where lawful.
- Comply with applicable statutes (US Title VII, ADA, FMLA, NLRA; AU Fair Work Act, WHS Act, Privacy Act).`,

  eula: `# End User Licence Agreement Expertise

An End User Licence Agreement (EULA) governs the licence granted to an end user of software, typically shrink-wrap or click-wrap, installed on the user's own device.

## Core Defined Terms
- **Licensor** and **Licensee** (end user).
- **Software**: the licensed program and documentation.
- **Authorised User**: scope of permitted users.
- **Open Source Components**: dependencies with their own licences.

## Key Clauses
1. Grant of licence: non-exclusive, non-transferable, non-sublicensable, revocable on breach.
2. Permitted use and restrictions (no reverse engineering, no hosting as a service, no benchmarking publication).
3. Term and termination; effect of termination (cease use, delete copies).
4. Fees and payment (if commercial).
5. Intellectual property ownership; reservation of rights.
6. Open source component disclosure.
7. Warranties (or disclaimers) and contractual remedies.
8. Limitation of liability.
9. Data collection and privacy (cross-reference to Privacy Policy).
10. Export and sanctions compliance.
11. Governing law and dispute resolution.

## Enforceability Notes
- Click-wrap presentation must provide conspicuous assent opportunity; browse-wrap may be weaker.
- Disclaimers of implied warranties must be conspicuous to satisfy UCC §2-316 or Australian Consumer Law.
- Limitation of liability for consumer software may be unenforceable under consumer protection law.`,

  "api-license-agreement": `# API Licence Agreement Expertise

An API Licence Agreement governs developer access to application programming interfaces, typically subject to rate limits, acceptable use policies, and data processing terms.

## Core Defined Terms
- **API**: the endpoints, documentation, and tooling provided by the provider.
- **Application**: the licensee's product integrating the API.
- **API Credentials**: keys and secrets.
- **Usage Limits**: rate, daily, or monthly quotas.

## Key Clauses
1. Grant of licence to call the API for the Application's functionality.
2. Acceptable use: no abuse, no circumvention of limits, no scraping, no reverse engineering beyond interoperability permitted by law.
3. API credentials: confidentiality, no sharing, revocation.
4. Rate limits and service levels.
5. Data: provider's content, user content, processing terms and subprocessors.
6. IP ownership; feedback licence.
7. Warranties and disclaimers.
8. Limitation of liability.
9. Suspension and termination.
10. Changes to API (deprecation notice).
11. Governing law.

## Enforceability Notes
- Provide reasonable notice for breaking API changes to limit tortious interference claims.
- Align data processing terms with GDPR/Privacy Act obligations if personal data is processed.`,

  "copyright-license-agreement": `# Copyright Licence Agreement Expertise

A Copyright Licence Agreement grants rights to use a copyright-protected work under specified conditions. Exclusive licences must be in writing and signed; non-exclusive licences may be broader in form.

## Core Defined Terms
- **Licensor** and **Licensee**.
- **Work**: the specific copyright material (literary, artistic, musical, dramatic, software, film).
- **Territory**: geographic scope.
- **Term**: duration of the licence.
- **Field of Use**: permitted use contexts.

## Key Clauses
1. Grant of licence: exclusive or non-exclusive; sublicensable or not.
2. Scope: territory, term, field of use, permitted adaptations.
3. Reservation of rights (all rights not expressly granted).
4. Fees and royalties; audit rights.
5. Quality control and approval (for branded content).
6. Attribution and moral rights.
7. Infringement enforcement: who controls litigation, cost sharing, recovery allocation.
8. Warranties of title and non-infringement; indemnities.
9. Term and termination; effect of termination (sell-off, wind-down).
10. Governing law and dispute resolution.

## Enforceability Notes
- Exclusive licencees may need to be recorded with the copyright office for full enforcement rights.
- In Australia, exclusive licensees have standing to sue under the Copyright Act 1968 (Cth) subject to formalities.
- Moral rights cannot be assigned but may be consented to.`,

  "data-processing-addendum": `# Data Processing Addendum Expertise

A Data Processing Addendum (DPA) governs the processing of personal data by a service provider on behalf of a controller, addressing GDPR Article 28 and analogous requirements.

## Core Defined Terms
- **Controller**, **Processor**, **Subprocessor**.
- **Personal Data**, **Special Category Data**.
- **Processing Activities** described in an annex.
- **Security Measures** described in an annex.
- **Personal Data Breach**.

## Key Clauses
1. Roles and scope of processing.
2. Purpose limitation: process only on Controller's documented instructions.
3. Confidentiality of personnel.
4. Security measures (technical and organisational).
5. Subprocessing: prior authorisation, flow-down terms, liability.
6. Data subject rights assistance.
7. Breach notification (without undue delay, typically 72 hours for GDPR).
8. Data protection impact assessment assistance.
9. International data transfers: Standard Contractual Clauses, UK IDTA, Australian APP 8 arrangements.
10. Deletion or return of data on termination.
11. Audit rights.
12. Cooperation with supervisory authorities.

## Enforceability Notes
- GDPR Article 28(3) mandates specific DPA terms; missing provisions can render the entire controller-processor arrangement non-compliant.
- Australian APP 8 disclosure overseas requires reasonable steps to ensure recipient complies with APPs.
- SCCs must be adopted in full without contradictory terms.`,

  "gdpr-dpa": `# GDPR Data Processing Addendum Expertise

A GDPR DPA implements the requirements of Article 28 of the General Data Protection Regulation (EU) 2016/679 for controller-processor relationships involving EU/EEA personal data.

## Core Elements
- Roles of the parties (controller, processor, joint controller).
- Subject matter, duration, nature and purpose of processing.
- Type of personal data and categories of data subjects.
- Technical and organisational measures.
- List of subprocessors.
- International transfer mechanism (EU SCCs, BCRs, adequacy).

## Key Clauses
1. Processing only on documented instructions.
2. Personnel confidentiality and training.
3. Security measures aligned with Article 32.
4. Use of subprocessors with prior authorisation and flow-down.
5. Assistance with data subject rights requests.
6. Breach notification within 72 hours of awareness.
7. DPIA and prior consultation assistance.
8. Deletion and return of personal data.
9. Audit and inspection rights.
10. International transfers via EU Standard Contractual Clauses (2021).
11. Cooperation with supervisory authorities.
12. Liability and indemnity allocation per Article 82.

## Enforceability Notes
- The DPA must be in writing (electronic accepted).
- SCCs cannot be amended to contradict their protective purpose.
- Breach notification timelines run from "awareness" — define the trigger carefully.`,

  "hipaa-baa": `# HIPAA Business Associate Agreement Expertise

A Business Associate Agreement (BAA) implements the HIPAA Privacy and Security Rules (45 CFR Parts 160 and 164) for covered entities engaging business associates that create, receive, maintain, or transmit Protected Health Information (PHI).

## Core Defined Terms
- **Covered Entity** and **Business Associate**.
- **Protected Health Information (PHI)**: individually identifiable health information.
- **Designated Record Set**.
- **Breach of Unsecured PHI**.

## Key Clauses
1. Permitted uses and disclosures by Business Associate (minimum necessary, for proper management and administration, legal responsibilities).
2. Safeguards aligned with the HIPAA Security Rule (administrative, physical, technical).
3. Use of subcontractors with flow-down BAAs.
4. Breach notification to Covered Entity without unreasonable delay and no later than 60 calendar days.
5. Data access by the individual and amendment rights.
6. Internal records, practices, and books for compliance.
7. Documentation of disclosures (accounting of disclosures).
8. Return or destruction of PHI on termination; if not feasible, extend protections.
9. Compliance with HHS investigations and inspections.
10. Reporting of violations of the Privacy and Security Rules.
11. De-identification standards (Safe Harbor or Expert Determination).

## Enforceability Notes
- HIPAA mandates a BAA under 45 CFR §164.502(e) and §164.308(b).
- The HITECH Act extended direct liability of business associates.
- State privacy laws (e.g., California CMIA, Texas HB 300) may impose additional requirements.`,

  "asset-purchase-agreement": `# Asset Purchase Agreement Expertise

An Asset Purchase Agreement (APA) governs the sale of a business's assets rather than its shares, allowing the buyer to select specific assets and liabilities to acquire.

## Core Defined Terms
- **Seller** and **Purchaser**.
- **Acquired Assets**: tangible and intangible assets being transferred.
- **Excluded Assets**: assets retained by Seller.
- **Assumed Liabilities**: liabilities the Purchaser takes on.
- **Closing** and **Effective Time**.

## Key Clauses
1. Sale and purchase of Acquired Assets.
2. Purchase price, adjustments, and allocation.
3. Closing mechanics and deliverables.
4. Employee matters: TUPE/ATO or analogous transfer obligations; offers of employment; accrued leave.
5. Contracts: assignment and assumption (with counterparty consents).
6. Intellectual property: assignment and licence-back where needed.
7. Real property: lease assignments or new leases.
8. Tax matters: GST/VAT, transfer duty (state stamp duty), tax indemnities.
9. Warranties (title, capacity, authority) and indemnities (fundamental, general, specific).
10. Non-competition and non-solicitation covenants.
11. Conditions precedent including regulatory approvals (ACCC, FIRB).
12. Limitations on liability (caps, baskets, de minimis, time limits).
13. Escrow and holdback.
14. Governing law and dispute resolution.

## Enforceability Notes
- Anti-assignment clauses require consent; failure to obtain may leave contracts with Seller.
- TUPE (UK) and analogous provisions (Fair Work Act transfer of business in Australia) carry employees automatically.
- Stamp duty/transfer tax varies by jurisdiction and asset class.`,

  "escrow-agreement": `# Escrow Agreement Expertise

An Escrow Agreement deposits assets (typically source code, funds, or shares) with a neutral escrow agent for release to a beneficiary upon specified conditions.

## Core Defined Terms
- **Depositor** (typically the seller or licensor).
- **Beneficiary** (typically the buyer or licensee).
- **Escrow Agent** (neutral third party).
- **Escrow Materials**: the deposited assets.
- **Release Conditions**: events triggering release.

## Key Clauses
1. Appointment of Escrow Agent and acceptance of role.
2. Deposit of Escrow Materials and updates.
3. Verification rights (Beneficiary may verify the materials).
4. Release conditions: e.g., bankruptcy of Depositor, material breach uncured, change of control, discontinuation of support.
5. Release procedure: notice, objection period, dispute resolution.
6. Escrow Agent's duties (ministerial, no investigative duty) and liability limitations.
7. Fees: who pays, when.
8. Term and termination.
9. Treatment of confidential information.
10. Governing law and dispute resolution.

## Enforceability Notes
- Escrow agents have limited duties and should not be required to make substantive determinations.
- Source code escrow requires robust verification to be meaningful.
- Align release conditions with the underlying licence or services agreement.`,

  "finders-fee-agreement": `# Finder's Fee Agreement Expertise

A Finder's Fee Agreement compensates an introducer for identifying a business opportunity (typically a transaction, customer, or investment) that the principal subsequently pursues.

## Core Defined Terms
- **Principal** and **Finder**.
- **Introduction**: identifying a specific opportunity or party.
- **Transaction**: the event triggering the fee.
- **Fee**: the commission amount or percentage.

## Key Clauses
1. Scope of finder's services (introduction only, no advisory or solicitation).
2. Definition of Transaction triggering the fee.
3. Fee: percentage of transaction value or fixed amount; payment timing.
4. Exclusions: transactions with parties already known to Principal.
5. Tail period: how long the introduction obligation survives (commonly 12-24 months).
6. Finder's representations: not a broker-dealer, compliance with applicable securities laws.
7. Confidentiality.
8. Non-circumvention.
9. Independent contractor status.
10. Governing law.

## Enforceability Notes
- US broker-dealer registration under the Exchange Act may be required for transaction-based compensation linked to securities.
- Australian AFSL requirements may apply for financial product introductions.
- Tail periods must be reasonable to be enforceable.`,

  "guaranty-agreement": `# Guaranty Agreement Expertise

A Guaranty Agreement binds a guarantor to satisfy the obligations of a principal debtor to a creditor if the principal debtor fails to perform.

## Core Defined Terms
- **Guarantor** and **Creditor** (or **Beneficiary**).
- **Principal Debtor** (or **Obligor**).
- **Guaranteed Obligations**: the underlying obligations covered.
- **Guarantee**: the suretyship promise.

## Key Clauses
1. Guarantee: continuing, unconditional (subject to carve-outs).
2. Scope of Guaranteed Obligations.
3. Demand requirement: when the Guarantor must pay.
4. Waivers: presentment, demand, protest, notice of default.
5. Subrogation rights on payment.
6. Standstill: no enforcement until the Creditor has exhausted remedies against the Obligor (limited or waived).
7. Continuing guarantee covering future obligations.
8. Subordination of Guarantor's claims against Obligor.
9. Releases: conditions under which the guarantee is discharged.
10. Governing law and jurisdiction.

## Enforceability Notes
- Guarantees in writing satisfy the Statute of Frauds (US) or analogous requirements (AU Instruments Act 1958).
- Continuing guarantees remain in force until revoked or terminated per terms.
- Suretyship defences (fraud, material modification without consent) may discharge the guarantor.`,

  "franchise-agreement": `# Franchise Agreement Expertise

A Franchise Agreement grants a franchisee the right to operate a business under the franchisor's brand, system, and intellectual property in exchange for fees and ongoing obligations.

## Core Defined Terms
- **Franchisor** and **Franchisee**.
- **Franchised Business**: the business operated under the agreement.
- **Territory**: exclusive or non-exclusive area.
- **System**: the franchisor's operating methods, manuals, and marks.
- **Initial Fee** and **Royalty**.

## Key Clauses
1. Grant of franchise and territory.
2. Initial fees, royalties, and marketing fund contributions.
3. Site selection, build-out, and approval.
4. Training and opening assistance.
5. Operating standards, manuals, and quality control.
6. Supply chain: approved suppliers and central purchasing.
7. Marketing and advertising obligations.
8. Reporting, audit, and records.
9. Intellectual property licence and restrictions.
10. Insurance and indemnities.
11. Transfer and assignment restrictions.
12. Renewal, termination, and post-termination obligations.
13. Non-competition and non-solicitation.
14. Dispute resolution and governing law.
15. Compliance with franchise disclosure laws (FTC Franchise Rule in the US, Franchising Code of Conduct in Australia).

## Enforceability Notes
- Disclosure documents must be provided in the prescribed form (FTC Rule 16 CFR §436; AU Franchising Code).
- Cooling-off periods apply (AU: 7 days after signing or after disclosure, whichever is later).
- Good faith obligations apply in many jurisdictions.`,

  "indemnification-agreement": `# Indemnification Agreement Expertise

An Indemnification Agreement provides for one party (the indemnitor) to compensate another (the indemnitee) for specified losses, typically arising from third-party claims.

## Core Defined Terms
- **Indemnitor** and **Indemnitee**.
- **Losses**: damages, settlements, judgments, costs, and expenses.
- **Claims**: third-party demands or proceedings.
- **Cap**: maximum liability.

## Key Clauses
1. Indemnity scope (IP infringement, breach of warranty, third-party claims, regulatory action).
2. Procedure for third-party claims: notice, control of defence, cooperation, settlement consent.
3. Carve-outs for settlement without consent (consent not unreasonably withheld).
4. Direct claims: notice, cure period, limitations.
5. Limitations: cap, basket, de minimis, time limits.
6. Exclusive remedies vs cumulative remedies.
7. Insurance backstop.
8. Subrogation.
9. Survival of indemnity obligations.
10. Governing law.

## Enforceability Notes
- Indemnities for own negligence may be unenforceable in some jurisdictions absent clear language.
- Anti-indemnity statutes in certain US states (e.g., Texas, Louisiana) limit construction indemnities.
- Express carve-outs for gross negligence and wilful misconduct are typical.`,

  "invention-assignment-agreement": `# Invention Assignment Agreement Expertise

An Invention Assignment Agreement obligates an employee or contractor to assign rights in inventions developed during the engagement to the employer or client.

## Core Defined Terms
- **Employee** or **Contractor**.
- **Employer** or **Company**.
- **Inventions**: inventions, improvements, works of authorship, software, and know-how.
- **Prior Inventions**: pre-existing IP excluded from assignment.

## Key Clauses
1. Assignment of Inventions created during the engagement, within the scope of work, or using company resources.
2. Present-tense assignment language ("hereby assigns").
3. Moral rights waiver where permissible, or consent to use.
4. Assistance clause: execute documents, provide testimony.
5. Pre-existing Inventions exclusion exhibit.
6. Power of attorney for execution of documents.
7. No obligation to use assigned materials.
8. Survival of obligations.
9. Governing law.

## Enforceability Notes
- US state laws vary: California Labor Code §2870-2872, Delaware, Washington, and others limit assignment of inventions developed on the employee's own time without company resources.
- Future copyright assignments may require additional formalities in Australia.
- Open source contributions may conflict with assignment obligations; clarify permitted contributions.`,

  "investors-rights-agreement": `# Investors' Rights Agreement Expertise

An Investors' Rights Agreement (IRA) among a company and its investors sets out the rights, privileges, and obligations of investors in a private company, typically in venture and growth equity financing rounds.

## Core Defined Terms
- **Company** and **Investors** (Major and others).
- **Registrable Securities**: shares eligible for registration rights.
- **Key Holder**: founders and management with specific obligations.

## Key Clauses
1. Registration rights: demand, piggyback, and S-3/F-3 registration.
2. Information rights: financial statements, budgets, inspection rights.
3. Voting rights and matters requiring consent.
4. Right to participate in future issuances (pro rata).
5. Management and observer rights.
6. Transfer restrictions, rights of first refusal, co-sale.
7. Lock-up obligations on IPO.
8. Board composition and director indemnification.
9. Reimbursement of expenses.
10. Governing law and dispute resolution.

## Enforceability Notes
- Registration rights must comply with US securities law registration exemptions and timing.
- Transfer restrictions must comply with Rule 144 holding periods.
- Drag-along provisions may need to be reasonable to be enforceable.`,

  "convertible-note-purchase-agreement": `# Convertible Note Purchase Agreement Expertise

A Convertible Note Purchase Agreement governs the issuance of debt that converts into equity upon specified trigger events, commonly used in early-stage startup financings.

## Core Defined Terms
- **Company** and **Investors**.
- **Notes**: the convertible promissory notes.
- **Maturity Date**.
- **Conversion Events**: qualified financing, change of control, IPO, or maturity.
- **Discount** and **Valuation Cap**.

## Key Clauses
1. Sale and issuance of Notes; principal amount, interest rate.
2. Closing mechanics and deliverables.
3. Conversion: automatic on qualified financing, optional on change of control, at maturity.
4. Conversion price mechanics: discount to price per share, or valuation cap, whichever yields lower price.
5. Repayment and prepayment.
6. Events of default and remedies.
7. Information rights and covenants.
8. Transfer restrictions.
9. Subordination to senior debt.
10. Governing law.

## Enforceability Notes
- Notes must comply with securities law exemptions (Reg D in the US, ASIC offers in Australia).
- Usury laws cap interest rates; choose rates below limits.
- Subordination terms should align with senior lenders' intercreditor arrangements.`,

  "equity-financing-term-sheet": `# Equity Financing Term Sheet Expertise

A Term Sheet sets out the principal terms of an equity financing, typically non-binding except for confidentiality, exclusivity, and expense provisions. It forms the basis for definitive agreements.

## Core Terms
- Pre-money and post-money valuation.
- Investment amount and price per share.
- Liquidation preference.
- Anti-dilution protection.
- Board composition.
- Protective provisions (veto rights).
- Founder vesting.
- Information, participation, and registration rights.
- Drag-along, tag-along, and ROFR.
- Exclusivity, confidentiality, and expenses.

## Key Clauses (Non-Binding)
1. Securities to be issued (preferred shares).
2. Valuation and investment amount.
3. Liquidation preference (1x non-participating typical).
4. Anti-dilution (broad-based weighted average typical).
5. Dividend rights.
6. Voting rights and protective provisions.
7. Board seats and observer rights.
8. Founder vesting and IP assignment.
9. Information rights.
10. Registration, ROFR, co-sale, drag-along.
11. Exclusivity (no-shop) period.
12. Confidentiality and expenses.

## Enforceability Notes
- Term sheets are generally non-binding except for specified clauses; clearly mark binding vs non-binding.
- The no-shop clause should be reasonable in duration (typically 30-60 days).
- Founder vesting requires separate stock restriction agreements.`,

  "due-diligence-checklist": `# Due Diligence Checklist Expertise

A Due Diligence Checklist structures the review of a target company across legal, financial, commercial, and operational dimensions, typically conducted by an acquirer or investor.

## Core Categories
1. **Corporate and legal**: formation documents, capitalisation table, board and shareholder minutes, material contracts, litigation, regulatory compliance.
2. **Financial**: historical financial statements, management accounts, tax returns, audits, working capital, debt instruments.
3. **Intellectual property**: registrations, licences, assignments, open-source usage, infringement claims, key employee IP assignment.
4. **Employment**: org chart, employment agreements, policies, benefits, equity plans, outstanding disputes.
5. **Real estate**: owned and leased properties, environmental compliance.
6. **IT and data**: systems, software, data protection compliance (GDPR, APP, CCPA), security incidents.
7. **Commercial**: customer concentration, supplier arrangements, pipeline.
8. **Regulatory**: licences, permits, government contracts, anti-bribery compliance.
9. **Insurance**: policies, claims history, coverage gaps.
10. **Tax**: filings, transfer pricing, R&D credits, deferred tax.

## Key Review Considerations
- Verify title to assets and absence of undisclosed encumbrances.
- Identify change-of-control clauses that may trigger consents or terminations.
- Quantify potential indemnity exposure and adjust the purchase price.
- Confirm no material litigation or regulatory action pending.
- Validate key employee retention arrangements.

## Enforceability Notes
- Confidentiality agreements should be in place before disclosure.
- Reliance letters from auditors and other professionals extend reports to the acquirer.
- Anti-trust/competition filings may be required for the transaction.`,

  "contract-analysis": `# Contract Analysis Framework

Contract analysis is the systematic review of a contract to identify material terms, allocate risk, surface ambiguities, and recommend protective measures. A rigorous framework ensures consistency across reviews and surfaces issues for negotiation.

## Risk Categories
1. **Commercial risk**: pricing, volume commitments, payment terms, price adjustment mechanisms.
2. **Performance risk**: service levels, acceptance criteria, remedies for non-conformance, warranty scope.
3. **Liability risk**: caps, exclusions of indirect loss, super-caps, indemnity triggers, uncapped liabilities.
4. **Termination risk**: termination for convenience, cause, change of control, insolvency; notice periods; wind-down obligations.
5. **IP and data risk**: ownership of work product, licence scope, data ownership, processing obligations.
6. **Compliance risk**: regulatory obligations, anti-bribery, sanctions, export controls.
7. **Operational risk**: change control, governance, dispute resolution.
8. **Financial risk**: currency exposure, tax allocation, GST/VAT treatment.

## Analysis Framework
1. **Executive Summary**: purpose of the contract, parties, term, financials, key risks.
2. **Key Provisions Matrix**: provision, position, market benchmark, risk rating.
3. **Risk Matrix**: likelihood, impact, mitigation recommendation.
4. **Recommendations**: prioritised list of negotiation points, fallback positions, walk-away thresholds.
5. **Compliance Checklist**: regulatory, internal policy, and statutory requirements.
6. **Sign-off requirements**: authority, internal approvals, third-party consents.

## Output Standards
- Cite section numbers for every extracted term.
- Flag one-sided, ambiguous, or missing standard provisions.
- Distinguish legal risk from commercial risk.
- Provide specific, actionable recommendations.`,

  "contract-summarization": `# Contract Summarization Framework

A structured contract summary distils a lengthy agreement into a concise, accurate brief suitable for executive review, due diligence, or knowledge management. The summarizer must capture essential terms without paraphrasing legal meaning.

## Summary Components
1. **Contract overview**: parties, effective date, term, governing law.
2. **Subject matter**: what is being purchased, licensed, or performed.
3. **Financial terms**: fees, payment milestones, taxes, currency, price adjustments.
4. **Performance obligations**: deliverables, service levels, acceptance criteria.
5. **Liability regime**: caps, exclusions, indemnities, uncapped liabilities.
6. **Termination**: termination rights, notice periods, post-termination obligations.
7. **IP and data**: ownership, licences, data processing, audit rights.
8. **Compliance and risk**: regulatory obligations, change of control, restrictive covenants.
9. **Governance**: dispute resolution, jurisdiction, amendment process.
10. **Action items**: missing documents, consents required, negotiation points.

## Standards
- Cite section numbers for every extracted term.
- Flag one-sided, ambiguous, or missing standard provisions.
- Use plain English suitable for executive review.
- Preserve defined terms where material to interpretation.
- Note any amendments, side letters, or schedules that modify the main agreement.

## Output Format
- Executive Summary (2-3 sentences).
- Key Terms (bulleted).
- Risk Flags (bulleted).
- Recommendations (bulleted).`,
};

function extractExpertiseBody(skillMd: string): string {
  const lines = skillMd.split("\n");
  let startIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^# [A-Z]/)) {
      startIndex = i;
      break;
    }
  }
  if (startIndex === -1) return skillMd;
  return lines.slice(startIndex).join("\n").trim();
}

const _skillCache: Record<string, string> = {};
for (const [key, content] of Object.entries(SKILLS)) {
  _skillCache[key] = extractExpertiseBody(content);
}

export const CONTRACT_TYPE_TO_SKILL: Record<string, string> = {
  nda: "confidentiality-nda",
  "non-disclosure": "confidentiality-nda",
  confidentiality: "confidentiality-nda",
  "mutual nda": "confidentiality-nda",
  "confidentiality agreement": "confidentiality-agreement",
  "employee nda": "employee-nda",
  cia: "confidentiality-invention-assignment",
  "confidentiality invention": "confidentiality-invention-assignment",
  msa: "consulting-services-agreement",
  "master services": "consulting-services-agreement",
  "services agreement": "consulting-services-agreement",
  consulting: "consulting-services-agreement",
  sow: "consulting-services-agreement",
  "statement of work": "consulting-services-agreement",
  employment: "executive-employment-agreement",
  "executive employment": "executive-employment-agreement",
  "offer letter": "at-will-employment-offer-letter",
  "at-will": "at-will-employment-offer-letter",
  contractor: "independent-contractor-agreement",
  "independent contractor": "independent-contractor-agreement",
  arbitration: "employee-arbitration-agreement",
  retention: "employee-retention-agreement",
  severance: "employee-separation-release",
  "separation release": "employee-separation-release",
  handbook: "employee-handbook",
  eula: "eula",
  "end user license": "eula",
  "api license": "api-license-agreement",
  "copyright license": "copyright-license-agreement",
  license: "copyright-license-agreement",
  licensing: "copyright-license-agreement",
  dpa: "data-processing-addendum",
  "data processing": "data-processing-addendum",
  gdpr: "gdpr-dpa",
  hipaa: "hipaa-baa",
  baa: "hipaa-baa",
  "asset purchase": "asset-purchase-agreement",
  escrow: "escrow-agreement",
  "finders fee": "finders-fee-agreement",
  guaranty: "guaranty-agreement",
  guarantee: "guaranty-agreement",
  franchise: "franchise-agreement",
  indemnification: "indemnification-agreement",
  "invention assignment": "invention-assignment-agreement",
  "investors rights": "investors-rights-agreement",
  "convertible note": "convertible-note-purchase-agreement",
  "equity financing": "equity-financing-term-sheet",
  "term sheet": "equity-financing-term-sheet",
  "due diligence": "due-diligence-checklist",
};

export function getExpertiseForContractType(
  contractType: string,
): string | null {
  const normalized = contractType.toLowerCase().trim();
  const skillKey =
    CONTRACT_TYPE_TO_SKILL[normalized] ?? findFuzzyMatch(normalized);
  if (!skillKey) return null;
  return _skillCache[skillKey] ?? null;
}

function findFuzzyMatch(normalized: string): string | null {
  for (const [key, skill] of Object.entries(CONTRACT_TYPE_TO_SKILL)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return skill;
    }
  }
  return null;
}

export function listAvailableExpertise(): string[] {
  return Object.keys(_skillCache);
}

export function getAnalysisExpertise(): string {
  return _skillCache["contract-analysis"] ?? "";
}

export function getSummarizationExpertise(): string {
  return _skillCache["contract-summarization"] ?? "";
}
