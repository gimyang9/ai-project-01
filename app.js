'use strict';
const types = {
  book: { label: '교재', units: ['페이지', '챕터'] },
  workbook: { label: '문제집', units: ['페이지', '문제'] },
  lecture: { label: '인터넷 강의', units: ['강', '챕터'] },
  vocabulary: { label: '단어 학습', units: ['단어', 'Day'] },
  other: { label: '기타', units: [] }
};
let materials = [];
let showingExamples = true;
let editingId = null;
let deletingId = null;
let activeMaterialId = null;
let editingRecordId = null;
let recordSequence = 0;
let nextRoundMaterialId = null;
let historyMaterialId = null;
let reviewMaterialId = null;
let editingReviewId = null;
let noteMaterialId = null;
const storageKey = 'study-progress-data-v1';
let storageBlocked = false;
const $ = (id) => document.getElementById(id);
const dialog = $('material-dialog');
const deleteDialog = $('delete-dialog');
const form = $('material-form');
const progressDialog = $('progress-dialog');
const nextRoundDialog = $('next-round-dialog');
const roundHistoryDialog = $('round-history-dialog');
const reviewDialog = $('review-dialog');
const noteDialog = $('note-dialog');
const completedIcon = $('material-cards').lastElementChild.querySelector('.state svg').cloneNode(true);
const format = (number) => number.toLocaleString('ko-KR');
const template = $('material-cards').firstElementChild.cloneNode(true);
const lectureIcon = $('material-cards').lastElementChild.querySelector('.type-icon').cloneNode(true);

function node(tag, className, text) {
  const result = document.createElement(tag);
  if (className) result.className = className;
  if (text !== undefined) result.textContent = text;
  return result;
}

function render() {
  if (showingExamples) return;
  $('material-count').textContent = format(materials.length);
  $('example-label').hidden = true;
  $('preview-note').hidden = true;
  $('empty-state').hidden = materials.length !== 0;
  const cards = $('material-cards');
  cards.replaceChildren();
  materials.forEach((material) => {
    const card = template.cloneNode(true);
    card.querySelector('h3').textContent = material.name;
    card.querySelector('.type-label').textContent = types[material.type].label;
    if (material.type === 'lecture') card.querySelector('.type-icon').replaceWith(lectureIcon.cloneNode(true));
    card.querySelector('.round').textContent = `${material.round}회독`;
    const current = card.querySelector('.progress-number strong');
    current.replaceChildren(document.createTextNode(format(material.current)));
    const total = node('span', 'total');
    const quantity = node('span', '', format(material.total));
    quantity.append(node('span', 'unit', material.unit));
    total.append(node('span', '', '/'), quantity);
    current.append(total);
    const percent = Math.round(material.current / material.total * 100);
    const percentage = card.querySelector('.progress-row strong');
    percentage.replaceChildren(document.createTextNode(format(percent)), node('span', '', '%'));
    const track = card.querySelector('.progress-track');
    track.setAttribute('aria-label', `${material.name} 진행률`);
    track.setAttribute('aria-valuenow', String(percent));
    track.firstElementChild.style.width = `${percent}%`;
    const completed = material.current === material.total;
    card.classList.toggle('completed', completed);
    const state = card.querySelector('.state');
    state.replaceChildren();
    if (completed) state.append(completedIcon.cloneNode(true));
    state.append(document.createTextNode(completed ? '회독 완료' : '학습 중'));
    const remaining = card.querySelector('.card-bottom b');
    remaining.replaceChildren(document.createTextNode(format(material.total - material.current)), node('span', 'remaining-unit', material.unit));
    const actions = node('div', 'card-actions');
    const record = node('button', 'record-button', '진도 기록');
    record.type = 'button';
    record.setAttribute('aria-label', `${material.name} 진도 기록`);
    record.addEventListener('click', () => openRecords(material));
    const memo = node('button', 'text-button', '메모');
    memo.type = 'button';
    memo.setAttribute('aria-label', `${material.name} 메모`);
    memo.addEventListener('click', () => openNote(material));
    const edit = node('button', 'text-button', '수정');
    edit.type = 'button';
    edit.setAttribute('aria-label', `${material.name} 수정`);
    edit.addEventListener('click', () => openForm(material));
    const remove = node('button', 'text-button', '삭제');
    remove.type = 'button';
    remove.setAttribute('aria-label', `${material.name} 삭제`);
    remove.addEventListener('click', () => {
      deletingId = material.id;
      $('delete-description').textContent = `‘${material.name}’ 자료가 목록에서 삭제됩니다.`;
      deleteDialog.showModal();
    });
    actions.append(record, memo, edit, remove);
    card.append(actions);
    {
      const roundActions = node('div', 'round-actions');
      const review = node('button', 'text-button', '부분 복습');
      review.type = 'button';
      review.setAttribute('aria-label', `${material.name} 부분 복습 기록`);
      review.addEventListener('click', () => openReviews(material));
      roundActions.append(review);
      if (material.roundHistory.length) {
        const history = node('button', 'text-button', '회독 기록');
        history.type = 'button';
        history.setAttribute('aria-label', `${material.name} 이전 회독 기록`);
        history.addEventListener('click', () => openRoundHistory(material));
        roundActions.append(history);
      }
      if (completed) {
        const next = node('button', 'secondary-button', '다음 회독 시작');
        next.type = 'button';
        next.addEventListener('click', () => {
          nextRoundMaterialId = material.id;
          $('next-round-description').textContent = `${material.round}회독 기록을 보관하고 ${material.round + 1}회독을 0부터 시작합니다.`;
          nextRoundDialog.showModal();
        });
        roundActions.append(next);
      }
      card.append(roundActions);
    }
    cards.append(card);
  });
  saveData();
}

