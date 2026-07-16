/**
 * Recursive architecture explorer — classic script (no modules) for file://.
 * Depends on window.ARCHITECTURE_DATA from architecture-data.js.
 */
(function () {
  "use strict";

  var data = window.ARCHITECTURE_DATA;
  var rootEl = document.getElementById("app");
  var errorEl = document.getElementById("error");

  if (!data || !data.root) {
    if (errorEl) {
      errorEl.style.display = "block";
      errorEl.textContent =
        "ARCHITECTURE_DATA failed to load. Ensure architecture-data.js is next to index.html and scripts are not blocked.";
    }
    return;
  }

  /** @type {Record<string, object>} */
  var byId = {};
  /** @type {Record<string, string|null>} */
  var parentOf = {};

  function indexTree(node, parentId) {
    byId[node.id] = node;
    parentOf[node.id] = parentId || null;
    var kids = node.children || [];
    for (var i = 0; i < kids.length; i++) {
      indexTree(kids[i], node.id);
    }
  }

  indexTree(data.root, null);

  function pathTo(id) {
    var path = [];
    var cur = id;
    while (cur) {
      path.unshift(cur);
      cur = parentOf[cur];
    }
    return path;
  }

  function parseHash() {
    var h = (location.hash || "").replace(/^#/, "");
    if (!h || h === "root") return "root";
    try {
      h = decodeURIComponent(h);
    } catch (e) {
      /* keep raw */
    }
    return byId[h] ? h : "root";
  }

  function setHash(id) {
    var next = id === "root" ? "" : "#" + encodeURIComponent(id);
    if (location.hash.replace(/^#/, "") === (id === "root" ? "" : encodeURIComponent(id))) {
      render(id);
      return;
    }
    location.hash = next;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** Inline markdown: `code`, **bold**, escape the rest. */
  function inlineMd(text) {
    var s = escapeHtml(text);
    // bold before code so nested patterns are rare/simple
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    return s;
  }

  /**
   * Light block markdown for detail prose (file:// safe, no CDN).
   * Supports: paragraphs, blank-line breaks, -/* bullets, 1. ordered lists,
   * nested list indent (2+ spaces), `code`, **bold**.
   */
  function renderMarkdown(text, className) {
    var wrap = el("div", className || "md");
    if (text == null || text === "") return wrap;

    var lines = String(text).replace(/\r\n/g, "\n").split("\n");
    var i = 0;
    var html = "";

    function flushParagraph(buf) {
      if (!buf.length) return;
      html += "<p>" + inlineMd(buf.join(" ").replace(/\s+/g, " ").trim()) + "</p>";
      buf.length = 0;
    }

    function listItemBody(raw) {
      // allow simple nested content on same line only
      return inlineMd(raw);
    }

    while (i < lines.length) {
      var line = lines[i];
      // skip pure blank lines between blocks
      if (/^\s*$/.test(line)) {
        i++;
        continue;
      }

      // unordered list
      if (/^(\s*)([-*])\s+/.test(line)) {
        html += "<ul>";
        while (i < lines.length && /^(\s*)([-*])\s+/.test(lines[i])) {
          var um = lines[i].match(/^(\s*)([-*])\s+(.*)$/);
          var indent = um[1].length;
          var body = um[3];
          i++;
          // collect nested ul items
          var nested = "";
          while (i < lines.length) {
            var nm = lines[i].match(/^(\s*)([-*])\s+(.*)$/);
            if (!nm || nm[1].length <= indent) break;
            if (!nested) nested = "<ul>";
            nested += "<li>" + listItemBody(nm[3]) + "</li>";
            i++;
          }
          if (nested) nested += "</ul>";
          html += "<li>" + listItemBody(body) + nested + "</li>";
        }
        html += "</ul>";
        continue;
      }

      // ordered list
      if (/^(\s*)\d+\.\s+/.test(line)) {
        html += "<ol>";
        while (i < lines.length && /^(\s*)\d+\.\s+/.test(lines[i])) {
          var om = lines[i].match(/^(\s*)\d+\.\s+(.*)$/);
          var oindent = om[1].length;
          var obody = om[2];
          i++;
          var onested = "";
          while (i < lines.length) {
            var onm = lines[i].match(/^(\s*)([-*])\s+(.*)$/);
            if (!onm || onm[1].length <= oindent) break;
            if (!onested) onested = "<ul>";
            onested += "<li>" + listItemBody(onm[3]) + "</li>";
            i++;
          }
          if (onested) onested += "</ul>";
          html += "<li>" + listItemBody(obody) + onested + "</li>";
        }
        html += "</ol>";
        continue;
      }

      // paragraph: consume until blank or list start
      var pbuf = [];
      while (i < lines.length) {
        var L = lines[i];
        if (/^\s*$/.test(L)) {
          i++;
          break;
        }
        if (/^\s*([-*]|\d+\.)\s+/.test(L)) break;
        pbuf.push(L.trim());
        i++;
      }
      flushParagraph(pbuf);
    }

    wrap.innerHTML = html;
    return wrap;
  }

  function countSubtree(node) {
    var n = 1;
    var kids = node.children || [];
    for (var i = 0; i < kids.length; i++) n += countSubtree(kids[i]);
    return n;
  }

  function renderBreadcrumb(id) {
    var nav = el("nav", "breadcrumb");
    nav.setAttribute("aria-label", "Path");
    var path = pathTo(id);
    for (var i = 0; i < path.length; i++) {
      if (i > 0) nav.appendChild(el("span", "sep", "/"));
      var nid = path[i];
      var node = byId[nid];
      var btn = el("button", i === path.length - 1 ? "current" : "", node.title);
      btn.type = "button";
      if (i < path.length - 1) {
        (function (target) {
          btn.addEventListener("click", function () {
            setHash(target);
          });
        })(nid);
      } else {
        btn.setAttribute("aria-current", "page");
      }
      nav.appendChild(btn);
    }
    return nav;
  }

  function renderInterfaces(node) {
    var list = node.interfaces || [];
    if (!list.length) return null;
    var section = el("section", "section");
    section.appendChild(el("h3", null, "Interfaces & traits"));
    var wrap = el("div", "interface-list");
    for (var i = 0; i < list.length; i++) {
      var iface = list[i];
      var card = el("div", "interface-card");
      var title = el("div", null);
      var name = el("span", "iname", iface.name);
      title.appendChild(name);
      if (iface.kind) {
        title.appendChild(el("span", "ikind", iface.kind));
      }
      card.appendChild(title);
      if (iface.crate) {
        card.appendChild(el("div", "icrate", "crate: " + iface.crate));
      }
      if (iface.description) {
        card.appendChild(renderMarkdown(iface.description, "idesc md"));
      }
      if (iface.interactions) {
        var iblock = el("div", "iinteract");
        iblock.appendChild(el("strong", null, "How they interact: "));
        // single-line interactions: still run through inline markdown via a one-line md block
        var iMd = renderMarkdown(iface.interactions, "md inline-md");
        iblock.appendChild(iMd);
        card.appendChild(iblock);
      }
      wrap.appendChild(card);
    }
    section.appendChild(wrap);
    return section;
  }

  function renderRelations(node) {
    var rels = node.relations || [];
    if (!rels.length) return null;
    var section = el("section", "section");
    section.appendChild(el("h3", null, "Related concerns"));
    var wrap = el("div", "relation-list");
    for (var i = 0; i < rels.length; i++) {
      var r = rels[i];
      if (!byId[r.to]) continue;
      var chip = el("button", "relation-chip");
      chip.type = "button";
      if (r.label) {
        chip.appendChild(el("span", "rel-label", r.label));
      }
      chip.appendChild(document.createTextNode(byId[r.to].title));
      (function (target) {
        chip.addEventListener("click", function () {
          setHash(target);
        });
      })(r.to);
      wrap.appendChild(chip);
    }
    if (!wrap.childNodes.length) return null;
    section.appendChild(wrap);
    return section;
  }

  function renderCrates(node) {
    var paths = node.cratePaths || [];
    if (!paths.length) return null;
    var section = el("section", "section");
    section.appendChild(el("h3", null, "Primary paths"));
    var ul = el("ul", "crate-list");
    for (var i = 0; i < paths.length; i++) {
      ul.appendChild(el("li", null, paths[i]));
    }
    section.appendChild(ul);
    return section;
  }

  function renderChildren(node) {
    var kids = node.children || [];
    if (!kids.length) return null;
    var section = el("section", "section children-section");
    section.appendChild(
      el("h3", null, "Dive deeper — " + kids.length + " concern" + (kids.length === 1 ? "" : "s"))
    );
    var grid = el("div", "children-grid");
    for (var i = 0; i < kids.length; i++) {
      var child = kids[i];
      var card = el("button", "child-card");
      card.type = "button";
      card.setAttribute("data-node-id", child.id);
      card.appendChild(el("div", "ctitle", child.title));
      card.appendChild(renderMarkdown(child.summary || "", "csummary md compact-md"));
      var meta = el("div", "cmeta");
      var nChild = (child.children || []).length;
      var nIface = (child.interfaces || []).length;
      if (nChild) {
        meta.appendChild(el("span", "badge children", nChild + " sub-concerns"));
      } else if (child.leafNote) {
        meta.appendChild(el("span", "badge leaf", "leaf"));
      }
      if (nIface) {
        meta.appendChild(el("span", "badge interfaces", nIface + " interfaces"));
      }
      card.appendChild(meta);
      card.appendChild(el("div", "dive", "Dive →"));
      (function (target) {
        card.addEventListener("click", function () {
          setHash(target);
        });
      })(child.id);
      grid.appendChild(card);
    }
    section.appendChild(grid);
    return section;
  }

  function render(id) {
    var node = byId[id] || data.root;
    id = node.id;

    rootEl.innerHTML = "";

    /* Header */
    var header = el("header", "header");
    header.appendChild(el("h1", null, data.meta.title || "Architecture Explorer"));
    if (data.meta.subtitle) {
      header.appendChild(el("p", "subtitle", data.meta.subtitle));
    }
    if (id === "root" && data.meta.notes) {
      header.appendChild(el("p", "meta-note", data.meta.notes));
    }
    rootEl.appendChild(header);

    /* Breadcrumb */
    rootEl.appendChild(renderBreadcrumb(id));

    /* Up / home nav */
    var navRow = el("div", "nav-row");
    if (parentOf[id]) {
      var up = el("button", "nav-btn primary", "← Up one level");
      up.type = "button";
      up.setAttribute("data-nav", "up");
      up.addEventListener("click", function () {
        setHash(parentOf[id]);
      });
      navRow.appendChild(up);
    }
    if (id !== "root") {
      var home = el("button", "nav-btn", "⌂ Top level");
      home.type = "button";
      home.setAttribute("data-nav", "home");
      home.addEventListener("click", function () {
        setHash("root");
      });
      navRow.appendChild(home);
    }
    if (navRow.childNodes.length) rootEl.appendChild(navRow);

    if (id === "root") {
      var hint = el("div", "overview-hint");
      var strong = el("strong", null, "How to use: ");
      hint.appendChild(strong);
      hint.appendChild(
        document.createTextNode(
          "Each card is a high-level architectural concern. Dive in to see its description, the traits/interfaces at that boundary, how parts interact, then drill into its sub-concerns — recursively until leaf notes."
        )
      );
      rootEl.appendChild(hint);
    }

    /* Detail */
    var detail = el("article", "detail");
    detail.setAttribute("data-node-id", node.id);
    detail.setAttribute("id", "main-detail");

    var dhead = el("div", "detail-header");
    dhead.appendChild(el("h2", null, node.title));
    var badges = el("div", "badge-row");
    var kids = node.children || [];
    var ifaces = node.interfaces || [];
    if (kids.length) {
      badges.appendChild(el("span", "badge children", kids.length + " children"));
    } else {
      badges.appendChild(el("span", "badge leaf", "architectural leaf"));
    }
    if (ifaces.length) {
      badges.appendChild(el("span", "badge interfaces", ifaces.length + " contracts"));
    }
    badges.appendChild(el("span", "badge", countSubtree(node) + " nodes in subtree"));
    dhead.appendChild(badges);
    detail.appendChild(dhead);

    if (node.summary) {
      detail.appendChild(renderMarkdown(node.summary, "summary md compact-md"));
    }
    if (node.description) {
      detail.appendChild(renderMarkdown(node.description, "description md"));
    }

    var crates = renderCrates(node);
    if (crates) detail.appendChild(crates);

    var ifaceSec = renderInterfaces(node);
    if (ifaceSec) detail.appendChild(ifaceSec);

    var relSec = renderRelations(node);
    if (relSec) detail.appendChild(relSec);

    if (node.leafNote) {
      var ln = el("div", "leaf-note");
      ln.appendChild(el("strong", null, "Leaf note: "));
      ln.appendChild(renderMarkdown(node.leafNote, "md compact-md"));
      detail.appendChild(ln);
    }

    rootEl.appendChild(detail);

    /* Children */
    var childSec = renderChildren(node);
    if (childSec) rootEl.appendChild(childSec);

    /* Footer */
    var footer = el("footer", "footer");
    footer.appendChild(
      document.createTextNode(
        "Source: repo layout + crate entry modules. Composition root: "
      )
    );
    footer.appendChild(el("code", null, data.meta.compositionRoot || "xai-grok-pager-bin"));
    footer.appendChild(document.createTextNode(". Open via file:// or any static server."));
    rootEl.appendChild(footer);

    /* Accessibility: move focus to detail */
    var h2 = detail.querySelector("h2");
    if (h2) {
      h2.setAttribute("tabindex", "-1");
      try {
        h2.focus({ preventScroll: false });
      } catch (e) {
        /* ignore */
      }
    }

    document.title = node.title + " · " + (data.meta.title || "Architecture");
  }

  window.addEventListener("hashchange", function () {
    render(parseHash());
  });

  /* Initial paint */
  render(parseHash());

  /* Expose for audits / tests */
  window.__ARCH_EXPLORER__ = {
    byId: byId,
    parentOf: parentOf,
    pathTo: pathTo,
    parseHash: parseHash,
    render: render,
    setHash: setHash,
    root: data.root,
    meta: data.meta,
    nodeCount: Object.keys(byId).length,
  };
})();
