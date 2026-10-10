# SmartCampus backup and recovery

Database backups and uploaded files are separate recovery concerns. A database dump does not include files under `backend/uploads`.

## Production requirements

- Enable automated encrypted backups and point-in-time recovery with the MySQL provider. Retain daily backups for at least 30 days and keep a separate copy outside the database provider account.
- The application stores uploads on its local filesystem. In production, mount a durable persistent disk and set `UPLOADS_DIR` to its mount path. Render's free web service filesystem is ephemeral, and uploaded files may disappear after a restart or deploy. For multi-instance deployments, configure a shared durable object-storage adapter before scaling beyond one instance.
- Restrict backup and object-storage access to the deployment team. Backups contain personal information, submissions, and grade history; do not put them in the repository or an unencrypted shared drive.
- Configure `PASSWORD_RESET_DELIVERY_URL`, `PASSWORD_RESET_DELIVERY_SECRET` (at least 32 characters), and `PASSWORD_RESET_PAGE_URL` in Render. The delivery endpoint must authenticate `X-Reset-Delivery-Secret` and send the provided HTTPS link only to the supplied account email. The app does not send email itself.

## Database backup

Run from a trusted workstation with the MySQL client installed. Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` from the production secret manager. Store the output only in an encrypted backup location:

```powershell
$env:MYSQL_PWD = $env:DB_PASSWORD
mysqldump --host=$env:DB_HOST --port=$env:DB_PORT --user=$env:DB_USER --single-transaction --routines --triggers --events $env:DB_NAME > "smartcampus-$((Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss')).sql"
Remove-Item Env:MYSQL_PWD
```

Prefer the provider's managed backups for scheduled production backups; this command is a manual export/recovery aid, not a scheduler.

## Recovery exercise

At least quarterly, and after a database-provider change:

1. Restore the newest backup to an isolated staging database, never directly over production.
2. Set staging environment variables to that database and run the backend migrations/startup.
3. Sign in with a test account and verify courses, enrollments, assignments, submissions, grades, calendar events, and audit entries.
4. Restore representative uploaded files from the separate object-storage backup and verify authenticated downloads for an enrolled student and the owning lecturer, plus denial for an unrelated account.
5. Record the backup timestamp, restore duration, checks performed, and any recovery defects in the team's operational log.

Do not declare recovery ready until both database records and their associated private files have been restored and verified.
