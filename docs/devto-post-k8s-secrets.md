---
title: "Kubernetes Secrets Are Just Base64 — Not Encryption. Here's What That Actually Means"
published: false
description: A Kubernetes Secret's data is Base64-encoded, not encrypted. Anyone who can read the object can read the value. Here's why, how to verify it, and how to actually protect secrets.
tags: kubernetes, security, devops, base64
canonical_url:
---

> **Paste-into-Dev.to note (delete this blockquote before publishing):** Dev.to renders the front-matter above as the post's title/tags. Set `published: true` when you're ready, or leave `false` to save a draft first. Everything below is the post.

If you've run Kubernetes for more than a day, you've seen this:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
data:
  username: YWRtaW4=
  password: c3VwZXJzZWNyZXQ=
```

And somewhere in the back of your mind you filed it under "encrypted credentials." It isn't. **Those values are Base64, and Base64 is encoding, not encryption.** `YWRtaW4=` is just `admin` written in a different alphabet — reversible instantly, by anyone, with no key.

This trips up an astonishing number of teams, so let's clear it up for good.

## Prove it in one command

```bash
kubectl get secret db-credentials -o jsonpath='{.data.password}' | base64 --decode
# supersecret
```

No key. No password. No "decryption." Base64 is a **binary-to-text encoding** — its entire job is to represent arbitrary bytes using a safe 64-character alphabet so they survive transport and storage in text-based systems (etcd, YAML, JSON, HTTP headers). Kubernetes encodes Secret `data` values purely so binary values (certs, keys, gzip blobs) can live inside a YAML/JSON object. That's it. Security was never the point.

If you want to eyeball a whole Secret at once instead of decoding fields one by one, I built a small in-browser tool for exactly this — paste the YAML and it decodes every `data:` value locally (nothing is uploaded): **[Kubernetes Secret Decoder](https://base64.dev/kubernetes-secret-decoder)**. *(Disclosure: it's my free, no-ads tool.)*

## `data` vs `stringData`

A quick related gotcha: `data` expects **Base64**, but `stringData` expects **plain text** and Kubernetes Base64-encodes it for you on write:

```yaml
stringData:
  password: supersecret   # plain text; k8s encodes it into data.password
```

Both end up identically un-secret at rest.

## So what actually protects a Secret?

Base64 gets you nothing here. Real protection is layered:

1. **Encryption at rest for etcd** — configure a `KMS` provider (AWS/GCP/Azure KMS) or at minimum `aescbc`/`secretbox` via an `EncryptionConfiguration`. Without this, Secrets sit in etcd Base64-only.
2. **Sealed Secrets** (Bitnami) — encrypt secrets *before* they hit Git; only the in-cluster controller can decrypt. Safe to commit.
3. **SOPS** (+ age/KMS) — encrypt values in your manifests/GitOps repo.
4. **External secret stores** — HashiCorp Vault, AWS Secrets Manager, etc., pulled in via the External Secrets Operator.
5. **RBAC** — lock down who can `get`/`list` Secrets. If a ServiceAccount can read the Secret, it can read the plaintext.

## Encoding vs encryption vs hashing (the mental model)

| | Encoding (Base64) | Encryption (AES-GCM) | Hashing (SHA-256) |
|---|---|---|---|
| Purpose | Safe transport of bytes | Confidentiality | Integrity / fingerprint |
| Needs a key? | No | Yes | No |
| Reversible? | Yes, trivially | Yes, with the key | No (one-way) |
| Hides data? | **No** | Yes | N/A |

Base64 is in the left column. Kubernetes Secrets, out of the box, are in the left column. If you want to go deeper on that distinction, I wrote it up here: **[Is Base64 Encryption?](https://base64.dev/articles/is-base64-encryption)**

## TL;DR

- A Kubernetes Secret's `data` is **Base64, not encrypted** — decode it with one `base64 -d`.
- Treat any Secret YAML as **plaintext credentials**: don't commit it, lock down RBAC.
- For actual protection: **encryption at rest (KMS)**, **Sealed Secrets**, **SOPS**, or an **external secret store**.

The next time someone says "it's fine, it's in a Secret," you'll know to ask the real question: *is etcd encrypted, and who has RBAC to read it?*

---

*What's bitten you with Kubernetes Secrets? Drop it in the comments.*
