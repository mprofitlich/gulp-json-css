'use strict';

const through = require('through');
const chalk = require('chalk');
const gulpMatch = require('gulp-match');
const path = require('path');
const gUtil = require('gulp-util');
const merge = require('merge');

const defaults = {
	delim: '-',
	targetPre: 'scss',
	eol: ';',
	ignoreJsonErrors: false,
	numberPrefix: '_',
	pre: '$'
};

let settings;

// from http://stackoverflow.com/questions/17191265/legal-characters-for-sass-and-scss-variable-names
const invalidCharactersRegex = /(["!#$%&'()*+,.\/:;\s<=>?@\[\]^\{\}|~])/g;

const removeInvalidCharacters = function(str) {
	return str.replace(invalidCharactersRegex, '');
};

const firstCharacterIsNumber = /^[0-9]/;

const loadVariablesRecursive = function(obj, path, cb) {
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

			if(typeof val === 'object') {
				loadVariablesRecursive(val, path + key + settings.delim, cb);
			} else {
				cb(settings.pre + path + key + ': ' + val + settings.eol);
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

	loadVariablesRecursive(parsedJSON, '', (assignmentString) => {
		variables.push(assignmentString);
	});

	const content = variables.join('\n');

	file.contents = Buffer(content);

	file.path = gUtil.replaceExtension(file.path, '.' + settings.targetPre);

	this.push(file);
};

module.exports = function(config) {
	settings = merge(defaults, config);

	switch(settings.targetPre) {
		case 'scss':
		case 'sass':
			settings.pre = '$';
			break;
		case 'less':
			settings.pre = '@';
			break;
	}

	return through(processJSON);
};