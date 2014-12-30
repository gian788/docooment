var mongoose = require('mongoose'),
	Schema = mongoose.Schema;


mongoose.connect('mongodb://localhost/kademy-dev', function(err){
	if(err) return console.error(err);

	console.log('CONNECTED')

	var UserSchema = new Schema({   
		email: { type: String, lowercase: true },
		firstName: String,
		lastName: String,
	});


	var User = mongoose.model('User', UserSchema);

	var user = new User({firstName: 'Gianluca'});
	console.log(user);
	
	user.save(function (err) {
	  if (err) console.error(err)
	  console.log('user', user);

		User.find({firstName: 'Gianluca'}, function(err, results){
			console.log(err, results)
		})
	});

	/*User.create({firstName: 'Gianluca'}, function (err, user) {
	  if (err) console.error(err)
	  console.log('user', user);
	});*/
});

