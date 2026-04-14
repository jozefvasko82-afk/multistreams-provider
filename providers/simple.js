// Simple MultiStreams Provider for Nuvio
(function() {
  'use strict';
  
  const provider = {
    name: 'MultiStreams',
    version: '1.0.0',
    
    async search(query) {
      return {
        results: [],
        errors: []
      };
    },
    
    async getStreamUrl(id) {
      return null;
    }
  };
  
  if (typeof window !== 'undefined') {
    window.nuvioMultiStreamsProvider = provider;
  }
  
})();
