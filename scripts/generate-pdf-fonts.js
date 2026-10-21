const fs = require('fs');
const path = require('path');

const bricolagePath = path.join(
  __dirname,
  '../node_modules/@expo-google-fonts/bricolage-grotesque/600SemiBold/BricolageGrotesque_600SemiBold.ttf'
);
const instrumentRegularPath = path.join(
  __dirname,
  '../node_modules/@expo-google-fonts/instrument-sans/400Regular/InstrumentSans_400Regular.ttf'
);
const instrumentSemiBoldPath = path.join(
  __dirname,
  '../node_modules/@expo-google-fonts/instrument-sans/600SemiBold/InstrumentSans_600SemiBold.ttf'
);

const bricolageBase64 = fs.readFileSync(bricolagePath).toString('base64');
const instrumentRegularBase64 = fs.readFileSync(instrumentRegularPath).toString('base64');
const instrumentSemiBoldBase64 = fs.readFileSync(instrumentSemiBoldPath).toString('base64');

const outputPath = path.join(__dirname, '../src/utils/pdfFonts.ts');

const content = `// Auto-generated offline base64 fonts for PDF generation
export const BRICOLAGE_600_BASE64 = '${bricolageBase64}';
export const INSTRUMENT_400_BASE64 = '${instrumentRegularBase64}';
export const INSTRUMENT_600_BASE64 = '${instrumentSemiBoldBase64}';
`;

fs.writeFileSync(outputPath, content, 'utf8');
console.log('Successfully generated src/utils/pdfFonts.ts');
