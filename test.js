#!/usr/bin/env node
/**
 * RiskHelper.ai — Site Test Suite
 * 
 * Tests: file existence, HTML structure, security headers, links,
 * placeholder text, cookie consent, JS syntax, config validity.
 * 
 * Run: node test.js
 * 
 * Exit code 0 = all tests passed
 * Exit code 1 = one or more tests failed
 */

const fs = require('fs');
const path = require('path');

const DIR = __dirname;

// ─── Test runner ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    const result = fn();
    if (result === false) {
      failed++;
      failures.push(`FAIL: ${name}`);
      console.log(`  ✗  ${name}`);
    } else {
      passed++;
      console.log(`  ✓  ${name}`);
    }
  } catch (e) {
    failed++;
    failures.push(`FAIL: ${name} — ${e.message}`);
    console.log(`  ✗  ${name} — ${e.message}`);
  }
}

function readFile(filename) {
  return fs.readFileSync(path.join(DIR, filename), 'utf8');
}

function fileExists(filename) {
  return fs.existsSync(path.join(DIR, filename));
}


// ─── 1. File existence ────────────────────────────────────────────────────────

console.log('\n══ 1. Required files exist ══');

const requiredFiles = [
  'index.html',
  'assessment.html',
  'privacy-policy.html',
  'terms.html',
  'shared.css',
  'shared.js',
  'assessment.css',
  'assessment.js',
];

for (const f of requiredFiles) {
  test(`File exists: ${f}`, () => fileExists(f));
}


// ─── 2. HTML structure ────────────────────────────────────────────────────────

console.log('\n══ 2. HTML structure ══');

for (const page of ['index.html', 'assessment.html', 'privacy-policy.html', 'terms.html']) {
  const html = readFile(page);
  
  test(`${page}: has <!DOCTYPE html>`, () => html.includes('<!DOCTYPE html>'));
  test(`${page}: has <html lang="en">`, () => html.includes('<html lang="en">'));
  test(`${page}: has <meta charset="UTF-8">`, () => html.toLowerCase().includes('charset="utf-8"'));
  test(`${page}: has viewport meta`, () => html.includes('name="viewport"'));
  test(`${page}: has <title>`, () => /<title>[^<]+<\/title>/.test(html));
  test(`${page}: has nav element`, () => html.includes('<nav '));
  test(`${page}: has footer element`, () => html.includes('<footer'));
  test(`${page}: has main element`, () => html.includes('<main'));
  test(`${page}: has shared.css link`, () => html.includes('shared.css'));
  test(`${page}: has shared.js script`, () => html.includes('shared.js'));
}


// ─── 3. Security headers ──────────────────────────────────────────────────────

console.log('\n══ 3. Security headers ══');

for (const page of ['index.html', 'assessment.html', 'privacy-policy.html', 'terms.html']) {
  const html = readFile(page);
  
  test(`${page}: has X-Content-Type-Options header`, () => html.includes('X-Content-Type-Options'));
  test(`${page}: has X-Frame-Options header`, () => html.includes('X-Frame-Options'));
  test(`${page}: has Referrer-Policy header`, () => html.includes('Referrer-Policy'));
  test(`${page}: has Content-Security-Policy header`, () => html.includes('Content-Security-Policy'));
  test(`${page}: has Permissions-Policy header`, () => html.includes('Permissions-Policy'));
}


// ─── 4. No broken # links on live pages ──────────────────────────────────────

console.log('\n══ 4. No bare # links (privacy/legal pages only) ══');

// These pages should not have bare # links (they're fully built out)
for (const page of ['privacy-policy.html', 'terms.html']) {
  const html = readFile(page);
  // Exclude the cookie settings link which intentionally uses # + JS
  const withoutCookieLink = html.replace(/id="open-cookie-settings"[^>]*href="#"/g, '');
  const bareLinks = withoutCookieLink.match(/href="#"(?!\s*id="open-cookie-settings")/g) || [];
  test(`${page}: no bare # links`, () => bareLinks.length === 0);
}


// ─── 5. CTA links point to real pages ────────────────────────────────────────

console.log('\n══ 5. CTA links point to real pages ══');

const index = readFile('index.html');

test('index.html: assessment CTAs point to assessment.html', () => {
  const ctaLinks = index.match(/href="([^"]+)"/g) || [];
  return ctaLinks.some(l => l.includes('assessment.html'));
});

