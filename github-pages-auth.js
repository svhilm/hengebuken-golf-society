// GitHub Pages - Proper Username + Password Authentication
console.log('🔧 Loading proper authentication system...');

// Valid username/password combinations from memory storage
window.validCredentials = {
  'Svein Hilmersen': 'admin123',
  'svein hilmersen': 'admin123', 
  'Svein': 'admin123',
  'svein': 'admin123',
  'Bjørn Mørck': 'admin123',
  'bjorn morck': 'admin123',
  'bjørn mørck': 'admin123',
  'Bjørn': 'admin123', 
  'bjorn': 'admin123',
  'bjørn': 'admin123',
  'hengebuken2025': 'hengebuken2025',  // Special case - same as username
  'admin': 'admin123',
  'administrator': 'admin123'
};

// Mock members data
window.mockMembers = [
  { id: '1', name: 'Svein Hilmersen', handicap: '8.0', role: 'ADMIN', email: 'svein.hilmersen@gmail.com', phone: '+47 900 14 414', initials: 'SH', address: 'Haugtbo Terrasse 60', postNumber: '1405', city: 'Langhus' },
  { id: '2', name: 'Bjørn Mørck', handicap: '12.5', role: 'HENGEBUK', email: 'bjorn.morck@online.no', phone: '+47 976 72 407', initials: 'BM', address: 'Solhøiveien 5', postNumber: '1553', city: 'Son' },
  { id: '3', name: 'Kjell Huseby', handicap: '15.2', role: 'ANDRE', email: 'kjell.huseby@gmail.com', phone: '+47 900 78 824', initials: 'KH', address: 'Rankebyåsen 6', postNumber: '1606', city: 'Fredrikstad' },
  { id: '4', name: 'Odd Aagesen', handicap: '18.1', role: 'HENGEBUK', email: 'odd.aag@online.no', phone: '+47 900 98 359', initials: 'OA', address: 'Nedre Torggate 12', postNumber: '3015', city: 'Drammen' },
  { id: '5', name: 'Lars Hansen', handicap: '14.3', role: 'HENGEBUK', email: 'lars.hansen@hotmail.com', phone: '+47 922 33 445', initials: 'LH', address: 'Storgata 45', postNumber: '0184', city: 'Oslo' }
];

// Override fetch for authentication API
const originalFetch = window.fetch;
window.fetch = function(url, options) {
  if (typeof url === 'string' && url.includes('/api/auth/login')) {
    console.log('🔐 GitHub Pages: Processing login request');
    
    return new Promise((resolve) => {
      try {
        const body = JSON.parse(options.body);
        const { name, password } = body;
        
        const normalizedName = name.toLowerCase().trim();
        const normalizedPassword = password.trim();
        
        // Check if credentials are valid
        let isValid = false;
        let userRole = 'HENGEBUK';
        let actualName = name;
        
        for (const [validName, validPassword] of Object.entries(window.validCredentials)) {
          if (validName.toLowerCase() === normalizedName && validPassword === normalizedPassword) {
            isValid = true;
            actualName = validName;
            userRole = validName.toLowerCase().includes('svein') || 
                     validName.toLowerCase().includes('admin') ? 'ADMIN' : 'HENGEBUK';
            break;
          }
        }
        
        if (isValid) {
          const userData = {
            id: 'github-pages-user-' + Date.now(),
            name: actualName,
            role: userRole,
            username: actualName
          };
          
          console.log('✅ GitHub Pages login successful:', actualName);
          
          resolve({
            ok: true,
            json: () => Promise.resolve(userData)
          });
        } else {
          console.log('❌ GitHub Pages login failed for:', name);
          
          resolve({
            ok: false,
            json: () => Promise.resolve({ 
              message: 'Ugyldig brukernavn eller passord' 
            })
          });
        }
      } catch (error) {
        console.log('❌ GitHub Pages login error:', error);
        resolve({
          ok: false,
          json: () => Promise.resolve({ 
            message: 'Innlogging feilet' 
          })
        });
      }
    });
  }
  
  // Handle other API calls
  if (typeof url === 'string' && url.includes('/api/')) {
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

console.log('✅ GitHub Pages authentication system with username+password ready');