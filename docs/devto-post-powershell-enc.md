---
title: "Decoding a PowerShell -EncodedCommand During Incident Response (the UTF-16 gotcha)"
published: false
description: A powershell -enc <base64> command decodes to garbled, space-separated text if you treat it as UTF-8. It's actually Base64 of UTF-16LE bytes. Here's how to decode it correctly and safely.
tags: powershell, security, infosec, devops
canonical_url: https://base64.dev/articles/decode-powershell-encoded-command
---

> **Paste-into-Dev.to note (delete this blockquote before publishing):** Dev.to renders the front-matter above as the post's title/tags. Set `published: true` when you're ready, or leave `false` to save a draft first. Everything below is the post.

You're triaging an alert. Scheduled task, weird parent process, and a command line that looks like this:

```
powershell.exe -nop -w hidden -enc JABjACAAPQAg...
```

You know the drill: grab the Base64 blob, decode it, read the script. So you paste it into a decoder and get back this:

```
$ c   =   " h t t p : / / ...
```

Garbage. A space (or a null) between every single character. First instinct is that the payload is doubly-encoded or encrypted. It isn't. **This is the single most common gotcha with `-EncodedCommand`, and once you know it, it takes ten seconds to fix.**

## Why it looks garbled

`powershell.exe -enc` (short for `-EncodedCommand`) expects Base64 of **UTF-16LE** (little-endian Unicode) bytes — not UTF-8. That's mandated by PowerShell itself, not a choice the attacker made.

In UTF-16LE, every ASCII character is stored as **two bytes**: the character followed by a `0x00` null byte. So the letter `c` isn't `0x63`, it's `0x63 0x00`. When you Base64-decode the blob and then read it as UTF-8, every one of those null bytes renders as a space or an invisible control character. Hence the `h t t p` spacing.

```
Text:      c        =        "
UTF-16LE:  63 00    3D 00    22 00
UTF-8 view: c  ␀     =  ␀     "  ␀     <- the null shows up as a "space"
```

Decode it as UTF-16LE instead and the nulls disappear, because that's what they were: the high byte of each 16-bit code unit.

## Decode it correctly

**In PowerShell itself** — the encoding is literally called `Unicode` in .NET, which means UTF-16LE:

```powershell
$enc = 'JABjACAAPQAg...'
[System.Text.Encoding]::Unicode.GetString([System.Convert]::FromBase64String($enc))
```

**In Python** — decode the bytes, then read them as `utf-16-le`:

```python
import base64
enc = "JABjACAAPQAg..."
print(base64.b64decode(enc).decode("utf-16-le"))
```

**In CyberChef** — build the recipe `From Base64` → `Decode text (UTF-16LE)`. Or `From Base64` then `Remove null bytes` for a quick-and-dirty look.

Any of these turns the spaced-out mess back into readable PowerShell.

## The encode direction (for building test cases)

If you're writing detections or a lab sample, this is how the blob is produced — same `Unicode`/UTF-16LE contract in reverse:

```powershell
$cmd = 'Write-Host "hello from encoded command"'
[System.Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($cmd))
```

Feed that output back to `powershell -enc` and it runs. Legit automation uses this all the time — it's a clean way to pass a multi-line script through a single argument without quoting nightmares. That's exactly why malware hides in the same crowd.

## The second layer: it's often gzip too

Sometimes you decode correctly and *still* get binary garbage. That's the next common trick: the real script is **gzip-compressed**, then Base64'd. The outer PowerShell you just decoded is a tiny loader whose whole job is to inflate the inner payload in memory:

```powershell
# telltale pattern inside the decoded stub
$s = New-Object IO.MemoryStream(,[Convert]::FromBase64String("H4sIA..."))
IO.StreamReader(New-Object IO.Compression.GzipStream($s,[IO.Compression.CompressionMode]::Decompress)).ReadToEnd()
```

The tell is the inner Base64 starting with `H4sI` — that's the gzip magic number (`1f 8b`) in Base64. When you see it, decode Base64 again and gunzip to reach the actual script. Payloads can nest two or three layers deep this way.

## Is it safe to decode a suspicious sample?

Yes. **Decoding is not executing.** Converting Base64 back to text and inflating gzip are pure data transformations — no `powershell.exe` runs, nothing touches the script block, nothing hits the network. The danger is only if you *run* the decoded command. So decode freely and read; just don't pipe the result into a shell.

For fast triage there's a free browser-based tool that decodes `-enc` / `-EncodedCommand` for you — it handles the UTF-16LE conversion and auto-inflates nested gzip layers, and it runs entirely client-side so it's safe to paste suspicious samples into (nothing is uploaded): **[PowerShell Encoded Command Decoder](https://base64.dev/powershell-encoded-command-decoder)**.

## Analyst checklist vs. the layers

| What you see after decoding | What it means | Next step |
|---|---|---|
| Space between every char | You decoded as UTF-8 | Re-decode as **UTF-16LE** |
| Clean, readable PowerShell | Done | Read it, extract IOCs |
| Binary garbage, starts `H4sI` | Inner **gzip** payload | Base64-decode again, then gunzip |
| Another `-enc` / `FromBase64String` | Nested loader | Repeat the whole process on the inner blob |

## TL;DR

- `powershell -enc <base64>` is Base64 of **UTF-16LE**, not UTF-8 — that's why naive decoding shows a space/null between every character.
- Decode it right with `[System.Text.Encoding]::Unicode.GetString([Convert]::FromBase64String($enc))`, or in Python with `base64.b64decode(enc).decode("utf-16-le")`.
- If the result is still binary and starts with `H4sI`, it's **gzip inside Base64** — inflate it to reach the real script.
- **Decoding never executes** the command, so it's safe to analyze suspicious samples locally.

---

*Seen a `-enc` payload with an interesting nesting trick? Share the pattern in the comments.*
