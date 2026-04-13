# Backup Strategy

This document outlines how data backups are handled for the Caixinha application.

## Manual Backup

To create a manual backup of all data:

```bash
npm run backup
```

This command exports all data from Supabase and saves it to `backups/backup-YYYY-MM-DD-HHmmss.json`.

## What Gets Exported

The backup includes all data from these tables:

- **users**: User account information
- **categories**: Transaction category definitions
- **transactions**: All financial transactions
- **transaction_log**: Historical record of transaction changes

## How to Restore

### Option 1: Manual Restoration via Supabase Dashboard

1. Go to the Supabase project dashboard
2. Open the SQL Editor
3. For each table, prepare INSERT statements from the backup file
4. Execute the INSERT statements to restore the data

### Option 2: Using psql (if you have PostgreSQL tools)

```bash
# Connect to your Supabase database
psql postgresql://user:password@host:port/database

# Run INSERT statements from the backup JSON file
```

## When to Backup

It's recommended to create a backup:

- Before making major changes to the database schema
- Before running migrations
- Before making bulk data modifications
- On a regular schedule (daily, weekly, or as per your needs)

## Built-in Backups

Supabase provides built-in daily backups for Pro plan accounts. These are separate from this manual backup strategy and serve as an additional layer of protection. For more information, consult your Supabase project settings.

## Backup File Format

Backup files are stored in JSON format with the following structure:

```json
{
  "timestamp": "2025-04-12T15:30:45.123Z",
  "tables": {
    "users": [...],
    "categories": [...],
    "transactions": [...],
    "transaction_log": [...]
  }
}
```
