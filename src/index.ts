declare namespace Zotero {
  let HighlightDescriptionsPrefs: { init(doc: Document): void } | undefined;
}

/**
 * # Default descriptions for colors
 */
const DEFAULTS: Record<string, string> = {
  '#ffd400': 'Important/interesting',
  '#ff6666': 'Disagree/sceptical',
  '#5fb236': 'Agree/resonate',
  '#2ea8e5': 'Reference to another source',
  '#a28ae5': 'Confused/have questions',
  '#e56eee': 'Chapter/heading',
  '#f19837': 'Definition',
  '#aaaaaa': '-'
};

/**
 * # Preferences keys
 */
const PREF_PREFIX = 'extensions.highlightdescriptions';
const PREF_COLOR_PREFIX = `${PREF_PREFIX}.color_`;
const PREF_ORDER = `${PREF_PREFIX}.color_order`;
const PREF_VERTICAL = `${PREF_PREFIX}.selection_popup_vertical`;


const getColorOrder = (): string[] => {
  const stored = Zotero.Prefs.get(PREF_ORDER, true) as string | undefined;
  const defaultOrder = Object.keys(DEFAULTS);
  if (!stored) return [...defaultOrder];
  const parsed = stored.split(',').map(s => s.trim()).filter(s => s in DEFAULTS);
  const missing = defaultOrder.filter(h => !parsed.includes(h));
  return [...parsed, ...missing];
};

const getDescription = (hex: string): string => {
  const key = `${PREF_COLOR_PREFIX}${hex.replace('#', '').toLowerCase()}`;
  const stored = Zotero.Prefs.get(key, true) as string | undefined;
  return stored !== undefined && stored !== null ? stored : (DEFAULTS[hex] ?? '');
};

const onContextMenu = (event: { reader: _ZoteroTypes.ReaderInstance }) => {
  const {reader} = event;
  setTimeout(() => {
    try {
      const doc = reader._iframeWindow?.document;
      if (!doc) return;
      const rows = Array.from(doc.querySelectorAll('.context-menu .row')) as Element[];

      // Relabel each color row
      for (const row of rows) {
        const fill = (row.querySelector('path[fill]') as Element | null)?.getAttribute('fill');
        if (!fill) continue;
        const description = getDescription(fill.toLowerCase());
        if (!description) continue;
        const svg = row.querySelector('svg');
        if (!svg) continue;
        row.innerHTML = svg.outerHTML + '\u00a0' + description;
      }

      // Reorder color rows to match user-defined order
      const colorRows: Array<{ row: Element; hex: string }> = [];
      for (const row of rows) {
        const fill = (row.querySelector('path[fill]') as Element | null)?.getAttribute('fill')?.toLowerCase();
        if (fill && fill in DEFAULTS) colorRows.push({ row, hex: fill });
      }
      if (colorRows.length > 1) {
        const parent = colorRows[0].row.parentElement;
        if (parent) {
          const allChildren = Array.from(parent.children);
          const colorSet = new Set(colorRows.map(cr => cr.row));
          let lastIdx = -1;
          for (let i = allChildren.length - 1; i >= 0; i--) {
            if (colorSet.has(allChildren[i])) { lastIdx = i; break; }
          }
          const ref = lastIdx < allChildren.length - 1 ? allChildren[lastIdx + 1] : null;
          for (const hex of getColorOrder()) {
            const entry = colorRows.find(cr => cr.hex === hex.toLowerCase());
            if (entry) parent.insertBefore(entry.row, ref);
          }
        }
      }
    } catch (e) {
      Zotero.logError(e as Error);
    }
  }, 10);
};

