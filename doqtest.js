var DoQmentDB  = require('doqmentdb');
// Create DocumentDB connection
var host = 'https://test-kademy.documents.azure.com:443/',
	options = {
		masterKey: 'hSui6X08mjlXQnTzsvUfLHIV56+OdNemziePwc/iqljXvRRGdLUOz2DZIye1ZB1/fv1PAargsR7UElTg7sJD8A==',
	};
	
var connection = new (require('documentdb').DocumentClient)(host, options);

// Pass connection and database-name, if `test` is not exist it will create one.
var db = new DoQmentDB(connection, 'test-kademy');

// Create a CollectionManager instance, if `users` is not exist it will create one.
var users = db.use('users');

users.create({ name: '6534' })
  .then(console.log);

users.findById(1)
  .then(console.log);


