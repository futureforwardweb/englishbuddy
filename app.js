/* ============================================================
   SCRIPTSENSE — APP.JS
   Full application logic: state, navigation, API calls,
   editor, AI Writer, marking, timer, autosave.
   ============================================================ */

'use strict';

/* ============================================================
   0. STATE
   ============================================================ */

const STATE = {
  apiKey:           null,
  course:           null,   // 'literature' | 'english'
  section:          null,   // 'composing' | 'responding' | 'comprehending' (English only)
  mode:             null,   // 'freewrite' | 'practice'
  timerDuration:    null,   // minutes (practice mode)
  textTitle:        null,
  textAuthor:       null,
  textType:         null,
  quoteBank:        [],     // [{ text, label }]
  currentQuestion:  null,
  timerInterval:    null,
  timerSeconds:     0,
  timerRunning:     false,
  stopwatchSeconds: 0,
  autosaveInterval: null,
  reviewInterval:   null,
  sessionStartTime: null,
  currentSelection: null,   // { text, range }
  pendingSuggestions: [],
  questionLocked:   false,
  questionRegenCount: 0,
  sessionEnded:     false,
};

/* ============================================================
   1. UTILITY FUNCTIONS
   ============================================================ */

function $(id) { return document.getElementById(id); }

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = '';
  });
  const el = $(id);
  if (el) {
    el.classList.add('active');
  }
}

function openModal(id) {
  const m = $(id);
  if (m) {
    m.setAttribute('aria-hidden', 'false');
    m.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  const m = $(id);
  if (m) {
    m.setAttribute('aria-hidden', 'true');
    m.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function showToast(message, type = 'info') {
  const toast = $('toast');
  const text  = $('toast-text');
  const icon  = $('toast-icon');
  if (!toast) return;

  const icons = {
    success: '<polyline points="20 6 9 17 4 12"/>',
    error:   '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
    info:    '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
  };

  text.textContent = message;
  icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icons[type] || icons.info}</svg>`;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 3200);
}

function setBtnLoading(btn, loading) {
  if (!btn) return;
  if (loading) btn.classList.add('loading');
  else btn.classList.remove('loading');
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

function saveDraft() {
  const content = $('writing-area')?.innerText || '';
  const key = `scriptsense_draft_${STATE.course}_${STATE.mode}`;
  try {
    localStorage.setItem(key, content);
    const indicator = $('autosave-indicator');
    const label     = $('autosave-text');
    if (indicator && label) {
      label.textContent = `Saved ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      indicator.classList.add('saved');
      setTimeout(() => indicator.classList.remove('saved'), 2500);
    }
  } catch (e) { /* storage full — silently fail */ }
}

function loadDraft() {
  const key = `scriptsense_draft_${STATE.course}_${STATE.mode}`;
  try { return localStorage.getItem(key) || ''; }
  catch (e) { return ''; }
}

function saveQuotes() {
  try {
    localStorage.setItem('scriptsense_quotes', JSON.stringify(STATE.quoteBank));
  } catch (e) {}
}

function loadSavedQuotes() {
  try {
    const saved = localStorage.getItem('scriptsense_quotes');
    if (saved) STATE.quoteBank = JSON.parse(saved);
  } catch (e) { STATE.quoteBank = []; }
}

/* ============================================================
   2. GEMINI API
   ============================================================ */

async function callGemini(prompt, systemInstruction = null, maxTokens = 2048) {
  const endpoint = `${APP_CONFIG.gemini_api_endpoint}?key=${STATE.apiKey}`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 }
  };

  if (systemInstruction) {
    body.system_instruction = { parts: [{ text: systemInstruction }] };
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini.');
  return text.trim();
}

async function validateApiKey(key) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: 'Reply with only the word: ready' }] }],
    generationConfig: { maxOutputTokens: 10 }
  };
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Invalid key');
  }
  return true;
}

/* ============================================================
   3. SCREEN: API KEY GATE
   ============================================================ */

function initApiKeyScreen() {
  const input    = $('apikey-input');
  const submit   = $('apikey-submit');
  const toggle   = $('apikey-toggle');
  const errorWrap= $('apikey-error');
  const errorText= $('apikey-error-text');

  toggle?.addEventListener('click', () => {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
  });

  input?.addEventListener('keydown', e => {
    if (e.key === 'Enter') submit?.click();
  });

  submit?.addEventListener('click', async () => {
    const key = input?.value?.trim();
    if (!key) {
      showApiKeyError('Please enter your Gemini API key.');
      return;
    }

    setBtnLoading(submit, true);
    errorWrap?.classList.remove('visible');

    try {
      await validateApiKey(key);
      STATE.apiKey = key;
      showScreen('screen-course');
    } catch (err) {
      showApiKeyError(`Invalid key: ${err.message}`);
    } finally {
      setBtnLoading(submit, false);
    }
  });
}

function showApiKeyError(msg) {
  const wrap = $('apikey-error');
  const text = $('apikey-error-text');
  if (wrap && text) {
    text.textContent = msg;
    wrap.classList.add('visible');
  }
}

/* ============================================================
   4. SCREEN: COURSE SELECT
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
}

/* ============================================================
   5. MODAL: LITERATURE TEXT & QUOTES SETUP
   ============================================================ */

