// Ajusta o projeto Android gerado: permissões de localização/voz e orientação.
import fs from 'node:fs';
const f = 'android/app/src/main/AndroidManifest.xml';
let x = fs.readFileSync(f, 'utf8');
const perms = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.WAKE_LOCK',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_LOCATION',
  'android.permission.VIBRATE',
];
for (const p of perms) {
  if (!x.includes(`"${p}"`)) x = x.replace('</manifest>', `    <uses-permission android:name="${p}" />\n</manifest>`);
}
if (!x.includes('android.hardware.location.gps'))
  x = x.replace('</manifest>', '    <uses-feature android:name="android.hardware.location.gps" android:required="false" />\n</manifest>');
if (!x.includes('screenOrientation'))
  x = x.replace('<activity', '<activity android:screenOrientation="portrait"');
fs.writeFileSync(f, x);
console.log('AndroidManifest ajustado.');
