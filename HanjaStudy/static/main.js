import { getAPI } from './apiHelper.js';
import { createSpan, createButton, createIcon } from './documentHelper.js';

let ALL_HANJA = { };

let selectedLevels = new Set();
let vocabBooks = [];       // [{id, name, chars:[{char,reading,meaning,stroke,level}]}]
let activeVocabId = null;  // 선택된 단어장 id (null = 급수모드)
let deck = [];
let currentPage = 0; // 현재 페이지
let drawingThickness = 2;
let drawingColor = '#ffffff';
let isDrawing = false;
let historyStack = [];
let redoStack = [];

// 모달 상태
let modalVocabId = null;
let modalSelected = new Set();
let modalFilterLevel = -1;
let modalPage = 0;
const MODAL_PAGE_SIZE = 50;
const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d');
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

/** 초기설정 */
async function init() {
    await getData();
    const totalCount = Object.values(ALL_HANJA).reduce((count, array) => count + array.length, 0);

    const grid = document.getElementById('levelGrid');
    grid.innerHTML = '';

    // 전체 버튼 생성
    const allBtn = document.createElement('button');
    allBtn.id = 'btn-all';
    allBtn.className = 'level-btn all-btn';
    allBtn.textContent = '전체';
    allBtn.addEventListener('click', () => toggleAll());

    const allBtnSpan = document.createElement('span');
    allBtnSpan.className = 'lv-count';
    allBtnSpan.textContent = `${totalCount}자`;
    allBtn.appendChild(allBtnSpan);

    grid.appendChild(allBtn);
    
    // 각 급수별 버튼 생성
    for(let i = 0; i < 8; i++) {
        const btn = document.createElement('button');
        btn.id = `btn-${i + 1}급`;
        btn.className = 'level-btn';
        btn.textContent = `${i + 1}급`;
        btn.addEventListener('click', () => toggleLevel(i + 1, btn));

        const btnSpan = document.createElement('span');
        btnSpan.className = 'lv-count';
        btnSpan.textContent = `${ALL_HANJA[i].length}자`;
        btn.appendChild(btnSpan);

        grid.appendChild(btn);
    }
}

/** 한자 데이터 불러오기 */
async function getData() {
    await getAPI('http://127.0.0.1:8000/hanja', data => {
        ALL_HANJA = data;
    });
}

/** 급수 변경 */
function toggleLevel(level, btn) {
    activeVocabId = null;

    if (selectedLevels.has(level)) {
        selectedLevels.delete(level);
        btn.classList.remove('active');
    }
    else {
        selectedLevels.add(level);
        btn.classList.add('active');
    }

    updateAllBtn();
    renderVocabList();
    onSelectionChange();
}

/** 전체 급수 변경  */
function toggleAll() {
    const allSel = selectedLevels.size === 8;
    selectedLevels.clear();

    activeVocabId = null;

    if (!allSel) {
        for(let i = 0; i < 8; i++) {
            selectedLevels.add(i + 1);
        }
    }

    for(let i = 0; i < 8; i++) {
        const b = document.getElementById(`btn-${i + 1}급`);
        if(b) {
            b.classList.toggle('active', !allSel);
        }
    }

    updateAllBtn();
    renderVocabList();
    onSelectionChange();
}

/** 전체 버튼 갱신 */
function updateAllBtn() {
    const button = document.getElementById('btn-all');
    if(button) {
        button.classList.toggle('active', selectedLevels.size === 8);
    }
}

//#region Vocabulary

/** 단어장 생성 */
function createVocabulary() {
    const input = document.getElementById('vocabNameInput');
    const name = input.value.trim();
    if (!name) {
        return;
    }

    const id = Date.now();
    vocabBooks.push({ id, name, chars: [] });
    input.value = '';
    renderVocabList();
    createModal(id);
}

/** 단어장 삭제 */
function deleteVocabulary(id, event) {
    event.stopPropagation();
    vocabBooks = vocabBooks.filter(v => v.id !== id);

    if (activeVocabId === id) {
        activeVocabId = null;
        onSelectionChange();
    }

    renderVocabList();
}

/** 단어장 선택 */
function selectVocabulary(id) {
    activeVocabId = id;
    selectedLevels.clear();

    for(let i = 0; i < 8; i++) {
        const b = document.getElementById(`btn-${i + 1}급`);
        if(b) {
            b.classList.remove('active');
        }
    }

    updateAllBtn();
    renderVocabList();
    onSelectionChange();
}

