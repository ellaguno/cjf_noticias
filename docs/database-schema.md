# CJF Noticias Database Schema

This document describes the database schema for the CJF Noticias application. The application uses SQLite as its database management system.

## Tables

### ARTICLE

Stores news articles extracted from the PDF reports.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key, auto-incremented |
| title | TEXT | Article title |
| content | TEXT | Full article content |
| summary | TEXT | Short summary of the article |
| source | TEXT | Source of the article (e.g., newspaper name) |
| section_id | TEXT | Foreign key to SECTION.id |
| publication_date | TEXT | Date of publication (YYYY-MM-DD format) |
| featured | BOOLEAN | Whether the article is featured (default: 0) |
| created_at | TIMESTAMP | When the record was created |
| updated_at | TIMESTAMP | When the record was last updated |

Indexes:
- `idx_article_section_id`: Index on section_id for faster section-based queries
- `idx_article_publication_date`: Index on publication_date for faster date-based queries
- `idx_article_featured`: Index on featured for faster featured article queries

### IMAGE

Stores images extracted from the PDF reports.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key, auto-incremented |
| filename | TEXT | Image filename |
| title | TEXT | Image title |
| description | TEXT | Image description |
| article_id | INTEGER | Foreign key to ARTICLE.id (nullable) |
| section_id | TEXT | Foreign key to SECTION.id |
| publication_date | TEXT | Date of publication (YYYY-MM-DD format) |
| created_at | TIMESTAMP | When the record was created |
| updated_at | TIMESTAMP | When the record was last updated |

Indexes:
- `idx_image_article_id`: Index on article_id for faster article-based queries
- `idx_image_section_id`: Index on section_id for faster section-based queries
- `idx_image_publication_date`: Index on publication_date for faster date-based queries

### SECTION

Stores information about the news sections.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key, section identifier (e.g., "ocho-columnas") |
| name | TEXT | Display name of the section |
| description | TEXT | Description of the section |
| display_order | INTEGER | Order in which to display the section |
| created_at | TIMESTAMP | When the record was created |
| updated_at | TIMESTAMP | When the record was last updated |

### USER

Stores user information for authentication and authorization.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key, auto-incremented |
| username | TEXT | Unique username |
| password | TEXT | Hashed password |
| name | TEXT | User's full name |
| role | TEXT | User role (admin, editor) |
| email | TEXT | User's email address |
| last_login | TIMESTAMP | When the user last logged in |
| created_at | TIMESTAMP | When the record was created |
| updated_at | TIMESTAMP | When the record was last updated |

Indexes:
- `idx_user_username`: Unique index on username for faster login queries

### AUDIT_LOG

Stores audit logs for tracking user actions.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key, auto-incremented |
| user_id | INTEGER | Foreign key to USER.id |
| action | TEXT | Action performed (e.g., "login", "create", "update", "delete") |
| entity | TEXT | Entity affected (e.g., "article", "user") |
| entity_id | INTEGER | ID of the affected entity |
| details | TEXT | JSON string with additional details |
| ip_address | TEXT | IP address of the user |
| created_at | TIMESTAMP | When the action was performed |

Indexes:
- `idx_audit_log_user_id`: Index on user_id for faster user-based queries
- `idx_audit_log_action`: Index on action for faster action-based queries
- `idx_audit_log_created_at`: Index on created_at for faster date-based queries

### SETTINGS

Stores application settings.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key, auto-incremented |
| key | TEXT | Setting key (unique) |
| value | TEXT | Setting value |
| description | TEXT | Description of the setting |
| created_at | TIMESTAMP | When the record was created |
| updated_at | TIMESTAMP | When the record was last updated |

Indexes:
- `idx_settings_key`: Unique index on key for faster setting lookups

### EXTRACTION_LOG

Stores logs of PDF extraction processes.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key, auto-incremented |
| date | TEXT | Date of extraction (YYYY-MM-DD format) |
| status | TEXT | Status of extraction (success, error) |
| message | TEXT | Log message |
| details | TEXT | JSON string with additional details |
| created_at | TIMESTAMP | When the log was created |

Indexes:
- `idx_extraction_log_date`: Index on date for faster date-based queries
- `idx_extraction_log_status`: Index on status for faster status-based queries

### FEATURED_ARTICLE

Stores featured articles for the home page.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key, auto-incremented |
| article_id | INTEGER | Foreign key to ARTICLE.id |
| position | INTEGER | Position on the home page |
| created_at | TIMESTAMP | When the record was created |

Indexes:
- `idx_featured_article_position`: Index on position for faster position-based queries

### MIGRATION

Stores database migration information.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key, auto-incremented |
| name | TEXT | Migration name (unique) |
| applied_at | TIMESTAMP | When the migration was applied |

## Relationships

- **ARTICLE.section_id** → **SECTION.id**: Each article belongs to a section
- **IMAGE.article_id** → **ARTICLE.id**: An image may be associated with an article (optional)
- **IMAGE.section_id** → **SECTION.id**: Each image belongs to a section
- **AUDIT_LOG.user_id** → **USER.id**: Each audit log entry is associated with a user
- **FEATURED_ARTICLE.article_id** → **ARTICLE.id**: Each featured article entry references an article

## Triggers

### ARTICLE Triggers

- **article_updated_at**: Updates the `updated_at` field when an article is modified
- **article_created_at**: Sets the `created_at` field when an article is created

### USER Triggers

- **user_updated_at**: Updates the `updated_at` field when a user is modified
- **user_created_at**: Sets the `created_at` field when a user is created

### SETTINGS Triggers

- **settings_updated_at**: Updates the `updated_at` field when a setting is modified
- **settings_created_at**: Sets the `created_at` field when a setting is created

## Indexes

The database uses several indexes to improve query performance:

- Indexes on foreign keys for faster joins
- Indexes on frequently queried columns like `publication_date`
- Unique indexes on columns that require uniqueness constraints

## Constraints

- Foreign key constraints ensure referential integrity
- Unique constraints on columns like `username` in the USER table
- NOT NULL constraints on required fields

## Database Initialization

The database is initialized using the `scripts/init-db.js` script, which creates all the necessary tables, indexes, and constraints. It also populates the database with initial data like sections and default settings.

## Migrations

Database schema changes are managed through migrations. Each migration is a JavaScript file in the `migrations` directory that contains `up` and `down` functions for applying and reverting the migration.

Migrations are tracked in the MIGRATION table to ensure they are only applied once.

## Backup and Restore

The database can be backed up and restored using the `scripts/db-backup-restore.js` script. Backups are stored in the `storage/backups` directory.