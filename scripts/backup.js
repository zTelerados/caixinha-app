#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const API_URL = `${SUPABASE_URL}/rest/v1`;

async function fetchTable(tableName) {
  try {
    const response = await fetch(`${API_URL}/${tableName}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${tableName}: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${tableName}:`, error.message);
    return [];
  }
}

async function createBackup() {
  try {
    console.log('Starting backup...');

    // Fetch all tables
    const [users, categories, transactions, transaction_log] = await Promise.all([
      fetchTable('users'),
      fetchTable('categories'),
      fetchTable('transactions'),
      fetchTable('transaction_log'),
    ]);

    const backup = {
      timestamp: new Date().toISOString(),
      tables: {
        users,
        categories,
        transactions,
        transaction_log,
      },
    };

    // Create backups directory if it doesn't exist
    const backupsDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    // Generate filename with timestamp
    const now = new Date();
    const dateStr = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');
    const timeStr = String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');
    const filename = `backup-${dateStr}-${timeStr}.json`;
    const filepath = path.join(backupsDir, filename);

    // Write backup file
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));

    // Print summary
    console.log(`Backup completo: ${users.length} users, ${categories.length} categories, ${transactions.length} transactions`);
    console.log(`Backup saved to: ${filepath}`);
  } catch (error) {
    console.error('Backup failed:', error);
    process.exit(1);
  }
}

createBackup();
