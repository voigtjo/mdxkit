// seed/forms.js
const mongoose = require('mongoose');
const Form = require('../models/form');
const FormVersion = require('../models/formVersion');
require('dotenv').config();

const examples = [
  {
    name: 'physiotherapie-aufklaerung',
    text: `# Patientenaufklärung zur Physiotherapie

**Name des Patienten:** [Textfeld name]

**Geburtsdatum:** [Datum geburt]

## Beschwerden
Bitte kreuzen Sie an:
- [Checkbox schmerz_nacken] Schmerzen im Nacken
- [Checkbox schmerz_ruecken] Rückenschmerzen
- [Checkbox schmerz_schulter] Schulterschmerzen

## Zustimmung zur Behandlung
Ich bin mit der Behandlung einverstanden: [Checkbox zustimmung]

Unterschrift: [Signature unterschrift]`
  },
  {
    name: 'einwilligung-datenschutz',
    text: `# Einwilligung zur Datenverarbeitung

**Patient:** [Textfeld name]
**Geburtsdatum:** [Datum geburt]

Ich willige ein, dass meine Gesundheitsdaten elektronisch gespeichert und verarbeitet werden: [Checkbox einwilligung]

Ich wurde über meine Rechte informiert: [Checkbox rechte_info]

Unterschrift: [Signature unterschrift]`
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