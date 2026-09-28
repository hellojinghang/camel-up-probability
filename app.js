import {
  CRAZY_CAMELS,
  EDITIONS,
  GRAY_DIE,
  RACING_CAMELS,
  displayCamelName,
  fractionString,
  rollsRemainingThisLeg,
  validateSetup,
} from './simulator.js';

const STORAGE_KEY = 'camel-up-probability-v3';

const CAMEL_STYLE = {
  Blue: { color: '#3973d7', text: '#fff', short: 'B' },
  Green: { color: '#4a9a61', text: '#fff', short: 'G' },
  Orange: { color: '#e18431', text: '#fff', short: 'O' },
  Yellow: { color: '#e7bd32', text: '#3a2c0c', short: 'Y' },
  White: { color: '#fbfaf4', text: '#352e25', short: 'W', border: '#8c8378' },
  CrazyWhite: { color: '#fbfaf4', text: '#201f1d', short: 'CW', crazy: 'crazy-white' },
  CrazyBlack: { color: '#262626', text: '#fff', short: 'CB', crazy: 'crazy-black' },
};

const TRACK_COORDS = {
  1: [1, 1], 2: [1, 2], 3: [1, 3], 4: [1, 4], 5: [1, 5],
  6: [2, 5], 7: [3, 5], 8: [4, 5], 9: [5, 5],
  10: [5, 4], 11: [5, 3], 12: [5, 2], 13: [5, 1],
  14: [4, 1], 15: [3, 1], 16: [2, 1],
};

const elements = {
  editionHelp: document.querySelector('#editionHelp'),
  editionButtons: [...document.querySelectorAll('[data-edition]')],
  pieceTray: document.querySelector('#pieceTray'),
  gameBoard: document.querySelector('#gameBoard'),
  selectedToolStatus: document.querySelector('#selectedToolStatus'),
  boardToolButtons: [...document.querySelectorAll('[data-board-tool]')],
  crazyLegend: document.querySelector('#crazyLegend'),
  exampleButton: document.querySelector('#exampleButton'),
  exampleButtonMobile: document.querySelector('#exampleButtonMobile'),
  clearBoardButton: document.querySelector('#clearBoardButton'),
  clearBoardButtonMobile: document.querySelector('#clearBoardButtonMobile'),
  diceTray: document.querySelector('#diceTray'),
  diceHelp: document.querySelector('#diceHelp'),
  rollsInfo: document.querySelector('#rollsInfo'),
  selectAllDiceButton: document.querySelector('#selectAllDiceButton'),
  selectNoDiceButton: document.querySelector('#selectNoDiceButton'),
  validationBox: document.querySelector('#validationBox'),
  runButton: document.querySelector('#runButton'),
  resetButton: document.querySelector('#resetButton'),
  resultsSection: document.querySelector('#resultsSection'),
  resultMeta: document.querySelector('#resultMeta'),
  resultsTableWrap: document.querySelector('#resultsTableWrap'),
  resultsGrid: document.querySelector('#resultsGrid'),
  stackDialog: document.querySelector('#stackDialog'),
  stackDialogTitle: document.querySelector('#stackDialogTitle'),
  stackEditorList: document.querySelector('#stackEditorList'),
  closeStackDialog: document.querySelector('#closeStackDialog'),
  doneStackDialog: document.querySelector('#doneStackDialog'),
};

function makeDefaultState() {
  return {
    editionId: 'classic',
    boardStacks: {},
    spectators: {},
    remainingDice: [...EDITIONS.classic.dice],
    selectedTool: { type: 'camel', id: 'Blue' },
  };
}

let state = loadState();
let worker = null;
let stackEditorTile = null;

function activeCamels() {
  return EDITIONS[state.editionId].activeCamels;
}

function activeDice() {
  return EDITIONS[state.editionId].dice;
}

function sanitizeSelectedTool(tool, edition) {
  if (!tool || typeof tool !== 'object') return null;
  if (tool.type === 'camel' && edition.activeCamels.includes(tool.id)) return { type: 'camel', id: tool.id };
  if (tool.type === 'spectator' && ['oasis', 'mirage'].includes(tool.effect)) return { type: 'spectator', effect: tool.effect };
  if (tool.type === 'erase') return { type: 'erase' };
  return null;
}

