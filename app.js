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
const $ = (id) => document.getElementById(id);
const dialog = $('material-dialog');
const deleteDialog = $('delete-dialog');
const form = $('material-form');
const progressDialog = $('progress-dialog');
const nextRoundDialog = $('next-round-dialog');
const roundHistoryDialog = $('round-history-dialog');
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
    actions.append(record, edit, remove);
    card.append(actions);
    if (completed || material.roundHistory.length) {
      const roundActions = node('div', 'round-actions');
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
[dialog, deleteDialog, progressDialog, nextRoundDialog, roundHistoryDialog].forEach((modal) => {
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
  else materials.push({ id: crypto.randomUUID(), name, type, unit, total, current: 0, round: 1, records: [], roundHistory: [] });
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
