# Advanced Markdown Previewer for MSCode (Mono Studio)

A blazing-fast, fully-featured Markdown preview extension for MSCode. Experience real-time, side-by-side markdown rendering with built-in support for KaTeX, Mermaid diagrams, GitHub Flavored Markdown (GFM), and advanced exporting options.

---

<<<<<<< HEAD
## 🚀 Key Features
=======
## Key Features
>>>>>>> 6f1094c1579ecbeb497d6e4d791c9bc8c71c15f7

* **Real-time Live Preview:** Instantly see your markdown changes as you type.
* **Synchronized Scrolling:** The preview automatically scrolls to match your editor's cursor position.
* **Advanced Syntax Support:**
  * **Math & Equations (KaTeX):** Render inline `$math$` and block `$$math$$` equations perfectly.
  * **Mermaid Diagrams:** Create dynamic flowcharts, sequence diagrams, and charts right from your markdown.
  * **GitHub Flavored Markdown (GFM):** Tables, strikethroughs, task lists, and auto-linking.
  * **Emoji Shortcodes:** Type `:smile:` to get 😄.
  * **Smart Typography:** Converts straight quotes and dashes to typographic quotes and em/en dashes.
* **Code Block Enhancements:** * Syntax highlighting via `Highlight.js` with customizable themes (GitHub Dark, Dracula, Monokai, etc.).
  * Line numbers inside code blocks.
  * **One-click Copy Button** for quick code copying.
* **Smart Table of Contents (TOC):** * Auto-generated TOC that tracks your reading progress.
  * Support for Left, Right, and Floating layouts.
  * *Distraction-free mode:* Collapsible TOC with an auto-hiding floating action button while scrolling!
* **Front Matter Support:** Parse YAML front matter and display it as a beautiful table, raw text, or hide it completely.
* **Reading Stats:** Displays real-time Word Count and Estimated Reading Time at the bottom.
* **Export & Print:**
  * Export rendered Markdown directly as a standalone **HTML** file.
  * Copy rendered HTML to the clipboard.
  * Print or Export to **PDF** natively (Upcoming)

---

<<<<<<< HEAD
## 🎯 Commands
=======
## Commands
>>>>>>> 6f1094c1579ecbeb497d6e4d791c9bc8c71c15f7

Access these commands from the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) or via the Editor Title Bar menu:

| Command | Description |
|---------|-------------|
| `markdown.preview` | Opens the Markdown Preview tab |
| `markdown.preview.refresh` | Manually forces a refresh of the preview |
| `markdown.preview.exportHtml` | Exports the current markdown as a standalone HTML file |
| `markdown.preview.copyAsHtml` | Copies the compiled HTML to your clipboard |
| `markdown.preview.exportPdf` | Opens the native print dialog to export as PDF (Upcoming..) |

---

<<<<<<< HEAD
## ⚙️ Configuration / Settings
=======
## Configuration / Settings
>>>>>>> 6f1094c1579ecbeb497d6e4d791c9bc8c71c15f7

Customize the previewer exactly how you want it. Go to **Settings > Markdown Preview**:

### Appearance
* `markdown.preview.theme`: Choose between Match Workbench, Light, Dark, GitHub, Sepia, or Solarized.
* `markdown.preview.fontFamily` & `fontSize`: Customize your reading typography.
* `markdown.preview.codeTheme`: Choose your favorite syntax highlighting theme (e.g., GitHub Dark, Dracula).
* `markdown.preview.maxWidth`: Set maximum content width (default: 850px, `0` for full width).

### Markdown Features
* `markdown.preview.enableMath`: Toggle KaTeX math rendering.
* `markdown.preview.enableMermaid`: Toggle Mermaid flowchart rendering.
* `markdown.preview.enableTaskLists`: Enable interactive task checkboxes.
* `markdown.preview.smartQuotes`: Toggle smart typographic characters.

### Code Blocks
* `markdown.preview.showLineNumbers`: Show/hide line numbers in code blocks.
* `markdown.preview.copyCodeButton`: Show/hide the copy button on hover.

### Table of Contents
* `markdown.preview.showTableOfContents`: Enable the auto-generated TOC.
* `markdown.preview.tocPosition`: Choose `right`, `left`, or `floating`.

---

## 🔒 Security

For your safety, the previewer runs inside a highly secure sandbox architecture:
* `markdown.security.allowRawHtml`: Allow rendering of raw HTML tags (Enabled by default).
* `markdown.security.sanitizeHtml`: Strips dangerous tags and attributes from embedded raw HTML.
* `markdown.security.allowScripts`: Execution of `<script>` tags is blocked by default to prevent XSS.

---

## 🐛 Issues & Bug Reports

Found a bug or have a feature request? We would love to hear from you!  
Please open an issue on our GitHub repository:  
👉 **[Report an Issue](https://github.com/Sou6900/markdown-previewer/issues)**

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! If you're a developer and want to improve this extension, follow these steps:

1. **Fork** the repository: [Sou6900/markdown-previewer](https://github.com/Sou6900/markdown-previewer)
2. **Clone** your fork locally:
   ```bash
   git clone [https://github.com/](https://github.com/)<your-username>/markdown-previewer.git
   cd markdown-previewer

```

3. **Install Dependencies**:
```bash
npm install

```


4. **Compile / Build** using the MSCode CLI (`msce`):
```bash
npm run watch    # For live development
npm run package  # To bundle the .msxt extension file

```


5. Create your feature branch (`git checkout -b feature/AmazingFeature`).
6. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
7. Push to the branch (`git push origin feature/AmazingFeature`).
8. Open a **Pull Request**.

---

## 👨‍💻 Author

<<<<<<< HEAD
Developed by **Sourav Chand** Powered by `react-markdown`, `rehype`, `remark`, and `mermaid`.
=======
Developed by **Sourav Chand** Powered by `react-markdown`, `rehype`, `remark`, and `mermaid`.
>>>>>>> 6f1094c1579ecbeb497d6e4d791c9bc8c71c15f7
