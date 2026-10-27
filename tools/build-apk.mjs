// 构建 APK:copy web → cap sync → gradle assembleRelease(同步是关键,漏了会打包旧前端)
import { execSync } from 'node:child_process';

const env = {
  ...process.env,
  JAVA_HOME: 'C:\\Users\\13506\\zcode-tools\\jdk21\\jdk-21.0.12.1+1',
  ANDROID_HOME: 'C:\\Users\\13506\\zcode-tools\\android-sdk',
  ANDROID_SDK_ROOT: 'C:\\Users\\13506\\zcode-tools\\android-sdk',
  JDK_JAVA_OPTIONS: '-Djavax.net.ssl.trustStoreType=WINDOWS-ROOT',
};
console.log(execSync('node tools/copy-web.mjs', { encoding: 'utf8' }));
console.log(execSync('npx cap sync android', { encoding: 'utf8', env, timeout: 120000 }));
const out = execSync('gradlew.bat assembleRelease', {
  encoding: 'utf8', cwd: 'android', env, timeout: 590000,
});
console.log(out.split('\n').filter(l => /BUILD|FAILURE/.test(l)).join('\n'));
