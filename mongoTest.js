/*var mongoose = require('mongoose'),
	Schema = mongoose.Schema;
mongoose.connect('mongodb://localhost/kademy-dev');



var UserSchema = new Schema({   
	email: { type: String, lowercase: true },
	firstName: String,
	lastName: String,
});

var User = mongoose.model('User', UserSchema);

var user = new User({firstName: 'Gianluca'});
user.save(function (err) {
  if (err) console.error(err)
  console.log('user', user);
});
*/



var docooment = require('./lib/docoomentdb'),
	SchemaD = docooment.Schema;
docooment.connect('https://test-kademy.documents.azure.com', 'test-kademy' , 443, {masterKey: 'hSui6X08mjlXQnTzsvUfLHIV56+OdNemziePwc/iqljXvRRGdLUOz2DZIye1ZB1/fv1PAargsR7UElTg7sJD8A=='});//callback

var UserSchemaD = new SchemaD({   
	email: { type: String, lowercase: true },
	firstName: String,
	lastName: String,
});

var UserD = docooment.model('User', UserSchemaD);

var userD = new UserD({firstName: 'Gianluca'});
userD.save(function (err) {
  if (err) console.error(err)
  console.log('userD',userD);
});