function initTextSetupModal() {
  const nextBtn  = $('text-setup-next');
  const backBtn  = $('text-setup-back');
  const saveBtn  = $('text-setup-save');
  const addQuote = $('add-quote-row');

  nextBtn?.addEventListener('click', () => {
    const title  = $('text-title-input')?.value?.trim();
    const author = $('text-author-input')?.value?.trim();
    const type   = $('text-type-select')?.value;

    if (!title || !author || !type) {
      showToast('Please fill in all text details.', 'error');
      return;
    }

    STATE.textTitle  = title;
    STATE.textAuthor = author;
    STATE.textType   = type;

    // Advance to step 2
    $('text-setup-step1')?.classList.remove('active');
    $('text-setup-step2')?.classList.add('active');
    document.querySelectorAll('.modal-step')[0]?.classList.add('done');
    document.querySelectorAll('.modal-step')[1]?.classList.add('active');

    // Pre-populate bulk textarea from saved quotes
    if (STATE.quoteBank.length > 0) {
      const bulk = $('quotes-bulk-input');
      if (bulk) {
        bulk.value = STATE.quoteBank
          .map(q => q.label ? `${q.text} : ${q.label}` : q.text)
          .join('\n');
      }
    }
  });

  backBtn?.addEventListener('click', () => {
    $('text-setup-step2')?.classList.remove('active');
    $('text-setup-step1')?.classList.add('active');
    document.querySelectorAll('.modal-step')[1]?.classList.remove('active');
    document.querySelectorAll('.modal-step')[0]?.classList.remove('done');
  });

  addQuote?.addEventListener('click', () => addQuoteRow());

  saveBtn?.addEventListener('click', () => {
    parseAndSaveQuotes();
    closeModal('modal-text-setup');
    showScreen('screen-mode');
    updateModeScreen();
    // Reset modal for next time
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
    <button class="quote-row-remove" type="button" aria-label="Remove quote">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  `;
  row.querySelector('.quote-row-remove')?.addEventListener('click', () => row.remove());
  container.appendChild(row);
}

function parseAndSaveQuotes() {
  const quotes = [];

  // From bulk textarea
  const bulk = $('quotes-bulk-input')?.value || '';
  bulk.split('\n').forEach(line => {
    line = line.trim();
    if (!line) return;
    const colonIdx = line.lastIndexOf(' : ');
    if (colonIdx !== -1) {
      quotes.push({ text: line.slice(0, colonIdx).trim(), label: line.slice(colonIdx + 3).trim() });
    } else {
      quotes.push({ text: line, label: '' });
    }
  });

  // From individual rows
  document.querySelectorAll('.quote-row').forEach(row => {
    const inputs = row.querySelectorAll('input');
    const text   = inputs[0]?.value?.trim();
    const label  = inputs[1]?.value?.trim();
    if (text) quotes.push({ text, label: label || '' });
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
  $('quotes-rows').innerHTML = '';
  $('quotes-bulk-input').value = '';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ============================================================
   AI WRITER LOADING STATE — highlights selected text orange
   while Gemini is processing
   ============================================================ */
let _highlightRange = null;
let _highlightSpan  = null;

function highlightSelectionLoading() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return;
  try {
    const range = sel.getRangeAt(0);
    _highlightRange = range.cloneRange();
    const span = document.createElement('span');
    span.className = 'selection-loading-highlight';
    span.id = 'selection-loading-highlight';
    range.surroundContents(span);
    _highlightSpan = span;
    sel.removeAllRanges();
  } catch (e) { /* selection spans multiple nodes — skip highlight */ }
}

function removeHighlightLoading() {
  const span = $('selection-loading-highlight') || _highlightSpan;
  if (span && span.parentNode) {
    const parent = span.parentNode;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
    parent.normalize();
  }
  _highlightSpan  = null;
  _highlightRange = null;
}

/* ============================================================
   STREAMING TEXT UTILITY
   Reveals text word-by-word into an element.
   Returns a cancel function.
   ============================================================ */
function streamText(element, text, speed = 38, onComplete = null) {
  // Split on whitespace but keep the whitespace tokens so spacing is preserved
  const tokens = text.split(/(\s+)/);
  let i = 0;
  element.textContent = '';
  element.classList.add('streaming');

  function next() {
    if (i < tokens.length) {
      element.textContent += tokens[i];
      i++;
      // Pause slightly longer after punctuation for a natural cadence
      const token = tokens[i - 1];
      const delay = /[.!?]$/.test(token.trim()) ? speed * 4
                  : token.trim() === '' ? speed / 4
                  : speed;
      timeoutId = setTimeout(next, delay);
    } else {
      element.classList.remove('streaming');
      if (onComplete) onComplete();
    }
  }

  let timeoutId = setTimeout(next, 0);
  // Return cancel fn
  return () => {
    clearTimeout(timeoutId);
    element.classList.remove('streaming');
    element.textContent = text; // show full text immediately on cancel
  };
}

/* ============================================================
   FEEDBACK WIDGET
   ============================================================ */
let _feedbackStreamCancel = null;

function showFeedbackWidget(skillLabel, assessmentText, whyText = '') {
  const widget    = $('feedback-widget');
  const skillEl   = $('feedback-widget-skill');
  const textEl    = $('feedback-widget-text');
  const whyEl     = $('feedback-widget-why');

  if (!widget) return;

  // Cancel any in-progress stream
  if (_feedbackStreamCancel) {
    _feedbackStreamCancel();
    _feedbackStreamCancel = null;
  }

  skillEl.textContent  = skillLabel;
  textEl.textContent   = '';
  whyEl.textContent    = '';
  whyEl.classList.remove('visible');

  widget.setAttribute('aria-hidden', 'false');
  widget.classList.add('visible');

  // Stream the assessment, then stream the why
  _feedbackStreamCancel = streamText(textEl, assessmentText, 30, () => {
    if (whyText) {
      whyEl.classList.add('visible');
      _feedbackStreamCancel = streamText(whyEl, whyText, 30);
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
   6. SCREEN: MODE SELECT
   ============================================================ */

function updateModeScreen() {
  const badge = $('mode-course-badge');
  if (badge) {
    badge.textContent = STATE.course === 'literature' ? 'Literature ATAR' : 'English ATAR';
  }

  const sectionWrap = $('english-section-wrap');
  if (sectionWrap) {
    if (STATE.course === 'english') {
      sectionWrap.classList.add('visible');
      // Default section
      if (!STATE.section) {
        STATE.section = 'composing';
        document.querySelector('.section-pill[data-section="composing"]')?.classList.add('active');
      }
    } else {
      sectionWrap.classList.remove('visible');
      STATE.section = null;
    }
  }
}

function initModeSelect() {
  $('mode-back')?.addEventListener('click', () => {
    if (STATE.course === 'literature') {
      openModal('modal-text-setup');
    } else {
      showScreen('screen-course');
    }
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
      if (STATE.mode === 'practice') {
        showScreen('screen-timer');
      } else {
        startSession();
      }
    });
  });
}

/* ============================================================
   7. SCREEN: TIMER DURATION SELECT
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
   8. SESSION START
   ============================================================ */

async function startSession() {
  STATE.sessionEnded     = false;
  STATE.questionLocked   = false;
  STATE.questionRegenCount = 0;
  STATE.pendingSuggestions = [];
  STATE.sessionStartTime = Date.now();

  // Update topbar badges
  updateEditorBadges();

  // Show editor screen
  showScreen('screen-editor');

  // Init timer/stopwatch
  if (STATE.mode === 'practice') {
    initCountdown(STATE.timerDuration * 60);
  } else {
    initStopwatch();
  }

  // Show/hide question and stimulus headers
  const qHeader = $('question-header');
  const sHeader = $('stimulus-header');
  qHeader?.classList.remove('visible');
  sHeader?.classList.remove('visible');

  if (STATE.mode === 'practice') {
    if (STATE.course === 'english' && STATE.section === 'comprehending') {
      sHeader?.classList.add('visible');
      await generateStimulusContent();
    } else {
      qHeader?.classList.add('visible');
      await generateQuestion();
    }
  } else {
    // Free writing — load any saved draft
    const draft = loadDraft();
    const area  = $('writing-area');
    if (area && draft) area.innerText = draft;
    startFreeWritingReview();
    startAutosave();
  }

  initEditorEvents();
  updateWordCount();
}

function updateEditorBadges() {
  const courseBadge = $('topbar-course-badge');
  const modeBadge   = $('topbar-mode-badge');
  const textBadge   = $('topbar-text-badge');

  if (courseBadge) {
    courseBadge.textContent = STATE.course === 'literature' ? 'Literature ATAR' : 'English ATAR';
  }
  if (modeBadge) {
    modeBadge.textContent = STATE.mode === 'practice' ? 'Practice Question' : 'Free Writing';
  }
  if (textBadge) {
    if (STATE.course === 'literature' && STATE.textTitle) {
      textBadge.textContent = STATE.textTitle;
      textBadge.style.display = '';
    } else if (STATE.course === 'english' && STATE.section) {
      textBadge.textContent = capitalize(STATE.section);
      textBadge.style.display = '';
    } else {
      textBadge.style.display = 'none';
    }
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ============================================================
   9. TIMER & STOPWATCH
   ============================================================ */

function initCountdown(totalSeconds) {
  STATE.timerSeconds = totalSeconds;
  clearInterval(STATE.timerInterval);

  const display = $('timer-value');
  const label   = $('timer-label');

  if (display) display.textContent = formatTime(STATE.timerSeconds);
  if (label) label.textContent = 'remaining';

  STATE.timerInterval = setInterval(() => {
    STATE.timerSeconds--;
    if (display) display.textContent = formatTime(STATE.timerSeconds);

    if (STATE.timerSeconds <= APP_CONFIG.timer_warning_threshold_seconds) {
      display?.classList.add('timer-warning');
    }

    if (STATE.timerSeconds <= 0) {
      clearInterval(STATE.timerInterval);
      triggerSessionEnd(true);
    }
  }, 1000);
}

function initStopwatch() {
  STATE.stopwatchSeconds = 0;
  clearInterval(STATE.timerInterval);

  const display = $('timer-value');
  const label   = $('timer-label');

  if (display) display.textContent = '00:00';
  if (label) label.textContent = 'elapsed';

  STATE.timerInterval = setInterval(() => {
    STATE.stopwatchSeconds++;
    if (display) display.textContent = formatTime(STATE.stopwatchSeconds);
  }, 1000);
}

/* ============================================================
   10. WORD COUNT + AUTOSAVE
   ============================================================ */

function updateWordCount() {
  const area  = $('writing-area');
  const count = $('word-count');
  if (!area || !count) return;
  const words = getWordCount(area.innerText);
  count.textContent = `${words} word${words !== 1 ? 's' : ''}`;
}

function startAutosave() {
  clearInterval(STATE.autosaveInterval);
  STATE.autosaveInterval = setInterval(saveDraft, APP_CONFIG.autosave_interval_ms);
}

function stopAutosave() {
  clearInterval(STATE.autosaveInterval);
}

/* ============================================================
   11. QUESTION GENERATION
   ============================================================ */

async function generateQuestion() {
  const genEl      = $('question-generating');
  const contentEl  = $('question-content');
  const textEl     = $('question-text');
  const actionsEl  = $('question-actions');
  const regenBtn   = $('question-regenerate');

  if (genEl)     genEl.style.display = 'flex';
  if (contentEl) contentEl.classList.remove('visible');

  const pastQsText = LITERATURE_PAST_QUESTIONS.map(q =>
    `${q.year} Q${q.question_number}: ${q.text}`
  ).join('\n');

  const conceptsList = LITERATURE_SYLLABUS_CONCEPTS.map(c =>
    `• ${c.concept}: ${c.definition.slice(0, 100)}`
  ).join('\n');

  const prompt = `${GEMINI_PROMPTS.question_generation_literature}

STUDIED TEXT: "${STATE.textTitle}" by ${STATE.textAuthor} (${STATE.textType})

PAST 5 YEARS OF WACE LITERATURE ATAR QUESTIONS (DO NOT REPEAT THESE):
${pastQsText}

KEY SYLLABUS CONCEPTS:
${conceptsList}

Generate ONE new practice question now.`;

  try {
    const question = await callGemini(prompt);
    STATE.currentQuestion = question;

    if (textEl) textEl.textContent = question;
    if (genEl)  genEl.style.display = 'none';
    if (contentEl) contentEl.classList.add('visible');
    if (actionsEl) actionsEl.classList.remove('locked');

    // Set up start and regen buttons
    regenBtn?.addEventListener('click', handleRegenQuestion, { once: true });
    $('question-start')?.addEventListener('click', lockAndStartWriting, { once: true });

  } catch (err) {
    if (genEl) {
      genEl.innerHTML = `<span style="color:var(--danger)">Could not generate question: ${err.message}. Check your API key.</span>`;
    }
  }
}

async function handleRegenQuestion() {
  if (STATE.questionRegenCount >= APP_CONFIG.max_question_regenerations) {
    showToast('You can only regenerate once.', 'error');
    return;
  }
  STATE.questionRegenCount++;
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
   12. STIMULUS GENERATION (English Comprehending)
   ============================================================ */

async function generateStimulusContent() {
  const genEl     = $('stimulus-generating');
  const contentEl = $('stimulus-content');
  const textEl    = $('stimulus-text');
  const qList     = $('stimulus-questions-list');

  if (genEl)     genEl.style.display = 'flex';
  if (contentEl) contentEl.classList.remove('visible');

  const pastResponding = ENGLISH_PAST_QUESTIONS.responding.map(q =>
    `${q.year}: ${q.text}`
  ).join('\n');

  const concepts = ENGLISH_SYLLABUS_CONCEPTS.shared.map(c => c.concept).join(', ');

  const prompt = `${GEMINI_PROMPTS.question_generation_english}

SECTION: COMPREHENDING
PAST WACE ENGLISH ATAR QUESTIONS (for context — do not repeat):
${pastResponding}

KEY SYLLABUS CONCEPTS: ${concepts}

Generate a WACE-style comprehending stimulus with:
1. A short written text (200-250 words) — choose one of: news editorial, persuasive speech excerpt, personal essay, or feature article. Set it in an Australian context if possible.
2. A clear title for the stimulus.
3. Three short-answer comprehension questions that test: language analysis, perspective/values, and genre conventions.

Format your response EXACTLY like this:
TITLE: [title here]
---
[stimulus text here]
---
Q1: [question 1]
Q2: [question 2]
Q3: [question 3]`;

  try {
    const response = await callGemini(prompt);
    const parsed = parseStimulusResponse(response);

    if (textEl)   textEl.innerHTML = parsed.stimulus.replace(/\n/g, '<br>');
    if (qList) {
      qList.innerHTML = parsed.questions
        .map(q => `<li>${q}</li>`)
        .join('');
    }
    STATE.currentQuestion = parsed.questions.join(' | ');

    if (genEl)     genEl.style.display = 'none';
    if (contentEl) contentEl.classList.add('visible');

    $('question-start')?.addEventListener('click', lockAndStartWriting, { once: true });

    // Re-show question header styled as stimulus
    const qHeader = $('question-header');
    qHeader?.classList.remove('visible');
    const sHeader = $('stimulus-header');
    sHeader?.classList.add('visible');

    initCountdown(STATE.timerDuration * 60);
    startAutosave();

  } catch (err) {
    if (genEl) {
      genEl.innerHTML = `<span style="color:var(--danger)">Could not generate stimulus: ${err.message}</span>`;
    }
  }
}

function parseStimulusResponse(text) {
  const titleMatch    = text.match(/TITLE:\s*(.+)/);
  const parts         = text.split('---');
  const stimulusRaw   = parts[1]?.trim() || text;
  const afterStimulus = parts[2] || text;
  const questions     = [];
  const qMatches      = afterStimulus.matchAll(/Q\d+:\s*(.+)/g);
  for (const m of qMatches) questions.push(m[1].trim());

  return {
    title:    titleMatch ? titleMatch[1].trim() : 'Stimulus Text',
    stimulus: stimulusRaw,
    questions: questions.length ? questions : [
      'Analyse how language features construct the perspective of the writer.',
      'Explain how the text positions its audience.',
      'Discuss how the conventions of this genre are used to achieve the text\'s purpose.'
    ]
  };
}

/* ============================================================
   13. EDITOR EVENTS
   ============================================================ */

function initEditorEvents() {
  const area = $('writing-area');
  if (!area) return;

  area.addEventListener('input', () => {
    updateWordCount();
  });

  area.addEventListener('mouseup', handleTextSelection);
  area.addEventListener('keyup', handleTextSelection);

  document.addEventListener('mousedown', (e) => {
    const toolbar = $('ai-toolbar');
    if (toolbar && !toolbar.contains(e.target) && !$('writing-area')?.contains(e.target)) {
      toolbar.classList.remove('visible');
    }
  });

  $('ai-help-btn')?.addEventListener('click', () => {
    showToast('Highlight the text you want help with, then click "Help me with this".', 'info');
    $('writing-area')?.focus();
  });

  $('ai-toolbar-help')?.addEventListener('click', openSkillsPanel);
  $('skills-panel-close')?.addEventListener('click', closeSkillsPanel);
  $('skills-cancel')?.addEventListener('click', closeSkillsPanel);
  $('skills-analyse')?.addEventListener('click', handleSkillsAnalyse);
  $('feedback-widget-close')?.addEventListener('click', hideFeedbackWidget);

  $('end-session-btn')?.addEventListener('click', () => {
    openModal('modal-confirm-end');
  });

  $('confirm-end-cancel')?.addEventListener('click', () => closeModal('modal-confirm-end'));
  $('confirm-end-confirm')?.addEventListener('click', () => {
    closeModal('modal-confirm-end');
    triggerSessionEnd(false);
  });

  $('suggestions-toggle')?.addEventListener('click', () => {
    const list   = $('suggestions-list');
    const toggle = $('suggestions-toggle');
    const isOpen = list?.classList.contains('open');
    list?.classList.toggle('open', !isOpen);
    toggle?.setAttribute('aria-expanded', String(!isOpen));
  });
}

function handleTextSelection() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.toString().trim()) {
    $('ai-toolbar')?.classList.remove('visible');
    STATE.currentSelection = null;
    return;
  }

  const selectedText = selection.toString().trim();
  const range        = selection.getRangeAt(0);
  const rect         = range.getBoundingClientRect();

  STATE.currentSelection = { text: selectedText, range };

  const toolbar = $('ai-toolbar');
  if (!toolbar) return;

  toolbar.classList.add('visible');
  toolbar.style.left = `${rect.left + window.scrollX + (rect.width / 2) - (toolbar.offsetWidth / 2)}px`;
  toolbar.style.top  = `${rect.top + window.scrollY - toolbar.offsetHeight - 8}px`;
}

/* ============================================================
   14. SKILLS PANEL
   ============================================================ */

function openSkillsPanel() {
  if (!STATE.currentSelection?.text) {
    showToast('Please highlight some text first.', 'error');
    return;
  }

  const preview = $('selection-preview');
  if (preview) {
    preview.textContent = STATE.currentSelection.text.slice(0, 200) +
      (STATE.currentSelection.text.length > 200 ? '...' : '');
  }

  // Show correct skill list
  const litList = $('skills-list-literature');
  const engList = $('skills-list-english');
  if (litList) litList.style.display = STATE.course === 'literature' ? '' : 'none';
  if (engList) engList.style.display = STATE.course === 'english'    ? '' : 'none';

  // Uncheck all
  document.querySelectorAll('.skill-checkbox input').forEach(cb => cb.checked = false);

  $('ai-toolbar')?.classList.remove('visible');
  $('skills-panel')?.classList.add('open');
  $('skills-panel')?.setAttribute('aria-hidden', 'false');
}

function closeSkillsPanel() {
  $('skills-panel')?.classList.remove('open');
  $('skills-panel')?.setAttribute('aria-hidden', 'true');
}

async function handleSkillsAnalyse() {
  const checkedSkills = Array.from(
    document.querySelectorAll('.skill-checkbox input:checked')
  ).map(cb => cb.value);

  if (checkedSkills.length === 0) {
    showToast('Please select at least one skill.', 'error');
    return;
  }

  // Guard — selection too large
  const selText = STATE.currentSelection?.text || '';
  if (selText.length > 400) {
    showToast('Selection too long — highlight a single sentence or clause for best results.', 'error');
    return;
  }
  if (selText.length < 10) {
    showToast('Please highlight at least a few words.', 'error');
    return;
  }

  const btn = $('skills-analyse');
  setBtnLoading(btn, true);
  closeSkillsPanel();

  // Apply orange loading highlight on the selected text
  highlightSelectionLoading();

  try {
    await runAiWriter(selText, checkedSkills);
  } catch (err) {
    removeHighlightLoading();
    showToast(`AI Writer error: ${err.message}`, 'error');
  } finally {
    setBtnLoading(btn, false);
  }
}

/* ============================================================
   15. AI WRITER — GEMINI CALL + INLINE SUGGESTIONS
   ============================================================ */

async function runAiWriter(selectedText, skills) {
  const fullEssay  = $('writing-area')?.innerText || '';
  const skillDefs  = STATE.course === 'literature'
    ? SKILL_FEEDBACK_PROMPTS.literature
    : SKILL_FEEDBACK_PROMPTS.english;

  const skillInstructions = skills.map(s => {
    const def = skillDefs[s];
    return def ? `SKILL — ${def.label}:\n${def.prompt_instruction}` : '';
  }).filter(Boolean).join('\n\n');

  const markingCriteria = STATE.course === 'literature'
    ? LITERATURE_MARKING_KEY.criteria.map(c => `${c.name} (/${c.max_marks})`).join(', ')
    : ENGLISH_MARKING_KEY.criteria.map(c => `${c.name} (/${c.max_marks})`).join(', ');

  const conceptsText = STATE.course === 'literature'
    ? LITERATURE_SYLLABUS_CONCEPTS.slice(0, 8).map(c => c.concept).join(', ')
    : ENGLISH_SYLLABUS_CONCEPTS.shared.map(c => c.concept).join(', ');

  let quoteContext = '';
  if (STATE.course === 'literature' && STATE.quoteBank.length > 0) {
    quoteContext = `\nSTUDENT'S QUOTE BANK (use these in suggestions where relevant):\n` +
      STATE.quoteBank.map(q => `• "${q.text}"${q.label ? ` [${q.label}]` : ''}`).join('\n');
  }

  const prompt = `${GEMINI_PROMPTS.ai_writer_base}

COURSE: ${STATE.course === 'literature' ? 'English Literature ATAR' : 'English ATAR'}
${STATE.course === 'literature' ? `STUDIED TEXT: "${STATE.textTitle}" by ${STATE.textAuthor}` : `SECTION: ${STATE.section}`}
QUESTION: ${STATE.currentQuestion || 'Free writing — no specific question'}
MARKING CRITERIA: ${markingCriteria}
KEY SYLLABUS CONCEPTS: ${conceptsText}
${quoteContext}

FULL RESPONSE (for context):
${fullEssay}

HIGHLIGHTED TEXT (the specific section to improve):
"${selectedText}"

SKILLS THE STUDENT HAS REQUESTED HELP WITH:
${skillInstructions}

Provide your response now.`;

  const result = await callGemini(prompt, null, 3500);
  displayInlineSuggestion(selectedText, result, skills);
}

function displayInlineSuggestion(originalText, aiResponse, skills) {
  const overlay = $('suggestion-overlay');
  if (!overlay) return;

  // Remove loading highlight now that we have a response
  removeHighlightLoading();

  // ── Parse AI response sections ────────────────────────────
  const assessmentMatch  = aiResponse.match(/ASSESSMENT:\s*([\s\S]*?)(?=WHY THIS MATTERS:|SUGGESTED REWRITE:|EXPLANATION:|$)/i);
  const whyMatch         = aiResponse.match(/WHY THIS MATTERS:\s*([\s\S]*?)(?=SUGGESTED REWRITE:|EXPLANATION:|$)/i);
  const rewriteMatch     = aiResponse.match(/SUGGESTED REWRITE:\s*([\s\S]*?)(?=EXPLANATION:|WHY THIS MATTERS:|$)/i);
  const explanationMatch = aiResponse.match(/EXPLANATION:\s*([\s\S]*?)$/i);

  const assessment = (assessmentMatch?.[1] || '').trim();
  const why        = (whyMatch?.[1] || explanationMatch?.[1] || '').trim();

  // Robust rewrite extraction
  let rewrite = (rewriteMatch?.[1] || '').trim();
  if (!rewrite) {
    // Fallback: strip known sections and take what's left
    rewrite = aiResponse
      .replace(/ASSESSMENT:[\s\S]*?(?=SUGGESTED REWRITE:|WHY THIS MATTERS:|$)/i, '')
      .replace(/SUGGESTED REWRITE:/i, '')
      .replace(/WHY THIS MATTERS:[\s\S]*/i, '')
      .replace(/EXPLANATION:[\s\S]*/i, '')
      .trim();
  }
  if (!rewrite) rewrite = aiResponse.trim();

  const skillLabel = skills.map(s => {
    const defs = STATE.course === 'literature'
      ? SKILL_FEEDBACK_PROMPTS.literature
      : SKILL_FEEDBACK_PROMPTS.english;
    return defs[s]?.label || s;
  }).join(', ');

  // ── Remove any existing suggestion cards ─────────────────
  overlay.querySelectorAll('.suggestion-card').forEach(c => c.remove());

  // ── Build popup card — REWRITE ONLY ──────────────────────
  // The card is small: skill tag + streaming rewrite + Accept/Dismiss
  // Assessment goes ONLY to the bottom widget — never in this card
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
    </div>
  `;

  // ── Position ABOVE selection, clamp to viewport ───────────
  const CARD_W = 340;
  const CARD_H = 180;
  const PAD    = 12;
  const sel    = STATE.currentSelection?.range;

  card.style.width = `${CARD_W}px`;

  if (sel) {
    const rect = sel.getBoundingClientRect();
    let top  = rect.top - CARD_H - PAD;
    let left = rect.left + (rect.width / 2) - (CARD_W / 2);
    // Flip below if not enough room above
    if (top < PAD) top = rect.bottom + PAD;
    // Clamp inside viewport
    left = Math.max(PAD, Math.min(left, window.innerWidth - CARD_W - PAD));
    top  = Math.max(PAD, Math.min(top,  window.innerHeight - CARD_H - 80));
    card.style.top  = `${top}px`;
    card.style.left = `${left}px`;
  } else {
    card.style.top    = 'auto';
    card.style.bottom = '160px';
    card.style.right  = '24px';
    card.style.left   = 'auto';
  }

  // ── Wire buttons ──────────────────────────────────────────
  const closeCard = () => { card.remove(); hideFeedbackWidget(); };

  card.querySelector('.suggestion-card-x')?.addEventListener('click', closeCard);
  card.querySelector('.dismiss-btn')?.addEventListener('click', closeCard);
  card.querySelector('.accept-btn')?.addEventListener('click', () => {
    replaceSelectedText(rewrite);
    closeCard();
    showToast('Suggestion accepted.', 'success');
  });

  overlay.appendChild(card);

  // ── Stream rewrite into the card, word by word ────────────
  const rewriteEl = card.querySelector('#sc-rewrite-text');
  if (rewriteEl) streamText(rewriteEl, rewrite, 32);

  // ── Send full assessment to bottom widget (separate) ──────
  // Widget only appears if there is assessment content
  const widgetText = assessment || why;
  if (widgetText) {
    showFeedbackWidget(skillLabel, widgetText, why && assessment ? why : '');
  }
}

function replaceSelectedText(newText) {
  if (!STATE.currentSelection?.range) return;
  const range = STATE.currentSelection.range;
  range.deleteContents();
  range.insertNode(document.createTextNode(newText));
  updateWordCount();
  saveDraft();
  STATE.currentSelection = null;
}

/* ============================================================
   16. FREE WRITING AUTO-REVIEW
   ============================================================ */

function startFreeWritingReview() {
  clearInterval(STATE.reviewInterval);
  const tray = $('suggestions-tray');

  STATE.reviewInterval = setInterval(async () => {
    const essay = $('writing-area')?.innerText?.trim();
    if (!essay || essay.length < 100) return;

    const indicator = $('ai-review-indicator');
    const label     = $('ai-review-label');

    if (indicator) indicator.style.display = 'flex';
    if (label) label.textContent = 'AI reviewing...';
    if (tray) tray.classList.add('visible');

    try {
      await runFreeWritingReview(essay);
    } catch (err) {
      if (label) label.textContent = 'Review unavailable';
    }
  }, APP_CONFIG.free_writing_review_interval_ms);
}

function stopFreeWritingReview() {
  clearInterval(STATE.reviewInterval);
}

async function runFreeWritingReview(essay) {
  const markingCriteria = STATE.course === 'literature'
    ? LITERATURE_MARKING_KEY.criteria.map(c => c.name).join(', ')
    : ENGLISH_MARKING_KEY.criteria.map(c => c.name).join(', ');

  const conceptsList = STATE.course === 'literature'
    ? LITERATURE_SYLLABUS_CONCEPTS.slice(0, 6).map(c => c.concept).join(', ')
    : ENGLISH_SYLLABUS_CONCEPTS.shared.map(c => c.concept).join(', ');

  const prompt = `${GEMINI_PROMPTS.free_writing_review}

COURSE: ${STATE.course === 'literature' ? 'English Literature ATAR' : 'English ATAR'}
${STATE.course === 'literature' ? `TEXT: "${STATE.textTitle}" by ${STATE.textAuthor}` : `SECTION: ${STATE.section || 'general'}`}
MARKING CRITERIA: ${markingCriteria}
SYLLABUS CONCEPTS: ${conceptsList}

CURRENT DRAFT:
${essay}

Provide exactly 3 paragraph-level improvement suggestions now.`;

  const result = await callGemini(prompt);
  parseAndDisplayReviewSuggestions(result);
}

function parseAndDisplayReviewSuggestions(text) {
  const list  = $('suggestions-list');
  const count = $('suggestions-count');
  const label = $('ai-review-label');

  if (!list) return;

  // Clear previous suggestions
  list.innerHTML = '';

  // Parse suggestions — look for PARAGRAPH: / SKILL: / ORIGINAL: / IMPROVED: / WHY: blocks
  const blocks = text.split(/\n(?=PARAGRAPH:)/i);
  let parsed = 0;

  blocks.forEach((block, idx) => {
    if (parsed >= 3) return;

    const paraMatch     = block.match(/PARAGRAPH:\s*([\s\S]*?)(?=SKILL:|$)/i);
    const skillMatch    = block.match(/SKILL:\s*([\s\S]*?)(?=ORIGINAL:|$)/i);
    const originalMatch = block.match(/ORIGINAL:\s*([\s\S]*?)(?=IMPROVED:|$)/i);
    const improvedMatch = block.match(/IMPROVED:\s*([\s\S]*?)(?=WHY:|$)/i);
    const whyMatch      = block.match(/WHY:\s*([\s\S]*?)$/i);

    const original = originalMatch?.[1]?.trim() || '';
    const improved = improvedMatch?.[1]?.trim() || '';
    const skill    = skillMatch?.[1]?.trim()    || 'Writing';
    const why      = whyMatch?.[1]?.trim()       || '';

    if (!improved) return;

    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.style.animationDelay = `${idx * 80}ms`;
    item.innerHTML = `
      <span class="suggestion-skill-tag">${escapeHtml(skill)}</span>
      ${original ? `<p class="suggestion-original">${escapeHtml(original)}</p>` : ''}
      <p class="suggestion-new">${escapeHtml(improved)}</p>
      ${why ? `<p class="suggestion-why">${escapeHtml(why)}</p>` : ''}
      <div class="suggestion-actions">
        <button class="btn btn-accent btn-xs" type="button" data-action="accept">Accept</button>
        <button class="btn btn-ghost btn-xs" type="button" data-action="skip">Skip</button>
      </div>
    `;

    item.querySelector('[data-action="accept"]')?.addEventListener('click', () => {
      if (original) replaceTextInEditor(original, improved);
      item.remove();
      updateSuggestionCount();
    });

    item.querySelector('[data-action="skip"]')?.addEventListener('click', () => {
      item.remove();
      updateSuggestionCount();
    });

    list.appendChild(item);
    parsed++;
  });

  if (count) count.textContent = `${parsed} suggestion${parsed !== 1 ? 's' : ''} available`;
  if (label) label.textContent = 'Review complete';
  updateSuggestionCount();

  // Auto-expand if there are suggestions
  if (parsed > 0) {
    list.classList.add('open');
    $('suggestions-toggle')?.setAttribute('aria-expanded', 'true');
  }
}

function updateSuggestionCount() {
  const remaining = $('suggestions-list')?.children.length || 0;
  const count = $('suggestions-count');
  if (count) count.textContent = `${remaining} suggestion${remaining !== 1 ? 's' : ''} available`;
}

function replaceTextInEditor(original, replacement) {
  const area = $('writing-area');
  if (!area) return;
  const content = area.innerHTML;
  const escaped = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  area.innerHTML = content.replace(new RegExp(escaped, 'i'), replacement);
  updateWordCount();
  saveDraft();
}

/* ============================================================
   17. END OF SESSION
   ============================================================ */

function triggerSessionEnd(timerExpired = false) {
  if (STATE.sessionEnded) return;
  STATE.sessionEnded = true;

  clearInterval(STATE.timerInterval);
  clearInterval(STATE.autosaveInterval);
  clearInterval(STATE.reviewInterval);

  saveDraft();

  const elapsed = STATE.mode === 'practice'
    ? STATE.timerDuration * 60 - STATE.timerSeconds
    : STATE.stopwatchSeconds;

  const words = getWordCount($('writing-area')?.innerText || '');

  $('end-word-count').textContent = words.toLocaleString();
  $('end-time-taken').textContent = formatTime(elapsed);

  showScreen('screen-end');
  initEndScreen();

  if (timerExpired) showToast("Time's up! Great work.", 'info');
}

function initEndScreen() {
  $('mark-response-btn')?.addEventListener('click', startMarking, { once: true });
  $('download-exit-btn')?.addEventListener('click', downloadAndExit);
  $('new-session-btn')?.addEventListener('click', resetToStart);
}

/* ============================================================
   18. MARKING + RESULTS
   ============================================================ */

async function startMarking() {
  showScreen('screen-results');

  const generating = $('results-generating');
  const scoreBlock = $('results-score-block');

  if (generating) generating.classList.add('visible');
  if (scoreBlock)  scoreBlock.classList.remove('visible');

  const essay = loadDraft() || $('writing-area')?.innerText || '';

  const markingKey = STATE.course === 'literature'
    ? buildLiteratureMarkingKeyText()
    : buildEnglishMarkingKeyText();

  const exemplarText = STATE.course === 'literature'
    ? LITERATURE_EXEMPLARS.map(e => `EXEMPLAR (${e.grade_level}): ${e.high_band_features?.join('; ')}`).join('\n')
    : buildEnglishExemplarText();

  const prompt = `${GEMINI_PROMPTS.marking_base}

COURSE: ${STATE.course === 'literature' ? 'English Literature ATAR' : 'English ATAR'}
${STATE.course === 'literature'
  ? `STUDIED TEXT: "${STATE.textTitle}" by ${STATE.textAuthor}`
  : `SECTION: ${capitalize(STATE.section || 'responding')}`
}
QUESTION: ${STATE.currentQuestion || 'Free writing — no specific question'}

${STATE.course === 'literature' ? `QUOTE BANK AVAILABLE TO STUDENT:\n${STATE.quoteBank.map(q => `"${q.text}"`).join('\n')}` : ''}

MARKING KEY:
${markingKey}

HIGH BAND EXEMPLAR FEATURES (for calibration):
${exemplarText}

STUDENT RESPONSE:
${essay}

Return your marking as a JSON object with this EXACT structure — use double quotes only, no newlines inside string values, no trailing commas:
{
  "total_score": <number>,
  "total_max": <number>,
  "descriptor_level": "<string>",
  "criteria": [
    {
      "name": "<criterion name>",
      "score": <number>,
      "max": <number>,
      "descriptor": "<descriptor label>",
      "comment": "<specific comment — no line breaks — max 200 chars>",
      "evidence": "<direct quote from student — max 100 chars>"
    }
  ],
  "examiner_comment": "<overall comment — no line breaks — max 300 chars>",
  "key_improvement": "<single most important improvement — no line breaks — max 150 chars>"
}

Return ONLY the JSON object. No preamble, no explanation, no markdown fences.`;

  try {
    const raw = await callGemini(prompt, null, 4096);
    const data = parseMarkingJSON(raw);
    renderMarkingResults(data);
  } catch (err) {
    if (generating) {
      generating.innerHTML = `<span style="color:var(--danger)">Marking failed: ${err.message}. Please try again.</span>`;
    }
  }
}

function parseMarkingJSON(raw) {
  // Step 1: strip markdown fences
  let text = raw.replace(/```json/gi, '').replace(/```/g, '').trim();

  // Step 2: extract just the JSON object — find first { and last }
  const start = text.indexOf('{');
  const end   = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in response.');
  text = text.slice(start, end + 1);

  // Step 3: attempt direct parse
  try {
    return JSON.parse(text);
  } catch (e1) {
    // Step 4: aggressive cleaning — fix common Gemini JSON breakage

    // Remove control characters except \n and \t
    text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Fix unescaped newlines inside string values
    // Replace literal newlines inside quoted strings with \n
    text = text.replace(/"((?:[^"\\]|\\.)*)"/g, (match, inner) => {
      const fixed = inner
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      return `"${fixed}"`;
    });

    try {
      return JSON.parse(text);
    } catch (e2) {
      // Step 5: last resort — manually reconstruct from what we can extract
      return extractMarkingDataManually(raw);
    }
  }
}

function extractMarkingDataManually(raw) {
  // If JSON is totally broken, pull out what we can with regex
  // and build a valid object so the user at least sees something
  const totalMatch      = raw.match(/"total_score"\s*:\s*(\d+)/);
  const maxMatch        = raw.match(/"total_max"\s*:\s*(\d+)/);
  const descriptorMatch = raw.match(/"descriptor_level"\s*:\s*"([^"]+)"/);
  const examinerMatch   = raw.match(/"examiner_comment"\s*:\s*"([\s\S]*?)(?:"|,\s*"key_improvement)/);
  const improvementMatch= raw.match(/"key_improvement"\s*:\s*"([^"]+)"/);

  // Try to extract criteria array as raw text blocks
  const criteriaBlocks = [];
  const criteriaSection = raw.match(/"criteria"\s*:\s*\[([\s\S]*?)\]\s*[,}]/);
  if (criteriaSection) {
    const nameMatches = [...criteriaSection[1].matchAll(/"name"\s*:\s*"([^"]+)"/g)];
    const scoreMatches= [...criteriaSection[1].matchAll(/"score"\s*:\s*(\d+)/g)];
    const maxMatches  = [...criteriaSection[1].matchAll(/"max"\s*:\s*(\d+)/g)];
    const descMatches = [...criteriaSection[1].matchAll(/"descriptor"\s*:\s*"([^"]+)"/g)];
    const commentMatches = [...criteriaSection[1].matchAll(/"comment"\s*:\s*"([\s\S]*?)(?:"|,"evidence")/g)];

    nameMatches.forEach((nm, i) => {
      criteriaBlocks.push({
        name:       nm[1],
        score:      parseInt(scoreMatches[i]?.[1] || '0'),
        max:        parseInt(maxMatches[i]?.[1]  || '6'),
        descriptor: descMatches[i]?.[1]    || '',
        comment:    commentMatches[i]?.[1]?.replace(/\\n/g, ' ') || 'See examiner comment below.',
        evidence:   ''
      });
    });
  }

  const maxTotal = STATE.course === 'literature' ? 30 : 40;

  return {
    total_score:      parseInt(totalMatch?.[1] || '0'),
    total_max:        parseInt(maxMatch?.[1]   || String(maxTotal)),
    descriptor_level: descriptorMatch?.[1]     || 'Unable to determine',
    criteria:         criteriaBlocks.length ? criteriaBlocks : [],
    examiner_comment: examinerMatch?.[1]?.replace(/\\n/g, ' ') || raw.slice(0, 600).replace(/[{}[\]"]/g, '') + '...',
    key_improvement:  improvementMatch?.[1] || 'Please re-run marking for detailed feedback.'
  };
}

function buildLiteratureMarkingKeyText() {
  return LITERATURE_MARKING_KEY.criteria.map(c =>
    `CRITERION: ${c.name} (/${c.max_marks})\n` +
    c.descriptors.map(d => `  ${d.marks}: ${d.description}`).join('\n')
  ).join('\n\n');
}

function buildEnglishMarkingKeyText() {
  return ENGLISH_MARKING_KEY.criteria.map(c =>
    `CRITERION: ${c.name} (/${c.max_marks})\n` +
    c.descriptors.map(d => `  ${d.marks}: ${d.description}`).join('\n')
  ).join('\n\n');
}

function buildEnglishExemplarText() {
  const all = [
    ...ENGLISH_EXEMPLARS.responding,
    ...ENGLISH_EXEMPLARS.composing
  ];
  return all.map(e =>
    `${e.title} (~${e.approximate_mark}): ${e.high_band_features?.join('; ')}`
  ).join('\n');
}

function renderMarkingResults(data) {
  const generating = $('results-generating');
  const scoreBlock = $('results-score-block');

  if (generating) generating.classList.remove('visible');

  // Score
  $('results-score-value').textContent = data.total_score ?? '—';
  $('results-score-denom').textContent = `/ ${data.total_max ?? (STATE.course === 'literature' ? 30 : 40)}`;
  $('results-descriptor-badge').textContent = data.descriptor_level || '—';

  // Meta
  $('results-course-label').textContent = STATE.course === 'literature' ? 'Literature ATAR' : 'English ATAR';
  $('results-task-label').textContent = STATE.mode === 'practice'
    ? 'Practice Question'
    : 'Free Writing';

  // Descriptor badge colour by level
  const badge = $('results-descriptor-badge');
  if (badge && data.descriptor_level) {
    const level = data.descriptor_level.toLowerCase();
    if (level.includes('excellent') || level.includes('sophisticated') || level.includes('high'))
      badge.style.background = 'var(--sage-pale)', badge.style.color = 'var(--sage)', badge.style.borderColor = 'var(--sage)';
    else if (level.includes('proficient') || level.includes('comprehensive') || level.includes('discerning'))
      badge.style.background = 'var(--accent-pale)', badge.style.color = 'var(--accent)', badge.style.borderColor = 'var(--accent)';
    else
      badge.style.background = 'var(--bg-sunken)', badge.style.color = 'var(--ink-muted)', badge.style.borderColor = 'var(--ink-rule)';
  }

  if (scoreBlock) scoreBlock.classList.add('visible');

  // Criterion cards
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
        </div>
      `;
      criteriaList.appendChild(details);
    });
  }

  // Examiner comment
  const examinerEl = $('examiner-comment');
  if (examinerEl) examinerEl.textContent = data.examiner_comment || '';

  // Key improvement note
  if (data.key_improvement) {
    const overall = $('results-overall');
    if (overall) {
      const note = document.createElement('div');
      note.style.cssText = 'background:var(--bg-warm);border:var(--border-card);border-radius:var(--r-lg);padding:var(--space-4);margin-top:var(--space-4);font-size:0.875rem;color:var(--ink-soft);';
      note.innerHTML = `<strong style="color:var(--accent)">Key improvement:</strong> ${escapeHtml(data.key_improvement)}`;
      overall.appendChild(note);
    }
  }

  // Top band button
  $('topband-generate-btn')?.addEventListener('click', generateTopBandExample, { once: true });

  // Download
  $('results-download-btn')?.addEventListener('click', () => downloadMarkingReport(data));
  $('results-new-session-btn')?.addEventListener('click', resetToStart);
}

