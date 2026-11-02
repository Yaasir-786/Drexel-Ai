import Document from "../models/documentModel.js";
import DocChunk from "../models/docChunkModel.js";

// files that describe the project structure
const ENTRY_FILE = /(^|\/)(readme[^\/]*|package\.json|index\.html|index\.[tj]sx?|main\.[tj]sx?|app\.py)$/i;

// definitions to index: functions, arrow consts, classes, methods and python defs
const DEF_PATTERNS = [
  /\bfunction\s+([A-Za-z_$][\w$]*)/,
  /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/,
  /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?function\b/,
  /\bclass\s+([A-Za-z_$][\w$]*)/,
  /\bdef\s+([A-Za-z_]\w*)/,
  /^[ \t]*(?:async\s+)?(?!if\b|for\b|while\b|switch\b|catch\b|return\b|function\b|class\b|def\b|else\b|try\b|do\b)([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/,
];

// full text of one file from its chunks (in order)
const fileText = (chunks, path) =>
  chunks
    .filter((chunk) => chunk.path === path)
    .map((chunk) => chunk.text)
    .join("");

// groups the chunks back into full files (path -> text in chunk order)
const groupFiles = (chunks) => {
  const map = new Map();
  for (const chunk of chunks) {
    if (!map.has(chunk.path)) map.set(chunk.path, []);
    map.get(chunk.path).push(chunk);
  }
  return [...map.entries()].map(([path, list]) => ({
    path,
    text: list
      .sort((a, b) => a.order - b.order)
      .map((chunk) => chunk.text)
      .join(""),
  }));
};

// indexes the definitions of every file (name + line number)
const indexDefinitions = (files) => {
  const defs = [];
  for (const file of files) {
    file.text.split("\n").forEach((line, index) => {
      for (const pattern of DEF_PATTERNS) {
        const match = pattern.exec(line);
        if (match?.[1]) {
          defs.push({ path: file.path, name: match[1], line: index });
          break;
        }
      }
    });
  }
  return defs;
};

// identifiers the user is asking about: backticks, camelCase/snake_case, calls
const extractIdentifiers = (text) => {
  const source = String(text || "");
  const ids = new Set();
  for (const match of source.matchAll(/`([^`\n]+)`/g)) ids.add(match[1].trim());
  for (const match of source.matchAll(/\b[A-Za-z_$][\w$]*[A-Z_$][\w$]*\b/g)) ids.add(match[0]);
  for (const match of source.matchAll(/\b[a-z]+(?:_[a-z0-9]+)+\b/g)) ids.add(match[0]);
  for (const match of source.matchAll(/([A-Za-z_$][\w$]*)\s*\(\)/g)) ids.add(match[1]);
  return [...ids].filter((id) => id.length > 1);
};

// match rank: exact > starts/ends with > contains (case-insensitive)
const rankMatch = (identifier, name) => {
  const id = identifier.toLowerCase();
  const target = name.toLowerCase();
  if (id === target) return 3;
  if (target.startsWith(id) || target.endsWith(id)) return 2;
  if (target.includes(id) || id.includes(target)) return 1;
  return 0;
};

// best matching definitions (max 5) and files (max 3) for the user's message
const findMatches = (message, defs, files) => {
  const identifiers = extractIdentifiers(message);
  const words = [
    ...new Set(String(message || "").toLowerCase().match(/[a-z_$][\w$]*/g) || []),
  ].filter((word) => word.length > 2);

  const defMatches = [];
  for (const def of defs) {
    let rank = 0;
    for (const id of identifiers) rank = Math.max(rank, rankMatch(id, def.name));
    for (const word of words) rank = Math.max(rank, rankMatch(word, def.name));
    if (rank) defMatches.push({ ...def, rank });
  }
  defMatches.sort((a, b) => b.rank - a.rank);

  const fileMatches = [];
  for (const file of files) {
    const base = file.path.split("/").pop() || file.path;
    const stem = base.replace(/\.[^.]+$/, "");
    let rank = 0;
    for (const id of identifiers) {
      rank = Math.max(rank, rankMatch(id, base), rankMatch(id, stem));
    }
    for (const word of words) {
      rank = Math.max(rank, rankMatch(word, base), rankMatch(word, stem));
    }
    if (rank) fileMatches.push({ ...file, rank });
  }
  fileMatches.sort((a, b) => b.rank - a.rank);

  return { defs: defMatches.slice(0, 5), files: fileMatches.slice(0, 3) };
};

// extracts a full block from the definition line to its closing brace (or by indentation)
const extractBlock = (text, startLine, isPython) => {
  const lines = text.split("\n");
  let end = startLine;

  if (isPython) {
    // python: the block ends where the indentation drops below the def line
    const indent = lines[startLine].search(/\S/);
    for (let i = startLine + 1; i < lines.length; i++) {
      if (lines[i].trim() && lines[i].search(/\S/) <= indent) break;
      end = i;
    }
  } else {
    // brace counting from the definition line
    let depth = 0;
    for (let i = startLine; i < lines.length; i++) {
      for (const ch of lines[i]) {
        if (ch === "{") depth += 1;
        else if (ch === "}") depth -= 1;
      }
      end = i;
      // block closed (or never opened) -> stop at this line
      if (depth <= 0 && (i > startLine || lines[i].includes("{"))) break;
    }
  }
  return { end, text: lines.slice(startLine, end + 1).join("\n") };
};

// exact code blocks for the definitions and files the user is asking about
const extractExactCode = (message, defs, files) => {
  const { defs: defMatches, files: fileMatches } = findMatches(message, defs, files);
  const blocks = [];
  const filePaths = new Set(fileMatches.map((file) => file.path));

  // whole files whose name the user asked for (cap 8000 chars)
  for (const file of fileMatches) {
    const text = file.text.slice(0, 8000);
    const lines = text.split("\n").length;
    blocks.push(`--- ${file.path} (lines 1-${lines}) ---\n${text}`);
  }

  // full function/class bodies (cap 6000 chars), skipped for matched files
  for (const def of defMatches) {
    if (filePaths.has(def.path)) continue;
    const file = files.find((f) => f.path === def.path);
    if (!file) continue;
    const block = extractBlock(file.text, def.line, file.path.endsWith(".py"));
    blocks.push(
      `--- ${def.path} (lines ${def.line + 1}-${block.end + 1}) ---\n${block.text.slice(0, 6000)}`,
    );
  }

  return blocks;
};

// merge adjacent chunks of the same file into one block, sorted by path and order
const mergeHits = (hits) => {
  const sorted = [...hits].sort((a, b) =>
    a.path === b.path ? a.order - b.order : a.path.localeCompare(b.path),
  );
  const merged = [];
  for (const hit of sorted) {
    const last = merged[merged.length - 1];
    if (last && last.path === hit.path && hit.order === last.endOrder + 1) {
      last.text += hit.text;
      last.endOrder = hit.order;
    } else {
      merged.push({
        path: hit.path,
        startOrder: hit.order,
        endOrder: hit.order,
        text: hit.text,
      });
    }
  }
  return merged;
};

// wraps the context in the untrusted document block
const wrap = (name, text) =>
  `<untrusted_document name="${name}">\nYou only see parts of this project. Say which files you used and ask the user to name a file if you need another part. When the user asks for a function or file from this project, show it VERBATIM from EXACT CODE in a fenced code block with its path. Never rewrite or invent it. If it is not in the provided parts, say so and ask for the exact function or file name.\n${text}\n</untrusted_document>`;

// builds the zip context for the AI: exact code + tree + entry files + search hits
export const buildDocContext = async ({
  documentIds,
  query,
  message,
  userId,
  maxChars = Number(process.env.DOC_CONTEXT_CHARS) || 12000,
}) => {
  if (!documentIds?.length) return "";

  const docs = await Document.find({ _id: { $in: documentIds }, userId }).lean();
  if (!docs.length) return "";

  const chunks = await DocChunk.find({ documentId: { $in: documentIds }, userId })
    .sort({ path: 1, order: 1 })
    .lean();

  const name = (docs[0].name || "project.zip").replace(/["<>\n]/g, "").slice(0, 80);
  const parts = [];

  // the whole project fits -> return everything
  const totalText = chunks.reduce((sum, chunk) => sum + chunk.text.length, 0);
  if (totalText <= maxChars) {
    let lastPath = null;
    for (const chunk of chunks) {
      if (chunk.path !== lastPath) parts.push(`--- ${chunk.path} ---`);
      parts.push(chunk.text);
      lastPath = chunk.path;
    }
    return wrap(name, parts.join("\n"));
  }

  // partial context: the exact code the user asks about comes first
  const files = groupFiles(chunks);
  const candidates = extractExactCode(
    message || query,
    indexDefinitions(files),
    files,
  );
  let used = 0;
  const exactBlocks = [];
  for (const block of candidates) {
    if (used >= maxChars) break;
    exactBlocks.push(block);
    used += block.length;
  }
  if (exactBlocks.length > 0) {
    parts.push(`EXACT CODE (copied from the user's files):\n${exactBlocks.join("\n\n")}`);
  }

  // then the file tree as fallback
  if (used < maxChars) {
    const tree = docs.map((doc) => doc.tree).join("\n").slice(0, 3000);
    parts.push(`PROJECT FILES:\n${tree}`);
    used += tree.length;
  }

  // entry files: README, package.json, index/main/app (first 1500 chars each)
  const usedChunks = new Set();
  const entryPaths = [];
  for (const chunk of chunks) {
    if (ENTRY_FILE.test(chunk.path) && !entryPaths.includes(chunk.path)) {
      entryPaths.push(chunk.path);
    }
  }
  for (const path of entryPaths) {
    if (used >= maxChars) break;
    const text = fileText(chunks, path).slice(0, 1500);
    parts.push(`--- ${path} ---\n${text}`);
    used += text.length;
    chunks.forEach((chunk) => {
      if (chunk.path === path) usedChunks.add(chunk._id.toString());
    });
  }

  // top-scoring chunks from the text search of the question
  const search = String(query || "").replace(/["\\]/g, " ").trim().slice(0, 500);
  if (search && used < maxChars) {
    const hits = await DocChunk.find({
      documentId: { $in: documentIds },
      userId,
      $text: { $search: search },
    })
      .sort({ score: { $meta: "textScore" } })
      .limit(60)
      .lean();

    // keep hits until the budget is used, then merge adjacent chunks per file
    const selected = [];
    for (const hit of hits) {
      if (used >= maxChars) break;
      if (usedChunks.has(hit._id.toString())) continue;
      selected.push(hit);
      used += hit.text.length;
      usedChunks.add(hit._id.toString());
    }

    for (const block of mergeHits(selected)) {
      const label =
        block.startOrder === block.endOrder
          ? `(part ${block.startOrder + 1})`
          : `(parts ${block.startOrder + 1}-${block.endOrder + 1})`;
      parts.push(`--- ${block.path} ${label} ---\n${block.text}`);
    }
  }

  return wrap(name, parts.join("\n"));
};

const docContext = { buildDocContext };

export default docContext;