function updateTotalUnit() {
  $('total-unit-label').textContent = $('material-type').value === 'other'
    ? $('custom-unit').value.trim() || '단위' : $('material-unit').value;
}

function updateUnitOptions(selectedUnit) {
  const type = $('material-type').value;
  const custom = type === 'other';
  $('unit-select-field').hidden = custom;
  $('custom-unit-field').hidden = !custom;
  $('material-unit').disabled = custom;
  $('custom-unit').disabled = !custom;
  $('material-unit').replaceChildren();
  types[type].units.forEach((unit) => {
    const option = node('option', '', unit);
    option.value = unit;
    $('material-unit').append(option);
  });
  if (selectedUnit && types[type].units.includes(selectedUnit)) $('material-unit').value = selectedUnit;
  updateTotalUnit();
}

function openForm(material) {
  editingId = material?.id || null;
  form.reset();
  $('form-error').hidden = true;
  $('dialog-title').textContent = material ? '학습 자료 수정' : '학습 자료 추가';
  $('save-material').textContent = material ? '저장' : '추가';
  if (material) {
    $('material-name').value = material.name;
    $('material-type').value = material.type;
    $('material-total').value = material.total;
    if (material.type === 'other') $('custom-unit').value = material.unit;
  }
  updateUnitOptions(material?.unit);
  dialog.showModal();
  $('material-name').focus();
}

function error(message, field) {
  $('form-error').textContent = message;
  $('form-error').hidden = false;
  field.focus();
}

