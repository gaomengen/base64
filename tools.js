/* tools.js — shared client-side helpers for base64.dev conversion tools.
   Everything runs locally in the browser; no data leaves the page. */
(function () {
  'use strict';

  // Theme toggle (mirrors the homepage behavior).
  try { if (localStorage.getItem('base64dev-theme') === 'light') document.documentElement.classList.add('light'); } catch (e) {}
  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('themeBtn');
    if (btn) btn.addEventListener('click', function () {
      document.documentElement.classList.toggle('light');
      try { localStorage.setItem('base64dev-theme', document.documentElement.classList.contains('light') ? 'light' : 'dark'); } catch (e) {}
    });
  });

  // --- Byte <-> Base64 ---
  function bytesToBase64(bytes) {
    var bin = '';
    var chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }
  function base64ToBytes(b64) {
    var input = String(b64).trim();
    var m = input.match(/^data:[^;,]*;base64,(.*)$/s);
    if (m) input = m[1];
    input = input.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
    while (input.length % 4) input += '=';
    var bin = atob(input);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  // --- Text <-> Base64 (UTF-8 safe) ---
  function encodeText(text, urlSafe) {
    var b = bytesToBase64(new TextEncoder().encode(text));
    if (urlSafe) b = b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return b;
  }
  function decodeText(b64) {
    return new TextDecoder('utf-8', { fatal: true }).decode(base64ToBytes(b64));
  }

  // --- Hex <-> bytes ---
  function bytesToHex(bytes, opts) {
    opts = opts || {};
    var sep = opts.sep || '';
    var hex = '';
    for (var i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0');
      if (sep && i < bytes.length - 1) hex += sep;
    }
    return opts.upper ? hex.toUpperCase() : hex;
  }
  function hexToBytes(hex) {
    var clean = String(hex).replace(/0x/gi, '').replace(/[\s:,-]/g, '');
    if (clean.length % 2 !== 0) throw new Error('Hex string has an odd number of digits.');
    if (!/^[0-9a-fA-F]*$/.test(clean)) throw new Error('Hex string contains non-hex characters.');
    var out = new Uint8Array(clean.length / 2);
    for (var i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
    return out;
  }

  // --- UI helpers ---
  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }
  function setStatus(el, type, text) {
    if (!el) return;
    el.className = 'tool-status' + (type ? ' ' + type : '');
    el.innerHTML = '<span class="status-dot"></span><span></span>';
    el.lastChild.textContent = text;
  }
  function wireCopy(btn, getText) {
    if (!btn) return;
    btn.addEventListener('click', function () {
      var text = getText();
      if (!text) return;
      navigator.clipboard.writeText(text).then(function () {
        var orig = btn.textContent;
        btn.textContent = 'Copied!'; btn.classList.add('copied');
        setTimeout(function () { btn.textContent = orig; btn.classList.remove('copied'); }, 1500);
      }).catch(function () {});
    });
  }
  function downloadBytes(bytes, filename, mime) {
    var blob = new Blob([bytes], { type: mime || 'application/octet-stream' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function sniffMime(bytes) {
    var b = bytes;
    if (b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'image/png';
    if (b.length >= 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'image/jpeg';
    if (b.length >= 4 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'image/gif';
    if (b.length >= 12 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
    if (b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'application/pdf';
    if (b.length >= 5 && b[0] === 0x3C && b[1] === 0x3F && b[2] === 0x78 && b[3] === 0x6D && b[4] === 0x6C) return 'image/svg+xml';
    return null;
  }

  // Heuristic: does this string look like Base64 (incl. URL-safe / data URI)?
  // Biased toward detection — a false positive harmlessly falls back to encoding
  // (decodeText throws on non-UTF-8), but a false negative would wrongly re-encode
  // real Base64 the user pasted to decode.
  function looksBase64(str) {
    if (!str || str.trim().length < 8) return false;
    var t = str.trim();
    if (/^data:[^;]+;base64,/.test(t)) return true;
    var c = t.replace(/\s/g, '').replace(/=+$/, '');
    if (c.length < 8) return false;
    // All standard Base64 chars OR all URL-safe chars (not mixed punctuation/prose).
    return /^[A-Za-z0-9+/]+$/.test(c) || /^[A-Za-z0-9_-]+$/.test(c);
  }

  // Generic auto-detect text encode/decode widget shared by the tool pages.
  // opts: { input, output, status, copyBtn?, clearBtn? } (element ids)
  function wireTextTool(opts) {
    var input = document.getElementById(opts.input);
    var output = document.getElementById(opts.output);
    var status = document.getElementById(opts.status);
    function run() {
      var v = input.value;
      if (!v.trim()) { output.value = ''; setStatus(status, '', 'Type or paste to encode / decode'); return; }
      if (looksBase64(v)) {
        try { output.value = decodeText(v); setStatus(status, 'ok', 'Decoded — Base64 → text'); return; } catch (e) {}
      }
      output.value = encodeText(v, false);
      setStatus(status, 'ok', 'Encoded — text → Base64');
    }
    if (input) input.addEventListener('input', run);
    if (opts.copyBtn) wireCopy(document.getElementById(opts.copyBtn), function () { return output.value; });
    if (opts.clearBtn) {
      var cb = document.getElementById(opts.clearBtn);
      if (cb) cb.addEventListener('click', function () { input.value = ''; output.value = ''; setStatus(status, '', 'Cleared'); input.focus(); });
    }
    return run;
  }

  window.B64 = {
    looksBase64: looksBase64,
    wireTextTool: wireTextTool,
    bytesToBase64: bytesToBase64,
    base64ToBytes: base64ToBytes,
    encodeText: encodeText,
    decodeText: decodeText,
    bytesToHex: bytesToHex,
    hexToBytes: hexToBytes,
    fmtSize: fmtSize,
    setStatus: setStatus,
    wireCopy: wireCopy,
    downloadBytes: downloadBytes,
    sniffMime: sniffMime
  };
})();
