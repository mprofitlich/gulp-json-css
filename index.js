'use strict';

const through = require('through');
const chalk = require('chalk');
const gulpMatch = require('gulp-match');
const path = require('path');
const gUtil = require('gulp-util');
const merge = require('merge');

const defaults = {
	targetPre: 'scss',
	delim: '-',
	keepObjects: false,
	numberPrefix: '_',
	ignoreJsonErrors: false,
	eol: ';',
	pre: '$',
	propAssign: ': '
};

let settings;

// from http://stackoverflow.com/questions/17191265/legal-characters-for-sass-and-scss-variable-names
const keyInvalidCharactersRegex = /(["!#$%&'()*+,.\/:;\s<=>?@\[\]^\{\}|~])/g;

const removeInvalidCharacters = function(str) {
	return str.replace(keyInvalidCharactersRegex, '');
};

const firstCharacterIsNumber = /^[0-9]/;

const valueInvalidCharactersRegex = /[.\-\[\]{}():]/;

const needsQuotes = function(value) {
	// Nur Strings prüfen
	if (typeof value !== 'string') {
		return false;
	}
	
	return valueInvalidCharactersRegex.test(value);
};

const formatValue = function(value) {
	if (needsQuotes(value)) {
		return '"' + value + '"';
	}
	return value;
};

const buildVariablesRecursive = function(obj, path, cb) {
	let val;
	let key;

	for(key in obj) {
		if(obj.hasOwnProperty(key)) {
			val = obj[key];

			// remove invalid characters
			key = removeInvalidCharacters(key);

			// variables cannot begin with a number
			if(path === '' && firstCharacterIsNumber.exec(key)) {
				key = settings.numberPrefix + key;
			}

			if(val.constructor == Object) {
				buildVariablesRecursive(val, path + key + settings.delim, cb);
			} else if(val.constructor == Array) {
				// always write arrays out as lists if we have the keepObjects setting
				if(settings.keepObjects) {
					// Format array values properly
					const formattedArray = val.map(item => formatValue(item));
					cb(settings.pre + path + key + ': ' + formattedArray.join(', ') + settings.eol);
				} else {
					buildVariablesRecursive(val, path + key + settings.delim, cb);
				}
			} else {
				// Format the value properly
				const formattedVal = formatValue(val);
				cb(settings.pre + path + key + ': ' + formattedVal + settings.eol);
			}
		}
	}
};

let line = '';

const buildMapListRecursive = function(obj, isTop, cb) {
	let key;

	for(key in obj) {
		if(obj.hasOwnProperty(key)) {
			let val = obj[key];
			let allKeys = Object.keys(obj);
			let isLastKey = allKeys.length && allKeys[allKeys.length - 1] === key;

			// remove invalid characters
			key = removeInvalidCharacters(key);

			// variables cannot begin with a number
			if(firstCharacterIsNumber.exec(key)) {
				key = settings.numberPrefix + key;
			}

			if(val.constructor == Object) {
				if(isTop) {
					switch(settings.targetPre) {
						case 'sass':
						case 'scss':
							line += settings.pre + key + ': (';
							buildMapListRecursive(val, false);
							line += ')' + settings.eol;
							break;
						case 'less':
							// we cannot have nested objects in less so we build the default path variable
							buildVariablesRecursive(val, key + settings.delim, cb);
							break;
					}
				} else {
					switch(settings.targetPre) {
						case 'sass':
						case 'scss':
							line += key + settings.propAssign + '(';
							buildMapListRecursive(val, false);
							line += ')';

							if(!isLastKey) {
								line += ', ';
							}
							break;
						case 'less':
							// we cannot have nested objects in less so we build the default path variable
							buildVariablesRecursive(val, key + settings.delim, cb);
							break;
					}
				}
			} else if(val.constructor == Array) {
				const formattedArray = val.map(item => formatValue(item));
				if(isTop) {
					line += settings.pre + key + ': ' + formattedArray.join(', ') + settings.eol;
				} else {
					line += key + settings.propAssign + '(' + formattedArray.join(', ') + ')';

					if(!isLastKey) {
						line += ', ';
					}
				}
			} else {
				const formattedVal = formatValue(val);
				if(isTop) {
					line += settings.pre + key + ': ' + formattedVal + settings.eol;
				} else {
					line += key + settings.propAssign + formattedVal;

					if(!isLastKey) {
						line += ', ';
					}
				}
			}

			if(cb) {
				cb(line);
				line = '';
			}
		}
	}
};

const processJSON = function(file) {
	let parsedJSON;

	// if it does not have a .json suffix, ignore the file
	if(!gulpMatch(file, '**/*.json')) {
		this.push(file);
		return;
	}

	// load the JSON
	try {
		parsedJSON = JSON.parse(file.contents);
	} catch(e) {
		if(settings.ignoreJsonErrors) {
			console.log(chalk.yellow('[gulp-json-css]') + ' Invalid JSON in ' + file.path + '. (Continuing.)');
		} else {
			console.log(chalk.red('[gulp-json-css]') + ' Invalid JSON in ' + file.path);
			this.emit('error', e);
		}
		return;
	}

	// process the JSON
	const variables = [];

	if(settings.keepObjects) {
		buildMapListRecursive(parsedJSON, true, (assignmentString) => {
			variables.push(assignmentString);
		});
	} else {
		buildVariablesRecursive(parsedJSON, '', (assignmentString) => {
			variables.push(assignmentString);
		});
	}

	const content = variables.join('\n');

	file.contents = Buffer(content);

	file.path = gUtil.replaceExtension(file.path, '.' + settings.targetPre);

	this.push(file);
};

module.exports = function(config) {
	settings = merge(defaults, config);

	switch(settings.targetPre) {
		case 'scss':
			settings.pre = '$';
			settings.eol = ';';
			break;
		case 'sass':
			settings.pre = '$';
			settings.eol = '';
			break;
		case 'less':
			settings.pre = '@';
			settings.eol = ';';
			break;
	}

	return through(processJSON);
};