# Security

Folio is a static GitHub Pages app. The browser always sees the Supabase anon key. That key is not a secret. Row Level Security and login are the lock.

## What is protected

- Anonymous visitors cannot read or write `transactions`.
- Signed-in users see only their household (max two people).
- New rows get `household_id` from the server, not from the client.

## If something leaked

1. Treat the value as burned. Rotate it in the provider dashboard.
2. Revoke sessions if a user password leaked.
3. Do not rewrite Git history unless you also rotated every exposed secret.
4. Re-run advisors in the Supabase dashboard.

## Report

Open a private note to the repo owner. Do not file a public issue with tokens, dump files, or live invite codes.
