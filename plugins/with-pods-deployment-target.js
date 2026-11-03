// Xcode 27 rejects iOS deployment targets below 15.0, and several pods (slider, masked-view, async-storage's resource
// bundle, reanimated, worklets) still declare 9.0 or 13.4. Raise every pod target to the app's own minimum.
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

const MARKER = '# courtside: raise pod deployment targets';

module.exports = function withPodsDeploymentTarget(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      const text = fs.readFileSync(podfile, 'utf8');
      if (text.includes(MARKER)) return cfg;
      const patch = `post_install do |installer|
    ${MARKER}
    min_ios = (podfile_properties['ios.deploymentTarget'] || '16.4').to_f
    installer.pods_project.targets.each do |t|
      t.build_configurations.each do |c|
        c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = min_ios.to_s if c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < min_ios
      end
    end
`;
      fs.writeFileSync(podfile, text.replace('post_install do |installer|\n', patch));
      return cfg;
    },
  ]);
};
