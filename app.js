/* ============================================================
   SCRIPTSENSE — APP.JS v1.1
   ============================================================ */
'use strict';

/* ============================================================
   0. STATE
   ============================================================ */
const STATE = {
  apiKey: null,
  course: null,
  section: null,
  mode: null,           // 'freewrite'|'practice'|'scaffolded'|'intro'
  timerDuration: null,
  textTitle: null,
  textAuthor: null,
  textType: null,
  quoteBank: [],
  currentQuestion: null,
  timerInterval: null,
  timerSeconds: 0,
  stopwatchSeconds: 0,
  autosaveInterval: null,
  reviewInterval: null,
  sessionStartTime: null,
  currentSelection: null,
  questionLocked: false,
  questionRegenCount: 0,
  sessionEnded: false,
  // v1.1 additions
  confidence: 'high',
  argumentMap: null,
  sessionGoal: null,
  readingTimeEnabled: false,   // off by default — user enables in mode select
  readingTimeActive: false,
  readingTimeInterval: null,
  readingTimeSeconds: 0,
  complexityCheckTimeout: null,
  tryAgainData: null,
  scaffoldData: null,
  markedData: null,
  customQuestion: null,
  examinerMode: false,
};

/* ============================================================
   1. UTILITIES
   ============================================================ */
function $(id) { return document.getElementById(id); }

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = '';
  });
  const el = $(id);
  if (el) el.classList.add('active');
}

function openModal(id) {
  const m = $(id);
  if (!m) return;
  m.setAttribute('aria-hidden', 'false');
  m.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const m = $(id);
  if (!m) return;
  m.setAttribute('aria-hidden', 'true');
  m.classList.remove('open');
  document.body.style.overflow = '';
}

function showToast(message, type = 'info') {
  const toast = $('toast'), text = $('toast-text'), icon = $('toast-icon');
  if (!toast) return;
  const icons = {
    success: '<polyline points="20 6 9 17 4 12"/>',
    error:   '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
    info:    '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
  };
  text.textContent = message;
  icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icons[type]||icons.info}</svg>`;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 3200);
}

function setBtnLoading(btn, loading) {
  if (!btn) return;
  loading ? btn.classList.add('loading') : btn.classList.remove('loading');
  btn.disabled = loading;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function getWordCount(text) {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function saveDraft() {
  const content = $('writing-area')?.innerText || '';
  const key = `scriptsense_draft_${STATE.course}_${STATE.mode}`;
  try {
    localStorage.setItem(key, content);
    const label = $('autosave-text');
    const ind   = $('autosave-indicator');
    if (label) label.textContent = `Saved ${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`;
    ind?.classList.add('saved');
    setTimeout(() => ind?.classList.remove('saved'), 2500);
  } catch(e) {}
}

function loadDraft() {
  try { return localStorage.getItem(`scriptsense_draft_${STATE.course}_${STATE.mode}`) || ''; }
  catch(e) { return ''; }
}

function saveQuotes() {
  try { localStorage.setItem('scriptsense_quotes', JSON.stringify(STATE.quoteBank)); } catch(e) {}
}

function loadSavedQuotes() {
  try {
    const s = localStorage.getItem('scriptsense_quotes');
    if (s) STATE.quoteBank = JSON.parse(s);
  } catch(e) { STATE.quoteBank = []; }
}

/* ============================================================
   2. GEMINI API — TWO-CALL ARCHITECTURE
   ============================================================ */
async function callGemini(prompt, systemInstruction = null, maxTokens = 2048) {
  const endpoint = `${APP_CONFIG.gemini_api_endpoint}?key=${STATE.apiKey}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 }
  };
  if (systemInstruction) body.system_instruction = { parts: [{ text: systemInstruction }] };
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini.');
  return text.trim();
}

// Call 1: rewrite only — very short, fast
async function callGeminiRewrite(selectedText, skillLabel, confidence) {
  const confidenceCtx = confidence === 'low'
    ? 'The student has low confidence here — be gentle but specific.'
    : confidence === 'medium'
    ? 'The student has medium confidence here.'
    : 'The student marked high confidence — be direct and rigorous.';

  const examinerCtx    = getExaminerModeInstruction();
  const ratingAdjust   = getRatingAdjustment(skillLabel);

  const prompt = `You are a WACE writing coach. Rewrite ONLY the following highlighted text to improve its ${skillLabel}.

RULES:
- Return ONLY the improved rewrite. No labels, no explanation, no preamble.
- Keep the rewrite approximately the same length as the original.
- Do not rewrite content outside what is quoted below.
- ${confidenceCtx}
${examinerCtx}${ratingAdjust}

ORIGINAL TEXT: "${selectedText}"

REWRITE:`;
  return callGemini(prompt, null, 400);
}

// Call 2: assessment only — streams into feedback widget
async function callGeminiAssessment(selectedText, rewrite, skillLabel, confidence, essay, question) {
  const confidenceCtx = confidence === 'low'
    ? 'The student has low confidence in this section — acknowledge what they did attempt before identifying issues.'
    : confidence === 'high'
    ? 'The student marked high confidence — be direct about what is actually weak.'
    : '';

  const examinerCtx  = getExaminerModeInstruction();
  const ratingAdjust = getRatingAdjustment(skillLabel);

  const prompt = `You are a WACE writing coach providing assessment feedback.

SKILL BEING ASSESSED: ${skillLabel}
QUESTION: ${question || 'Free writing'}
STUDENT\'S ORIGINAL TEXT: "${selectedText}"
SUGGESTED REWRITE: "${rewrite}"
${confidenceCtx}
${examinerCtx}${ratingAdjust}

In 2-3 sentences only:
1. What specifically is weak in the original
2. What the rewrite does better and why it would score higher

Be specific, reference the actual words. No preamble. No bullet points. Plain prose only.`;
  return callGemini(prompt, null, 300);
}

async function validateApiKey(key) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: 'Reply with only the word: ready' }] }],
    generationConfig: { maxOutputTokens: 10 }
  };
  const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Invalid key');
  }
  return true;
}

/* ============================================================
   3. STREAMING
   ============================================================ */
function streamText(element, text, speed = 35, onComplete = null) {
  const tokens = text.split(/(\s+)/);
  let i = 0;
  element.textContent = '';
  element.classList.add('streaming');
  let timeoutId;
  function next() {
    if (i < tokens.length) {
      element.textContent += tokens[i];
      const t = tokens[i];
      const delay = /[.!?]$/.test(t.trim()) ? speed * 4 : t.trim() === '' ? speed / 4 : speed;
      i++;
      timeoutId = setTimeout(next, delay);
    } else {
      element.classList.remove('streaming');
      if (onComplete) onComplete();
    }
  }
  timeoutId = setTimeout(next, 0);
  return () => { clearTimeout(timeoutId); element.classList.remove('streaming'); element.textContent = text; };
}

/* ============================================================
   4. SELECTION LOADING HIGHLIGHT
   ============================================================ */
let _highlightSpan = null;

function highlightSelectionLoading() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return;
  try {
    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    span.className = 'selection-loading-highlight';
    span.id = 'selection-loading-highlight';
    range.surroundContents(span);
    _highlightSpan = span;
    sel.removeAllRanges();
  } catch(e) {}
}

function removeHighlightLoading() {
  const span = $('selection-loading-highlight') || _highlightSpan;
  if (span && span.parentNode) {
    const p = span.parentNode;
    while (span.firstChild) p.insertBefore(span.firstChild, span);
    p.removeChild(span);
    p.normalize();
  }
  _highlightSpan = null;
}

/* ============================================================
   5. FEEDBACK WIDGET
   ============================================================ */
let _feedbackStreamCancel = null;

function showFeedbackWidget(skillLabel, assessmentText, whyText = '') {
  const widget = $('feedback-widget');
  const skillEl = $('feedback-widget-skill');
  const textEl  = $('feedback-widget-text');
  const whyEl   = $('feedback-widget-why');
  if (!widget) return;
  if (_feedbackStreamCancel) { _feedbackStreamCancel(); _feedbackStreamCancel = null; }
  skillEl.textContent = skillLabel;
  textEl.textContent  = '';
  whyEl.textContent   = '';
  whyEl.classList.remove('visible');
  widget.setAttribute('aria-hidden', 'false');
  widget.classList.add('visible');
  _feedbackStreamCancel = streamText(textEl, assessmentText, 28, () => {
    if (whyText) {
      whyEl.classList.add('visible');
      _feedbackStreamCancel = streamText(whyEl, whyText, 28);
    }
  });
}

function hideFeedbackWidget() {
  const widget = $('feedback-widget');
  if (!widget) return;
  if (_feedbackStreamCancel) { _feedbackStreamCancel(); _feedbackStreamCancel = null; }
  widget.classList.remove('visible');
  widget.setAttribute('aria-hidden', 'true');
}

/* ============================================================
   6. API KEY GATE
   ============================================================ */
function initApiKeyScreen() {
  const input = $('apikey-input');
  const submit = $('apikey-submit');
  const toggle = $('apikey-toggle');
  const errorWrap = $('apikey-error');

  toggle?.addEventListener('click', () => {
    input.type = input.type === 'password' ? 'text' : 'password';
  });

  input?.addEventListener('keydown', e => { if (e.key === 'Enter') submit?.click(); });

  submit?.addEventListener('click', async () => {
    const key = input?.value?.trim();
    if (!key) { showApiKeyError('Please enter your Gemini API key.'); return; }
    setBtnLoading(submit, true);
    errorWrap?.classList.remove('visible');
    try {
      await validateApiKey(key);
      STATE.apiKey = key;
      loadSessionHistory();
      showScreen('screen-course');
      renderSessionHistory();
      tourTrigger('course_select');
    } catch(err) {
      showApiKeyError(`Invalid key: ${err.message}`);
    } finally {
      setBtnLoading(submit, false);
    }
  });
}

function showApiKeyError(msg) {
  const wrap = $('apikey-error'), text = $('apikey-error-text');
  if (wrap && text) { text.textContent = msg; wrap.classList.add('visible'); }
}

/* ============================================================
   7. COURSE SELECT
   ============================================================ */
function initCourseSelect() {
  document.querySelectorAll('.course-card').forEach(card => {
    card.addEventListener('click', () => {
      STATE.course = card.dataset.course;
      if (STATE.course === 'literature') {
        loadSavedQuotes();
        openModal('modal-text-setup');
        tourTrigger('text_setup');
      } else {
        showScreen('screen-mode');
        updateModeScreen();
        tourTrigger('mode_select');
      }
    });
  });

  $('clear-history-btn')?.addEventListener('click', () => {
    if (confirm('Clear all session history?')) {
      localStorage.removeItem('scriptsense_history');
      const section = $('session-history-section');
      if (section) section.style.display = 'none';
    }
  });
}

/* ============================================================
   8. TEXT & QUOTES MODAL
   ============================================================ */
function initTextSetupModal() {
  $('text-setup-next')?.addEventListener('click', () => {
    const title  = $('text-title-input')?.value?.trim();
    const author = $('text-author-input')?.value?.trim();
    const type   = $('text-type-select')?.value;
    if (!title || !author || !type) { showToast('Please fill in all text details.', 'error'); return; }
    STATE.textTitle = title; STATE.textAuthor = author; STATE.textType = type;
    $('text-setup-step1')?.classList.remove('active');
    $('text-setup-step2')?.classList.add('active');
    document.querySelectorAll('.modal-step')[0]?.classList.add('done');
    document.querySelectorAll('.modal-step')[1]?.classList.add('active');
    if (STATE.quoteBank.length > 0) {
      const bulk = $('quotes-bulk-input');
      if (bulk) bulk.value = STATE.quoteBank.map(q => q.label ? `${q.text} : ${q.label}` : q.text).join('\n');
    }
  });

  $('text-setup-back')?.addEventListener('click', () => {
    $('text-setup-step2')?.classList.remove('active');
    $('text-setup-step1')?.classList.add('active');
    document.querySelectorAll('.modal-step')[1]?.classList.remove('active');
    document.querySelectorAll('.modal-step')[0]?.classList.remove('done');
  });

  $('add-quote-row')?.addEventListener('click', () => addQuoteRow());

  $('text-setup-save')?.addEventListener('click', () => {
    parseAndSaveQuotes();
    closeModal('modal-text-setup');
    showScreen('screen-mode');
    updateModeScreen();
    tourTrigger('mode_select');
    setTimeout(resetTextSetupModal, 400);
  });
}

function addQuoteRow(quoteText = '', quoteLabel = '') {
  const container = $('quotes-rows');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'quote-row';
  row.innerHTML = `
    <input type="text" class="field-input" placeholder="Quote text..." value="${escapeHtml(quoteText)}" />
    <input type="text" class="field-input quote-row-tag" placeholder="Theme / label (optional)" value="${escapeHtml(quoteLabel)}" />
    <button class="quote-row-remove" type="button">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>`;
  row.querySelector('.quote-row-remove')?.addEventListener('click', () => row.remove());
  container.appendChild(row);
}

function parseAndSaveQuotes() {
  const quotes = [];
  const bulk = $('quotes-bulk-input')?.value || '';
  bulk.split('\n').forEach(line => {
    line = line.trim();
    if (!line) return;
    const ci = line.lastIndexOf(' : ');
    ci !== -1 ? quotes.push({ text: line.slice(0, ci).trim(), label: line.slice(ci + 3).trim() })
              : quotes.push({ text: line, label: '' });
  });
  document.querySelectorAll('.quote-row').forEach(row => {
    const inputs = row.querySelectorAll('input');
    const t = inputs[0]?.value?.trim(), l = inputs[1]?.value?.trim();
    if (t) quotes.push({ text: t, label: l || '' });
  });
  STATE.quoteBank = quotes;
  saveQuotes();
}

function resetTextSetupModal() {
  $('text-setup-step1')?.classList.add('active');
  $('text-setup-step2')?.classList.remove('active');
  document.querySelectorAll('.modal-step').forEach((s, i) => {
    s.classList.remove('active', 'done');
    if (i === 0) s.classList.add('active');
  });
  if ($('quotes-rows')) $('quotes-rows').innerHTML = '';
  if ($('quotes-bulk-input')) $('quotes-bulk-input').value = '';
}

/* ============================================================
   9. MODE SELECT
   ============================================================ */
function updateModeScreen() {
  const badge = $('mode-course-badge');
  if (badge) badge.textContent = STATE.course === 'literature' ? 'Literature ATAR' : 'English ATAR';
  const sw = $('english-section-wrap');
  if (sw) {
    if (STATE.course === 'english') {
      sw.classList.add('visible');
      if (!STATE.section) {
        STATE.section = 'composing';
        document.querySelector('.section-pill[data-section="composing"]')?.classList.add('active');
      }
    } else {
      sw.classList.remove('visible');
      STATE.section = null;
    }
  }
}

function initModeSelect() {
  $('mode-back')?.addEventListener('click', () => {
    STATE.course === 'literature' ? openModal('modal-text-setup') : showScreen('screen-course');
  });
  document.querySelectorAll('.section-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.section-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      STATE.section = pill.dataset.section;
    });
  });

  document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
      STATE.mode = card.dataset.mode;
      if (STATE.mode === 'freewrite') {
        startSession();
      } else if (STATE.mode === 'intro') {
        STATE.timerDuration = 8;
        startSession();
      } else {
        showScreen('screen-timer');
        tourTrigger('timer_select');
      }
    });
  });

  // Show session options tour step after mode cards are visible
  setTimeout(() => tourTrigger('session_options'), 600);

  // Reading time toggle
  const rtToggle = $('reading-time-toggle');
  rtToggle?.addEventListener('click', () => {
    STATE.readingTimeEnabled = !STATE.readingTimeEnabled;
    rtToggle.classList.toggle('active', STATE.readingTimeEnabled);
    rtToggle.setAttribute('aria-pressed', String(STATE.readingTimeEnabled));
  });

  // Session goal
  $('session-goal-select')?.addEventListener('change', e => {
    STATE.sessionGoal = e.target.value || null;
  });
}