function renderVocabList() {
    const list = document.getElementById('vocabList');
    list.innerHTML = '';

    vocabBooks.forEach(v => {
        const item = document.createElement('button');
        item.className = `vocabulary-item${(activeVocabId === v.id ? ' active' : '')}`;
        item.addEventListener('click', () => selectVocabulary(v.id));

        item.addEventListener('mouseenter', () => {
            item.querySelectorAll('.vocabulary-del, .vocabulary-edit-btn').forEach(el => el.style.opacity = '1');
        });

        item.addEventListener('mouseleave', () => {
            item.querySelectorAll('.vocabulary-del, .vocabulary-edit-btn').forEach(el => el.style.opacity = '0');
        });

        const nameSpan = createSpan('vocabularyName', 'vocabulary-item-name', v.name);
        const countSpan = createSpan('vocabularyCount', 'vocabulary-item-count', `${v.chars.length}자`);

        const editButton = createButton('vocabularyEditBtn', 'vocabulary-edit-btn', '');
        editButton.title = '편집';
        editButton.addEventListener('click', event => createModal(v.id, event));

        const editButtonIcon = createIcon('editBtnIcon', 'ti ti-pencil');
        editButton.appendChild(editButtonIcon);

        const deleteButton = createButton('vocabularyDeleteBtn', 'vocabulary-del', '×');
        deleteButton.title = '삭제';
        deleteButton.addEventListener('click', event => deleteVocabulary(v.id, event));

        item.append(nameSpan, countSpan, editButton, deleteButton);
        list.appendChild(item);
    });
}

//#endregion

//#region Modal

/** 모달창 생성 */
function createModal(id, event) {
    modalVocabId = id;
    const vocab = vocabBooks.find(v => v.id === id);

    if (!vocab) {
        return;
    }
    
    document.getElementById('modalTitle').textContent = `「${vocab.name}」 한자 추가`;
    modalSelected = new Set(vocab.chars.map(c => c.char));
    modalFilterLevel = -1;
    modalPage = 0;
    document.getElementById('modalSearch').value = '';

    renderModalTabs();
    renderModalGrid();
    updateModalCount();

    document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
    modalVocabId = null;
}

function renderModalTabs() {
    const wrap = document.getElementById('modalTabs');
    wrap.innerHTML = '';

    // 전체 급수 탭 생성
    const allTabBtn = createButton('modalAllTabBtn', `modal-tab${(modalFilterLevel === -1 ? ' active' : '')}`, '전체');
    allTabBtn.addEventListener('click', () => {
        modalFilterLevel = -1;
        modalPage = 0;
        renderModalTabs();
        renderModalGrid();
    });

    wrap.appendChild(allTabBtn);

    // 각 급수별 탭 생성
    for(let i = 0; i < 8; i++) {
        const idx = i + 1;
        const tabBtn = createButton(`modalTab${idx}Btn`, `modal-tab${(modalFilterLevel === idx ? ' active': '')}`, idx);
        tabBtn.addEventListener('click', () => {
            modalFilterLevel = idx;
            modalPage = 0;
            renderModalTabs();
            renderModalGrid();
        });

        wrap.appendChild(tabBtn);
    }
}

