# Zotero Highlight Color Descriptions

A [Zotero](https://www.zotero.org/) plugin that adds meaningful highlight color labels ("Important", "Disagree", etc.) throughout the readers.

![](/docs/screenshots/highlight-color-descriptions-1.png)
![](/docs/screenshots/highlight-color-descriptions-2.png)

## Features
- Adds descriptive labels to highlight colors:
  - in the annotation right-click menu (existing highlights)
  - in the text selection popup (when creating new highlights)
  - in the toolbar color picker (for freehand notes)
- Labels are fully customisable in Zotero's plugin settings
- Reorder the labels to your liking
- Uninstalling the plugin cleanly removes all stored preferences, leaving the original colors as they were

## Requirements
- Zotero 8.0 or later

## Installation
1. Download `highlight-descriptions-X.X.X.xpi` from the [latest release](https://github.com/paulmrg2/zotero-highlight-descriptions/releases/latest)
2. In Zotero, go to `Tools > Plugins`
3. Click the gear icon and choose `Install Plugin From File…`
4. Select the downloaded `.xpi` file

Zotero will check for updates automatically.

### Verifying the download
Each release includes a SHA256 checksum file. To verify:

```
sha256sum -c highlight-descriptions-X.X.X.xpi.sha256
```

You can also verify the build provenance attestation using the GitHub CLI:

```
gh attestation verify highlight-descriptions-X.X.X.xpi --repo paulmrg2/zotero-highlight-descriptions
```

This confirms the `.xpi` was built directly from the source code in this repository by GitHub Actions, and has not been tampered with.

## Configuration
1. Go to `Edit > Settings` (macOS: Zotero > Settings)
2. Select `Highlight Descriptions` in the sidebar
3. Edit the label for each color (try to keep them short and memorable)
4. Clear a field to restore its default label
5. Reorder the labels using the drag handles (click and drag the three vertical dots next to each label)

![](/docs/screenshots/highlight-color-settings.png)

## Can use as part of a Zotero > Obsidian workflow
This plugin can be used alongside [Better Notes for Zotero](https://github.com/windingwind/zotero-better-notes), which syncs your Zotero annotations to Obsidian. When your highlight colors have meaningful labels, those labels can be surfaced in Obsidian to give your annotations context at a glance. I plan on posting my full Zotero > Better Notes (templates) > Obsidian (labelling and styling for source notes and highlights) workflow when I find the time (let me know if you're interested).

## Building from source
Requires [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/).

```bash
# Install dependencies
pnpm install
# Compile src/index.ts > chrome/content/index.js
pnpm build
# Build an .xpi package
pnpm package
```

## Contributing
Bug reports and pull requests are welcome. Please open an issue first for significant changes.