/* ============================================================
   19. TOP-BAND EXAMPLE
   ============================================================ */

async function generateTopBandExample() {
  const promptWrap   = $('topband-prompt-wrap');
  const content      = $('topband-content');
  const generating   = $('topband-generating');
  const textEl       = $('topband-text');
  const annotations  = $('topband-annotations');

  if (promptWrap) promptWrap.style.display = 'none';
  if (content)    content.classList.add('visible');
  if (generating) generating.classList.add('visible');

  const conceptsList = STATE.course === 'literature'
    ? LITERATURE_SYLLABUS_CONCEPTS.slice(0, 6).map(c => c.concept).join(', ')
    : ENGLISH_SYLLABUS_CONCEPTS.shared.map(c => c.concept).join(', ');

  const prompt = `${GEMINI_PROMPTS.top_band_example}

COURSE: ${STATE.course === 'literature' ? 'English Literature ATAR' : 'English ATAR'}
${STATE.course === 'literature' ? `TEXT: "${STATE.textTitle}" by ${STATE.textAuthor}` : `SECTION: ${STATE.section || 'responding'}`}
QUESTION: ${STATE.currentQuestion || 'General practice'}
KEY CONCEPTS TO DEMONSTRATE: ${conceptsList}

Format your response as:
PARAGRAPH:
[the model paragraph here]

ANNOTATION 1: [what makes it top-band — specific technique 1]
ANNOTATION 2: [what makes it top-band — specific technique 2]
ANNOTATION 3: [what makes it top-band — specific technique 3]`;

  try {
    const result = await callGemini(prompt);
    const paraMatch  = result.match(/PARAGRAPH:\s*([\s\S]*?)(?=ANNOTATION 1:|$)/i);
    const ann1Match  = result.match(/ANNOTATION 1:\s*([\s\S]*?)(?=ANNOTATION 2:|$)/i);
    const ann2Match  = result.match(/ANNOTATION 2:\s*([\s\S]*?)(?=ANNOTATION 3:|$)/i);
    const ann3Match  = result.match(/ANNOTATION 3:\s*([\s\S]*?)$/i);

    const para = paraMatch?.[1]?.trim() || result;
    const anns = [ann1Match?.[1]?.trim(), ann2Match?.[1]?.trim(), ann3Match?.[1]?.trim()].filter(Boolean);

    if (generating) generating.classList.remove('visible');
    if (textEl)     textEl.textContent = para;

    if (annotations) {
      annotations.innerHTML = anns.map((a, i) => `
        <div class="topband-annotation">
          <span class="topband-annotation-marker">${i + 1}</span>
          <span>${escapeHtml(a)}</span>
        </div>
      `).join('');
    }

  } catch (err) {
    if (generating) {
      generating.innerHTML = `<span style="color:var(--danger)">Could not generate example: ${err.message}</span>`;
    }
  }
}

