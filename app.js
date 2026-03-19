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
  readingTimeEnabled: true,
  readingTimeActive: false,
  readingTimeInterval: null,
  readingTimeSeconds: 0,
  complexityCheckTimeout: null,
  tryAgainData: null,
  scaffoldData: null,
  markedData: null,
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

  const prompt = `You are a WACE writing coach. Rewrite ONLY the following highlighted text to improve its ${skillLabel}.

RULES:
- Return ONLY the improved rewrite. No labels, no explanation, no preamble.
- Keep the rewrite approximately the same length as the original.
- Do not rewrite content outside what is quoted below.
- ${confidenceCtx}

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

  const prompt = `You are a WACE writing coach providing assessment feedback.

SKILL BEING ASSESSED: ${skillLabel}
QUESTION: ${question || 'Free writing'}
STUDENT\'S ORIGINAL TEXT: "${selectedText}"
SUGGESTED REWRITE: "${rewrite}"
${confidenceCtx}

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
      } else {
        showScreen('screen-mode');
        updateModeScreen();
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
      }
    });
  });

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
  STATE.sessionEnded = false;
  STATE.questionLocked = false;
  STATE.questionRegenCount = 0;
  STATE.sessionStartTime = Date.now();
  STATE.tryAgainData = null;

  updateEditorBadges();
  showScreen('screen-editor');

  // Hide/show quote bank button based on course
  const qbBtn = $('quote-bank-btn');
  if (qbBtn) qbBtn.style.display = STATE.course === 'literature' ? '' : 'none';

  // Show/hide question header
  $('question-header')?.classList.remove('visible');
  $('stimulus-header')?.classList.remove('visible');

  if (STATE.mode === 'freewrite') {
    initStopwatch();
    const draft = loadDraft();
    const area = $('writing-area');
    if (area && draft) area.innerText = draft;
    startFreeWritingReview();
    startAutosave();
  } else {
    // Practice, scaffolded, intro — show question header
    $('question-header')?.classList.add('visible');

    // Reading time first (if enabled and not intro)
    if (STATE.readingTimeEnabled && STATE.mode !== 'intro') {
      await generateQuestionQuietly();
      startReadingTime();
    } else {
      if (STATE.mode === 'intro') initCountdown(STATE.timerDuration * 60);
      else initCountdown(STATE.timerDuration * 60);
      if (STATE.course === 'english' && STATE.section === 'comprehending') {
        $('question-header')?.classList.remove('visible');
        $('stimulus-header')?.classList.add('visible');
        await generateStimulusContent();
      } else {
        await generateQuestion();
      }
    }
  }

  initEditorEvents();
  updateWordCount();
  initComplexityAnalyser();
  showArgumentMapperTab();
}

// Generate question silently (no UI update) for reading time pre-load
async function generateQuestionQuietly() {
  const pastQs = LITERATURE_PAST_QUESTIONS.map(q => `${q.year} Q${q.question_number}: ${q.text}`).join('\n');
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

  if (STATE.mode === 'scaffolded') {
    prompt += '\n\nAlso generate 3 suggested analytical angles for this question and list the 2 most relevant syllabus concepts. Format: QUESTION: [...] ANGLES: 1. ... 2. ... 3. ... CONCEPTS: [concept1], [concept2]';
  }

  try {
    const result = await callGemini(prompt, null, 600);
    if (STATE.mode === 'scaffolded') {
      const qMatch = result.match(/QUESTION:\s*([\s\S]*?)(?=ANGLES:|$)/i);
      const aMatch = result.match(/ANGLES:\s*([\s\S]*?)(?=CONCEPTS:|$)/i);
      const cMatch = result.match(/CONCEPTS:\s*([\s\S]*?)$/i);
      STATE.currentQuestion = qMatch?.[1]?.trim() || result;
      STATE.scaffoldData = { angles: aMatch?.[1]?.trim() || '', concepts: cMatch?.[1]?.trim() || '' };
    } else {
      STATE.currentQuestion = result;
    }
    const textEl = $('question-text');
    if (textEl) textEl.textContent = STATE.currentQuestion;
  } catch(e) {
    STATE.currentQuestion = 'Could not generate question. Please check your API key and try again.';
  }
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
  const clock   = $('reading-time-clock');
  if (!overlay) return;

  STATE.readingTimeActive = true;
  STATE.readingTimeSeconds = APP_CONFIG.reading_time_seconds || 300;

  overlay.classList.add('visible');
  overlay.setAttribute('aria-hidden', 'false');

  // Show question in overlay if available
  if (STATE.currentQuestion) {
    const qDisplay = document.createElement('div');
    qDisplay.style.cssText = 'font-family:var(--font-display);font-style:italic;font-size:1.1rem;color:var(--ink);line-height:1.6;text-align:center;max-width:520px;padding:var(--space-4);background:var(--bg-warm);border-radius:var(--r-xl);border:var(--border-card);';
    qDisplay.textContent = STATE.currentQuestion;
    overlay.querySelector('.reading-time-inner')?.insertBefore(qDisplay, overlay.querySelector('.reading-time-notes-wrap'));
  }

  if (clock) clock.textContent = formatTime(STATE.readingTimeSeconds);

  STATE.readingTimeInterval = setInterval(() => {
    STATE.readingTimeSeconds--;
    if (clock) {
      clock.textContent = formatTime(STATE.readingTimeSeconds);
      clock.classList.toggle('warning', STATE.readingTimeSeconds <= 60);
    }
    if (STATE.readingTimeSeconds <= 0) endReadingTime();
  }, 1000);

  $('reading-time-skip')?.addEventListener('click', endReadingTime, { once: true });
}

