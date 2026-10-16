// Parses the Coder's streamed output: <file path="/src/App.jsx"> ... </file>
// Works on partial chunks (tags can be split anywhere between two chunks).

const SAFE_PATH = /^\/[A-Za-z0-9_\-./@[\]]+$/;
const OPEN_RE = /^<file\s+path\s*=\s*"([^"\n]{1,200})"\s*>/;
const OPEN_PREFIX = "<file";
const CLOSE = "</file>";

export const isSafePath = (path) =>
  typeof path === "string" &&
  path.length <= 200 &&
  SAFE_PATH.test(path) &&
  !path.includes("..") &&
  !path.includes("//") &&
  !path.endsWith("/");

export const normalizePath = (path) => {
  let clean = String(path).trim().replace(/\\/g, "/");
  if (!clean.startsWith("/")) clean = `/${clean}`;
  return clean;
};

// length of the longest ending of `buffer` that could be the start of `token`
export const partialSuffixLen = (buffer, token) => {
  const max = Math.min(buffer.length, token.length - 1);
  for (let n = max; n > 0; n--) {
    if (token.startsWith(buffer.slice(buffer.length - n))) return n;
  }
  return 0;
};

// removes the leading newline, trailing spaces and accidental ``` fences
export const cleanFileContent = (raw) => {
  let content = raw.replace(/^\r?\n/, "").replace(/\s+$/, "");
  const fenced = content.match(/^```[a-zA-Z0-9]*\r?\n([\s\S]*?)\r?\n?```$/);
  if (fenced) content = fenced[1];
  return `${content}\n`;
};

export class FileStreamParser {
  constructor() {
    this.buffer = "";
    this.state = "text";
    this.path = null;
    this.content = "";
    this.files = [];
  }

  feed(delta) {
    this.buffer += delta;
    return this.#drain(false);
  }

  end() {
    const events = this.#drain(true);
    if (this.state === "file") {
      events.push({ type: "file_incomplete", path: this.path });
      this.state = "text";
      this.path = null;
      this.content = "";
    }
    return events;
  }

  #drain(final) {
    const events = [];

    while (true) {
      if (this.state === "text") {
        const idx = this.buffer.indexOf(OPEN_PREFIX);

        if (idx === -1) {
          const keep = final ? 0 : partialSuffixLen(this.buffer, OPEN_PREFIX);
          const out = this.buffer.slice(0, this.buffer.length - keep);
          if (out) events.push({ type: "text", text: out });
          this.buffer = this.buffer.slice(this.buffer.length - keep);
          break;
        }

        if (idx > 0) {
          events.push({ type: "text", text: this.buffer.slice(0, idx) });
          this.buffer = this.buffer.slice(idx);
        }

        const gt = this.buffer.indexOf(">");
        if (gt === -1) {
          if (this.buffer.length > 300 || final) {
            events.push({ type: "text", text: this.buffer[0] });
            this.buffer = this.buffer.slice(1);
            continue;
          }
          break;
        }

        const match = OPEN_RE.exec(this.buffer.slice(0, gt + 1));
        if (!match) {
          events.push({ type: "text", text: "<" });
          this.buffer = this.buffer.slice(1);
          continue;
        }

        this.path = normalizePath(match[1]);
        this.content = "";
        this.state = "file";
        this.buffer = this.buffer.slice(gt + 1);
        events.push({ type: "file_start", path: this.path });
        continue;
      }

      // state === "file"
      const end = this.buffer.indexOf(CLOSE);

      if (end === -1) {
        const keep = final ? 0 : partialSuffixLen(this.buffer, CLOSE);
        const chunk = this.buffer.slice(0, this.buffer.length - keep);
        if (chunk) {
          this.content += chunk;
          events.push({ type: "file_chunk", path: this.path, text: chunk });
        }
        this.buffer = this.buffer.slice(this.buffer.length - keep);
        break;
      }

      const chunk = this.buffer.slice(0, end);
      if (chunk) {
        this.content += chunk;
        events.push({ type: "file_chunk", path: this.path, text: chunk });
      }
      this.buffer = this.buffer.slice(end + CLOSE.length);

      const content = cleanFileContent(this.content);
      this.files.push({ path: this.path, content });
      events.push({ type: "file_end", path: this.path, content });

      this.state = "text";
      this.path = null;
      this.content = "";
    }

    return events;
  }
}
