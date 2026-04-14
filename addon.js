// MultiStreams Stremio Addon - Full Webshare.cz Integration
const addonBuilder = require('stremio-addon-sdk');

const addon = new addonBuilder({
  id: 'multistreams',
  version: '1.0.0',
  name: 'MultiStreams',
  description: 'Stream movies and series from Webshare.cz, FastShare and Hellspy',
  logo: 'https://raw.githubusercontent.com/jozefvasko82-afk/multistreams-provider/master/icon.png'
});

// Webshare.cz API helper
class WebshareAPI {
  constructor() {
    this.baseURL = 'https://webshare.cz/api/';
    this.token = null;
  }

  async login(username, password) {
    try {
      const response = await fetch(`${this.baseURL}login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `username_or_email=${username}&password=${password}&keep_logged_in=1`
      });
      
      const data = await response.json();
      if (data.token) {
        this.token = data.token;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Webshare login error:', error);
      return false;
    }
  }

  async search(query) {
    if (!this.token) return { files: [] };
    
    try {
      const response = await fetch(`${this.baseURL}search/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${this.token}`
        },
        body: `what=${encodeURIComponent(query)}`
      });
      
      return await response.json();
    } catch (error) {
      console.error('Webshare search error:', error);
      return { files: [] };
    }
  }

  async getStreamLink(fileId) {
    if (!this.token) return null;
    
    try {
      const response = await fetch(`${this.baseURL}file_link/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${this.token}`
        },
        body: `ident=${fileId}`
      });
      
      const data = await response.json();
      return data.url || data.link;
    } catch (error) {
      console.error('Webshare stream link error:', error);
      return null;
    }
  }
}

const webshareAPI = new WebshareAPI();

// Stream handler - finds streams for movies/series
addon.defineStreamHandler(async (args) => {
  const { type, id } = args;
  
  // Login with stored credentials first
  const loggedIn = await loginWithStoredCredentials();
  if (!loggedIn) {
    return { 
      streams: [{
        title: 'MultiStreams - Please configure credentials',
        url: null,
        description: 'Go to Add-on settings to enter your Webshare.cz credentials'
      }]
    };
  }
  
  // Extract title from ID or use default
  const title = extractTitleFromId(id) || 'Unknown';
  
  // Search on Webshare.cz
  const searchResults = await webshareAPI.search(title);
  
  if (!searchResults.files || searchResults.files.length === 0) {
    return { streams: [] };
  }

  // Convert to Stremio streams
  const streams = [];
  for (const file of searchResults.files.slice(0, 10)) {
    const streamUrl = await webshareAPI.getStreamLink(file.ident);
    streams.push({
      title: file.name || `MultiStreams - ${file.ident}`,
      url: streamUrl,
      description: `Size: ${formatFileSize(file.size)}`,
      behaviorHints: {
        notReady: false
      }
    });
  }

  return { streams };
});

// Meta handler - provides metadata
addon.defineMetaHandler(async (args) => {
  const { type, id } = args;
  
  // For now, return basic metadata
  // In future, we can integrate TMDB for better metadata
  return {
    meta: {
      id: id,
      type: type,
      name: extractTitleFromId(id) || 'Unknown Title',
      poster: `https://image.tmdb.org/t/p/w500${id}`,
      background: `https://image.tmdb.org/t/p/original${id}`,
      description: 'MultiStreams - Webshare.cz streaming'
    }
  };
});

// Catalog handler - lists available content
addon.defineCatalogHandler(async (args) => {
  const { type, id } = args;
  
  // For now, return empty catalog
  // In future, we can implement trending/popular content
  return {
    metas: []
  };
});

// Helper functions
function extractTitleFromId(id) {
  // Extract title from TMDB ID or other formats
  if (id.startsWith('tt')) {
    // This is a TMDB ID - we'd need TMDB API to get title
    return `TMDB ${id}`;
  }
  return id;
}

function formatFileSize(bytes) {
  if (!bytes) return 'Unknown';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// Simple authentication - replace with your credentials
// IMPORTANT: Change these values to your Webshare.cz credentials
const credentials = {
  webshare_username: 'YOUR_USERNAME_HERE',    // <-- CHANGE THIS
  webshare_password: 'YOUR_PASSWORD_HERE',    // <-- CHANGE THIS
  webshare_wst_token: ''                     // <-- CHANGE THIS (optional)
};

// Modified login function to use credentials
async function loginWithStoredCredentials() {
  // Check if credentials are still default values
  if (credentials.webshare_username === 'YOUR_USERNAME_HERE') {
    return false; // Not configured yet
  }
  
  if (credentials.webshare_wst_token) {
    // Use WST token if available
    webshareAPI.token = credentials.webshare_wst_token;
    return true;
  } else if (credentials.webshare_username && credentials.webshare_password) {
    // Use username/password
    return await webshareAPI.login(credentials.webshare_username, credentials.webshare_password);
  }
  
  return false;
}

module.exports = addon.getInterface();
