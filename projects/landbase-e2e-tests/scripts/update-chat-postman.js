const fs = require('fs');
const path = require('path');

const folderJsonPath = path.join(__dirname, 'chat-ai-folder.json');
const chatData = JSON.parse(fs.readFileSync(folderJsonPath, 'utf8'));

// 1. Cập nhật Folder Pre-request Script tự động cấp cookie nếu chưa có
chatData.event = [
  {
    listen: "prerequest",
    script: {
      type: "text/javascript",
      exec: [
        "// Tự động kiểm tra và đăng nhập WebApp NextAuth để cấp session cookie cho Chat AI trên DEV",
        "const webapp = pm.environment.get('webappUrl') || pm.variables.get('webappUrl') || 'https://dev-webapp.laand.vn';",
        "const currentCookie = pm.environment.get('webSessionCookie') || pm.variables.get('webSessionCookie');",
        "if (!currentCookie) {",
        "  const username = pm.environment.get('username') || pm.variables.get('username') || 'usert1';",
        "  const password = pm.environment.get('password') || pm.variables.get('password') || 'Enao@123';",
        "  pm.sendRequest({ url: webapp + '/api/auth/csrf', method: 'GET' }, function (err, res) {",
        "    if (!err && res.code === 200) {",
        "      const csrf = res.json().csrfToken;",
        "      const setCookies = res.headers.all().filter(h => h.key.toLowerCase() === 'set-cookie').map(h => h.value.split(';')[0]);",
        "      const csrfCookie = setCookies.join('; ');",
        "      pm.sendRequest({",
        "        url: webapp + '/api/auth/callback/credentials',",
        "        method: 'POST',",
        "        header: {",
        "          'Content-Type': 'application/x-www-form-urlencoded',",
        "          'Cookie': csrfCookie",
        "        },",
        "        body: {",
        "          mode: 'urlencoded',",
        "          urlencoded: [",
        "            { key: 'csrfToken', value: csrf },",
        "            { key: 'userName', value: username },",
        "            { key: 'password', value: password },",
        "            { key: 'loginType', value: 'BASIC' },",
        "            { key: 'callbackUrl', value: webapp + '/' }",
        "          ]",
        "        }",
        "      }, function (loginErr, loginRes) {",
        "        if (!loginErr) {",
        "          const sessionCookies = loginRes.headers.all().filter(h => h.key.toLowerCase() === 'set-cookie').map(h => h.value.split(';')[0]);",
        "          const fullCookie = [...(csrfCookie ? [csrfCookie] : []), ...sessionCookies].join('; ');",
        "          if (fullCookie) {",
        "            pm.environment.set('webSessionCookie', fullCookie);",
        "            pm.collectionVariables.set('webSessionCookie', fullCookie);",
        "            console.log('✅ Đã tự động cấp mới session cookie WebApp cho Chat AI');",
        "          }",
        "        }",
        "      });",
        "    }",
        "  });",
        "}"
      ]
    }
  }
];

function processItem(item) {
  if (item.request) {
    const name = item.name || '';

    // CHAT-API-000: Cấp mới session WebApp Chat AI
    if (name.includes('CHAT-API-000')) {
      item.event = [
        {
          listen: "prerequest",
          script: {
            type: "text/javascript",
            exec: [
              "const webapp = pm.environment.get('webappUrl') || pm.variables.get('webappUrl') || 'https://dev-webapp.laand.vn';",
              "pm.sendRequest({ url: webapp + '/api/auth/csrf', method: 'GET' }, function (err, res) {",
              "  if (!err && res.code === 200) {",
              "    const csrf = res.json().csrfToken;",
              "    pm.variables.set('csrfToken', csrf);",
              "    const setCookies = res.headers.all().filter(h => h.key.toLowerCase() === 'set-cookie').map(h => h.value.split(';')[0]);",
              "    if (setCookies.length > 0) {",
              "      pm.variables.set('csrfCookie', setCookies.join('; '));",
              "    }",
              "  }",
              "});"
            ]
          }
        },
        {
          listen: "test",
          script: {
            type: "text/javascript",
            exec: [
              "pm.test('HTTP status 200 OK hoặc 302 Redirect hợp lệ', function () {",
              "  pm.expect([200, 302]).to.include(pm.response.code);",
              "});",
              "const setCookies = pm.response.headers.all().filter(h => h.key.toLowerCase() === 'set-cookie').map(h => h.value.split(';')[0]);",
              "const csrfCookie = pm.variables.get('csrfCookie') || '';",
              "const fullCookie = [...(csrfCookie ? [csrfCookie] : []), ...setCookies].join('; ');",
              "if (fullCookie) {",
              "  pm.environment.set('webSessionCookie', fullCookie);",
              "  pm.collectionVariables.set('webSessionCookie', fullCookie);",
              "  console.log('🔑 Đã cấp mới và lưu webSessionCookie vào Environment & Collection!');",
              "}"
            ]
          }
        }
      ];

      item.request.header = [
        { key: "Content-Type", value: "application/x-www-form-urlencoded", type: "text" },
        { key: "Cookie", value: "{{csrfCookie}}", type: "text" }
      ];

      item.request.body = {
        mode: "urlencoded",
        urlencoded: [
          { key: "csrfToken", value: "{{csrfToken}}" },
          { key: "userName", value: "{{username}}" },
          { key: "password", value: "{{password}}" },
          { key: "loginType", value: "BASIC" },
          { key: "callbackUrl", value: "{{webappUrl}}/" }
        ]
      };
      return;
    }

    // CHAT-API-022: Testcase kiểm tra request KHÔNG có thông tin xác thực
    if (name.includes('CHAT-API-022')) {
      item.request.header = (item.request.header || []).filter(h => h.key.toLowerCase() !== 'cookie');
      return;
    }

    // CHAT-API-023: Testcase kiểm tra token giả mạo
    if (name.includes('CHAT-API-023')) {
      const headers = (item.request.header || []).filter(h => h.key.toLowerCase() !== 'cookie');
      headers.push({
        key: "Cookie",
        value: "next-auth.session-token={{invalidAccessToken}}",
        type: "text"
      });
      item.request.header = headers;
      return;
    }

    // Các request còn lại gọi /api/chat hoặc /api/chat/suggested cần có session cookie
    const urlStr = typeof item.request.url === 'string' ? item.request.url : (item.request.url?.raw || '');
    if (urlStr.includes('/api/chat')) {
      const headers = (item.request.header || []).filter(h => h.key.toLowerCase() !== 'cookie');
      headers.push({
        key: "Cookie",
        value: "{{webSessionCookie}}",
        type: "text"
      });
      item.request.header = headers;
    }
  }

  if (item.item) {
    for (const sub of item.item) {
      processItem(sub);
    }
  }
}

processItem(chatData);

fs.writeFileSync(folderJsonPath, JSON.stringify(chatData, null, 2), 'utf8');
console.log('✅ Đã cập nhật chat-ai-folder.json thành công với Cookie header cho từng request!');
