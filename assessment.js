/* ─────────────────────────────────────────────────────────────
   Better Risk — Level 0 Screener  |  script.js  |  V6.1
   ─────────────────────────────────────────────────────────────
   New in V6.1:
     1. Edit answers from results screen (preserves state)
     2. Per-question impact text (from config feedback map)
     3. Live domain status panel in sidebar (updates on render)
     4. Structured trigger attribution on results cards
   ───────────────────────────────────────────────────────────── */

// ── STATE ────────────────────────────────────────────────────────────────────
const state = {
  config: null,
  answers: {}
};


// ── BOOT ─────────────────────────────────────────────────────────────────────
function loadConfig() {
  if (!window.RISKHELPER_CONFIG) {
    document.getElementById('app').innerHTML =
      '<div style="padding:60px;font-family:monospace;color:#C62828;">' +
      '<strong>Config not found.</strong><br><br>window.RISKHELPER_CONFIG is not defined.' +
      '</div>';
    return;
  }
  state.config = window.RISKHELPER_CONFIG;
  boot();
}

function boot() {
  const cfg = state.config;
  document.getElementById('intro-title').textContent = cfg.meta.subtitle;
  document.getElementById('intro-description').textContent = cfg.meta.description;

  buildQuestions();
  buildLiveDomainPanel();

  const agreeCheckbox = document.getElementById('agree-disclaimer');
  const startBtn = document.getElementById('btn-start');
  const startWarning = document.getElementById('start-warning');

  if (agreeCheckbox && startWarning) {
    agreeCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        startWarning.classList.add('hidden');
      }
    });
  }

  startBtn.addEventListener('click', (e) => {
    if (agreeCheckbox && !agreeCheckbox.checked) {
      e.preventDefault();
      startWarning.classList.remove('hidden');
      return;
    }
    show('screen-questions');
    render();
  });
  document.getElementById('btn-submit').addEventListener('click', showResults);
  document.getElementById('btn-restart').addEventListener('click', restart);
  document.getElementById('btn-edit').addEventListener('click', editAnswers);

  show('screen-intro');
}