function sanitizeState(candidate) {
  const base = makeDefaultState();
  if (!candidate || !EDITIONS[candidate.editionId]) return base;

  const edition = EDITIONS[candidate.editionId];
  const activeSet = new Set(edition.activeCamels);
  const boardStacks = {};
  const seenCamels = new Set();

  for (const [tileText, stack] of Object.entries(candidate.boardStacks ?? {})) {
    const tile = Number(tileText);
    if (!Number.isInteger(tile) || tile < 1 || tile > 16 || !Array.isArray(stack)) continue;
    const clean = stack.filter((camel) => {
      if (!activeSet.has(camel) || seenCamels.has(camel)) return false;
      seenCamels.add(camel);
      return true;
    });
    if (clean.length) boardStacks[tile] = clean;
  }

  const remainingDice = (candidate.remainingDice ?? []).filter((die, index, arr) => edition.dice.includes(die) && arr.indexOf(die) === index);
  const spectators = {};
  for (const [tileText, effect] of Object.entries(candidate.spectators ?? {})) {
    const tile = Number(tileText);
    if (Number.isInteger(tile) && tile >= 1 && tile <= 16 && ['oasis', 'mirage'].includes(effect)) spectators[tile] = effect;
  }

  return {
    editionId: candidate.editionId,
    boardStacks,
    spectators,
    remainingDice,
    selectedTool: sanitizeSelectedTool(candidate.selectedTool, edition),
  };
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return sanitizeState(stored);
  } catch {
    return makeDefaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function camelStyle(camel) {
  return CAMEL_STYLE[camel];
}

function camelDot(camel) {
  const style = camelStyle(camel);
  return `<span class="camel-dot ${style.crazy ?? ''}" style="${style.crazy ? '' : `background:${style.color};border-color:${style.border ?? 'rgba(0,0,0,.22)'}`}" aria-hidden="true"></span>`;
}

function camelButton(camel) {
  const placed = findCamel(camel) !== null;
  const selected = state.selectedTool?.type === 'camel' && state.selectedTool.id === camel;
  return `
    <button class="camel-piece ${placed ? 'placed' : ''} ${selected ? 'selected' : ''}" type="button" data-select-camel="${camel}" aria-pressed="${selected}">
      ${camelDot(camel)}
      <span>${displayCamelName(camel)}</span>
    </button>
  `;
}

function renderPieceTray() {
  elements.pieceTray.innerHTML = activeCamels().map(camelButton).join('');
  elements.pieceTray.querySelectorAll('[data-select-camel]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedTool = { type: 'camel', id: button.dataset.selectCamel };
      renderBoardAndTray();
      saveState();
      clearValidation();
    });
  });
}

function findCamel(camel) {
  for (const [tile, stack] of Object.entries(state.boardStacks)) {
    const index = stack.indexOf(camel);
    if (index !== -1) return { tile: Number(tile), index };
  }
  return null;
}

function removeCamel(camel) {
  for (const [tile, stack] of Object.entries(state.boardStacks)) {
    const filtered = stack.filter((item) => item !== camel);
    if (filtered.length) state.boardStacks[tile] = filtered;
    else delete state.boardStacks[tile];
  }
}

function positionsFromBoard() {
  const positions = {};
  for (const [tileText, stack] of Object.entries(state.boardStacks)) {
    const tile = Number(tileText);
    stack.forEach((camel, index) => {
      if (activeCamels().includes(camel)) positions[camel] = { tile, stack: index };
    });
  }
  return positions;
}

function selectedToolText() {
  const tool = state.selectedTool;
  if (!tool) return 'Nothing selected · tap an occupied space to edit its stack';
  if (tool.type === 'camel') {
    const where = findCamel(tool.id);
    return `${displayCamelName(tool.id)}${where ? ` · currently on ${where.tile}` : ' · ready to place'}`;
  }
  if (tool.type === 'spectator') return tool.effect === 'oasis' ? 'Oasis +1 · tap a legal space' : 'Mirage −1 · tap a legal space';
  if (tool.type === 'erase') return 'Remove spectator tile · tap the tile';
  return 'Choose a camel or board tool';
}