function endReadingTime() {
  clearInterval(STATE.readingTimeInterval);
  STATE.readingTimeActive = false;
  const overlay = $('reading-time-overlay');
  overlay?.classList.remove('visible');
  overlay?.setAttribute('aria-hidden', 'true');

  // Show argument mapper
  showArgumentMapper();
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
  // Start timer and writing
  if (STATE.mode !== 'freewrite') {
    initCountdown(STATE.timerDuration * 60);
    startAutosave();
  }

  // Show scaffold if scaffolded mode
  if (STATE.mode === 'scaffolded' && STATE.scaffoldData) {
    renderScaffoldPanel();
  }

  // Show question content
  const genEl     = $('question-generating');
  const contentEl = $('question-content');
  const textEl    = $('question-text');
  if (genEl)     genEl.style.display = 'none';
  if (contentEl) contentEl.classList.add('visible');
  if (textEl && STATE.currentQuestion) textEl.textContent = STATE.currentQuestion;
  $('question-actions')?.classList.add('locked');

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
  const qHeader = $('question-header-inner');
  if (!qHeader || !STATE.scaffoldData) return;

  let panel = $('scaffold-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.className = 'scaffold-panel visible';
    panel.id = 'scaffold-panel';
    $('question-header')?.appendChild(panel);
  }

  const angles = STATE.scaffoldData.angles.split(/\d+\.\s+/).filter(a => a.trim());
  const concepts = STATE.scaffoldData.concepts.split(',').map(c => c.trim()).filter(Boolean);

  panel.innerHTML = `
    <div class="scaffold-panel-title">Analytical Guidance</div>
    <div style="max-width:820px;margin:0 auto;display:flex;gap:var(--space-6);flex-wrap:wrap;">
      ${angles.length ? `
      <div class="scaffold-section" style="flex:1;min-width:200px">
        <p class="scaffold-section-label">Suggested analytical angles</p>
        <ul class="scaffold-list">${angles.map(a => `<li>${escapeHtml(a.trim())}</li>`).join('')}</ul>
      </div>` : ''}
      ${concepts.length ? `
      <div class="scaffold-section" style="flex:0 0 auto">
        <p class="scaffold-section-label">Key concepts to apply</p>
        <ul class="scaffold-list">${concepts.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>
      </div>` : ''}
    </div>`;
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
  initCountdown(STATE.timerDuration * 60);
  startAutosave();
  $('writing-area')?.focus();
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
}

function startAutosave() {
  clearInterval(STATE.autosaveInterval);
  STATE.autosaveInterval = setInterval(saveDraft, APP_CONFIG.autosave_interval_ms);
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

  const tryAgainBtn = $('results-try-again-btn');
  if (tryAgainBtn && STATE.tryAgainData) tryAgainBtn.style.display = '';

  $('results-download-btn')?.addEventListener('click', () => downloadMarkingReport(data));
  $('results-print-btn')?.addEventListener('click', () => window.print());
  $('results-try-again-btn')?.addEventListener('click', handleTryAgain);
  $('results-new-session-btn')?.addEventListener('click', resetToStart);
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

  const key = STATE.apiKey;
  Object.keys(STATE).forEach(k => STATE[k] = null);
  STATE.apiKey = key;
  STATE.quoteBank = [];
  STATE.timerSeconds = 0;
  STATE.stopwatchSeconds = 0;
  STATE.confidence = 'high';
  STATE.readingTimeEnabled = true;

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

  showScreen('screen-course');
  renderSessionHistory();
}

/* ============================================================
   35. KEYBOARD SHORTCUTS
   ============================================================ */
function initKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeSkillsPanel();
      closeModal('modal-confirm-end');
      $('ai-toolbar')?.classList.remove('visible');
      hideFeedbackWidget();
      $('terminology-drawer')?.classList.remove('open');
      $('quote-bank-popup')?.classList.remove('open');
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

    // Ctrl/Cmd+Shift+T — toggle terminology bank
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 't') {
      e.preventDefault();
      $('terminology-btn')?.click();
    }
  });
}

/* ============================================================
   36. INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initApiKeyScreen();
  initCourseSelect();
  initTextSetupModal();
  initModeSelect();
  initTimerSelect();
  initKeyboardShortcuts();
  initConfidenceRating();

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
