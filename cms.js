/*
 * 한국유학 One Stop 서비스 — 관리 화면(CMS)
 *
 * index.html 의 '메뉴편집'을 누르면 이 파일을 불러옵니다.
 *  - 수정한 내용은 GitHub 저장소의 content.json 에 저장(게시)되고, 사이트는 열릴 때 이 파일을 읽어 반영합니다.
 *  - 업로드한 파일(이미지·PDF 등)은 저장소의 uploads/ 폴더에 저장됩니다.
 *  - GitHub Pages 기준으로 게시 후 1~2분 뒤 실제 사이트에 반영됩니다.
 *  - 게시·업로드에는 이 저장소에 쓰기 권한이 있는 GitHub 토큰이 필요합니다([시작하기] 탭 안내 참고).
 *  - 게시 전 수정 내용은 이 브라우저에 자동으로 임시저장됩니다.
 *
 * index.html 에서 사용하는 것: I18N, BASE_I18N, KO_OVERRIDE, i18nTexts, i18nBlocks, i18nAttrs, i18nNorm,
 *   translateText, t, L, LISTS, DEFAULT_LISTS, applySiteContent, SITE_CONTENT, siteContentReady,
 *   bannerSlides, bannerGo, bannerPaused, resetSlideTimer, 페이지 이동 함수들(showHome, openPage ...)
 */
