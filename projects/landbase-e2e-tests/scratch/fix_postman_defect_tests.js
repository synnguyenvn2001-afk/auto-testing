const fs = require('fs');

['LandBase_API_Tests.postman_collection.json', 'LandBase_Onboarding_Reward.postman_collection.json'].forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  const col = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // 1. Update collection-level prerequest script
  if (col.event) {
    const preEv = col.event.find(e => e.listen === 'prerequest');
    if (preEv && preEv.script?.exec) {
      preEv.script.exec = [
        "if (!pm.request.headers.has('clientLocale')) {",
        "    pm.request.headers.add({ key: 'clientLocale', value: 'vi' });",
        "}",
        "if (!pm.request.headers.has('clientTime')) {",
        "    pm.request.headers.add({ key: 'clientTime', value: new Date().toISOString() });",
        "}",
        "if (!pm.request.headers.has('clientMessageId')) {",
        "    pm.request.headers.add({ key: 'clientMessageId', value: pm.variables.replaceIn('{{$guid}}') });",
        "}",
        "const reqName = pm.info.requestName || '';",
        "const isNegativeAuth = reqName.includes('chưa đăng nhập') || reqName.includes('thiếu thông tin xác thực') || reqName.includes('không có Authorization') || reqName.includes('thiếu Authorization');",
        "if (!pm.request.headers.has('Authorization') && !isNegativeAuth) {",
        "    const token = pm.environment.get('accessToken') || pm.variables.get('accessToken');",
        "    if (token) {",
        "        pm.request.headers.add({ key: 'Authorization', value: 'Bearer ' + token });",
        "    }",
        "}"
      ];
    }
  }

  // 2. Fix CLAIM-API-02
  function updateItems(items) {
    for (const it of items) {
      if (it.name && it.name.startsWith('CLAIM-API-02') && it.event) {
        const testEv = it.event.find(e => e.listen === 'test');
        if (testEv && testEv.script?.exec) {
          testEv.script.exec = [
            'const r = pm.response.json(); const d = r.data !== undefined ? r.data : r;',
            'const first = JSON.parse(pm.environment.get("lastClaimSnapshot") || "null");',
            'pm.test("Có snapshot của lần claim đầu để kiểm tra gọi lặp", function(){ pm.expect(first, "Cần chạy helper trước và CLAIM-API-01 trước").to.not.equal(null); });',
            'if (first) {',
            '  pm.test("Claim lặp trả kết quả cũ và không tăng số Vàng", function(){',
            '    pm.expect(d.status).to.eql("CLAIMED");',
            '    pm.expect(d.taskCode).to.eql(first.taskCode);',
            '    pm.expect(d.goldAwarded).to.eql(first.goldAwarded);',
            '    pm.expect(d.balanceAfter).to.eql(first.balanceAfter);',
            '    pm.expect(d.transactionId).to.eql(first.transactionId);',
            '  });',
            '}',
            'pm.test("[DEFECT_BACKEND] Chặn claim lần 2: Không được tiếp tục cấp Vàng (goldAwarded = 0, Hiện tại: " + (d ? d.goldAwarded : "N/A") + ")", function(){',
            '  pm.expect(d ? d.goldAwarded : null, "Backend không được tiếp tục cấp Vàng khi task đã CLAIMED").to.equal(0);',
            '});'
          ];
        }
      }
      if (it.item) updateItems(it.item);
    }
  }

  updateItems(col.item);
  fs.writeFileSync(filePath, JSON.stringify(col, null, 2), 'utf8');
  console.log('Fixed prerequest & CLAIM-API-02 in:', filePath);
});

