#!/usr/bin/env node
/**
 * Content audit for the architecture explorer.
 * Parses architecture-data.js (shipped data) — does not re-implement content.
 *
 * Usage: node audit-content.js [path-to-architecture-data.js]
 * Exit 0 on pass, 1 on fail. Writes human-readable lines to stdout.
 */
"use strict";

var fs = require("fs");
var path = require("path");

var dataPath = process.argv[2] || path.join(__dirname, "architecture-data.js");
var raw = fs.readFileSync(dataPath, "utf8");

// Strip assignment wrapper: window.ARCHITECTURE_DATA = ... ;
var jsonText = raw
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*window\.ARCHITECTURE_DATA\s*=\s*/m, "")
  .replace(/;\s*$/, "")
  .trim();

var data;
try {
  data = JSON.parse(jsonText);
} catch (e) {
  console.log("FAIL: could not JSON.parse architecture-data.js after strip: " + e.message);
  process.exit(1);
}

var fails = [];
var passes = [];

function pass(msg) {
  passes.push(msg);
  console.log("PASS: " + msg);
}
function fail(msg) {
  fails.push(msg);
  console.log("FAIL: " + msg);
}

function walk(node, fn, parent) {
  fn(node, parent);
  (node.children || []).forEach(function (c) {
    walk(c, fn, node);
  });
}

if (!data.root) {
  fail("missing data.root");
  process.exit(1);
}

var nodes = [];
var byId = {};
walk(data.root, function (n) {
  nodes.push(n);
  byId[n.id] = n;
});

pass("parsed nodes: " + nodes.length);

// (a) top level lists multiple high-level concerns
var topKids = data.root.children || [];
if (topKids.length >= 5) {
  pass("top-level concerns: " + topKids.length + " (>= 5)");
} else {
  fail("top-level concerns: " + topKids.length + " (need >= 5)");
}

// (b) every non-leaf has non-empty description and at least one child
var nonLeafOk = 0;
var nonLeafBad = [];
nodes.forEach(function (n) {
  var kids = n.children || [];
  if (kids.length === 0) {
    // leaf: need description OR leafNote
    if (!(n.description && String(n.description).trim()) && !n.leafNote) {
      nonLeafBad.push(n.id + " (leaf missing description/leafNote)");
    }
    return;
  }
  if (!(n.description && String(n.description).trim())) {
    nonLeafBad.push(n.id + " (non-leaf missing description)");
    return;
  }
  nonLeafOk++;
});
if (nonLeafBad.length === 0) {
  pass("non-leaf nodes with description+children: " + nonLeafOk + "; all leaves documented");
} else {
  fail("structure issues: " + nonLeafBad.slice(0, 10).join("; "));
}

// (c) major README-layout areas appear
var requiredSubstrings = [
  { key: "pager-bin composition", re: /pager-bin|composition.root|xai-grok-pager-bin/i },
  { key: "pager TUI", re: /xai-grok-pager|TUI|scrollback/i },
  { key: "shell runtime", re: /xai-grok-shell|agent runtime|MvpAgent/i },
  { key: "tools", re: /xai-grok-tools|Tool trait|tool-runtime/i },
  { key: "workspace", re: /xai-grok-workspace|WorkspaceHandle|WorkspaceOps/i },
  { key: "tools/MCP gateway", re: /MCP|xai-grok-mcp|ToolDispatch|tool-protocol/i },
  { key: "config-auth", re: /xai-grok-config|AuthCredential|HttpAuth/i },
  { key: "leader-modes", re: /run_leader|leader|headless|stdio|connect_or_spawn/i },
];

var blob = JSON.stringify(data);
requiredSubstrings.forEach(function (r) {
  if (r.re.test(blob)) pass("coverage: " + r.key);
  else fail("coverage missing: " + r.key);
});

// (d) interface/trait mentions at key boundaries
var interfaceMentions = 0;
var traitNamed = 0;
var interactionNotes = 0;
nodes.forEach(function (n) {
  (n.interfaces || []).forEach(function (iface) {
    interfaceMentions++;
    if (/trait/i.test(iface.kind || "") || /^[A-Z][A-Za-z0-9]+$/.test(iface.name || "")) {
      traitNamed++;
    }
    if (iface.interactions && String(iface.interactions).trim()) interactionNotes++;
  });
});

if (interfaceMentions >= 20) {
  pass("interface/contract entries: " + interfaceMentions + " (>= 20)");
} else {
  fail("interface/contract entries: " + interfaceMentions + " (need >= 20)");
}
if (interactionNotes >= 15) {
  pass("interaction notes on interfaces: " + interactionNotes + " (>= 15)");
} else {
  fail("interaction notes on interfaces: " + interactionNotes + " (need >= 15)");
}

// Relation targets resolve
var brokenRels = [];
nodes.forEach(function (n) {
  (n.relations || []).forEach(function (r) {
    if (!byId[r.to]) brokenRels.push(n.id + " -> " + r.to);
  });
});
if (brokenRels.length === 0) pass("all relation targets resolve");
else fail("broken relations: " + brokenRels.slice(0, 8).join("; "));

// Unique ids
var ids = nodes.map(function (n) {
  return n.id;
});
var uniq = new Set(ids);
if (uniq.size === ids.length) pass("unique node ids: " + uniq.size);
else fail("duplicate node ids");

// Depth: max depth and that we go beyond 2
var maxDepth = 0;
function depthWalk(n, d) {
  if (d > maxDepth) maxDepth = d;
  (n.children || []).forEach(function (c) {
    depthWalk(c, d + 1);
  });
}
depthWalk(data.root, 0);
if (maxDepth >= 3) pass("max depth: " + maxDepth + " (>= 3 recursive levels)");
else fail("max depth: " + maxDepth + " (need recursive depth >= 3)");

// Top-level titles for human summary
console.log("---");
console.log("TOP_LEVEL: " + topKids.map(function (c) {
  return c.id;
}).join(", "));
console.log("NODE_COUNT: " + nodes.length);
console.log("INTERFACE_COUNT: " + interfaceMentions);
console.log("MAX_DEPTH: " + maxDepth);
console.log("---");
console.log(
  "SUMMARY: " +
    passes.length +
    " pass, " +
    fails.length +
    " fail"
);

process.exit(fails.length ? 1 : 0);
