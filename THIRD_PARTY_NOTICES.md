# Third-Party Notices

This project includes code adapted from other open-source projects. Their
licenses and copyright notices are reproduced below as required.

---

## Claudeboard

`src/clipboard.ts` (the cross-platform clipboard-image reading logic — macOS
AppleScript `«class PNGf»`/TIFF→`sips`, Linux `xclip`/`wl-paste`, Windows
PowerShell) is adapted from the clipboard service in **Claudeboard** by
Dariusz Kuśnierek (https://github.com/dkodr/claudeboard), used under the MIT
License:

```
MIT License

Copyright (c) 2025 Dariusz Kuśnierek

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## cmux

No source code from **cmux** (https://github.com/manaflow-ai/cmux, GPL-3.0-or-later)
is included in this project. cmux pioneered the overall approach used here —
detecting the SSH session, transferring the image to the remote, and inserting
the path as a bracketed paste — and reading its source informed this design, but
the implementation in this repository was written independently in TypeScript.
The approach itself (a method, not a copyrightable expression) is not subject to
cmux's license.