const onRenderTextSelectionPopup = (event: { reader: _ZoteroTypes.ReaderInstance }) => {
  const {reader} = event;
  setTimeout(() => {
    try {
      const doc = reader._iframeWindow?.document;
      if (!doc) return;
      const popup = doc.querySelector('.selection-popup');
      if (!popup) return;
      const buttons = Array.from(popup.querySelectorAll('.toolbar-button.color-button')) as HTMLElement[];
      if (buttons.length === 0) return;

      const _vertPref = Zotero.Prefs.get(PREF_VERTICAL, true);
      const useVertical = _vertPref === undefined || _vertPref === null ? true : Boolean(_vertPref);

      // Sort buttons by user-defined order
      const order = getColorOrder();
      buttons.sort((a, b) => {
        const fa = (a.querySelector('path[fill]') as Element | null)?.getAttribute('fill')?.toLowerCase() ?? '';
        const fb = (b.querySelector('path[fill]') as Element | null)?.getAttribute('fill')?.toLowerCase() ?? '';
        return order.indexOf(fa) - order.indexOf(fb);
      });

      if (useVertical) {
        const parent = buttons[0].parentElement;
        if (!parent) return;

        // Change the popup to fit content with a maxWidth
        (popup as HTMLElement).style.width = 'fit-content';
        (popup as HTMLElement).style.maxWidth = '600px';

        // Wrap all color buttons in a vertical container
        const colorContainer = doc.createElement('div');
        colorContainer.setAttribute('data-hcd-vertical', '1');
        colorContainer.style.cssText = 'display:flex;flex-direction:column;gap:2px;align-self:flex-start;';
        parent.insertBefore(colorContainer, buttons[0]);

        for (const button of buttons) {
          const fill = (button.querySelector('path[fill]') as Element | null)?.getAttribute('fill');
          const svg = button.querySelector('svg');

          // Move button into the vertical container
          colorContainer.appendChild(button);

          if (!svg) continue;
          const description = fill ? getDescription(fill.toLowerCase()) : '';

          // Rebuild button contents: SVG + description label
          while (button.firstChild) button.removeChild(button.firstChild);
          button.appendChild(svg.cloneNode(true));
          if (description) {
            const label = doc.createElement('span');
            label.textContent = '\u00a0' + description;
            label.style.cssText = 'font-size:0.9em;white-space:nowrap;';
            button.appendChild(label);
          }
          button.style.display = 'flex';
          button.style.alignItems = 'center';
          button.style.justifyContent = 'flex-start';
          button.style.width = '100%';
          button.style.boxSizing = 'border-box';
        }
      } else {
        const hParent = buttons[0]?.parentElement;
        for (const button of buttons) {
          const fill = (button.querySelector('path[fill]') as Element | null)?.getAttribute('fill');
          if (!fill) continue;
          const description = getDescription(fill.toLowerCase());
          if (!description) continue;
          button.title = description;
        }
        if (hParent) {
          for (const button of buttons) hParent.appendChild(button);
        }
      }
    } catch (e) {
      Zotero.logError(e as Error);
    }
  }, 10);
};

const saveColorOrder = (order: string[]) => {
  Zotero.Prefs.set(PREF_ORDER, order.join(','), true);
};

/**
 * # HighlightDescriptions
 *
 * Plugin entry point
 */
