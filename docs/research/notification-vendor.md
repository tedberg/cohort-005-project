# Which notification vendor fits Cadence?

Research for [#4](https://github.com/tedberg/cohort-005-project/issues/4), part of the map [#3](https://github.com/tedberg/cohort-005-project/issues/3). Sources were read on 2026-11-17. Pricing pages change often, so check them again before committing to a plan.

## Recommendation

**Knock**, with **Novu** as runner-up.

Knock meets every hard requirement on the free plan:

- 10,000 messages a month.
- Unlimited isolated environments.
- Headless React hooks, so the Inbox can be built in shadcn instead of restyling a vendor widget.
- A websocket feed for the live badge.
- An RS256-signed user token for Inbox auth.
- A full server-side message API (read, seen, archive, batch archive, list a user's feed) in an Apache-2.0 Node SDK.
- A preference model whose `categories` and `workflows` keys map straight onto Notification types.

It is not self-hostable. That was only a bonus.

Novu comes second. It is the only candidate with a real self-hosted path (an MIT core plus a commercial `/enterprise` folder), it supports archive and snooze, and its HMAC Inbox auth is simple. But the free cloud plan caps you at **5 workflows**, which is likely fewer than the Notification catalogue, keeps only 24 hours of activity feed, and gives just 2 environments.

Courier is a reasonable third choice. MagicBell (1,000 deliveries and 1 project on its free plan) and SuprSend (User Preferences only on the $250/mo Business plan) both fall short on the free tier.

## Comparison

| | Knock | Novu | Courier | MagicBell | SuprSend |
|---|---|---|---|---|---|
| Free tier | 10k messages/mo, unlimited environments [^k-price] | 10k workflow runs/mo, **5 workflows**, 2 environments (Dev+Prod), 24h activity retention [^n-price] | 10k sends/mo [^c-price] | 1k deliveries/mo, 1 project [^m-price] | 10k notifications/mo, multiple environments, branded Inbox [^s-price] |
| Next tier | Starter $250/mo (50k, then $0.005 each) | Pro from $30/mo (30k+) | $0.005/send pay-as-you-go | Startup $249/mo (50k) | Essentials $100/mo (50k) |
| React UI | `@knocklabs/react`: prebuilt `NotificationFeedPopover` and `NotificationIconButton`, plus headless hooks `useNotifications` and `useNotificationStore` [^k-react][^k-hooks] | `@novu/react` `<Inbox/>` (React 18+), sub-components can be replaced, headless hooks, `@novu/js` [^n-inbox] | `@trycourier/courier-react`: `<CourierInbox/>`, popup, toast, preferences, `useCourier()` hook [^c-react] | `@magicbell/react`: prebuilt `Inbox` and `FloatingInbox`, no hooks documented [^m-react] | `@suprsend/react` drop-in, plus headless `@suprsend/react-core` [^s-react][^s-search] |
| Styling | CSS variables `--rnf-*` and classes `rnf-*`, `colorMode` dark [^k-react] | Appearance overrides and component replacement [^n-inbox] | Theme objects [^c-react] | CSS variables `--magicbell-*` [^m-react] | not checked |
| Live updates | Websocket via `feed.listenForUpdates()` [^k-feed][^k-socket] | Websocket, with `unread_count_changed` and `unseen_count_changed` events [^n-js] | `inbox.listenForUpdates()` [^c-react] | not documented on the React page | socket.io [^s-search] |
| Browser auth | Public key plus a **RS256 JWT** (`sub` = user id), signed server-side with `signUserToken`. Off by default ("enhanced security mode"), must be on in production [^k-auth] | `subscriberHash` = HMAC-SHA256(secretKey, subscriberId), turned on per environment [^n-prod] | Backend mints a scoped JWT via `POST /auth/issue-token`. Never expires unless `expires_in` is set [^c-auth] | User JWT [^m-docs] | Signed JWT user token (replaced HMAC) [^s-react] |
| Node SDK | `@knocklabs/node` (Apache-2.0): `workflows.trigger`, `messages.archive`, `messages.batch.archive`, `users.feeds.listItems` [^k-node] | `@novu/api`: `trigger({ workflowId, to, payload })` [^n-node] | Yes | `magicbell-js` | Yes |
| Preferences | PreferenceSet with `workflows`, `categories`, `channel_types`, `channels`; environment and tenant defaults [^k-prefs] | Per-workflow and global channel preferences, "critical" workflows can't be muted, built into `<Inbox/>` [^n-prefs] | Topic subscriptions with `<CourierPreferences/>` [^c-react] | Per-category `UserPreferences` component [^m-react] | **Business plan only** [^s-price] |
| Archive / resolve | Client `markAsArchived` and `markAllAsArchived`. Server `messages.archive` and `batch.archive` [^k-feed][^k-node] | `archive`, `unarchive`, `archiveAll`, `snooze` [^n-js] | `archived` timestamp on messages [^c-react] | not documented | `markAsArchived` [^s-search] |
| Dev / test | Unlimited environments, each with its own `pk_`/`sk_` keys. Changes are committed in development and promoted to production [^k-env] | Dev and Prod environments | Test environment sends count the same as Production [^c-price] | 1 project on free | Multiple environments |
| Self-host | No | MIT core plus a proprietary `/enterprise` folder [^n-lic]. Community edition needs MongoDB, Redis and S3 [^n-self] | No | No | Enterprise only |
| Email later | Yes, same workflow | Yes | Yes | Yes | Yes |

## Facts later tickets depend on

### Inbox auth (#7, "Recipient identity")

Knock uses a JWT signed with RS256 and the environment's private signing key (`KNOCK_SIGNING_KEY`). The `sub` claim is the Knock user id, `exp` is recommended, and `signUserToken` defaults to 3600 s [^k-auth]. A React Router loader would sign the token for the current Cadence person and pass it to `KnockProvider`/`KnockFeedProvider` as `userToken`.

Enhanced security mode is **off by default**. While it is off, anyone with the public key and the feed id can read any user's feed [^k-react]. Turn it on in every environment, including development, so the fake and the real thing behave the same.

### Recipient identity

Knock keys everything on a user id string we choose. That id is the natural link from a Cadence person to a Knock recipient. Roles are not a Knock concept. A role change only matters for which workflows Cadence triggers, unless we choose to model roles as Knock tenants or objects. Nothing found forces one recipient per role.

### React component vs headless (#6)

The prebuilt Knock feed is styled with its own CSS (`rnf-` classes, `--rnf-` variables) [^k-react], not Tailwind. To match shadcn, build the Inbox on the `useNotifications` and `useNotificationStore` hooks [^k-hooks]. `metadata.unseen_count` drives the badge, and it only goes down if the UI calls `markAsSeen` or `markAllAsSeen` [^k-hooks]. Knock tracks seen, read, interacted and archived as separate states.

### Realtime

Knock's websocket is opened by `listenForUpdates()` on the feed client and pushes new messages [^k-feed][^k-socket]. This only works if the browser talks to Knock directly. See the surprise below.

### Preferences

Knock evaluates a recipient's PreferenceSet: every combination of category, workflow and channel has to be true for a message to send. Unset keys default to true [^k-prefs]. One Knock workflow per Notification type, optionally grouped by `category`, gives per-type opt-outs for free. Preferences are set through the API (`users.setPreferences`) or Knock's hosted preference page. Knock has no prebuilt React preferences component equivalent to Novu's, so a `/settings` page would be ours to build.

### Stale action Notifications

The server can archive a message (`messages.archive`) or a batch (`messages.batch.archive`) [^k-node]. When someone resolves an Open Refund Request, Cadence can archive the matching Notification for every other Platform Admin, as long as it keeps or looks up the Knock message ids. `workflows.cancel` also exists, for workflows that have not run yet.

### Test and dev story

No vendor ships an in-memory fake, so Cadence has to own the boundary. Knock's environments cover staging and production but do not help `npm run test` or credential-less local dev.

## Surprises that may change other tickets

1. **Credential-free local dev conflicts with a browser-direct Inbox (#6, #7).** Knock, Novu, Courier and SuprSend all have the browser fetch the Inbox straight from the vendor with a public key and a signed token. If local dev must run without vendor credentials, the Inbox UI cannot depend on `KnockProvider`. Two options:
   - **(a) Server-proxied Inbox.** Loaders call `users.feeds.listItems` and actions call `messages.markAsRead` and `archive` through Cadence's boundary [^k-node]. The fake drops in on the server, and DevUI user switching just works. The cost is the websocket: use polling or revalidation for the badge, which the map's Notes say is acceptable.
   - **(b) Two boundaries.** A server-side boundary for triggers, plus a client-side Inbox data hook with a Knock implementation and a fake implementation.

   Option (a) is the only one that keeps "one boundary". #7 should decide this explicitly.
2. **Novu's free plan caps workflows at 5 (#5).** If Novu stays a fallback, the catalogue size matters. More than 5 Notification types would need Pro or a shared workflow keyed by type, which would weaken per-type preferences.
3. **SuprSend's preferences are paywalled.** They are not on Free or Essentials, only Business ($250/mo) [^s-price].
4. **Knock's free plan shows Knock branding in its prebuilt components** [^k-price]. A headless or server-proxied UI avoids this.
5. **Courier JWTs never expire unless `expires_in` is set** [^c-auth]. This is only relevant if we fall back to Courier.

## Sources

[^k-price]: Knock pricing, https://knock.app/pricing
[^k-auth]: Knock, Security and authentication, https://docs.knock.app/in-app-ui/security-and-authentication
[^k-react]: Knock, React feed component, https://docs.knock.app/in-app-ui/react/feed (and overview https://docs.knock.app/in-app-ui/react/overview)
[^k-hooks]: Knock, Custom notifications UI with hooks, https://docs.knock.app/in-app-ui/react/custom-notifications-ui
[^k-feed]: Knock, JavaScript feed client reference, https://docs.knock.app/in-app-ui/javascript/sdk/feed-client
[^k-socket]: Knock, Socket behavior, https://docs.knock.app/in-app-ui/feeds/socket-behavior
[^k-prefs]: Knock, Preferences overview, https://docs.knock.app/preferences/overview
[^k-env]: Knock, Environments, https://docs.knock.app/concepts/environments ; API keys, https://docs.knock.app/developer-tools/api-keys
[^k-node]: knocklabs/knock-node (Apache-2.0), README and api.md, https://github.com/knocklabs/knock-node/blob/main/api.md
[^n-price]: Novu pricing, https://novu.co/pricing
[^n-inbox]: Novu, Inbox overview, https://docs.novu.co/platform/inbox/overview
[^n-prod]: Novu, Prepare Inbox for production, https://docs.novu.co/platform/inbox/prepare-for-production
[^n-js]: Novu, JavaScript SDK, https://docs.novu.co/platform/sdks/javascript
[^n-node]: Novu, TypeScript server SDK, https://docs.novu.co/platform/sdks/server/typescript
[^n-prefs]: Novu, Preferences, https://docs.novu.co/platform/concepts/preferences
[^n-self]: Novu, Self-hosting overview, https://docs.novu.co/community/self-hosting-novu/overview
[^n-lic]: novuhq/novu `LICENSE-ENTERPRISE` and README "License" section, https://github.com/novuhq/novu/tree/next
[^c-price]: Courier pricing, https://www.courier.com/pricing
[^c-auth]: Courier, Inbox authentication, https://www.courier.com/docs/platform/inbox/authentication
[^c-react]: Courier, React SDK, https://www.courier.com/docs/sdk-libraries/courier-react-web
[^m-price]: MagicBell pricing, https://www.magicbell.com/pricing
[^m-docs]: MagicBell docs index, https://www.magicbell.com/docs
[^m-react]: MagicBell React library, https://www.magicbell.com/docs/libraries/magicbell-react
[^s-price]: SuprSend pricing, https://www.suprsend.com/pricing
[^s-react]: SuprSend, React Inbox, https://docs.suprsend.com/docs/inbox-react
[^s-search]: SuprSend headless feed docs: https://docs.suprsend.com/docs/react-sdk-headless-feed.md and https://docs.suprsend.com/docs/js-inapp-feed.md (seen through search excerpts, not read in full)
