const fs = require('fs');
const path = require('path');

const collections = [
  'LandBase_API_Tests.postman_collection.json',
  'LandBase_Onboarding_Reward.postman_collection.json'
];

function updateCollection(filePath) {
  if (!fs.existsSync(filePath)) return;
  const col = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  function updateItems(items) {
    for (const it of items) {
      if (it.name && it.event) {
        const testEv = it.event.find(e => e.listen === 'test');
        if (testEv && Array.isArray(testEv.script?.exec)) {
          let exec = testEv.script.exec;
          const execStr = exec.join('\n');

          // 1. ONB-API-03
          if (it.name.startsWith('ONB-API-03') && !execStr.includes('[DEFECT_SRS_FR-KP-02]')) {
            exec.push(
              'pm.test("[DEFECT_SRS_FR-KP-02] Số lượng nhiệm vụ khám phá phải đủ 9 theo SRS (Hiện tại: " + (payload.tasks ? payload.tasks.length : 0) + ")", function(){',
              '  pm.expect(payload.tasks.length, "Chưa đủ 9 nhiệm vụ theo SRS FR-KP-02").to.equal(9);',
              '});'
            );
            console.log(filePath, 'Updated ONB-API-03');
          }

          // 2. ONB-API-09
          if (it.name.startsWith('ONB-API-09') && !execStr.includes('[DEFECT_SECURITY_401]')) {
            exec.push(
              'pm.test("[DEFECT_SECURITY_401] Request thiếu xác thực phải trả về 401 Unauthorized (Hiện tại: " + pm.response.code + ")", function(){',
              '  pm.expect([401, 403], "Thiếu auth phải trả về 401/403 thay vì " + pm.response.code).to.include(pm.response.code);',
              '});'
            );
            console.log(filePath, 'Updated ONB-API-09');
          }

          // 3. CLAIM-API-02
          if (it.name.startsWith('CLAIM-API-02') && !execStr.includes('[DEFECT_BACKEND]')) {
            exec.push(
              'pm.test("[DEFECT_BACKEND] Chặn claim lần 2: Không được tiếp tục cấp Vàng (goldAwarded = 0, Hiện tại: " + payload.goldAwarded + ")", function(){',
              '  pm.expect(payload.goldAwarded, "Backend không được tiếp tục cấp Vàng khi task đã CLAIMED").to.equal(0);',
              '});'
            );
            console.log(filePath, 'Updated CLAIM-API-02');
          }

          // 4. CLAIM-API-04
          if (it.name.startsWith('CLAIM-API-04') && !execStr.includes('[DEFECT_REST_STATUS]')) {
            exec.push(
              'pm.test("[DEFECT_REST_STATUS] Task không tồn tại phải trả về mã 404 hoặc 400 (Hiện tại: " + pm.response.code + ")", function(){',
              '  pm.expect([400, 404], "Task không tồn tại phải trả về 404/400 thay vì " + pm.response.code).to.include(pm.response.code);',
              '});'
            );
            console.log(filePath, 'Updated CLAIM-API-04');
          }

          // 5. CLAIM-API-05
          if (it.name.startsWith('CLAIM-API-05') && !execStr.includes('[DEFECT_REST_STATUS]')) {
            exec.push(
              'pm.test("[DEFECT_REST_STATUS] Claim chưa hoàn thành phải trả về 400 Bad Request (Hiện tại: " + pm.response.code + ")", function(){',
              '  pm.expect([400, 422], "Nhiệm vụ chưa hoàn thành phải trả về 400/422 thay vì " + pm.response.code).to.include(pm.response.code);',
              '});'
            );
            console.log(filePath, 'Updated CLAIM-API-05');
          }

          // 6. CLAIM-API-06
          if (it.name.startsWith('CLAIM-API-06') && !execStr.includes('[DEFECT_SECURITY_401]')) {
            exec.push(
              'pm.test("[DEFECT_SECURITY_401] Claim thiếu Authorization phải trả về 401 Unauthorized (Hiện tại: " + pm.response.code + ")", function(){',
              '  pm.expect([401, 403], "Thiếu auth phải trả về 401/403 thay vì " + pm.response.code).to.include(pm.response.code);',
              '});'
            );
            console.log(filePath, 'Updated CLAIM-API-06');
          }
        }
      }
      if (it.item) updateItems(it.item);
    }
  }

  updateItems(col.item);
  fs.writeFileSync(filePath, JSON.stringify(col, null, 2), 'utf8');
}

collections.forEach(updateCollection);
console.log('Done updating Postman defect tests!');