function renderToolBar() {
  elements.selectedToolStatus.textContent = selectedToolText();
  elements.boardToolButtons.forEach((button) => {
    const tool = button.dataset.boardTool;
    const selected = tool === 'erase'
      ? state.selectedTool?.type === 'erase'
      : state.selectedTool?.type === 'spectator' && state.selectedTool.effect === tool;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function boardCamel(camel, index) {
  const style = camelStyle(camel);
  const selected = state.selectedTool?.type === 'camel' && state.selectedTool.id === camel;
  const crazyClass = style.crazy ?? '';
  const background = style.crazy
    ? ''
    : `background:${style.color};color:${style.text};border-color:${style.border ?? 'rgba(68,48,28,.27)'}`;
  return `
    <button
      class="board-camel ${crazyClass} ${selected ? 'selected' : ''}"
      style="${background}"
      type="button"
      data-board-camel="${camel}"
      data-order="${index + 1}"
      aria-label="${displayCamelName(camel)}, stack position ${index + 1}${index === 0 ? ', bottom' : ''}">
      ${style.short}
    </button>
  `;
}

function centerMarkup() {
  return `
    <div class="board-center" aria-hidden="true">
      <div class="center-pyramid">△</div>
      <div class="center-title">Camel Up</div>
      <p class="center-subtitle">Tap pieces onto the track. Stack badges count from bottom to top.</p>
    </div>
  `;
}

function tileMarkup(tile) {
  const [row, col] = TRACK_COORDS[tile];
  const stack = state.boardStacks[tile] ?? [];
  const spectator = state.spectators[tile];
  const classes = [
    'track-tile',
    spectator ? 'has-spectator' : '',
    tile === 1 || tile === 16 ? 'finish-adjacent' : '',
  ].filter(Boolean).join(' ');

  return `
    <button class="${classes}" type="button" data-tile="${tile}" style="grid-row:${row};grid-column:${col}" aria-label="Track space ${tile}${stack.length ? `, ${stack.length} camel${stack.length === 1 ? '' : 's'}` : ''}">
      ${tile === 1 ? '<span class="finish-line" aria-hidden="true"></span>' : ''}
      <span class="tile-number">${tile}</span>
      ${spectator ? `<span class="tile-spectator ${spectator}">${spectator === 'oasis' ? '+1' : '−1'}</span>` : ''}
      <span class="tile-stack">${stack.map(boardCamel).join('')}</span>
    </button>
  `;
}

function renderBoard() {
  elements.gameBoard.innerHTML = Array.from({ length: 16 }, (_, i) => tileMarkup(i + 1)).join('') + centerMarkup();

  elements.gameBoard.querySelectorAll('[data-tile]').forEach((tileButton) => {
    tileButton.addEventListener('click', () => handleTileTap(Number(tileButton.dataset.tile)));
  });

  elements.gameBoard.querySelectorAll('[data-board-camel]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      state.selectedTool = { type: 'camel', id: button.dataset.boardCamel };
      renderBoardAndTray();
      saveState();
      clearValidation();
    });
  });
}

function renderBoardAndTray() {
  renderPieceTray();
  renderBoard();
  renderToolBar();
}

function adjacentSpectator(tile) {
  const neighbors = [tile - 1, tile + 1].filter((n) => n >= 1 && n <= 16);
  return neighbors.find((n) => Object.prototype.hasOwnProperty.call(state.spectators, n));
}

function handleTileTap(tile) {
  const tool = state.selectedTool;
  const stack = state.boardStacks[tile] ?? [];

  if (!tool) {
    if (stack.length) {
      openStackEditor(tile);
    } else {
      showValidation(['Choose a camel or board tool first.']);
    }
    return;
  }

  if (tool.type === 'camel') {
    if (state.spectators[tile]) {
      showValidation([`Space ${tile} contains a spectator tile. Remove it before placing a camel there.`]);
      return;
    }
    removeCamel(tool.id);
    if (!state.boardStacks[tile]) state.boardStacks[tile] = [];
    state.boardStacks[tile].push(tool.id);
    state.selectedTool = null;
    elements.resultsSection.hidden = true;
  } else if (tool.type === 'spectator') {
    if (tile === 1) {
      showValidation(['A spectator tile cannot be placed on space 1.']);
      return;
    }
    if (stack.length) {
      showValidation([`Space ${tile} is occupied by camel(s).`]);
      return;
    }
    const neighbor = adjacentSpectator(tile);
    if (neighbor && !state.spectators[tile]) {
      showValidation([`Space ${tile} is adjacent to spectator tile ${neighbor}.`]);
      return;
    }
    state.spectators[tile] = tool.effect;
    state.selectedTool = null;
    elements.resultsSection.hidden = true;
  } else if (tool.type === 'erase') {
    if (!state.spectators[tile]) {
      showValidation([`Space ${tile} has no spectator tile to remove.`]);
      return;
    }
    delete state.spectators[tile];
    state.selectedTool = null;
    elements.resultsSection.hidden = true;
  }

  clearValidation();
  saveState();
  renderBoardAndTray();
}

