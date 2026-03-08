# Task: Add Help Text to assessment.html

## What You're Doing

Adding contextual help to each question in the Level 0 risk assessment form. Each question gets a help icon (ⓘ) that reveals a tooltip/panel explaining what the question is asking, why it matters, and what each answer means.

## Source of Truth

All help content is defined in the **HELP CONTENT** section below. Do not invent or paraphrase any of it — use it verbatim.

## Implementation Pattern

### HTML pattern — add to each question block

Place a help trigger immediately after the question label text:

```html
<button
  type="button"
  class="help-trigger"
  aria-expanded="false"
  aria-controls="help-[QUESTION_ID]"
  aria-label="Help for this question"
>ⓘ</button>

<div
  id="help-[QUESTION_ID]"
  class="help-panel"
  hidden
>
  <p class="help-why"><strong>Why this question matters</strong><br>[WHY_TEXT]</p>
  <div class="help-answers">
    <p><strong>Answer meanings</strong></p>
    [ANSWER_ROWS — one <p> per answer: <strong>Answer label:</strong> Meaning text]
  </div>
  <p class="help-note">[EDGE_CASE_NOTE — if present]</p>
</div>
```

Replace `[QUESTION_ID]` with the question's existing `id` attribute (e.g. `q1a`, `q3`, `q6`). If no `id` exists, add one following the same convention.

### CSS — add once to the stylesheet (or `<style>` block)

```css
/* Help trigger button */
.help-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  margin-left: 0.375rem;
  vertical-align: middle;
  background: none;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-size: 0.7rem;
  color: var(--ink-soft, #6b7280);
  cursor: pointer;
  line-height: 1;
  padding: 0;
}
.help-trigger:hover,
.help-trigger[aria-expanded="true"] {
  color: var(--accent, #1d4ed8);
  border-color: var(--accent, #1d4ed8);
}

/* Help panel */
.help-panel {
  margin-top: 0.75rem;
  padding: 1rem 1.25rem;
  background: var(--surface-alt, #f3f4f6);
  border-left: 3px solid var(--accent, #1d4ed8);
  border-radius: 0 0.375rem 0.375rem 0;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--ink, #111827);
}
.help-panel p { margin: 0 0 0.75rem; }
.help-panel p:last-child { margin-bottom: 0; }
.help-why { color: var(--ink-soft, #6b7280); }
```

### JavaScript — add once before `</body>`

```javascript
document.querySelectorAll('.help-trigger').forEach(btn => {
  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    btn.setAttribute('aria-expanded', String(!expanded));
    panel.hidden = expanded;
  });
});
```

---

## Conditional Questions

Some help panels should only appear when the question is visible. The JavaScript above handles this automatically because hidden questions will not have visible buttons. No extra logic needed.

The conditional questions are:
- **Q4** — shown only when Q3 has at least one personal data answer selected
- **Q6** — shown only when Q5 = "Yes"
- **Q8a** — shown only when Q4 includes "Data about people under 16"
- **Q8b** — shown only when Q4 does NOT include "Data about people under 16"

---

## Help Content

Use this content verbatim. Do not paraphrase.

---

### Q1a — Who are your customers?

**Why this question matters:**
This question maps your audience to the risk domains that apply. Consumer-facing products attract the widest set of obligations — Online Safety and Children's rights frameworks apply almost exclusively to products that interact with members of the public, not B2B tools. The answer here shapes which downstream questions are most important.

**Answer meanings:**

| Answer | Meaning |
|--------|---------|
| Consumers — members of the public | Consumer-facing products are in scope for all four risk domains. Privacy, AI, Online Safety, and Children flags can all apply. This is the highest-risk audience configuration. |
| Employees or internal teams | Employment data carries elevated obligations in many jurisdictions — particularly around monitoring, AI-based performance assessment, and data retention. Privacy and AI domains stay in scope; Online Safety is less likely to apply. |
| Other businesses (your customers are companies, not individuals) | B2B products have fewer consumer protection obligations, but Privacy still applies — especially if your product processes data about your customers' own users. Q1b is the key follow-up: if your product touches people your customers serve, those obligations flow through. |
| I'm not sure yet | Treated as consumer-facing for routing purposes. All domains stay open until you have more clarity. Come back and refine this once your audience is defined. |

---

