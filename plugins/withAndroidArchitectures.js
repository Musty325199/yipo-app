const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Ensures Gradle only builds for arm64-v8a on Android and constrains
 * JVM heap / concurrency to prevent Out-Of-Memory daemon termination
 * during C++ CMake compilation on EAS cloud builders.
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
      value: 'arm64-v8a',
    });
    config.modResults.push({
      type: 'property',
      key: 'org.gradle.jvmargs',
      value: '-Xmx2048m -XX:MaxMetaspaceSize=512m -XX:+UseParallelGC',
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
