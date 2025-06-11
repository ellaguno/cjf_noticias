/**
 * Database Backup and Restore Script
 * 
 * This script provides functionality to backup and restore the SQLite database.
 * 
 * Usage:
 *   - To create a backup: node scripts/db-backup-restore.js backup
 *   - To restore from a backup: node scripts/db-backup-restore.js restore <backup-file>
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Get database path from environment or use default
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../storage/database.sqlite');
const BACKUP_DIR = path.join(__dirname, '../storage/backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Create a backup of the database
 */
function createBackup() {
  // Check if database exists
  if (!fs.existsSync(DB_PATH)) {
    console.error(`Database file not found at ${DB_PATH}`);
    process.exit(1);
  }

  // Create backup filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `database_backup_${timestamp}.sqlite`);

  try {
    // Copy the database file
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`Backup created successfully: ${backupPath}`);
    
    // Clean up old backups (keep only the 10 most recent)
    cleanupOldBackups();
    
    return backupPath;
  } catch (error) {
    console.error('Error creating backup:', error.message);
    process.exit(1);
  }
}

/**
 * Restore database from a backup
 * @param {string} backupFile - Path to the backup file
 */
function restoreFromBackup(backupFile) {
  // Resolve backup path if only filename was provided
  let backupPath = backupFile;
  if (!path.isAbsolute(backupFile)) {
    backupPath = path.join(BACKUP_DIR, backupFile);
  }

  // Check if backup file exists
  if (!fs.existsSync(backupPath)) {
    console.error(`Backup file not found: ${backupPath}`);
    process.exit(1);
  }

  try {
    // Create a backup of the current database before restoring
    console.log('Creating backup of current database before restore...');
    const currentBackup = createBackup();
    
    // Copy the backup file to the database location
    fs.copyFileSync(backupPath, DB_PATH);
    console.log(`Database restored successfully from ${backupPath}`);
    console.log(`Previous database backed up to ${currentBackup}`);
  } catch (error) {
    console.error('Error restoring database:', error.message);
    process.exit(1);
  }
}

/**
 * Clean up old backups, keeping only the 10 most recent
 */
function cleanupOldBackups() {
  try {
    // Get all backup files
    const backupFiles = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('database_backup_') && file.endsWith('.sqlite'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Sort by time, newest first
    
    // Keep only the 10 most recent backups
    if (backupFiles.length > 10) {
      console.log(`Cleaning up old backups, keeping the 10 most recent...`);
      backupFiles.slice(10).forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`Deleted old backup: ${file.name}`);
      });
    }
  } catch (error) {
    console.error('Error cleaning up old backups:', error.message);
  }
}

/**
 * List all available backups
 */
function listBackups() {
  try {
    // Get all backup files
    const backupFiles = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('database_backup_') && file.endsWith('.sqlite'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime(),
        size: fs.statSync(path.join(BACKUP_DIR, file)).size
      }))
      .sort((a, b) => b.time - a.time); // Sort by time, newest first
    
    if (backupFiles.length === 0) {
      console.log('No backups found.');
      return;
    }
    
    console.log('Available backups:');
    backupFiles.forEach((file, index) => {
      const date = new Date(file.time).toLocaleString();
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      console.log(`${index + 1}. ${file.name} (${date}, ${sizeMB} MB)`);
    });
  } catch (error) {
    console.error('Error listing backups:', error.message);
  }
}

// Main execution
const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case 'backup':
    createBackup();
    break;
  case 'restore':
    if (!arg) {
      console.error('Please specify a backup file to restore from.');
      console.log('Usage: node scripts/db-backup-restore.js restore <backup-file>');
      process.exit(1);
    }
    restoreFromBackup(arg);
    break;
  case 'list':
    listBackups();
    break;
  default:
    console.log('CJF Noticias Database Backup and Restore Tool');
    console.log('Usage:');
    console.log('  node scripts/db-backup-restore.js backup - Create a new backup');
    console.log('  node scripts/db-backup-restore.js restore <backup-file> - Restore from a backup');
    console.log('  node scripts/db-backup-restore.js list - List available backups');
    break;
}