### Q1b — Does your product affect people who are NOT your direct customers?

**Why this question matters:**
This is the question teams most commonly miss. Many products touch people who never agreed to be part of the system — job applicants assessed by an HR tool, patients whose records flow through a healthcare platform, children whose data exists in a family app. Those people still have data rights, even though they're not your customer. Answering 'Yes' elevates Privacy to high priority and is often the difference between a standard compliance review and a more intensive one.

**Answer meanings:**

| Answer | Meaning |
|--------|---------|
| Yes | This is the most commonly missed risk signal. When your product affects people who didn't sign up for it, you have obligations to those people even though they're not your customers. Flags Privacy at elevated priority. Think carefully about all the people your product touches — not just the ones who log in. |
| No — we only handle data about our own direct users | Straightforward data subject relationship. Your Privacy obligations apply to your direct users only. Verify this is genuinely true as your product evolves — it's easy for third-party data to enter a system without a deliberate decision. |
| Not sure | Treated conservatively as Yes. If there's any chance your product affects people outside your direct user base, assume it does. This is worth investigating before launch, not after. |

---

### Q2 — Do people interact with your product directly?

**Why this question matters:**
This separates products with user interfaces from backend systems, APIs, or data pipelines. Online Safety obligations — things like content moderation, UGC, and age-appropriate design — only apply when users can actually interact with the product. An API that powers another company's consumer app doesn't have the same direct obligations as the consumer app itself (though it may have indirect ones).

**Answer meanings:**

| Answer | Meaning |
|--------|---------|
| Yes — it has an app, website, or interface that people use | Direct user interaction keeps Online Safety and Children in scope. UGC, messaging, and age-appropriate design obligations only apply if users can actually interact with the product. The nature of that interaction matters — Q7 asks about user-to-user features specifically. |
| No — it runs in the background or is accessed only by other systems | Background or API-only products clear the UGC route for Online Safety. The AI algorithmic harm route can still apply if your product shapes consumer-facing outputs downstream — for example, if your API powers the recommendations a consumer sees. |

---

### Q3 — Does your product collect or use information about people?

**Why this question matters:**
This is the core privacy trigger. The question covers all three main ways a product handles personal data: collecting it directly from users, observing behaviour, or receiving it from another source. Many teams underestimate the scope here — even basic analytics (page views, session duration) qualifies as personal data processing in most jurisdictions. Select all that apply: most products fall into more than one category.

**Answer meanings:**

| Answer | Meaning |
|--------|---------|
| Yes — people give us information directly (accounts, forms, profiles) | Direct collection is the clearest privacy trigger. You're the data controller and all core GDPR/CCPA obligations apply: lawful basis, transparency notice, retention policy, data subject rights, and more. |
| Yes — we observe or track how people use it (behaviour, clicks, location) | Behavioural tracking — even basic analytics like page views and session duration — constitutes personal data processing in most jurisdictions. Cookie consent, privacy notices, and retention policies all apply. This surprises many teams who think only 'form data' counts. |
| Yes — we receive information about people from another system or source | Receiving data from another system raises controller vs. processor questions. If you're processing data on behalf of your customer, you may need Data Processing Agreements. If you're making independent decisions with that data, you're a controller too. |
| No — it doesn't handle information about identifiable individuals | Privacy domain will not be flagged unless Q1b indicates affected third parties. Be confident in this answer — 'identifiable' includes indirect identifiers like device IDs, IP addresses, and behavioural fingerprints, not just names and email addresses. |

---

### Q4 — Does your product handle any of the following?

*(Conditional: shown when Q3 has any personal data answer selected)*

**Why this question matters:**
These are the 'sensitive categories' under GDPR Article 9 and their equivalents in US and UK law. Handling any of these elevates Privacy from standard to high priority, because the regulatory obligations are significantly more stringent: explicit consent requirements, Data Protection Impact Assessments, specific security controls, and in some cases state-level laws with private rights of action (like Illinois BIPA for biometrics). Be honest about edge cases — health and wellness data, for example, includes fitness tracking and mental health tools, not just clinical medical records.

**Answer meanings:**

