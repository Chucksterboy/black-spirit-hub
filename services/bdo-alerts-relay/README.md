# Black Spirit Hub BDO Alerts Relay

This is the small Cloudflare Worker used by the Microsoft Store edition of
Black Spirit Hub for Player & Guild Search. It keeps the upstream API key in a
Cloudflare secret instead of in the Windows package.

It is deliberately not a general-purpose proxy. It accepts only these `GET`
routes:

- `/api/player/search/{eu|na|kr|sa|asia}?query={name}`
- `/api/guild/search/{eu|na|kr|sa|asia}?query={name}`
- `/api/player/{eu|na|kr|sa|asia}/{name}`
- `/api/guild/{eu|na|kr|sa|asia}/{name}`
- Player profiles may include a validated `profile_target`; only those may add
  `force_refresh=true`.
- `/status/update` returns the public Microsoft Store release announcement.

The Worker validates every route and query string, builds the upstream URL
itself, forwards no client headers, returns JSON only, and never returns
upstream error bodies. Normal searches are cached for five minutes and profile
lookups for one hour. A forced player refresh is never cached. Native Worker
rate-limit bindings cap normal lookups at 12 per minute and forced refreshes at
two per minute per Cloudflare client identity.

## Files and secrets

The relay expects a Cloudflare secret named `BDO_ALERTS_API_KEY`; its value is
not recorded in this repository. Copy `.dev.vars.example` to `.dev.vars` only
for local development, then set the value in that untracked file. Do not paste
a key into source, package metadata, documentation, or an issue.

The final `*.workers.dev` address is created by Cloudflare when the Worker is
deployed. It must be recorded in the desktop application's release
configuration only after deployment; it does not belong in this scaffold.

## Windows development

From PowerShell:

```powershell
Set-Location 'E:\Black Spirit Hub\services\bdo-alerts-relay'
npm install
Copy-Item .dev.vars.example .dev.vars
# Edit .dev.vars locally and replace the placeholder. Do not commit that file.
npm run verify
npm run dev
```

`npm run verify` is fully local: it makes no request to the upstream service
and uses a test-only value. With `npm run dev` running, an allowed route can be
tested at `http://localhost:8787` using an ordinary HTTP client.

## First deployment

After local verification, authenticate the account that should own this relay,
set the deployed secret interactively, and deploy:

```powershell
Set-Location 'E:\Black Spirit Hub\services\bdo-alerts-relay'
npx wrangler login
npx wrangler secret put BDO_ALERTS_API_KEY
npm run deploy
```

The secret command prompts for its value and should not be scripted into a
shell history or redirected output. `wrangler deploy` validates that the
required secret exists before it publishes the Worker. Record the resulting
`workers.dev` address for the matching Store build, then test a real search
before submitting that Store update.

## Maintenance

Run `npm run verify` before every deployment. Do not widen the allowlist or
turn this into a pass-through proxy. If route behavior changes, add a focused
unit test first and keep the desktop service's validation aligned with this
Worker.

### Store update announcement

`GET /status/update` is independent from BDO Alerts: it reads no credential,
does not call the upstream service, and is not cached. Its optional
`BSHUB_UPDATE_MANIFEST` KV binding contains only the `live` key. The key must
be a small JSON document shaped like:

```json
{
  "schemaVersion": 1,
  "channel": "microsoft-store",
  "availability": "live",
  "version": "0.9.69.0"
}
```

Set that key only after Partner Center confirms the matching MSIX is published
and available. Until then, omit the key or leave it invalid; clients receive a
safe `pending` response and do not offer an update action. The Worker never
returns any extra KV fields.