// ── SCREEN MANAGEMENT ────────────────────────────────────────────────────────
function show(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

// ── BUILD QUESTIONS DOM ──────────────────────────────────────────────────────
function buildQuestions() {
  const container = document.getElementById('questions-container');
  container.innerHTML = '';
  const cfg = state.config;

  const blocks = {};
  cfg.questions.forEach(q => {
    if (!blocks[q.block]) blocks[q.block] = [];
    blocks[q.block].push(q);
  });

  cfg.blocks.forEach(block => {
    const qs = blocks[block.id] || [];
    if (!qs.length) return;

    const group = document.createElement('div');
    group.className = 'block-group';
    group.id = `block-group-${block.id}`;

    const heading = document.createElement('div');
    heading.className = 'block-heading';
    heading.innerHTML = `
      <span class="block-heading-num">Block ${block.id}</span>
      <span class="block-heading-label">${block.label}</span>`;
    group.appendChild(heading);

    qs.forEach(q => group.appendChild(buildQuestionCard(q)));
    container.appendChild(group);
  });
}

function buildQuestionCard(q) {
  const card = document.createElement('div');
  card.className = 'question-card greyed';
  card.id = `card-${q.id}`;

  const typeLabel = q.type === 'multi' ? 'Select all that apply' : 'Select one';

  const helpIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="help-svg" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>`;

  const helpHtml = `
    <button type="button" class="help-trigger" aria-expanded="false" aria-controls="help-${q.id}" aria-label="Help for this question" title="See help">${helpIcon}</button>
  `;

  card.innerHTML = `
    <div class="question-header">
      <div class="question-id">${q.id.toUpperCase()}</div>
      <div class="question-text">${q.text}${helpHtml}</div>
      ${q.hint ? `<div class="question-hint">${q.hint}</div>` : ''}
      <span class="question-type-badge">${typeLabel}</span>
    </div>
    <div class="question-options" id="options-${q.id}"></div>
    <div class="question-impact" id="impact-${q.id}"></div>
  `;

  const optContainer = card.querySelector(`#options-${q.id}`);
  q.options.forEach(opt => {
    const inputType = q.type === 'multi' ? 'checkbox' : 'radio';
    const label = document.createElement('label');
    label.className = 'option-label';
    label.htmlFor = `${q.id}-${opt.value}`;
    label.innerHTML = `
      <input type="${inputType}" id="${q.id}-${opt.value}" name="${q.id}" value="${opt.value}">
      <span class="option-text">${opt.label}</span>`;

    const input = label.querySelector('input');
    input.addEventListener('change', () => handleAnswer(q, opt, input, label));
    optContainer.appendChild(label);
  });

  return card;
}

// ── ANSWER HANDLING ───────────────────────────────────────────────────────────
function handleAnswer(q, opt, input, label) {
  if (q.type === 'single') {
    state.answers[q.id] = input.value;
    document.querySelectorAll(`#options-${q.id} .option-label`).forEach(l => l.classList.remove('selected'));
    label.classList.add('selected');

  } else {
    let arr = Array.isArray(state.answers[q.id]) ? [...state.answers[q.id]] : [];

    if (opt.exclusive) {
      if (input.checked) {
        arr = [opt.value];
        document.querySelectorAll(`#options-${q.id} input`).forEach(inp => {
          if (inp.value !== opt.value) {
            inp.checked = false;
            inp.closest('.option-label').classList.remove('selected');
          }
        });
      } else {
        arr = arr.filter(v => v !== opt.value);
      }
    } else {
      if (input.checked) {
        const exclusiveOpts = q.options.filter(o => o.exclusive).map(o => o.value);
        exclusiveOpts.forEach(ev => {
          const excInp = document.getElementById(`${q.id}-${ev}`);
          if (excInp && excInp.checked) {
            excInp.checked = false;
            excInp.closest('.option-label').classList.remove('selected');
          }
          arr = arr.filter(v => v !== ev);
        });
        if (!arr.includes(opt.value)) arr.push(opt.value);
      } else {
        arr = arr.filter(v => v !== opt.value);
      }
    }

    state.answers[q.id] = arr;
    label.classList.toggle('selected', input.checked);
  }

  render();
}

// ── EVALUATE showIf ───────────────────────────────────────────────────────────
function evalShowIf(showIf) {
  if (!showIf) return true;
  const dep = state.answers[showIf.question];

  if (showIf.hasAnyOf) {
    if (!dep || !Array.isArray(dep)) return false;
    return showIf.hasAnyOf.some(v => dep.includes(v));
  }
  if (showIf.equals !== undefined) return dep === showIf.equals;
  if (showIf.includes !== undefined) {
    if (!dep || !Array.isArray(dep)) return false;
    return dep.includes(showIf.includes);
  }
  if (showIf.notIncludes !== undefined) {
    if (!dep || !Array.isArray(dep)) return true;
    return !dep.includes(showIf.notIncludes);
  }
  return true;
}

// ── RENDER ────────────────────────────────────────────────────────────────────
function render() {
  const cfg = state.config;
  let totalActive = 0, totalAnswered = 0;

  cfg.questions.forEach(q => {
    const card = document.getElementById(`card-${q.id}`);
    if (!card) return;

    const active = evalShowIf(q.showIf);
    card.classList.toggle('greyed', !active);

    const ans = state.answers[q.id];
    const answered = active && (
      (q.type === 'single' && ans && ans !== '') ||
      (q.type === 'multi' && Array.isArray(ans) && ans.length > 0)
    );
    card.classList.toggle('answered', answered);

    if (active) {
      totalActive++;
      if (answered) totalAnswered++;
    }

    if (!active && state.answers[q.id] !== undefined) clearAnswer(q);

    // Update per-question impact text
    updateImpact(q, active);
  });

  updateProgress(totalAnswered, totalActive);
  updateSubmit(totalAnswered, totalActive);
  updateLiveDomainPanel();
}

function clearAnswer(q) {
  document.querySelectorAll(`#options-${q.id} input`).forEach(inp => {
    inp.checked = false;
    inp.closest('.option-label')?.classList.remove('selected');
  });
  delete state.answers[q.id];
}

// ── IMPACT TEXT (feature 2) ───────────────────────────────────────────────────
function updateImpact(q, active) {
  const box = document.getElementById(`impact-${q.id}`);
  if (!box) return;

  const ans = state.answers[q.id];
  const feedback = q.feedback || {};

  // Collect selected values
  let selected = [];
  if (q.type === 'single' && ans) selected = [ans];
  if (q.type === 'multi' && Array.isArray(ans)) selected = ans;

  // Only show if question is active and has an answer
  if (!active || selected.length === 0) {
    box.innerHTML = '';
    box.classList.remove('has-content');
    return;
  }

  // Build lines from feedback map for each selected value
  const lines = selected
    .filter(v => feedback[v])
    .map(v => `<p class="impact-line">${feedback[v]}</p>`);

  if (lines.length === 0) {
    box.innerHTML = '';
    box.classList.remove('has-content');
    return;
  }

  box.innerHTML = `<div class="impact-label">Impact</div>${lines.join('')}`;
  box.classList.add('has-content');
}

// ── PROGRESS ──────────────────────────────────────────────────────────────────
function updateProgress(answered, total) {
  const pct = total === 0 ? 0 : Math.round((answered / total) * 100);
  document.getElementById('progress-bar').style.width = pct + '%';
  document.getElementById('progress-text').textContent = `${answered} of ${total} answered`;
}

// ── SUBMIT ────────────────────────────────────────────────────────────────────
function updateSubmit(answered, total) {
  const btn = document.getElementById('btn-submit');
  const hint = document.getElementById('submit-hint');
  const done = total > 0 && answered === total;
  btn.disabled = !done;
  btn.setAttribute('aria-disabled', !done);
  hint.textContent = done
    ? 'All questions answered — ready to see results'
    : `${total - answered} question${total - answered !== 1 ? 's' : ''} remaining`;
}

// ── LIVE DOMAIN PANEL (feature 3) ─────────────────────────────────────────────
function buildLiveDomainPanel() {
  const list = document.getElementById('live-domain-list');
  list.innerHTML = '';
  Object.entries(state.config.domains).forEach(([key, domain]) => {
    const row = document.createElement('div');
    row.className = 'live-domain-row';
    row.id = `live-domain-${key}`;
    row.innerHTML = `
      <span class="live-domain-name">${domain.shortLabel}</span>
      <span class="live-domain-status" id="live-status-${key}">—</span>`;
    list.appendChild(row);
  });
}

function updateLiveDomainPanel() {
  const results = evalRouting();
  const cfg = state.config;

  Object.entries(cfg.domains).forEach(([key]) => {
    const statusEl = document.getElementById(`live-status-${key}`);
    const rowEl = document.getElementById(`live-domain-${key}`);
    if (!statusEl || !rowEl) return;

    const result = results[key];
    rowEl.className = 'live-domain-row';

    if (!result || !result.flagged) {
      statusEl.textContent = '—';
      statusEl.className = 'live-domain-status status-clear';
    } else {
      const p = result.priority;
      statusEl.textContent = cfg.priorities[p]?.label || p;
      statusEl.className = `live-domain-status status-${p}`;
      rowEl.classList.add('live-domain-active');
    }
  });
}

// ── ROUTING ENGINE ────────────────────────────────────────────────────────────
function matchRule(rule, answers) {
  if (rule.anyOf) {
    return Object.entries(rule.anyOf).every(([qid, vals]) => {
      const ans = answers[qid];
      if (!ans) return false;
      if (Array.isArray(ans)) return vals.some(v => ans.includes(v));
      return vals.includes(ans);
    });
  }
  if (rule.all) {
    return Object.entries(rule.all).every(([key, vals]) => {
      if (key === 'q6_any') {
        const ans = answers['q6'];
        if (!ans || !Array.isArray(ans)) return false;
        return vals.some(v => ans.includes(v));
      }
      const ans = answers[key];
      if (!ans) return false;
      if (Array.isArray(ans)) return vals.some(v => ans.includes(v));
      return vals.includes(ans);
    });
  }
  if (rule.only) {
    return Object.entries(rule.only).every(([qid, vals]) => {
      const ans = answers[qid];
      if (!ans || !Array.isArray(ans)) return false;
      return ans.every(v => vals.includes(v));
    });
  }
  return false;
}

function evalRouting() {
  const { routing } = state.config;
  const answers = state.answers;
  const results = {};

  Object.entries(routing).forEach(([domainKey, rules]) => {
    const flagged = rules.flag?.some(r => matchRule(r, answers)) ?? false;
    const elevated = flagged && (rules.elevate?.some(r => matchRule(r, answers)) ?? false);
    const lower = flagged && !elevated && (rules.lower?.some(r => matchRule(r, answers)) ?? false);
    const priority = flagged ? (elevated ? 'elevated' : lower ? 'lower' : 'standard') : null;
    results[domainKey] = { flagged, priority };
  });

  // Special case 1: Online Safety — algorithmic harm route
  if (!results.safety?.flagged) {
    const q6 = answers.q6 || [], q7 = answers.q7 || [];
    const q1a = answers.q1a || [], q1b = answers.q1b;
    if (q6.includes('shapes') && (q7.includes('no') || !q7.length) &&
      (q1a.includes('consumers') || q1b === 'yes' || q1b === 'notsure')) {
      results.safety = { flagged: true, priority: 'standard' };
    }
  }

  // Special case 2: Children + direct messaging escalation
  // Note: operator precedence bug intentionally left as-is (conservative behaviour correct)
  if (results.children?.flagged && results.children?.priority !== 'elevated') {
    if ((answers.q7 || []).includes('messaging')) {
      results.children = { flagged: true, priority: 'elevated' };
    }
  }

  return results;
}

// ── TRIGGER ATTRIBUTION (feature 4) ──────────────────────────────────────────
// Returns structured objects { qid, answerLabel, effect } for each contributing answer
function buildTriggers(domainKey, answers) {
  const triggers = [];
  const cfg = state.config;

  const has = (id, val) => {
    const ans = answers[id];
    if (Array.isArray(ans)) return ans.includes(val);
    return ans === val;
  };

  const getLabel = (qid, val) => {
    const q = cfg.questions.find(q => q.id === qid);
    if (!q) return val;
    const opt = q.options.find(o => o.value === val);
    return opt ? opt.label : val;
  };

  const add = (qid, val, effect) => {
    if (has(qid, val)) {
      const q = cfg.questions.find(q => q.id === qid);
      const text = q ? q.text : '';
      triggers.push({ qid: qid.toUpperCase(), text, answer: getLabel(qid, val), effect });
    }
  };

  if (domainKey === 'privacy') {
    add('q3', 'direct', 'Flags Privacy — direct data collection');
    add('q3', 'observed', 'Flags Privacy — behavioural tracking');
    add('q3', 'received', 'Flags Privacy — data received from external systems');
    add('q1b', 'yes', 'Flags + Elevates Privacy — affected people are not your customers');
    add('q1b', 'notsure', 'Flags Privacy — treated as affected third parties');
    add('q4', 'health', 'Elevates Privacy — health data is GDPR Article 9 special category');
    add('q4', 'financial', 'Elevates Privacy — financial data sensitive under most privacy laws');
    add('q4', 'location', 'Elevates Privacy — precise location is sensitive under GDPR and state laws');
    add('q4', 'biometric', 'Elevates Privacy — biometric data (BIPA, GDPR Article 9)');
    add('q4', 'orientation', 'Elevates Privacy — sexual orientation is GDPR Article 9 special category');
    add('q4', 'sensitive', 'Elevates Privacy — political/religious/criminal data (GDPR Article 9/10)');
  }

  if (domainKey === 'ai') {
    add('q5', 'yes', 'Confirms AI use — Q6 determines risk level');
    add('q6', 'generates', 'Flags AI — content generation, transparency obligations');
    add('q6', 'decides', 'Flags + Elevates AI — automated decisions about people (GDPR Art. 22, EU AI Act)');
    add('q6', 'shapes', 'Flags AI — personalisation/recommendation, DSA Article 29');
    add('q6', 'analyses', 'Flags AI at lower urgency — content/data analysis');

    // Algorithmic harm route note
    const q6 = answers.q6 || [], q7 = answers.q7 || [], q1a = answers.q1a || [], q1b = answers.q1b;
    if (q6.includes('shapes') && (q7.includes('no') || !q7.length) &&
      (q1a.includes('consumers') || q1b === 'yes' || q1b === 'notsure')) {
      triggers.push({ qid: 'Q6+Q1', text: 'Derived from multiple questions', answer: 'AI shapes + consumer-facing + no UGC', effect: 'Also flags Online Safety via algorithmic harm route' });
    }
  }

  if (domainKey === 'safety') {
    add('q7', 'public', 'Flags + Elevates Online Safety — public posting (DSA, UK OSA)');
    add('q7', 'messaging', 'Flags Online Safety — direct messaging');
    add('q7', 'reviews', 'Flags Online Safety — user reviews are UGC');

    const q6 = answers.q6 || [], q7 = answers.q7 || [], q1a = answers.q1a || [], q1b = answers.q1b;
    const noUGC = q7.includes('no') || !q7.length;
    if (q6.includes('shapes') && noUGC && (q1a.includes('consumers') || q1b === 'yes' || q1b === 'notsure')) {
      triggers.push({ qid: 'Q6+Q1', text: 'Derived from multiple questions', answer: 'AI personalisation, consumer-facing, no UGC', effect: 'Flags Online Safety via algorithmic harm route' });
    }
  }

  if (domainKey === 'children') {
    add('q4', 'under16', 'Flags Children — product handles data about under-16s');
    add('q8a', 'designed', 'Elevates Children — product designed for children (COPPA, UK Children\'s Code)');
    add('q8a', 'incidental', 'Flags Children — children\'s data incidentally included');
    add('q8a', 'notsure', 'Flags Children — uncertainty treated conservatively');
    add('q8b', 'yes', 'Elevates Children — product designed for/marketed to minors');
    add('q8b', 'possibly', 'Flags Children — minors are a realistic part of user base');
    add('q8b', 'notsure', 'Flags Children — uncertainty treated conservatively');
    add('q7', 'messaging', 'Note: direct messaging present — adult/child contact risk');
  }

  return triggers;
}

// ── SHOW RESULTS ──────────────────────────────────────────────────────────────
function showResults() {
  const cfg = state.config;
  const results = evalRouting();
  const container = document.getElementById('results-domains');
  container.innerHTML = '';

  const priorityOrder = { elevated: 0, standard: 1, lower: 2 };
  const domainKeys = Object.keys(cfg.domains).sort((a, b) => {
    const ra = results[a], rb = results[b];
    if (ra?.flagged && !rb?.flagged) return -1;
    if (!ra?.flagged && rb?.flagged) return 1;
    if (ra?.flagged && rb?.flagged) return (priorityOrder[ra.priority] ?? 3) - (priorityOrder[rb.priority] ?? 3);
    return 0;
  });

  domainKeys.forEach(key => {
    const domain = cfg.domains[key];
    const result = results[key] || { flagged: false, priority: null };
    const triggers = result.flagged ? buildTriggers(key, state.answers) : [];

    const card = document.createElement('div');
    card.className = `domain-card ${result.flagged ? 'flagged priority-' + result.priority : ''}`;

    const statusText = result.flagged ? (cfg.priorities[result.priority]?.label || result.priority) : 'Not flagged';
    const statusClass = result.flagged ? `status-${result.priority}` : 'status-not-flagged';
    const priorityNote = result.flagged ? cfg.priorities[result.priority]?.note : '';

    let triggersHTML = '';
    if (triggers.length) {
      triggersHTML = `
        <div class="trigger-table-wrap">
          <div class="trigger-table-label">What contributed to this result</div>
          <table class="trigger-table">
            <thead><tr><th>Question</th><th>Text</th><th>Your answer</th><th>Effect</th></tr></thead>
            <tbody>
              ${triggers.map(t => `
                <tr>
                  <td class="trigger-qid">${t.qid}</td>
                  <td class="trigger-text">${t.text}</td>
                  <td class="trigger-answer">${t.answer}</td>
                  <td class="trigger-effect">${t.effect}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    }

    card.innerHTML = `
      <div class="domain-card-header">
        <div class="domain-name">${domain.label}</div>
        <div class="domain-status ${statusClass}">${statusText}</div>
      </div>
      ${result.flagged ? `
        <div class="domain-card-body">
          <div class="domain-desc">${domain.description}</div>
          ${triggersHTML}
          ${priorityNote ? `<div class="priority-note">${priorityNote}</div>` : ''}
        </div>` : ''}`;

    container.appendChild(card);
  });

  const summaryContainer = document.getElementById('results-summary-table-container');
  let summaryHTML = `
    <table class="summary-table" style="width:100%; margin-top: 20px; border-collapse: collapse; text-align: left; background: #fff; border-radius: 8px; overflow: hidden; color: #333;">
      <thead>
        <tr style="background: #f1f5f9; border-bottom: 2px solid #e2e8f0;">
          <th style="padding: 12px 16px; font-weight: 600;">Risk Domain</th>
          <th style="padding: 12px 16px; font-weight: 600;">Status</th>
        </tr>
      </thead>
      <tbody>
  `;

  let anyElevated = false;
  let anyFlagged = false;

  Object.keys(cfg.domains).forEach(key => {
    const domain = cfg.domains[key];
    const result = results[key] || { flagged: false, priority: null };

    if (result.priority === 'elevated') anyElevated = true;
    if (result.flagged) anyFlagged = true;

    let statusText = 'Likely minimal risk given current answers';
    let statusStyle = 'color: #10b981; font-weight: 500;';

    if (result.flagged) {
      if (result.priority === 'elevated') {
        statusText = 'Elevated';
        statusStyle = 'color: #ef4444; font-weight: 600;';
      } else {
        statusText = 'Flagged';
        statusStyle = 'color: #f59e0b; font-weight: 600;';
      }
    }

    summaryHTML += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 16px;">${domain.label}</td>
          <td style="padding: 12px 16px; ${statusStyle}">${statusText}</td>
        </tr>
    `;
  });

  summaryHTML += `
      </tbody>
    </table>
    <p style="font-size: 13px; color: rgba(255,255,255,0.65); margin-top: 8px; font-style: italic;">
      We suggest showing these results to your legal/compliance departments for verification
    </p>
  `;

  let nextActionsText = '';
  if (anyElevated) {
    nextActionsText = `
<p style="margin-bottom: 12px;">One or more risk domains have been flagged in your assessment. These areas carry meaningful regulatory and design implications and are worth addressing before engineering starts, when changes are cheapest/easiest to make.</p>
<p style="margin-bottom: 16px;">The steps below are general starting points, not legal advice. For anything complex or high-stakes, work with a qualified legal or compliance professional.</p>

<h5 style="color: #fff; font-size: 15px; margin-bottom: 8px;">Privacy & Data Protection</h5>
<p style="margin-bottom: 8px;"><strong>If flagged:</strong> Start by mapping the personal data your product will actually collect and why. For each data type, ask: do we need this to make the feature work, or are we collecting it because we can? Document your answers. This is the foundation of any privacy review, and doing it early surfaces decisions that are much harder to reverse after launch.</p>
<p style="margin-bottom: 8px;">Review any third-party tools or SDKs in your stack that will touch personal data — analytics platforms, session recorders, AI APIs, marketing tools. Understand what data each one collects and where it goes. Surprises here are common.</p>
<p style="margin-bottom: 8px;">Check whether your product will serve users in the EU, UK, or California. If yes, GDPR, UK GDPR, and CCPA are likely to be relevant to how you structure consent, data subject rights, and retention.</p>
<p style="margin-bottom: 24px;"><strong>If elevated:</strong> Everything above, with more urgency. Elevated Privacy typically means your product collects sensitive data categories (health, financial, biometric, location, or data relating to children) or handles data flows that carry higher regulatory exposure. Bring legal or privacy counsel in early — ideally before your technical architecture is set. Decisions made now about data storage, retention, and access controls are significantly easier to change on a whiteboard than in production.</p>

<h5 style="color: #fff; font-size: 15px; margin-bottom: 8px;">Online Safety & Harm Prevention</h5>
<p style="margin-bottom: 8px;"><strong>If flagged:</strong> Walk through your product's intended features and identify anywhere users can create content, contact each other, or have content served to them algorithmically. For each of those surfaces, ask: what's the realistic worst-case use of this feature? Harassment, fraud, illegal content distribution, and manipulation are the four areas regulators focus on most.</p>
<p style="margin-bottom: 8px;">Start thinking about moderation: not just whether you'll have it, but how it will work, who's responsible for it, and how users can report problems. Products that launch without a moderation plan tend to build one reactively after something goes wrong — which is a worse starting point in every way.</p>
<p style="margin-bottom: 8px;">If your product operates in the UK or EU, the Online Safety Act and Digital Services Act may impose obligations depending on your product type and scale — clarifying which category your product falls into is worth discussing with counsel.</p>
<p style="margin-bottom: 24px;"><strong>If elevated:</strong> Elevated Online Safety usually means your product has significant UGC, a recommendation or ranking system, or strong signals that vulnerable users (including minors) are likely to be present. At this level, a lightweight think-through isn't enough. You should make explicit design decisions about how the product handles harmful content and protects users, and document those decisions. Regulatory scrutiny in this domain has increased significantly in the last two years and shows no sign of slowing.</p>

<h5 style="color: #fff; font-size: 15px; margin-bottom: 8px;">AI & Algorithmic Risk</h5>
<p style="margin-bottom: 8px;"><strong>If flagged:</strong> Identify every place in your product where an AI system influences a decision or outcome for a user. Be specific: what is the system doing, what data is it using, and what does a wrong output look like for the person on the receiving end?</p>
<p style="margin-bottom: 8px;">For third-party AI tools and APIs you're integrating: read the documentation on how the model was trained, what its known limitations are, and what the vendor's terms say about your responsibilities for how it's used. Many teams integrate AI tools without fully understanding what they're signing up for.</p>
<p style="margin-bottom: 8px;">Start thinking about how you'll detect and respond to AI errors at scale. A single bad recommendation is a bug. A systematic pattern of bad recommendations affecting certain user groups is a regulatory and reputational problem.</p>
<p style="margin-bottom: 24px;"><strong>If elevated:</strong> Elevated AI Risk means your product is using AI in ways that make consequential decisions about users — their access, their content, their opportunities, or their safety. In these cases, documenting your design decisions matters: how you evaluated the model, what safeguards are in place, and whether a human can review or override the outputs. The EU AI Act's requirements for high-risk AI systems provide a useful reference framework here, regardless of whether EU law applies to you directly.</p>

<h5 style="color: #fff; font-size: 15px; margin-bottom: 8px;">Children & Minors</h5>
<p style="margin-bottom: 8px;"><strong>If flagged:</strong> The most important first step is being honest about who will actually use your product — not just who you're building it for. If there's any realistic chance minors could access it, the design decisions you make now matter. Data minimisation, default privacy settings, and avoiding manipulative design patterns (endless scroll, streaks, social pressure mechanics) are easier to build in from the start than to retrofit.</p>
<p style="margin-bottom: 8px;">Review whether COPPA applies to your product if it operates in the US and could be used by children under 13. If you're in the UK or EU, the Children's Code and emerging EU frameworks set a higher bar: products "likely to be accessed by children" must be designed with their best interests as a default, not as an afterthought.</p>
<p style="margin-bottom: 24px;"><strong>If elevated:</strong> Elevated Children risk means either your product is clearly directed at minors or multiple signals suggest a significant presence of minors. At this level, age assurance (verification or estimation) is worth exploring — understanding what your options are, what the friction tradeoffs look like, and what your legal exposure is if you don't implement it. This is also the area where regulatory scrutiny is most unforgiving. Bring qualified counsel in early and document your decision-making.</p>

<p style="margin-bottom: 0;"><strong>Across all flagged domains:</strong> the goal right now isn't to solve everything. It's to understand what you're dealing with before you build. The decisions that matter most — data architecture, product design, third-party integrations — are all still ahead of you. That's exactly when a Risk Helper assessment is most useful.</p>
`;
  } else if (anyFlagged) {
    nextActionsText = `As one or more risk domains are flagged, these areas will likely benefit from further investigation and consideration. We suggest contacting your legal/compliance support sufficiently in advance of any mandated compliance review to get their input. Note that risks outside the scope of this assessment may still exist and should be reviewed.`;
  } else {
    nextActionsText = `Based on your answers, the product appears to be lower risk for privacy, online safety and harm prevention, AI risk, and risks related to children. It is important that all products be reviewed for compliance before launch, and this assessment is not a substitute for that. Note that risks outside the scope of this assessment may still exist and should be reviewed.`;
  }

  summaryHTML += `
    <details style="margin-top: 24px; background: rgba(255,255,255,0.1); border-radius: 8px; border-left: 4px solid var(--blue); cursor: pointer;" class="next-actions-details">
        <summary style="padding: 16px; list-style: none; display: flex; justify-content: space-between; align-items: center; outline: none;">
          <h4 style="color: #fff; margin: 0; font-size: 16px;">Suggested Next Actions</h4>
          <span class="chevron" style="color: #fff; font-size: 12px; transition: transform 0.2s;">▼</span>
        </summary>
        <div style="padding: 16px; padding-top: 0; color: rgba(255,255,255,0.65); font-size: 14px; line-height: 1.5; border-top: 1px solid rgba(255,255,255,0.1);">
          <div style="padding-top: 16px;">
            ${anyElevated ? nextActionsText : '<p style="margin: 0;">' + nextActionsText + '</p>'}
          </div>
        </div>
    </details>
    <style>
      details.next-actions-details p {
        color: rgba(255,255,255,0.65);
      }
      details.next-actions-details > summary::-webkit-details-marker {
        display: none;
      }
      details.next-actions-details[open] > summary .chevron {
        transform: rotate(180deg);
      }
    </style>
  `;

  if (summaryContainer) {
    summaryContainer.innerHTML = summaryHTML;
  }

  // Out-of-scope
  const oosList = document.getElementById('oos-list');
  if (oosList) {
    oosList.innerHTML = cfg.meta.outOfScope.map(item => `<li>${item}</li>`).join('');
  }

  show('screen-results');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── EDIT ANSWERS (feature 1) ──────────────────────────────────────────────────
function editAnswers() {
  // Return to questions screen with all answers intact
  show('screen-questions');
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── RESTART ───────────────────────────────────────────────────────────────────
function restart() {
  state.answers = {};
  document.querySelectorAll('#questions-container input').forEach(inp => {
    inp.checked = false;
    inp.closest('.option-label')?.classList.remove('selected');
  });
  document.querySelectorAll('.question-card').forEach(card => card.classList.remove('answered'));
  document.querySelectorAll('.question-impact').forEach(box => {
    box.innerHTML = '';
    box.classList.remove('has-content');
  });
  render();
  show('screen-questions');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── DOWNLOAD RESULTS ──────────────────────────────────────────────────────────
function downloadResults(e) {
  if (e) e.preventDefault();
  
  const cfg = state.config;
  const results = evalRouting();
  const dateStr = new Date().toLocaleString();
  
  let md = `# Risk Assessment Results\n**Generated:** ${dateStr}\n\n`;
  
  md += `## Summary of Assessment Process\n`;
  md += `The purpose of the assessment is to uncover risk early in the product development lifecycle in the ideation and early design phase. It is designed to provide the user with information early to help them improve their idea, select among ideas, and better plan the later stages of product development.\n\n`;
  md += `These are the results of an assessment in which the user completed a set of questions on risks related to Privacy and Data Protection, AI and Algorithmic Risk, Online Safety and Harm Prevention, and Children and Minors. Other risk areas are out of scope of the assessment and were not asked about.\n\n`;
  md += `This is directional guidance only, and as this is the early stage of product development, the final product is likely to change from its early design/idea to the released version. Assessment of any product or feature by a qualified professional ahead of launch is highly recommended and may be required by law.\n\n`;
  
  md += `--- \n\n## Summary of Results\n\n`;
  Object.keys(cfg.domains).forEach(key => {
    const domain = cfg.domains[key];
    const res = results[key] || { flagged: false, priority: null };
    let status = 'Not flagged';
    if (res.flagged) {
      const p = cfg.priorities[res.priority]?.label || res.priority;
      status = `**Flagged** (${p})`;
    }
    md += `### ${domain.label}\nStatus: ${status}\n\n`;
    
    if (res.flagged) {
      const triggers = buildTriggers(key, state.answers);
      if (triggers.length > 0) {
        md += `*What contributed to this result:*\n`;
        triggers.forEach(t => {
          md += `- **${t.qid}** (${t.answer}): ${t.effect}\n`;
        });
        md += `\n`;
      }
    }
  });
  
  md += `## Detailed Answers\n\n`;
  
  cfg.questions.forEach(q => {
    // Check if the question was active and answered
    const active = evalShowIf(q.showIf);
    const ans = state.answers[q.id];
    const answered = active && (
      (q.type === 'single' && ans && ans !== '') ||
      (q.type === 'multi' && Array.isArray(ans) && ans.length > 0)
    );
    
    if (answered) {
      md += `**${q.id.toUpperCase()}: ${q.text}**\n`;
      
      let answerLabels = [];
      if (q.type === 'single') {
        const opt = q.options.find(o => o.value === ans);
        answerLabels.push(opt ? opt.label : ans);
      } else if (q.type === 'multi') {
        ans.forEach(val => {
          const opt = q.options.find(o => o.value === val);
          if (opt) answerLabels.push(`- ${opt.label}`);
          else answerLabels.push(`- ${val}`);
        });
      }
      
      if (q.type === 'single') {
        md += `*Answer:* ${answerLabels[0]}\n\n`;
      } else {
        md += `*Answers:*\n${answerLabels.join('\n')}\n\n`;
      }
    }
  });

  md += `---\n\n## Metadata for AI Analysis\n\n`;
  md += `You should append the following metadata to the assessment results:\n\n`;
  
  md += `### Mapping the "Why" and "Priority"\n`;
  md += `- **Priority Definitions:** Explicitly define what the statuses mean. For instance, Elevated means a legal review is recommended before launch, while Standard suggests an assessment at the design phase.\n`;
  md += `- **The "Why We’re Asking" Logic:** For every flagged question, pull the corresponding "Why we're asking" text from your reference documentation. For example, if Q1b is flagged, the model should know this is often the difference between a simple and intensive review because third parties have rights even if they aren't customers.\n`;
  md += `- **Regulatory Jurisdictions:** Since you mentioned Canada (which is not in the current Level 0 logic), you should inform the model that while the tool currently focuses on GDPR (EU), UK GDPR, and US State Laws (like CCPA), it needs to extrapolate similar principles for PIPEDA (Canada).\n`;
  md += `- **Out of Scope Guardrails:** Provide the list of what the tool does not cover (e.g., SOC 2, PCI-DSS, ISO 27001) so the LLM doesn't give irrelevant advice regarding information security or financial compliance.\n\n`;
  
  md += `### Special Case Triggers\n`;
  md += `Provide the model with the "Hardcoded Logic" for complex risks:\n`;
  md += `- **Algorithmic Harm:** If the product personalizes content for consumers but has no user-generated content, it still carries risk.\n`;
  md += `- **Contact Risk:** If the Children domain is flagged and "direct messaging" is active, the risk is elevated because of adult-to-minor contact potential.\n\n`;

  md += `---\n*Disclaimer: This result is directional guidance only. It is not legal advice and is not a substitute for review by qualified legal or compliance professionals.*\n`;

  // Use a data URI instead of a Blob to avoid UUID race conditions / extension interference
  const base64 = btoa(unescape(encodeURIComponent(md)));
  const url = `data:text/markdown;charset=utf-8;base64,${base64}`;
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'risk_assessment_results.md';
  // Some browsers require the element to be in the DOM before clicking
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  
  // Cleanup
  setTimeout(() => document.body.removeChild(a), 100);
}

// ── INIT ──────────────────────────────────────────────────────────────────────
loadConfig();

// ── TAB SWITCHING ─────────────────────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('panel-' + tab).classList.add('active');
  if (tab === 'diagram') {
    // Small delay so the panel is visible before we measure positions
    setTimeout(() => { buildDiagram(); drawLines(); }, 60);
  }
}

// ── DIAGRAM ───────────────────────────────────────────────────────────────────

// Routing connections: which questions flag / elevate which domains
// Format: { qid, values (optional — if omitted means any answer), domain, effect }
// effect: 'flag' | 'elevate' | 'lower'
const DIAGRAM_CONNECTIONS = [
  // Privacy
  { qid: 'q1b', domain: 'privacy', effect: 'flag', label: 'Yes/Not sure → flags' },
  { qid: 'q1b', domain: 'privacy', effect: 'elevate', label: 'Yes → elevates' },
  { qid: 'q3', domain: 'privacy', effect: 'flag', label: 'Any data → flags' },
  { qid: 'q4', domain: 'privacy', effect: 'elevate', label: 'Sensitive categories → elevates' },
  { qid: 'q4', domain: 'children', effect: 'flag', label: 'Under-16 → flags Children' },
  // AI
  { qid: 'q5', domain: 'ai', effect: 'flag', label: 'Yes → enables AI assessment' },
  { qid: 'q6', domain: 'ai', effect: 'flag', label: 'Generates/shapes/analyses → flags' },
  { qid: 'q6', domain: 'ai', effect: 'elevate', label: 'Decides → elevates' },
  { qid: 'q6', domain: 'safety', effect: 'flag', label: 'Shapes + consumer = Safety flag' },
  // Safety
  { qid: 'q1a', domain: 'safety', effect: 'flag', label: 'Consumers → enables harm route' },
  { qid: 'q7', domain: 'safety', effect: 'flag', label: 'UGC/messaging/reviews → flags' },
  { qid: 'q7', domain: 'safety', effect: 'elevate', label: 'Public posting → elevates' },
  { qid: 'q7', domain: 'children', effect: 'elevate', label: 'Messaging + children → elevates' },
  // Children
  { qid: 'q8a', domain: 'children', effect: 'flag', label: 'Designed/incidental → flags' },
  { qid: 'q8a', domain: 'children', effect: 'elevate', label: 'Designed → elevates' },
  { qid: 'q8b', domain: 'children', effect: 'flag', label: 'Yes/Possibly → flags' },
  { qid: 'q8b', domain: 'children', effect: 'elevate', label: 'Yes → elevates' },
];

// Conditional dependencies: which question gates which other question
const DIAGRAM_DEPS = [
  { parent: 'q3', child: 'q4' },
  { parent: 'q5', child: 'q6' },
  { parent: 'q4', child: 'q8a' },  // when under16 selected
  { parent: 'q4', child: 'q8b' },  // when under16 NOT selected
];

// Domain colours (stroke colours for lines)
const DOMAIN_COLOURS = {
  privacy: '#2E5FA3',
  ai: '#7C3AED',
  safety: '#E65100',
  children: '#2E7D32',
};

const ELEVATE_COLOUR = '#E65100';

let diagramBuilt = false;
let activeQ = null;   // currently highlighted question id

function buildDiagram() {
  if (diagramBuilt) return;
  diagramBuilt = true;

  const cfg = state.config;
  const qContainer = document.getElementById('diagram-questions');
  const dContainer = document.getElementById('diagram-domains');

  // Build question nodes
  qContainer.innerHTML = '';
  cfg.questions.forEach(q => {
    const isConditional = !!q.showIf;
    const node = document.createElement('div');
    node.className = 'diag-q' + (isConditional ? ' conditional' : '');
    node.id = 'diag-q-' + q.id;
    node.dataset.qid = q.id;

    // Short label for diagram (truncate long questions)
    const shortText = q.text.length > 80 ? q.text.slice(0, 78) + '…' : q.text;

    node.innerHTML = `
      <div class="diag-q-id">${q.id.toUpperCase()}</div>
      <div class="diag-q-text">${shortText}</div>
      <span class="diag-q-badge">${isConditional ? 'Conditional' : 'Always shown'}</span>`;

    node.addEventListener('click', () => toggleHighlight(q.id));
    qContainer.appendChild(node);
  });

  // Build domain nodes
  dContainer.innerHTML = '';
  Object.entries(cfg.domains).forEach(([key, domain]) => {
    const node = document.createElement('div');
    node.className = 'diag-domain';
    node.id = 'diag-domain-' + key;
    node.dataset.domain = key;
    node.innerHTML = `
      <div class="diag-domain-name">${domain.shortLabel}</div>
      <div class="diag-domain-desc">${domain.description}</div>`;
    dContainer.appendChild(node);
  });
}

function drawLines() {
  const svg = document.getElementById('diagram-svg');
  const svgCol = document.getElementById('diagram-svg-col');
  const wrap = document.getElementById('diagram-wrap');
  if (!svg || !svgCol || !wrap) return;

  svg.innerHTML = '';

  const wrapRect = wrap.getBoundingClientRect();

  // Helper: get mid-right of a question node, mid-left of a domain node
  function qAnchor(qid) {
    const el = document.getElementById('diag-q-' + qid);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: r.right - wrapRect.left,
      y: r.top + r.height / 2 - wrapRect.top,
    };
  }

  function domainAnchor(domainKey) {
    const el = document.getElementById('diag-domain-' + domainKey);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: r.left - wrapRect.left,
      y: r.top + r.height / 2 - wrapRect.top,
    };
  }

  // Set SVG height to wrap height
  const wrapH = wrap.getBoundingClientRect().height;
  svgCol.style.height = wrapH + 'px';
  svg.setAttribute('viewBox', `0 0 80 ${wrapH}`);

  // Draw connection lines
  DIAGRAM_CONNECTIONS.forEach(conn => {
    const q = qAnchor(conn.qid);
    const d = domainAnchor(conn.domain);
    if (!q || !d) return;

    const isElevate = conn.effect === 'elevate';
    const colour = isElevate ? ELEVATE_COLOUR : DOMAIN_COLOURS[conn.domain];
    const strokeW = isElevate ? 2.5 : 1.5;

    // Cubic bezier: q exits right, d enters left
    const x1 = 0, y1 = q.y, x2 = 80, y2 = d.y;
    const cx1 = 32, cx2 = 48;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', colour);
    path.setAttribute('stroke-width', strokeW);
    path.setAttribute('opacity', '0.35');
    path.dataset.qid = conn.qid;
    path.dataset.domain = conn.domain;
    path.dataset.effect = conn.effect;
    svg.appendChild(path);
  });

  // Draw dependency dashed lines (vertical, within question column)
  DIAGRAM_DEPS.forEach(dep => {
    const parent = document.getElementById('diag-q-' + dep.parent);
    const child = document.getElementById('diag-q-' + dep.child);
    if (!parent || !child) return;

    const pr = parent.getBoundingClientRect();
    const cr = child.getBoundingClientRect();

    // Draw a small bracket on the left side of the question column
    const x = -12;  // outside the SVG col, into the q column — use negative x trick via overflow:visible
    const y1 = pr.bottom - wrapRect.top;
    const y2 = cr.top + cr.height / 2 - wrapRect.top;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M${x},${y1} L${x},${y2} L${x + 8},${y2}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#FBBF24');
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('stroke-dasharray', '4 3');
    path.setAttribute('opacity', '0.7');
    path.dataset.dep = dep.parent + '-' + dep.child;
    svg.appendChild(path);
  });
}

