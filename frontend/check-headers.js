// Simple script to test security headers on localhost
const testSecurityHeaders = async () => {
    try {
        const response = await fetch('http://localhost:5174/');
        const headers = response.headers;
        
        console.log('=== SECURITY HEADERS CHECK ===');
        
        // Check for CSP header
        const csp = headers.get('content-security-policy');
        if (csp) {
            console.log('✅ Content-Security-Policy found');
            console.log('CSP:', csp);
            
            // Parse CSP directives
            const directives = csp.split(';').map(dir => dir.trim());
            directives.forEach(dir => {
                if (dir.startsWith('script-src')) {
                    console.log('  📜 Script sources:', dir);
                } else if (dir.startsWith('connect-src')) {
                    console.log('  🔗 Connect sources:', dir);
                } else if (dir.startsWith('style-src')) {
                    console.log('  🎨 Style sources:', dir);
                } else if (dir.startsWith('font-src')) {
                    console.log('  🔤 Font sources:', dir);
                }
            });
        } else {
            console.log('❌ Content-Security-Policy NOT found');
        }
        
        // Check other security headers
        const xFrameOptions = headers.get('x-frame-options');
        console.log(xFrameOptions ? `✅ X-Frame-Options: ${xFrameOptions}` : '❌ X-Frame-Options NOT found');
        
        const referrerPolicy = headers.get('referrer-policy');
        console.log(referrerPolicy ? `✅ Referrer-Policy: ${referrerPolicy}` : '❌ Referrer-Policy NOT found');
        
        const xContentTypeOptions = headers.get('x-content-type-options');
        console.log(xContentTypeOptions ? `✅ X-Content-Type-Options: ${xContentTypeOptions}` : '❌ X-Content-Type-Options NOT found');
        
        const hsts = headers.get('strict-transport-security');
        console.log(hsts ? `✅ HSTS: ${hsts}` : '❌ HSTS NOT found');
        
        console.log('\n=== CSP VIOLATION MONITORING ===');
        console.log('Open browser console and look for CSP violation reports');
        
    } catch (error) {
        console.error('Error checking headers:', error);
    }
};

// Run the test
testSecurityHeaders();
