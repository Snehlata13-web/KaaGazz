require('dotenv').config();

const app = require('./src/app');

const port = process.env.PORT || 5000;

app.listen(port, () => {
	console.log(`EcoPaper Connect API listening on http://localhost:${port}`);
});
