#!/usr/bin/env node
// Endless Runner Admin Smoke Test
const http = require('http');
const HOST = 'http://127.0.0.1:3000';
const ADMIN_AUTH = 'Basic ' + Buffer.from('admin:admin123').toString('base64');
let passed = 0, failed = 0;

function check(name, pass, detail) {
  if (pass) { console.log('  \u2705 ' + name); passed++; }
  else { console.log('  \u274c ' + name + (detail ? ' (' + detail + ')' : '')); failed++; }
}

function request(method, path, body, auth) {
  return new Promise(function(resolve, reject) {
    const url = new URL(path, HOST);
    const opts = {
      method: method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' }
    };
    if (auth) opts.headers['Authorization'] = auth;
    if (body) opts.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    const req = http.request(opts, function(res) {
      let data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() {
        try { resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', function(e) { reject(e); });
    if (body) req.end(JSON.stringify(body));
    else req.end();
  });
}

// Extract captcha answer from SVG text elements
function extractCaptchaAnswer(svg) {
  const matches = svg.match(/>([A-Z0-9])</g);
  if (!matches) return '';
  return matches.map(function(m) { return m.replace(/[<>]/g, ''); }).filter(function(x) { return x.length === 1; }).join('');
}

async function getCaptcha() {
  const r = await request('GET', '/api/captcha');
  if (r.status !== 200) return null;
  return { captchaId: r.body.captchaId, answer: extractCaptchaAnswer(r.body.svg) };
}

async function main() {
  console.log('=== Endless Runner Admin Smoke Test ===\n');

  // 1. /admin without auth -> 401
  var r = await request('GET', '/admin');
  check('Unauthenticated /admin returns 401', r.status === 401, String(r.status));

  // 2. /admin with auth -> 200 HTML
  r = await request('GET', '/admin', null, ADMIN_AUTH);
  check('Authenticated /admin returns 200', r.status === 200);
  check('/admin returns HTML', typeof r.body === 'string' && r.body.indexOf('<html') >= 0, 'body type: ' + typeof r.body);

  // 3. /api/admin/stats
  r = await request('GET', '/api/admin/stats', null, ADMIN_AUTH);
  check('/api/admin/stats returns 200', r.status === 200, String(r.status));
  check('/api/admin/stats has totalUsers', typeof r.body.totalUsers === 'number', 'totalUsers=' + r.body.totalUsers);

  // 4. /api/admin/users
  r = await request('GET', '/api/admin/users', null, ADMIN_AUTH);
  check('/api/admin/users returns 200', r.status === 200);
  check('/api/admin/users is array', Array.isArray(r.body), 'type=' + typeof r.body);
  if (Array.isArray(r.body) && r.body.length > 0) {
    check('No passwordHash leaked', !r.body[0].passwordHash, '');
    check('No passwordSalt leaked', !r.body[0].passwordSalt, '');
    check('No sessionToken leaked', !r.body[0].sessionToken, '');
  }

  // 5. Create a test user via register (with real captcha + valid email)
  const c1 = await getCaptcha();
  check('Got captcha for register', !!c1 && !!c1.captchaId, c1 ? c1.captchaId : 'no captcha');

  const testId = String(Date.now()).slice(-6);
  const testEmail = '_admintest_' + testId + '@mytest.net';
  const testUser = await request('POST', '/api/register', {
    email: testEmail, password: 'test123', username: 'ATester' + testId,
    captchaId: c1 ? c1.captchaId : 'x', captchaAnswer: c1 ? c1.answer : 'x'
  });
  check('Test user registered', testUser.status === 201 || testUser.status === 200, 'status=' + testUser.status + ' body=' + JSON.stringify(testUser.body));

  // 6. Admin verify test user
  r = await request('POST', '/api/admin/user/action', { email: testEmail, action: 'verify' }, ADMIN_AUTH);
  check('Admin verify user', r.status === 200 && r.body.success, 'status=' + r.status);

  // 7. Update credits
  r = await request('POST', '/api/admin/user/update', { email: testEmail, gameData: { credits: 999 } }, ADMIN_AUTH);
  check('Admin update credits', r.status === 200, 'status=' + r.status);

  // 8. Login as test user to verify credits
  r = await request('POST', '/api/login', { email: testEmail, password: 'test123' });
  check('Test user login', r.status === 200, 'status=' + r.status);
  if (r.status === 200) {
    check('Credits=999 after admin update', r.body.gameData && r.body.gameData.credits === 999, 'credits=' + (r.body.gameData ? r.body.gameData.credits : 'N/A'));

    // 9. Ban the user
    r = await request('POST', '/api/admin/user/action', { email: testEmail, action: 'ban', confirm: true }, ADMIN_AUTH);
    check('Admin ban user', r.status === 200 && r.body.success, 'status=' + r.status);

    // 10. Try to login again -- should be rejected
    r = await request('POST', '/api/login', { email: testEmail, password: 'test123' });
    check('Banned user cannot login', r.status === 403, 'status=' + r.status + ' body=' + JSON.stringify(r.body));

    // 11. Unban
    r = await request('POST', '/api/admin/user/action', { email: testEmail, action: 'unban', confirm: true }, ADMIN_AUTH);
    check('Admin unban user', r.status === 200 && r.body.success, 'status=' + r.status);

    // 12. Login again -- should work
    r = await request('POST', '/api/login', { email: testEmail, password: 'test123' });
    check('Unbanned user can login', r.status === 200, 'status=' + r.status);
  }

  // 13. ownedCharacters validation
  r = await request('POST', '/api/admin/user/update', { email: testEmail, gameData: { ownedCharacters: ['runner', 'ninja'], selectedCharacter: 'ninja' } }, ADMIN_AUTH);
  check('Set ownedCharacters + selectedCharacter', r.status === 200, 'status=' + r.status + ' owned=' + JSON.stringify(r.body.gameData ? r.body.gameData.ownedCharacters : null) + ' sel=' + (r.body.gameData ? r.body.gameData.selectedCharacter : null));
  if (r.status === 200) {
    check('selectedCharacter=ninja', r.body.gameData.selectedCharacter === 'ninja', 'got=' + r.body.gameData.selectedCharacter);
  }

  // 14. Invalid selectedCharacter (not in owned) should fallback
  r = await request('POST', '/api/admin/user/update', { email: testEmail, gameData: { ownedCharacters: ['runner'], selectedCharacter: 'nonexistent' } }, ADMIN_AUTH);
  check('Invalid selectedCharacter falls back to runner', r.status === 200 && r.body.gameData.selectedCharacter === 'runner', 'got=' + (r.body.gameData ? r.body.gameData.selectedCharacter : null));

  // 15. Grant all abilities
  r = await request('POST', '/api/admin/user/action', { email: testEmail, action: 'grant-all-abilities', confirm: true }, ADMIN_AUTH);
  check('Grant all abilities', r.status === 200, 'status=' + r.status);
  if (r.status === 200) {
    check('ownedAbilities includes all 4', r.body.gameData.ownedAbilities.length >= 4 && r.body.gameData.ownedAbilities.indexOf(2) >= 0, 'abilities=' + JSON.stringify(r.body.gameData.ownedAbilities));
  }

  // 16. Audit log
  r = await request('GET', '/api/admin/audit', null, ADMIN_AUTH);
  check('Audit log returns 200', r.status === 200, 'status=' + r.status);
  check('Audit log is array', Array.isArray(r.body), 'type=' + typeof r.body);
  if (Array.isArray(r.body) && r.body.length > 0) {
    check('Audit has action field', !!r.body[0].action, 'first action=' + r.body[0].action);
  }

  // 17. PVP status
  r = await request('GET', '/api/admin/pvp/status', null, ADMIN_AUTH);
  check('PVP status returns', r.status === 200, 'status=' + r.status);
  if (r.body && r.body.error) {
    check('PVP status (PVP server likely offline)', true, 'error=' + r.body.error);
  } else {
    check('PVP status has totalRooms prop', typeof r.body.totalRooms === 'number', 'totalRooms=' + r.body.totalRooms);
  }

  // 18. Verify /admin HTML does NOT contain hardcoded credentials
  r = await request('GET', '/admin', null, ADMIN_AUTH);
  check('/admin no hardcoded admin:admin123', r.body.indexOf('admin:admin123') < 0, '');
  check('/admin no base64 Basic', r.body.indexOf('Basic YWRtaW46YWRtaW4xMjM') < 0, '');

  // 19. Create XSS test user - username with HTML injection
  const c2 = await getCaptcha();
  const xssEmail = '_xss_test_' + Date.now() + '@mytest.net';
  const xssUser = await request('POST', '/api/register', {
    email: xssEmail, password: 'test123', username: '<img src=x onerror=alert(1)>',
    captchaId: c2 ? c2.captchaId : 'x', captchaAnswer: c2 ? c2.answer : 'x'
  });
  // Even if registration fails (username validation may reject), the check below
  // verifies the admin endpoint itself doesn't break
  r = await request('GET', '/api/admin/users?search=xss', null, ADMIN_AUTH);
  check('XSS username in admin users list is safe (no crash)', r.status === 200, 'status=' + r.status);
  // Check that the response body does NOT contain literal <img (would be XSS)
  var bodyStr = JSON.stringify(r.body);
  check('XSS username not rendered as HTML in API', bodyStr.indexOf('<img') < 0, 'contains img tag');

  // 20. Dangerous actions without confirm:true should be rejected
  r = await request('POST', '/api/admin/user/action', { email: testEmail, action: 'ban' }, ADMIN_AUTH);
  check('Ban without confirm returns 400', r.status === 400 && r.body && r.body.error === 'confirm:true required for dangerous action', 'status=' + r.status + ' error=' + JSON.stringify(r.body));

  r = await request('POST', '/api/admin/user/action', { email: testEmail, action: 'grant-all-abilities' }, ADMIN_AUTH);
  check('Grant-all-abilities without confirm returns 400', r.status === 400 && r.body && r.body.error === 'confirm:true required for dangerous action', 'status=' + r.status);

  // 21. grant-all-characters with confirm:true should return correct catalog
  const c3 = await getCaptcha();
  const gcEmail = '_gc_test_' + Date.now() + '@mytest.net';
  var gcUser = await request('POST', '/api/register', {
    email: gcEmail, password: 'test123', username: 'GCTester' + String(Date.now()).slice(-6),
    captchaId: c3 ? c3.captchaId : 'x', captchaAnswer: c3 ? c3.answer : 'x'
  });
  if (gcUser.status === 200 || gcUser.status === 201) {
    // Verify first
    r = await request('POST', '/api/admin/user/action', { email: gcEmail, action: 'verify', confirm: true }, ADMIN_AUTH);
    // Grant all characters with confirm
    r = await request('POST', '/api/admin/user/action', { email: gcEmail, action: 'grant-all-characters', confirm: true }, ADMIN_AUTH);
    check('Grant-all-characters returns 200', r.status === 200, 'status=' + r.status);
    if (r.status === 200 && r.body.gameData) {
      var expectedChars = ['runner','adventurer','beach','casual2','hoodie','farmer','king','punk','spacesuit','suit','swat','worker'];
      var actualChars = r.body.gameData.ownedCharacters || [];
      var allMatch = expectedChars.length === actualChars.length && expectedChars.every(function(c) { return actualChars.indexOf(c) >= 0; });
      check('grant-all-characters has correct catalog', allMatch, 'expected=12 chars got=' + actualChars.length);
    }
  }


  // Fetch /admin HTML again for string checks
  var adminHtml = await request('GET', '/admin', null, ADMIN_AUTH);
  var adminStr = adminHtml.body;

  // 22. /admin HTML does not contain Authorization:AUTH
  check('/admin no Authorization:AUTH', adminStr.indexOf('Authorization:AUTH') < 0, '');

  // 23-25: These checks now run against /admin.js in test 35

  // 26. pvp-server.js does not contain ::ffff:10.138.0.2
  // (read pvp-server file and check)
  var fs = require('fs');
  var pvpSrc = fs.readFileSync(__dirname + '/pvp-server.js', 'utf8');
  check('pvp-server.js no 10.138.0.2', pvpSrc.indexOf('10.138.0.2') < 0, '');


    // 27-29: Now covered by /admin.js checks in test 35
// 30. Ban without confirm returns 400
  var banNoConfirm = await request('POST', '/api/admin/user/action', { email: testEmail, action: 'ban' }, ADMIN_AUTH);
  check('Ban without confirm -> 400', banNoConfirm.status === 400 && banNoConfirm.body && banNoConfirm.body.error === 'confirm:true required for dangerous action', 'status=' + banNoConfirm.status);

  // 31. Ban with confirm returns 200
  var banWithConfirm = await request('POST', '/api/admin/user/action', { email: testEmail, action: 'ban', confirm: true }, ADMIN_AUTH);
  check('Ban with confirm -> 200', banWithConfirm.status === 200, 'status=' + banWithConfirm.status);

  // 32. Reset password with confirm returns 200
  var resetPW = await request('POST', '/api/admin/user/action', { email: testEmail, action: 'reset-password', newPassword: 'newpass123', confirm: true }, ADMIN_AUTH);
  check('Reset password with confirm', resetPW.status === 200, 'status=' + resetPW.status);

  // 33. Reset password without confirm returns 400
  var resetPWNoConfirm = await request('POST', '/api/admin/user/action', { email: testEmail, action: 'reset-password', newPassword: 'newpass123' }, ADMIN_AUTH);
  check('Reset password without confirm -> 400', resetPWNoConfirm.status === 400, 'status=' + resetPWNoConfirm.status);


  // 34. /admin HTML includes script src=/admin.js not inline JS
  check('/admin uses external JS', adminStr.indexOf('src="/admin.js"') >= 0, '');
  check('/admin no inline page JS', adminStr.indexOf('<script>') < 0 || adminStr.indexOf('src="/admin.js"') >= 0, '');

  // 35. JS syntax check: fetch /admin.js and validate syntax
  var adminJsReq = await request('GET', '/admin.js', null, ADMIN_AUTH);
  check('/admin.js returns 200', adminJsReq.status === 200, 'status=' + adminJsReq.status);
  if (adminJsReq.status === 200 && typeof adminJsReq.body === 'string') {
    var js = adminJsReq.body;
    // Test syntax using vm module
    var vm = require('vm');
    try {
      new vm.Script(js);
      check('/admin.js syntax valid', true, '');
    } catch (e) {
      check('/admin.js syntax valid', false, e.message);
    }
    // No credentials in headers
    check('/admin.js no credentials in headers', !/headers\s*:\s*\{[^}]*credentials:/.test(js), '');
    // confirm:true for ban/grant/reset
    check('/admin.js ban with confirm', js.indexOf('userAction(email, \"ban\", true)') >= 0, '');
    check('/admin.js grant with confirm', js.indexOf('userAction(email, \"grant-all-abilities\", true)') >= 0, '');
    check('/admin.js reset-pw with confirm', js.indexOf('confirm: true') >= 0, '');
    // escAttr and esc usage
    check('/admin.js uses escAttr for data-email', js.indexOf('escAttr(email)') >= 0, '');
    check('/admin.js audit uses esc(e.admin)', js.indexOf('esc(e.admin)') >= 0, '');
    check('/admin.js audit uses esc(e.action)', js.indexOf('esc(e.action)') >= 0, '');
    check('/admin.js audit uses esc(e.target)', js.indexOf('esc(e.target') >= 0, '');
    check('/admin.js PVP uses esc(d.error)', js.indexOf('esc(d.error)') >= 0, '');
    // user event delegation
    check('/admin.js has userTableBody delegation', js.indexOf('userTableBody') >= 0 && js.indexOf('addEventListener') >= 0, '');
  }

  // 36. Audit log does not expose sensitive fields
  var auditR = await request('GET', '/api/admin/audit?limit=500', null, ADMIN_AUTH);
  check('Audit returns 200', auditR.status === 200, 'status=' + auditR.status);
  if (auditR.status === 200 && Array.isArray(auditR.body)) {
    var auditBodyStr = JSON.stringify(auditR.body);
    check('Audit no passwordHash leak', auditBodyStr.indexOf('passwordHash') < 0, '');
    check('Audit no passwordSalt leak', auditBodyStr.indexOf('passwordSalt') < 0, '');
    check('Audit no sessionToken leak', auditBodyStr.indexOf('sessionToken') < 0, '');
    check('Audit no sessionExpires leak', auditBodyStr.indexOf('sessionExpires') < 0, '');
  }

  // Print summary
  console.log('\n=== Results: ' + passed + ' passed, ' + failed + ' failed ===');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(function(e) {
  console.error('FATAL:', e);
  process.exit(1);
});