| Answer | Meaning |
|--------|---------|
| Health, medical, or wellness data | GDPR Article 9 special category. Requires explicit consent, often a DPIA, and heightened security measures. Elevates Privacy to high priority. Includes fitness data, mental health indicators, dietary restrictions, and more — not just clinical records. |
| Financial account or payment data | Financial account data is sensitive under most privacy laws. PCI-DSS applies if you handle payment card data directly. Elevates Privacy to high priority. Note: this is different from payment processing (handled by your payment provider) — it's about whether your product stores or processes account or card data itself. |
| Precise location data | Precise GPS-level location is sensitive under GDPR and many US state laws. Raises consent and purpose limitation questions. The key distinction is 'precise' — city-level location is lower risk than street-level or real-time tracking. |
| Biometric data (face recognition, fingerprints, voice identification) | Among the most tightly regulated categories. Illinois BIPA, Texas, and Washington have specific biometric laws with private rights of action. GDPR Article 9 applies. Biometric data is particularly sensitive because it can't be changed if compromised. |
| Sexual orientation, gender identity, or relationship data | GDPR Article 9 special categories requiring explicit consent or a specific legal basis. Appears in dating apps, HR systems, healthcare tools, and social platforms — often not as the primary data type, but embedded in profile fields or inferred from behaviour. |
| Political views, religious beliefs, trade union membership, or criminal records | GDPR Article 9/10 categories — same elevated obligations as health data. Common in HR tools, background checks, civic tech, and news platforms. Criminal record data has additional restrictions in many jurisdictions beyond the standard Article 9 rules. |
| Data about people under 16 | Triggers the Children domain regardless of whether children are your intended users. Data about under-16s is subject to COPPA, GDPR Article 8, and the UK Children's Code. This includes platforms where parents share children's data, or where children are incidentally part of the user base. |
| None of the above | No sensitive categories. Privacy flagged at standard priority based on Q3 selections. If you're uncertain whether something counts, err on the side of flagging it — it's better to investigate than to miss an obligation. |

---

### Q5 — Does your product use AI, machine learning, or automated algorithms?

**Why this question matters:**
This question casts a deliberately wide net. 'AI' here means any system that uses machine learning, neural networks, or automated decision logic — not just large language models or obvious AI features. It includes recommendation engines, fraud detection systems, content moderation tools, pricing algorithms. The reason: you can't delegate your compliance obligations to an AI vendor. If OpenAI or Google's model makes a decision in your product, you're still responsible for that decision from a regulatory standpoint.

**Answer meanings:**

| Answer | Meaning |
|--------|---------|
| Yes | AI use confirmed. Q6 determines what type of AI risk applies. The key distinction: does the AI make decisions about people (highest risk), shape what people see (medium risk), or run entirely behind the scenes (lower risk)? |
| No | No AI risk domain flagged. Note: rule-based algorithms and deterministic scoring systems also count as automated processing under GDPR Article 22 — if your product makes automated decisions about individuals, even via a rule-based system, that matters. This question is specifically about ML/AI systems. |
| I'm not sure — it might use a third-party AI tool or automated system | Treated conservatively as AI use. Third-party AI tools (OpenAI, Google, Anthropic, etc.) count as AI use for compliance purposes — you can't delegate your obligations to the vendor. If you're genuinely unsure whether a component uses AI, assume it does and check Q6. |

---

### Q6 — What does the AI or algorithm do in your product?

*(Conditional: shown when Q5 = Yes)*

**Why this question matters:**
The type of AI use matters more than the fact of AI use. Generating content carries different obligations than making decisions about people. The most important distinction is 'decides' — any AI that determines an outcome for a specific person (approval, rejection, pricing, access) is in the highest-risk category under GDPR Article 22 and the EU AI Act. 'Shapes' is the second most significant — personalisation algorithms that control what users see are in scope for DSA transparency requirements. Select everything that applies, even if one function seems minor.

**Answer meanings:**