/* ============================================================
   10. TIMER DURATION SELECT
   ============================================================ */
function initTimerSelect() {
  $('timer-back')?.addEventListener('click', () => showScreen('screen-mode'));
  document.querySelectorAll('.timer-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.timer-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      STATE.timerDuration = parseInt(opt.dataset.duration, 10);
      setTimeout(startSession, 200);
    });
  });
}

/* ============================================================
   11. SESSION START
   ============================================================ */
async function startSession() {
  STATE.sessionEnded     = false;
  STATE.questionLocked   = false;
  STATE.questionRegenCount = 0;
  STATE.sessionStartTime = Date.now();
  STATE.tryAgainData     = null;
  STATE.currentQuestion  = null;
  STATE.scaffoldData     = null;

  // ── Show editor screen immediately so there's never a blank ──
  updateEditorBadges();
  showScreen('screen-editor');
  initEditorEvents();
  updateWordCount();
  initComplexityAnalyser();
  showArgumentMapperTab();

  // Hide/show quote bank button
  const qbBtn = $('quote-bank-btn');
  if (qbBtn) qbBtn.style.display = STATE.course === 'literature' ? '' : 'none';

  // ── Free writing — no question needed ────────────────────
  if (STATE.mode === 'freewrite') {
    initStopwatch();
    const draft = loadDraft();
    const area  = $('writing-area');
    if (area && draft) area.innerText = draft;
    startFreeWritingReview();
    startAutosave();
    return;
  }

  // ── All question modes — show question header with spinner ─
  $('question-header')?.classList.add('visible');
  $('stimulus-header')?.classList.remove('visible');
  setQuestionGenerating(true);

  // Generate question
  await generateQuestionQuietly();

  // Special case: English comprehending
  if (STATE.course === 'english' && STATE.section === 'comprehending') {
    $('question-header')?.classList.remove('visible');
    $('stimulus-header')?.classList.add('visible');
    setQuestionGenerating(false);
    await generateStimulusContent();
    initCountdown((STATE.timerDuration || 45) * 60);
    startAutosave();
    return;
  }

  // Show generated question
  setQuestionGenerating(false);
  $('question-content')?.classList.add('visible');
  const textEl = $('question-text');
  if (textEl) textEl.textContent = STATE.currentQuestion || 'Could not generate question — please try again.';

  // Scaffold hints panel
  if (STATE.mode === 'scaffolded' && STATE.scaffoldData) renderScaffoldPanel();

  // Tour: question is now visible
  tourTrigger('question_ready');

  // Intro mode: auto-lock and start timer immediately
  if (STATE.mode === 'intro') {
    STATE.questionLocked = true;
    $('question-actions')?.classList.add('locked');
    initCountdown(8 * 60);
    startAutosave();
    $('writing-area')?.focus();
    tourTrigger('editor_writing');
    return;
  }

  // Practice / scaffolded: show actions so user can start
  $('question-actions')?.classList.remove('locked');
  $('question-regenerate')?.addEventListener('click', handleRegenQuestion, { once: true });
  $('question-start')?.addEventListener('click', lockAndStartWriting, { once: true });

  // Reading time: show the overlay OVER the visible question
  if (STATE.readingTimeEnabled) {
    startReadingTime();
  }
}

// Small helper so spinner state is always consistent
function setQuestionGenerating(loading) {
  const genEl     = $('question-generating');
  const contentEl = $('question-content');
  if (loading) {
    if (genEl) {
      genEl.style.display = 'flex';
      genEl.innerHTML = '<div class="generating-spinner" aria-hidden="true"></div><span>Generating your question...</span>';
    }
    contentEl?.classList.remove('visible');
  } else {
    if (genEl) genEl.style.display = 'none';
  }
}

// Generate question silently (no UI update) for reading time pre-load
async function generateQuestionQuietly() {
  // Use custom question if the student provided one
  if (STATE.customQuestion) {
    STATE.currentQuestion = STATE.customQuestion;
    STATE.customQuestion  = null;
    if (STATE.mode === 'scaffolded') {
      // Generate blueprint for custom question too
      await generateScaffoldBlueprint(STATE.currentQuestion);
    }
    const textEl = $('question-text');
    if (textEl) textEl.textContent = STATE.currentQuestion;
    return;
  }

  const pastQs   = LITERATURE_PAST_QUESTIONS.map(q => `${q.year} Q${q.question_number}: ${q.text}`).join('\n');
  const concepts = LITERATURE_SYLLABUS_CONCEPTS.map(c => `• ${c.concept}`).join('\n');
  const isEnglish = STATE.course === 'english';

  let prompt;
  if (isEnglish) {
    const sectionName = STATE.section || 'responding';
    const pastEng = (ENGLISH_PAST_QUESTIONS[sectionName] || ENGLISH_PAST_QUESTIONS.responding)
      .map(q => `${q.year}: ${q.text}`).join('\n');
    prompt = `${GEMINI_PROMPTS.question_generation_english}\nSECTION: ${sectionName.toUpperCase()}\nPAST QUESTIONS:\n${pastEng}\nGenerate ONE new practice question now.`;
  } else {
    prompt = `${GEMINI_PROMPTS.question_generation_literature}\nSTUDIED TEXT: "${STATE.textTitle}" by ${STATE.textAuthor}\nPAST QUESTIONS:\n${pastQs}\nKEY CONCEPTS:\n${concepts}\nGenerate ONE new practice question now.`;
  }

  // For scaffolded mode, generate question first then blueprint separately
  // so we don't blow the token budget in one call
  try {
    const result = await callGemini(prompt, null, 400);
    STATE.currentQuestion = result.trim();
    const textEl = $('question-text');
    if (textEl) textEl.textContent = STATE.currentQuestion;

    if (STATE.mode === 'scaffolded') {
      await generateScaffoldBlueprint(STATE.currentQuestion);
    }
  } catch(e) {
    STATE.currentQuestion = 'Could not generate question. Please check your API key and try again.';
  }
}

async function generateScaffoldBlueprint(question) {
  const isLit    = STATE.course === 'literature';
  const textInfo = isLit ? `\nSTUDIED TEXT: "${STATE.textTitle}" by ${STATE.textAuthor} (${STATE.textType})` : '';
  const quoteCtx = isLit && STATE.quoteBank.length
    ? `\nAVAILABLE QUOTES:\n${STATE.quoteBank.slice(0, 8).map(q => `• "${q.text}"${q.label ? ` [${q.label}]` : ''}`).join('\n')}`
    : '';
  const conceptsList = isLit
    ? LITERATURE_SYLLABUS_CONCEPTS.slice(0, 10).map(c => c.concept).join(', ')
    : ENGLISH_SYLLABUS_CONCEPTS.shared.map(c => c.concept).join(', ');

  const prompt = `You are a WACE ${isLit ? 'English Literature ATAR' : 'English ATAR'} teacher generating a scaffolded essay blueprint for a Year 12 student.
${textInfo}
QUESTION: ${question}
AVAILABLE CONCEPTS: ${conceptsList}
${quoteCtx}

Generate a detailed essay blueprint. Format EXACTLY like this with no deviations:

CONTENTION: [A suggested one-sentence argument that directly addresses the question — start with the text title or author name]

PARAGRAPH 1 — CLAIM: [A specific analytical claim for body paragraph 1]
PARAGRAPH 1 — CONCEPT: [The most relevant syllabus concept to deploy]
PARAGRAPH 1 — ANGLE: [One sentence on the non-dominant or nuanced reading to pursue]
${isLit && STATE.quoteBank.length ? 'PARAGRAPH 1 — QUOTE TIP: [Which quote to use and why]' : ''}

PARAGRAPH 2 — CLAIM: [A specific analytical claim for body paragraph 2]
PARAGRAPH 2 — CONCEPT: [The most relevant syllabus concept to deploy]
PARAGRAPH 2 — ANGLE: [One sentence on the nuanced reading to pursue]
${isLit && STATE.quoteBank.length ? 'PARAGRAPH 2 — QUOTE TIP: [Which quote to use and why]' : ''}

PARAGRAPH 3 — CLAIM: [A specific analytical claim for body paragraph 3]
PARAGRAPH 3 — CONCEPT: [The most relevant syllabus concept to deploy]
PARAGRAPH 3 — ANGLE: [One sentence on the nuanced reading to pursue]
${isLit && STATE.quoteBank.length ? 'PARAGRAPH 3 — QUOTE TIP: [Which quote to use and why]' : ''}

INTRODUCTION TIP: [One sentence on how to open the introduction effectively for this specific question]
CONCLUSION TIP: [One sentence on how to end the response for maximum impact]
WATCH OUT FOR: [One sentence naming the single most common mistake students make on this type of question]`;

  try {
    const result = await callGemini(prompt, null, 900);
    STATE.scaffoldData = parseScaffoldBlueprint(result);
  } catch(e) {
    // Fallback minimal scaffold data so rendering doesn't break
    STATE.scaffoldData = { contention: '', paragraphs: [], introTip: '', conclusionTip: '', watchOut: '', raw: '' };
  }
}

function parseScaffoldBlueprint(text) {
  const get = (label) => {
    const m = text.match(new RegExp(`${label}:\\s*([^\\n]+)`, 'i'));
    return m?.[1]?.trim() || '';
  };

  const paragraphs = [1, 2, 3].map(n => ({
    claim:    get(`PARAGRAPH ${n} — CLAIM`),
    concept:  get(`PARAGRAPH ${n} — CONCEPT`),
    angle:    get(`PARAGRAPH ${n} — ANGLE`),
    quoteTip: get(`PARAGRAPH ${n} — QUOTE TIP`)
  }));

  return {
    contention:   get('CONTENTION'),
    paragraphs,
    introTip:     get('INTRODUCTION TIP'),
    conclusionTip:get('CONCLUSION TIP'),
    watchOut:     get('WATCH OUT FOR'),
    raw: text
  };
}

function updateEditorBadges() {
  const modeLabels = { freewrite:'Free Writing', practice:'Practice Question', scaffolded:'Scaffolded', intro:'Intro Challenge' };
  const cb = $('topbar-course-badge'), mb = $('topbar-mode-badge'), tb = $('topbar-text-badge');
  if (cb) cb.textContent = STATE.course === 'literature' ? 'Literature ATAR' : 'English ATAR';
  if (mb) mb.textContent = modeLabels[STATE.mode] || STATE.mode;
  if (tb) {
    if (STATE.course === 'literature' && STATE.textTitle) { tb.textContent = STATE.textTitle; tb.style.display = ''; }
    else if (STATE.course === 'english' && STATE.section) { tb.textContent = capitalize(STATE.section); tb.style.display = ''; }
    else tb.style.display = 'none';
  }
}

/* ============================================================
   12. READING TIME
   ============================================================ */
function startReadingTime() {
  const overlay = $('reading-time-overlay');
  if (!overlay) return;

  STATE.readingTimeActive  = true;
  STATE.readingTimeSeconds = APP_CONFIG.reading_time_seconds || 300;

  // Remove any previously injected question display
  overlay.querySelectorAll('.rt-question-display').forEach(el => el.remove());

  // Inject question text into the overlay
  if (STATE.currentQuestion) {
    const inner = overlay.querySelector('.reading-time-inner');
    if (inner) {
      const qDisplay = document.createElement('div');
      qDisplay.className = 'rt-question-display';
      qDisplay.style.cssText = 'font-family:var(--font-display);font-style:italic;font-size:1.05rem;color:var(--ink);line-height:1.65;text-align:center;max-width:480px;padding:var(--space-4);background:var(--bg-warm);border-radius:var(--r-xl);border:var(--border-card);width:100%;';
      qDisplay.textContent = STATE.currentQuestion;
      const notesWrap = inner.querySelector('.reading-time-notes-wrap');
      notesWrap ? inner.insertBefore(qDisplay, notesWrap) : inner.prepend(qDisplay);
    }
  }

  const clock = $('reading-time-clock');
  if (clock) { clock.textContent = formatTime(STATE.readingTimeSeconds); clock.classList.remove('warning'); }

  // Ensure display:flex then trigger transition
  overlay.style.display = 'flex';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.classList.add('visible');
      overlay.setAttribute('aria-hidden', 'false');
    });
  });

  STATE.readingTimeInterval = setInterval(() => {
    STATE.readingTimeSeconds--;
    const c = $('reading-time-clock');
    if (c) {
      c.textContent = formatTime(STATE.readingTimeSeconds);
      c.classList.toggle('warning', STATE.readingTimeSeconds <= 60);
    }
    if (STATE.readingTimeSeconds <= 0) endReadingTime();
  }, 1000);

  // Clone skip button to clear old listeners
  const skipBtn = $('reading-time-skip');
  if (skipBtn) {
    const newSkip = skipBtn.cloneNode(true);
    skipBtn.parentNode?.replaceChild(newSkip, skipBtn);
    newSkip.addEventListener('click', endReadingTime, { once: true });
  }
}

function endReadingTime() {
  clearInterval(STATE.readingTimeInterval);
  STATE.readingTimeActive = false;
  const overlay = $('reading-time-overlay');
  overlay?.classList.remove('visible');
  // Hide after transition, then show argument mapper
  setTimeout(() => {
    if (overlay) overlay.style.display = 'none';
    showArgumentMapper();
  }, 280);
}

/* ============================================================
   13. ARGUMENT MAPPER
   ============================================================ */
function showArgumentMapper() {
  const mapper = $('argument-mapper');
  if (!mapper) { afterArgumentMap(); return; }

  // Pre-fill if returning
  if (STATE.argumentMap) {
    const { contention, p1, p2, p3 } = STATE.argumentMap;
    $('map-contention').value = contention || '';
    $('map-p1').value = p1 || '';
    $('map-p2').value = p2 || '';
    $('map-p3').value = p3 || '';
  }

  mapper.classList.add('visible');
  mapper.setAttribute('aria-hidden', 'false');
  $('map-contention')?.focus();

  $('argument-mapper-save')?.addEventListener('click', () => {
    STATE.argumentMap = {
      contention: $('map-contention')?.value?.trim() || '',
      p1: $('map-p1')?.value?.trim() || '',
      p2: $('map-p2')?.value?.trim() || '',
      p3: $('map-p3')?.value?.trim() || ''
    };
    mapper.classList.remove('visible');
    afterArgumentMap();
  }, { once: true });

  $('argument-mapper-close')?.addEventListener('click', () => {
    mapper.classList.remove('visible');
    afterArgumentMap();
  }, { once: true });
}

function afterArgumentMap() {
  if (STATE.mode !== 'freewrite' && !STATE.questionLocked) {
    // Timer only starts when user clicks Start Writing — don't auto-start here
    // Just ensure autosave is running
    startAutosave();
  }

  if (STATE.mode === 'scaffolded' && STATE.scaffoldData) {
    renderScaffoldPanel();
  }

  // Ensure question is visible
  const genEl = $('question-generating');
  const contentEl = $('question-content');
  const textEl = $('question-text');
  if (genEl) genEl.style.display = 'none';
  if (contentEl) contentEl.classList.add('visible');
  if (textEl && STATE.currentQuestion) textEl.textContent = STATE.currentQuestion;

  // Make sure start button is wired — remove any old listener first
  const startBtn = $('question-start');
  const regenBtn = $('question-regenerate');
  if (startBtn) {
    const newStart = startBtn.cloneNode(true);
    startBtn.parentNode?.replaceChild(newStart, startBtn);
    newStart.addEventListener('click', lockAndStartWriting, { once: true });
  }
  if (regenBtn) {
    const newRegen = regenBtn.cloneNode(true);
    regenBtn.parentNode?.replaceChild(newRegen, regenBtn);
    newRegen.addEventListener('click', handleRegenQuestion, { once: true });
  }

  $('question-actions')?.classList.remove('locked');
  $('writing-area')?.focus();
}

