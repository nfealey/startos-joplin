# Joplin Server for StartOS

A [StartOS](https://start9.com) package for [Joplin Server](https://github.com/laurent22/joplin/tree/dev/packages/server) — the self-hosted synchronization backend for the Joplin note-taking app. Bundles a PostgreSQL sidecar, so nothing external is required.

## ⚠️ License & redistribution — read first

Joplin Server is **not** open source. It is distributed under the proprietary [**Joplin Server Personal Use License**](https://github.com/laurent22/joplin/blob/dev/packages/server/LICENSE.md), which permits **personal, non-commercial use only** and restricts redistribution and derivative works.

Because of that:
- **This repository contains only the StartOS packaging code** (MIT licensed — see [LICENSE](./LICENSE)). It includes **no Joplin source code** and ships **no prebuilt binaries**.
- **No `.s9pk` is distributed here.** Building an `.s9pk` bundles the Joplin Server image, which would be redistribution. Build it yourself, for your own personal use (see below).
- The Joplin name and logo are trademarks of Joplin SAS and are **not** used here; this package ships a neutral icon.


## Build it yourself

```bash
git clone https://github.com/nfealey/startos-joplin
cd startos-joplin
npm ci
make
```

`make` produces `joplin-server_x86_64.s9pk` and `joplin-server_aarch64.s9pk`, which you can sideload into your own StartOS server for personal use.

## Usage

See [instructions.md](./instructions.md). In short:

1. Start the service, then run **Show Admin Login** to get your auto-generated admin password and log in to the web UI as `admin@localhost`.
2. Point your Joplin clients at the "Joplin Server" URL from StartOS (Settings → Synchronisation → Joplin Server).

Access is through a mapped clearnet **domain** if you configure one, otherwise the LAN **`.local`** address — only one works at a time (see [instructions.md](./instructions.md)).

## How it's built

- **Two containers**: `joplin/server` + a bundled `postgres:16-alpine` sidecar (localhost-only), ordered via daemon `requires`.
- **Health**: PostgreSQL readiness via `pg_isready`; Joplin readiness via `GET /api/ping`.
- **Backups**: logical `pg_dump` of the database plus the metadata volume.
- **Architectures**: x86_64 and aarch64.

## Status

Working / personal-use, tested on real hardware: installs, connects to its bundled Postgres, serves the web UI, and syncs Joplin clients. `APP_BASE_URL` is derived from the StartOS interface URL at runtime, and the admin password is auto-generated at install (shown in **Show Admin Login**).

Notes:
- **One access address at a time (Joplin limitation).** Joplin accepts a single `APP_BASE_URL` and rejects any other host with "Invalid origin" — there is no multi-host or disable option. The package prefers a mapped clearnet **domain**, falling back to the LAN **`.local`** address. If you set a domain, use the domain everywhere; the `.local` address will stop working (and vice-versa). See [instructions.md](./instructions.md).
- A **domain** gives a valid Let's Encrypt cert (clients work with no TLS workaround) but exposes the service to the internet. The **`.local`** address stays on your LAN but its self-signed cert means sync clients need "Ignore TLS certificate errors" — Joplin validates TLS with Node's cert store, not the OS trust store, so this is needed even with the StartOS Root CA installed.
