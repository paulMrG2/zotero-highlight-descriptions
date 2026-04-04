declare namespace Zotero {
  let HighlightDescriptionsPrefs: { init(doc: Document): void } | undefined;
}

const PREF_PREFIX = 'extensions.highlightdescriptions.color_';

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

const getDescription = (hex: string): string => {
  const key = PREF_PREFIX + hex.replace('#', '').toLowerCase();
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
      for (const row of rows) {
        const fill = (row.querySelector('path[fill]') as Element | null)?.getAttribute('fill');
        if (!fill) continue;
        const description = getDescription(fill.toLowerCase());
        if (!description) continue;
        const svg = row.querySelector('svg');
        if (!svg) continue;
        row.innerHTML = svg.outerHTML + '\u00a0' + description;
      }
    } catch (e) {
      Zotero.logError(e as Error);
    }
  }, 10);
};

const PREF_VERTICAL = 'extensions.highlightdescriptions.selection_popup_vertical';

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
        for (const button of buttons) {
          const fill = (button.querySelector('path[fill]') as Element | null)?.getAttribute('fill');
          if (!fill) continue;
          const description = getDescription(fill.toLowerCase());
          if (!description) continue;
          button.title = description;
        }
      }
    } catch (e) {
      Zotero.logError(e as Error);
    }
  }, 10);
};

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

        for (const [hex, defaultLabel] of Object.entries(DEFAULTS)) {
          const key = PREF_PREFIX + hex.replace('#', '').toLowerCase();

          const getLabel = (): string => {
            const val = Zotero.Prefs.get(key, true) as string | undefined;
            return val !== undefined && val !== null ? String(val) : defaultLabel;
          };

          const saveLabel = (value: string) => {
            const trimmed = value.trim();
            Zotero.Prefs.set(key, trimmed === '' ? defaultLabel : trimmed, true);
          };

          const swatch = doc.createElement('span');
          swatch.style.cssText =
            'display: inline-block; width: 20px; height: 20px; border-radius: 50%; ' +
            `background-color: ${hex}; border: 1px solid rgba(0,0,0,0.15); flex-shrink: 0;`;
          swatch.setAttribute('title', hex);

          const input = doc.createElement('input') as HTMLInputElement;
          input.type = 'text';
          input.value = getLabel();
          input.placeholder = defaultLabel;
          input.style.cssText = 'width: 100%; box-sizing: border-box;';

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

          container.appendChild(swatch);
          container.appendChild(input);
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