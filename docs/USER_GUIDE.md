# LegalVu v2 — User Guide

A desktop legal workspace for in-house legal teams. Draft contracts with AI assistance, manage lifecycle from draft to termination, export to DOCX/PDF, integrate with SharePoint, and track everything in an audit trail — all data stays on your device.

---

## Getting Started

### First Launch

1. Open LegalVu from your applications.
2. You'll see the **Login** screen. Click **Register** to create your account.
3. Enter your full name, email, and a password (minimum 8 characters).
4. You'll be taken to the **Contracts** page — the app is ready to use.

### Navigation

The left sidebar provides access to all sections:

| Icon | Section | Purpose |
|------|---------|---------|
| | **Contracts** | View and manage all contracts |
| | **New Contract** | Draft a new contract with AI |
| | **Templates** | Browse contract templates |
| | **Audit Trail** | View all actions taken in the system |
| | **Dashboard** | Analytics and usage statistics |
| | **Settings** | AI configuration and LawVu import |
| | **SharePoint** | Connect to your SharePoint library |

Your email and a **Logout** button appear at the bottom of the sidebar.

---

## Drafting Contracts with AI

### Creating a New Contract

1. Click **New Contract** in the sidebar.
2. Fill in the intake form:
   - **Contract Type** — Select from NDA, Master Services Agreement, Statement of Work, Employment Agreement, SaaS Agreement, or other types.
   - **Counterparty** — The other party's name.
   - **Jurisdiction** — e.g., "New South Wales, Australia".
   - **Governing Law** — e.g., "Laws of New South Wales".
   - **Key Terms** — Add specific terms to include (e.g., "12-month term", "AUD $50,000 cap"). Click **+ Add Term** for additional terms.
   - **Optional Clauses** — Toggle indemnity and confidentiality clauses on/off.
   - **AI Provider** — Choose OpenAI or Anthropic.
   - **Model** — Select the specific model to use (e.g., GPT-4o, Claude Sonnet).
3. Click **Generate Contract**.

### During Generation

The AI streams the contract text in real time. You'll see each sentence appear as it's generated. Click **Cancel** to stop generation early.

### After Generation

Once generation completes, the contract opens in the **Rich Text Editor**:
- Use the toolbar for **Bold**, *Italic*, headings, and lists.
- Edit the text freely — this is your working draft.
- Click **Save Contract** to store it.

The contract is saved in **Draft** status. From here you can export it or advance it through the lifecycle.

---

## Managing Contracts

### Contracts List

The **Contracts** page shows all your contracts in a table with:
- **Title** and **Status** (color-coded badge)
- **Counterparty** and **Source** (AI, Imported, or Template)
- **Last Updated** date

Use **Refresh** to reload the list.

### Importing an Existing Contract

At the top of the Contracts list, click **Import Contract**:
1. Enter a **Title**, **Counterparty**, and **Jurisdiction**.
2. Paste the contract text into the text area.
3. Click **Import**.

The contract is saved in **Draft** status and appears in your list.

### Contract Detail View

Click any contract title to open its detail page. From here you can:

**Edit Content** — The rich text editor is available for inline editing. Click **Save** after making changes.

**Advance Lifecycle** — Use the lifecycle buttons to move the contract through its stages:
```
Draft → Under Review → Approved → Signed → Active → Expired / Terminated
```
Each transition is recorded in the audit trail.

**Export** — Click **Export DOCX** or **Export PDF** to generate a downloadable file. Files are saved locally and linked to the contract.

**AI Analysis** — Click **AI Analyze** to get a structured risk assessment including:
- Overall risk rating
- Key provisions identified
- Risk items with severity levels
- Recommendations

**AI Summarization** — Click **AI Summarize** to get an executive summary with section-by-section citations and flagged provisions.

### Contract Statuses

| Status | Badge Color | Meaning |
|--------|-------------|---------|
| Draft | Gray | Initial state, being worked on |
| Under Review | Yellow | Sent for review/approval |
| Approved | Blue | Review complete, ready for signature |
| Signed | Indigo | Executed by all parties |
| Active | Green | Currently in force |
| Expired | Orange | Term has ended |
| Terminated | Red | Ended before expiry |

---

## Templates

The **Templates** page provides pre-built contract templates. Each template includes:
- Name and description
- Contract type tag
- **Default** badge for built-in templates (cannot be deleted)

