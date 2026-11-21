# Security policy

## Reporting a vulnerability

Please report security problems privately through GitHub private vulnerability reporting on the repository `steve-mathai/tripsplit`: open its Security tab and choose "Report a vulnerability". Do not open a public issue. Include the steps to reproduce and the URL pattern involved (never a real trip link). Expect an acknowledgement within a few days.

## Supported versions

Only the `main` branch is supported.

## Threat model

- There are no accounts: the trip link is the permission, so anyone holding `/t/<slug>` can read and change that trip. The slug is 16 random characters (about 79 bits) and must stay secret.
- Abuse limits (per-IP rate limits, per-trip caps, input sanitising) protect the shared database from anonymous flooding, not one trip from its own link holders.
- The demo trip `/t/kochi-2026` is public by design and holds only made-up data.

© 2026 Steve Mathai Mathew. All rights reserved.
