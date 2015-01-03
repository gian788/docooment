var utils = require('./utils');

function parsePredicate(obj, field){
	//'gt gte lt lte ne in nin'
	//'all size elementMatch'
	//'exist type'
	//'mod regex text where'
	//'geoIntersect geoWithin nearSphere near' ==> 'box centerSphere geometry maxDistance minDistance polygon uniqueDocs'
	var pred = [];
	for(var j in obj){
		switch(j){
			case '$gt':
				pred.push('r.' + field + '>' + wrapValue(obj[j]));
			break;
			case '$gte':
				pred.push('r.' + field + '>=' + wrapValue(obj[j]));
			break;
			
			case '$lt':
				pred.push('r.' + field + '<' + wrapValue(obj[j]));
			break;
			case '$lte':
				pred.push('r.' + field + '<=' + wrapValue(obj[j]));
			break;
			
			case '$ne':
				pred.push('r.' + field + '<>' + wrapValue(obj[j]));
			break;

			case '$in':
				pred.push('inUDF(' + wrapArray(obj[j]) + ', ' + 'r.' + field + ')');
			break;
			case '$nin':
				pred.push('NOT(inUDF(' + wrapArray(obj[j]) + ', ' + 'r.' + field + '))');
			break;
			/*inUDF(array, val){
				for(var i = 0; i < array.length; i++)
					if(array[i] == val)
						return true;
				return false;
			}*/


			case '$all':
				pred.push('NOT(allUDF(' + wrapArray(obj[j]) + ', ' + 'r.' + field + '))');
			break;
			/*allUDF(array, arrayVal){
				for(var i = 0; i < array.length; i++){
					var found = false;
					for(var j = 0; j < arrayVal.length; j++){
						if(array[i] == arrayVal[j]){
							found = true;
							break;
						}
					}
					if(!found)
						return false;						
				}
				return true;
			}*/

			case '$elementMatch':
				pred.push('NOT(allUDF(' + wrapArray(obj[j]) + ', ' + 'r.' + field + '))');
			break;
			/*elemMatchUDF(array, arrayVal){
				for(var i = 0; i < array.length; i++)				
					for(var j = 0; j < arrayVal.length; j++)
						if(array[i] == arrayVal[j])
							return true;
				return false;
			}*/

			case '$size':
				pred.push('r.' + field + '.length=' + obj[j]);
			break;


			case '$exist':
				if(obj[j])
					pred.push('EXIST(' + 'r.' + field + ')');
				else
					pred.push('NOT(EXIST(' + 'r.' + field + '))');
			break;

			case '$type':
				pred.push('typeof(' + 'r.' + field + ')=\'' + obj[j] + '\'');
			break;


			case '$mod':
				pred.push('modUDF(' + obj[j][0] + ', ' + obj[j][1] + ', ' +  'r.' + field + ')');
			break;

			case '$regex':
				pred.push('(new RegExp(' + new RegExp(obj[j]).toString()+ ').test(' + 'r.' + field + '))');
			break;

			case '$text':
			case '$where':

			case '$geoIntersect':
			case '$geoWithin':
			case '$nearSphere':
			case '$near':
				console.log('Error: ' + j + ' operator not yet implemented!');
			break;
		}
	}
	return pred.join(' AND ');
}

function parseObject(obj){
	var queryPred = [];
	
	for(var i in obj){
		if(typeof(obj[i]) != 'object')
			queryPred.push('r.' + i + '=' + wrapValue(obj[i]));
		else
			queryPred.push(parsePredicate(obj[i], i));		
	}
	return queryPred.join(' AND ');
}

function wrapValue(val){
	switch(typeof(val)){
		case 'undefined':
			return '\'undefined\'';
		break;
		case 'string':
			return '\'' + val + '\'';
		break;
		case 'object':
			if(utils.isObjectId(val))
				return '\'' + val.toString() + '\'';
			if(utils.isDocoomentObject(val))
				return '\'' + val._id.toString() + '\'';

		case 'number':
		default:
			return val;
		break;
	}
}

function wrapArray(array){
	var ar = [];
	for(var i = 0; i < array.length; i++)
		ar.push(wrapValue(array[i]));

	return '[' + ar.join(',') + ']'
}



var getSelect = exports.getSelect = function(fields, model){
	var fieldsList = [],
		hideFieldsList = [],

		privateFields = ['_searchText', '__v'];

	for(var f in fields){
		if(typeof(f) == 'object')
			fieldsList.push(f);
		else if(fields[f] == 1)
			fieldsList.push(f);
		else
			hideFieldsList.push(f);
	}

	//remove field not in the model
	if(fieldsList.length > 0){
		for(var i in fieldsList)
			if(!model.schema.paths(i))
				delete fieldsList[i];
	}

	if(hideFieldsList.length > 0 && fieldsList.length == 0){
		var paths = {};
		for(var i in model.schema.paths){
			if(i.indexOf('.') == -1)
				paths[i] = 1;
			else
				paths[i.substring(0, i.indexOf('.'))] = 1;
		}

		//build the fieldList from hideFieldsList
		for(var i in paths){
			var skip = false;
			for(var k = 0; k < privateFields.length; k++)
				if(i == privateFields[k]){
					skip = true;
					break;
				}
			if(skip) continue;

			var found = false;
			for(var j in hideFieldsList){
				if(i == hideFieldsList[j]){
					found = true;
					break;
				}
			}
			if(!found)
				fieldsList.push(i);
		}
	}

	//@TODO: mangage select field option

	if(fieldsList.length == 0)
		return '*';

	for(var i = 0; i < fieldsList.length; i++)
		fieldsList[i] = 'r.' + fieldsList[i];
	return fieldsList.join(', ');
}

var getWhere = exports.getWhere = function(select){
	var query = '',
		queryPred = [];

	for(var i in select){
		if(i.indexOf('$') == 0){
			//'and nor not or'
			switch(i){
				case '$and':
					var pred = [];

					for(var p = 0; p < select[i].length; p++)
						pred.push(parseObject(select[i][p]));
					
					queryPred.push('(' + pred.join(' AND ') + ')');
				break;

				case '$nor':
					var pred = [];
					for(var p = 0; p < select[i].length; p++)
						pred.push(parseObject(select[i][p]));
					queryPred.push('NOT(' + pred.join(' AND ') + ')');

				break;

				case '$not':
					queryPred.push('NOT(' + parseObject(select[i]) + ')');
				break;

				case '$or':
					var pred = [];
					for(var p = 0; p < select[i].length; p++)
						pred.push(parseObject(select[i][p]));
					queryPred.push('(' + pred.join(' OR ') + ')');
				break;
			}
		} else if(typeof(select[i]) != 'object' || utils.isObjectId(select[i]))
			queryPred.push('r.' + i + '=' + wrapValue(select[i]));
		else
			queryPred.push(parsePredicate(select[i], i));

	}

	if(queryPred.length)
		return 'WHERE ' + queryPred.join(' AND ');	
	return '';
}

var composeQuery = exports.composeQuery = function(select, fields, model){
	return 'SELECT ' + getSelect(fields, model) + ' FROM root r ' + getWhere(select);
}
