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

  document.getElementById('btn-start').addEventListener('click', () => {
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
      triggers.push({ qid: qid.toUpperCase(), answer: getLabel(qid, val), effect });
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
      triggers.push({ qid: 'Q6+Q1', answer: 'AI shapes + consumer-facing + no UGC', effect: 'Also flags Online Safety via algorithmic harm route' });
    }
  }

  if (domainKey === 'safety') {
    add('q7', 'public', 'Flags + Elevates Online Safety — public posting (DSA, UK OSA)');
    add('q7', 'messaging', 'Flags Online Safety — direct messaging');
    add('q7', 'reviews', 'Flags Online Safety — user reviews are UGC');

    const q6 = answers.q6 || [], q7 = answers.q7 || [], q1a = answers.q1a || [], q1b = answers.q1b;
    const noUGC = q7.includes('no') || !q7.length;
    if (q6.includes('shapes') && noUGC && (q1a.includes('consumers') || q1b === 'yes' || q1b === 'notsure')) {
      triggers.push({ qid: 'Q6+Q1', answer: 'AI personalisation, consumer-facing, no UGC', effect: 'Flags Online Safety via algorithmic harm route' });
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
            <thead><tr><th>Question</th><th>Your answer</th><th>Effect</th></tr></thead>
            <tbody>
              ${triggers.map(t => `
                <tr>
                  <td class="trigger-qid">${t.qid}</td>
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
    nextActionsText = "As one or more risk domains are elevated, these areas should be investigated to better understand them before development starts. These areas may require additional time and guidance to ensure your product/feature/idea complies with regulations ahead of launch. Contact your legal/compliance support early. Note that risks outside the scope of this assessment may still exist and should be reviewed.";
  } else if (anyFlagged) {
    nextActionsText = "As one or more risk domains are flagged, these areas will likely benefit from further investigation and consideration. We suggest contacting your legal/compliance support sufficiently in advance of any mandated compliance review to get their input. Note that risks outside the scope of this assessment may still exist and should be reviewed.";
  } else {
    nextActionsText = "Based on your answers, the product appears to be lower risk for privacy, online safety and harm prevention, AI risk, and risks related to children. It is important that all products be reviewed for compliance before launch, and this assessment is not a substitute for that. Note that risks outside the scope of this assessment may still exist and should be reviewed.";
  }

  summaryHTML += `
    <div style="margin-top: 24px; background: rgba(255,255,255,0.1); padding: 16px; border-radius: 8px; border-left: 4px solid var(--blue);">
        <h4 style="color: #fff; margin-bottom: 8px; font-size: 16px;">Suggest Next Actions</h4>
        <p style="color: rgba(255,255,255,0.85); font-size: 14px; line-height: 1.5;">${nextActionsText}</p>
    </div>
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