function showArgumentMapperTab() {
  let tab = document.querySelector('.mapper-tab');
  if (!tab) {
    tab = document.createElement('button');
    tab.className = 'mapper-tab';
    tab.textContent = 'Argument Map';
    tab.type = 'button';
    document.body.appendChild(tab);
  }
  tab.onclick = () => {
    const mapper = $('argument-mapper');
    if (mapper) {
      const isVisible = mapper.classList.contains('visible');
      mapper.classList.toggle('visible', !isVisible);
    }
  };
}

/* ============================================================
   14. SCAFFOLD PANEL
   ============================================================ */
function renderScaffoldPanel() {
  if (!STATE.scaffoldData) return;
  const d = STATE.scaffoldData;

  let panel = $('scaffold-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'scaffold-panel';
    panel.className = 'scaffold-panel visible';
    $('question-header')?.appendChild(panel);
  }

  const isLit = STATE.course === 'literature';

  // Paragraph cards
  const paraCards = d.paragraphs.map((p, i) => {
    if (!p.claim && !p.concept) return '';
    return `
      <div class="blueprint-para-card">
        <div class="blueprint-para-num">¶${i + 1}</div>
        <div class="blueprint-para-body">
          ${p.claim    ? `<div class="blueprint-row"><span class="blueprint-label">Claim</span><span class="blueprint-val">${escapeHtml(p.claim)}</span></div>` : ''}
          ${p.concept  ? `<div class="blueprint-row"><span class="blueprint-label concept">Concept</span><span class="blueprint-val">${escapeHtml(p.concept)}</span></div>` : ''}
          ${p.angle    ? `<div class="blueprint-row"><span class="blueprint-label angle">Angle</span><span class="blueprint-val">${escapeHtml(p.angle)}</span></div>` : ''}
          ${p.quoteTip ? `<div class="blueprint-row"><span class="blueprint-label quote">Quote</span><span class="blueprint-val">${escapeHtml(p.quoteTip)}</span></div>` : ''}
        </div>
      </div>`;
  }).join('');

  panel.innerHTML = `
    <div class="blueprint-header">
      <span class="blueprint-badge">Essay Blueprint</span>
      <button class="blueprint-toggle" id="blueprint-toggle" type="button" aria-expanded="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg>
        Hide
      </button>
    </div>
    <div class="blueprint-body" id="blueprint-body">
      ${d.contention ? `
      <div class="blueprint-contention">
        <span class="blueprint-label">Suggested contention</span>
        <p class="blueprint-contention-text">${escapeHtml(d.contention)}</p>
      </div>` : ''}

      <div class="blueprint-paras">
        ${paraCards}
      </div>

      <div class="blueprint-tips">
        ${d.introTip     ? `<div class="blueprint-tip blueprint-tip--intro"><strong>Intro:</strong> ${escapeHtml(d.introTip)}</div>`       : ''}
        ${d.conclusionTip? `<div class="blueprint-tip blueprint-tip--conc"><strong>Conclusion:</strong> ${escapeHtml(d.conclusionTip)}</div>`: ''}
        ${d.watchOut     ? `<div class="blueprint-tip blueprint-tip--warn"><strong>⚠ Watch out:</strong> ${escapeHtml(d.watchOut)}</div>`   : ''}
      </div>
    </div>`;

  // Toggle collapse
  $('blueprint-toggle')?.addEventListener('click', () => {
    const body    = $('blueprint-body');
    const btn     = $('blueprint-toggle');
    const isOpen  = body?.style.display !== 'none';
    if (body) body.style.display = isOpen ? 'none' : '';
    if (btn)  btn.innerHTML = isOpen
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg> Show'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg> Hide';
    btn.setAttribute('aria-expanded', String(!isOpen));
  });
}

/* ============================================================
   15. TIMER + STOPWATCH
   ============================================================ */
function initCountdown(totalSeconds) {
  STATE.timerSeconds = totalSeconds;
  clearInterval(STATE.timerInterval);
  const display = $('timer-value'), label = $('timer-label');
  if (display) display.textContent = formatTime(STATE.timerSeconds);
  if (label) label.textContent = 'remaining';
  STATE.timerInterval = setInterval(() => {
    STATE.timerSeconds--;
    if (display) display.textContent = formatTime(STATE.timerSeconds);
    if (STATE.timerSeconds <= APP_CONFIG.timer_warning_threshold_seconds) display?.classList.add('timer-warning');
    updateTimePressure();
    if (STATE.timerSeconds <= 0) { clearInterval(STATE.timerInterval); triggerSessionEnd(true); }
  }, 1000);
}

function initStopwatch() {
  STATE.stopwatchSeconds = 0;
  clearInterval(STATE.timerInterval);
  const display = $('timer-value'), label = $('timer-label');
  if (display) display.textContent = '00:00';
  if (label) label.textContent = 'elapsed';
  STATE.timerInterval = setInterval(() => {
    STATE.stopwatchSeconds++;
    if (display) display.textContent = formatTime(STATE.stopwatchSeconds);
  }, 1000);
}

/* ============================================================
   16. QUESTION GENERATION (full with UI)
   ============================================================ */
async function generateQuestion() {
  const genEl = $('question-generating'), contentEl = $('question-content');
  const textEl = $('question-text'), actionsEl = $('question-actions');
  if (genEl) genEl.style.display = 'flex';
  if (contentEl) contentEl.classList.remove('visible');

  if (STATE.currentQuestion) {
    // Question pre-loaded during reading time
    if (textEl) textEl.textContent = STATE.currentQuestion;
    if (genEl) genEl.style.display = 'none';
    if (contentEl) contentEl.classList.add('visible');
    if (actionsEl) actionsEl.classList.remove('locked');
    $('question-regenerate')?.addEventListener('click', handleRegenQuestion, { once: true });
    $('question-start')?.addEventListener('click', lockAndStartWriting, { once: true });
    return;
  }

  await generateQuestionQuietly();

  if (textEl) textEl.textContent = STATE.currentQuestion;
  if (genEl) genEl.style.display = 'none';
  if (contentEl) contentEl.classList.add('visible');
  if (actionsEl) actionsEl.classList.remove('locked');
  $('question-regenerate')?.addEventListener('click', handleRegenQuestion, { once: true });
  $('question-start')?.addEventListener('click', lockAndStartWriting, { once: true });
}

async function handleRegenQuestion() {
  if (STATE.questionRegenCount >= APP_CONFIG.max_question_regenerations) {
    showToast('You can only regenerate once.', 'error'); return;
  }
  STATE.questionRegenCount++;
  STATE.currentQuestion = null;
  $('question-actions')?.classList.add('locked');
  await generateQuestion();
}

function lockAndStartWriting() {
  STATE.questionLocked = true;
  $('question-actions')?.classList.add('locked');
  const duration = STATE.timerDuration || 45;
  initCountdown(duration * 60);
  startAutosave();
  $('writing-area')?.focus();
  // Tour: now in writing phase — show editor hint, then bottombar hint after delay
  tourTrigger('editor_writing');
  setTimeout(() => tourTrigger('editor_ai_help'), 8000);
}

/* ============================================================
   17. STIMULUS GENERATION
   ============================================================ */
async function generateStimulusContent() {
  const genEl = $('stimulus-generating'), contentEl = $('stimulus-content');
  const textEl = $('stimulus-text'), qList = $('stimulus-questions-list');
  if (genEl) genEl.style.display = 'flex';
  if (contentEl) contentEl.classList.remove('visible');

  const pastResponding = ENGLISH_PAST_QUESTIONS.responding.map(q => `${q.year}: ${q.text}`).join('\n');
  const concepts = ENGLISH_SYLLABUS_CONCEPTS.shared.map(c => c.concept).join(', ');
  const prompt = `${GEMINI_PROMPTS.question_generation_english}\nSECTION: COMPREHENDING\nPAST QUESTIONS:\n${pastResponding}\nKEY CONCEPTS: ${concepts}\nGenerate a WACE-style comprehending stimulus.\nFormat:\nTITLE: [title]\n---\n[stimulus text 200-250 words]\n---\nQ1: [question]\nQ2: [question]\nQ3: [question]`;

  try {
    const response = await callGemini(prompt, null, 800);
    const parsed = parseStimulusResponse(response);
    if (textEl) textEl.innerHTML = parsed.stimulus.replace(/\n/g, '<br>');
    if (qList) qList.innerHTML = parsed.questions.map(q => `<li>${escapeHtml(q)}</li>`).join('');
    STATE.currentQuestion = parsed.questions.join(' | ');
    if (genEl) genEl.style.display = 'none';
    if (contentEl) contentEl.classList.add('visible');
    initCountdown(STATE.timerDuration * 60);
    startAutosave();
  } catch(err) {
    if (genEl) genEl.innerHTML = `<span style="color:var(--danger)">Error: ${err.message}</span>`;
  }
}

function parseStimulusResponse(text) {
  const titleMatch = text.match(/TITLE:\s*(.+)/);
  const parts = text.split('---');
  const stimulusRaw = parts[1]?.trim() || text;
  const afterStimulus = parts[2] || text;
  const questions = [];
  for (const m of afterStimulus.matchAll(/Q\d+:\s*(.+)/g)) questions.push(m[1].trim());
  return {
    title: titleMatch?.[1]?.trim() || 'Stimulus Text',
    stimulus: stimulusRaw,
    questions: questions.length ? questions : [
      'Analyse how language features construct the perspective of the writer.',
      'Explain how the text positions its audience.',
      'Discuss how the conventions of this genre achieve the text\'s purpose.'
    ]
  };
}

/* ============================================================
   18. WORD COUNT + AUTOSAVE
   ============================================================ */
function updateWordCount() {
  const area = $('writing-area'), count = $('word-count');
  if (!area || !count) return;
  const w = getWordCount(area.innerText);
  count.textContent = `${w} word${w !== 1 ? 's' : ''}`;
  // Passive trackers
  updateQuoteTracker();
}

function startAutosave() {
  clearInterval(STATE.autosaveInterval);
  STATE.autosaveInterval = setInterval(saveDraft, APP_CONFIG.autosave_interval_ms);
  startVersionHistory();
  updateVersionRestoreUI();
}

/* ============================================================
   19. COMPLEXITY ANALYSER (pure JS — no API)
   ============================================================ */
function initComplexityAnalyser() {
  const area = $('writing-area');
  if (!area) return;
  area.addEventListener('input', () => {
    clearTimeout(STATE.complexityCheckTimeout);
    STATE.complexityCheckTimeout = setTimeout(() => runComplexityCheck(area), 1200);
  });
}

function runComplexityCheck(area) {
  const gutter = $('complexity-gutter');
  if (!gutter) return;
  gutter.innerHTML = '';

  const text = area.innerText || '';
  const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 20);
  const areaRect = area.getBoundingClientRect();
  const scrollTop = area.scrollTop || 0;

  paragraphs.forEach((para, idx) => {
    const issues = [];
    const sentences = para.split(/[.!?]+/).filter(s => s.trim().length > 0);

    // Check 1: repeated sentence starters
    const starters = sentences.map(s => s.trim().split(' ')[0]?.toLowerCase()).filter(Boolean);
    const starterCounts = {};
    starters.forEach(s => starterCounts[s] = (starterCounts[s] || 0) + 1);
    const repeated = Object.entries(starterCounts).filter(([, v]) => v >= 3);
    if (repeated.length) issues.push(`Sentence starter "${repeated[0][0]}" repeated ${repeated[0][1]} times`);

    // Check 2: sentence too long (>60 words)
    const longSentence = sentences.find(s => s.trim().split(/\s+/).length > 60);
    if (longSentence) issues.push('One sentence exceeds 60 words — consider splitting');

    // Check 3: content word repetition
    const words = para.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const wordCounts = {};
    words.forEach(w => wordCounts[w] = (wordCounts[w] || 0) + 1);
    const overused = Object.entries(wordCounts).filter(([, v]) => v >= 4);
    if (overused.length) issues.push(`Word "${overused[0][0]}" appears ${overused[0][1]} times in this paragraph`);

    if (issues.length === 0) return;

    // Find approximate Y position of this paragraph
    const charOffset = text.indexOf(para);
    const lineApprox = text.slice(0, charOffset).split('\n').length;
    const approxTop = lineApprox * 32; // rough line height

    const dot = document.createElement('div');
    dot.className = `complexity-dot ${issues.length >= 2 ? 'complexity-dot--issue' : 'complexity-dot--warn'}`;
    dot.style.top = `${approxTop}px`;
    dot.title = issues.join('\n');

    let tooltip = null;
    dot.addEventListener('mouseenter', (e) => {
      tooltip = document.createElement('div');
      tooltip.className = 'complexity-tooltip';
      tooltip.textContent = issues.join(' · ');
      document.body.appendChild(tooltip);
      tooltip.style.top  = `${e.clientY - 40}px`;
      tooltip.style.left = `${Math.min(e.clientX + 12, window.innerWidth - 240)}px`;
    });
    dot.addEventListener('mouseleave', () => { tooltip?.remove(); tooltip = null; });

    gutter.appendChild(dot);
  });
}

/* ============================================================
   20. TERMINOLOGY BANK
   ============================================================ */
function initTerminologyBank() {
  const drawer = $('terminology-drawer');
  const btn    = $('terminology-btn');
  const closeB = $('terminology-drawer-close');
  const search = $('terminology-search');
  const list   = $('terminology-list');

  if (!drawer) return;

  btn?.addEventListener('click', () => {
    const isOpen = drawer.classList.contains('open');
    if (!isOpen) {
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
      renderTermList('');
      search?.focus();
    } else {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
    }
  });

  closeB?.addEventListener('click', () => {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
  });

  search?.addEventListener('input', () => renderTermList(search.value));
}

function renderTermList(query) {
  const list = $('terminology-list');
  if (!list) return;
  const terms = STATE.course === 'literature' ? LITERATURE_TERMINOLOGY : ENGLISH_TERMINOLOGY;
  const q = query.toLowerCase().trim();
  const filtered = q ? terms.filter(t => t.term.includes(q) || t.definition.toLowerCase().includes(q)) : terms;

  list.innerHTML = filtered.map(t => `
    <div class="term-item" data-term="${escapeHtml(t.term)}">
      <div class="term-name">${escapeHtml(t.term)}</div>
      <div class="term-def">${escapeHtml(t.definition)}</div>
    </div>`).join('');

  list.querySelectorAll('.term-item').forEach(item => {
    item.addEventListener('click', () => {
      insertTextAtCursor(item.dataset.term);
      $('terminology-drawer')?.classList.remove('open');
      showToast(`"${item.dataset.term}" inserted`, 'success');
    });
  });
}

function insertTextAtCursor(text) {
  const area = $('writing-area');
  if (!area) return;
  area.focus();
  const sel = window.getSelection();
  if (sel && sel.rangeCount) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
  } else {
    area.textContent += text;
  }
  updateWordCount();
  saveDraft();
}

/* ============================================================
   21. QUOTE BANK POPUP
   ============================================================ */
function initQuoteBankPopup() {
  const popup = $('quote-bank-popup');
  const btn   = $('quote-bank-btn');
  const close = $('quote-bank-close');
  const search= $('quote-bank-search');

  btn?.addEventListener('click', () => {
    const isOpen = popup?.classList.contains('open');
    if (!isOpen) {
      popup?.classList.add('open');
      popup?.setAttribute('aria-hidden', 'false');
      renderQuoteList('');
      search?.focus();
    } else {
      popup?.classList.remove('open');
    }
  });

  close?.addEventListener('click', () => {
    popup?.classList.remove('open');
  });

  search?.addEventListener('input', () => renderQuoteList(search.value));
}

