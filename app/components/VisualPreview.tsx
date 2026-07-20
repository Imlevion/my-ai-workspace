"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Move, Maximize2, Palette, MousePointer2 } from "lucide-react";

type Props = {
  html: string;
  onHtmlChange: (html: string) => void;
  className?: string;
};

/**
 * Interactive HTML preview: select, move, resize, recolor elements.
 * Changes post back as full document HTML for canvas sync.
 */
export function VisualPreview({ html, onHtmlChange, className = "" }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [color, setColor] = useState("#6d8cff");
  const [bg, setBg] = useState("#14141a");
  const [tool, setTool] = useState<"select" | "move" | "resize" | "color">(
    "select"
  );
  const lastHtml = useRef(html);
  const suppressRef = useRef(false);

  const inject = useCallback(
    (docHtml: string) => {
      const iframe = iframeRef.current;
      if (!iframe) return;
      const doc = iframe.contentDocument;
      if (!doc) return;

      // Avoid feedback loop when we just pushed from preview
      if (suppressRef.current) {
        suppressRef.current = false;
      }

      const editorCss = `
#__ve_sel {
  outline: 2px solid #6d8cff !important;
  outline-offset: 2px;
  cursor: move;
}
#__ve_handle {
  position: absolute;
  width: 12px; height: 12px;
  right: -6px; bottom: -6px;
  background: #6d8cff;
  border: 2px solid #fff;
  border-radius: 3px;
  cursor: nwse-resize;
  z-index: 2147483646;
  pointer-events: auto;
}
html, body { min-height: 100%; }
[data-ve-editable] { position: relative; }
`;

      const editorJs = `
(function(){
  if (window.__ve_bound) return;
  window.__ve_bound = true;
  let selected = null;
  let mode = 'select';
  let drag = null;
  let resize = null;
  let paintColor = '#6d8cff';
  let paintBg = '#14141a';

  function postHtml(){
    try {
      var clone = document.documentElement.cloneNode(true);
      // strip editor chrome
      var s = clone.querySelector('#__ve_style');
      if (s) s.remove();
      var h = clone.querySelector('#__ve_handle');
      if (h) h.remove();
      clone.querySelectorAll('[id="__ve_sel"]').forEach(function(el){ el.removeAttribute('id'); });
      var html = '<!DOCTYPE html>\\n' + clone.outerHTML;
      parent.postMessage({ type: 've-html', html: html }, '*');
    } catch(e) {}
  }

  function clearSel(){
    if (selected) selected.removeAttribute('id');
    var h = document.getElementById('__ve_handle');
    if (h) h.remove();
    selected = null;
  }

  function placeHandle(el){
    var old = document.getElementById('__ve_handle');
    if (old) old.remove();
    if (!el || mode !== 'resize') return;
    var handle = document.createElement('div');
    handle.id = '__ve_handle';
    el.style.position = el.style.position || 'relative';
    el.appendChild(handle);
    handle.addEventListener('mousedown', function(e){
      e.preventDefault(); e.stopPropagation();
      var r = el.getBoundingClientRect();
      resize = { el: el, startX: e.clientX, startY: e.clientY, w: r.width, h: r.height };
    });
  }

  function select(el){
    if (!el || el === document.body || el === document.documentElement) return;
    clearSel();
    selected = el;
    el.id = '__ve_sel';
    placeHandle(el);
  }

  document.addEventListener('click', function(e){
    e.preventDefault();
    e.stopPropagation();
    var t = e.target;
    if (t && t.id === '__ve_handle') return;
    if (mode === 'color' && t && t !== document.body) {
      t.style.color = paintColor;
      t.style.backgroundColor = paintBg;
      select(t);
      postHtml();
      return;
    }
    select(t);
  }, true);

  document.addEventListener('mousedown', function(e){
    if (mode !== 'move' || !selected) return;
    if (e.target && e.target.id === '__ve_handle') return;
    if (e.target !== selected && !selected.contains(e.target)) return;
    e.preventDefault();
    var st = window.getComputedStyle(selected);
    if (st.position === 'static') selected.style.position = 'relative';
    drag = {
      el: selected,
      startX: e.clientX,
      startY: e.clientY,
      left: parseFloat(selected.style.left) || 0,
      top: parseFloat(selected.style.top) || 0
    };
  }, true);

  document.addEventListener('mousemove', function(e){
    if (drag) {
      var dx = e.clientX - drag.startX;
      var dy = e.clientY - drag.startY;
      drag.el.style.left = (drag.left + dx) + 'px';
      drag.el.style.top = (drag.top + dy) + 'px';
    }
    if (resize) {
      var dw = e.clientX - resize.startX;
      var dh = e.clientY - resize.startY;
      resize.el.style.width = Math.max(24, resize.w + dw) + 'px';
      resize.el.style.height = Math.max(16, resize.h + dh) + 'px';
    }
  }, true);

  document.addEventListener('mouseup', function(){
    if (drag || resize) postHtml();
    drag = null;
    resize = null;
  }, true);

  window.addEventListener('message', function(ev){
    var d = ev.data || {};
    if (d.type === 've-mode') { mode = d.mode || 'select'; placeHandle(selected); }
    if (d.type === 've-colors') {
      paintColor = d.color || paintColor;
      paintBg = d.bg || paintBg;
    }
  });
})();
`;

      // Write document
      let body = docHtml;
      if (!body.includes("<html") && !body.includes("<!DOCTYPE")) {
        body = `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body>${body}</body></html>`;
      }
      doc.open();
      doc.write(body);
      doc.close();

      // Inject editor assets
      const style = doc.createElement("style");
      style.id = "__ve_style";
      style.textContent = editorCss;
      doc.head?.appendChild(style);

      const script = doc.createElement("script");
      script.textContent = editorJs;
      doc.body?.appendChild(script);
    },
    []
  );

  // Load HTML into iframe when prop changes from outside
  useEffect(() => {
    if (html === lastHtml.current) return;
    lastHtml.current = html;
    inject(html);
  }, [html, inject]);

  // Initial mount
  useEffect(() => {
    inject(html || "<!DOCTYPE html><html><body></body></html>");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for HTML updates from iframe
  useEffect(() => {
    function onMsg(ev: MessageEvent) {
      const d = ev.data;
      if (!d || d.type !== "ve-html" || typeof d.html !== "string") return;
      if (d.html === lastHtml.current) return;
      lastHtml.current = d.html;
      suppressRef.current = true;
      onHtmlChange(d.html);
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [onHtmlChange]);

  // Push tool/color to iframe
  useEffect(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: "ve-mode", mode: tool }, "*");
  }, [tool]);

  useEffect(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: "ve-colors", color, bg }, "*");
  }, [color, bg]);

  return (
    <div className={`visual-preview ${className}`}>
      <div className="visual-preview-toolbar">
        <button
          type="button"
          className={`ve-tool ${tool === "select" ? "active" : ""}`}
          title="Select"
          onClick={() => setTool("select")}
        >
          <MousePointer2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={`ve-tool ${tool === "move" ? "active" : ""}`}
          title="Move"
          onClick={() => setTool("move")}
        >
          <Move className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={`ve-tool ${tool === "resize" ? "active" : ""}`}
          title="Resize"
          onClick={() => setTool("resize")}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={`ve-tool ${tool === "color" ? "active" : ""}`}
          title="Paint color"
          onClick={() => setTool("color")}
        >
          <Palette className="h-3.5 w-3.5" />
        </button>
        <div className="ve-color-pair">
          <label className="ve-color-label" title="Text color">
            <span>Aa</span>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </label>
          <label className="ve-color-label" title="Background">
            <span>Bg</span>
            <input
              type="color"
              value={bg}
              onChange={(e) => setBg(e.target.value)}
            />
          </label>
        </div>
      </div>
      <iframe
        ref={iframeRef}
        title="Visual editor"
        className="visual-preview-frame"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}

/** Extract raw HTML from canvas markdown / fenced code */
export function htmlFromCanvas(text: string): string {
  const m = text.match(/```(?:html|htm)?\n([\s\S]*?)```/i);
  if (m) return m[1].trim();
  if (text.includes("<html") || text.includes("<!DOCTYPE")) return text.trim();
  return text.trim();
}

export function canvasFromHtml(html: string): string {
  return `\`\`\`html\n${html.trim()}\n\`\`\``;
}
