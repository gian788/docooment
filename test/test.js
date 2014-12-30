var docooment = require('../index'),
	Schema = docooment.Schema;


docooment.connect('https://test-kademy.documents.azure.com', 443, 'test-kademy' , {masterKey: 'hSui6X08mjlXQnTzsvUfLHIV56+OdNemziePwc/iqljXvRRGdLUOz2DZIye1ZB1/fv1PAargsR7UElTg7sJD8A=='}, function(err){
	if(err) return console.error(err);

	console.log('CONNECTED')

	var UserSchema = new Schema({   
		email: { type: String, lowercase: true },
		firstName: String,
		lastName: String,
	});


	var User = docooment.model('User', UserSchema);

	var user = new User({firstName: 'Gianluca'});
	console.log(user);
	
	user.save(function (err) {
	  if (err) console.error(err)
	  console.log('user', user);

		User.find({firstName: 'Gianluca'}).limit(5).sort({id:1}).exec(function(err, results){
			console.log(err, results)
		})
	});

	/*User.create({firstName: 'Gianluca'}, function (err, user) {
	  if (err) console.error(err)
	  console.log('user', user);
	});*/
});

