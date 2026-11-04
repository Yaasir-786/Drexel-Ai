// linkReader: reads the text of website links in a user message (node built-ins only for the fetching)
import https from "node:https";
import http from "node:http";
import dns from "node:dns";
import net from "node:net";
import { isAbortError } from "./llmClient.js";

const MAX_LINKS = 2;
const MAX_REDIRECTS = 3;
const TOTAL_TIMEOUT = 10000;
const MAX_BYTES = 1.5 * 1024 * 1024;
const MAX_TEXT = 6000;
const USER_AGENT = "DrexelAI-LinkReader/1.0";

// http(s) links and www. domains, max 2 (links inside code are ignored)
export const extractUrls = (message = "") => {
  // pasted code often contains api or localhost links -> skip code blocks and inline code
  const outsideCode = String(message)
    .replace(/```[\s\S]*?(```|$)/g, " ")
    .replace(/`[^`\n]*`/g, " ");

  const urls = [];
  const seen = new Set();
  const patterns = [
    /https?:\/\/[^\s<>"')\]]+/gi,
    /\bwww\.[a-z0-9-]+(?:\.[a-z0-9-]+)+[^\s<>"')\]]*/gi,
  ];

  for (const pattern of patterns) {
    for (const match of outsideCode.matchAll(pattern)) {
      // trailing punctuation is not part of the link
      let url = match[0].replace(/[.,;:!?)\]]+$/, "");
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

      const key = url.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        urls.push(url);
      }
      if (urls.length >= MAX_LINKS) return urls;
    }
  }
  return urls;
};

// private and special IP ranges that must never be fetched (SSRF guard)
const blockedRanges = new net.BlockList();
for (const [ip, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24],
  ["192.168.0.0", 16], ["198.18.0.0", 15], ["224.0.0.0", 3],
]) blockedRanges.addSubnet(ip, prefix, "ipv4");
blockedRanges.addAddress("::", "ipv6");
blockedRanges.addAddress("::1", "ipv6");
blockedRanges.addSubnet("fc00::", 7, "ipv6");
blockedRanges.addSubnet("fe80::", 10, "ipv6");
blockedRanges.addSubnet("ff00::", 8, "ipv6");

const isBlockedIp = (ip) => blockedRanges.check(ip, net.isIPv6(ip) ? "ipv6" : "ipv4");

// dns lookup that refuses private addresses before any connection is made
const safeLookup = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error);

    // validate EVERY address the domain resolves to
    const allowed = addresses.filter((address) => !isBlockedIp(address.address));
    if (allowed.length === 0) return callback(new Error("blocked address"));

    // Node 20+ http core passes all:true and expects the array of results back
    if (options.all) return callback(null, allowed);

    callback(null, allowed[0].address, allowed[0].family);
  });
};

// short plain-language reason for a failed link fetch
const failureReason = (error) => {
  if (error.status) {
    if (error.status === 401 || error.status === 403) {
      return `the site needs a login (HTTP ${error.status})`;
    }
    if (error.status === 404) return "page not found (HTTP 404)";
    if (error.status >= 500) return `server error (HTTP ${error.status})`;
    return `HTTP ${error.status}`;
  }

  const code = error.code || "";
  if (/abort/i.test(error.message) || code === "ABORT_ERR") return "stopped";
  if (/blocked/i.test(error.message)) return "the address is private/blocked";
  if (["ENOTFOUND", "EAI_AGAIN", "ENODATA"].includes(code)) return "domain not found";
  if (["ETIMEDOUT", "ECONNABORTED"].includes(code) || /timeout/i.test(error.message)) {
    return "timed out";
  }
  if (["ECONNREFUSED", "ENETUNREACH", "EHOSTUNREACH"].includes(code)) {
    return "the site refused the connection";
  }
  if (
    ["EPROTO", "ERR_TLS_CERT_ALTNAME_INVALID", "CERT_HAS_EXPIRED"].includes(code) ||
    /cert|tls|ssl/i.test(error.message)
  ) {
    return "secure connection failed";
  }
  if (error.message === "too many redirects") return "too many redirects";
  if (error.message === "invalid url") return "invalid link";
  return String(error.message || code || "unknown error").slice(0, 60);
};

// hostname checks that no redirect hop may escape
const isAllowedHost = (parsedUrl) => {
  if (!/^https?:$/.test(parsedUrl.protocol)) return false;
  if (parsedUrl.port && parsedUrl.port !== "80" && parsedUrl.port !== "443") {
    return false;
  }
  if (/(^|\.)localhost$|\.local$|\.internal$/i.test(parsedUrl.hostname)) {
    return false;
  }
  // an IP-literal hostname skips the DNS lookup, so check it directly
  const host = parsedUrl.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host) && isBlockedIp(host)) return false;
  return true;
};

// one request with SSRF guards, manual redirects and hard limits
const fetchBody = (url, redirectsLeft, deadline, signal) =>
  new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return reject(new Error("invalid url"));
    }
    if (!isAllowedHost(parsed)) return reject(new Error("blocked host"));

    const remaining = deadline - Date.now();
    if (remaining <= 0) return reject(new Error("timeout"));

    const client = parsed.protocol === "https:" ? https : http;
    const request = client.get(
      url,
      {
        lookup: safeLookup,
        autoSelectFamily: false,
        timeout: remaining,
        // the user's stop button aborts the request
        signal,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html, text/plain, application/xhtml+xml, */*;q=0.5",
        },
      },
      (response) => {
        // follow redirects manually, every hop is validated again
        if (
          [301, 302, 303, 307, 308].includes(response.statusCode) &&
          response.headers.location
        ) {
          response.resume();
          if (redirectsLeft <= 0) return reject(new Error("too many redirects"));
          const next = new URL(response.headers.location, url).toString();
          return fetchBody(next, redirectsLeft - 1, deadline, signal).then(resolve, reject);
        }

        // HTTP errors become readable failures with the real status attached
        if (response.statusCode >= 400) {
          response.resume();
          const statusError = new Error(`HTTP ${response.statusCode}`);
          statusError.status = response.statusCode;
          return reject(statusError);
        }

        // only readable text types are processed
        const type = String(response.headers["content-type"] || "")
          .split(";")[0]
          .trim()
          .toLowerCase();
        if (!["text/html", "text/plain", "application/xhtml+xml"].includes(type)) {
          response.resume();
          return resolve(`[not a web page: type ${type || "unknown"}]`);
        }

        // stop reading after the size limit
        let size = 0;
        const chunks = [];
        response.on("data", (chunk) => {
          size += chunk.length;
          if (size > MAX_BYTES) {
            request.destroy();
            resolve(Buffer.concat(chunks).toString("utf8"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        response.on("error", () => resolve(Buffer.concat(chunks).toString("utf8")));
      },
    );

    request.on("timeout", () => request.destroy(new Error("timeout")));
    request.on("error", (error) => reject(error));
  });

// decode the basic HTML entities
const decodeEntities = (text) =>
  text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(parseInt(code, 16)),
    )
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));

// pulls title, meta description, h1-h3 and the visible text out of an HTML page
const extractText = (html) => {
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ");

  const collapse = (text) =>
    decodeEntities(text)
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const title = collapse((clean.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
  const description =
    collapse(
      (clean.match(
        /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i,
      ) || clean.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i) || [])[1] || "",
    ) || "";
  const headings = [...clean.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .map((match) => collapse(match[1]))
    .filter(Boolean);

  // visible text: everything without tags
  const body = collapse(clean);

  const sections = [title, description, ...headings, body].filter(Boolean);
  const result = sections.join("\n").slice(0, MAX_TEXT).trim();

  // JavaScript heavy pages end up almost empty
  if (result.length < 40) {
    return "[The page has little text, it may need JavaScript]";
  }
  return result;
};

// public entry: the readable text of one url, never throws
// the optional signal destroys the request when the user presses stop
export const fetchPageText = async (url, signal) => {
  try {
    if (signal?.aborted) throw new Error("aborted");
    const body = await fetchBody(url, MAX_REDIRECTS, Date.now() + TOTAL_TIMEOUT, signal);

    // the short notes from fetchBody count as failures on the server log too
    if (body.startsWith("[not a web page:")) {
      console.log(`LINK READ FAILED ${url} -> ${body.slice(1, -1)}`);
      return body;
    }

    const text = extractText(body);
    if (text === "[The page has little text, it may need JavaScript]") {
      console.log(`LINK READ FAILED ${url} -> page has little text, it may need JavaScript`);
      return text;
    }
    return text;
  } catch (error) {
    // a user stop is not a failure: finish quietly
    if (isAbortError(error, signal)) return "[Could not read the link]";
    const reason = failureReason(error);
    console.log(`LINK READ FAILED ${url} -> ${reason}`);
    return `[Could not read the link: ${reason}]`;
  }
};