function renderModalGrid() {
    const query = document.getElementById('modalSearch').value.trim();
    const grid = document.getElementById('modalGrid');
    grid.innerHTML = '';
  
    let pool = [];

    const levels = modalFilterLevel === -1 ? [1, 2, 3, 4, 5, 6, 7, 8] : [modalFilterLevel];
    levels.forEach(lv => {
        ALL_HANJA[lv - 1].forEach(h => {
            pool.push({...h, level : lv});
        });
    });
  
    if (query) {
        pool = pool.filter(h => h.char.includes(query) || h.reading.includes(query) || h.meaning.includes(query));
    }

    const totalPage = Math.ceil(pool.length / MODAL_PAGE_SIZE);

    // 페이지 범위 초과 시 보정
    if (modalPage >= totalPage) {
        modalPage = Math.max(0, totalPage - 1);
    }

    const pageStart = modalPage * MODAL_PAGE_SIZE;
    const pageEnd = pageStart + MODAL_PAGE_SIZE;
    const pagePool = pool.slice(pageStart, pageEnd);
  
    pagePool.forEach(h => {
        const btn = createButton('modalHanjaBtn', `modal-hanja-btn${(modalSelected.has(h.char) ? ' selected' : '')}`, `${h.char}`);
        btn.title = `${h.meaning} — ${h.reading}`;
        btn.addEventListener('click', () => {
            if (modalSelected.has(h.char)) {
                modalSelected.delete(h.char);
            }
            else {
                modalSelected.add(h.char);
            }

            btn.classList.toggle('selected', modalSelected.has(h.char));
            btn.querySelector('.modal-check').style.display = modalSelected.has(h.char) ? 'block' : 'none';
            updateModalCount();
        });

        const span = createSpan('modalCheck', 'modal-check', '✓');
        btn.appendChild(span);

        grid.appendChild(btn);
        console.log('Created');
    });

    renderModalPagination(totalPage, pool.length);
}

function renderModalPagination(totalPage, totalCount) {
    const wrap = document.getElementById('modalPagination');
    wrap.innerHTML = '';

    if (totalPage <= 1) {
        return;
    }

    const info = createSpan('modalPageInfo', 'modal-page-info', `${modalPage + 1} / ${totalPage} 페이지 (총 ${totalCount}자)`);

    const prevBtn = createButton('modalPagePrev', 'modal-page-btn', '‹');
    prevBtn.title = '이전 페이지';
    prevBtn.disabled = modalPage === 0;
    prevBtn.addEventListener('click', () => {
        if (modalPage > 0) {
            modalPage--;
            renderModalGrid();
        }
    });

    const nextBtn = createButton('modalPageNext', 'modal-page-btn', '›');
    nextBtn.title = '다음 페이지';
    nextBtn.disabled = modalPage >= totalPage - 1;
    nextBtn.addEventListener('click', () => {
        if (modalPage < totalPage - 1) {
            modalPage++;
            renderModalGrid();
        }
    });

    wrap.appendChild(prevBtn);
    wrap.appendChild(info);
    wrap.appendChild(nextBtn);
}

function updateModalCount() {
    document.getElementById('modalSelCount').textContent =  `${modalSelected.size}자 선택됨`;
    document.getElementById('modalConfirm').disabled = modalSelected.size === 0;
}

function confirmModal() {
    const allPool = [];
    const vocab = vocabBooks.find(v => v.id === modalVocabId);
    if (!vocab) {
        return;
    }

    for(let i = 0; i < 8; i++) {
        ALL_HANJA[i].forEach(h => allPool.push({...h, level : (i + 1)}));
    }

    vocab.chars = allPool.filter(h => modalSelected.has(h.char));
    renderVocabList();

    if (activeVocabId === modalVocabId) {
        buildDeck();
        updateCard();
    }

    closeModal();
}

//#endregion

//#region Deck & Card

function buildDeck() {
    deck = [];

    if (activeVocabId !== null) {
        const vocab = vocabBooks.find(v => v.id === activeVocabId);
        if (vocab) {
            deck = [...vocab.chars];
        }
    }
    else {
        selectedLevels.forEach(level => {
            ALL_HANJA[level - 1].forEach(h => deck.push({...h, level : level}));
        });
    }

    currentPage = 0;
}

function onSelectionChange() {
    buildDeck();

    const empty = deck.length === 0;
    document.getElementById('emptyState').style.display = empty ? 'block' : 'none';
    document.getElementById('hanjaCard').style.display = empty ? 'none' : 'flex';
    document.getElementById('drawArea').style.display = empty ? 'none' : 'block';

    if (!empty) {
        updateCard();
    }
    else {
        document.getElementById('progressLabel').textContent = '— / —';
        document.getElementById('progressFill').style.width = '0%';
    }
}

function updateCard() {
    if (!deck.length) {
        return;
    }

    const d = deck[currentPage];
    document.getElementById('hanjaChar').textContent = d.char;
    document.getElementById('hanjaReading').textContent = d.reading;
    document.getElementById('hanjaMeaning').textContent = d.meaning;
    document.getElementById('cardBadge').textContent = `${d.stroke}획`;
    document.getElementById('levelBadge').textContent = `${d.level}급` || '—';
  
    const total = deck.length;
    const currentCount = currentPage + 1;

    document.getElementById('progressLabel').textContent = `${currentCount} / ${total}`;
    document.getElementById('progressFill').style.width = `${(currentCount / total * 100)}%`;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    historyStack = [];
    redoStack = [];

    updateUndoRedo();
    updateBookmarkBtn();
}