/* ============================================================
   20. DOWNLOAD
   ============================================================ */

function downloadResponse() {
  const content = $('writing-area')?.innerText || loadDraft() || '';
  const filename = `ScriptSense_${STATE.course}_${STATE.mode}_${new Date().toLocaleDateString('en-AU').replace(/\//g, '-')}.txt`;
  downloadText(content, filename);
}

function downloadMarkingReport(data) {
  const essay = loadDraft() || '';
  const lines = [
    `SCRIPTSENSE — MARKING REPORT`,
    `Generated: ${new Date().toLocaleString('en-AU')}`,
    `Course: ${STATE.course === 'literature' ? 'English Literature ATAR' : 'English ATAR'}`,
    `Mode: ${STATE.mode === 'practice' ? 'Practice Question' : 'Free Writing'}`,
    `Question: ${STATE.currentQuestion || 'N/A'}`,
    '',
    `TOTAL MARK: ${data.total_score} / ${data.total_max}`,
    `DESCRIPTOR: ${data.descriptor_level}`,
    '',
    '─────────────────────────────────────',
    'CRITERION BY CRITERION',
    '─────────────────────────────────────',
    ...(data.criteria || []).flatMap(c => [
      `${c.name}: ${c.score}/${c.max} — ${c.descriptor}`,
      c.comment,
      c.evidence ? `Evidence: "${c.evidence}"` : '',
      ''
    ]),
    '─────────────────────────────────────',
    'EXAMINER\'S COMMENT',
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

  const filename = `ScriptSense_Report_${new Date().toLocaleDateString('en-AU').replace(/\//g, '-')}.txt`;
  downloadText(lines.join('\n'), filename);
}

function downloadText(content, filename) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast('File downloaded.', 'success');
}

