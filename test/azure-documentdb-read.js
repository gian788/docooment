var DocumentDBClient = require('documentdb').DocumentClient;

var host = 'https://test-kademy.documents.azure.com:443/',
    options = {
        masterKey: 'hSui6X08mjlXQnTzsvUfLHIV56+OdNemziePwc/iqljXvRRGdLUOz2DZIye1ZB1/fv1PAargsR7UElTg7sJD8A==',
    };

var databaseDefinition = { id: "test-kademy" };
var collectionDefinition = { id: "users" };

var client = new DocumentDBClient(host, options);




var readOrCreateDatabase = function (callback) {
	var databaseId = databaseDefinition.id;
    client.queryDatabases('SELECT * FROM root r WHERE r.id="' + databaseId + '"').toArray(function (err, results) {
        if (err) {
            // some error occured, rethrow up
            throw (err);
        }
        if (!err && results.length === 0) {
            // no error occured, but there were no results returned 
            // indicating no database exists matching the query            
            client.createDatabase({ id: databaseId }, function (err, createdDatabase) {
                callback(createdDatabase);
            });
        } else {
            // we found a database
            callback(results[0]);
        }
    });
};


var readOrCreateCollection = function (database, callback) {
	var collectionId = collectionDefinition.id;
    client.queryCollections(database._self, 'SELECT * FROM root r WHERE r.id="' + collectionId + '"').toArray(function (err, results) {
        if (err) {
            // some error occured, rethrow up
            throw (err);
        }           
        if (!err && results.length === 0) {
            // no error occured, but there were no results returned 
            //indicating no collection exists in the provided database matching the query
            client.createCollection(database._self, { id: collectionId }, function (err, createdCollection) {
                callback(createdCollection);
            });
        } else {
            // we found a collection
            callback(results[0]);
        }
    });
};

var listItems = function (collection, callback) {
    console.log(collection._self+'0')
    client.queryDocuments(collection._self, 'SELECT * FROM root r').toArray(function (err, docs) {
        if (err) {
            console.log(err)
        }

        callback(docs);
    });
}








readOrCreateDatabase(function (database) {
	console.log(database)

	readOrCreateCollection(database, function(collection){
		console.log(collection)
		//console.log(collection.indexingPolicy)

		//listItems(collection, function(docs){
		//	console.log(docs)

            var fn = function(val){
                return val > 10;
            }

            var udf = {
                id: 'test',
                //userDefinedFunctionType: '',
                serverScript: fn,
            };
            //client.createUserDefinedFunction(collection._self, udf, options, function(err, result){
                //console.log(err, result);
                
                //client.readUserDefinedFunctions(collection._self, function(err, results){
                client.readUserDefinedFunctions(collection._self).toArray(function(err, results){                    
                    console.log('ok')
                    console.log(err, results);
                })
            //});
		//})
	});
});

/*client.queryDatabases('SELECT * FROM root r').toArray(function (err, results) {
    if (err) {
        console.log(err)
    }
    console.log(results)
});*/