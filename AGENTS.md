<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Financial visualizations use the shared AnalyticsCharts module and semantic chart tokens so sales and profit views retain consistent axes, tooltips, and status colors.
- Notifications use one user-scoped shared query for the header badge and full-page inbox so read state and incoming alerts stay synchronized.
- Other-user identity reads use the authenticated pseudonym-only public_profile_names RPC; full profiles and private information remain owner/admin-scoped to prevent direct disclosure.
- Company branding and deliberately public business contacts live in company_profiles and are read through company_directory; never reuse private profile/contact fields for business display.
- Regular inventory feeds use regular_market_listing_cards to exclude company sellers centrally; company inventory uses company_market_listings and its own directory so seller type changes apply to existing offers too.
- Public inventory RPCs expose only offer-card fields and deliberately public company branding; listing detail URLs live under the authenticated layout to require sign-in without changing existing links.
- Auth return destinations are validated listing paths, preserving the selected offer while rejecting external redirects.
- Site localization uses a shared language store and explicit translation dictionary; keep stored country/status values and user-entered content unchanged while translating presentation.
- The retired company URL redirects to the marketplace; company records and separated inventory remain intact, but no company management controls are shown.
- Manager privileges remain in user_roles; delegated duties use staff_assignments with manager-only assignment RPCs so forum/dispute staff never inherit private user or financial access.
- Country boundaries for forums, conversations, messages and attachments are enforced by database policies using registration country, not browser filters; dispute staff access is limited to dispute conversations.
- Dispute supervisor assignments carry a manager-selected country; a shared database authorization helper scopes dispute reads, resolution and chat access by the seller's registration country, with manager access preserved globally.
- About content is bilingual structured editorial data, rendered as separate substantive paragraphs rather than artificial blank lines.

- Deposit lifecycle records are owner-readable and service-written; signed provider completion credits atomically and deduplicates by payment reference to prevent duplicate balances.
- Deposit analytics use the injected event tracker without personal identifiers; completion is observed from persisted provider-confirmed records, not payment-address creation.
- Deposit fee changes apply to unsettled and future deposits; preserve settled financial records and receipts rather than rewriting historical balances.
- Presence subscriptions require a resolved signed-in session; public home/market inventory queries use the shared traffic policy with country-separated cache keys and preserve explicit invalidation.
- Operational performance samples are anonymous, bounded, minute-deduplicated and retained for 24 hours; manager-only summaries distinguish observed browser sockets from provider totals to avoid overstating coverage.
- App emails use the scaffolded server-only template helper and Lovable managed delivery, never local queues or generic send endpoints; self-authenticating /lovable/* routes bypass app request guards. Entities aliases match only root/legacy imports exactly, preserving modern dependency subpath resolution to prevent missing-file errors during SSR bundling.
