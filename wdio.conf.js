const path = require('path');
const { ReportGenerator } = require('wdio-html-nice-reporter');

exports.config = {
  runner: 'local',
  port: 4723,
  specs: [
    './tests/mobile/**/*.spec.js',
    './tests/mobile/**/*.spec.ts'
  ],
  maxInstances: 1,
  maxInstancesPerCapability: 1,
  capabilities: [{
    maxInstances: 1,
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:app': path.resolve(__dirname, './tests/605-v2.0.16-landbase-arm64-v8a-release.apk'),
    'appium:appPackage': 'vn.laand',
    'appium:appActivity': 'vn.laand.MainActivity',
    'appium:deviceName': 'Android Device',
    'appium:autoGrantPermissions': true,
    'appium:noSign': true,
    'appium:noReset': true,
    'appium:newCommandTimeout': 7200,
    'appium:uiautomator2ServerInstallTimeout': 90000,
    'appium:uiautomator2ServerLaunchTimeout': 90000,
  }],
  logLevel: 'info',
  bail: 0,
  waitforTimeout: 30000,
  connectionRetryTimeout: 240000,
  connectionRetryCount: 3,
  framework: 'mocha',
  reporters: [
    'spec',
    ['html-nice', {
      outputDir: './reports/mobile-html-report/',
      filename: 'report.html',
      reportTitle: 'Landbase Mobile App Automated Test Report',
      linkScreenshots: true,
      showInHeader: true,
      useOnComplete: true,
    }]
  ],
  mochaOpts: {
    ui: 'bdd',
    timeout: 180000
  },
  onComplete: function(exitCode, config, capabilities, results) {
    try {
      const reportBuilder = new ReportGenerator();
      reportBuilder.createReport({
        outputDir: './reports/mobile-html-report/',
        filename: 'report.html',
        reportTitle: 'Landbase Mobile App Automated Test Report',
      });
      console.log('📊 Đã tạo thành công Báo Cáo Mobile HTML Report tại: ./reports/mobile-html-report/report.html');
    } catch (e) {
      console.log('Tạo report hoàn tất.');
    }
  }
};