| Answer | Meaning |
|--------|---------|
| Creates content that users see, read, or act on (text, images, audio, summaries, or suggestions) | AI content generation triggers transparency obligations. Users often have a right to know when content is AI-generated, especially under the EU AI Act. This includes chatbots, content recommendations described as AI, and any AI-generated summaries or suggestions presented to users. |
| Determines an outcome for a specific person or group (approvals, rejections, pricing, account status, or differential treatment based on predicted characteristics) | Highest-risk AI category. Automated decisions about people trigger GDPR Article 22 (right to human review), EU AI Act high-risk classification, and emerging US state AI laws. Elevates AI to high priority. This applies whether the decision is fully automatic or reviewed by a human — the AI making the initial determination is what counts. |
| Shapes what individual users see or experience (the order, selection, or presentation of content personalised to them) | Personalisation algorithms are in scope for DSA Article 29 transparency in the EU — users must be able to access a non-personalised alternative. Consumer-facing personalisation also triggers the Online Safety algorithmic harm route because the algorithm itself can cause harm through filter bubbles or amplification. |
| Processes or evaluates content or data (detects, categorises, or filters posts, documents, signals, or behaviour) | Content and data analysis carries lower AI urgency — unless the output directly determines what a person can access, in which case it belongs in 'decides'. The key question: does the AI's classification have a direct consequence for the individual whose data was processed? |
| Runs behind the scenes — its effect is on internal operations or systems; users don't see or feel it directly | Internal optimisation only. No AI domain flag if this is the only selection. Examples: internal analytics, internal routing decisions, infrastructure optimisation. If the AI's outputs eventually influence user-facing decisions, consider whether it belongs in one of the other categories too. |

---

### Q7 — Can people on your product interact with each other or create content?

**Why this question matters:**
This question determines whether Online Safety legislation applies. The UK Online Safety Act and EU Digital Services Act both centre on user-generated content and user-to-user interaction — platforms where users can create and share content, or communicate directly with each other. The presence of any of these features brings content moderation obligations, illegal content reporting requirements, and (for larger platforms) systemic risk assessments. Direct messaging is particularly significant when combined with children being present on the platform.

**Answer meanings:**

| Answer | Meaning |
|--------|---------|
| Yes — users can post, comment, or share content publicly or in groups | Public posting is the strongest Online Safety trigger. The DSA and UK Online Safety Act impose content moderation obligations, illegal content removal and reporting, and (for very large platforms) systemic risk assessments. Elevates Online Safety to high priority. Even small platforms need basic content policies. |
| Yes — users can send direct messages to each other | Direct messaging creates contact risk — particularly where children may be present. Illegal content shared via DMs is in scope for the UK Online Safety Act and DSA. This intersects with the Children domain if Q8 flags minors: direct messaging in a platform where children may be present triggers the most severe Children's safety obligations. |
| Yes — users can review, rate, or respond to other users' content or profiles | User reviews are UGC in most legal frameworks. Content moderation obligations apply — you need a process for handling illegal or harmful content in reviews, even if the scale is small. |
| No — users only interact with content we produce and control | No user-generated content. Online Safety only flags if AI personalisation is consumer-facing (the algorithmic harm route via Q6 + Q1a). If users can only consume, not create, content moderation obligations are significantly lighter. |

---

### Q8a — You mentioned your product handles data about people under 16. Is this because…?

*(Conditional: shown when Q4 includes 'Data about people under 16')*

**Why this question matters:**
This question distinguishes between products designed for children (highest obligations) and those where children's data appears incidentally. The regulatory consequences are different: a product designed for children must meet the UK Children's Code's 'best interests of the child' standard throughout its design, while a product that incidentally holds children's data has more targeted obligations around that specific data. Neither is exempt from COPPA or GDPR Article 8 — but the scope and cost of compliance differs significantly.

**Answer meanings:**

| Answer | Meaning |
|--------|---------|
| The product is designed for or marketed to children or teenagers | Products designed for children face the full weight of COPPA, UK Children's Code, and GDPR Article 8. Verifiable parental consent, high privacy by default, no profiling for advertising, and age-appropriate content obligations all apply. This is the most compliance-intensive configuration. Elevates Children to critical priority. Plan for this early — retrofitting these standards is expensive. |
| Children's data is incidentally included — for example, we process family accounts, or clients send us data that may include minors | Incidental inclusion still creates obligations — you can't opt out of COPPA because children weren't your intended audience. Data minimisation, retention limits, and parental consent requirements apply to children's data regardless of how it arrived. You need to know which records relate to under-16s and treat them appropriately. |
| Not sure | Treated conservatively. Children's domain flagged at elevated priority. Confirm whether any data subjects are under 16 before launch. 'Not sure' about whether children's data is in your system is not a defensible position with regulators. |

---

### Q8b — Could someone under 18 realistically use your product or be affected by its decisions?