function renderQuoteList(query) {
  const list = $('quote-bank-list');
  if (!list) return;
  const q = query.toLowerCase().trim();
  const filtered = q
    ? STATE.quoteBank.filter(qt => qt.text.toLowerCase().includes(q) || qt.label?.toLowerCase().includes(q))
    : STATE.quoteBank;

  if (!filtered.length) {
    list.innerHTML = `<div class="quote-bank-empty">${STATE.quoteBank.length === 0 ? 'No quotes saved. Add quotes in the text setup.' : 'No quotes match your search.'}</div>`;
    return;
  }

  list.innerHTML = filtered.map((qt, i) => `
    <div class="quote-item" data-idx="${i}">
      <div class="quote-item-text">${escapeHtml(qt.text)}</div>
      ${qt.label ? `<div class="quote-item-label">${escapeHtml(qt.label)}</div>` : ''}
    </div>`).join('');

  list.querySelectorAll('.quote-item').forEach(item => {
    item.addEventListener('click', () => {
      const qt = filtered[parseInt(item.dataset.idx)];
      if (qt) {
        insertTextAtCursor(`'${qt.text}'`);
        $('quote-bank-popup')?.classList.remove('open');
        showToast('Quote inserted', 'success');
      }
    });
  });
}

/* ============================================================
   22. EDITOR EVENTS
   ============================================================ */
function initEditorEvents() {
  const area = $('writing-area');
  if (!area) return;

  area.addEventListener('input', updateWordCount);
  area.addEventListener('mouseup', handleTextSelection);
  area.addEventListener('keyup', handleTextSelection);

  document.addEventListener('mousedown', (e) => {
    const toolbar = $('ai-toolbar');
    if (toolbar && !toolbar.contains(e.target) && !area.contains(e.target)) {
      toolbar.classList.remove('visible');
    }
    // Close quote bank if clicking outside
    const popup = $('quote-bank-popup');
    if (popup && !popup.contains(e.target) && e.target !== $('quote-bank-btn')) {
      popup.classList.remove('open');
    }
    // Close starters drawer if clicking outside
    const starterDrawer = $('starters-drawer');
    if (starterDrawer && !starterDrawer.contains(e.target) && e.target !== $('starters-btn')) {
      starterDrawer.classList.remove('open');
    }
  });

  $('ai-help-btn')?.addEventListener('click', () => {
    showToast('Highlight the text you want help with, then click "Help me with this".', 'info');
    area.focus();
  });

  $('ai-toolbar-help')?.addEventListener('click', openSkillsPanel);
  $('skills-panel-close')?.addEventListener('click', closeSkillsPanel);
  $('skills-cancel')?.addEventListener('click', closeSkillsPanel);
  $('skills-analyse')?.addEventListener('click', handleSkillsAnalyse);
  $('feedback-widget-close')?.addEventListener('click', hideFeedbackWidget);

  $('end-session-btn')?.addEventListener('click', () => openModal('modal-confirm-end'));
  $('confirm-end-cancel')?.addEventListener('click', () => closeModal('modal-confirm-end'));
  $('confirm-end-confirm')?.addEventListener('click', () => { closeModal('modal-confirm-end'); triggerSessionEnd(false); });

  $('argue-other-side-btn')?.addEventListener('click', argueOtherSide);

  $('suggestions-toggle')?.addEventListener('click', () => {
    const list = $('suggestions-list');
    const isOpen = list?.classList.contains('open');
    list?.classList.toggle('open', !isOpen);
    $('suggestions-toggle')?.setAttribute('aria-expanded', String(!isOpen));
  });

  // Init new features
  initTerminologyBank();
  initQuoteBankPopup();
  initSynonymUpgrader();
  initVersionRestore();
  initQuoteTracker();
  initExaminerMode();
  initIntroCheck();
  initSentenceVarietyAnalyser();
  initSentenceStarterBank();
}

function handleTextSelection() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.toString().trim()) {
    $('ai-toolbar')?.classList.remove('visible');
    STATE.currentSelection = null;
    return;
  }
  const selectedText = selection.toString().trim();
  const range = selection.getRangeAt(0);
  const rect  = range.getBoundingClientRect();
  STATE.currentSelection = { text: selectedText, range };
  const toolbar = $('ai-toolbar');
  if (!toolbar) return;
  toolbar.classList.add('visible');
  toolbar.style.left = `${rect.left + window.scrollX + (rect.width / 2) - (toolbar.offsetWidth / 2)}px`;
  toolbar.style.top  = `${rect.top + window.scrollY - toolbar.offsetHeight - 8}px`;
}

/* ============================================================
   23. SKILLS PANEL
   ============================================================ */
function openSkillsPanel() {
  if (!STATE.currentSelection?.text) { showToast('Please highlight some text first.', 'error'); return; }
  const preview = $('selection-preview');
  if (preview) {
    preview.textContent = STATE.currentSelection.text.slice(0, 200) + (STATE.currentSelection.text.length > 200 ? '...' : '');
  }
  $('skills-list-literature').style.display = STATE.course === 'literature' ? '' : 'none';
  $('skills-list-english').style.display    = STATE.course === 'english'    ? '' : 'none';
  document.querySelectorAll('.skill-checkbox input').forEach(cb => cb.checked = false);
  $('ai-toolbar')?.classList.remove('visible');
  $('skills-panel')?.classList.add('open');
  $('skills-panel')?.setAttribute('aria-hidden', 'false');
}

function closeSkillsPanel() {
  $('skills-panel')?.classList.remove('open');
  $('skills-panel')?.setAttribute('aria-hidden', 'true');
}

// Confidence rating
function initConfidenceRating() {
  document.querySelectorAll('.confidence-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.confidence-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      STATE.confidence = btn.dataset.confidence;
    });
  });
}

async function handleSkillsAnalyse() {
  const checkedSkills = Array.from(document.querySelectorAll('.skill-checkbox input:checked')).map(cb => cb.value);
  if (!checkedSkills.length) { showToast('Please select at least one skill.', 'error'); return; }

  const selText = STATE.currentSelection?.text || '';
  if (selText.length > 400) { showToast('Selection too long — highlight a single sentence or clause.', 'error'); return; }
  if (selText.length < 10) { showToast('Please highlight at least a few words.', 'error'); return; }

  const btn = $('skills-analyse');
  setBtnLoading(btn, true);
  closeSkillsPanel();
  highlightSelectionLoading();

  try {
    await runAiWriterTwoCalls(selText, checkedSkills);
  } catch(err) {
    removeHighlightLoading();
    showToast(`AI Writer error: ${err.message}`, 'error');
  } finally {
    setBtnLoading(btn, false);
  }
}

/* ============================================================
   24. AI WRITER — TWO-CALL ARCHITECTURE
   ============================================================ */
async function runAiWriterTwoCalls(selectedText, skills) {
  const defs = STATE.course === 'literature' ? SKILL_FEEDBACK_PROMPTS.literature : SKILL_FEEDBACK_PROMPTS.english;
  const skillLabel = skills.map(s => defs[s]?.label || s).join(', ');

  // Call 1: rewrite only — fires immediately, streams into card
  const rewrite = await callGeminiRewrite(selectedText, skillLabel, STATE.confidence);
  removeHighlightLoading();
  displayInlineSuggestion(selectedText, rewrite, skillLabel);

  // Call 2: assessment — fires slightly after, streams into widget
  try {
    const essay    = $('writing-area')?.innerText || '';
    const assessment = await callGeminiAssessment(selectedText, rewrite, skillLabel, STATE.confidence, essay, STATE.currentQuestion);
    showFeedbackWidget(skillLabel, assessment);
  } catch(e) {
    // Assessment failure is non-critical — card already showing
  }
}

function displayInlineSuggestion(originalText, rewrite, skillLabel) {
  const overlay = $('suggestion-overlay');
  if (!overlay) return;
  overlay.querySelectorAll('.suggestion-card').forEach(c => c.remove());

  const card = document.createElement('div');
  card.className = 'suggestion-card';
  card.innerHTML = `
    <div class="suggestion-card-header">
      <span class="suggestion-card-skill">${escapeHtml(skillLabel)}</span>
      <button class="suggestion-card-x" aria-label="Close">✕</button>
    </div>
    <p class="suggestion-card-label">Suggested rewrite:</p>
    <p class="suggestion-card-new" id="sc-rewrite-text"></p>
    <div class="suggestion-card-actions">
      <button class="btn btn-accent btn-xs accept-btn" type="button">Accept</button>
      <button class="btn btn-ghost btn-xs dismiss-btn" type="button">Dismiss</button>
    </div>`;

  // Position above selection
  const CARD_W = 340, CARD_H = 180, PAD = 12;
  const sel = STATE.currentSelection?.range;
  card.style.width = `${CARD_W}px`;
  if (sel) {
    const rect = sel.getBoundingClientRect();
    let top  = rect.top - CARD_H - PAD;
    let left = rect.left + (rect.width / 2) - (CARD_W / 2);
    if (top < PAD) top = rect.bottom + PAD;
    left = Math.max(PAD, Math.min(left, window.innerWidth - CARD_W - PAD));
    top  = Math.max(PAD, Math.min(top,  window.innerHeight - CARD_H - 80));
    card.style.top  = `${top}px`;
    card.style.left = `${left}px`;
  } else {
    card.style.bottom = '160px'; card.style.right = '24px';
    card.style.top = 'auto'; card.style.left = 'auto';
  }

  const closeCard = () => { card.remove(); hideFeedbackWidget(); };
  card.querySelector('.suggestion-card-x')?.addEventListener('click', closeCard);
  card.querySelector('.dismiss-btn')?.addEventListener('click', closeCard);
  card.querySelector('.accept-btn')?.addEventListener('click', () => {
    replaceSelectedText(rewrite); closeCard();
    showToast('Suggestion accepted.', 'success');
  });

  overlay.appendChild(card);
  const rewriteEl = card.querySelector('#sc-rewrite-text');
  if (rewriteEl) streamText(rewriteEl, rewrite, 32);

  // Add feedback rating row to the card
  addFeedbackRating(card, skillLabel);
}

function replaceSelectedText(newText) {
  if (!STATE.currentSelection?.range) return;
  const range = STATE.currentSelection.range;
  range.deleteContents();
  range.insertNode(document.createTextNode(newText));
  updateWordCount(); saveDraft();
  STATE.currentSelection = null;
}

/* ============================================================
   25. ARGUE THE OTHER SIDE
   ============================================================ */
async function argueOtherSide() {
  const btn = $('argue-other-side-btn');
  setBtnLoading(btn, true);

  const essay = $('writing-area')?.innerText || '';
  // Take last paragraph
  const paras = essay.split(/\n+/).filter(p => p.trim().length > 30);
  const lastPara = paras[paras.length - 1] || essay.slice(-400);

  if (!lastPara.trim()) {
    showToast('Write at least one paragraph first.', 'error');
    setBtnLoading(btn, false);
    return;
  }

  const prompt = `A student has written the following analytical paragraph in a WACE ${STATE.course === 'literature' ? 'English Literature ATAR' : 'English ATAR'} essay:

"${lastPara.slice(0, 400)}"

In ONE sentence only, articulate the strongest counter-argument or alternative reading that challenges their analytical claim. 
Be specific to what they've written. Return ONLY the counter-argument sentence — no label, no preamble.`;

  try {
    const result = await callGemini(prompt, null, 150);

    // Show in a floating card
    let existingCard = $('argue-result-card');
    if (existingCard) existingCard.remove();

    const card = document.createElement('div');
    card.className = 'argue-result-card visible';
    card.id = 'argue-result-card';
    card.innerHTML = `
      <span class="argue-result-label">Counter-argument</span>
      <p class="argue-result-text" id="argue-text"></p>
      <button class="argue-result-close" type="button">Close ✕</button>`;
    document.body.appendChild(card);
    card.querySelector('.argue-result-close')?.addEventListener('click', () => card.remove());
    setTimeout(() => { if (card.parentNode) card.remove(); }, 12000);

    const textEl = $('argue-text');
    if (textEl) streamText(textEl, result, 30);
  } catch(err) {
    showToast(`Counter-argument failed: ${err.message}`, 'error');
  } finally {
    setBtnLoading(btn, false);
  }
}

/* ============================================================
   26. FREE WRITING AUTO-REVIEW
   ============================================================ */
function startFreeWritingReview() {
  clearInterval(STATE.reviewInterval);
  const tray = $('suggestions-tray');
  STATE.reviewInterval = setInterval(async () => {
    const essay = $('writing-area')?.innerText?.trim();
    if (!essay || essay.length < 100) return;
    const indicator = $('ai-review-indicator'), label = $('ai-review-label');
    if (indicator) indicator.style.display = 'flex';
    if (label) label.textContent = 'AI reviewing...';
    tray?.classList.add('visible');
    try { await runFreeWritingReview(essay); }
    catch(err) { if (label) label.textContent = 'Review unavailable'; }
  }, APP_CONFIG.free_writing_review_interval_ms);
}

async function runFreeWritingReview(essay) {
  const criteria = STATE.course === 'literature'
    ? LITERATURE_MARKING_KEY.criteria.map(c => c.name).join(', ')
    : ENGLISH_MARKING_KEY.criteria.map(c => c.name).join(', ');
  const concepts = STATE.course === 'literature'
    ? LITERATURE_SYLLABUS_CONCEPTS.slice(0, 6).map(c => c.concept).join(', ')
    : ENGLISH_SYLLABUS_CONCEPTS.shared.map(c => c.concept).join(', ');
  const goalCtx = STATE.sessionGoal
    ? `The student's session focus is: ${STATE.sessionGoal}. Pay particular attention to this criterion.`
    : '';

  const prompt = `${GEMINI_PROMPTS.free_writing_review}
COURSE: ${STATE.course === 'literature' ? 'English Literature ATAR' : 'English ATAR'}
${STATE.course === 'literature' ? `TEXT: "${STATE.textTitle}" by ${STATE.textAuthor}` : `SECTION: ${STATE.section || 'general'}`}
MARKING CRITERIA: ${criteria}
SYLLABUS CONCEPTS: ${concepts}
${goalCtx}

CURRENT DRAFT:
${essay}

Provide exactly 3 paragraph-level improvement suggestions now.`;

  const result = await callGemini(prompt, null, 800);
  parseAndDisplayReviewSuggestions(result);
}

function parseAndDisplayReviewSuggestions(text) {
  const list = $('suggestions-list'), count = $('suggestions-count'), label = $('ai-review-label');
  if (!list) return;
  list.innerHTML = '';
  const blocks = text.split(/\n(?=PARAGRAPH:)/i);
  let parsed = 0;

  blocks.forEach((block, idx) => {
    if (parsed >= 3) return;
    const skillMatch    = block.match(/SKILL:\s*([\s\S]*?)(?=ORIGINAL:|$)/i);
    const originalMatch = block.match(/ORIGINAL:\s*([\s\S]*?)(?=IMPROVED:|$)/i);
    const improvedMatch = block.match(/IMPROVED:\s*([\s\S]*?)(?=WHY:|$)/i);
    const whyMatch      = block.match(/WHY:\s*([\s\S]*?)$/i);
    const improved = improvedMatch?.[1]?.trim() || '';
    if (!improved) return;

    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.style.animationDelay = `${idx * 80}ms`;
    item.innerHTML = `
      <span class="suggestion-skill-tag">${escapeHtml(skillMatch?.[1]?.trim() || 'Writing')}</span>
      ${originalMatch?.[1]?.trim() ? `<p class="suggestion-original">${escapeHtml(originalMatch[1].trim())}</p>` : ''}
      <p class="suggestion-new">${escapeHtml(improved)}</p>
      ${whyMatch?.[1]?.trim() ? `<p class="suggestion-why">${escapeHtml(whyMatch[1].trim())}</p>` : ''}
      <div class="suggestion-actions">
        <button class="btn btn-accent btn-xs" data-action="accept">Accept</button>
        <button class="btn btn-ghost btn-xs" data-action="skip">Skip</button>
      </div>`;

    item.querySelector('[data-action="accept"]')?.addEventListener('click', () => {
      const orig = originalMatch?.[1]?.trim();
      if (orig) replaceTextInEditor(orig, improved);
      item.remove(); updateSuggestionCount();
    });
    item.querySelector('[data-action="skip"]')?.addEventListener('click', () => {
      item.remove(); updateSuggestionCount();
    });
    list.appendChild(item);
    parsed++;
  });

  if (count) count.textContent = `${parsed} suggestion${parsed !== 1 ? 's' : ''} available`;
  if (label) label.textContent = 'Review complete';
  if (parsed > 0) { list.classList.add('open'); $('suggestions-toggle')?.setAttribute('aria-expanded', 'true'); }
  updateSuggestionCount();
}