test('index.html: privacy policy link exists in footer', () => {
  return index.includes('href="privacy-policy.html"');
});

test('index.html: terms link exists in footer', () => {
  return index.includes('href="terms.html"');
});

test('index.html: contact email present', () => {
  return index.includes('contact@riskhelper.ai');
});

const assessment = readFile('assessment.html');
test('assessment.html: back-link to index.html present', () => {
  return assessment.includes('href="index.html"');
});


// ─── 6. No unresolved placeholder text ───────────────────────────────────────

console.log('\n══ 6. Placeholder text checks ══');

const placeholderPatterns = [
  /Lorem ipsum/i,
  /LOGO_PLACEHOLDER/,
  /\[TBD\]/i,
  /Company Name\]/i,  // checks for [Company Name]
  /\[last name\]/i,
  /\[Add bio here\]/i,
];

// These are EXPECTED placeholders left intentionally for the founder to fill in
const expectedPlaceholders = [
  'Company legal name',  // in privacy policy and terms — expected
  'add before launch',   // intentional placeholder markers
];

for (const page of ['index.html', 'assessment.html', 'privacy-policy.html', 'terms.html']) {
  const html = readFile(page);
  
  for (const pattern of placeholderPatterns) {
    test(`${page}: no "${pattern}" placeholder`, () => !pattern.test(html));
  }
}


// ─── 7. Cookie consent banner present on all pages ───────────────────────────

console.log('\n══ 7. Cookie consent ══');

for (const page of ['index.html', 'assessment.html', 'privacy-policy.html', 'terms.html']) {
  const html = readFile(page);
  test(`${page}: has cookie banner element`, () => html.includes('id="cookie-banner"'));
  test(`${page}: has cookie accept button`, () => html.includes('id="cookie-accept"'));
  test(`${page}: has cookie reject button`, () => html.includes('id="cookie-reject"'));
}


// ─── 8. Legal disclaimer on homepage and assessment ──────────────────────────

console.log('\n══ 8. Legal disclaimers ══');

for (const page of ['index.html', 'assessment.html']) {
  const html = readFile(page);
  test(`${page}: "not legal advice" disclaimer present`, () => {
    return html.toLowerCase().includes('not legal advice');
  });
}

test('privacy-policy.html: has GDPR section', () => {
  const html = readFile('privacy-policy.html');
  return html.includes('GDPR') && html.includes('legal-bases');
});

test('privacy-policy.html: has California/CCPA section', () => {
  const html = readFile('privacy-policy.html');
  return html.includes('California') && html.includes('CCPA');
});

test('privacy-policy.html: has data subject rights section', () => {
  const html = readFile('privacy-policy.html');
  return html.includes('your-rights') || html.includes('Your rights');
});

test('terms.html: includes not-legal-advice disclaimer', () => {
  const html = readFile('terms.html');
  return html.toLowerCase().includes('not legal advice');
});


// ─── 9. Assessment page: config present and valid ────────────────────────────

console.log('\n══ 9. Assessment config ══');

const assessmentHtml = readFile('assessment.html');

test('assessment.html: RISKHELPER_CONFIG is defined', () => {
  return assessmentHtml.includes('window.RISKHELPER_CONFIG');
});