*(Conditional: shown when Q4 does NOT include 'Data about people under 16')*

**Why this question matters:**
Even if you haven't collected data explicitly tagged as 'children's data', children may still use your product. The UK Children's Code applies if children are a 'significant proportion' of your users — which regulators can interpret as any non-negligible proportion, not just products aimed at children. Age-appropriate design defaults apply to the features children access, not just the platform as a whole. The 'possibly' answer triggers standard obligations rather than the full elevated set.

**Answer meanings:**

| Answer | Meaning |
|--------|---------|
| Yes — it's designed for or marketed to children or teenagers | Full Children domain obligations apply. COPPA, UK Children's Code, GDPR Article 8, and age-appropriate design requirements all in scope. Elevates Children to critical priority. Same consequences as Q8a 'designed' — the highest level of obligation. |
| Possibly — minors are a realistic part of our user base, even if not the primary audience | The UK Children's Code applies if children are a 'significant proportion' of your users — not just the primary audience. If teenagers use your platform at all, age-appropriate design defaults apply to their experience. Children domain flagged at standard priority — not critical, but real. |
| No — access is restricted to adults, or minors are not a realistic user of this product | Children domain cleared. If you have age verification in place, note that its robustness matters — a checkbox saying 'I confirm I am over 18' is not sufficient under the UK Children's Code or COPPA. Robust age verification is a meaningful technical and legal commitment. |
| Not sure | Treated conservatively. Children domain flagged at elevated priority. Confirm your user age distribution before launch. Look at your sign-up data, your marketing materials, and your product's appeal — regulators will consider all of these when assessing whether children are likely users. |

---

### Q9 — Where will your users or affected individuals be?

**Why this question matters:**
Geography determines which specific regulations apply. The EU has the most comprehensive framework across all four risk domains (GDPR, EU AI Act, DSA) and is the baseline for maximum obligations. The UK has its own parallel framework post-Brexit (UK GDPR, Online Safety Act, UK Children's Code) that overlaps but isn't identical. The US has no federal privacy law but a growing patchwork of state laws, and COPPA applies federally for children. Selecting 'Global' or 'Not sure' applies the most stringent standard — EU + UK + US combined.

**Answer meanings:**

| Answer | Meaning |
|--------|---------|
| Primarily United States | US privacy law is a patchwork of state laws — CCPA/CPRA (California), Virginia, Colorado, Connecticut, Texas, and others. COPPA applies federally for children. State AI laws are emerging in Colorado, Illinois, and others. If you have any California users, CCPA applies regardless of where you're incorporated. |
| United Kingdom | UK GDPR and Data (Use & Access) Act 2025 apply. UK Online Safety Act 2023 applies to user-to-user platforms and search services. UK Children's Code applies broadly. The ICO is the primary regulator. UK law is broadly similar to EU GDPR but has diverged in some areas since Brexit. |
| European Union | GDPR applies. EU AI Act is now in force (phased implementation through 2027). DSA applies to intermediary services. The EU has the strongest regulatory obligations across all four domains, and GDPR's extraterritorial reach means it applies to any product targeting EU users regardless of where the company is based. |
| Global or multiple regions | Treated as EU + UK + US combined — most stringent standards across all flagged domains. This is the right approach for any product with international reach. Design to the most stringent standard and you'll meet the requirements of the others. |
| I'm not sure | Treated as global — most stringent standards applied. Better to over-assess than under-assess when jurisdiction is uncertain. GDPR's extraterritorial reach is broad — if EU residents can use your product, GDPR likely applies regardless of where you're based. |

---

## Quality Checks Before Finishing

- [ ] Every question (Q1a through Q9) has a `.help-trigger` button and a `.help-panel`
- [ ] Conditional questions (Q4, Q6, Q8a, Q8b) have their `id` attributes consistent with the conditional show/hide logic already in `assessment.html`
- [ ] All `aria-controls` values match the corresponding `id` values exactly
- [ ] The CSS and JavaScript are added exactly once — not duplicated per question
- [ ] No help content has been paraphrased — it matches the source above verbatim
- [ ] Help panels are `hidden` by default (not just visually hidden with CSS)
- [ ] Test: clicking ⓘ opens the panel; clicking again closes it
- [ ] Test: page still passes keyboard navigation (Tab reaches each ⓘ button)
