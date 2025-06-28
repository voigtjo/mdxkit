// seed/forms.js
const mongoose = require('mongoose');
const Form = require('../models/form');
const FormVersion = require('../models/formVersion');
require('dotenv').config();

const examples = [
  {
    name: 'einwilligung-generell',
    text: `# Hauptüberschrift

## Abschnitt

Text: [Textfeld name]
Geburtstag: [Datum geburt]

### Beschwerden
- [Checkbox ruecken] Rückenschmerzen
- [Checkbox nacken] Nackenschmerzen

### Zustimmung
Ich stimme zu: [Checkbox zustimmung]

Unterschrift: [Signature unterschrift]

[Tabelle]
| Name     | Geburtsdatum | Einwilligung |
|----------|--------------|--------------|
| Anna     | 12.01.2000   | ✅            |
| ...      | ...          | ...          |
[/Tabelle]`

  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    for (const item of examples) {
      await FormVersion.updateMany({ name: item.name }, { valid: false });
      const version = new FormVersion({
        name: item.name,
        version: 1,
        text: item.text,
        valid: true,
      });
      await version.save();

      await Form.findOneAndUpdate(
        { name: item.name },
        { currentVersion: 1 },
        { upsert: true }
      );
    }

    console.log('✅ Beispiel-Formulare eingefügt');
    process.exit();
  } catch (err) {
    console.error('Fehler beim Seeding:', err);
    process.exit(1);
  }
}

seed();