const HighlightDescriptions = {
  start() {
    Zotero.Reader.registerEventListener('createAnnotationContextMenu', onContextMenu);
    Zotero.Reader.registerEventListener('createColorContextMenu', onContextMenu);
    Zotero.Reader.registerEventListener('renderTextSelectionPopup', onRenderTextSelectionPopup);

    Zotero.HighlightDescriptionsPrefs = {
      init(doc: Document) {
        const checkbox = doc.getElementById('hcd-vertical-popup') as HTMLInputElement | null;
        if (checkbox) {
          const vertVal = Zotero.Prefs.get(PREF_VERTICAL, true);
          checkbox.checked = vertVal === undefined || vertVal === null ? true : Boolean(vertVal);
          checkbox.addEventListener('change', () => {
            Zotero.Prefs.set(PREF_VERTICAL, checkbox.checked, true);
          });
        }

        const container = doc.getElementById('hcd-color-rows');
        if (!container) return;

        const reorderRows = () => {
          const newOrder = Array.from(container.children)
            .map(c => c.getAttribute('data-hex'))
            .filter(Boolean) as string[];
          saveColorOrder(newOrder);
        };

        for (const hex of getColorOrder()) {
          const defaultLabel = DEFAULTS[hex];
          const key = `${PREF_COLOR_PREFIX}${hex.replace('#', '').toLowerCase()}`;

          const getLabel = (): string => {
            const val = Zotero.Prefs.get(key, true) as string | undefined;
            return val !== undefined && val !== null ? String(val) : defaultLabel;
          };

          const saveLabel = (value: string) => {
            const trimmed = value.trim();
            Zotero.Prefs.set(key, trimmed === '' ? defaultLabel : trimmed, true);
          };

          const rowDiv = doc.createElement('div');
          rowDiv.setAttribute('data-hex', hex);
          rowDiv.setAttribute('draggable', 'true');
          rowDiv.style.cssText = 'display: flex; align-items: center; gap: 12px;';

          const handle = doc.createElement('span');
          handle.textContent = '⠇';
          handle.style.cssText =
            'cursor: grab; color: var(--zotero-secondary-text-color, #999); ' +
            'font-size: 16px; line-height: 1; user-select: none; flex-shrink: 0;';

          const swatch = doc.createElement('span');
          swatch.style.cssText =
            'display: inline-block; width: 20px; height: 20px; border-radius: 50%; ' +
            `background-color: ${hex}; border: 1px solid rgba(0,0,0,0.15); flex-shrink: 0;`;
          swatch.setAttribute('title', hex);

          const input = doc.createElement('input') as HTMLInputElement;
          input.type = 'text';
          input.value = getLabel();
          input.placeholder = defaultLabel;
          input.style.cssText = 'flex: 1; min-width: 0; box-sizing: border-box;';

          let debounceTimer: ReturnType<typeof setTimeout> | undefined;
          input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => saveLabel(input.value), 400);
          });
          input.addEventListener('blur', () => {
            clearTimeout(debounceTimer);
            saveLabel(input.value);
            input.value = getLabel();
          });

          rowDiv.addEventListener('dragstart', (e: DragEvent) => {
            if ((e.target as HTMLElement).closest('input')) {
              e.preventDefault();
              return;
            }
            e.dataTransfer!.setData('text/plain', hex);
            e.dataTransfer!.effectAllowed = 'move';
          });

          rowDiv.addEventListener('dragover', (e: DragEvent) => {
            e.preventDefault();
            e.dataTransfer!.dropEffect = 'move';
            const rect = rowDiv.getBoundingClientRect();
            if (e.clientY < rect.top + rect.height / 2) {
              rowDiv.style.borderTop = '2px solid var(--accent-blue, #2ea8e5)';
              rowDiv.style.borderBottom = '';
            } else {
              rowDiv.style.borderTop = '';
              rowDiv.style.borderBottom = '2px solid var(--accent-blue, #2ea8e5)';
            }
          });

          rowDiv.addEventListener('dragleave', () => {
            rowDiv.style.borderTop = '';
            rowDiv.style.borderBottom = '';
          });

          rowDiv.addEventListener('drop', (e: DragEvent) => {
            e.preventDefault();
            rowDiv.style.borderTop = '';
            rowDiv.style.borderBottom = '';
            const sourceHex = e.dataTransfer!.getData('text/plain');
            if (!sourceHex || sourceHex === hex) return;
            const sourceRow = Array.from(container.children).find(
              c => c.getAttribute('data-hex') === sourceHex
            ) as HTMLElement | undefined;
            if (!sourceRow) return;
            const rect = rowDiv.getBoundingClientRect();
            if (e.clientY < rect.top + rect.height / 2) {
              container.insertBefore(sourceRow, rowDiv);
            } else {
              container.insertBefore(sourceRow, rowDiv.nextSibling);
            }
            reorderRows();
          });

          rowDiv.addEventListener('dragend', () => {
            Array.from(container.children).forEach(c => {
              (c as HTMLElement).style.borderTop = '';
              (c as HTMLElement).style.borderBottom = '';
            });
          });

          rowDiv.appendChild(handle);
          rowDiv.appendChild(swatch);
          rowDiv.appendChild(input);
          container.appendChild(rowDiv);
        }
      }
    };
  },

  stop() {
    Zotero.Reader.unregisterEventListener('createAnnotationContextMenu', onContextMenu);
    Zotero.Reader.unregisterEventListener('createColorContextMenu', onContextMenu);
    Zotero.Reader.unregisterEventListener('renderTextSelectionPopup', onRenderTextSelectionPopup);
    Zotero.HighlightDescriptionsPrefs = undefined;
  }
};

;(globalThis as Record<string, unknown>).HighlightDescriptions = HighlightDescriptions;