function updateSuggestionCount() {
  const remaining = $('suggestions-list')?.children.length || 0;
  const count = $('suggestions-count');
  if (count) count.textContent = `${remaining} suggestion${remaining !== 1 ? 's' : ''} available`;
}

function replaceTextInEditor(original, replacement) {
  const area = $('writing-area');
  if (!area) return;
  const escaped = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  area.innerHTML = area.innerHTML.replace(new RegExp(escaped, 'i'), replacement);
  updateWordCount(); saveDraft();
}

/* ============================================================
   27. SESSION END
   ============================================================ */
function triggerSessionEnd(timerExpired = false) {
  if (STATE.sessionEnded) return;
  STATE.sessionEnded = true;
  clearInterval(STATE.timerInterval);
  clearInterval(STATE.autosaveInterval);
  clearInterval(STATE.reviewInterval);
  clearInterval(STATE.readingTimeInterval);
  stopVersionHistory();
  saveDraft();

  const elapsed = STATE.mode === 'freewrite' ? STATE.stopwatchSeconds : STATE.timerDuration * 60 - STATE.timerSeconds;
  const words   = getWordCount($('writing-area')?.innerText || '');

  $('end-word-count').textContent = words.toLocaleString();
  $('end-time-taken').textContent = formatTime(elapsed);

  // Store try-again data
  if (STATE.mode !== 'freewrite' && STATE.currentQuestion) {
    STATE.tryAgainData = { question: STATE.currentQuestion, timerDuration: STATE.timerDuration, mode: STATE.mode };
    const tryAgainBtn = $('try-again-btn');
    if (tryAgainBtn) tryAgainBtn.style.display = '';
  }

  showScreen('screen-end');
  initEndScreen();
  tourTrigger('end_screen');
  if (timerExpired) showToast("Time's up! Great work.", 'info');
}

function initEndScreen() {
  $('mark-response-btn')?.addEventListener('click', startMarking, { once: true });
  $('download-exit-btn')?.addEventListener('click', downloadAndExit);
  $('new-session-btn')?.addEventListener('click', resetToStart);
  $('try-again-btn')?.addEventListener('click', handleTryAgain);
}

/* ============================================================
   28. TRY AGAIN
   ============================================================ */
function handleTryAgain() {
  if (!STATE.tryAgainData) return;
  const { question, timerDuration, mode } = STATE.tryAgainData;

  // Reset writing but keep question + settings
  clearInterval(STATE.timerInterval);
  clearInterval(STATE.autosaveInterval);
  STATE.sessionEnded = false;
  STATE.questionLocked = true;

  const area = $('writing-area');
  if (area) area.innerText = '';

  updateEditorBadges();
  showScreen('screen-editor');

  $('question-header')?.classList.add('visible');
  const textEl = $('question-text'), contentEl = $('question-content'), genEl = $('question-generating');
  if (genEl) genEl.style.display = 'none';
  if (contentEl) contentEl.classList.add('visible');
  if (textEl) textEl.textContent = question;
  $('question-actions')?.classList.add('locked');

  initCountdown(timerDuration * 60);
  startAutosave();
  initEditorEvents();
  updateWordCount();
  initComplexityAnalyser();

  showToast('Same question — fresh start. Good luck.', 'info');
}

/* ============================================================
   29. MARKING + JSON PARSING
   ============================================================ */
async function startMarking() {
  showScreen('screen-results');
  const generating = $('results-generating'), scoreBlock = $('results-score-block');
  if (generating) generating.classList.add('visible');
  if (scoreBlock) scoreBlock.classList.remove('visible');
  const essay = loadDraft() || $('writing-area')?.innerText || '';
  const markingKey = STATE.course === 'literature' ? buildLiteratureMarkingKeyText() : buildEnglishMarkingKeyText();
  const exemplarText = STATE.course === 'literature'
    ? LITERATURE_EXEMPLARS.map(e => `EXEMPLAR: ${e.high_band_features?.join('; ')}`).join('\n')
    : buildEnglishExemplarText();

  const argMapCtx = STATE.argumentMap
    ? `STUDENT'S ARGUMENT MAP:\nContention: ${STATE.argumentMap.contention}\nP1: ${STATE.argumentMap.p1}\nP2: ${STATE.argumentMap.p2}\nP3: ${STATE.argumentMap.p3}\n`
    : '';

  const goalCtx = STATE.sessionGoal
    ? `SESSION FOCUS: The student was focusing on improving "${STATE.sessionGoal}" — pay particular attention to this criterion in your comments.`
    : '';

  const prompt = `${GEMINI_PROMPTS.marking_base}

COURSE: ${STATE.course === 'literature' ? 'English Literature ATAR' : 'English ATAR'}
${STATE.course === 'literature' ? `TEXT: "${STATE.textTitle}" by ${STATE.textAuthor}` : `SECTION: ${capitalize(STATE.section || 'responding')}`}
QUESTION: ${STATE.currentQuestion || 'Free writing'}
${argMapCtx}
${goalCtx}

${STATE.course === 'literature' ? `QUOTE BANK:\n${STATE.quoteBank.map(q => `"${q.text}"`).join('\n')}` : ''}

MARKING KEY:
${markingKey}

HIGH BAND FEATURES:
${exemplarText}

STUDENT RESPONSE:
${essay}

Return marking as JSON — no line breaks inside string values, max 200 chars per comment field:
{
  "total_score": <number>,
  "total_max": <number>,
  "descriptor_level": "<string>",
  "criteria": [{"name":"<string>","score":<number>,"max":<number>,"descriptor":"<string>","comment":"<string max 200 chars>","evidence":"<string max 100 chars>"}],
  "examiner_comment": "<string max 300 chars>",
  "key_improvement": "<string max 150 chars>"
}
Return ONLY the JSON object.`;

  try {
    const raw = await callGemini(prompt, null, 4096);
    const data = parseMarkingJSON(raw);
    STATE.markedData = data;
    renderMarkingResults(data);
    saveSessionToHistory(data, essay);
  } catch(err) {
    if (generating) generating.innerHTML = `<span style="color:var(--danger)">Marking failed: ${err.message}. Please try again.</span>`;
  }
}

function parseMarkingJSON(raw) {
  let text = raw.replace(/```json/gi,'').replace(/```/g,'').trim();
  const start = text.indexOf('{'), end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON found in response.');
  text = text.slice(start, end + 1);
  try { return JSON.parse(text); }
  catch(e1) {
    text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    text = text.replace(/"((?:[^"\\]|\\.)*)"/g, (match, inner) => {
      return `"${inner.replace(/\n/g,'\\n').replace(/\r/g,'\\r').replace(/\t/g,'\\t')}"`;
    });
    try { return JSON.parse(text); }
    catch(e2) { return extractMarkingDataManually(raw); }
  }
}

function extractMarkingDataManually(raw) {
  const totalMatch = raw.match(/"total_score"\s*:\s*(\d+)/);
  const maxMatch   = raw.match(/"total_max"\s*:\s*(\d+)/);
  const descMatch  = raw.match(/"descriptor_level"\s*:\s*"([^"]+)"/);
  const examMatch  = raw.match(/"examiner_comment"\s*:\s*"([^"]{0,400})"/);
  const impMatch   = raw.match(/"key_improvement"\s*:\s*"([^"]+)"/);
  return {
    total_score: parseInt(totalMatch?.[1] || '0'),
    total_max:   parseInt(maxMatch?.[1]   || String(STATE.course === 'literature' ? 30 : 40)),
    descriptor_level: descMatch?.[1] || 'Unable to determine',
    criteria: [],
    examiner_comment: examMatch?.[1] || 'Unable to parse full marking. Please try again.',
    key_improvement: impMatch?.[1] || 'Re-run marking for full feedback.'
  };
}

function buildLiteratureMarkingKeyText() {
  return LITERATURE_MARKING_KEY.criteria.map(c =>
    `CRITERION: ${c.name} (/${c.max_marks})\n` + c.descriptors.map(d => `  ${d.marks}: ${d.description}`).join('\n')
  ).join('\n\n');
}

function buildEnglishMarkingKeyText() {
  return ENGLISH_MARKING_KEY.criteria.map(c =>
    `CRITERION: ${c.name} (/${c.max_marks})\n` + c.descriptors.map(d => `  ${d.marks}: ${d.description}`).join('\n')
  ).join('\n\n');
}

function buildEnglishExemplarText() {
  return [...ENGLISH_EXEMPLARS.responding, ...ENGLISH_EXEMPLARS.composing]
    .map(e => `${e.title} (~${e.approximate_mark}): ${e.high_band_features?.join('; ')}`).join('\n');
}

function renderMarkingResults(data) {
  const generating = $('results-generating'), scoreBlock = $('results-score-block');
  if (generating) generating.classList.remove('visible');

  $('results-score-value').textContent = data.total_score ?? '—';
  $('results-score-denom').textContent = `/ ${data.total_max ?? (STATE.course === 'literature' ? 30 : 40)}`;
  $('results-descriptor-badge').textContent = data.descriptor_level || '—';
  $('results-course-label').textContent = STATE.course === 'literature' ? 'Literature ATAR' : 'English ATAR';
  $('results-task-label').textContent = STATE.mode === 'practice' ? 'Practice Question' : capitalize(STATE.mode || 'Practice');

  const badge = $('results-descriptor-badge');
  if (badge && data.descriptor_level) {
    const lv = data.descriptor_level.toLowerCase();
    if (lv.includes('excellent') || lv.includes('sophisticated') || lv.includes('high'))
      Object.assign(badge.style, { background:'var(--sage-pale)', color:'var(--sage)', borderColor:'var(--sage)' });
    else if (lv.includes('proficient') || lv.includes('comprehensive') || lv.includes('discerning'))
      Object.assign(badge.style, { background:'var(--accent-pale)', color:'var(--accent)', borderColor:'var(--accent)' });
    else
      Object.assign(badge.style, { background:'var(--bg-sunken)', color:'var(--ink-muted)', borderColor:'var(--ink-rule)' });
  }

  if (scoreBlock) scoreBlock.classList.add('visible');

  const criteriaList = $('criteria-list');
  if (criteriaList && data.criteria) {
    criteriaList.innerHTML = '';
    data.criteria.forEach(c => {
      const details = document.createElement('details');
      details.className = 'criterion-card';
      details.innerHTML = `
        <summary class="criterion-card-summary">
          <div class="criterion-summary-left">
            <span class="criterion-name">${escapeHtml(c.name)}</span>
            <span class="criterion-descriptor">${escapeHtml(c.descriptor || '')}</span>
          </div>
          <div class="criterion-summary-right">
            <span class="criterion-score">${c.score} / ${c.max}</span>
            <svg class="icon icon-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </summary>
        <div class="criterion-card-body">
          <p class="criterion-comment">${escapeHtml(c.comment || '')}</p>
          ${c.evidence ? `<blockquote class="criterion-evidence">${escapeHtml(c.evidence)}</blockquote>` : ''}
          <button class="btn btn-ghost btn-xs criterion-rewrite-btn" data-criterion="${escapeHtml(c.name)}" data-comment="${escapeHtml(c.comment||'')}" type="button" style="margin-top:8px;">
            Help me improve this criterion →
          </button>
        </div>`;
      criteriaList.appendChild(details);
    });

    // Wire up criterion rewrite buttons
    criteriaList.querySelectorAll('.criterion-rewrite-btn').forEach(btn => {
      btn.addEventListener('click', () => handleCriterionRewrite(btn.dataset.criterion, btn.dataset.comment));
    });
  }

  const examinerEl = $('examiner-comment');
  if (examinerEl) examinerEl.textContent = data.examiner_comment || '';

  if (data.key_improvement) {
    const overall = $('results-overall');
    if (overall) {
      const note = document.createElement('div');
      note.style.cssText = 'background:var(--bg-warm);border:var(--border-card);border-radius:var(--r-lg);padding:var(--space-4);margin-top:var(--space-4);font-size:0.875rem;color:var(--ink-soft);';
      note.innerHTML = `<strong style="color:var(--accent)">Key improvement:</strong> ${escapeHtml(data.key_improvement)}`;
      overall.appendChild(note);
    }
  }

  $('topband-generate-btn')?.addEventListener('click', generateTopBandExample, { once: true });

  // Vocab report
  const essay = loadDraft() || '';
  if (essay.trim()) buildVocabReport(essay);

  const tryAgainBtn = $('results-try-again-btn');
  if (tryAgainBtn && STATE.tryAgainData) tryAgainBtn.style.display = '';

  $('results-download-btn')?.addEventListener('click', () => downloadMarkingReport(data));
  $('results-print-btn')?.addEventListener('click', () => window.print());
  $('results-try-again-btn')?.addEventListener('click', handleTryAgain);
  $('results-new-session-btn')?.addEventListener('click', resetToStart);

  // Tour: results screen
  tourTrigger('results');
  // Final tour step — complete after a short read delay
  setTimeout(() => tourTrigger('tour_complete'), 6000);
}

/* ============================================================
   30. CRITERION-SPECIFIC REWRITE
   ============================================================ */
async function handleCriterionRewrite(criterionName, examinerComment) {
  const essay = loadDraft() || '';
  const question = STATE.currentQuestion || '';

  // Navigate back to editor
  showScreen('screen-editor');
  showToast(`Highlight the section you want to improve for "${criterionName}", then use Get AI Help.`, 'info');

  // Pre-set the session goal to this criterion
  const skillMap = {
    'Engagement with the question': 'engagement',
    'Course concepts': 'syllabus_concepts',
    'Use of evidence': 'textual_evidence',
    'Linguistic, stylistic and critical terminology': 'terminology',
    'Expression of ideas': 'expression',
    'Understanding of syllabus concepts': 'syllabus_concepts',
    'Textual knowledge and evidence': 'textual_evidence',
    'Expression and structure': 'expression_eng'
  };

  const matchedSkill = Object.entries(skillMap).find(([k]) => criterionName.toLowerCase().includes(k.toLowerCase().slice(0, 15)));
  if (matchedSkill) {
    STATE.sessionGoal = matchedSkill[1];
    // Pre-check the relevant skill in the panel
    const checkboxes = document.querySelectorAll('.skill-checkbox input');
    checkboxes.forEach(cb => { cb.checked = cb.value === matchedSkill[1]; });
  }

  // Show examiner feedback as bottom widget prompt
  if (examinerComment) {
    setTimeout(() => showFeedbackWidget(criterionName, `Examiner noted: ${examinerComment}`), 600);
  }

  // Resume timer if there are seconds left
  if (STATE.timerSeconds > 0) {
    initCountdown(STATE.timerSeconds);
  }
}

/* ============================================================
   31. TOP-BAND EXAMPLE
   ============================================================ */
