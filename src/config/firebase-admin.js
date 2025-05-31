var admin = require("firebase-admin");

var serviceAccount = require("./firebase-adminsdk-wnp7v-82f7c2b46c.json");

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount)
});

module.exports = admin; 