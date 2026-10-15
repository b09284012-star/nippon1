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
- Regular inventory feeds use regular_market_listings to exclude company sellers centrally; company inventory uses its own directory and dedicated offer presentation so seller type changes apply to existing offers too.