async function generateTopBandExample() {
  const promptWrap = $('topband-prompt-wrap'), content = $('topband-content');
  const generating = $('topband-generating'), textEl = $('topband-text'), annotations = $('topband-annotations');
  if (promptWrap) promptWrap.style.display = 'none';
  if (content) content.classList.add('visible');
  if (generating) generating.classList.add('visible');

  const concepts = STATE.course === 'literature'
    ? LITERATURE_SYLLABUS_CONCEPTS.slice(0, 6).map(c => c.concept).join(', ')
    : ENGLISH_SYLLABUS_CONCEPTS.shared.map(c => c.concept).join(', ');

  const prompt = `${GEMINI_PROMPTS.top_band_example}
COURSE: ${STATE.course === 'literature' ? 'English Literature ATAR' : 'English ATAR'}
${STATE.course === 'literature' ? `TEXT: "${STATE.textTitle}" by ${STATE.textAuthor}` : `SECTION: ${STATE.section || 'responding'}`}
QUESTION: ${STATE.currentQuestion || 'General practice'}
KEY CONCEPTS: ${concepts}

Format:
PARAGRAPH:
[model paragraph]

ANNOTATION 1: [top-band technique 1]
ANNOTATION 2: [top-band technique 2]
ANNOTATION 3: [top-band technique 3]`;

  try {
    const result = await callGemini(prompt, null, 800);
    const paraMatch = result.match(/PARAGRAPH:\s*([\s\S]*?)(?=ANNOTATION 1:|$)/i);
    const ann1 = result.match(/ANNOTATION 1:\s*([\s\S]*?)(?=ANNOTATION 2:|$)/i);
    const ann2 = result.match(/ANNOTATION 2:\s*([\s\S]*?)(?=ANNOTATION 3:|$)/i);
    const ann3 = result.match(/ANNOTATION 3:\s*([\s\S]*?)$/i);
    const para = paraMatch?.[1]?.trim() || result;
    const anns = [ann1?.[1]?.trim(), ann2?.[1]?.trim(), ann3?.[1]?.trim()].filter(Boolean);

    if (generating) generating.classList.remove('visible');
    if (textEl) textEl.textContent = para;
    if (annotations) {
      annotations.innerHTML = anns.map((a, i) => `
        <div class="topband-annotation">
          <span class="topband-annotation-marker">${i+1}</span>
          <span>${escapeHtml(a)}</span>
        </div>`).join('');
    }
  } catch(err) {
    if (generating) generating.innerHTML = `<span style="color:var(--danger)">Error: ${err.message}</span>`;
  }
}

/* ============================================================
   32. SESSION HISTORY + MARK TRAJECTORY
   ============================================================ */
function saveSessionToHistory(data, essay) {
  try {
    const history = JSON.parse(localStorage.getItem('scriptsense_history') || '[]');
    history.unshift({
      date: new Date().toLocaleDateString('en-AU'),
      course: STATE.course,
      mode: STATE.mode,
      question: STATE.currentQuestion?.slice(0, 80) || '',
      total_score: data.total_score,
      total_max: data.total_max,
      descriptor_level: data.descriptor_level,
      word_count: getWordCount(essay),
      criteria_scores: (data.criteria || []).map(c => ({ name: c.name, score: c.score, max: c.max }))
    });
    // Keep only last 20 sessions
    localStorage.setItem('scriptsense_history', JSON.stringify(history.slice(0, 20)));
  } catch(e) {}
}

function loadSessionHistory() {
  try {
    const raw = localStorage.getItem('scriptsense_history');
    return raw ? JSON.parse(raw) : [];
  } catch(e) { return []; }
}

function renderSessionHistory() {
  const history = loadSessionHistory();
  const section = $('session-history-section');
  const list    = $('session-history-list');
  if (!section || !list || history.length === 0) return;

  section.style.display = '';
  list.innerHTML = history.slice(0, 5).map(s => `
    <div class="history-card">
      <div class="history-score">${s.total_score}/${s.total_max}</div>
      <div class="history-info">
        <div class="history-course">${s.course === 'literature' ? 'Literature ATAR' : 'English ATAR'} · ${s.mode || 'practice'}</div>
        <div class="history-question">${escapeHtml(s.question || 'Free writing session')}</div>
        <div class="history-date">${s.date} · ${s.word_count} words</div>
      </div>
      <div class="history-descriptor">${escapeHtml(s.descriptor_level?.split(' ')[0] || '—')}</div>
    </div>`).join('');

  // Mark trajectory chart if 3+ sessions with marks
  const scored = history.filter(s => s.total_score !== undefined && s.total_max > 0);
  if (scored.length >= 3) {
    const wrap = $('mark-trajectory-wrap');
    if (wrap) { wrap.style.display = ''; renderMarkTrajectoryChart(scored.slice(0, 10).reverse()); }
  }
}

