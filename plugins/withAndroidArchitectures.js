const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Ensures Gradle builds for both 32-bit (armeabi-v7a) and 64-bit (arm64-v8a) ARM
 * architectures so that Yípo runs on ALL physical Android devices (Tecno, Infinix,
 * itel, Samsung, Xiaomi) while constraining concurrency to avoid memory spikes on EAS.
 */
module.exports = function withAndroidArchitectures(config) {
  return withGradleProperties(config, (config) => {
    config.modResults = config.modResults.filter(
      (item) =>
        item.key !== 'reactNativeArchitectures' &&
        item.key !== 'org.gradle.jvmargs' &&
        item.key !== 'org.gradle.parallel' &&
        item.key !== 'org.gradle.workers.max'
    );
    config.modResults.push({
      type: 'property',
      key: 'reactNativeArchitectures',
      value: 'armeabi-v7a,arm64-v8a',
    });
    config.modResults.push({
      type: 'property',
      key: 'org.gradle.jvmargs',
      value: '-Xmx3072m -XX:MaxMetaspaceSize=512m -XX:+UseParallelGC',
    });
    config.modResults.push({
      type: 'property',
      key: 'org.gradle.parallel',
      value: 'false',
    });
    config.modResults.push({
      type: 'property',
      key: 'org.gradle.workers.max',
      value: '2',
    });
    return config;
  });
};
