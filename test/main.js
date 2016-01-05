'use strict';

const sass = require('gulp-sass');
const less = require('gulp-less');
const jsonCss = require('../');
const gUtil = require('gulp-util');
const path = require('path');
const concat = require('gulp-concat');
const through2 = require('through2');
const gulp = require('gulp');
const fs = require('fs');
const test = require('tape');
const chalk = require('chalk');

const runTests = function(t, opt) {
	const suffix = opt.targetPre;

	opt.sassShouldCompile = opt.sassShouldCompile === undefined ? true : opt.sassShouldCompile;
	opt.jsonShouldCompile = opt.jsonShouldCompile === undefined ? true : opt.jsonShouldCompile;

	let fileObj;
	let failedCompilation = false;
	let failedJsonCompilation = false;

	const stream = through2.obj((file, encoding, done) => {
		if(file.path.match('stub')) {
			fileObj = file;
		}

		this.push(file);

		done();
	});

	stream
		.pipe(jsonCss(opt))
		.on('error', () => {
			failedJsonCompilation = true;
			t.end();
		})
		.pipe(through2.obj((file, encoding, done) => {
			if(!file.path.match('stub')) {
				t.equal(file.contents.toString().split('\n').length, 6, 'test json should result in a 6 line file');
			} else {
				t.equal(file.contents.toString(), fileObj.contents.toString(), 'non-json files should not be modified (content)');
				t.equal(file.path, fileObj.path, 'non-json files should not be modified (file path)');
			}
			this.push(file);
			done();
		}))
		.pipe(concat('test.' + suffix))
		.pipe(suffix === 'less' ? less() : sass())
		.on('end', function() {
			if(opt.jsonShouldCompile && !failedJsonCompilation) {
				t.pass('json compiled successfully, as expected');
			} else if(!opt.jsonShouldCompile && failedJsonCompilation) {
				t.pass('json failed to compile, as expected');
			} else if(opt.jsonShouldCompile && failedJsonCompilation) {
				t.fail('json failed to compile when expected to pass');
			} else if(!opt.jsonShouldCompile && !failedJsonCompilation) {
				t.fail('json compiled when it was expected to fail');
			}
		})
		.on('error', () => {
			failedCompilation = true;
		})
		.pipe(through2.obj((file, encoding, done) => {
			t.end();
			done();
		}));

	stream.write(new gUtil.File({
		path: opt.src,
		contents: fs.readFileSync(opt.src)
	}));

	stream.write(new gUtil.File({
		path: path.join(__dirname, './fixtures/stub.' + suffix),
		contents: fs.readFileSync(path.join(__dirname, './fixtures/stub.' + suffix))
	}));

	stream.end();
}

function setupTest(name, opt) {
	test(name, (t) => {
		console.log(chalk.yellow('Test: ' + name) + chalk.green(' (' + opt.targetPre + ' mode)'));
		runTests(t, opt);
	})
}

const preprocessor = ['scss', 'sass', 'less'];

for(let i = 0; i < preprocessor.length; i++) {
	setupTest('base case', {
		src: path.join(__dirname, './fixtures/base.json'),
		targetPre: preprocessor[i]
	});

	setupTest('proper support for variables that begin with numbers', {
		src: path.join(__dirname, './fixtures/numbers.json'),
		targetPre: preprocessor[i]
	});

	setupTest('proper support for escaping illegal characters', {
		src: path.join(__dirname, './fixtures/escape.json'),
		targetPre: preprocessor[i]
	});

}

