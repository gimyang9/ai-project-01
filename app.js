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
const $ = (id) => document.getElementById(id);
const dialog = $('material-dialog');
const deleteDialog = $('delete-dialog');
const form = $('material-form');
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
    const remaining = card.querySelector('.card-bottom b');
    remaining.replaceChildren(document.createTextNode(format(material.total - material.current)), node('span', 'remaining-unit', material.unit));
    const actions = node('div', 'card-actions');
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
    actions.append(edit, remove);
    card.append(actions);
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
[dialog, deleteDialog].forEach((modal) => {
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
  else materials.push({ id: crypto.randomUUID(), name, type, unit, total, current: 0, round: 1 });
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
