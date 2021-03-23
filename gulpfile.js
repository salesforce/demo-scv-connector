/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

require("@babel/register")({
  ignore: [/node_modules/]
});
require('custom-env').env();

const gulp = require('gulp');
const jest = require('gulp-jest').default;
const eslint = require('gulp-eslint');
const webpackStream = require('webpack-stream');
const shell = require('gulp-shell');
const argv = require('yargs').argv;
const replace = require('gulp-replace');
const replaceName = require('gulp-replace-name');

const source = ['src/main/index.js'];

gulp.task('lint', function() {
    return gulp.src(['./src/main/*.js', './src/main/common/*.js', './src/test/*.js', './src/remote-control/*.js'])
        .pipe(eslint({compilers: "js:babel-core/register"}))
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
});

gulp.task('test', function() {
    return gulp.src('./src/test')
        .pipe(jest({
            "reporters": ["default", "./node_modules/jest-html-reporter"],
            "collectCoverageFrom": [
                "**/main/connector*",
                "**/main/vendor-sdk*"
            ],
            "collectCoverage": true,
            "clearMocks": true,
            "transformIgnorePatterns": [
                "/node_modules/(?!scv-connector-base).+\\.js$"
           ]
        }));
});

gulp.task('bundle', gulp.series('lint', 'test', function() {

    var webpackConfig = {
        output: require('./webpack.config').output,
        module: require('./webpack.config').module
    };

    var mode = argv.mode;
    if (mode === 'prod') {
        webpackConfig.mode = 'production';
        webpackConfig.output.filename = 'main.bundle_min.js';
    } else {
        webpackConfig.mode = 'development';
        webpackConfig.devtool = false;
    }

    return gulp.src(source)
        .pipe(webpackStream(webpackConfig))
        .pipe(gulp.dest('./dist/'));
}));

gulp.task('default', gulp.series('bundle'));

gulp.task('dist', shell.task([
    'gulp bundle --mode dev',
    'gulp bundle --mode prod',
    'gulp fingerprinting'
]));

gulp.task('fingerprinting', function(){
    const timestamp = new Date().getTime();
    return gulp.src('public/app*.html')
    .pipe(
        replace('.js', function() {
          return '.js?t=' + timestamp;
        })
    )
    .pipe(
        replace('/assets/', function() {
          return '';
        })
    )
    .pipe(replaceName(/app/g, 'index'))
    .pipe(gulp.dest('./dist/'));
});