function switchEdition(editionId) {
  if (state.editionId === editionId) return;
  const oldDice = new Set(state.remainingDice);
  state.editionId = editionId;

  if (editionId === 'classic') {
    for (const crazy of CRAZY_CAMELS) removeCamel(crazy);
    state.remainingDice = RACING_CAMELS.filter((die) => oldDice.has(die));
  } else {
    state.remainingDice = [...RACING_CAMELS.filter((die) => oldDice.has(die)), GRAY_DIE];
  }

  state.selectedTool = { type: 'camel', id: 'Blue' };
  elements.resultsSection.hidden = true;
  closeStackEditor();
  renderAll();
  saveState();
  clearValidation();
}

function dieStyle(die) {
  if (die === GRAY_DIE) return { face: '◇', className: 'gray', label: 'Grey die' };
  const style = camelStyle(die);
  return { face: style.short, color: style.color, text: style.text, border: style.border, label: `${die} die` };
}

function renderDice() {
  const selected = new Set(state.remainingDice);
  elements.diceTray.innerHTML = activeDice().map((die) => {
    const style = dieStyle(die);
    const pressed = selected.has(die);
    const faceStyle = die === GRAY_DIE ? '' : `background:${style.color};color:${style.text};border-color:${style.border ?? 'rgba(0,0,0,.2)'}`;
    return `
      <button class="die-chip" type="button" data-die="${die}" aria-pressed="${pressed}">
        <span class="die-face ${style.className ?? ''}" style="${faceStyle}">${style.face}</span>
        <span>${style.label}</span>
      </button>
    `;
  }).join('');

  elements.diceTray.querySelectorAll('[data-die]').forEach((button) => {
    button.addEventListener('click', () => {
      const die = button.dataset.die;
      const set = new Set(state.remainingDice);
      if (set.has(die)) set.delete(die); else set.add(die);
      state.remainingDice = activeDice().filter((item) => set.has(item));
      elements.resultsSection.hidden = true;
      renderDice();
      saveState();
      clearValidation();
    });
  });

  const rolls = rollsRemainingThisLeg(state.editionId, state.remainingDice.length);
  if (state.editionId === 'crazy') {
    elements.diceHelp.textContent = 'Tap dice to show which ones are still inside. One die remains in the pyramid when the leg ends.';
    elements.rollsInfo.innerHTML = `<strong>${state.remainingDice.length}</strong> dice still inside → <strong>${rolls}</strong> more ${rolls === 1 ? 'roll' : 'rolls'} before leg scoring, unless the race ends first.`;
  } else {
    elements.diceHelp.textContent = 'Tap each die to mark whether it is still available this leg.';
    elements.rollsInfo.innerHTML = `<strong>${state.remainingDice.length}</strong> dice still inside → <strong>${rolls}</strong> remaining ${rolls === 1 ? 'roll' : 'rolls'}.`;
  }
}