function toggleHighlight(qid) {
  if (activeQ === qid) {
    // Deselect
    activeQ = null;
    document.querySelectorAll('.diag-q').forEach(el => el.classList.remove('highlighted', 'dimmed'));
    document.querySelectorAll('.diag-domain').forEach(el => el.classList.remove('highlighted', 'dimmed'));
    document.querySelectorAll('#diagram-svg path[data-qid]').forEach(p => {
      p.setAttribute('opacity', '0.35');
      p.setAttribute('stroke-width', p.dataset.effect === 'elevate' ? '2.5' : '1.5');
    });
    return;
  }

  activeQ = qid;

  // Get domains this question connects to
  const connectedDomains = new Set(
    DIAGRAM_CONNECTIONS.filter(c => c.qid === qid).map(c => c.domain)
  );
  // Get questions this question depends on or that depend on it
  const relatedQs = new Set([qid]);
  DIAGRAM_DEPS.forEach(dep => {
    if (dep.parent === qid) relatedQs.add(dep.child);
    if (dep.child === qid) relatedQs.add(dep.parent);
  });

  // Highlight question nodes
  document.querySelectorAll('.diag-q').forEach(el => {
    const isRelated = relatedQs.has(el.dataset.qid);
    el.classList.toggle('highlighted', isRelated);
    el.classList.toggle('dimmed', !isRelated);
  });

  // Highlight domain nodes
  document.querySelectorAll('.diag-domain').forEach(el => {
    const isConnected = connectedDomains.has(el.dataset.domain);
    el.classList.toggle('highlighted', isConnected);
    el.classList.toggle('dimmed', !isConnected);
  });

  // Highlight SVG paths
  document.querySelectorAll('#diagram-svg path[data-qid]').forEach(path => {
    const isActive = path.dataset.qid === qid;
    path.setAttribute('opacity', isActive ? '0.9' : '0.06');
    if (isActive) {
      path.setAttribute('stroke-width', path.dataset.effect === 'elevate' ? '3.5' : '2.5');
    }
  });
}

// Redraw lines on window resize (positions change)
window.addEventListener('resize', () => {
  if (document.getElementById('panel-diagram')?.classList.contains('active')) {
    drawLines();
  }
});