function renderMarkTrajectoryChart(sessions) {
  const canvas = $('mark-trajectory-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 400;
  const H = 60;
  canvas.width  = W;
  canvas.height = H;

  const pcts = sessions.map(s => s.total_score / s.total_max);
  const pad  = 20;
  const plotW = W - pad * 2;
  const plotH = H - 16;

  ctx.clearRect(0, 0, W, H);

  // Background line
  ctx.strokeStyle = '#ddd0b8';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(pad, H / 2);
  ctx.lineTo(W - pad, H / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Data line
  ctx.strokeStyle = '#5c8c6a';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pcts.forEach((pct, i) => {
    const x = pad + (i / (pcts.length - 1)) * plotW;
    const y = plotH - pct * plotH + 8;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Dots
  pcts.forEach((pct, i) => {
    const x = pad + (i / (pcts.length - 1)) * plotW;
    const y = plotH - pct * plotH + 8;
    ctx.fillStyle = '#5c8c6a';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

/* ============================================================
   33. DOWNLOAD + PRINT
   ============================================================ */
function downloadResponse() {
  const content = $('writing-area')?.innerText || loadDraft() || '';
  downloadText(content, `ScriptSense_${STATE.course}_${STATE.mode}_${new Date().toLocaleDateString('en-AU').replace(/\//g,'-')}.txt`);
}

function downloadMarkingReport(data) {
  const essay = loadDraft() || '';
  const lines = [
    'SCRIPTSENSE — MARKING REPORT',
    `Generated: ${new Date().toLocaleString('en-AU')}`,
    `Course: ${STATE.course === 'literature' ? 'English Literature ATAR' : 'English ATAR'}`,
    `Mode: ${STATE.mode}`,
    `Question: ${STATE.currentQuestion || 'N/A'}`,
    '',
    `TOTAL MARK: ${data.total_score} / ${data.total_max}`,
    `DESCRIPTOR: ${data.descriptor_level}`,
    '',
    '─────────────────────────────────────',
    'CRITERION BY CRITERION',
    '─────────────────────────────────────',
    ...(data.criteria || []).flatMap(c => [`${c.name}: ${c.score}/${c.max} — ${c.descriptor}`, c.comment, c.evidence ? `Evidence: "${c.evidence}"` : '', '']),
    '─────────────────────────────────────',
    "EXAMINER'S COMMENT",
    '─────────────────────────────────────',
    data.examiner_comment || '',
    '',
    data.key_improvement ? `KEY IMPROVEMENT: ${data.key_improvement}` : '',
    '',
    '─────────────────────────────────────',
    'STUDENT RESPONSE',
    '─────────────────────────────────────',
    essay
  ];
  downloadText(lines.join('\n'), `ScriptSense_Report_${new Date().toLocaleDateString('en-AU').replace(/\//g,'-')}.txt`);
}

function downloadText(content, filename) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  showToast('File downloaded.', 'success');
}

function downloadAndExit() { downloadResponse(); setTimeout(resetToStart, 800); }

/* ============================================================
   34. RESET
   ============================================================ */
function resetToStart() {
  clearInterval(STATE.timerInterval);
  clearInterval(STATE.autosaveInterval);
  clearInterval(STATE.reviewInterval);
  clearInterval(STATE.readingTimeInterval);
  stopVersionHistory();

  const key = STATE.apiKey;
  Object.keys(STATE).forEach(k => STATE[k] = null);
  STATE.apiKey = key;
  STATE.quoteBank = [];
  STATE.timerSeconds = 0;
  STATE.stopwatchSeconds = 0;
  STATE.confidence = 'high';
  STATE.readingTimeEnabled = false;
  STATE.customQuestion = null;
  STATE.examinerMode   = false;

  const area = $('writing-area');
  if (area) area.innerText = '';
  const overlay = $('suggestion-overlay');
  if (overlay) overlay.innerHTML = '';
  const argueCard = $('argue-result-card');
  if (argueCard) argueCard.remove();
  const suggList = $('suggestions-list');
  if (suggList) suggList.innerHTML = '';
  const mapTab = document.querySelector('.mapper-tab');
  if (mapTab) mapTab.remove();

  closeModal('modal-text-setup');
  closeModal('modal-confirm-end');
  $('skills-panel')?.classList.remove('open');
  $('terminology-drawer')?.classList.remove('open');
  $('starters-drawer')?.classList.remove('open');
  $('quote-bank-popup')?.classList.remove('open');
  $('argument-mapper')?.classList.remove('visible');
  $('reading-time-overlay')?.classList.remove('visible');
  hideFeedbackWidget();

  // Reset results UI
  if ($('criteria-list')) $('criteria-list').innerHTML = '';
  if ($('examiner-comment')) $('examiner-comment').textContent = '';
  if ($('topband-text')) $('topband-text').textContent = '';
  if ($('topband-annotations')) $('topband-annotations').innerHTML = '';
  $('topband-content')?.classList.remove('visible');
  if ($('topband-prompt-wrap')) $('topband-prompt-wrap').style.display = '';
  $('results-score-block')?.classList.remove('visible');
  $('results-generating')?.classList.remove('visible');

  // Reset question UI
  if ($('question-generating')) $('question-generating').style.display = 'flex';
  $('question-content')?.classList.remove('visible');
  $('question-actions')?.classList.remove('locked');
  if ($('question-text')) $('question-text').textContent = '';
  $('question-header')?.classList.remove('visible');
  $('stimulus-header')?.classList.remove('visible');
  if ($('complexity-gutter')) $('complexity-gutter').innerHTML = '';
  // Reset new feature UI
  $('synonym-popup')?.classList.remove('visible');
  const quoteTracker = $('quote-tracker');
  if (quoteTracker) quoteTracker.style.display = 'none';
  const versionWrap = $('version-restore-wrap');
  if (versionWrap) versionWrap.style.display = 'none';
  const timePressure = $('time-pressure-indicator');
  if (timePressure) timePressure.style.display = 'none';
  const vocabSection = $('results-vocab');
  if (vocabSection) vocabSection.style.display = 'none';
  // Remove pressure classes from writing area (area already declared above)
  $('writing-area')?.classList.remove('pressure-low', 'pressure-mid', 'pressure-high');
  // Reset examiner mode
  STATE.examinerMode = false;
  $('examiner-mode-toggle')?.classList.remove('active');
  $('skills-panel')?.classList.remove('examiner-active');
  // Hide sentence variety bar
  const svBar = $('sentence-variety-bar');
  if (svBar) svBar.style.display = 'none';
  // Hide intro check button
  const introBtn = $('intro-check-btn');
  if (introBtn) introBtn.style.display = 'none';

  showScreen('screen-course');
  renderSessionHistory();
}

/* ============================================================
   31. QUOTE USAGE TRACKER
   ============================================================ */
function initQuoteTracker() {
  if (STATE.course !== 'literature' || !STATE.quoteBank.length) return;
  const tracker = $('quote-tracker');
  if (tracker) tracker.style.display = 'flex';
  updateQuoteTracker();
}

function updateQuoteTracker() {
  if (STATE.course !== 'literature') return;
  const tracker  = $('quote-tracker');
  const trackTxt = $('quote-tracker-text');
  if (!tracker || !trackTxt) return;

  const essay = $('writing-area')?.innerText?.toLowerCase() || '';
  if (!essay || !STATE.quoteBank.length) return;

  const used = STATE.quoteBank.filter(q => {
    // Match first 20 chars of quote (enough to be distinctive, handles partial embeds)
    const snippet = q.text.toLowerCase().slice(0, 20).trim();
    return snippet.length > 4 && essay.includes(snippet);
  });

  const count = used.length;
  const total = STATE.quoteBank.length;
  trackTxt.textContent = `${count}/${total} quotes used`;
  tracker.className = 'quote-tracker' + (count === 0 && getWordCount(essay) > 150 ? ' warn' : count >= 2 ? ' good' : '');
}

/* ============================================================
   32. SYNONYM / REGISTER UPGRADER
   ============================================================ */
function initSynonymUpgrader() {
  const area    = $('writing-area');
  const popup   = $('synonym-popup');
  const closeBtn= $('synonym-popup-close');
  if (!area || !popup) return;

  area.addEventListener('dblclick', (e) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const word = sel.toString().trim().toLowerCase().replace(/[^a-z\s]/g, '');
    if (!word || word.length < 2) return;

    const synonyms = SYNONYM_BANK[word];
    if (!synonyms || !synonyms.length) return;

    // Position popup above the selection
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    const POPUP_W = 220, POPUP_H = 160, PAD = 8;
    let top  = rect.top - POPUP_H - PAD;
    let left = rect.left + rect.width / 2 - POPUP_W / 2;
    if (top < PAD) top = rect.bottom + PAD;
    left = Math.max(PAD, Math.min(left, window.innerWidth - POPUP_W - PAD));
    top  = Math.max(PAD, Math.min(top,  window.innerHeight - POPUP_H - PAD));

    popup.style.top  = `${top}px`;
    popup.style.left = `${left}px`;

    // Store selection range for replacement
    const range = sel.getRangeAt(0).cloneRange();

    // Build list
    const wordEl = $('synonym-popup-word');
    const listEl = $('synonym-list');
    if (wordEl) wordEl.textContent = word;
    if (listEl) {
      listEl.innerHTML = synonyms.map((s, i) => `
        <div class="synonym-item" data-idx="${i}">
          <span class="synonym-word">${escapeHtml(s.word)}</span>
          <span class="synonym-register">${escapeHtml(s.register)}</span>
        </div>`).join('');

      listEl.querySelectorAll('.synonym-item').forEach(item => {
        item.addEventListener('click', () => {
          const syn = synonyms[parseInt(item.dataset.idx)];
          if (syn) {
            // Restore and replace the selection
            sel.removeAllRanges();
            sel.addRange(range);
            range.deleteContents();
            range.insertNode(document.createTextNode(syn.word));
            popup.classList.remove('visible');
            updateWordCount(); saveDraft();
            showToast(`Replaced with "${syn.word}"`, 'success');
          }
        });
      });
    }

    popup.classList.add('visible');
    popup.setAttribute('aria-hidden', 'false');
    e.stopPropagation();
  });

  closeBtn?.addEventListener('click', () => {
    popup.classList.remove('visible');
    popup.setAttribute('aria-hidden', 'true');
  });

  // Close on click outside
  document.addEventListener('mousedown', (e) => {
    if (!popup.contains(e.target) && e.target !== area) {
      popup.classList.remove('visible');
    }
  });
}

/* ============================================================
   33. TIME PRESSURE SIMULATION
   ============================================================ */
function updateTimePressure() {
  if (STATE.mode === 'freewrite' || !STATE.timerDuration) return;
  const area      = $('writing-area');
  const indicator = $('time-pressure-indicator');
  const dot       = $('time-pressure-dot');
  const txt       = $('time-pressure-text');
  if (!area || !indicator) return;

  const totalSecs   = (STATE.timerDuration || 45) * 60;
  const remaining   = STATE.timerSeconds;
  const pctLeft     = remaining / totalSecs;

  // Remove all pressure classes
  area.classList.remove('pressure-low', 'pressure-mid', 'pressure-high');
  indicator.classList.remove('level-1', 'level-2');
  indicator.style.display = 'none';

  if (remaining <= 0) return;

  if (pctLeft <= 0.083) {
    // ≤5 min left — high pressure
    area.classList.add('pressure-high');
    indicator.style.display = 'flex';
    indicator.classList.add('level-2');
    if (txt) txt.textContent = 'Final push';
  } else if (pctLeft <= 0.167) {
    // ≤10 min left — medium pressure
    area.classList.add('pressure-mid');
    indicator.style.display = 'flex';
    indicator.classList.add('level-1');
    if (txt) txt.textContent = '10 min left';
  } else if (pctLeft <= 0.25) {
    // ≤25% left — low pressure
    area.classList.add('pressure-low');
  }
}

/* ============================================================
   34. VOCABULARY REPORT
   ============================================================ */
function buildVocabReport(essay) {
  const section = $('results-vocab');
  const body    = $('vocab-report-body');
  if (!section || !body || !essay) return;

  const words  = essay.toLowerCase();
  const issues = [];

  WEAK_WORDS.forEach(entry => {
    // Count occurrences (whole word match)
    const regex = new RegExp(`\\b${entry.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = (essay.match(regex) || []).length;
    if (matches >= 3 || (matches >= 2 && ['is','has','very','really','but','so','also'].includes(entry.word))) {
      issues.push({ word: entry.word, count: matches, alternatives: entry.alternatives });
    }
  });

  if (!issues.length) {
    section.style.display = '';
    body.innerHTML = `<div class="vocab-report-intro">No overused weak words detected. Vocabulary looks strong.</div>`;
    return;
  }

  section.style.display = '';
  const introText = `Found ${issues.length} word${issues.length !== 1 ? 's' : ''} used too frequently. Click an alternative to replace all instances.`;

  body.innerHTML = `
    <div class="vocab-report-intro">${escapeHtml(introText)}</div>
    <div class="vocab-weak-list" id="vocab-weak-list"></div>`;

  const list = body.querySelector('#vocab-weak-list');
  if (!list) return;

  issues.forEach(issue => {
    const row = document.createElement('div');
    row.className = 'vocab-weak-item';

    const alts = (issue.alternatives || []).map(alt =>
      `<span class="vocab-alt-chip" data-original="${escapeHtml(issue.word)}" data-replacement="${escapeHtml(alt)}">${escapeHtml(alt)}</span>`
    ).join('');

    row.innerHTML = `
      <span class="vocab-weak-word">${escapeHtml(issue.word)}</span>
      <span class="vocab-weak-count">×${issue.count}</span>
      <div class="vocab-weak-alternatives">${alts || '<span style="font-size:0.8rem;color:var(--ink-ghost)">Vary this word manually</span>'}</div>`;

    list.appendChild(row);
  });

  // Wire up replacement chips — replace FIRST instance in the draft
  body.querySelectorAll('.vocab-alt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const original    = chip.dataset.original;
      const replacement = chip.dataset.replacement;
      const area        = $('writing-area');
      if (!area || !original || !replacement) return;

      // Replace first occurrence only (user can click again for next)
      const regex = new RegExp(`\\b${original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      area.innerHTML = area.innerHTML.replace(regex, replacement);
      saveDraft();

      // Update count display
      const countEl = chip.closest('.vocab-weak-item')?.querySelector('.vocab-weak-count');
      const newCount = (area.innerText.match(new RegExp(`\\b${original}\\b`, 'gi')) || []).length;
      if (countEl) countEl.textContent = `×${newCount}`;
      if (newCount === 0) chip.closest('.vocab-weak-item')?.remove();

      showToast(`Replaced "${original}" → "${replacement}"`, 'success');
    });
  });
}

/* ============================================================
   36. SMART AUTOSAVE WITH VERSION HISTORY
   ============================================================ */
const VERSION_MAX = 3;
const VERSION_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let _versionInterval = null;

function startVersionHistory() {
  clearInterval(_versionInterval);
  _versionInterval = setInterval(saveVersion, VERSION_INTERVAL_MS);
}

function stopVersionHistory() {
  clearInterval(_versionInterval);
}

function saveVersion() {
  const content = $('writing-area')?.innerText || '';
  if (!content.trim()) return;
  const key  = `scriptsense_versions_${STATE.course}_${STATE.mode}`;
  try {
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.unshift({ ts: Date.now(), label: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), content });
    localStorage.setItem(key, JSON.stringify(existing.slice(0, VERSION_MAX)));
    updateVersionRestoreUI();
  } catch(e) {}
}

function loadVersions() {
  const key = `scriptsense_versions_${STATE.course}_${STATE.mode}`;
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch(e) { return []; }
}

function updateVersionRestoreUI() {
  const wrap   = $('version-restore-wrap');
  const select = $('version-select');
  if (!wrap || !select) return;

  const versions = loadVersions();
  if (!versions.length) { wrap.style.display = 'none'; return; }

  wrap.style.display = '';
  // Rebuild options
  select.innerHTML = '<option value="">Restore version...</option>' +
    versions.map((v, i) => `<option value="${i}">Version from ${escapeHtml(v.label)}</option>`).join('');
}

function initVersionRestore() {
  const select = $('version-select');
  if (!select) return;
  select.addEventListener('change', () => {
    const idx = parseInt(select.value, 10);
    if (isNaN(idx)) return;
    const versions = loadVersions();
    const v = versions[idx];
    if (!v) return;
    if (!confirm(`Restore version from ${v.label}? Your current text will be replaced.`)) {
      select.value = '';
      return;
    }
    const area = $('writing-area');
    if (area) area.innerText = v.content;
    updateWordCount();
    saveDraft();
    select.value = '';
    showToast(`Version from ${v.label} restored.`, 'success');
  });
}

/* ============================================================
   43. INTRODUCTION QUALITY CHECK
   ============================================================ */
function initIntroCheck() {
  const btn = $('intro-check-btn');
  if (!btn) return;

  // Show button once 80+ words written
  const observer = new MutationObserver(() => {
    const words = getWordCount($('writing-area')?.innerText || '');
    btn.style.display = words >= 80 ? '' : 'none';
  });
  const area = $('writing-area');
  if (area) observer.observe(area, { childList: true, subtree: true, characterData: true });

  btn.addEventListener('click', async () => {
    const area = $('writing-area');
    if (!area) return;

    // Grab first paragraph (up to first double newline or 600 chars)
    const full = area.innerText || '';
    const firstPara = full.split(/\n\n/)[0]?.slice(0, 600) || full.slice(0, 600);

    if (!firstPara.trim()) { showToast('Write your introduction first.', 'error'); return; }

    setBtnLoading(btn, true);
    try {
      const prompt = `You are a WACE ${STATE.course === 'literature' ? 'English Literature ATAR' : 'English ATAR'} examiner.
A student has written the following introduction:

"${firstPara}"

The question is: ${STATE.currentQuestion || '(no question — free writing)'}

Assess ONLY these three things, each on a new line:
TASK WORDS: [Y/N] — Does the introduction directly engage with the exact task words in the question? (one sentence explanation)
ARGUMENT DIRECTION: [Y/N] — Does it signal the direction of the student's argument? (one sentence explanation)
CONTEXT AWARENESS: [Y/N] — Does it demonstrate awareness of the text/context/author's purpose? (one sentence explanation)

Be blunt. Y only if clearly achieved.`;

      const result = await callGemini(prompt, null, 300);
      showFeedbackWidget('Introduction Check', result);
    } catch (err) {
      showToast(`Intro check failed: ${err.message}`, 'error');
    } finally {
      setBtnLoading(btn, false);
    }
  });
}

/* ============================================================
   44. SENTENCE VARIETY ANALYSER
   ============================================================ */
let _varietyTimeout = null;

function initSentenceVarietyAnalyser() {
  const area = $('writing-area');
  if (!area) return;
  area.addEventListener('input', () => {
    clearTimeout(_varietyTimeout);
    _varietyTimeout = setTimeout(() => runSentenceVarietyCheck(area.innerText), 1500);
  });
}

function runSentenceVarietyCheck(text) {
  const bar  = $('sentence-variety-bar');
  const msg  = $('sentence-variety-text');
  if (!bar || !msg) return;

  const sentences = text.match(/[^.!?]+[.!?]+/g)?.map(s => s.trim()) || [];
  if (sentences.length < 4) { bar.style.display = 'none'; return; }

  // Check 1: sentences starting with "The" or a proper noun (rough Subject-Verb-Object proxy)
  const svoStarters = sentences.filter(s => /^(The |It |He |She |They |This |That |García |Orwell|[A-Z][a-z]+\s)/.test(s));
  const svoPct = svoStarters.length / sentences.length;

  // Check 2: all sentences similar length (monotonous rhythm)
  const lengths = sentences.map(s => s.split(/\s+/).length);
  const avgLen  = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((acc, l) => acc + Math.pow(l - avgLen, 2), 0) / lengths.length;
  const isMonotonous = variance < 12 && sentences.length >= 5;

  bar.style.display = 'flex';

  if (svoPct > 0.6 && sentences.length >= 5) {
    bar.className = 'sentence-variety-bar';
    msg.textContent = `${Math.round(svoPct * 100)}% of sentences start the same way — try opening with a clause, quotation, or prepositional phrase.`;
  } else if (isMonotonous) {
    bar.className = 'sentence-variety-bar';
    msg.textContent = 'Sentences are similar in length — vary rhythm with short punchy claims and longer analytical sentences.';
  } else {
    bar.className = 'sentence-variety-bar ok';
    msg.textContent = 'Good sentence variety — openings and lengths are well mixed.';
    setTimeout(() => { bar.style.display = 'none'; }, 4000);
  }
}

/* ============================================================
   49. FEEDBACK RATING
   ============================================================ */
function addFeedbackRating(card, skillLabel) {
  const ratingRow = document.createElement('div');
  ratingRow.className = 'suggestion-card-rating';
  ratingRow.innerHTML = `
    <span class="suggestion-card-rating-label">Was this helpful?</span>
    <button class="rating-btn" data-rating="up" title="Helpful">👍</button>
    <button class="rating-btn" data-rating="down" title="Not helpful">👎</button>`;

  ratingRow.querySelectorAll('.rating-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      ratingRow.querySelectorAll('.rating-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      saveFeedbackRating(skillLabel, btn.dataset.rating === 'up');
      setTimeout(() => ratingRow.innerHTML = '<span class="suggestion-card-rating-label" style="color:rgba(255,255,255,0.4)">Thanks for the feedback</span>', 800);
    });
  });

  card.appendChild(ratingRow);
}

function saveFeedbackRating(skill, positive) {
  try {
    const key  = 'scriptsense_ratings';
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    if (!data[skill]) data[skill] = { up: 0, down: 0 };
    data[skill][positive ? 'up' : 'down']++;
    localStorage.setItem(key, JSON.stringify(data));
  } catch(e) {}
}

function getRatingAdjustment(skill) {
  // Returns a string to append to the prompt if a skill is consistently rated down
  try {
    const data = JSON.parse(localStorage.getItem('scriptsense_ratings') || '{}');
    const r = data[skill];
    if (!r) return '';
    const total = r.up + r.down;
    if (total >= 5 && r.down / total > 0.6) {
      return '\nIMPORTANT: Previous feedback on this skill has been rated unhelpful. Be MORE SPECIFIC — quote exact words from the student\'s text, avoid generic advice, give a concrete rewrite that differs meaningfully from the original.';
    }
    return '';
  } catch(e) { return ''; }
}

/* ============================================================
   50. EXAMINER VOICE MODE
   ============================================================ */
function initExaminerMode() {
  const toggle = $('examiner-mode-toggle');
  if (!toggle) return;
  STATE.examinerMode = false;

  toggle.addEventListener('click', () => {
    STATE.examinerMode = !STATE.examinerMode;
    toggle.classList.toggle('active', STATE.examinerMode);
    toggle.setAttribute('aria-pressed', String(STATE.examinerMode));
    $('skills-panel')?.classList.toggle('examiner-active', STATE.examinerMode);
    showToast(STATE.examinerMode ? 'Examiner voice on — brutal and direct.' : 'Back to coach mode.', 'info');
  });
}

function getExaminerModeInstruction() {
  if (!STATE.examinerMode) return '';
  return `\nVOICE MODE: EXAMINER — You are a WACE external examiner reading this script for the first time. Write exactly as you would write a marginal note on an exam script. No encouragement. No softening. Name the problem precisely and state what would need to change for a higher band. One line maximum per section.`;
}

/* ============================================================
   52. CUSTOM QUESTION INPUT
   ============================================================ */
function initCustomQuestionInput() {
  const toggleBtn = $('custom-question-toggle');
  const body      = $('custom-question-body');
  const useBtn    = $('custom-question-use-btn');
  const input     = $('custom-question-input');
  if (!toggleBtn || !body) return;

  toggleBtn.addEventListener('click', () => {
    const isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : '';
    toggleBtn.querySelector('.icon')?.style && (toggleBtn.querySelector('.icon').style.transform = isOpen ? '' : 'rotate(45deg)');
  });

  useBtn?.addEventListener('click', () => {
    const q = input?.value?.trim();
    if (!q) { showToast('Please enter a question first.', 'error'); return; }
    STATE.customQuestion = q;
    // Visual confirmation
    const icon = toggleBtn.querySelector('.icon');
    if (icon) icon.style.transform = '';
    body.style.display = 'none';
    toggleBtn.textContent = '';
    toggleBtn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--sage)"><polyline points="20 6 9 17 4 12"/></svg> Custom question set`;
    showToast('Custom question saved — select a mode to begin.', 'success');
  });
}

/* ============================================================
   54. WEEK SUMMARY
   ============================================================ */
function initWeekSummary() {
  $('week-summary-btn')?.addEventListener('click', generateWeekSummary);
  $('week-summary-close')?.addEventListener('click', () => closeModal('modal-week-summary'));
}

async function generateWeekSummary() {
  const history = loadSessionHistory();
  if (history.length < 2) {
    showToast('Complete at least 2 marked sessions first.', 'info');
    return;
  }

  openModal('modal-week-summary');
  $('week-summary-generating').style.display = 'flex';
  $('week-summary-content').style.display = 'none';

  // Filter to last 7 days
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = history.filter(s => {
    // Parse the au date string back
    const parts = (s.date || '').split('/');
    if (parts.length === 3) {
      const d = new Date(`${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`);
      return d.getTime() >= oneWeekAgo;
    }
    return true; // include if can't parse
  });

  const sessions = recent.length >= 2 ? recent : history.slice(0, 5);

  const sessionSummary = sessions.map((s, i) =>
    `Session ${i + 1} (${s.date}): ${s.course === 'literature' ? 'Literature ATAR' : 'English ATAR'} — ${s.total_score}/${s.total_max} (${s.descriptor_level || '?'}). Q: ${s.question?.slice(0, 60) || 'free writing'}...` +
    (s.criteria_scores?.length ? '\n  Criteria: ' + s.criteria_scores.map(c => `${c.name.split(' ')[0]}: ${c.score}/${c.max}`).join(', ') : '')
  ).join('\n\n');

  const prompt = `You are a WACE English teacher writing a brief weekly progress note for a Year 12 student.

Here are their recent ScriptSense practice sessions:

${sessionSummary}

Write a 3-4 sentence weekly summary that:
1. Identifies what is clearly improving (cite specific criteria scores)
2. Identifies what is stagnant or dropping (be honest and specific)
3. Recommends one concrete focus for next week's sessions

Write in a direct, supportive teacher register. No bullet points. Plain prose only. Do not pad with generic encouragement.`;

  try {
    const result = await callGemini(prompt, null, 400);
    $('week-summary-generating').style.display = 'none';
    $('week-summary-content').style.display = '';
    $('week-summary-text').textContent = result;
  } catch(err) {
    $('week-summary-generating').innerHTML = `<span style="color:var(--danger)">Could not generate summary: ${err.message}</span>`;
  }
}

/* ============================================================
   56. ONBOARDING WALKTHROUGH
   ============================================================ */
/* ============================================================
   56. CONTEXTUAL GUIDED TOUR
   Triggers at each real screen/action as the user navigates.
   ============================================================ */