function toggleIsShowChar() {
    const toggleButton = document.getElementById('showChar');
    toggleButton.checked = !toggleButton.checked;

    document.getElementById('hanjaChar').classList.toggle('hidden', !toggleButton.checked);
}

function toggleIsShowMeaning() {
    const toggleButton = document.getElementById('showMeaning');
    toggleButton.checked = !toggleButton.checked;

    document.getElementById('hanjaMeaning').classList.toggle('hidden-field', !toggleButton.checked);
}

function toggleIsShowReading() {
    const toggleButton = document.getElementById('showReading');
    toggleButton.checked = !toggleButton.checked;

    document.getElementById('hanjaReading').classList.toggle('hidden-field', !toggleButton.checked);
}

function nextCard() {
    if(!deck.length) {
        return;
    }

    const currentCount = currentPage + 1;
    currentPage = currentCount % deck.length;
    updateCard();
}

function prevCard() {
    if(!deck.length) {
        return;
    }

    const currentCount = currentPage - 1;
    currentPage = (currentCount + deck.length) % deck.length;
    updateCard();
}

//#endregion

//#region Bookmark

function updateBookmarkBtn() {
    if (!deck.length) {
        return;
    }

    const d = deck[currentPage];
    const inAny = vocabBooks.some(v => v.chars.some(c => c.char === d.char));

    const btn = document.getElementById('bookmarkBtn');
    btn.classList.toggle('bookmarked', inAny);
    btn.title = inAny ? '단어장에서 제거' : '단어장에 추가';
}

function toggleBookmark() {
    if (!deck.length || !vocabBooks.length) {
        if (!vocabBooks.length) {
            alert('단어장을 먼저 만들어주세요.');
        }

        return;
    }

    if (vocabBooks.length === 1) {
        addToVocab(vocabBooks[0].id);
    }
    else {
        const d = deck[currentPage];
        const names = vocabBooks.map((v, i) => `${i + 1}. ${v.name}`).join('\n');
        const idx = prompt(`추가할 단어장 번호를 입력하세요:\n${names}`);
        
        const i = parseInt(idx) - 1;
        if (!isNaN(i) && i >= 0 && i < vocabBooks.length) {
            addToVocab(vocabBooks[i].id);
        }
    }
}

function addToVocab(id) {
    const vocab = vocabBooks.find(voca => voca.id === id);

    if(!vocab) {
        return;
    }

    const d = deck[currentPage];
    const allPool = [];

    for(let i = 0; i < 8; i++) {
        ALL_HANJA[i].forEach(h => allPool.push({...h, level: (i + 1)}));
    }

    const full = allPool.find(h => h.char === d.char) || d;

    if (!vocab.chars.some(c => c.char === full.char)) {
        vocab.chars.push(full);
    }
    else {
        vocab.chars = vocab.chars.filter(c => c.char !== full.char);
    }

    renderVocabList();
    updateBookmarkBtn();
}

//#endregion

// #region Canvas

function saveSnapshot() {
    historyStack.push(canvas.toDataURL());
    redoStack = [];
    updateUndoRedo();
}

function updateUndoRedo() {
    document.getElementById('undoBtn').disabled = historyStack.length === 0;
    document.getElementById('redoBtn').disabled = redoStack.length === 0;
}

/** 실행 취소 */
function undo() {
    if(!historyStack.length) {
        return;
    }

    redoStack.push(canvas.toDataURL());
  
    const img = new Image();
    img.src = historyStack.pop();
    img.addEventListener('load', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
    });
    
    updateUndoRedo();
}

/** 실행 취소 복구 */
function redo() {
    if(!redoStack.length) {
        return;
    }

    historyStack.push(canvas.toDataURL());

    const img = new Image();
    img.src = redoStack.pop();
    img.addEventListener('load', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
    });

    updateUndoRedo();
}

/** 캔버스 초기화 */
function clearCanvas() {
    historyStack = [];
    redoStack = [];

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    updateUndoRedo();
}

