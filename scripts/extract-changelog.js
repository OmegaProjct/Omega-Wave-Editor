const fs = require('fs');
const path = require('path');

function extractChangelog(version) {
  const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
  if (!fs.existsSync(changelogPath)) {
    console.error('CHANGELOG.md not found');
    process.exit(1);
  }

  const content = fs.readFileSync(changelogPath, 'utf8');
  // Escape dots in version for regex
  const escapedVersion = version.replace(/\./g, '\\.');
  const headerRegex = new RegExp(`##\\s*\\[${escapedVersion}\\]`, 'i');
  
  const match = content.match(headerRegex);
  if (!match) {
    console.error(`Version ${version} not found in CHANGELOG.md`);
    process.exit(1);
  }

  const startIndex = match.index + match[0].length;
  
  // Find the next header starting with ## [X.Y.Z]
  const nextHeaderRegex = /##\s*\[\d+\.\d+\.\d+\]/g;
  nextHeaderRegex.lastIndex = startIndex;
  const nextMatch = nextHeaderRegex.exec(content);

  let extracted = '';
  if (nextMatch) {
    extracted = content.substring(startIndex, nextMatch.index);
  } else {
    extracted = content.substring(startIndex);
  }

  // Clean up date suffix if present in the header line, e.g. " - 2026-05-31"
  // The startIndex is right after "## [0.7.0]"
  // So the rest of the line is likely " - 2026-05-31\n"
  extracted = extracted.replace(/^[^\n]*\n/, ''); // remove first line (which contains " - Date" and newline)
  
  return extracted.trim();
}

function generateReleaseNotes(version, rawNotes) {
  return `### English
#### Upgrade Notice
Before updating the Omega Wave Editor, please make sure to save your active projects (\`.owep\`). If you are upgrading from an older version, your settings and recent project lists will be preserved safely.

### Deutsch
#### Wichtiger Hinweis zum Update
Bitte stelle vor dem Update des Omega Wave Editors sicher, dass deine aktiven Projekte (\`.owep\`) gespeichert sind. Wenn du von einer älteren Version aktualisierst, bleiben deine Einstellungen und die Liste der letzten Projekte sicher erhalten.

---

${rawNotes}`;
}

const targetVersion = process.argv[2];
const outputPath = process.argv[3];
if (!targetVersion) {
  console.error('Please specify a version as the first argument');
  process.exit(1);
}

try {
  const rawNotes = extractChangelog(targetVersion);
  const formattedNotes = generateReleaseNotes(targetVersion, rawNotes);
  if (outputPath) {
    fs.writeFileSync(outputPath, formattedNotes, 'utf8');
    console.log(`Changelog successfully written to ${outputPath} (UTF-8)`);
  } else {
    console.log(formattedNotes);
  }
} catch (err) {
  console.error('Error extracting changelog:', err);
  process.exit(1);
}