$('add-material').addEventListener('click', () => openForm());
$('material-type').addEventListener('change', () => updateUnitOptions());
$('material-unit').addEventListener('change', updateTotalUnit);
$('custom-unit').addEventListener('input', updateTotalUnit);
document.querySelectorAll('[data-close]').forEach((button) => {
  button.addEventListener('click', () => $(button.dataset.close).close());
});
[dialog, deleteDialog, progressDialog, nextRoundDialog, roundHistoryDialog, reviewDialog, noteDialog].forEach((modal) => {
  modal.addEventListener('click', (event) => {
    if (event.target !== modal) return;
    const bounds = modal.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) modal.close();
  });
});
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = $('material-name').value.trim();
  const type = $('material-type').value;
  const unit = type === 'other' ? $('custom-unit').value.trim() : $('material-unit').value;
  const total = Number($('material-total').value);
  if (!name) return error('자료 이름을 입력해 주세요.', $('material-name'));
  if (!unit) return error('사용할 학습 단위를 입력해 주세요.', $('custom-unit'));
  if (!Number.isSafeInteger(total) || total < 1) return error('전체 분량은 1 이상의 정수로 입력해 주세요.', $('material-total'));
  const existing = materials.find((material) => material.id === editingId);
  if (existing && total < existing.current) return error('전체 분량은 현재 진도보다 작을 수 없어요.', $('material-total'));
  if (existing) Object.assign(existing, { name, type, unit, total });
  else materials.push({ id: crypto.randomUUID(), name, type, unit, total, current: 0, round: 1, records: [], roundHistory: [], reviews: [], note: '' });
  showingExamples = false;
  dialog.close();
  render();
  $('status').textContent = existing ? '자료를 수정했습니다.' : '자료를 추가했습니다.';
  $('add-material').focus();
});
$('confirm-delete').addEventListener('click', () => {
  materials = materials.filter((material) => material.id !== deletingId);
  deleteDialog.close();
  render();
  deletingId = null;
  $('add-material').focus();
  $('status').textContent = '자료를 삭제했습니다.';
});

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function sortedRecords(records) {
  return [...records].sort((a, b) => a.date.localeCompare(b.date) || a.sequence - b.sequence);
}

function calculateRecords(records, total) {
  let previous = 0;
  return sortedRecords(records).map((record) => {
    if (!Number.isSafeInteger(record.position) || record.position < 0 || record.position > total) {
      throw new Error(`현재 위치는 0부터 ${format(total)} 사이의 정수로 입력해 주세요.`);
    }
    if (record.position < previous) {
      throw new Error('날짜순으로 공부 위치가 줄어들 수 없어요. 앞뒤 기록의 날짜와 위치를 확인해 주세요.');
    }
    const calculated = { ...record, amount: record.position - previous };
    previous = record.position;
    return calculated;
  });
}

function recalculate(material) {
  material.records = calculateRecords(material.records, material.total);
  material.current = material.records.at(-1)?.position || 0;
}

function activeMaterial() {
  return materials.find((material) => material.id === activeMaterialId);
}

function resetRecordForm() {
  const material = activeMaterial();
  editingRecordId = null;
  $('record-form').reset();
  $('record-date').value = today();
  $('record-position').value = '';
  $('record-position').removeAttribute('placeholder');
  $('record-position').max = String(material.total);
  $('record-unit').textContent = material.unit;
  $('record-total').textContent = format(material.total);
  $('save-record').textContent = '기록';
  $('cancel-record-edit').hidden = true;
  $('record-error').hidden = true;
}

function openRecords(material) {
  activeMaterialId = material.id;
  resetRecordForm();
  renderRecords();
  progressDialog.showModal();
  $('record-position').focus();
}

function renderRecords() {
  const material = activeMaterial();
  $('record-material-name').textContent = material.name;
  $('history-empty').hidden = material.records.length !== 0;
  const list = $('record-list');
  list.replaceChildren();
  [...material.records].reverse().forEach((record) => {
    const item = node('li', 'record-item');
    const top = node('div', 'record-top');
    const date = node('time', 'record-date', record.date);
    date.setAttribute('datetime', record.date);
    top.append(date);
    const detail = node('div', 'record-detail');
    const position = node('span', 'record-metric');
    const positionValue = node('span', 'record-metric-value');
    positionValue.append(node('strong', '', format(record.position)), node('span', 'remaining-unit', material.unit));
    position.append(node('span', 'record-metric-label', '현재 위치'), positionValue);
    const amount = node('span', 'record-metric');
    const amountValue = node('span', 'record-metric-value');
    amountValue.append(node('strong', '', `${record.amount > 0 ? '+' : ''}${format(record.amount)}`), node('span', 'remaining-unit', material.unit));
    amount.append(node('span', 'record-metric-label', '학습량'), amountValue);
    detail.append(amount, position);
    const actions = node('div', 'record-actions');
    const edit = node('button', 'text-button', '수정');
    edit.type = 'button';
    edit.setAttribute('aria-label', `${record.date} ${record.position}${material.unit} 기록 수정`);
    edit.addEventListener('click', () => {
      editingRecordId = record.id;
      $('record-date').value = record.date;
      $('record-position').value = record.position;
      $('save-record').textContent = '저장';
      $('cancel-record-edit').hidden = false;
      $('record-error').hidden = true;
      $('record-position').focus();
    });
    const remove = node('button', 'text-button', '삭제');
    remove.type = 'button';
    remove.setAttribute('aria-label', `${record.date} ${record.position}${material.unit} 기록 삭제`);
    remove.addEventListener('click', () => {
      material.records = material.records.filter((entry) => entry.id !== record.id);
      recalculate(material);
      resetRecordForm();
      renderRecords();
      render();
      $('save-record').focus();
      $('status').textContent = '기록을 삭제하고 진도를 다시 계산했습니다.';
    });
    actions.append(edit, remove);
    top.append(actions);
    item.append(top, detail);
    list.append(item);
  });
}

