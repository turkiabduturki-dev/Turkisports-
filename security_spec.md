# Security Specification for Turkisports

## 1. Data Invariants
- A match must have a valid `homeTeamId` and `awayTeamId`.
- Only admins can create/update teams, competitions, and matches.
- Users can read all public sports data.
- If we had user comments/profiles, they would be owner-restricted, but for now, the primary data is read-only for general users.

## 2. The Dirty Dozen Payloads (Rejection Targets)
1. **Empty Team**: `{}` (Should fail: missing required 'name').
2. **Infinite Goals**: `{ homeScore: 999999 }` (Should fail: out of reasonable bounds).
3. **Spoofed Owner**: `{ ownerId: 'not-me' }` (If applicable later).
4. **Invalid Match Status**: `{ status: 'WINNING' }` (Should fail: not in enum).
5. **Team without name**: `{ logoUrl: '...' }`.
6. **Match with same home and away team**.
7. **Negative Score**: `{ homeScore: -1 }`.
8. **Wrong Type**: `{ age: "twenty" }`.
9. **XSS in Name**: `{ name: "<script>alert(1)</script>" }`.
10. **Shadow Field**: `{ name: "Team A", isAdminOverride: true }`.
11. **Update Immutable Field**: Changing `createdAt`.
12. **Anonymous Write**: Attempting to write without auth.

## 3. Test Runner (Draft)
A `firestore.rules.test.ts` would be used to automate these checks.
