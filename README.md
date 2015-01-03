Docooment
=========

A [Mongoose](https://github.com/LearnBoost/mongoose) like [Azure DocuomentDB](http://azure.microsoft.com/it-it/services/documentdb/) ORM based on [Microsoft Azure DocumentDB Node.js SDK](https://github.com/Azure/azure-documentdb-node).

## Plugins

Docooment is compatibile with most of mongoose plugins. Check out the [plugins search site](http://plugins.mongoosejs.com/) to see hundreds of related modules from the community.

## Overview

### Connecting to DocumentDB

To use Docooment, you need to first [create an Azure account](http://azure.microsoft.com/en-us/documentation/articles/documentdb-create-account/). 
You can follow [this](http://azure.microsoft.com/en-us/documentation/articles/documentdb-nodejs-application/) tutorial to help you get started.

First, we need to define a connection.

`connect` take a `URI`, `port`, `database` and `options` that contains the auth `masterKey`.

```js
var docooment = require('docooment');

docooment.connect('https://your-db-account.documents.azure.com', 443, 'yourDatabase' , {masterKey: 'yourMasterKey'});
```

  
  
> #### **Note:** This documentantion is from [Mongoose](https://github.com/LearnBoost/mongoose) docs

### Defining a Model

Models are defined through the `Schema` interface. 

```js
var Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

var BlogPost = new Schema({
    author    : ObjectId
  , title     : String
  , body      : String
  , date      : Date
});
```

Aside from defining the structure of your documents and the types of data you're storing, a Schema handles the definition of:

* [Validators](http://mongoosejs.com/docs/validation.html) (async and sync)
* [Defaults](http://mongoosejs.com/docs/api.html#schematype_SchemaType-default)
* [Getters](http://mongoosejs.com/docs/api.html#schematype_SchemaType-get)
* [Setters](http://mongoosejs.com/docs/api.html#schematype_SchemaType-set)
* [Indexes](http://mongoosejs.com/docs/guide.html#indexes)
* [Middleware](http://mongoosejs.com/docs/middleware.html)
* [Methods](http://mongoosejs.com/docs/guide.html#methods) definition
* [Statics](http://mongoosejs.com/docs/guide.html#statics) definition
* [Plugins](http://mongoosejs.com/docs/plugins.html)
* [pseudo-JOINs](http://mongoosejs.com/docs/populate.html)

The following example shows some of these features:

```js
var Comment = new Schema({
    name  :  { type: String, default: 'hahaha' }
  , age   :  { type: Number, min: 18, index: true }
  , bio   :  { type: String, match: /[a-z]/ }
  , date  :  { type: Date, default: Date.now }
  , buff  :  Buffer
});

// a setter
Comment.path('name').set(function (v) {
  return capitalize(v);
});

// middleware
Comment.pre('save', function (next) {
  notify(this.get('email'));
  next();
});
```

Take a look at the example in `examples/schema.js` for an end-to-end example of a typical setup.

### Accessing a Model

Once we define a model through `mongoose.model('ModelName', mySchema)`, we can access it through the same function

```js
var myModel = mongoose.model('ModelName');
```

Or just do it all at once

```js
var MyModel = mongoose.model('ModelName', mySchema);
```

We can then instantiate it, and save it:

```js
var instance = new MyModel();
instance.my.key = 'hello';
instance.save(function (err) {
  //
});
```

Or we can find documents from the same collection

```js
MyModel.find({}, function (err, docs) {
  // docs.forEach
});
```

You can also `findOne`, `findById`, `update`, etc. For more details check out [the docs](http://mongoosejs.com/docs/queries.html).

**Important!** If you opened a separate connection using `mongoose.createConnection()` but attempt to access the model through `mongoose.model('ModelName')` it will not work as expected since it is not hooked up to an active db connection. In this case access your model through the connection you created:

```js
var conn = mongoose.createConnection('your connection string')
  , MyModel = conn.model('ModelName', schema)
  , m = new MyModel;
m.save(); // works
```

vs

```js
var conn = mongoose.createConnection('your connection string')
  , MyModel = mongoose.model('ModelName', schema)
  , m = new MyModel;
m.save(); // does not work b/c the default connection object was never connected
```

### Embedded Documents

In the first example snippet, we defined a key in the Schema that looks like:

```
comments: [Comments]
```

Where `Comments` is a `Schema` we created. This means that creating embedded documents is as simple as:

```js
// retrieve my model
var BlogPost = mongoose.model('BlogPost');

// create a blog post
var post = new BlogPost();

// create a comment
post.comments.push({ title: 'My comment' });

post.save(function (err) {
  if (!err) console.log('Success!');
});
```

The same goes for removing them:

```js
BlogPost.findById(myId, function (err, post) {
  if (!err) {
    post.comments[0].remove();
    post.save(function (err) {
      // do something
    });
  }
});
```

Embedded documents enjoy all the same features as your models. Defaults, validators, middleware. Whenever an error occurs, it's bubbled to the `save()` error callback, so error handling is a snap!

Mongoose interacts with your embedded documents in arrays _atomically_, out of the box.

### Middleware

See the [docs](http://mongoosejs.com/docs/middleware.html) page.

#### Intercepting and mutating method arguments

You can intercept method arguments via middleware.

For example, this would allow you to broadcast changes about your Documents every time someone `set`s a path in your Document to a new value:

```js
schema.pre('set', function (next, path, val, typel) {
  // `this` is the current Document
  this.emit('set', path, val);

  // Pass control to the next pre
  next();
});
```

Moreover, you can mutate the incoming `method` arguments so that subsequent middleware see different values for those arguments. To do so, just pass the new values to `next`:

```js
.pre(method, function firstPre (next, methodArg1, methodArg2) {
  // Mutate methodArg1
  next("altered-" + methodArg1.toString(), methodArg2);
});

// pre declaration is chainable
.pre(method, function secondPre (next, methodArg1, methodArg2) {
  console.log(methodArg1);
  // => 'altered-originalValOfMethodArg1' 
      
  console.log(methodArg2);
  // => 'originalValOfMethodArg2' 
      
  // Passing no arguments to `next` automatically passes along the current argument values
  // i.e., the following `next()` is equivalent to `next(methodArg1, methodArg2)`
  // and also equivalent to, with the example method arg 
  // values, `next('altered-originalValOfMethodArg1', 'originalValOfMethodArg2')`
  next();
});
```

#### Schema gotcha

`type`, when used in a schema has special meaning within Mongoose. If your schema requires using `type` as a nested property you must use object notation:

```js
new Schema({
    broken: { type: Boolean }
  , asset : {
        name: String
      , type: String // uh oh, it broke. asset will be interpreted as String
    }
});

new Schema({
    works: { type: Boolean }
  , asset : {
        name: String
      , type: { type: String } // works. asset is an object with a type property
    }
});
```



## License

Copyright (c) 2015 DigitalRockers srl &lt;dev@digitalrockers.it&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
