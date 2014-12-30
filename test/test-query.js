var queryComposer = require('../lib/querycomposer');

var select = {
	/*firstName: 'Gianluca',
	id: {$in: [1, 2, 3]},
	age: {$gt: 18, $lt: 30, $ne: 25},
	score: {$gte: 5, $lte: 10,},
	lastName: {$ne: 'Pengo'},
	city: {$nin: ['Milano', 'Roma']},
	interest: {$all: ['travel', 'sport']},
	visitedCity: {$elementMatch: ['london', 'paris', 'madrid']},
	likes: {$size: 3},
	banned: {$exist: true},
	date: {$type: 'date'},
	qty: {$mod: [4,0]},
	fullName: {$regex: /gian/},*/
	$not: {qty: {$mod: [4,0]}}

};

var fields = {
//	firstName: 1,
	lastName: 0,
//	subs: {$slice: 2},
}


console.log(queryComposer.composeQuery(select, fields, model));