$('cancel-record-edit').addEventListener('click', resetRecordForm);
$('record-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const material = activeMaterial();
  const date = $('record-date').value;
  const rawPosition = $('record-position').value;
  const position = Number(rawPosition);
  const fail = (message, field) => {
    $('record-error').textContent = message;
    $('record-error').hidden = false;
    field.focus();
  };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || date > today()) {
    return fail('오늘 또는 이전의 공부 날짜를 선택해 주세요.', $('record-date'));
  }
  if (!rawPosition.trim() || !Number.isSafeInteger(position) || position < 0 || position > material.total) {
    return fail(`현재 위치는 0부터 ${format(material.total)} 사이의 정수로 입력해 주세요.`, $('record-position'));
  }
  const existing = material.records.find((record) => record.id === editingRecordId);
  const record = { id: existing?.id || crypto.randomUUID(), date, position, sequence: existing?.sequence ?? recordSequence };
  const nextRecords = existing
    ? material.records.map((entry) => entry.id === existing.id ? record : entry)
    : [...material.records, record];
  try {
    material.records = calculateRecords(nextRecords, material.total);
  } catch (cause) {
    return fail(cause.message, $('record-position'));
  }
  if (!existing) recordSequence += 1;
  recalculate(material);
  resetRecordForm();
  renderRecords();
  render();
  $('status').textContent = existing ? '기록을 수정했습니다.' : '진도를 기록했습니다.';
});

function startNextRound(material) {
  if (material.current !== material.total) return false;
  material.roundHistory.push({
    round: material.round,
    total: material.total,
    unit: material.unit,
    completedDate: material.records.at(-1)?.date || today(),
    records: material.records.map((record) => ({ ...record }))
  });
  material.round += 1;
  material.current = 0;
  material.records = [];
  return true;
}

$('confirm-next-round').addEventListener('click', () => {
  const material = materials.find((entry) => entry.id === nextRoundMaterialId);
  if (!material || !startNextRound(material)) return;
  nextRoundDialog.close();
  nextRoundMaterialId = null;
  render();
  $('status').textContent = `${material.round}회독을 시작했습니다. 이전 회독 기록은 회독 기록에서 확인할 수 있어요.`;
  openRecords(material);
});

function openRoundHistory(material) {
  historyMaterialId = material.id;
  $('round-history-material').textContent = material.name;
  const select = $('history-round');
  select.replaceChildren();
  [...material.roundHistory].reverse().forEach((round) => {
    const option = node('option', '', `${round.round}회독`);
    option.value = String(round.round);
    select.append(option);
  });
  select.value = String(material.roundHistory.at(-1).round);
  renderRoundHistory();
  roundHistoryDialog.showModal();
}