function downloadAndExit() {
  downloadResponse();
  setTimeout(resetToStart, 800);
}

/* ============================================================
   21. RESET
   ============================================================ */

function resetToStart() {
  // Clear timers
  clearInterval(STATE.timerInterval);
  clearInterval(STATE.autosaveInterval);
  clearInterval(STATE.reviewInterval);

  // Reset state (keep API key)
  const key = STATE.apiKey;
  Object.keys(STATE).forEach(k => STATE[k] = null);
  STATE.apiKey      = key;
  STATE.quoteBank   = [];
  STATE.pendingSuggestions = [];
  STATE.timerSeconds = 0;
  STATE.stopwatchSeconds = 0;

  // Clear editor
  const area = $('writing-area');
  if (area) area.innerText = '';

  // Clear suggestion overlay
  const overlay = $('suggestion-overlay');
  if (overlay) overlay.innerHTML = '';

  // Clear suggestions list
  const suggList = $('suggestions-list');
  if (suggList) suggList.innerHTML = '';

  // Close any open panels/modals
  closeModal('modal-text-setup');
  closeModal('modal-confirm-end');
  $('skills-panel')?.classList.remove('open');
  hideFeedbackWidget();

  // Clear results
  $('criteria-list').innerHTML = '';
  $('examiner-comment').textContent = '';
  $('topband-text').textContent = '';
  $('topband-annotations').innerHTML = '';
  $('topband-content')?.classList.remove('visible');
  $('topband-prompt-wrap').style.display = '';
  $('results-score-block')?.classList.remove('visible');
  $('results-generating')?.classList.remove('visible');

  // Reset question header
  $('question-generating').style.display = 'flex';
  $('question-content')?.classList.remove('visible');
  $('question-actions')?.classList.remove('locked');
  $('question-text').textContent = '';
  $('question-header')?.classList.remove('visible');
  $('stimulus-header')?.classList.remove('visible');

  // Go back to course select
  showScreen('screen-course');
}

