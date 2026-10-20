const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Ensures Gradle only builds for arm64-v8a on Android to prevent
 * Out-Of-Memory daemon termination during C++ CMake compilation on EAS cloud builders.
 */
module.exports = function withAndroidArchitectures(config) {
  return withGradleProperties(config, (config) => {
    config.modResults = config.modResults.filter(
      (item) => item.key !== 'reactNativeArchitectures' && item.key !== 'org.gradle.jvmargs'
    );
    config.modResults.push({
      type: 'property',
      key: 'reactNativeArchitectures',
      value: 'arm64-v8a',
    });
    config.modResults.push({
      type: 'property',
      key: 'org.gradle.jvmargs',
      value: '-Xmx3072m -XX:MaxMetaspaceSize=512m',
    });
    return config;
  });
};
