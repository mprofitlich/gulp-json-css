# Gulp-json-css

> Gulp plugin for turning JSON files into files of scss/sass/less variable definitions. This plugin is based on https://www.npmjs.com/package/gulp-json-sass

*Issues should be reported on the [issue tracker](https://github.com/SimonHarte/gulp-json-sass/issues).*

This JSON file can also be read by your Javascript. This will make it easier to keep your JS code used for layout and your CSS code in sync.

Supports all JSON objects, including nested objects, arrays and keys which are not legal key names.
Variable names that begin with a number will be prefixed and variable names containing illegal characters will have those characters removed.

Ignores (passes through) files with a extensions other than `.json`.

## Installation

```sh
npm install gulp-json-css --save-dev
```

## Example

In this example gulpfile, a JSON file is turned into a file of scss variables, concatenated with a scss file, and compiled using `gulp-sass`.

```js
var jsonCss = require('gulp-json-css'),
    gulp = require('gulp'),
    concat = require('gulp-concat'),
    sass = require('gulp-sass');

gulp.task('scss', function() {
  return gulp
    .src(['example.json', 'example.scss'])
    .pipe(jsonCss())
    .pipe(concat('output.scss'))
    .pipe(sass())
    .pipe(gulp.dest('out/'));
});
```

## API

### jsonCss(options)

Returns: `stream`

#### options

Type: `object`

##### delim

Type: `string`  
Default: `-`

String used to delimit nested objects. For example, if `delim` is `'-'`, then

```js
{
  "someObject" : {
    "someKey" : 123
  }
}
```

will be converted into (in scss mode):

```scss
$someObject-someKey: 123;
```

Note that keys can contain the delimiter. No attempt is made to ensure that variable names are unique.

##### ignoreJsonErrors

Type: `boolean`  
Default: `false`

If true, malformed JSON does not result in the plugin emitting an error.

##### numberPrefix

Type: `string`  
Default: `_`

What string to use to prefix numeric top-level keys. It is necessary since variables aren't allowed to start with a number.
This means that the following object:

```js
{
  "1maca" : {
    "2maca" : "asdf"
  },
  "3maca" : "rena"
}
```

Will result in (scss mode):

```scss
$_1maca-2maca: asdf;
$_3maca: rena;
```

## License

MIT.