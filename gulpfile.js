/* global -$ */
'use strict';

var gulp = require('gulp');
var $ = require('gulp-load-plugins')({
    pattern: ['gulp-*', 'gulp.*'],
    replaceString: /\bgulp[\-.]/,
    lazy: true,
    camelize: true
});
var browserSync = require('browser-sync');
var reload = browserSync.reload;

gulp.task('styles', function () {
  return gulp.src('app/css/main.scss')
    .pipe($.sourcemaps.init())
    .pipe($.sass({
      outputStyle: 'nested',
      precision: 10,
      includePaths: ['.', 'app/_sass'],
      onError: console.error.bind(console, 'Sass error:')
    }))
    .pipe($.postcss([
      require('autoprefixer-core')({browsers: ['last 2 version', 'ie 9']})
    ]))
    .pipe($.sourcemaps.write())
    .pipe(gulp.dest('.tmp/css/'))
    .pipe(reload({stream: true}));
});

gulp.task('jshint', function () {
  return gulp.src(['gulpfile.js', 'app/js/**/*.js'])
    .pipe(reload({stream: true, once: true}))
    .pipe($.jshint())
    .pipe($.jshint.reporter('jshint-stylish'))
    .pipe($.if(!browserSync.active, $.jshint.reporter('fail')));
});

gulp.task('jekyll', function () {
  return gulp.src('_config.yml')
    .pipe($.shell([
      'jekyll build --config <%= file.path %>'
    ]))
    .pipe(reload({stream: true}));
});

gulp.task('html', ['styles', 'jekyll'], function () {
  var assets = $.useref.assets({searchPath: ['.tmp', 'app', '.']});
  var baseurl = 'beer-review'
  var htmlPattern = /(href|src)(=["|']?\/)([^\/])/gi;
  var htmlReplacement = '$1$2' + baseurl + '/$3';
  var cssPattern = /(url\(['|"]?\/)([^\/])/gi;
  var cssReplacement = '$1' + baseurl + '/$2';

  return gulp.src('dist/**/*.html')
    .pipe(assets)
    .pipe($.if('*.js', $.uglify()))
    .pipe($.if('*.css', $.csso()))
    .pipe(assets.restore())
    .pipe($.useref())
    .pipe($.if('*.html', $.minifyHtml({conditionals: true, loose: true})))
    .pipe($.if('*.html', $.replace(htmlPattern, htmlReplacement)))
    .pipe($.if('*.css', $.replace(cssPattern, cssReplacement)))
    .pipe(gulp.dest('dist'));
});

gulp.task('images', function () {
  return gulp.src('app/img/**/*')
    .pipe(gulp.dest('dist/img/'));
});

gulp.task('extras', function () {
  return gulp.src([
    'app/*.*',
    '!app/feed.xml',
    '!app/*.html'
  ], {
    dot: true
  }).pipe(gulp.dest('dist'));
});

gulp.task('clean', require('del').bind(null, ['.tmp', 'dist']));

gulp.task('serve', ['clean', 'styles', 'jekyll'], function () {
  browserSync({
    notify: false,
    port: 9000,
    server: {
      baseDir: ['dist', '.tmp', 'app'],
      routes: {
        '/bower_components': 'bower_components'
      }
    }
  });

  gulp.watch([
    'app/js/**/*.js',
    'app/img/**/*'
  ]).on('change', reload);

  gulp.watch('app/**/*.{md,markdown,html}', ['jekyll']);
  gulp.watch('app/{css,_sass}/**/*.scss', ['styles']);
  gulp.watch('bower.json', ['wiredep']);
});

gulp.task('wiredep', function () {
  var wiredep = require('wiredep').stream;

  gulp.src('app/css/*.scss')
    .pipe(wiredep({
      ignorePath: /^(\.\.\/)+/
    }))
    .pipe(gulp.dest('app/css'));

  gulp.src('app/**/*.html')
    .pipe(wiredep({
      ignorePath: /^(\.\.\/)*\.\./
    }))
    .pipe(gulp.dest('app'));
});

gulp.task('build', ['jshint', 'html', 'images', 'extras'], function () {
  return gulp.src('dist/**/*')
    .pipe($.size({title: 'build', gzip: true}));
});

gulp.task('default', ['clean', 'watch'], function () {
  gulp.start('build');
});
