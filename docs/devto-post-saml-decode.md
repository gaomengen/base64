---
title: "Debugging SAML SSO: How to Decode a SAMLResponse (and Why It's Sometimes Not XML)"
published: false
description: Decoding a SAMLResponse sometimes gives you clean XML and sometimes binary garbage. The reason is the two SAML bindings. Here's how to decode both, what to read in the assertion, and how to fix the common Base64 errors.
tags: security, sso, webdev, devops
canonical_url: https://base64.dev/articles/decode-saml-response
---

> **Paste-into-Dev.to note (delete this blockquote before publishing):** Dev.to renders the front-matter above as the post's title/tags. Set `published: true` when you're ready, or leave `false` to save a draft first. Everything below is the post.

You're debugging a broken SSO login. The identity provider (IdP) redirects back to your app, and somewhere in the request is a big blob called `SAMLResponse`. You grab it, Base64-decode it, and expect to see clean XML.

Sometimes you do. Sometimes you get binary garbage that starts with bytes like `0x78 0x9c` and looks nothing like markup.

Both outcomes are correct. The difference is which **SAML binding** the IdP used, and once you know the two encoding chains, SAML debugging stops being guesswork.

## The two bindings, and their two encodings

SAML sends its messages (`SAMLResponse`, `SAMLRequest`) using one of two HTTP bindings, and they encode the payload differently:

**HTTP-POST binding** — the message rides in a hidden form field that auto-submits via POST. The value is simply:

```
Base64(XML)
```

Decode the Base64 and you get the assertion XML directly. This is the common case for the response coming back from the IdP.

**HTTP-Redirect binding** — the message rides in a URL query string, so it has to be small and URL-safe. The value is:

```
URLEncode( Base64( DEFLATE( XML ) ) )
```

That's three layers. If you only Base64-decode it, you're staring at the raw output of a DEFLATE compressor — which is exactly the binary garbage people report. This binding is typically used for `SAMLRequest` (the AuthnRequest your app sends *to* the IdP) and for Single Logout.

Critically, the redirect binding uses **raw DEFLATE** (RFC 1951) with **no zlib header and no checksum**. That's the single most common thing people get wrong — they reach for a normal zlib/gzip inflate, it chokes on the missing header, and they conclude the blob is corrupt. It isn't; it just needs a raw inflate.

## Decoding both in Python

```python
import base64
import zlib
from urllib.parse import unquote

# --- HTTP-POST binding: Base64(XML) ---
def decode_post(saml_response: str) -> str:
    return base64.b64decode(saml_response).decode("utf-8")

# --- HTTP-Redirect binding: URLEncode(Base64(DEFLATE(XML))) ---
def decode_redirect(saml_param: str) -> str:
    url_decoded = unquote(saml_param)          # 1. undo URL-encoding
    raw = base64.b64decode(url_decoded)        # 2. undo Base64
    # 3. RAW inflate: wbits = -15 => no zlib header, no checksum
    return zlib.decompress(raw, -15).decode("utf-8")
```

The magic number is that `-15` passed as `wbits`. The negative sign tells zlib "this is raw DEFLATE, don't expect a header." Use `zlib.decompress(data, -15)` for the redirect binding, plain `base64.b64decode` for POST.

Not sure which binding you're holding? A quick heuristic: if Base64-decoding gives you text starting with `<?xml` or `<saml`, it's POST. If it gives you bytes, try a raw inflate — it's almost certainly Redirect.

## What to actually read in the decoded assertion

Once you have XML, don't just admire it — the debugging clues are in specific fields:

- **`Issuer`** — is this really from the IdP you configured? A mismatch means metadata drift.
- **`Destination`** — must match your Assertion Consumer Service (ACS) URL. A trailing slash or `http` vs `https` mismatch here breaks validation.
- **`<samlp:Status>` `StatusCode`** — `Success` vs something like `Responder` or `AuthnFailed`. This is the IdP telling you *why* it said no.
- **`NameID` + its `Format`** — is the user identifier what your app expects (email vs persistent vs transient)? A format mismatch is a classic "logged in but no account found" bug.
- **`Conditions` `NotBefore` / `NotOnOrAfter`** — these are usually a tight window (a few minutes). If the server clocks between IdP and SP drift, validation fails with a confusing "assertion expired" even though the login just happened. **Clock skew is one of the most common SAML failures**, and you can only see it by reading these timestamps.
- **`AudienceRestriction` `Audience`** — must equal your SP entity ID. If it doesn't, the IdP issued the assertion for a different application.
- **Signature** — check whether a `<ds:Signature>` is present. But note the trap: **a signature being present is not the same as it being verified.** Presence tells you the IdP signed something; only your SP validating it against the right certificate tells you it's trustworthy.

## The Base64 errors you'll actually hit

If your IdP is Azure AD / Entra, you'll eventually meet **`AADSTS750056: SAMLResponse must be a properly formed and encoded ... Base64`**. Despite the wording, the assertion is usually fine — something mangled the transport:

- A **proxy or WAF stripping `+` characters** (turning them into spaces), because `+` is significant in Base64 but also means "space" in some URL contexts. Result: an invalid Base64 string.
- **76-character line wrapping** (MIME-style Base64) that a strict decoder rejects. Standard SAML Base64 should be one continuous string.

Both come down to the same fix: preserve the exact bytes end-to-end and don't let middleware "helpfully" rewrite the payload.

## A security warning worth repeating

A SAML assertion **is a credential.** For its short validity window, whoever holds it can often impersonate the user. So when you decode one for debugging, decode it in something that runs **client-side** — never paste a production assertion into a random server-side online decoder, because you've just handed a live credential to a third-party server.

For quick local decoding there's a free browser-based tool that auto-detects the binding — it'll URL-decode, Base64-decode, and auto-inflate raw DEFLATE, pretty-print the XML, and pull out the claims for you, all **100% client-side** with nothing sent to a server: **[SAML Decoder](https://base64.dev/saml-decoder)**.

## POST vs Redirect at a glance

| | HTTP-POST binding | HTTP-Redirect binding |
|---|---|---|
| Encoding chain | `Base64(XML)` | `URLEncode(Base64(DEFLATE(XML)))` |
| Decode steps | Base64-decode | URL-decode → Base64-decode → **raw** inflate (`wbits=-15`) |
| Compression | None | Raw DEFLATE (no zlib header) |
| Typically used for | `SAMLResponse` from IdP | `SAMLRequest`, Single Logout |
| Base64-decode alone gives | Clean XML | Binary garbage (DEFLATE bytes) |

## TL;DR

- A `SAMLResponse` that decodes to clean XML is the **POST binding** (`Base64(XML)`). One that decodes to binary is the **Redirect binding** (`Base64(DEFLATE(XML))`, URL-encoded).
- For the redirect binding you must **URL-decode, Base64-decode, then RAW-inflate** — `zlib.decompress(data, -15)`. Regular zlib/gzip inflate will fail on the missing header.
- When reading the assertion, check `Status`, `Destination`, `Audience`, and especially the `Conditions` timestamps — **clock skew** is a top cause of "it authenticated but still failed."
- Treat assertions as live credentials: decode them **client-side**, never on someone else's server.
- `AADSTS750056` usually means a proxy mangled `+` or line-wrapped the Base64, not a malformed assertion.

---

*What's the weirdest SAML failure you've had to decode your way out of? Share it in the comments.*
