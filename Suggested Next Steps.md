## **Suggested Next Steps**

One or more risk domains have been flagged in your assessment. These areas carry meaningful regulatory and design implications and are worth addressing before engineering starts, when changes are cheapest/easiest to make.

The steps below are general starting points, not legal advice. For anything complex or high-stakes, work with a qualified legal or compliance professional.

---

### **Privacy & Data Protection**

**If flagged:** Start by mapping the personal data your product will actually collect and why. For each data type, ask: do we need this to make the feature work, or are we collecting it because we can? Document your answers. This is the foundation of any privacy review, and doing it early surfaces decisions that are much harder to reverse after launch.

Review any third-party tools or SDKs in your stack that will touch personal data — analytics platforms, session recorders, AI APIs, marketing tools. Understand what data each one collects and where it goes. Surprises here are common.

Check whether your product will serve users in the EU, UK, or California. If yes, GDPR, UK GDPR, and CCPA are likely to be relevant to how you structure consent, data subject rights, and retention.

**If elevated:** Everything above, with more urgency. Elevated Privacy typically means your product collects sensitive data categories (health, financial, biometric, location, or data relating to children) or handles data flows that carry higher regulatory exposure. Bring legal or privacy counsel in early — ideally before your technical architecture is set. Decisions made now about data storage, retention, and access controls are significantly easier to change on a whiteboard than in production.

---

### **Online Safety & Harm Prevention**

**If flagged:** Walk through your product's intended features and identify anywhere users can create content, contact each other, or have content served to them algorithmically. For each of those surfaces, ask: what's the realistic worst-case use of this feature? Harassment, fraud, illegal content distribution, and manipulation are the four areas regulators focus on most.

Start thinking about moderation: not just whether you'll have it, but how it will work, who's responsible for it, and how users can report problems. Products that launch without a moderation plan tend to build one reactively after something goes wrong — which is a worse starting point in every way.

If your product operates in the UK or EU, the Online Safety Act and Digital Services Act may impose obligations depending on your product type and scale — clarifying which category your product falls into is worth discussing with counsel.

**If elevated:** Elevated Online Safety usually means your product has significant UGC, a recommendation or ranking system, or strong signals that vulnerable users (including minors) are likely to be present. At this level, a lightweight think-through isn't enough. You should make explicit design decisions about how the product handles harmful content and protects users, and document those decisions. Regulatory scrutiny in this domain has increased significantly in the last two years and shows no sign of slowing.

---

### **AI & Algorithmic Risk**

**If flagged:** Identify every place in your product where an AI system influences a decision or outcome for a user. Be specific: what is the system doing, what data is it using, and what does a wrong output look like for the person on the receiving end?

For third-party AI tools and APIs you're integrating: read the documentation on how the model was trained, what its known limitations are, and what the vendor's terms say about your responsibilities for how it's used. Many teams integrate AI tools without fully understanding what they're signing up for.

Start thinking about how you'll detect and respond to AI errors at scale. A single bad recommendation is a bug. A systematic pattern of bad recommendations affecting certain user groups is a regulatory and reputational problem.

**If elevated:** Elevated AI Risk means your product is using AI in ways that make consequential decisions about users — their access, their content, their opportunities, or their safety. In these cases, documenting your design decisions matters: how you evaluated the model, what safeguards are in place, and whether a human can review or override the outputs. The EU AI Act's requirements for high-risk AI systems provide a useful reference framework here, regardless of whether EU law applies to you directly.

---

### **Children & Minors**

**If flagged:** The most important first step is being honest about who will actually use your product — not just who you're building it for. If there's any realistic chance minors could access it, the design decisions you make now matter. Data minimisation, default privacy settings, and avoiding manipulative design patterns (endless scroll, streaks, social pressure mechanics) are easier to build in from the start than to retrofit.

Review whether COPPA applies to your product if it operates in the US and could be used by children under 13\. If you're in the UK or EU, the Children's Code and emerging EU frameworks set a higher bar: products "likely to be accessed by children" must be designed with their best interests as a default, not as an afterthought.

**If elevated:** Elevated Children risk means either your product is clearly directed at minors or multiple signals suggest a significant presence of minors. At this level, age assurance (verification or estimation) is worth exploring — understanding what your options are, what the friction tradeoffs look like, and what your legal exposure is if you don't implement it. This is also the area where regulatory scrutiny is most unforgiving. Bring qualified counsel in early and document your decision-making.

---

**Across all flagged domains:** the goal right now isn't to solve everything. It's to understand what you're dealing with before you build. The decisions that matter most — data architecture, product design, third-party integrations — are all still ahead of you. That's exactly when a Risk Helper assessment is most useful.

