import {
  Decoration, DecorationSet, EditorView, WidgetType,
} from '@codemirror/view';
import { StateField, StateEffect, type Text, type Range } from '@codemirror/state';

export interface PatchDecorationData {
  id: number;
  from: number;
  to: number;
  oldText: string;
  newText: string;
  state: 'pending' | 'accepted' | 'rejected';
}

export const setPatchesEffect = StateEffect.define<PatchDecorationData[]>();
export const setDiffVisibleEffect = StateEffect.define<boolean>();

let diffVisible = true;
let storedPatches: PatchDecorationData[] = [];

type PatchActionFn = (id: number) => void;
let currentAcceptFn: PatchActionFn = () => {};
let currentRejectFn: PatchActionFn = () => {};

export function setPatchActionHandlers(accept: PatchActionFn, reject: PatchActionFn) {
  currentAcceptFn = accept;
  currentRejectFn = reject;
}

class PatchWidget extends WidgetType {
  constructor(
    readonly id: number,
    readonly oldText: string,
    readonly newText: string,
    readonly state: 'pending' | 'accepted' | 'rejected',
  ) { super(); }

  eq(other: PatchWidget) {
    return other.id === this.id && other.state === this.state;
  }

  toDOM() {
    const wrap = document.createElement('div');
    wrap.className = 'cm-patch-block';

    if (this.state === 'pending' || this.state === 'rejected') {
      const oldDiv = document.createElement('div');
      oldDiv.className = 'cm-patch-deleted';
      oldDiv.textContent = this.oldText;
      wrap.appendChild(oldDiv);
    }

    if (this.state === 'pending' || this.state === 'accepted') {
      const newDiv = document.createElement('div');
      newDiv.className = 'cm-patch-inserted';
      newDiv.textContent = this.newText;
      wrap.appendChild(newDiv);
    }

    if (this.state === 'pending') {
      const actions = document.createElement('span');
      actions.className = 'cm-patch-actions';
      actions.innerHTML =
        '<span class="cm-patch-accept" data-id="' + this.id + '">accept[' + this.id + ']</span>' +
        '<span class="cm-patch-reject" data-id="' + this.id + '">reject[' + this.id + ']</span>';
      wrap.appendChild(actions);
    }

    return wrap;
  }

  ignoreEvent() { return false; }
}

function buildDecorations(patches: PatchDecorationData[], doc: Text): DecorationSet {
  if (!diffVisible) return Decoration.none;

  const decos: Range<Decoration>[] = [];

  for (const p of patches) {
    const from = Math.max(0, Math.min(p.from, doc.length));
    const to = Math.max(from, Math.min(p.to, doc.length));

    if (p.state === 'accepted') {
      decos.push(Decoration.line({ attributes: { class: 'cm-patch-gutter-accepted' } }).range(from));
      decos.push(Decoration.replace({
        widget: new PatchWidget(p.id, p.oldText, p.newText, 'accepted'),
        block: true,
      }).range(from, to));
    } else if (p.state === 'rejected') {
      // skip — editor returns to normal
    } else {
      decos.push(Decoration.replace({
        widget: new PatchWidget(p.id, p.oldText, p.newText, 'pending'),
        block: true,
      }).range(from, to));
    }
  }

  return Decoration.set(decos, true);
}

export const patchField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, tr) {
    for (const e of tr.effects) {
      if (e.is(setPatchesEffect)) {
        storedPatches = e.value;
        return buildDecorations(storedPatches, tr.state.doc);
      }
      if (e.is(setDiffVisibleEffect)) {
        diffVisible = e.value;
        if (!diffVisible) return Decoration.none;
        if (storedPatches.length > 0) {
          return buildDecorations(storedPatches, tr.state.doc);
        }
        return Decoration.none;
      }
    }
    return decorations.map(tr.changes);
  },
  provide: f => EditorView.decorations.from(f),
});

export const patchClickHandler = EditorView.domEventHandlers({
  click(event, _view) {
    const target = event.target as HTMLElement;
    const idStr = target.dataset.id;
    if (!idStr) return false;
    const id = Number(idStr);
    if (isNaN(id)) return false;

    if (target.classList.contains('cm-patch-accept')) {
      currentAcceptFn(id);
      return true;
    }
    if (target.classList.contains('cm-patch-reject')) {
      currentRejectFn(id);
      return true;
    }
    return false;
  },
});

export function scrollToPatch(view: EditorView, patches: PatchDecorationData[], index: number) {
  if (index < 0 || index >= patches.length) return;
  const p = patches[index];
  const pos = Math.max(0, Math.min(p.from, view.state.doc.length));
  view.dispatch({
    effects: EditorView.scrollIntoView(pos, { y: 'center' }),
  });
}
