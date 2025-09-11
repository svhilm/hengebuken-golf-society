// GitHub Pages Authentication Fallback
console.log('🔧 Loading GitHub Pages auth fallback...');

// Mock API responses for GitHub Pages
window.mockMembers = [
  { id: '1', name: 'Svein Hilmersen', handicap: '8.0', role: 'ADMIN', email: 'svein.hilmersen@gmail.com', phone: '+47 900 14 414', initials: 'SH' },
  { id: '2', name: 'Bjørn Mørck', handicap: '12.5', role: 'HENGEBUK', email: 'bjorn.morck@online.no', phone: '+47 976 72 407', initials: 'BM' },
  { id: '3', name: 'Kjell Huseby', handicap: '15.2', role: 'ANDRE', email: 'kjell.huseby@gmail.com', phone: '+47 900 78 824', initials: 'KH' },
  { id: '4', name: 'Odd Aagesen', handicap: '18.1', role: 'HENGEBUK', email: 'odd.aag@online.no', phone: '+47 900 98 359', initials: 'OA' },
  { id: '5', name: 'Lars Hansen', handicap: '14.3', role: 'HENGEBUK', email: 'lars.hansen@hotmail.com', phone: '+47 922 33 445', initials: 'LH' }
];

// Simple authentication check
window.authenticateUser = function(username) {
  const normalizedInput = username.toLowerCase().trim();
  
  // Valid login names
  const validLogins = [
    'svein hilmersen', 'svein', 
    'hengebuken2025', 'admin', 'administrator',
    'bjørn mørck', 'bjorn morck', 'bjørn', 'bjorn'
  ];
  
  const isValid = validLogins.some(valid => 
    normalizedInput === valid || 
    normalizedInput.includes(valid.split(' ')[0]) ||
    valid.includes(normalizedInput)
  );
  
  if (isValid) {
    const user = {
      id: 'github-pages-user',
      name: username,
      role: normalizedInput.includes('svein') || normalizedInput.includes('admin') ? 'ADMIN' : 'HENGEBUK'
    };
    
    // Store in the same format as the React app expects
    localStorage.setItem('hengebuken-auth', JSON.stringify({
      state: { user, isAuthenticated: true, isAdmin: user.role === 'ADMIN', isHengebuk: user.role === 'HENGEBUK' },
      version: 7
    }));
    
    console.log('✅ GitHub Pages login successful:', username);
    return user;
  }
  
  console.log('❌ GitHub Pages login failed for:', username);
  return null;
};

// Override fetch for API calls to use localStorage data
const originalFetch = window.fetch;
window.fetch = function(url, options) {
  if (typeof url === 'string' && url.includes('/api/')) {
    console.log('🔧 GitHub Pages: Intercepting API call:', url);
    
    // Mock API responses
    if (url.includes('/api/members')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(window.mockMembers)
      });
    }
    
    if (url.includes('/api/users')) {
      return Promise.resolve({
        ok: true,  
        json: () => Promise.resolve([])
      });
    }
    
    if (url.includes('/api/spain-presence')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    }
    
    if (url.includes('/api/tee-times')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    }
    
    if (url.includes('/api/absences')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    }
  }
  
  // For non-API calls, use original fetch
  return originalFetch.apply(this, arguments);
};

console.log('✅ GitHub Pages authentication system ready');