/** 굵기 변경 */
function setThickness(width, element) {
    drawingThickness = width;
    document.querySelectorAll('[data-type="width"]').forEach(doc => doc.classList.remove('active'));
    element.classList.add('active');
}

/** 색깔 변경 */
function setColor(color, element) {
    drawingColor = color;
    document.querySelectorAll('[data-type="color"]').forEach(doc => doc.classList.remove('active'));
    element.classList.add('active');
}

/** 커서 위치 반환 */
function getPos(event) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;

    if(event.touches) {
        return {
            x: (event.touches[0].clientX - rect.left) * sx,
            y: (event.touches[0].clientY - rect.top) * sy
        };
    }

    return {
        x: (event.clientX - rect.left) * sx,
        y: (event.clientY - rect.top) * sy
    };
}

/** 필기 시작 */
function startDraw(event) {
    setIsDrawing(true);
    saveSnapshot();

    const pos = getPos(event);
    
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = drawingColor;
    ctx.lineWidth = drawingThickness;
}

/** 필기 */
function draw(event) {
    if(!isDrawing) {
        return;
    }

    const pos = getPos(event);

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
}

function setIsDrawing(value) {
    isDrawing = value;
}

// #endregion

//#region Event

window.addEventListener('load', () => init());

//#region Canvas Event

canvas.addEventListener('mousedown', event => startDraw(event));
canvas.addEventListener('mousemove', event => draw(event));
canvas.addEventListener('mouseup', () => setIsDrawing(false));
canvas.addEventListener('mouseleave', () => setIsDrawing(false));

canvas.addEventListener('touchstart', event => startDraw(event), {passive: false});
canvas.addEventListener('touchmove', event => draw(event), {passive: false});
canvas.addEventListener('touchend', () => setIsDrawing(false));

//#endregion

//#region Display Event

document.getElementById('showChar').addEventListener('change', () => {
    toggleIsShowChar();
});
document.getElementById('showReading').addEventListener('change', () => {
    toggleIsShowReading();
});
document.getElementById('showMeaning').addEventListener('change', () => {
    toggleIsShowMeaning();
});

//#endregion

document.getElementById('navPrevCardBtn').addEventListener('click', () => prevCard());
document.getElementById('navNextCardBtn').addEventListener('click', () => nextCard());

document.getElementById('thicknessBtn1').addEventListener('click', event => setThickness(2, event.target));
document.getElementById('thicknessBtn2').addEventListener('click', event => setThickness(4, event.target));
document.getElementById('thicknessBtn3').addEventListener('click', event => setThickness(7, event.target));
document.getElementById('colorBtn').addEventListener('click', event => setColor('#ffffff', event.target));

document.getElementById('undoBtn').addEventListener('click', () => undo());
document.getElementById('redoBtn').addEventListener('click', () => redo());
document.getElementById('clearCanvasBtn').addEventListener('click', () => clearCanvas());

document.getElementById('bookmarkBtn').addEventListener('click', () => toggleBookmark());

document.getElementById('vocabularyAddBtn').addEventListener('click', () => createVocabulary());

document.getElementById('modalOverlay').addEventListener('click', event => {
    if (event.target === this) {
        closeModal();
    }
});

document.getElementById('modalSearch').addEventListener('input', () => renderModalGrid());
document.getElementById('modalCloseBtn').addEventListener('click', () => closeModal());
document.getElementById('modalConfirm').addEventListener('click', () => confirmModal());

document.addEventListener('keydown', event => {
    const tag = document.activeElement.tagName.toLowerCase();

    if(tag === 'input' || tag === 'textarea' || document.getElementById('modalOverlay').classList.contains('open')) {
        return;
    }
    else if(event.ctrlKey && event.key === 'z') {
        undo();
        return;
    }
    else if(event.ctrlKey && event.key === 'y') {
        redo();
        return;
    }

    switch(event.key) {
        case 'ArrowLeft':
        case 'a':
            prevCard();
            break;

        case'ArrowRight':
        case 'd':
            nextCard();
            break;

        case '1':
            toggleIsShowChar();
            break;

        case '2':
            toggleIsShowMeaning();
            break;

        case '3':
            toggleIsShowReading();
            break;
    }
});

//#endregion