function renderEdition() {
  elements.editionButtons.forEach((button) => {
    const active = button.dataset.edition === state.editionId;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  const crazy = state.editionId === 'crazy';
  elements.editionHelp.textContent = crazy
    ? 'Five racing camels, two Crazy Camels, five racing dice and one grey die.'
    : 'Five racing camels and five racing dice.';
  elements.crazyLegend.hidden = !crazy;
}

function renderAll() {
  renderEdition();
  renderBoardAndTray();
  renderDice();
}

function showValidation(messages) {
  elements.validationBox.hidden = false;
  elements.validationBox.textContent = messages.map((message) => `• ${message}`).join('\n');
}

function clearValidation() {
  elements.validationBox.hidden = true;
  elements.validationBox.textContent = '';
}

function setAllDice(selected) {
  state.remainingDice = selected ? [...activeDice()] : [];
  renderDice();
  saveState();
  clearValidation();
  elements.resultsSection.hidden = true;
}

function clearBoard() {
  state.boardStacks = {};
  state.spectators = {};
  state.selectedTool = { type: 'camel', id: 'Blue' };
  elements.resultsSection.hidden = true;
  closeStackEditor();
  renderBoardAndTray();
  saveState();
  clearValidation();
}

function loadExample() {
  state.boardStacks = {
    1: ['Blue', 'Green'],
    2: ['Orange', 'Yellow'],
    3: ['White'],
  };
  if (state.editionId === 'crazy') {
    state.boardStacks[16] = ['CrazyWhite'];
    state.boardStacks[15] = ['CrazyBlack'];
  }
  state.spectators = {};
  state.remainingDice = [...activeDice()];
  state.selectedTool = null;
  elements.resultsSection.hidden = true;
  closeStackEditor();
  renderAll();
  saveState();
  clearValidation();
}

function resetApp() {
  localStorage.removeItem(STORAGE_KEY);
  state = makeDefaultState();
  elements.resultsSection.hidden = true;
  closeStackEditor();
  renderAll();
  clearValidation();
}

function stackEditorRow(camel, index, stackLength) {
  const top = index === stackLength - 1;
  const bottom = index === 0;
  return `
    <div class="stack-editor-row">
      <div class="stack-editor-camel">
        ${camelDot(camel)}
        <span>${displayCamelName(camel)} · ${top ? 'top' : bottom ? 'bottom' : `position ${index + 1}`}</span>
      </div>
      <div class="stack-editor-actions">
        <button class="stack-action" type="button" data-stack-action="up" data-stack-index="${index}" ${top ? 'disabled' : ''} aria-label="Move ${displayCamelName(camel)} toward top">↑</button>
        <button class="stack-action" type="button" data-stack-action="down" data-stack-index="${index}" ${bottom ? 'disabled' : ''} aria-label="Move ${displayCamelName(camel)} toward bottom">↓</button>
        <button class="stack-action remove" type="button" data-stack-action="remove" data-stack-index="${index}" aria-label="Remove ${displayCamelName(camel)} from board">✕</button>
      </div>
    </div>
  `;
}

function openStackEditor(tile) {
  const stack = state.boardStacks[tile] ?? [];
  if (!stack.length) return;
  stackEditorTile = tile;
  elements.stackDialogTitle.textContent = `Space ${tile}`;
  renderStackEditor();
  if (!elements.stackDialog.open) elements.stackDialog.showModal();
}

function closeStackEditor() {
  stackEditorTile = null;
  if (elements.stackDialog.open) elements.stackDialog.close();
}

function renderStackEditor() {
  if (stackEditorTile === null) return;
  const stack = state.boardStacks[stackEditorTile] ?? [];
  if (!stack.length) {
    closeStackEditor();
    return;
  }

  elements.stackEditorList.innerHTML = [...stack]
    .map((camel, index) => ({ camel, index }))
    .reverse()
    .map(({ camel, index }) => stackEditorRow(camel, index, stack.length))
    .join('');

  elements.stackEditorList.querySelectorAll('[data-stack-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.stackAction;
      const index = Number(button.dataset.stackIndex);
      const current = state.boardStacks[stackEditorTile] ?? [];
      if (!current[index]) return;

      if (action === 'up' && index < current.length - 1) {
        [current[index], current[index + 1]] = [current[index + 1], current[index]];
      } else if (action === 'down' && index > 0) {
        [current[index], current[index - 1]] = [current[index - 1], current[index]];
      } else if (action === 'remove') {
        current.splice(index, 1);
        if (!current.length) delete state.boardStacks[stackEditorTile];
      }

      elements.resultsSection.hidden = true;
      saveState();
      renderBoardAndTray();
      renderStackEditor();
    });
  });
}

function formatPercent(count, total) {
  if (!total) return '0.0000%';
  return `${((count / total) * 100).toFixed(4)}%`;
}

function placeLabel(index) {
  return `${index + 1}${index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'}`;
}