function renderRoundHistory() {
  const material = materials.find((entry) => entry.id === historyMaterialId);
  const round = material?.roundHistory.find((entry) => entry.round === Number($('history-round').value));
  if (!round) return;
  $('round-history-summary').textContent = `${round.completedDate} 완료 · ${format(round.total)} ${round.unit} · 100%`;
  const list = $('round-history-list');
  list.replaceChildren();
  [...round.records].reverse().forEach((record) => {
    const item = node('li', 'record-item');
    const date = node('time', 'record-date', record.date);
    date.setAttribute('datetime', record.date);
    const detail = node('div', 'record-detail');
    for (const [label, value] of [
      ['학습량', `${record.amount > 0 ? '+' : ''}${format(record.amount)}`],
      ['현재 위치', format(record.position)]
    ]) {
      const metric = node('span', 'record-metric');
      const quantity = node('span', 'record-metric-value');
      quantity.append(node('strong', '', value), node('span', 'remaining-unit', round.unit));
      metric.append(node('span', 'record-metric-label', label), quantity);
      detail.append(metric);
    }
    item.append(date, detail);
    list.append(item);
  });
}

$('history-round').addEventListener('change', renderRoundHistory);

function reviewMaterial() {
  return materials.find((material) => material.id === reviewMaterialId);
}

function resetReviewForm() {
  const material = reviewMaterial();
  editingReviewId = null;
  $('review-form').reset();
  $('review-date').value = today();
  $('review-start').value = '';
  $('review-end').value = '';
  $('review-start').max = $('review-end').max = String(material.total);
  $('review-start-unit').textContent = $('review-end-unit').textContent = material.unit;
  $('save-review').textContent = '기록';
  $('cancel-review-edit').hidden = true;
  $('review-error').hidden = true;
}

function openReviews(material) {
  reviewMaterialId = material.id;
  $('review-material-name').textContent = material.name;
  resetReviewForm();
  renderReviews();
  reviewDialog.showModal();
  $('review-start').focus();
}

function renderReviews() {
  const material = reviewMaterial();
  $('review-empty').hidden = material.reviews.length !== 0;
  const list = $('review-list');
  list.replaceChildren();
  [...material.reviews].sort((a, b) => b.date.localeCompare(a.date) || b.sequence - a.sequence).forEach((review) => {
    const item = node('li', 'record-item');
    const top = node('div', 'record-top');
    const date = node('time', 'record-date', review.date);
    date.setAttribute('datetime', review.date);
    top.append(date);
    const detail = node('div', 'record-detail');
    const range = node('span', 'record-metric');
    const value = node('span', 'record-metric-value');
    value.append(node('strong', '', `${format(review.start)}–${format(review.end)}`), node('span', 'remaining-unit', review.unit));
    range.append(value);
    detail.append(range);
    const actions = node('div', 'record-actions');
    const edit = node('button', 'text-button', '수정');
    edit.type = 'button';
    edit.setAttribute('aria-label', `${review.date} 복습 기록 수정`);
    edit.addEventListener('click', () => {
      editingReviewId = review.id;
      $('review-date').value = review.date;
      $('review-start').value = review.start;
      $('review-end').value = review.end;
      $('review-start').max = $('review-end').max = String(review.total);
      $('review-start-unit').textContent = $('review-end-unit').textContent = review.unit;
      $('save-review').textContent = '저장';
      $('cancel-review-edit').hidden = false;
      $('review-error').hidden = true;
      $('review-start').focus();
    });
    const remove = node('button', 'text-button', '삭제');
    remove.type = 'button';
    remove.setAttribute('aria-label', `${review.date} 복습 기록 삭제`);
    remove.addEventListener('click', () => {
      material.reviews = material.reviews.filter((entry) => entry.id !== review.id);
      resetReviewForm();
      renderReviews();
      render();
      $('save-review').focus();
      $('status').textContent = '부분 복습 기록을 삭제했습니다.';
    });
    actions.append(edit, remove);
    top.append(actions);
    item.append(top, detail);
    list.append(item);
  });
}