### Using a Template

1. Click **Use** on a template card.
2. Fill in the variable fields that appear (e.g., counterparty name, jurisdiction, key terms).
3. Click **Generate**.

This creates a draft contract populated with your values — no AI generation involved, just variable substitution.

### Custom Templates

You can create custom templates via the API for your team's standard contract forms. Custom templates appear alongside defaults and can be deleted.

---

## LawVu Migration

If you're migrating from LawVu, LegalVu can bulk-import your existing data.

### How to Import

1. Go to **Settings** and scroll to the **LawVu Import** section.
2. Export your data from LawVu as a `.zip` file containing:
   - `Contracts.txt` — Tab-delimited contract data
   - `MatterFields.txt` — Tab-delimited custom fields
   - `Files/` — Associated document files
3. Drag the `.zip` file onto the import area (or click to browse).
4. Review the import summary:
   - Contracts imported / skipped (duplicates)
   - Files linked to contracts
   - Users created as placeholders
   - Any row-level errors

Import is **idempotent** — running it again won't create duplicates. Each import is logged in the audit trail.

---

## SharePoint Integration

LegalVu connects to SharePoint using browser-based authentication (no API keys or admin setup required).

### Setup

1. Go to **SharePoint** in the sidebar.
2. Under **Connection Settings**:
   - Enter your **Site URL** (e.g., `https://yourcompany.sharepoint.com/sites/legal`).
   - Enter the **Library Path** (e.g., `/Shared Documents`).
   - Toggle **Auto-Sync** if you want automatic synchronization.
3. Click **Save Settings**.

### Authentication

1. Click **Login to SharePoint**.
2. A browser window opens — log in with your SharePoint credentials.
3. Once authenticated, the session status shows **Connected** with an expiry time.

### Browsing Files

After connecting, click **Browse Library** to see all files in your SharePoint library:
- View file names, sizes, and modification dates.
- Click **Download** on any file to save it locally.

### Uploading Files

From a contract's detail page, you can export and upload directly to SharePoint.

---

## Audit Trail

The **Audit Trail** page shows an immutable log of every action in the system, including:
- Contract creation, edits, and lifecycle transitions
- AI generation and analysis
- Document exports
- SharePoint sync events
- User authentication events
- LawVu imports

### Filtering

Use the entity type filter to narrow results:
- **All** — Everything
- **Contract** — Contract-related actions
- **Document** — Exports and file operations
- **User** — Login/logout events
- **SharePoint** — Sync activity
- **Template** — Template usage

Each entry shows the action, entity name, details, and timestamp.

---

## Analytics Dashboard

The **Dashboard** provides local-only analytics with five panels:

- **Contract Status** — Doughnut chart showing contracts by lifecycle stage.
- **AI Usage** — Bar chart of AI requests by model (last 30 days).
- **SharePoint Sync** — Health cards showing files synced, pending, and conflicts.
- **Template Usage** — Progress bars showing which templates are used most.
- **Audit Activity** — Stacked bar chart of actions by category over the last 30 days.

Click **Refresh** to update all panels. All data stays on your device.

---

## Settings

### AI Configuration

- **Provider** — Choose OpenAI or Anthropic.
- **Model** — Select the model for contract generation.
- **Base URL** — Optional. Override the default API endpoint for Azure, self-hosted, or proxy setups (e.g., `https://your-proxy.example.com/v1`).
- **API Key** — Enter your provider API key. It's encrypted using your operating system's keychain and never exposed to the network or other processes.

### LawVu Import

Scroll down to the **LawVu Import** section to bulk-import from a LawVu export zip. See the [LawVu Migration](#lawvu-migration) section above.

---

## Tips

- **Contract types matter** — Selecting the right type (NDA, MSA, etc.) injects domain-specific legal expertise into the AI prompt for better results.
- **Key terms improve output** — Be specific in the key terms field. "12-month renewal term, AUD $50,000 annual cap" produces better contracts than just "standard terms".
- **Review before advancing** — Always review AI-generated content before moving a contract to "Under Review".
- **Import is safe to re-run** — Duplicate LawVu imports are detected and skipped automatically.
- **All data is local** — Your contracts, settings, and API keys never leave your device unless you explicitly export or sync to SharePoint.