/* ============================================================
   22. RESULTS SCREEN BACK-COMPAT LISTENERS
   ============================================================ */

function initResultsScreen() {
  $('results-new-session-btn')?.addEventListener('click', resetToStart);
  $('results-download-btn')?.addEventListener('click', () => {
    const essay = loadDraft() || '';
    downloadText(essay, `ScriptSense_Response_${Date.now()}.txt`);
  });
}

/* ============================================================
   23. KEYBOARD SHORTCUTS
   ============================================================ */

function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Escape closes panels/modals
    if (e.key === 'Escape') {
      closeSkillsPanel();
      closeModal('modal-confirm-end');
      $('ai-toolbar')?.classList.remove('visible');
      hideFeedbackWidget();
    }

    // Ctrl+S / Cmd+S saves draft
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if ($('screen-editor')?.classList.contains('active')) {
        saveDraft();
        showToast('Draft saved.', 'success');
      }
    }
  });
}

/* ============================================================
   24. INIT
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initApiKeyScreen();
  initCourseSelect();
  initTextSetupModal();
  initModeSelect();
  initTimerSelect();
  initResultsScreen();
  initKeyboardShortcuts();

  // Show first screen
  showScreen('screen-apikey');

  // Focus API key input
  setTimeout(() => $('apikey-input')?.focus(), 300);
});
