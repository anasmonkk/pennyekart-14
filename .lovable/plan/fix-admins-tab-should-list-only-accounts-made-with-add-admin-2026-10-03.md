# Fix: Admins tab should list only accounts made with "Add Admin"

## Why it shows 149
Checking the data: 146 of the 149 are customers or staff (pro, group leader, coordinator, and so on) who log in with their mobile number. Each one gets an automatic email such as `9846293075@pennyekart.in` or `...@pennyekart.local`, so the current check ("has a role and an email") counts them as admins. The other 2 are super admins. Only 1 account (jamsheena, real Gmail address, role "back office") was made with Add Admin.

## Change
- The Admins tab and its count will include an account only when:
  - it has a role, and
  - its email is a real address (not ending in `@pennyekart.in` or `@pennyekart.local`), and
  - it is not a super admin.
- Result today: 1 admin (jamsheena). New admins made with Add Admin show up right away.
- Mobile-login staff still appear in their usual Customers lists. Their roles stay as they are.

## Technical details
- `src/components/admin/AdminsPanel.tsx`: add an `isAddedAdmin(u)` helper (`!u.is_super_admin && !!u.role_id && !!u.email && !/@pennyekart\.(in|local)$/i.test(u.email)`) and use it in the filter.
- `src/pages/admin/UsersPage.tsx` line ~358: use the same helper for the tab count badge (export it from AdminsPanel).
- No database or backend changes.