const TOUR = {
  // Maps trigger keys → step config
  // Each step spotlights a real element and positions the card nearby
  steps: {
    api_key: {
      title: 'Step 1 — Enter your API key',
      body:  'ScriptSense uses <strong>Google\'s Gemini AI</strong> to generate questions, give feedback, and mark your writing. Paste your free Gemini key here. You can get one in 30 seconds at <strong>aistudio.google.com</strong>.',
      icon:  '🔑',
      target: '#gate-card',
      arrow: 'bottom',
      total: 10
    },
    course_select: {
      title: 'Step 2 — Choose your course',
      body:  '<strong>English Literature ATAR</strong> focuses on one studied text — ideology, discourse, and close reading. <strong>English ATAR</strong> covers composing, responding, and comprehending across different genres. Pick the one you\'re studying.',
      icon:  '📚',
      target: '.course-cards',
      arrow: 'top',
      total: 10
    },
    text_setup: {
      title: 'Your studied text',
      body:  'Tell ScriptSense what text you\'re studying. This lets the AI generate questions specific to your work and give feedback that references your text by name. <strong>Add quotes on the next step</strong> — they\'ll be available when writing.',
      icon:  '✍️',
      target: '#text-setup-step1',
      arrow: 'left',
      total: 10
    },
    mode_select: {
      title: 'Step 3 — Pick a mode',
      body:  '<strong>Practice Question</strong> gives you an AI exam question with a countdown. <strong>Free Writing</strong> is open-ended with a stopwatch. <strong>Scaffolded</strong> generates a full essay blueprint alongside the question. <strong>Intro Challenge</strong> is a focused 8-minute drill.',
      icon:  '🎯',
      target: '.mode-cards',
      arrow: 'top',
      total: 10
    },
    session_options: {
      title: 'Session settings',
      body:  'Set a <strong>session focus</strong> to target a specific marking criterion — the AI will pay extra attention to it. Toggle <strong>reading time</strong> to simulate exam conditions with 5 minutes to plan before writing starts.',
      icon:  '⚙️',
      target: '.mode-options-row',
      arrow: 'top',
      total: 10
    },
    timer_select: {
      title: 'Step 4 — Set your time',
      body:  'Choose the same duration as your exam — <strong>45 minutes</strong> is standard for most WACE tasks. The countdown starts once your question is generated and you click Start Writing.',
      icon:  '⏱',
      target: '.timer-options',
      arrow: 'top',
      total: 10
    },
    question_ready: {
      title: 'Step 5 — Your question',
      body:  'The AI has generated an exam-style question based on the past 5 years of WACE papers. <strong>Read it carefully</strong>. You can regenerate once if you want a different question. Click <strong>Start Writing</strong> when ready — the timer begins then.',
      icon:  '❓',
      target: '#question-content',
      arrow: 'bottom',
      total: 10
    },
    editor_writing: {
      title: 'Step 6 — Write your response',
      body:  'This is your <strong>distraction-free writing space</strong>. Your draft saves automatically every 30 seconds. The complexity gutter on the left flags structural issues. The timer is always visible at the top.',
      icon:  '✍️',
      target: '.writing-area-wrap',
      arrow: 'right',
      total: 10
    },
    editor_ai_help: {
      title: 'Step 7 — Get targeted AI help',
      body:  '<strong>Highlight any sentence</strong> and click "Help me with this" — then tick which skill you need help with. The AI rewrites it and streams an assessment below. <strong>Double-click any word</strong> for a synonym upgrade. The bottombar has quotes, terms, and sentence starters.',
      icon:  '🤖',
      target: '.editor-bottombar',
      arrow: 'top',
      total: 10
    },
    end_screen: {
      title: 'Step 8 — Session complete',
      body:  'Click <strong>Mark My Response</strong> for full WACE-style marking — criterion by criterion, with direct quotes from your response as evidence. Brutal. Honest. Exactly what you\'d get in the real exam. Or try again on the same question to see your mark improve.',
      icon:  '📝',
      target: '#mark-response-btn',
      arrow: 'left',
      total: 10
    },
    results: {
      title: 'Step 9 — Your marking report',
      body:  'Each criterion card shows your mark, the descriptor level, a specific examiner comment, and a quote from your response. Click <strong>"Help me improve this criterion"</strong> to go back to the editor with that criterion pre-loaded. The <strong>Vocabulary Report</strong> below shows overused words.',
      icon:  '📊',
      target: '.criteria-list',
      arrow: 'top',
      total: 10
    },
    tour_complete: {
      title: 'Tour complete! 🎉',
      body:  'You know your way around ScriptSense. Press <strong>?</strong> anytime to see keyboard shortcuts. The tour is done — go practise.',
      icon:  '✅',
      target: null,
      arrow: null,
      total: 10
    }
  }
};

let _tourActive  = false;
let _tourKey     = null;

function initOnboarding() {
  // Only start tour if first time
  try { if (localStorage.getItem('scriptsense_onboarded')) return; }
  catch(e) {}
  // Don't auto-start — show a "Take the tour" prompt on the API key screen instead
  setTimeout(showTourPrompt, 900);
}

function showTourPrompt() {
  // Inject a subtle "Take the tour" link below the API key submit button
  const gateField = document.querySelector('.gate-field-wrap');
  if (!gateField || $('tour-prompt-link')) return;
  const p = document.createElement('p');
  p.className = 'field-hint';
  p.id = 'tour-prompt-link';
  p.style.justifyContent = 'center';
  p.innerHTML = `<a href="#" id="start-tour-link" style="color:var(--accent);font-weight:600;">✦ New here? Take the guided tour</a>`;
  gateField.appendChild(p);
  $('start-tour-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    _tourActive = true;
    showTourStep('api_key');
  });
}

function showTourStep(key) {
  if (!_tourActive) return;
  _tourKey = key;
  const step    = TOUR.steps[key];
  const overlay = $('onboarding-overlay');
  const card    = $('onboarding-card');
  const spotlight = $('onboarding-spotlight');
  if (!step || !overlay || !card) return;

  // Update content
  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');
  if ($('onboarding-icon'))  $('onboarding-icon').textContent  = step.icon;
  if ($('onboarding-title')) $('onboarding-title').textContent = step.title;
  if ($('onboarding-body'))  $('onboarding-body').innerHTML    = step.body;

  // Hide step count for simpler feel — just show skip/next
  if ($('onboarding-step-count')) $('onboarding-step-count').textContent = '';
  if ($('onboarding-progress-bar')) $('onboarding-progress-bar').style.width = '0%';

  // Button labels
  const nextBtn = $('onboarding-next');
  if (nextBtn) nextBtn.textContent = key === 'tour_complete' ? 'Start practising →' : 'Got it →';
  const skipBtn = $('onboarding-skip');
  if (skipBtn) skipBtn.textContent = key === 'tour_complete' ? '' : 'Skip tour';

  // Attach button handlers fresh each step (clone to remove old listeners)
  if (nextBtn) {
    const newNext = nextBtn.cloneNode(true);
    nextBtn.parentNode?.replaceChild(newNext, nextBtn);
    newNext.addEventListener('click', () => {
      if (key === 'tour_complete') finishOnboarding();
      else dismissTourStep(); // hide card, wait for user to do the next action
    });
  }
  if (skipBtn && skipBtn.textContent) {
    const newSkip = skipBtn.cloneNode(true);
    skipBtn.parentNode?.replaceChild(newSkip, skipBtn);
    newSkip.addEventListener('click', finishOnboarding);
  }

  // Spotlight + card positioning
  requestAnimationFrame(() => positionTourCard(step, card, spotlight));
}

function positionTourCard(step, card, spotlight) {
  const PAD = 14;

  // Spotlight target
  if (step.target) {
    const targetEl = document.querySelector(step.target);
    if (targetEl && spotlight) {
      const rect = targetEl.getBoundingClientRect();
      spotlight.style.display = 'block';
      spotlight.style.top     = `${rect.top - PAD}px`;
      spotlight.style.left    = `${rect.left - PAD}px`;
      spotlight.style.width   = `${rect.width + PAD * 2}px`;
      spotlight.style.height  = `${rect.height + PAD * 2}px`;
    }
  } else {
    if (spotlight) spotlight.style.display = 'none';
  }

  // Card position — try to sit near the spotlight without covering it
  card.style.transition = 'none';
  card.style.transform  = 'none';
  card.style.top = card.style.left = card.style.right = card.style.bottom = 'auto';

  const CARD_W = 360;
  const vw = window.innerWidth, vh = window.innerHeight;

  if (!step.target || !step.arrow) {
    // Centre fallback
    card.style.top    = '50%';
    card.style.left   = '50%';
    card.style.transform = 'translate(-50%, -50%)';
  } else {
    const targetEl = document.querySelector(step.target);
    const rect     = targetEl ? targetEl.getBoundingClientRect() : { top:vh/2, left:vw/2, width:0, height:0, bottom:vh/2, right:vw/2 };
    let top, left;

    if (step.arrow === 'bottom') {
      // Card sits above the target
      top  = Math.max(PAD, rect.top - 220 - PAD);
      left = Math.max(PAD, Math.min(rect.left + rect.width/2 - CARD_W/2, vw - CARD_W - PAD));
    } else if (step.arrow === 'top') {
      // Card sits below the target
      top  = Math.min(rect.bottom + PAD, vh - 220 - PAD);
      left = Math.max(PAD, Math.min(rect.left + rect.width/2 - CARD_W/2, vw - CARD_W - PAD));
    } else if (step.arrow === 'right') {
      // Card sits to the left
      left = Math.max(PAD, rect.left - CARD_W - PAD);
      top  = Math.max(PAD, Math.min(rect.top + rect.height/2 - 100, vh - 240 - PAD));
    } else {
      // Card sits to the right
      left = Math.min(rect.right + PAD, vw - CARD_W - PAD);
      top  = Math.max(PAD, Math.min(rect.top + rect.height/2 - 100, vh - 240 - PAD));
    }

    card.style.top  = `${top}px`;
    card.style.left = `${left}px`;
  }

  card.style.width = `${CARD_W}px`;

  // Animate in
  card.style.opacity   = '0';
  card.style.marginTop = '10px';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      card.style.transition = 'opacity 0.24s ease, margin-top 0.24s ease';
      card.style.opacity    = '1';
      card.style.marginTop  = '0px';
    });
  });
}

function dismissTourStep() {
  // Hide card and spotlight but keep tour active — it will re-appear at the next trigger
  const overlay   = $('onboarding-overlay');
  const spotlight = $('onboarding-spotlight');
  const card      = $('onboarding-card');
  if (card) { card.style.opacity = '0'; }
  setTimeout(() => {
    overlay?.classList.remove('active');
    if (spotlight) spotlight.style.display = 'none';
  }, 220);
}

// Called at each screen/action transition when tour is active
function tourTrigger(key) {
  if (!_tourActive) return;
  if (!TOUR.steps[key])  return;
  // Small delay so the new screen has rendered
  setTimeout(() => showTourStep(key), 350);
}

function finishOnboarding() {
  _tourActive = false;
  _tourKey    = null;
  const overlay = $('onboarding-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s ease';
    setTimeout(() => {
      overlay.classList.remove('active');
      overlay.setAttribute('aria-hidden', 'true');
      overlay.style.opacity = overlay.style.transition = '';
    }, 320);
  }
  try { localStorage.setItem('scriptsense_onboarded', '1'); } catch(e) {}
}

/* ============================================================
   58. KEYBOARD SHORTCUTS MODAL
   ============================================================ */
function initShortcutsModal() {
  $('shortcuts-btn')?.addEventListener('click', () => openModal('modal-shortcuts'));
  $('shortcuts-close')?.addEventListener('click', () => closeModal('modal-shortcuts'));
}

/* ============================================================
   35. KEYBOARD SHORTCUTS
   ============================================================ */
function initKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeSkillsPanel();
      closeModal('modal-confirm-end');
      closeModal('modal-shortcuts');
      closeModal('modal-week-summary');
      $('ai-toolbar')?.classList.remove('visible');
      hideFeedbackWidget();
      $('terminology-drawer')?.classList.remove('open');
      $('quote-bank-popup')?.classList.remove('open');
      $('starters-drawer')?.classList.remove('open');
    }

    // Ctrl/Cmd+S — save draft
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if ($('screen-editor')?.classList.contains('active')) {
        saveDraft(); showToast('Draft saved.', 'success');
      }
    }

    // Ctrl/Cmd+Shift+A — open skills panel with current selection
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      if ($('screen-editor')?.classList.contains('active') && STATE.currentSelection?.text) {
        openSkillsPanel();
      } else if ($('screen-editor')?.classList.contains('active')) {
        showToast('Select some text first, then press Ctrl+Shift+A.', 'info');
      }
    }

    // ? — open shortcuts
    if (e.key === '?' && !e.ctrlKey && !e.metaKey && document.activeElement?.id !== 'writing-area') {
      openModal('modal-shortcuts');
    }

    // Ctrl/Cmd+Shift+T — toggle terminology bank
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 't') {
      e.preventDefault();
      $('terminology-btn')?.click();
    }
  });
}

/* ============================================================
   73. SENTENCE STARTER BANK
   ============================================================ */
function initSentenceStarterBank() {
  const drawer  = $('starters-drawer');
  const btn     = $('starters-btn');
  const closeB  = $('starters-drawer-close');
  const search  = $('starters-search');
  if (!drawer || !btn) return;

  btn.addEventListener('click', () => {
    const isOpen = drawer.classList.contains('open');
    if (!isOpen) {
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
      // Close terminology drawer if open
      $('terminology-drawer')?.classList.remove('open');
      renderStarterList('');
      search?.focus();
    } else {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
    }
  });

  closeB?.addEventListener('click', () => {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
  });

  search?.addEventListener('input', () => renderStarterList(search.value));
}

function renderStarterList(query) {
  const list = $('starters-list');
  if (!list) return;

  const q = query.toLowerCase().trim();
  list.innerHTML = '';

  SENTENCE_STARTERS.forEach(group => {
    const filtered = q
      ? group.starters.filter(s => s.toLowerCase().includes(q))
      : group.starters;

    if (!filtered.length) return;

    if (!q) {
      const heading = document.createElement('div');
      heading.className = 'starters-group-label';
      heading.textContent = group.group;
      list.appendChild(heading);
    }

    filtered.forEach(starter => {
      const item = document.createElement('div');
      item.className = 'starter-item';
      item.textContent = starter;
      item.addEventListener('click', () => {
        insertTextAtCursor(starter + ' ');
        // Close drawer after insertion
        $('starters-drawer')?.classList.remove('open');
        $('writing-area')?.focus();
        showToast('Starter inserted', 'success');
      });
      list.appendChild(item);
    });
  });

  if (!list.children.length) {
    list.innerHTML = '<p style="padding:var(--space-4);color:var(--ink-ghost);font-size:0.875rem;">No starters match your search.</p>';
  }
}

/* ============================================================
   77. DARK MODE
   ============================================================ */
function initDarkMode() {
  const btn = $('dark-mode-toggle');
  if (!btn) return;

  // Also add sun icon to the button now that we need to swap
  btn.innerHTML = `
    <svg class="icon icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
    <svg class="icon icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;

  // Restore saved preference
  try {
    if (localStorage.getItem('scriptsense_darkmode') === '1') {
      applyDarkMode(true);
      btn.setAttribute('aria-pressed', 'true');
    }
  } catch(e) {}

  btn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    applyDarkMode(!isDark);
    btn.setAttribute('aria-pressed', String(!isDark));
    try { localStorage.setItem('scriptsense_darkmode', !isDark ? '1' : '0'); } catch(e) {}
  });
}

function applyDarkMode(enable) {
  if (enable) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

// Call dark mode init globally (not just in editor) so it applies on every screen
function initGlobalDarkMode() {
  try {
    if (localStorage.getItem('scriptsense_darkmode') === '1') {
      applyDarkMode(true);
    }
  } catch(e) {}
}

/* ============================================================
   36. INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initGlobalDarkMode();   // apply saved preference before anything renders
  initApiKeyScreen();
  initCourseSelect();
  initTextSetupModal();
  initModeSelect();
  initTimerSelect();
  initKeyboardShortcuts();
  initConfidenceRating();
  initCustomQuestionInput();
  initWeekSummary();
  initShortcutsModal();
  initDarkMode();
  initOnboarding();

  // Results screen listeners
  $('results-new-session-btn')?.addEventListener('click', resetToStart);
  $('results-print-btn')?.addEventListener('click', () => window.print());
  $('results-download-btn')?.addEventListener('click', () => {
    if (STATE.markedData) downloadMarkingReport(STATE.markedData);
    else downloadText(loadDraft() || '', `ScriptSense_Response_${Date.now()}.txt`);
  });

  showScreen('screen-apikey');
  setTimeout(() => $('apikey-input')?.focus(), 300);
});