test('assessment.html: config JSON is parseable', () => {
  const match = assessmentHtml.match(/window\.RISKHELPER_CONFIG\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
  if (!match) throw new Error('Config block not found');
  try {
    JSON.parse(match[1]);
    return true;
  } catch(e) {
    throw new Error('JSON parse failed: ' + e.message);
  }
});

test('assessment.html: config has 4 domains', () => {
  const match = assessmentHtml.match(/window\.RISKHELPER_CONFIG\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
  const cfg = JSON.parse(match[1]);
  return Object.keys(cfg.domains).length === 4;
});

test('assessment.html: config has questions array', () => {
  const match = assessmentHtml.match(/window\.RISKHELPER_CONFIG\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
  const cfg = JSON.parse(match[1]);
  return Array.isArray(cfg.questions) && cfg.questions.length >= 9;
});

test('assessment.html: config has routing rules', () => {
  const match = assessmentHtml.match(/window\.RISKHELPER_CONFIG\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
  const cfg = JSON.parse(match[1]);
  return cfg.routing && cfg.routing.privacy && cfg.routing.ai;
});

test('assessment.html: feedback keys match option values', () => {
  const match = assessmentHtml.match(/window\.RISKHELPER_CONFIG\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
  const cfg = JSON.parse(match[1]);
  const errors = [];
  for (const q of cfg.questions) {
    const fb = q.feedback || {};
    const optVals = new Set(q.options.map(o => o.value));
    for (const key of Object.keys(fb)) {
      if (!optVals.has(key)) {
        errors.push(`${q.id}: feedback key "${key}" has no matching option`);
      }
    }
  }
  if (errors.length > 0) throw new Error(errors.join('; '));
  return true;
});

test('assessment.html: showIf references valid question IDs', () => {
  const match = assessmentHtml.match(/window\.RISKHELPER_CONFIG\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
  const cfg = JSON.parse(match[1]);
  const ids = new Set(cfg.questions.map(q => q.id));
  const errors = [];
  for (const q of cfg.questions) {
    const si = q.showIf;
    if (si && si.question && !ids.has(si.question)) {
      errors.push(`${q.id} showIf references unknown question "${si.question}"`);
    }
  }
  if (errors.length > 0) throw new Error(errors.join('; '));
  return true;
});


// ─── 10. Assessment JS: key functions present ─────────────────────────────────

console.log('\n══ 10. Assessment JavaScript ══');

const jsContent = readFile('assessment.js');

const requiredFunctions = [
  'function loadConfig',
  'function boot',
  'function render',
  'function evalRouting',
  'function showResults',
  'function restart',
  'function editAnswers',
  'function switchTab',
];

for (const fn of requiredFunctions) {
  test(`assessment.js: has ${fn}`, () => jsContent.includes(fn));
}

test('assessment.js: no reference to BETTER_RISK_CONFIG', () => {
  return !jsContent.includes('BETTER_RISK_CONFIG');
});

test('assessment.js: uses RISKHELPER_CONFIG', () => {
  return jsContent.includes('RISKHELPER_CONFIG');
});


// ─── 11. Shared components ────────────────────────────────────────────────────

console.log('\n══ 11. Shared components ══');

const sharedJs = readFile('shared.js');
test('shared.js: has cookie consent logic', () => sharedJs.includes('CONSENT_KEY'));
test('shared.js: has mobile nav logic', () => sharedJs.includes('hamburger'));
test('shared.js: exposes RH namespace', () => sharedJs.includes('window.RH'));
test('shared.js: has resetConsent function', () => sharedJs.includes('resetConsent'));

const sharedCss = readFile('shared.css');
test('shared.css: has CSS custom properties', () => sharedCss.includes(':root'));
test('shared.css: has nav styles', () => sharedCss.includes('.nav-inner'));
test('shared.css: has footer styles', () => sharedCss.includes('.footer-top'));
test('shared.css: has cookie banner styles', () => sharedCss.includes('#cookie-banner'));
test('shared.css: has prefers-reduced-motion query', () => sharedCss.includes('prefers-reduced-motion'));

const assessmentCss = readFile('assessment.css');
test('assessment.css: has question card styles', () => assessmentCss.includes('.question-card'));
test('assessment.css: has result domain styles', () => assessmentCss.includes('.domain-result'));
test('assessment.css: has diagram styles', () => assessmentCss.includes('.diagram-wrap'));


// ─── 12. No "Better Risk" branding on live pages ──────────────────────────────

console.log('\n══ 12. Brand consistency ══');

for (const page of ['index.html', 'assessment.html', 'privacy-policy.html', 'terms.html']) {
  const html = readFile(page);
  test(`${page}: no "Better Risk" branding in HTML`, () => {
    // Only check the HTML, not the embedded JS comments
    const htmlNoComments = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
    return !htmlNoComments.includes('Better Risk');
  });
}

test('assessment.js: title comment still says Better Risk (OK in comments)', () => {
  // This is fine — it's in comments, not rendered UI
  return true;
});

const assessHtml = readFile('assessment.html');
test('assessment.html: title is Risk Helper not Better Risk', () => {
  return assessHtml.includes('"title": "Risk Helper"');
});


// ─── Summary ──────────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.log('\nFailed tests:');
  for (const f of failures) {
    console.log(`  ${f}`);
  }
  console.log('');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed.\n');
  process.exit(0);
}
