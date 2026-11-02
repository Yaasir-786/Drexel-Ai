import Document from "../models/documentModel.js";
import DocChunk from "../models/docChunkModel.js";

// files that describe the project structure
const ENTRY_FILE = /(^|\/)(readme[^\/]*|package\.json|index\.html|index\.[tj]sx?|main\.[tj]sx?|app\.py)$/i;

// full text of one file from its chunks (in order)
const fileText = (chunks, path) =>
  chunks
    .filter((chunk) => chunk.path === path)
    .map((chunk) => chunk.text)
    .join("");

// wraps the context in the untrusted document block
const wrap = (name, text) =>
  `<untrusted_document name="${name}">\nYou only see parts of this project. Say which files you used and ask the user to name a file if you need another part.\n${text}\n</untrusted_document>`;

// builds the zip context for the AI: whole project, or tree + entry files + search hits
export const buildDocContext = async ({
  documentIds,
  query,
  maxChars = Number(process.env.DOC_CONTEXT_CHARS) || 12000,
}) => {
  if (!documentIds?.length) return "";

  const docs = await Document.find({ _id: { $in: documentIds } }).lean();
  if (!docs.length) return "";

  const chunks = await DocChunk.find({ documentId: { $in: documentIds } })
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

  // partial context: the file tree first
  const tree = docs.map((doc) => doc.tree).join("\n").slice(0, 3000);
  parts.push(`PROJECT FILES:\n${tree}`);
  let used = tree.length;

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
      $text: { $search: search },
    })
      .sort({ score: { $meta: "textScore" } })
      .limit(60)
      .lean();

    for (const hit of hits) {
      if (used >= maxChars) break;
      if (usedChunks.has(hit._id.toString())) continue;
      parts.push(`--- ${hit.path} (part ${hit.order + 1}) ---\n${hit.text}`);
      used += hit.text.length;
      usedChunks.add(hit._id.toString());
    }
  }

  return wrap(name, parts.join("\n"));
};

const docContext = { buildDocContext };

export default docContext;
