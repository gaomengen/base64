---
title: "Sending Images to GPT-4o, Claude, and Gemini: The Base64 Payload Each One Wants"
published: false
description: Every major vision model takes images as Base64 — but GPT-4o, Claude, and Gemini each expect a different payload shape. Here are the exact, correct formats and why "invalid image" keeps biting you.
tags: ai, machinelearning, python, webdev
canonical_url: https://base64.dev/articles/base64-images-ai-vision
---

> **Paste-into-Dev.to note (delete this blockquote before publishing):** Dev.to renders the front-matter above as the post's title/tags. Set `published: true` when you're ready, or leave `false` to save a draft first. Everything below is the post.

You want to send a screenshot to a vision model. All three of the big ones — OpenAI's GPT-4o, Anthropic's Claude, Google's Gemini — accept images the same fundamental way: **Base64-encode the bytes and put them in the JSON request.** No file uploads, no multipart, just text in a payload.

And yet the single most common error people hit is some flavor of `invalid image` / `could not process image`. The reason is almost never the image. It's that **each provider wants the Base64 wrapped in a differently shaped object**, and the traps are subtle — especially the `data:` URL prefix, which one provider requires and the other two reject.

Here's the exact payload each one wants, side by side.

## OpenAI (GPT-4o)

GPT-4o uses a `content` array of parts. The image is an `image_url` part, and — this is the trap — the `url` field takes a **full data URL**, prefix and all:

```python
import base64
from openai import OpenAI

client = OpenAI()

with open("photo.png", "rb") as f:
    b64 = base64.standard_b64encode(f.read()).decode("utf-8")

resp = client.chat.completions.create(
    model="gpt-4o",
    messages=[{
        "role": "user",
        "content": [
            {"type": "text", "text": "What's in this image?"},
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/png;base64,{b64}"},
            },
        ],
    }],
)
print(resp.choices[0].message.content)
```

The literal payload shape:

```json
{ "type": "image_url", "image_url": { "url": "data:image/png;base64,<BASE64>" } }
```

Note the `data:image/png;base64,` **is** part of the value. Send raw Base64 here and it fails.

## Anthropic (Claude)

Claude uses an `image` content block with a `source` object. Here the MIME type is a **separate field** (`media_type`), and the `data` field wants **raw Base64 — no `data:` prefix**:

```python
import base64
import anthropic

client = anthropic.Anthropic()

with open("photo.png", "rb") as f:
    b64 = base64.standard_b64encode(f.read()).decode("utf-8")

msg = client.messages.create(
    model="claude-opus-4-8",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": b64,   # raw, NO data: prefix
                },
            },
            {"type": "text", "text": "What's in this image?"},
        ],
    }],
)
print(msg.content[0].text)
```

The literal payload shape:

```json
{ "type": "image", "source": { "type": "base64", "media_type": "image/png", "data": "<BASE64>" } }
```

If you paste a `data:image/png;base64,...` string into `data` here, Claude will reject it — the prefix is not valid Base64.

## Google (Gemini)

Gemini uses `parts` with an `inline_data` object: a `mime_type` field plus **raw Base64** (again, no prefix):

```python
import base64
from google import genai
from google.genai import types

client = genai.Client()

with open("photo.png", "rb") as f:
    image_bytes = f.read()

resp = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=[
        types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
        "What's in this image?",
    ],
)
print(resp.text)
```

The SDK handles the encoding for you above, but the wire payload it builds is:

```json
{ "inline_data": { "mime_type": "image/png", "data": "<BASE64>" } }
```

One more Gemini gotcha: the **JavaScript SDK camelCases these keys** — it's `inlineData` and `mimeType`, not `inline_data` / `mime_type`. Same structure, different casing.

## The three shapes at a glance

| Provider | Field the image goes in | `data:` prefix? | Raw Base64? | MIME type lives in |
|---|---|---|---|---|
| **OpenAI (GPT-4o)** | `image_url.url` | **Yes** — full data URL | No | Inside the data URL |
| **Anthropic (Claude)** | `source.data` | No | **Yes** | `source.media_type` |
| **Google (Gemini)** | `inline_data.data` | No | **Yes** | `inline_data.mime_type` |

Read it top to bottom: OpenAI is the odd one out that wants the whole `data:` URL; Claude and Gemini both want raw Base64 with the MIME type broken out into its own field.

## Why you're getting "invalid image"

When a request fails, it's almost always one of these:

1. **Stray `data:` prefix where raw Base64 is expected.** Sending `data:image/png;base64,iVBOR...` to Claude or Gemini's `data` field. They want just `iVBOR...`.
2. **Missing `data:` prefix where OpenAI wants it.** Sending raw Base64 to GPT-4o's `image_url.url`. It wants the full data URL.
3. **Mismatched MIME type.** Declaring `image/jpeg` for a PNG (or vice versa). The declared type must match the actual bytes. A telltale sign: your Base64 starts with `iVBORw0KGgo` (PNG) but you labeled it `image/jpeg` (JPEG bytes start `/9j/`).
4. **Whitespace or newlines in the Base64.** Some encoders (looking at you, `base64` CLI without `-w0`, and older MIME encoders) wrap output at 76 columns. Strip newlines before sending.
5. **Unsupported format.** Stick to PNG, JPEG, WebP, and non-animated GIF. HEIC, SVG, TIFF, and animated GIFs are frequent rejects.
6. **Too large.** OpenAI and Claude cap around **~5 MB per image**; Gemini allows up to **~20 MB of inline data per request**, and above that you're expected to use its Files API instead of inline Base64. Remember Base64 inflates size by ~33%, so a 4 MB file is ~5.3 MB on the wire.

If you just need to grab a correct Base64 string and see the exact payload for each provider without wiring up a script, there's a free browser tool that encodes an image locally (nothing gets uploaded) and shows the ready-to-paste block for all three: **[Image to Base64 for AI Vision](https://base64.dev/image-to-base64-for-ai-vision)**. There are also provider-specific walkthroughs for [Claude](https://base64.dev/claude-api-base64-image) and [Gemini](https://base64.dev/gemini-api-base64-image) if you only care about one.

## TL;DR

- **All three** vision APIs take images as Base64 in the JSON body — no uploads needed.
- **GPT-4o** wants a **full `data:` URL** in `image_url.url`.
- **Claude** wants **raw Base64** in `source.data`, with the type in `source.media_type`.
- **Gemini** wants **raw Base64** in `inline_data.data`, with the type in `inline_data.mime_type` (`inlineData`/`mimeType` in the JS SDK).
- Most `invalid image` errors are a **misplaced `data:` prefix**, a **mismatched MIME type**, **whitespace**, or a file **over the size cap** (~5 MB OpenAI/Claude, ~20 MB Gemini inline).

Get the wrapper right and vision "just works" across all three.

---

*Which provider's payload has bitten you the hardest? Share your worst `invalid image` story in the comments.*
