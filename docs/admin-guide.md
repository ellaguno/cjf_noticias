# CJF Noticias Administrator Guide

This guide provides instructions for administrators of the CJF Judicial News Portal. It covers all administrative tasks and features available in the admin section of the application.

## Table of Contents

1. [Accessing the Admin Panel](#accessing-the-admin-panel)
2. [Dashboard Overview](#dashboard-overview)
3. [Managing Articles](#managing-articles)
4. [Managing PDF Extraction](#managing-pdf-extraction)
5. [Managing Sections](#managing-sections)
6. [Managing Users](#managing-users)
7. [System Settings](#system-settings)
8. [Logs and Monitoring](#logs-and-monitoring)
9. [Maintenance Mode](#maintenance-mode)
10. [Backup and Restore](#backup-and-restore)

## Accessing the Admin Panel

1. Navigate to the admin login page at `/admin/login`
2. Enter your administrator username and password
3. Click "Log In" to access the admin panel

If you've forgotten your password, contact the system administrator to reset it.

## Dashboard Overview

The admin dashboard provides an overview of the system status and recent activity:

- **Latest Extraction**: Status and time of the most recent PDF extraction
- **Article Count**: Total number of articles in the system
- **User Activity**: Recent user logins and actions
- **System Health**: Current system status and resource usage
- **Quick Links**: Shortcuts to common administrative tasks

## Managing Articles

### Viewing Articles

1. Click on "Articles" in the sidebar menu
2. Use the filters to narrow down the list:
   - Filter by section
   - Filter by date
   - Search by title or content
3. Click on an article title to view its details

### Editing Articles

1. Navigate to the article you want to edit
2. Click the "Edit" button
3. Modify the article fields:
   - Title
   - Content
   - Summary
   - Source
   - Section
   - Publication date
4. Click "Save Changes" to update the article

### Creating Articles Manually

1. Click on "Articles" in the sidebar menu
2. Click the "Add New Article" button
3. Fill in the article details:
   - Title
   - Content
   - Summary (optional, will be generated automatically if left blank)
   - Source
   - Section (select from dropdown)
   - Publication date
4. Click "Create Article" to save the new article

### Deleting Articles

1. Navigate to the article you want to delete
2. Click the "Delete" button
3. Confirm the deletion in the confirmation dialog

### Featuring Articles

To feature an article on the home page:

1. Navigate to the article you want to feature
2. Toggle the "Featured" switch to ON
3. Set the position number (lower numbers appear first)
4. Click "Save Changes"

## Managing PDF Extraction

### Viewing Extraction Status

1. Click on "Extraction" in the sidebar menu
2. The extraction dashboard shows:
   - Last successful extraction
   - Next scheduled extraction
   - Extraction history
   - Any extraction errors

### Triggering Manual Extraction

1. Click on "Extraction" in the sidebar menu
2. Click the "Trigger Extraction" button
3. Confirm the action in the dialog
4. The system will:
   - Download the PDF from the configured URL
   - Extract content from the PDF
   - Process and store the content in the database
   - Update the extraction status

### Configuring Extraction Settings

1. Click on "Settings" in the sidebar menu
2. Navigate to the "Extraction" tab
3. Configure the following settings:
   - **PDF URL**: The URL where the daily PDF is published
   - **Extraction Time**: The time of day when automatic extraction should run
   - **Retry Attempts**: Number of retry attempts if extraction fails
   - **Notification Email**: Email to notify of extraction status

### Viewing Extraction Logs

1. Click on "Extraction" in the sidebar menu
2. Click the "View Logs" button
3. The logs show:
   - Timestamp of each extraction attempt
   - Success or failure status
   - Error messages if applicable
   - Details of the extraction process

## Managing Sections

### Viewing Sections

1. Click on "Sections" in the sidebar menu
2. The sections list shows:
   - Section ID
   - Section name
   - Description
   - Article count
   - Display order

### Editing Sections

1. Click on the section you want to edit
2. Modify the section details:
   - Name
   - Description
   - Display order
3. Click "Save Changes" to update the section

### Creating New Sections

1. Click on "Sections" in the sidebar menu
2. Click the "Add New Section" button
3. Fill in the section details:
   - ID (used in URLs, should be lowercase with hyphens)
   - Name (display name)
   - Description
   - Display order
4. Click "Create Section" to save the new section

### Deleting Sections

**Note**: Deleting a section will also delete all articles in that section.

1. Click on the section you want to delete
2. Click the "Delete" button
3. Confirm the deletion in the confirmation dialog

## Managing Users

### Viewing Users

1. Click on "Users" in the sidebar menu
2. The users list shows:
   - Username
   - Name
   - Role
   - Email
   - Last login

### Creating Users

1. Click on "Users" in the sidebar menu
2. Click the "Add New User" button
3. Fill in the user details:
   - Username
   - Password
   - Name
   - Email
   - Role (Admin or Editor)
4. Click "Create User" to save the new user

### Editing Users

1. Click on the user you want to edit
2. Modify the user details:
   - Name
   - Email
   - Role
3. Click "Save Changes" to update the user

### Resetting Passwords

1. Click on the user whose password you want to reset
2. Click the "Reset Password" button
3. Enter a new password
4. Click "Save" to update the password

### Deleting Users

1. Click on the user you want to delete
2. Click the "Delete" button
3. Confirm the deletion in the confirmation dialog

## System Settings

### General Settings

1. Click on "Settings" in the sidebar menu
2. Navigate to the "General" tab
3. Configure the following settings:
   - **Site Title**: The title of the website
   - **Site Description**: A brief description of the website
   - **Items Per Page**: Number of items to display per page
   - **Contact Email**: Email address for contact purposes

### Appearance Settings

1. Click on "Settings" in the sidebar menu
2. Navigate to the "Appearance" tab
3. Configure the following settings:
   - **Primary Color**: The main color theme
   - **Logo**: Upload a custom logo
   - **Favicon**: Upload a custom favicon

### Email Settings

1. Click on "Settings" in the sidebar menu
2. Navigate to the "Email" tab
3. Configure the following settings:
   - **SMTP Server**: Server for sending emails
   - **SMTP Port**: Port for the SMTP server
   - **SMTP Username**: Username for authentication
   - **SMTP Password**: Password for authentication
   - **From Email**: Email address to send from
   - **From Name**: Name to display as sender

## Logs and Monitoring

### Viewing System Logs

1. Click on "Logs" in the sidebar menu
2. Use the filters to narrow down the list:
   - Filter by log level (info, warning, error)
   - Filter by date range
   - Filter by user
3. Click on a log entry to view its details

### Viewing Audit Logs

1. Click on "Logs" in the sidebar menu
2. Click the "Audit Logs" tab
3. The audit logs show:
   - User actions (login, create, update, delete)
   - Timestamp of each action
   - IP address
   - Affected entity (article, user, etc.)

### System Monitoring

1. Click on "Monitoring" in the sidebar menu
2. The monitoring dashboard shows:
   - Server status
   - Database status
   - Memory usage
   - CPU usage
   - Disk space
   - Active users

## Maintenance Mode

### Enabling Maintenance Mode

When maintenance mode is enabled, regular users will see a maintenance page instead of the normal website. Administrators can still access the admin panel.

1. Click on "Settings" in the sidebar menu
2. Navigate to the "Maintenance" tab
3. Toggle the "Maintenance Mode" switch to ON
4. Optionally, enter a custom maintenance message
5. Click "Save Changes" to enable maintenance mode

### Disabling Maintenance Mode

1. Click on "Settings" in the sidebar menu
2. Navigate to the "Maintenance" tab
3. Toggle the "Maintenance Mode" switch to OFF
4. Click "Save Changes" to disable maintenance mode

## Backup and Restore

### Creating a Backup

1. Click on "Settings" in the sidebar menu
2. Navigate to the "Backup" tab
3. Click the "Create Backup" button
4. The system will create a backup of the database
5. Once complete, you can download the backup file

### Restoring from a Backup

**Warning**: Restoring from a backup will overwrite the current database.

1. Click on "Settings" in the sidebar menu
2. Navigate to the "Backup" tab
3. Click the "Restore Backup" button
4. Select a backup file to restore from
5. Click "Restore" to begin the restoration process
6. The system will restore the database from the backup

### Scheduling Automatic Backups

1. Click on "Settings" in the sidebar menu
2. Navigate to the "Backup" tab
3. Configure the following settings:
   - **Auto Backup**: Enable or disable automatic backups
   - **Backup Frequency**: How often to create backups (daily, weekly, monthly)
   - **Backup Time**: Time of day to create backups
   - **Retention Period**: How long to keep backups (in days)
4. Click "Save Changes" to update the backup settings

## Best Practices

### Security

- Change your password regularly
- Use strong, unique passwords
- Log out when you're done using the admin panel
- Don't share your admin credentials

### Content Management

- Review extracted content for accuracy
- Correct any extraction errors manually
- Feature important articles on the home page
- Archive old content regularly

### System Maintenance

- Monitor extraction logs for errors
- Check system logs regularly
- Create regular backups
- Test restoring from backups periodically
- Update system settings as needed

## Troubleshooting

### Common Issues

1. **PDF Extraction Fails**
   - Check if the PDF URL is correct
   - Verify the PDF structure hasn't changed
   - Check extraction logs for specific errors

2. **User Can't Log In**
   - Verify the username and password
   - Check if the user account is active
   - Reset the password if necessary

3. **System Performance Issues**
   - Check server resources (CPU, memory, disk space)
   - Consider optimizing database queries
   - Implement caching if needed

### Getting Help

If you encounter issues that you can't resolve:

1. Check the troubleshooting guide
2. Contact the system administrator
3. Provide detailed information about the issue:
   - What you were doing when the issue occurred
   - Any error messages you saw
   - Steps to reproduce the issue