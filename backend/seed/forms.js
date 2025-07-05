// seed/forms.js
const mongoose = require('mongoose');
const Form = require('../models/form');
const FormVersion = require('../models/formVersion');
require('dotenv').config();

const examples = [
  {
    name: 'Einwilligung',
    text: `# Hauptüberschrift

## Abschnitt

Text: [Textfeld name]
Geburtstag: [Datum geburt]

### Beschwerden
- [Checkbox ruecken] Rückenschmerzen
- [Checkbox nacken] Nackenschmerzen

### Zustimmung
Ich stimme zu: [Checkbox zustimmung]

[Tabelle Text | Name | Geburtstag | Zustimmung ]
- 1. Eintrag | [Textfeld name_1] | [Datum geburt_1] | [Checkbox zustimmung_1]
- 2. Eintrag | [Textfeld name_2] | [Datum geburt_2] | [Checkbox zustimmung_2]
- 3. Eintrag | [Textfeld name_3] | [Datum geburt_3] | [Checkbox zustimmung_3]

Unterschrift: [Signature unterschrift]`

  },{
    name: 'Patientenfragebogen',
    text: `# Patientenfragebogen
            Name: [Textfeld name]  
            Geburtstag: [Datum geburt]  

            ## Fachbereichsauswahl:
            Fachbereich: [Select fachbereich]  
            - Orthopädie  
            - Neurologie  
            - Allgemeinmedizin  

            ## Bitte beschreiben Sie Ihre Beschwerden: 
            Beschreibung: [Textarea beschreibung]

            ## Wie stark sind Ihre Schmerzen aktuell? 
            Schmerzgrad: [Radio schmerzgrad]  
            - Kein Schmerz  
            - Leicht  
            - Mittel  
            - Stark

            Ich bestätige, dass ich die Informationen wahrheitsgemäß ausgefüllt habe.  
            [Checkbox zustimmung] Ich stimme zu.

            [Signature unterschrift]`

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