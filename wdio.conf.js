const path = require('path');

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
    'appium:newCommandTimeout': 3600,
  }],
  logLevel: 'info',
  bail: 0,
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000
  },
};