function renderDesktopResults(sorted, counts, totalWeight) {
  elements.resultsTableWrap.innerHTML = `
    <table class="probability-table">
      <thead>
        <tr>
          <th>Camel</th>
          ${Array.from({ length: 5 }, (_, index) => `<th>${placeLabel(index)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${sorted.map((camel) => `
          <tr>
            <td><span class="table-camel">${camelDot(camel)} ${camel}</span></td>
            ${counts[camel].map((count) => `
              <td>
                <span class="table-probability">${formatPercent(count, totalWeight)}</span>
                <span class="table-fraction">${fractionString(count, totalWeight)}</span>
              </td>
            `).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderMobileResults(sorted, counts, totalWeight) {
  elements.resultsGrid.innerHTML = sorted.map((camel) => `
    <article class="result-card">
      <div class="result-camel">${camelDot(camel)} ${camel}</div>
      ${counts[camel].map((count, index) => `
        <div class="place-row">
          <div class="place-label">${placeLabel(index)}</div>
          <div>
            <span class="probability">${formatPercent(count, totalWeight)}</span>
            <span class="fraction">${fractionString(count, totalWeight)}</span>
          </div>
        </div>
      `).join('')}
    </article>
  `).join('');
}

function renderResults(result) {
  const { counts, totalWeight, terminalBranches, rollsToMake, editionId } = result;
  const sorted = [...RACING_CAMELS].sort((a, b) => counts[b][0] - counts[a][0]);

  renderDesktopResults(sorted, counts, totalWeight);
  renderMobileResults(sorted, counts, totalWeight);

  const mode = editionId === 'crazy' ? 'Crazy Camels edition' : 'Classic edition';
  elements.resultMeta.textContent = `${mode} · ${rollsToMake} future ${rollsToMake === 1 ? 'roll' : 'rolls'} · ${terminalBranches.toLocaleString()} terminal branches evaluated · exact weighted denominator ${totalWeight.toLocaleString()}.`;
  elements.resultsSection.hidden = false;
  elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getWorker() {
  if (!worker) worker = new Worker('./worker.js', { type: 'module' });
  return worker;
}

function runSimulation() {
  clearValidation();
  const positions = positionsFromBoard();
  const errors = validateSetup(positions, state.remainingDice, state.spectators, state.editionId);

  if (errors.length) {
    showValidation(errors);
    elements.resultsSection.hidden = true;
    return;
  }

  elements.runButton.disabled = true;
  elements.runButton.textContent = 'Calculating every outcome…';

  const currentWorker = getWorker();
  currentWorker.onmessage = (event) => {
    const payload = event.data;
    if (payload.ok) {
      renderResults(payload.result);
      saveState();
    } else {
      showValidation(payload.validationErrors ?? [payload.error]);
      elements.resultsSection.hidden = true;
    }
    elements.runButton.disabled = false;
    elements.runButton.textContent = 'Calculate exact probabilities';
  };

  currentWorker.onerror = (error) => {
    showValidation([`Calculation worker failed: ${error.message}`]);
    elements.runButton.disabled = false;
    elements.runButton.textContent = 'Calculate exact probabilities';
  };

  currentWorker.postMessage({
    positions,
    remainingDice: state.remainingDice,
    spectators: state.spectators,
    editionId: state.editionId,
  });
}

elements.editionButtons.forEach((button) => button.addEventListener('click', () => switchEdition(button.dataset.edition)));
elements.boardToolButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const tool = button.dataset.boardTool;
    const alreadySelected = tool === 'erase'
      ? state.selectedTool?.type === 'erase'
      : state.selectedTool?.type === 'spectator' && state.selectedTool.effect === tool;

    state.selectedTool = alreadySelected
      ? null
      : tool === 'erase'
        ? { type: 'erase' }
        : { type: 'spectator', effect: tool };

    renderBoardAndTray();
    saveState();
    clearValidation();
  });
});
elements.selectAllDiceButton.addEventListener('click', () => setAllDice(true));
elements.selectNoDiceButton.addEventListener('click', () => setAllDice(false));
elements.clearBoardButton.addEventListener('click', clearBoard);
elements.clearBoardButtonMobile.addEventListener('click', clearBoard);
elements.exampleButton.addEventListener('click', loadExample);
elements.exampleButtonMobile.addEventListener('click', loadExample);
elements.resetButton.addEventListener('click', resetApp);
elements.runButton.addEventListener('click', runSimulation);
elements.closeStackDialog.addEventListener('click', closeStackEditor);
elements.doneStackDialog.addEventListener('click', closeStackEditor);
elements.stackDialog.addEventListener('click', (event) => {
  if (event.target === elements.stackDialog) closeStackEditor();
});

renderAll();