(function () {
  'use strict';

  const DRAFT_KEY = 'cms-draft';
  const CONN_KEY = 'cms-github';
  const CONTENT_PATH = 'content.json';
  const UPLOAD_DIR = 'uploads';
  const MAX_UPLOAD = 25 * 1024 * 1024;
  const SITE_LANGS = [['zh', '中文'], ['en', 'English'], ['ko', '한국어']];
  const LANG_LABEL = { zh: '中文', en: 'English', ko: '한국어' };

  /* ---------- 목록 종류와 입력 항목 ---------- */
  const THUMB_COLORS = [['blue', '파랑'], ['green', '초록'], ['orange', '주황']];
  const LIST_SCHEMAS = {
    notices: {
      label: '공지사항', page: '메인 화면 오른쪽',
      summary: it => ko(it.text),
      fields: [
        { key: 'badge', label: '말머리', type: 'i18n' },
        { key: 'style', label: '말머리 색', type: 'select', options: [['blue', '파랑'], ['green', '초록']] },
        { key: 'text', label: '제목', type: 'i18n', required: true },
        { key: 'link', label: '링크 (선택) — 주소를 입력하거나 파일을 올리세요', type: 'file' },
      ],
    },
    news: {
      label: '유학뉴스', page: '메인 화면 입학 주요자료',
      summary: it => ko(it.title),
      fields: [
        { key: 'icon', label: '아이콘', type: 'select', options: [['newspaper', '신문'], ['file-signature', '문서'], ['question-circle', '물음표'], ['bullhorn', '확성기'], ['calendar-alt', '달력'], ['graduation-cap', '학사모'], ['passport', '여권']] },
        { key: 'title', label: '제목', type: 'i18n', required: true },
        { key: 'meta', label: '분류 표시 (예: 2027 외국인전형)', type: 'i18n' },
        { key: 'link', label: '링크 (선택) — 주소를 입력하거나 파일을 올리세요', type: 'file' },
      ],
    },
    resources: {
      label: '입학정보자료실', page: '입학정보자료 페이지',
      summary: it => ko(it.title),
      fields: [
        { key: 'title', label: '제목', type: 'i18n', required: true },
        { key: 'file', label: '첨부파일 (올리면 제목 아래 파일 이름이 다운로드 링크가 됩니다)', type: 'file' },
        { key: 'fileName', label: '첨부파일 표시 이름', type: 'i18n' },
        { key: 'thumb', label: '표지 글자 (줄바꿈 가능)', type: 'i18n', multiline: true },
        { key: 'color', label: '표지 색', type: 'select', options: THUMB_COLORS },
        { key: 'image', label: '표지 이미지 (선택 — 올리면 표지 글자 대신 이미지 표시)', type: 'file', accept: 'image/*' },
        { key: 'year', label: '학년도 (예: 2027, 공통)', type: 'i18n' },
        { key: 'tags', label: '분류', type: 'i18n' },
        { key: 'team', label: '작성 부서', type: 'i18n' },
        { key: 'date', label: '게시일', type: 'date' },
      ],
    },
    adm: {
      label: '전형정보 표', page: '전형정보 페이지',
      summary: it => `${ko(it.univ)} / ${ko(it.dept)}`,
      fields: [
        { key: 'univ', label: '대학명 (예: 고려대학교[본교])', type: 'i18n', required: true },
        { key: 'dept', label: '학과명', type: 'i18n' },
        { key: 'region', label: '지역', type: 'i18n' },
        { key: 'spring', label: '봄학기 경쟁률', type: 'text' },
        { key: 'fall', label: '가을학기 경쟁률', type: 'text' },
        { key: 'count', label: '모집인원', type: 'text' },
        { key: 'file', label: '모집요강 파일 (선택 — 올리면 [모집요강·평가기준] 버튼에 연결)', type: 'file' },
      ],
    },
    univ: {
      label: '대학 목록', page: '대학정보 페이지',
      summary: it => ko(it.name),
      fields: [
        { key: 'name', label: '대학명 (예: 고려대학교[본교])', type: 'i18n', required: true },
        { key: 'region', label: '지역', type: 'i18n' },
        { key: 'su', label: '봄학기 경쟁률', type: 'text' },
        { key: 'jeong', label: '가을학기 경쟁률', type: 'text' },
        { key: 'capacity', label: '입학정원', type: 'number' },
        { key: 'dept', label: '설치학과 수', type: 'number' },
        { key: 'adm', label: '전형 수', type: 'number' },
      ],
    },
    dept: {
      label: '학과 목록', page: '학과정보 페이지',
      summary: it => `${ko(it.dept)} / ${ko(it.univ)}`,
      fields: [
        { key: 'dept', label: '학과명', type: 'i18n', required: true },
        { key: 'univ', label: '대학명 (예: 고려대학교 [본교])', type: 'i18n' },
        { key: 'region', label: '지역', type: 'i18n' },
        { key: 'su', label: '봄학기 경쟁률', type: 'text' },
        { key: 'jeong', label: '가을학기 경쟁률', type: 'text' },
        { key: 'capacity', label: '입학정원', type: 'number' },
      ],
    },
  };

  /* 편집 모드 도구 막대의 '페이지 이동' */
  const closeModals = () => { closeGuideModal(); closeNoviceGuide(); closeDocsGuide(); closeMenu(); };
  const NAV_TARGETS = [
    ['메인 화면', () => showHome()],
    ...[0, 1, 2, 3, 4, 5, 6].map(i => [`메인 배너 ${i + 1}`, () => { showHome(); bannerGo(i); }]),
    ['메인 (로그인 전 사이드바)', () => { logoutUser(); showHome(); }],
    ['메인 (로그인 후 사이드바)', () => loginUser()],
    ['직업정보', () => openJobModal()],
    ['대학정보', () => openPage('univOverlay')],
    ['학과정보', () => openPage('deptOverlay')],
    ['전형정보', () => openPage('admOverlay')],
    ['대학별 입학요건', () => openPage('univGradeOverlay')],
    ['고교 성적', () => openPage('gradeOverlay')],
    ['입학정보자료실', () => openPage('dataOverlay')],
    ['자기소개서·면접 상담', () => openPage('compOverlay')],
    ['온라인입학상담', () => openPage('consultOverlay')],
    ['로그인', () => openPage('loginOverlay')],
    ['자격요건 가이드 (팝업)', () => openGuideModal()],
    ['초보자 가이드 (팝업)', () => openNoviceGuide()],
    ['서류준비 가이드 (팝업)', () => openDocsGuide()],
    ['전체메뉴 (팝업)', () => { document.getElementById('menuOverlay').classList.add('open'); }],
  ];

  /* ---------- 상태 ---------- */
  let ready = null;        // 초기화 Promise
  let published = {};      // 게시된 내용 (content.json)
  let working = {};        // 편집 중인 내용
  let baseHash = '';       // 편집을 시작할 때의 게시본 지문 (다른 곳에서 게시했는지 확인용)
  let conn = null;        // { owner, repo, branch, token } — 아래 loadConn() 에서 읽음
  let editing = false;
  let panelTab = 'home';
  let listTab = 'notices';
  let textQuery = '', textFilter = 'all', textLimit = 100;
  let useCounts = null;
  const dialogs = [];

  /* ---------- 공통 도구 ---------- */
  const clone = o => JSON.parse(JSON.stringify(o == null ? {} : o));
  function stable(v) {
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
    return JSON.stringify(v);
  }
  function hash(content) {
    const c = clone(content); delete c.updatedAt; delete c.version;
    const s = stable(c);
    let x = 5381;
    for (let i = 0; i < s.length; i++) x = (x * 33 + s.charCodeAt(i)) >>> 0;
    return x.toString(36) + ':' + s.length;
  }
  /* 목록 값의 한국어 표시 */
  function ko(v) {
    if (v == null) return '';
    if (typeof v === 'object') return v.ko || '';
    const key = i18nNorm(String(v));
    return KO_OVERRIDE[key] != null ? KO_OVERRIDE[key] : String(v);
  }
  const hasHangul = s => /[가-힣]/.test(s);
  const fmtSize = n => n >= 1048576 ? (n / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(n / 1024)) + 'KB';
  const storage = name => { try { return window[name]; } catch (e) { return null; } };

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    kids.flat(Infinity).forEach(c => { if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c))); });
    return el;
  }

  function toast(msg, type) {
    let box = document.getElementById('cms-toast');
    if (!box) { box = h('div', { id: 'cms-toast', 'data-cms-ui': '', translate: 'no' }); document.body.append(box); }
    const el = h('div', { class: 'cms-toast ' + (type || '') }, msg);
    box.append(el);
    setTimeout(() => el.remove(), type === 'error' ? 7000 : 3500);
  }
  function busy(msg) {
    let el = document.getElementById('cms-busy');
    if (!msg) { if (el) el.remove(); return; }
    if (!el) { el = h('div', { id: 'cms-busy', 'data-cms-ui': '', translate: 'no' }); document.body.append(el); }
    el.textContent = msg;
  }

  function dialog(title, body, buttons, opts) {
    opts = opts || {};
    const back = h('div', { class: 'cms-dlg-back', 'data-cms-ui': '', translate: 'no' });
    const close = () => { back.remove(); const i = dialogs.indexOf(close); if (i >= 0) dialogs.splice(i, 1); };
    back.append(h('div', { class: 'cms-dlg' + (opts.wide ? ' wide' : '') },
      h('div', { class: 'cms-dlg-head' }, title, h('button', { class: 'cms-x', title: '닫기', onclick: close }, '✕')),
      h('div', { class: 'cms-dlg-body' }, body),
      h('div', { class: 'cms-dlg-foot' }, buttons.filter(Boolean).map(b =>
        h('button', { class: 'cms-btn ' + (b.cls || ''), onclick: () => b.onClick(close) }, b.label)))));
    back.addEventListener('mousedown', e => { if (e.target === back) close(); });
    document.body.append(back);
    dialogs.push(close);
    return { close, el: back };
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && dialogs.length) { e.stopImmediatePropagation(); dialogs[dialogs.length - 1](); }
  }, true);

  /* ---------- 임시저장 / 변경 확인 ---------- */
  function diffList() {
    const out = [], a = working, b = published;
    const at = a.texts || {}, bt = b.texts || {};
    new Set([...Object.keys(at), ...Object.keys(bt)]).forEach(k => { if (stable(at[k]) !== stable(bt[k])) out.push('문구: ' + k); });
    Object.keys(LIST_SCHEMAS).forEach(n => {
      if (stable((a.lists || {})[n]) !== stable((b.lists || {})[n])) out.push('목록: ' + LIST_SCHEMAS[n].label);
    });
    if (stable(a.banners || {}) !== stable(b.banners || {})) out.push('배너 설정');
    if (stable(a.media || []) !== stable(b.media || [])) out.push('파일 목록');
    return out;
  }
  function readDraft() {
    const st = storage('localStorage');
    try { return st && JSON.parse(st.getItem(DRAFT_KEY)); } catch (e) { return null; }
  }
  function saveDraft() {
    const st = storage('localStorage');
    if (!st) return;
    try {
      if (diffList().length) st.setItem(DRAFT_KEY, JSON.stringify({ baseHash, content: working, savedAt: new Date().toISOString() }));
      else st.removeItem(DRAFT_KEY);
    } catch (e) { toast('임시저장 공간이 부족합니다. 게시하거나 백업해 주세요.', 'warn'); }
  }
  function applyWorking() {
    applySiteContent(working);
    saveDraft();
    refreshStatus();
  }

  /* ---------- GitHub 연결 ---------- */
  function defaultRepo() {
    const m = location.hostname.match(/^([^.]+)\.github\.io$/i);
    if (m) {
      const seg = location.pathname.split('/').filter(Boolean)[0];
      return { owner: m[1], repo: seg && !/\.html?$/i.test(seg) ? seg : m[1] + '.github.io' };
    }
    return { owner: 'obyungsu-png', repo: 'koreaallmyexam2' };
  }
  function loadConn() {
    for (const name of ['localStorage', 'sessionStorage']) {
      const st = storage(name);
      try { const c = st && JSON.parse(st.getItem(CONN_KEY)); if (c && c.token) return c; } catch (e) { /* 무시 */ }
    }
    return null;
  }
  function saveConn(c, remember) {
    ['localStorage', 'sessionStorage'].forEach(name => { const st = storage(name); try { st && st.removeItem(CONN_KEY); } catch (e) { /* 무시 */ } });
    const st = storage(remember ? 'localStorage' : 'sessionStorage');
    try { if (c && st) st.setItem(CONN_KEY, JSON.stringify(c)); } catch (e) { /* 무시 */ }
    conn = c;
  }
  conn = loadConn();

  const API = 'https://api.github.com';
  function ghErrorText(status, detail) {
    if (status === 401) return '토큰이 올바르지 않거나 만료되었습니다. 새 토큰으로 다시 연결해 주세요.';
    if (status === 403) return '권한이 없습니다. 토큰에 이 저장소의 Contents 쓰기(Read and write) 권한이 있는지 확인해 주세요.' + (detail ? ` (${detail})` : '');
    if (status === 404) return '저장소를 찾을 수 없습니다. 저장소 이름과, 토큰을 만들 때 이 저장소를 선택했는지 확인해 주세요.';
    if (status === 409 || status === 422) return '다른 곳에서 먼저 저장되어 충돌했습니다. 잠시 후 다시 시도해 주세요.' + (detail ? ` (${detail})` : '');
    return `GitHub 오류 (${status}) ${detail || ''}`;
  }
  async function gh(method, path, body) {
    if (!conn) throw new Error('먼저 [시작하기]에서 GitHub에 연결해 주세요.');
    let res;
    try {
      res = await fetch(API + path, {
        method,
        cache: 'no-store',
        headers: Object.assign({ Authorization: 'Bearer ' + conn.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
          body ? { 'Content-Type': 'application/json' } : {}),
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw new Error('GitHub에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.');
    }
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.json()).message || ''; } catch (e) { /* 무시 */ }
      const err = new Error(ghErrorText(res.status, detail));
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  }
  const repoApi = () => `/repos/${encodeURIComponent(conn.owner)}/${encodeURIComponent(conn.repo)}`;
  const contentsApi = p => `${repoApi()}/contents/${p.split('/').map(encodeURIComponent).join('/')}`;
  async function getFile(path) {
    try { return await gh('GET', contentsApi(path) + '?ref=' + encodeURIComponent(conn.branch)); }
    catch (e) { if (e.status === 404) return null; throw e; }
  }
  const putFile = (path, b64, message, sha) =>
    gh('PUT', contentsApi(path), Object.assign({ message, content: b64, branch: conn.branch }, sha ? { sha } : {}));

  function utf8ToB64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function b64ToUtf8(b64) {
    const bin = atob(b64.replace(/\s/g, ''));
    return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
  }
  const fileToB64 = file => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(new Error('파일을 읽지 못했습니다.'));
    r.readAsDataURL(file);
  });
  async function readContentFile(f) {
    const text = f.encoding === 'base64' && f.content ? b64ToUtf8(f.content) : await (await fetch(f.download_url, { cache: 'no-store' })).text();
    return JSON.parse(text || '{}');
  }

  async function connect(c, remember) {
    const prev = conn;
    conn = c;
    try {
      const repo = await gh('GET', repoApi());
      if (repo.permissions && repo.permissions.push === false) throw new Error('이 계정은 저장소에 쓰기 권한이 없습니다.');
      if (!c.branch) c.branch = repo.default_branch || 'main';
      saveConn(c, remember);
      await syncFromGitHub();
      toast('GitHub에 연결했습니다.', 'ok');
    } catch (e) {
      conn = prev;
      throw e;
    }
  }
  /* GitHub의 최신 게시본을 기준으로 삼음 (수정 중인 내용이 없으면 화면도 최신으로) */
  async function syncFromGitHub() {
    const f = await getFile(CONTENT_PATH);
    const content = f ? await readContentFile(f) : {};
    const pending = diffList().length > 0;
    published = content;
    if (!pending) {
      working = clone(content);
      baseHash = hash(content);
      applyWorking();
    } else if (hash(content) !== baseHash) {
      toast('수정을 시작한 뒤 다른 곳에서 게시된 내용이 있습니다. 게시하면 그 내용을 덮어씁니다.', 'warn');
    }
    refreshStatus();
    if (panelVisible()) renderPanel();
  }

  /* ---------- 게시 ---------- */
  async function publish() {
    if (!conn) { openPanel('home'); toast('게시하려면 먼저 GitHub에 연결해 주세요.', 'warn'); return; }
    if (!diffList().length) { toast('게시할 변경사항이 없습니다.'); return; }
    busy('게시하는 중…');
    try {
      const remote = await getFile(CONTENT_PATH);
      const remoteContent = remote ? await readContentFile(remote) : {};
      if (hash(remoteContent) !== baseHash &&
          !confirm('수정을 시작한 뒤 다른 곳에서 먼저 게시된 내용이 있습니다.\n지금 게시하면 그 내용을 덮어씁니다. 계속할까요?')) return;
      const next = Object.assign(clone(working), { version: 1, updatedAt: new Date().toISOString() });
      await putFile(CONTENT_PATH, utf8ToB64(JSON.stringify(next, null, 2) + '\n'), 'CMS: 사이트 내용 게시', remote && remote.sha);
      published = clone(next);
      working = clone(next);
      baseHash = hash(next);
      saveDraft();
      refreshStatus();
      if (panelVisible()) renderPanel();
      toast('게시했습니다. 1~2분 뒤 실제 사이트에 반영됩니다.', 'ok');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      busy(null);
    }
  }

  /* ---------- 파일 업로드 ---------- */
  function safeFileName(name) {
    const dot = name.lastIndexOf('.');
    const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    const base = (dot > 0 ? name.slice(0, dot) : name).normalize('NFKD').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'file';
    return ext ? `${base}.${ext}` : base;
  }
  function stamp() {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  }
  function pickFiles(accept, multiple) {
    return new Promise(resolve => {
      const input = h('input', { type: 'file', accept: accept || null, multiple: multiple || null, style: 'display:none' });
      input.addEventListener('change', () => { resolve([...input.files]); input.remove(); });
      document.body.append(input);
      input.click();
    });
  }
  async function uploadFile(file) {
    if (!conn) throw new Error('파일을 올리려면 먼저 [시작하기]에서 GitHub에 연결해 주세요.');
    if (file.size > MAX_UPLOAD) throw new Error(`${file.name}: 25MB 이하 파일만 올릴 수 있습니다.`);
    const path = `${UPLOAD_DIR}/${stamp()}-${safeFileName(file.name)}`;
    await putFile(path, await fileToB64(file), `CMS: 파일 업로드 - ${file.name}`);
    window.CMS_PREVIEW = window.CMS_PREVIEW || {};
    window.CMS_PREVIEW[path] = URL.createObjectURL(file); // 사이트에 반영되기 전 미리보기
    working.media = (working.media || []).concat({ path, name: file.name, size: file.size, type: file.type || '', uploadedAt: new Date().toISOString() });
    applyWorking();
    return path;
  }
  async function uploadFiles(files) {
    const paths = [];
    for (const [i, f] of files.entries()) {
      busy(`파일 올리는 중… (${i + 1}/${files.length}) ${f.name}`);
      try { paths.push(await uploadFile(f)); } catch (e) { toast(e.message, 'error'); }
    }
    busy(null);
    if (paths.length) toast(`파일 ${paths.length}개를 올렸습니다. 게시 후 1~2분 뒤 사이트에서 열립니다.`, 'ok');
    return paths;
  }
  const isImage = m => /^image\//.test(m.type) || /\.(png|jpe?g|gif|webp|svg)$/i.test(m.path);
  function pickMedia(accept) {
    return new Promise(resolve => {
      const media = (working.media || []).filter(m => accept !== 'image/*' || isImage(m)).slice().reverse();
      const body = media.length
        ? h('div', {}, media.map(m => h('button', { class: 'cms-opt', onclick: () => { d.close(); resolve(m.path); } },
            isImage(m) ? h('img', { class: 'cms-thumb', src: mediaUrl(m.path), alt: '' }) : '📄', ' ', m.name, h('span', { class: 'cms-muted' }, `  ${fmtSize(m.size)} · ${m.path}`))))
        : h('p', { class: 'cms-muted' }, '올린 파일이 없습니다. [파일 올리기]를 먼저 해 주세요.');
      const d = dialog('올린 파일에서 선택', body, [{ label: '닫기', onClick: c => { c(); resolve(null); } }]);
    });
  }

  /* 한국어를 바꿨는데 中文/English는 예전 번역 그대로이면 한 번 확인 */
  function confirmStale(stale) {
    if (!stale.length) return true;
    return confirm(`한국어를 바꿨지만 아래 번역은 예전 그대로입니다.\n- ${stale.join('\n- ')}\n\n그대로 적용할까요? ([취소]를 누르면 돌아가서 번역을 고칠 수 있습니다)`);
  }
  const staleLangs = (before, after) =>
    before.ko !== after.ko ? ['zh', 'en'].filter(l => after[l] && after[l] === before[l]).map(l => LANG_LABEL[l]) : [];

  /* ---------- 문구 편집 ---------- */
  function countUses() {
    if (useCounts) return useCounts;
    useCounts = new Map();
    const add = k => useCounts.set(k, (useCounts.get(k) || 0) + 1);
    i18nTexts.forEach(([, v]) => add(i18nNorm(v)));
    i18nAttrs.forEach(([, , v]) => add(i18nNorm(v)));
    i18nBlocks.forEach(([el]) => add(el.dataset.i18n));
    return useCounts;
  }
  function textInfo(key) {
    const block = i18nBlocks.find(([el]) => el.dataset.i18n === key);
    const baseKo = block ? block[1].trim() : key;
    const cur = KO_OVERRIDE[key] != null ? KO_OVERRIDE[key] : baseKo;
    const tr = (lang, dict) => { const v = translateText(key, lang, dict); return v == null ? '' : v; };
    return {
      isBlock: !!block, baseKo,
      values: { ko: cur, zh: tr('zh'), en: tr('en') },
      base: { ko: baseKo, zh: tr('zh', BASE_I18N), en: tr('en', BASE_I18N) },
      uses: countUses().get(key) || 0,
      edited: !!(working.texts && working.texts[key]),
    };
  }
  function allTextKeys() {
    const keys = new Set(countUses().keys());
    Object.keys(BASE_I18N).forEach(k => keys.add(k));
    Object.keys(working.texts || {}).forEach(k => keys.add(k));
    return [...keys];
  }
  function openTextEditor(key) {
    const info = textInfo(key);
    const areas = {};
    const body = h('div', {},
      h('div', { class: 'cms-key' }, h('b', {}, '원문: '), info.isBlock ? info.baseKo.replace(/<[^>]+>/g, ' ') : key),
      h('p', { class: 'cms-muted' }, info.uses > 1 ? `⚠️ 이 문구는 사이트 ${info.uses}곳에 쓰이고 있어, 모두 함께 바뀝니다.`
        : info.uses === 1 ? '이 문구는 사이트 1곳에 쓰입니다.' : '목록이나 스크립트(표·제목 등)에서 쓰이는 문구입니다.',
        info.isBlock ? ' 이 부분은 HTML 태그(<br> 줄바꿈, <strong> 굵게)를 쓸 수 있습니다.' : ''),
      SITE_LANGS.map(([lang, label]) => h('div', { class: 'cms-field' },
        h('label', {}, label, lang === currentLang ? h('span', { class: 'cms-badge' }, '지금 보는 언어') : ''),
        areas[lang] = h('textarea', { class: lang === currentLang ? 'cur' : '', rows: info.isBlock ? 5 : 2, placeholder: lang === 'ko' ? '' : '비워두면 한국어 문구가 그대로 표시됩니다' }, info.values[lang]))));
    dialog('문구 수정', body, [
      info.edited && { label: '처음 문구로 되돌리기', cls: 'danger left', onClick: close => { setText(key, null); close(); toast('처음 문구로 되돌렸습니다.'); } },
      { label: '취소', onClick: close => close() },
      { label: '적용', cls: 'primary', onClick: close => {
        const v = {};
        SITE_LANGS.forEach(([lang]) => { v[lang] = areas[lang].value.trim(); });
        if (!v.ko) { toast('한국어 문구는 비워둘 수 없습니다.', 'warn'); return; }
        if (!confirmStale(staleLangs(info.values, v))) return;
        const entry = {};
        if (v.ko !== info.base.ko) entry.ko = v.ko;
        if (v.zh && v.zh !== info.base.zh) entry.zh = v.zh;
        if (v.en && v.en !== info.base.en) entry.en = v.en;
        setText(key, Object.keys(entry).length ? entry : null);
        close();
        toast('적용했습니다. [게시하기]를 눌러야 실제 사이트에 반영됩니다.');
      } },
    ], { wide: info.isBlock });
    setTimeout(() => areas[currentLang] && areas[currentLang].focus(), 30);
  }
  function setText(key, entry) {
    working.texts = Object.assign({}, working.texts);
    if (entry) working.texts[key] = entry; else delete working.texts[key];
    applyWorking();
    if (panelVisible()) renderPanel();
  }

  /* ---------- 목록 항목 편집 ---------- */
  function i18nValue(v) {
    if (v && typeof v === 'object') return { ko: v.ko || '', zh: v.zh || '', en: v.en || '' };
    const s = v == null ? '' : String(v);
    const tr = lang => (s ? translateText(s, lang) || '' : '');
    return { ko: ko(s), zh: tr('zh'), en: tr('en') };
  }
  function fileField(f, value) {
    const input = h('input', { type: 'text', class: 'cms-input', value: value || '', placeholder: 'https://… 또는 uploads/… (비워둘 수 있음)' });
    const preview = h('div', { class: 'cms-preview' });
    const showPreview = () => {
      const v = input.value.trim();
      preview.innerHTML = '';
      if (v && (f.accept === 'image/*' || /\.(png|jpe?g|gif|webp|svg)$/i.test(v))) preview.append(h('img', { class: 'cms-thumb big', src: mediaUrl(v), alt: '' }));
      else if (v) preview.append(h('a', { href: mediaUrl(safeUrl(v)), target: '_blank', rel: 'noopener' }, '열어보기 ↗'));
    };
    input.addEventListener('input', showPreview);
    showPreview();
    const row = h('div', {},
      input,
      h('div', { class: 'cms-row', style: 'margin-top:6px' },
        h('button', { class: 'cms-btn sm', onclick: async () => {
          const files = await pickFiles(f.accept);
          if (!files.length) return;
          const [path] = await uploadFiles(files.slice(0, 1));
          if (path) { input.value = path; showPreview(); }
        } }, '파일 올리기'),
        h('button', { class: 'cms-btn sm', onclick: async () => { const p = await pickMedia(f.accept); if (p) { input.value = p; showPreview(); } } }, '올린 파일에서 선택'),
        h('button', { class: 'cms-btn sm', onclick: () => { input.value = ''; showPreview(); } }, '지우기')),
      preview);
    return { row, read: () => input.value.trim() };
  }
  function fieldRow(f, value) {
    let row, read;
    if (f.type === 'i18n') {
      const v = i18nValue(value), els = {};
      row = h('div', { class: 'cms-i18n' }, SITE_LANGS.map(([lang, label]) => [
        h('span', {}, label),
        els[lang] = f.multiline
          ? h('textarea', { rows: 3, placeholder: lang === 'ko' ? '' : '비워두면 한국어가 표시됩니다' }, v[lang])
          : h('input', { type: 'text', class: 'cms-input', value: v[lang], placeholder: lang === 'ko' ? '' : '비워두면 한국어가 표시됩니다' }),
      ]));
      read = () => {
        const out = { ko: els.ko.value.trim() };
        out.stale = staleLangs(v, { ko: out.ko, zh: els.zh.value.trim(), en: els.en.value.trim() }).map(l => `${f.label} (${l})`);
        if (els.zh.value.trim()) out.zh = els.zh.value.trim();
        if (els.en.value.trim()) out.en = els.en.value.trim();
        return out; // stale 은 확인용으로만 쓰고 저장 전에 지움
      };
    } else if (f.type === 'select') {
      const sel = h('select', { class: 'cms-input' }, f.options.map(([val, label]) => h('option', { value: val, selected: val === value || null }, label)));
      row = sel; read = () => sel.value;
    } else if (f.type === 'file') {
      ({ row, read } = fileField(f, value));
    } else {
      const input = h('input', { type: f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text', class: 'cms-input', value: value == null ? '' : value });
      row = input;
      read = () => (f.type === 'number' ? Number(input.value) || 0 : input.value.trim());
    }
    return { el: h('div', { class: 'cms-field' }, h('label', {}, f.label, f.required ? ' *' : ''), row), read };
  }
  function openItemEditor(name, index) {
    const schema = LIST_SCHEMAS[name];
    const isNew = index < 0;
    const item = isNew ? {} : clone(LISTS[name][index]);
    const rows = schema.fields.map(f => [f, fieldRow(f, item[f.key])]);
    dialog(`${schema.label} — ${isNew ? '새 항목 추가' : '항목 수정'}`, h('div', {}, rows.map(([, r]) => r.el)), [
      !isNew && { label: '이 항목 삭제', cls: 'danger left', onClick: close => {
        if (!confirm('이 항목을 삭제할까요?')) return;
        updateList(name, list => list.splice(index, 1));
        close();
      } },
      { label: '취소', onClick: close => close() },
      { label: isNew ? '추가' : '적용', cls: 'primary', onClick: close => {
        const next = Object.assign({}, item), stale = [];
        for (const [f, r] of rows) {
          const v = r.read();
          if (f.required && !(typeof v === 'object' ? v.ko : v)) { toast(`'${f.label}' 항목을 입력해 주세요.`, 'warn'); return; }
          if (v && v.stale) { stale.push(...v.stale); delete v.stale; }
          next[f.key] = v;
        }
        if (!confirmStale(stale)) return;
        updateList(name, list => { if (isNew) list.push(next); else list[index] = next; });
        close();
        toast('적용했습니다. [게시하기]를 눌러야 실제 사이트에 반영됩니다.');
      } },
    ], { wide: true });
  }
  function updateList(name, fn) {
    const list = clone(LISTS[name]);
    fn(list);
    working.lists = Object.assign({}, working.lists, { [name]: list });
    applyWorking();
    if (panelVisible()) renderPanel();
  }

  /* ---------- 배너 ---------- */
  function bannerTitle(i) {
    const el = bannerSlides()[i].querySelector('.banner-title');
    return el ? i18nNorm(el.textContent).slice(0, 40) : `배너 ${i + 1}`;
  }
  function setBanner(i, patch) {
    const banners = clone(working.banners || {});
    const b = Object.assign({}, banners[i], patch);
    Object.keys(b).forEach(k => { if (!b[k]) delete b[k]; });
    if (Object.keys(b).length) banners[i] = b; else delete banners[i];
    if (bannerSlides().every((s, j) => banners[j] && banners[j].hidden)) { toast('배너를 모두 숨길 수는 없습니다.', 'warn'); return false; }
    working.banners = banners;
    applyWorking();
    if (panelVisible()) renderPanel();
    return true;
  }
  async function uploadBannerImage(i) {
    const files = await pickFiles('image/*');
    if (!files.length) return;
    const [path] = await uploadFiles(files.slice(0, 1));
    if (path) setBanner(i, { image: path });
  }
  async function chooseBannerImage(i) {
    const p = await pickMedia('image/*');
    if (p) setBanner(i, { image: p });
  }
  function openBannerEditor(i) {
    const b = (working.banners || {})[i] || {};
    dialog(`메인 배너 ${i + 1} 설정`, h('div', {},
      h('p', { class: 'cms-muted' }, `“${bannerTitle(i)}”`),
      h('p', { class: 'cms-muted' }, '배너 글자는 편집 모드에서 글자를 직접 눌러 수정하세요. 배경 이미지를 올리면 기본 배경색 대신 이미지가 표시됩니다 (권장 크기 1600×600 이상).'),
      b.image ? h('img', { class: 'cms-thumb big', src: mediaUrl(b.image), alt: '' }) : h('p', { class: 'cms-muted' }, '배경 이미지: 없음 (기본 색상)')), [
      { label: b.hidden ? '배너 보이기' : '배너 숨기기', cls: 'left', onClick: close => { if (setBanner(i, { hidden: !b.hidden })) close(); } },
      b.image && { label: '이미지 지우기', cls: 'danger', onClick: close => { setBanner(i, { image: '' }); close(); } },
      { label: '올린 파일에서 선택', onClick: close => { close(); chooseBannerImage(i); } },
      { label: '이미지 올리기', cls: 'primary', onClick: close => { close(); uploadBannerImage(i); } },
    ]);
  }

  /* ---------- 편집 모드 (실제 화면에서 바로 수정) ---------- */
  let hl = null, toolbar = null, nodeKeys = null, moveFrame = 0;
  function startEditMode() {
    closePanel();
    if (editing) return;
    editing = true;
    nodeKeys = new Map(i18nTexts.map(([n, v]) => [n, i18nNorm(v)]));
    document.body.classList.add('cms-editing');
    bannerPaused = true;
    resetSlideTimer();
    hl = h('div', { id: 'cms-hl', 'data-cms-ui': '' }, h('span'));
    toolbar = h('div', { id: 'cms-toolbar', 'data-cms-ui': '', translate: 'no' },
      h('b', {}, '✏️ 편집 모드'),
      h('span', { class: 'cms-tb-hint' }, '글자·항목을 누르면 수정 · 아이콘을 누르면 이동'),
      h('select', { onchange: e => { const nav = NAV_TARGETS[e.target.value]; if (nav) { closeModals(); nav[1](); } e.target.value = ''; } },
        h('option', { value: '' }, '페이지 이동…'), NAV_TARGETS.map(([label], i) => h('option', { value: i }, label))),
      h('span', { class: 'cms-tb-count' }),
      h('button', { class: 'cms-btn primary', onclick: publish }, '게시하기'),
      h('button', { class: 'cms-btn', onclick: () => openPanel() }, '관리 화면'),
      h('button', { class: 'cms-btn', onclick: stopEditMode }, '편집 끝내기'));
    document.body.append(hl, toolbar);
    window.addEventListener('click', onEditClick, true);
    window.addEventListener('mousedown', onEditMouseDown, true);
    window.addEventListener('mousemove', onEditMove, true);
    window.addEventListener('scroll', hideHl, true);
    refreshStatus();
    toast('편집 모드를 시작했습니다. 수정할 글자를 눌러 보세요.');
  }
  function stopEditMode() {
    if (!editing) return;
    editing = false;
    window.removeEventListener('click', onEditClick, true);
    window.removeEventListener('mousedown', onEditMouseDown, true);
    window.removeEventListener('mousemove', onEditMove, true);
    window.removeEventListener('scroll', hideHl, true);
    if (hl) hl.remove();
    if (toolbar) toolbar.remove();
    hl = toolbar = null;
    document.body.classList.remove('cms-editing');
    bannerPaused = false;
    resetSlideTimer();
    refreshStatus();
  }
  const isCmsUi = el => el instanceof Element && !!el.closest('[data-cms-ui], .lang-switch');
  function textAt(x, y, el) {
    const hit = n => {
      if (!n || n.nodeType !== 3 || !n.nodeValue.trim()) return null;
      const r = document.createRange();
      r.selectNodeContents(n);
      for (const b of r.getClientRects()) if (x >= b.left - 1 && x <= b.right + 1 && y >= b.top - 1 && y <= b.bottom + 1) return { node: n, rect: r.getBoundingClientRect() };
      return null;
    };
    let node = null;
    if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); node = p && p.offsetNode; }
    else if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); node = r && r.startContainer; }
    let found = hit(node);
    if (found) return found;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const inside = [];
    let n;
    while ((n = walker.nextNode()) && inside.length < 200) {
      if ((found = hit(n))) return found;
      if (nodeKeys.has(n)) inside.push(n);
    }
    // 버튼처럼 글자 주변 여백을 눌렀을 때: 안에 문구가 하나뿐이면 그 문구
    if (inside.length === 1) { const r = document.createRange(); r.selectNodeContents(inside[0]); return { node: inside[0], rect: r.getBoundingClientRect() }; }
    return null;
  }
  /* 스크립트가 새로 그린 글자(가이드 제목 등)는 표시된 글자로 원문 키를 찾음 */
  function keyForShownText(text) {
    const s = i18nNorm(text);
    if (!s) return null;
    for (const k of Object.keys(I18N).concat(Object.keys(KO_OVERRIDE))) if (t(k) === s) return k;
    return null;
  }
  function resolveTarget(e) {
    const el = e.target;
    if (!(el instanceof Element) || isCmsUi(el)) return null;
    const item = el.closest('[data-cms-index]');
    const listEl = item && item.closest('[data-cms-list]');
    if (listEl && LIST_SCHEMAS[listEl.dataset.cmsList]) {
      const name = listEl.dataset.cmsList;
      return { kind: 'list', name, index: +item.dataset.cmsIndex, el: item, label: '목록: ' + LIST_SCHEMAS[name].label };
    }
    const sel = el.closest('select');
    if (sel) return { kind: 'select', el: sel, label: '선택 목록' };
    if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.hasAttribute('placeholder')) {
      const a = i18nAttrs.find(([x]) => x === el);
      if (a) return { kind: 'text', key: i18nNorm(a[2]), el, label: '입력칸 안내 문구' };
    }
    const block = el.closest('[data-i18n]');
    if (block) return { kind: 'text', key: block.dataset.i18n, el: block, label: '문단' };
    const hit = textAt(e.clientX, e.clientY, el);
    if (hit) {
      const key = nodeKeys.get(hit.node) || keyForShownText(hit.node.nodeValue);
      if (key) return { kind: 'text', key, rect: hit.rect, label: '문구' };
    }
    const slide = el.closest('.banner-slide');
    if (slide) return { kind: 'banner', index: bannerSlides().indexOf(slide), el: slide, label: '배너 설정 (이미지·숨김)' };
    return null;
  }
  function onEditClick(e) {
    if (isCmsUi(e.target)) return;
    const tg = resolveTarget(e);
    if (!tg) return; // 글자가 없는 곳(아이콘·화살표 등)은 평소처럼 동작
    e.preventDefault();
    e.stopPropagation();
    hideHl();
    if (tg.kind === 'list') openItemEditor(tg.name, tg.index);
    else if (tg.kind === 'select') openSelectEditor(tg.el);
    else if (tg.kind === 'banner') openBannerEditor(tg.index);
    else openTextEditor(tg.key);
  }
  function onEditMouseDown(e) {
    if (!isCmsUi(e.target) && resolveTarget(e)) e.preventDefault(); // 선택 목록 펼침·입력칸 포커스·글자 선택 방지
  }
  function onEditMove(e) {
    if (moveFrame) return;
    moveFrame = requestAnimationFrame(() => {
      moveFrame = 0;
      if (!hl || dialogs.length) { hideHl(); return; }
      const tg = resolveTarget(e);
      if (!tg) { hideHl(); return; }
      const r = tg.rect || tg.el.getBoundingClientRect();
      Object.assign(hl.style, { display: 'block', left: r.left - 3 + 'px', top: r.top - 3 + 'px', width: r.width + 6 + 'px', height: r.height + 6 + 'px' });
      hl.firstChild.textContent = tg.label;
    });
  }
  function hideHl() { if (hl) hl.style.display = 'none'; }
  function openSelectEditor(sel) {
    const opts = [...sel.options].map(o => [o, o.firstChild && nodeKeys.get(o.firstChild)]).filter(([, k]) => k);
    const d = dialog('선택 목록의 항목 수정', h('div', {},
      h('p', { class: 'cms-muted' }, '수정할 항목을 고르세요.'),
      opts.map(([o, k]) => h('button', { class: 'cms-opt', onclick: () => { d.close(); openTextEditor(k); } }, o.textContent))),
      [{ label: '닫기', onClick: c => c() }]);
  }

  /* ---------- 상태 표시 ---------- */
  let draftBar = null;
  function refreshStatus() {
    const n = diffList().length;
    document.querySelectorAll('.cms-count').forEach(el => {
      el.textContent = n ? `게시 안 된 변경 ${n}건` : '모두 게시됨';
      el.className = 'cms-count cms-chip ' + (n ? 'warn' : 'ok');
    });
    if (toolbar) toolbar.querySelector('.cms-tb-count').textContent = n ? `게시 안 된 변경 ${n}건` : '변경 없음';
    const showBar = n > 0 && !editing && !panelVisible();
    if (showBar && !draftBar) {
      draftBar = h('div', { id: 'cms-draftbar', 'data-cms-ui': '', translate: 'no' },
        h('span', { class: 'cms-draft-text' }),
        h('button', { class: 'cms-btn sm', onclick: () => openPanel() }, '관리 화면'),
        h('button', { class: 'cms-btn sm primary', onclick: publish }, '게시하기'));
      document.body.append(draftBar);
    }
    if (draftBar) {
      if (!showBar) { draftBar.remove(); draftBar = null; }
      else draftBar.querySelector('.cms-draft-text').textContent = `✏️ 게시하지 않은 수정 ${n}건이 이 브라우저에서만 보이고 있습니다.`;
    }
  }

  /* ---------- 관리 화면 ---------- */
  let panelEl = null;
  const panelVisible = () => !!panelEl && panelEl.style.display !== 'none';
  function openPanel(tab) {
    stopEditMode();
    if (tab) panelTab = tab;
    if (!panelEl) {
      panelEl = h('div', { id: 'cms-panel', 'data-cms-ui': '', translate: 'no' });
      panelEl.addEventListener('mousedown', e => { if (e.target === panelEl) closePanel(); });
      document.body.append(panelEl);
    }
    panelEl.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    renderPanel();
    refreshStatus();
  }
  function closePanel() {
    if (!panelEl) return;
    panelEl.style.display = 'none';
    document.body.style.overflow = '';
    refreshStatus();
  }
  const TABS = [
    ['home', '🏠 시작하기'],
    ['edit', '✏️ 화면에서 편집'],
    ['texts', '🔤 문구 관리'],
    ['lists', '📋 목록 관리'],
    ['banners', '🖼 배너 관리'],
    ['files', '📁 파일 관리'],
    ['backup', '💾 백업·복원'],
  ];
  function renderPanel() {
    if (!panelEl) return;
    const scroll = panelEl.querySelector('.cms-main');
    const top = scroll ? scroll.scrollTop : 0;
    panelEl.innerHTML = '';
    panelEl.append(h('div', { class: 'cms-win' },
      h('div', { class: 'cms-head' },
        h('h1', {}, '사이트 관리'),
        h('span', { class: 'cms-chip ' + (conn ? 'ok' : '') }, conn ? `GitHub 연결됨 · ${conn.owner}/${conn.repo} (${conn.branch})` : 'GitHub 연결 안 됨'),
        h('span', { class: 'cms-count cms-chip' }),
        h('span', { class: 'cms-spacer' }),
        h('button', { class: 'cms-btn primary', onclick: publish }, '게시하기'),
        h('button', { class: 'cms-x', title: '닫기', onclick: closePanel }, '✕')),
      h('div', { class: 'cms-body' },
        h('div', { class: 'cms-side' }, TABS.map(([id, label]) =>
          h('button', { class: panelTab === id ? 'on' : '', onclick: () => { panelTab = id; renderPanel(); } }, label))),
        h('div', { class: 'cms-main' }, RENDER[panelTab]()))));
    refreshStatus();
    if (scroll) panelEl.querySelector('.cms-main').scrollTop = top;
  }

  const RENDER = {
    home() {
      const def = conn || Object.assign(defaultRepo(), { branch: 'main' });
      const repo = h('input', { type: 'text', class: 'cms-input', value: `${def.owner}/${def.repo}` });
      const branch = h('input', { type: 'text', class: 'cms-input', value: def.branch || 'main' });
      const token = h('input', { type: 'password', class: 'cms-input', autocomplete: 'off', placeholder: conn ? '연결됨 (바꾸려면 새 토큰 입력)' : 'github_pat_… 로 시작하는 토큰' });
      const remember = h('input', { type: 'checkbox', checked: true });
      return [
        h('h2', {}, '시작하기'),
        h('p', { class: 'cms-muted' }, '이 관리 화면에서 사이트의 모든 문구(중국어·영어·한국어), 공지사항·뉴스·자료실·표 같은 목록, 배너 이미지, 첨부파일을 수정하고 올릴 수 있습니다.'),
        h('div', { class: 'cms-card' },
          h('h3', {}, '사용 순서'),
          h('ol', { class: 'cms-steps' },
            h('li', {}, h('b', {}, 'GitHub 연결'), ' — 처음 한 번만 아래에서 연결합니다.'),
            h('li', {}, h('b', {}, '수정'), ' — [화면에서 편집]으로 실제 화면의 글자를 눌러 고치거나, 왼쪽 메뉴에서 문구·목록·배너·파일을 관리합니다. 수정한 내용은 이 브라우저에 자동으로 임시저장됩니다.'),
            h('li', {}, h('b', {}, '게시'), ' — 위의 [게시하기]를 누르면 저장소에 저장되고, 1~2분 뒤 실제 사이트에 반영됩니다.'))),
        h('div', { class: 'cms-card' },
          h('h3', {}, 'GitHub 연결'),
          h('div', { class: 'cms-field' }, h('label', {}, '저장소 (소유자/저장소 이름)'), repo),
          h('div', { class: 'cms-field' }, h('label', {}, '브랜치 (사이트가 배포되는 브랜치)'), branch),
          h('div', { class: 'cms-field' }, h('label', {}, '토큰'), token),
          h('label', { class: 'cms-check' }, remember, ' 이 브라우저에 연결 정보 기억하기 (공용 PC에서는 끄세요)'),
          h('div', { class: 'cms-row', style: 'margin-top:12px' },
            h('button', { class: 'cms-btn primary', onclick: async () => {
              const [owner, name] = repo.value.trim().split('/');
              const tok = token.value.trim() || (conn && conn.token);
              if (!owner || !name || !tok) { toast('저장소와 토큰을 입력해 주세요.', 'warn'); return; }
              busy('GitHub에 연결하는 중…');
              try { await connect({ owner, repo: name, branch: branch.value.trim() || 'main', token: tok }, remember.checked); renderPanel(); }
              catch (e) { toast(e.message, 'error'); }
              finally { busy(null); }
            } }, conn ? '다시 연결' : '연결하기'),
            conn && h('button', { class: 'cms-btn', onclick: () => { saveConn(null); renderPanel(); toast('연결을 해제했습니다.'); } }, '연결 해제'))),
        h('details', { class: 'cms-card' },
          h('summary', {}, h('b', {}, '토큰 만드는 방법 (처음 한 번)')),
          h('ol', { class: 'cms-steps', style: 'margin-top:10px' },
            h('li', {}, 'GitHub에 로그인한 뒤 ', h('a', { href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank', rel: 'noopener' }, '새 토큰 만들기 페이지 ↗'), '를 엽니다. (Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token)'),
            h('li', {}, 'Token name: 아무 이름 (예: 사이트 관리) / Expiration: 사용할 기간 선택'),
            h('li', {}, 'Repository access: ', h('b', {}, 'Only select repositories'), ' → 이 사이트 저장소(', `${def.repo}`, ') 선택'),
            h('li', {}, 'Permissions → Repository permissions → ', h('b', {}, 'Contents: Read and write')),
            h('li', {}, '[Generate token]을 누르고 표시된 토큰(github_pat_…)을 복사해 위 “토큰” 칸에 붙여넣습니다.')),
          h('p', { class: 'cms-muted' }, '토큰은 이 브라우저에만 저장되며 사이트 방문자에게는 보이지 않습니다. 토큰이 있어야만 게시·업로드가 되므로, 다른 사람에게 알려주지 마세요.')),
      ];
    },

    edit() {
      return [
        h('h2', {}, '화면에서 편집'),
        h('p', { class: 'cms-muted' }, '실제 사이트 화면에서 바로 수정합니다. 편집 모드를 시작한 뒤:'),
        h('ul', { class: 'cms-steps' },
          h('li', {}, h('b', {}, '글자'), '를 누르면 중국어·영어·한국어를 한 번에 고치는 창이 열립니다.'),
          h('li', {}, h('b', {}, '공지사항·뉴스·자료실·표의 항목'), '을 누르면 그 항목을 고치거나 삭제할 수 있습니다.'),
          h('li', {}, h('b', {}, '배너의 빈 곳'), '을 누르면 배너 배경 이미지·숨김을 설정합니다.'),
          h('li', {}, '아이콘·화살표처럼 ', h('b', {}, '글자가 없는 곳'), '을 누르면 평소처럼 페이지가 이동합니다. 화면 아래 도구 막대의 “페이지 이동”으로도 원하는 페이지·팝업을 열 수 있습니다.'),
          h('li', {}, '화면 위의 中文 / English / 한국어 버튼으로 언어를 바꿔 가며 확인할 수 있습니다.')),
        h('button', { class: 'cms-btn primary', style: 'margin-top:10px', onclick: startEditMode }, '편집 모드 시작'),
      ];
    },

    texts() {
      const q = textQuery.toLowerCase();
      const rows = allTextKeys().map(key => [key, textInfo(key)]).filter(([key, info]) => {
        if (textFilter === 'edited' && !info.edited) return false;
        if (textFilter === 'missing' && !(hasHangul(info.values.ko) && (!info.values.zh || !info.values.en))) return false;
        if (!q) return true;
        return [key, info.values.ko, info.values.zh, info.values.en].some(v => String(v).toLowerCase().includes(q));
      });
      const search = h('input', { type: 'search', class: 'cms-input', style: 'max-width:320px', placeholder: '검색 (한국어·中文·English)', value: textQuery });
      search.addEventListener('input', () => { textQuery = search.value; textLimit = 100; renderPanel(); const s = panelEl.querySelector('input[type=search]'); s.focus(); s.setSelectionRange(s.value.length, s.value.length); });
      const clip = s => h('div', { class: 'cms-clip', title: s }, String(s).replace(/<[^>]+>/g, ' '));
      return [
        h('h2', {}, '문구 관리'),
        h('p', { class: 'cms-muted' }, '사이트의 모든 문구입니다. 줄을 누르면 중국어·영어·한국어를 함께 수정할 수 있습니다. (선택 목록 항목·입력칸 안내 문구·표 머리글 등 화면에서 누르기 어려운 문구도 여기에서 고칠 수 있습니다.)'),
        h('div', { class: 'cms-row', style: 'margin-bottom:12px' }, search,
          h('select', { class: 'cms-input', style: 'max-width:200px', onchange: e => { textFilter = e.target.value; textLimit = 100; renderPanel(); } },
            [['all', '전체 문구'], ['edited', '수정한 문구'], ['missing', '번역이 비어 있는 문구']].map(([v, l]) => h('option', { value: v, selected: v === textFilter || null }, l))),
          h('span', { class: 'cms-muted', style: 'margin:0' }, `${rows.length}개`)),
        h('table', { class: 'cms-table' },
          h('thead', {}, h('tr', {}, h('th', {}, '中文'), h('th', {}, 'English'), h('th', {}, '한국어'), h('th', {}, '사용'))),
          h('tbody', {}, rows.slice(0, textLimit).map(([key, info]) => h('tr', { class: 'click', onclick: () => openTextEditor(key) },
            h('td', {}, clip(info.values.zh || '—')), h('td', {}, clip(info.values.en || '—')),
            h('td', {}, clip(info.values.ko), info.edited ? h('span', { class: 'cms-badge' }, '수정됨') : ''),
            h('td', {}, info.uses ? `${info.uses}곳` : '목록'))))),
        rows.length > textLimit && h('button', { class: 'cms-btn', style: 'margin-top:12px', onclick: () => { textLimit += 200; renderPanel(); } }, `더 보기 (${rows.length - textLimit}개 남음)`),
      ];
    },

    lists() {
      const schema = LIST_SCHEMAS[listTab];
      const list = LISTS[listTab];
      const move = (i, d) => updateList(listTab, l => { const [x] = l.splice(i, 1); l.splice(i + d, 0, x); });
      return [
        h('h2', {}, '목록 관리'),
        h('p', { class: 'cms-muted' }, '항목을 추가·수정·삭제하고 순서를 바꿀 수 있습니다. 첨부파일·이미지는 항목 수정 창에서 올립니다.'),
        h('div', { class: 'cms-tabs2' }, Object.entries(LIST_SCHEMAS).map(([id, s]) =>
          h('button', { class: 'cms-btn' + (id === listTab ? ' on' : ''), onclick: () => { listTab = id; renderPanel(); } }, s.label))),
        h('div', { class: 'cms-row', style: 'margin-bottom:12px' },
          h('span', { class: 'cms-muted', style: 'margin:0' }, `${schema.page} · ${list.length}개`),
          h('span', { class: 'cms-spacer' }),
          working.lists && working.lists[listTab] && h('button', { class: 'cms-btn danger', onclick: () => {
            if (!confirm(`${schema.label}을(를) 처음 기본 내용으로 되돌릴까요?`)) return;
            const lists = Object.assign({}, working.lists); delete lists[listTab]; working.lists = lists;
            applyWorking(); renderPanel();
          } }, '기본 내용으로 되돌리기'),
          h('button', { class: 'cms-btn primary', onclick: () => openItemEditor(listTab, -1) }, '+ 새 항목 추가')),
        h('table', { class: 'cms-table' },
          h('thead', {}, h('tr', {}, h('th', { style: 'width:40px' }, '#'), h('th', {}, '내용'), h('th', { style: 'width:230px' }, ''))),
          h('tbody', {}, list.map((it, i) => h('tr', {},
            h('td', {}, i + 1),
            h('td', {}, h('div', { class: 'cms-clip', style: 'max-width:520px' }, schema.summary(it) || '(비어 있음)')),
            h('td', {}, h('div', { class: 'cms-row' },
              h('button', { class: 'cms-btn sm', disabled: i === 0 || null, onclick: () => move(i, -1) }, '▲'),
              h('button', { class: 'cms-btn sm', disabled: i === list.length - 1 || null, onclick: () => move(i, 1) }, '▼'),
              h('button', { class: 'cms-btn sm', onclick: () => openItemEditor(listTab, i) }, '수정'),
              h('button', { class: 'cms-btn sm danger', onclick: () => { if (confirm('이 항목을 삭제할까요?')) updateList(listTab, l => l.splice(i, 1)); } }, '삭제'))))))),
      ];
    },

    banners() {
      const banners = working.banners || {};
      return [
        h('h2', {}, '배너 관리'),
        h('p', { class: 'cms-muted' }, '메인 화면 배너의 보이기/숨기기와 배경 이미지를 설정합니다. 배너 글자는 [화면에서 편집]에서 글자를 눌러 수정하세요.'),
        h('table', { class: 'cms-table' },
          h('thead', {}, h('tr', {}, h('th', {}, '#'), h('th', {}, '배너'), h('th', {}, '상태'), h('th', {}, '배경 이미지'), h('th', {}, ''))),
          h('tbody', {}, bannerSlides().map((s, i) => {
            const b = banners[i] || {};
            return h('tr', {},
              h('td', {}, i + 1),
              h('td', {}, h('div', { class: 'cms-clip' }, bannerTitle(i))),
              h('td', {}, b.hidden ? h('span', { class: 'cms-badge' }, '숨김') : '보임'),
              h('td', {}, b.image ? h('img', { class: 'cms-thumb', src: mediaUrl(b.image), alt: '' }) : h('span', { class: 'cms-muted' }, '기본 색상')),
              h('td', {}, h('div', { class: 'cms-row' },
                h('button', { class: 'cms-btn sm', onclick: () => setBanner(i, { hidden: !b.hidden }) }, b.hidden ? '보이기' : '숨기기'),
                h('button', { class: 'cms-btn sm', onclick: () => uploadBannerImage(i) }, '이미지 올리기'),
                h('button', { class: 'cms-btn sm', onclick: () => chooseBannerImage(i) }, '올린 파일에서'),
                b.image && h('button', { class: 'cms-btn sm danger', onclick: () => setBanner(i, { image: '' }) }, '이미지 지우기'),
                h('button', { class: 'cms-btn sm', onclick: () => { startEditMode(); showHome(); bannerGo(i); } }, '화면에서 편집'))));
          }))),
      ];
    },

    files() {
      const media = (working.media || []).slice().reverse();
      return [
        h('h2', {}, '파일 관리'),
        h('p', { class: 'cms-muted' }, '이미지·PDF·문서 파일을 저장소의 uploads 폴더에 올립니다 (파일당 25MB 이하). 올린 파일은 공지사항·자료실·배너 등의 항목에서 선택해 연결할 수 있고, [주소 복사]로 링크를 복사해 문구에 넣을 수도 있습니다. 올린 직후에는 1~2분 뒤 사이트에서 열립니다.'),
        h('button', { class: 'cms-btn primary', style: 'margin-bottom:14px', onclick: async () => {
          const files = await pickFiles('', true);
          if (files.length) { await uploadFiles(files); renderPanel(); }
        } }, '파일 올리기'),
        media.length ? h('table', { class: 'cms-table' },
          h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, '파일 이름'), h('th', {}, '크기'), h('th', {}, '올린 날짜'), h('th', {}, ''))),
          h('tbody', {}, media.map(m => h('tr', {},
            h('td', {}, isImage(m) ? h('img', { class: 'cms-thumb', src: mediaUrl(m.path), alt: '' }) : '📄'),
            h('td', {}, h('div', { class: 'cms-clip' }, m.name), h('div', { class: 'cms-muted', style: 'margin:0;font-size:11px' }, m.path)),
            h('td', {}, fmtSize(m.size)),
            h('td', {}, (m.uploadedAt || '').slice(0, 10)),
            h('td', {}, h('div', { class: 'cms-row' },
              h('button', { class: 'cms-btn sm', onclick: () => copyText(new URL(m.path, location.href).href) }, '주소 복사'),
              h('a', { class: 'cms-btn sm', href: mediaUrl(safeUrl(m.path)), target: '_blank', rel: 'noopener' }, '열기'),
              h('button', { class: 'cms-btn sm danger', onclick: () => deleteMedia(m) }, '삭제'))))))) : h('p', { class: 'cms-muted' }, '아직 올린 파일이 없습니다.'),
      ];
    },

    backup() {
      return [
        h('h2', {}, '백업·복원'),
        h('div', { class: 'cms-card' },
          h('h3', {}, '백업'),
          h('p', { class: 'cms-muted' }, '지금 편집 중인 전체 내용(문구·목록·배너·파일 목록)을 파일로 내려받습니다.'),
          h('button', { class: 'cms-btn', onclick: exportJson }, '내용 내려받기 (JSON)')),
        h('div', { class: 'cms-card' },
          h('h3', {}, '복원'),
          h('p', { class: 'cms-muted' }, '백업한 JSON 파일을 불러와 편집 내용으로 사용합니다. [게시하기]를 눌러야 사이트에 반영됩니다.'),
          h('button', { class: 'cms-btn', onclick: importJson }, 'JSON 파일 불러오기')),
        h('div', { class: 'cms-card' },
          h('h3', {}, '게시하지 않은 변경 취소'),
          h('p', { class: 'cms-muted' }, '마지막으로 게시한 상태로 되돌립니다.'),
          h('div', { class: 'cms-row' },
            h('button', { class: 'cms-btn danger', onclick: () => {
              if (!diffList().length) { toast('게시하지 않은 변경이 없습니다.'); return; }
              if (!confirm('게시하지 않은 변경을 모두 취소할까요?')) return;
              working = clone(published); applyWorking(); renderPanel(); toast('변경을 취소했습니다.');
            } }, '변경 모두 취소'),
            conn && h('button', { class: 'cms-btn', onclick: async () => {
              if (diffList().length && !confirm('게시하지 않은 변경을 버리고 GitHub에 게시된 최신 내용을 불러올까요?')) return;
              working = clone(published);
              busy('불러오는 중…');
              try { await syncFromGitHub(); toast('최신 게시 내용을 불러왔습니다.', 'ok'); } catch (e) { toast(e.message, 'error'); } finally { busy(null); }
            } }, 'GitHub에서 최신 내용 불러오기'))),
      ];
    },
  };

  function copyText(text) {
    const done = () => toast('주소를 복사했습니다: ' + text);
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => prompt('아래 주소를 복사하세요.', text));
    else prompt('아래 주소를 복사하세요.', text);
  }
  async function deleteMedia(m) {
    const inUse = stable(Object.assign({}, working, { media: [] })).includes(m.path);
    if (!confirm((inUse ? '⚠️ 이 파일은 사이트의 항목에 연결되어 있습니다.\n' : '') + `“${m.name}” 파일을 저장소에서 삭제할까요?`)) return;
    busy('파일 삭제하는 중…');
    try {
      const f = await getFile(m.path);
      if (f) await gh('DELETE', contentsApi(m.path), { message: `CMS: 파일 삭제 - ${m.name}`, sha: f.sha, branch: conn.branch });
      working.media = (working.media || []).filter(x => x.path !== m.path);
      applyWorking();
      renderPanel();
      toast('파일을 삭제했습니다. [게시하기]로 파일 목록을 저장하세요.');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      busy(null);
    }
  }
  function exportJson() {
    const blob = new Blob([JSON.stringify(working, null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `site-content-${stamp()}.json` });
    document.body.append(a);
    a.click();
    a.remove();
  }
  async function importJson() {
    const [file] = await pickFiles('.json,application/json');
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
      if (!confirm('불러온 내용으로 바꿀까요? (게시하기 전까지는 사이트에 반영되지 않습니다)')) return;
      working = data;
      applyWorking();
      renderPanel();
      toast('불러왔습니다. 확인 후 [게시하기]를 누르세요.', 'ok');
    } catch (e) {
      toast('올바른 백업 파일(JSON)이 아닙니다.', 'error');
    }
  }

  /* ---------- 스타일 ---------- */
  function injectStyles() {
    if (document.getElementById('cms-style')) return;
    document.head.append(h('style', { id: 'cms-style' }, `
#cms-panel,.cms-dlg-back,#cms-toolbar,#cms-draftbar,#cms-toast,#cms-busy{font-family:'Noto Sans KR',sans-serif;color:#1f2937;line-height:1.5}
#cms-panel *,.cms-dlg-back *,#cms-toolbar *,#cms-draftbar *{box-sizing:border-box}
#cms-panel{position:fixed;inset:0;z-index:3000;background:rgba(15,23,42,.45);display:none;align-items:center;justify-content:center}
.cms-win{width:min(1180px,96vw);height:min(880px,94vh);background:#fff;border-radius:14px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.cms-head{display:flex;align-items:center;gap:10px;padding:14px 20px;border-bottom:1px solid #e5e7eb;background:#f7fbfb;flex-wrap:wrap}
.cms-head h1{font-size:18px;font-weight:800;margin-right:6px}
.cms-chip{font-size:12px;padding:4px 10px;border-radius:20px;background:#eef2f2;color:#555;white-space:nowrap}
.cms-chip.ok{background:#e0f5f2;color:#12796f}.cms-chip.warn{background:#fff1e0;color:#b45309}
.cms-spacer{flex:1}
.cms-body{flex:1;display:flex;min-height:0}
.cms-side{width:190px;border-right:1px solid #e5e7eb;padding:12px 8px;background:#fcfdfd;flex-shrink:0;overflow:auto}
.cms-side button{display:block;width:100%;text-align:left;padding:10px 12px;border:none;background:none;border-radius:8px;font-size:14px;color:#374151;cursor:pointer;margin-bottom:2px;font-family:inherit}
.cms-side button:hover{background:#f0faf9}.cms-side button.on{background:#2db4a8;color:#fff;font-weight:700}
.cms-main{flex:1;overflow:auto;padding:22px 26px}
.cms-main h2{font-size:19px;font-weight:800;margin-bottom:6px}
.cms-muted{color:#6b7280;font-size:13px;margin-bottom:14px}
.cms-card{border:1px solid #e5e7eb;border-radius:10px;padding:16px 18px;margin-bottom:16px;display:block}
.cms-card h3{font-size:15px;font-weight:700;margin-bottom:10px}
.cms-card summary{cursor:pointer;font-size:14px}
.cms-steps{padding-left:20px}.cms-steps li{margin-bottom:6px;font-size:13px;color:#374151}
.cms-steps a{color:#0f766e;text-decoration:underline}
.cms-btn{display:inline-block;padding:7px 14px;border:1px solid #d1d5db;background:#fff;border-radius:7px;font-size:13px;cursor:pointer;font-family:inherit;color:#374151;white-space:nowrap;text-decoration:none;line-height:1.4}
.cms-btn:hover{border-color:#2db4a8;color:#12796f}
.cms-btn.primary{background:#2db4a8;border-color:#2db4a8;color:#fff;font-weight:700}.cms-btn.primary:hover{background:#26a69a;color:#fff}
.cms-btn.danger{color:#dc2626;border-color:#fca5a5}.cms-btn.danger:hover{background:#fef2f2}
.cms-btn.on{background:#2db4a8;border-color:#2db4a8;color:#fff}
.cms-btn.sm{padding:4px 9px;font-size:12px}.cms-btn:disabled{opacity:.4;cursor:default}
.cms-x{border:none;background:none;font-size:18px;cursor:pointer;color:#6b7280;padding:4px 6px}
.cms-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.cms-tabs2{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.cms-field{margin-bottom:14px}.cms-field>label{display:block;font-size:13px;font-weight:700;color:#374151;margin-bottom:6px}
.cms-input,.cms-dlg textarea{width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:7px;font-size:13px;font-family:inherit;background:#fff;color:#1f2937}
.cms-dlg textarea{resize:vertical;min-height:44px}
.cms-dlg textarea.cur{border-color:#2db4a8;box-shadow:0 0 0 2px rgba(45,180,168,.18)}
.cms-check{font-size:13px;color:#374151;display:flex;gap:6px;align-items:center}
.cms-i18n{display:grid;grid-template-columns:62px 1fr;gap:6px 8px;align-items:start}.cms-i18n>span{font-size:12px;color:#6b7280;padding-top:8px}
.cms-table{width:100%;border-collapse:collapse;font-size:13px}
.cms-table th{background:#f3f4f6;text-align:left;padding:8px 10px;font-weight:700;color:#374151;border-bottom:1px solid #e5e7eb;white-space:nowrap}
.cms-table td{padding:8px 10px;border-bottom:1px solid #f0f0f0;vertical-align:middle}
.cms-table tr.click{cursor:pointer}.cms-table tr.click:hover td{background:#f2fbfa}
.cms-clip{max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cms-badge{display:inline-block;font-size:11px;padding:1px 7px;border-radius:4px;background:#fff1e0;color:#b45309;margin-left:6px;font-weight:600}
.cms-dlg-back{position:fixed;inset:0;z-index:3100;background:rgba(15,23,42,.45);display:flex;align-items:flex-start;justify-content:center;padding:5vh 16px;overflow:auto}
.cms-dlg{width:min(580px,100%);background:#fff;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.3)}.cms-dlg.wide{width:min(780px,100%)}
.cms-dlg-head{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid #e5e7eb;font-weight:800;font-size:16px}
.cms-dlg-body{padding:16px 18px;max-height:68vh;overflow:auto}
.cms-dlg-foot{display:flex;justify-content:flex-end;gap:8px;padding:12px 18px;border-top:1px solid #e5e7eb;flex-wrap:wrap}
.cms-dlg-foot .left{margin-right:auto}
.cms-key{font-size:12px;color:#4b5563;background:#f3f4f6;border-radius:6px;padding:8px 10px;margin-bottom:10px;word-break:break-all}
.cms-opt{display:flex;gap:8px;align-items:center;width:100%;text-align:left;padding:9px 12px;margin-bottom:6px;border:1px solid #e5e7eb;border-radius:7px;background:#fff;cursor:pointer;font-size:13px;font-family:inherit}
.cms-opt:hover{border-color:#2db4a8}.cms-opt .cms-muted{margin:0;font-size:11px}
.cms-thumb{width:64px;height:40px;object-fit:cover;border-radius:4px;border:1px solid #e5e7eb;background:#f3f4f6;vertical-align:middle}
.cms-thumb.big{width:240px;height:120px;margin-top:8px}
.cms-preview a{font-size:12px;color:#0f766e;text-decoration:underline;display:inline-block;margin-top:6px}
#cms-hl{position:fixed;z-index:2800;pointer-events:none;border:2px dashed #2db4a8;background:rgba(45,180,168,.08);border-radius:4px;display:none}
#cms-hl span{position:absolute;left:-2px;top:-21px;background:#2db4a8;color:#fff;font-size:11px;padding:1px 6px;border-radius:4px;white-space:nowrap;font-family:'Noto Sans KR',sans-serif}
body.cms-editing{padding-bottom:80px}
body.cms-editing *{cursor:default}
#cms-toolbar{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);width:max-content;z-index:2900;background:#1f2937;color:#fff;border-radius:12px;padding:10px 14px;display:flex;gap:10px;align-items:center;box-shadow:0 10px 30px rgba(0,0,0,.35);font-size:13px;max-width:96vw;flex-wrap:wrap}
#cms-toolbar *{cursor:pointer}
#cms-toolbar select{padding:6px 8px;border-radius:6px;border:none;font-size:13px;font-family:inherit;max-width:190px}
.cms-tb-hint{color:#9ca3af;font-size:12px}.cms-tb-count{color:#fcd34d;font-weight:700}
#cms-draftbar{position:fixed;left:16px;bottom:16px;z-index:2900;background:#fff7ed;border:1px solid #fdba74;color:#9a3412;border-radius:10px;padding:10px 14px;font-size:13px;display:flex;gap:8px;align-items:center;box-shadow:0 6px 20px rgba(0,0,0,.15);max-width:calc(100vw - 32px);flex-wrap:wrap}
#cms-toast{position:fixed;right:18px;bottom:18px;z-index:3300;display:flex;flex-direction:column;gap:8px;align-items:flex-end}
body.cms-editing #cms-toast{bottom:90px}
.cms-toast{background:#1f2937;color:#fff;padding:10px 14px;border-radius:8px;font-size:13px;max-width:400px;box-shadow:0 6px 20px rgba(0,0,0,.2)}
.cms-toast.ok{background:#0f766e}.cms-toast.error{background:#b91c1c}.cms-toast.warn{background:#b45309}
#cms-busy{position:fixed;inset:0;z-index:3400;background:rgba(255,255,255,.7);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#0f766e}
`));
  }

  /* ---------- 시작 ---------- */
  function init() {
    if (ready) return ready;
    injectStyles();
    const loaded = typeof siteContentReady !== 'undefined' ? siteContentReady : Promise.resolve(SITE_CONTENT);
    ready = loaded.then(content => {
      published = clone(content || {});
      working = clone(published);
      baseHash = hash(published);
      const d = readDraft();
      if (d && d.content) {
        working = d.content;
        baseHash = d.baseHash || baseHash;
        applyWorking();
      }
    });
    return ready;
  }

  window.CMS = {
    open(tab) {
      return init().then(() => {
        openPanel(tab);
        if (conn) syncFromGitHub().catch(e => toast(e.message, 'error'));
      });
    },
    resumeDraft() { return init().then(refreshStatus); },
    startEditMode() { return init().then(startEditMode); },
    publish() { return init().then(publish); },
  };
})();
