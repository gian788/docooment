var docooment = require('../index'),
	Schema = docooment.Schema;


docooment.connect('https://test-kademy.documents.azure.com', 443, 'kademy' , {masterKey: 'hSui6X08mjlXQnTzsvUfLHIV56+OdNemziePwc/iqljXvRRGdLUOz2DZIye1ZB1/fv1PAargsR7UElTg7sJD8A=='}, function(err){
	if(err) return console.error(err);
	docooment.set('debug', true)

	console.log('CONNECTED')

	var UserSchema = new Schema({   
		email: { type: String, lowercase: true },
		firstName: String,
		lastName: String,
	});

	var User = docooment.model('User', UserSchema);

	var CertificateSchema = new Schema({   
		title: { type: String},
	});

	var Certificate = docooment.model('Certificate', CertificateSchema);

	var user = new User({firstName: 'Gianluca'});
	//console.log(user);
	
	user.save(function (err) {
	  if (err) console.error(err)
	   	console.log('user', user);

		User.find({firstName: 'Gianluca'}).limit(5).sort({id:1}).exec(function(err, users){
			if(err) return console.error(err);
			//console.log(users)
			console.log(users[0])
			
			User.update({_id: users[0]._id}, {lastName: 'Pengo'}, function(err, results){
				if(err) return console.error(err);
				console.log('updated', results);

				users[0].lastName = 'Rossi';
				users[0].save(function(err, results){
					if(err) return console.error(err);

					console.log('saved', results)

					User.remove({_id: users[0]}, function(err){
						if(err) return console.error(err);
						console.log('deleted');


						Certificate.create({title: 'prova'}, function(err, certificate){
							console.log(err, certificate);
						});
					});
				});
			});
		});
	});

	/*User.create({firstName: 'Gianluca'}, function (err, user) {
	  if (err) console.error(err)
	  console.log('user', user);
	});*/
});