$('cancel-review-edit').addEventListener('click', resetReviewForm);
$('review-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const material = reviewMaterial();
  const existing = material.reviews.find((entry) => entry.id === editingReviewId);
  const total = existing?.total ?? material.total;
  const date = $('review-date').value;
  const start = Number($('review-start').value);
  const end = Number($('review-end').value);
  const fail = (message, field) => {
    $('review-error').textContent = message;
    $('review-error').hidden = false;
    field.focus();
  };
  if (!validStoredDate(date) || date > today()) return fail('오늘 또는 이전의 복습 날짜를 선택해 주세요.', $('review-date'));
  if (!$('review-start').value.trim() || !Number.isSafeInteger(start) || start < 1 || start > total) {
    return fail(`시작 위치는 1부터 ${format(total)} 사이의 정수로 입력해 주세요.`, $('review-start'));
  }
  if (!$('review-end').value.trim() || !Number.isSafeInteger(end) || end < start || end > total) {
    return fail(`끝 위치는 시작 위치부터 ${format(total)} 사이의 정수로 입력해 주세요.`, $('review-end'));
  }
  const review = { id: existing?.id || crypto.randomUUID(), date, start, end, total, unit: existing?.unit ?? material.unit, sequence: existing?.sequence ?? recordSequence };
  if (existing) material.reviews = material.reviews.map((entry) => entry.id === existing.id ? review : entry);
  else { material.reviews.push(review); recordSequence += 1; }
  resetReviewForm();
  renderReviews();
  render();
  $('status').textContent = existing ? '부분 복습 기록을 수정했습니다.' : '부분 복습을 기록했습니다.';
});

function saveData() {
  if (storageBlocked) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify({ version: 1, materials, recordSequence }));
    $('storage-note').textContent = '자료와 기록이 자동으로 저장됩니다.';
  } catch {
    $('storage-note').textContent = '기록을 저장하지 못했어요. 저장 공간과 브라우저 설정을 확인해 주세요. 새로고침하면 이번 변경이 사라질 수 있어요.';
  }
}

function validStoredDate(date) {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
}

function loadData() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === null) return;
    const saved = JSON.parse(raw);
    const check = (condition) => { if (!condition) throw new Error('Invalid saved data'); };
    const positive = (value) => Number.isSafeInteger(value) && value > 0;
    const text = (value) => typeof value === 'string' && value.trim().length > 0;
    const ids = new Set();
    let maxSequence = -1;
    const checkRecord = (entry) => {
      check(entry && text(entry.id) && !ids.has(entry.id) && validStoredDate(entry.date) && Number.isSafeInteger(entry.sequence) && entry.sequence >= 0);
      ids.add(entry.id);
      maxSequence = Math.max(maxSequence, entry.sequence);
    };
    check(saved?.version === 1 && Array.isArray(saved.materials));
    for (const material of saved.materials) {
      check(material && text(material.id) && !ids.has(material.id) && text(material.name) && Object.hasOwn(types, material.type) && text(material.unit) && positive(material.total) && positive(material.round));
      ids.add(material.id);
      if (material.note === undefined) material.note = '';
      check(typeof material.note === 'string');
      check(Array.isArray(material.records) && Array.isArray(material.roundHistory) && Array.isArray(material.reviews));
      material.records.forEach(checkRecord);
      recalculate(material);
      check(material.roundHistory.length === material.round - 1);
      material.roundHistory.forEach((round, index) => {
        check(round && round.round === index + 1 && positive(round.total) && text(round.unit) && validStoredDate(round.completedDate) && Array.isArray(round.records));
        round.records.forEach(checkRecord);
        round.records = calculateRecords(round.records, round.total);
        check(round.records.at(-1)?.position === round.total);
      });
      material.reviews.forEach((review) => {
        checkRecord(review);
        check(positive(review.total) && text(review.unit) && positive(review.start) && positive(review.end) && review.start <= review.end && review.end <= review.total);
      });
    }
    materials = saved.materials;
    recordSequence = maxSequence + 1;
    showingExamples = false;
    render();
  } catch {
    storageBlocked = true;
    $('storage-note').textContent = '저장된 기록을 불러오지 못했어요. 기존 데이터를 보호하기 위해 자동 저장을 멈췄습니다.';
  }
}

function openNote(material) {
  noteMaterialId = material.id;
  $('note-material-name').textContent = material.name;
  $('material-note').value = material.note || '';
  noteDialog.showModal();
  $('material-note').focus();
}

$('note-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const material = materials.find((entry) => entry.id === noteMaterialId);
  if (!material) return;
  material.note = $('material-note').value;
  render();
  noteDialog.close();
  $('status').textContent = '메모를 저장했습니다.';
});

loadData();
