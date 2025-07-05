const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const adminRoutes = require('./routes/admin');
const manageRoutes = require('./routes/manage');
const userRoutes = require('./routes/user');
const patientRoutes = require('./routes/patient'); // ✅ hinzugefügt
const adminFormats = require('./routes/adminFormats');
const adminPrints = require('./routes/adminPrints');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/admin', adminRoutes);
app.use('/api/manage', manageRoutes);
app.use('/api/user', userRoutes);
app.use('/api/patients', patientRoutes); // ✅ hinzugefügt
app.use('/api/admin/formats', adminFormats);
app.use('/api/admin/prints', adminPrints);

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected');
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => console.error(err));
