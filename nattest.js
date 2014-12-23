var DocumentClient = require('documentdb').DocumentClient;

var host = 'https://test-kademy.documents.azure.com:443/',
    options = {
        masterKey: 'hSui6X08mjlXQnTzsvUfLHIV56+OdNemziePwc/iqljXvRRGdLUOz2DZIye1ZB1/fv1PAargsR7UElTg7sJD8A==',
    };

var client = new DocumentClient(host, options);
var databaseDefinition = { id: "test-kademy" };
var collectionDefinition = { id: "users" };
var documentDefinition = { firstName: "Gianluca", lastName: "Pengo" };


client.createDatabase(databaseDefinition, function(err, database) {
    if(err) return console.log(err);
    console.log('created db');
    
    client.createCollection(database._self, collectionDefinition, function(err, collection) {
        if(err) return console.log(err);
        
        console.log('created collection');
        
        client.createDocument(collection._self, documentDefinition, function(err, document) {
            if(err) return console.log(err);

            console.log(document)
            console.log('Created Document with content: ', document.content);
        });
    });
});




function cleanup(client, database) {
    client.deleteDatabase(database._self, function(err) {
        if(err) console.log(err);
    });
}
