const gulp = require('gulp'),
      gulpif = require('gulp-if'),
      del = require('del'),
      rename = require('gulp-rename'),
      gulpSass = require('gulp-sass')(require('sass'));
      sass = require('sass');
      pug = require('gulp-pug'),
      autoprefixer = require('gulp-autoprefixer'),
      sourcemaps = require('gulp-sourcemaps'),
      emitty = require('emitty').setup('src/templates', 'pug'),
      browserSync = require('browser-sync').create(),
      reload = browserSync.reload,
      concat = require('gulp-concat'),
      babel = require('gulp-babel'),
      uglify = require('gulp-uglify'),
      imagemin = require('gulp-imagemin'),
      package = require('./package.json');


// Define reusable paths

const path = {
  src: 'src',
  dist: 'dist',
  src_pug: 'src/templates',
  src_scss: 'src/scss',
  src_js: 'src/js',
  src_fonts: 'src/fonts',
  dist_vendor: 'dist/vendor',
  src_js_vendor: 'src/vendor/js',
  src_css_vendor: 'src/vendor/css',
  dist_fonts: 'dist/fonts',
  dist_js: 'dist/js',
  dist_css: 'dist/css',
  root_package: 'package.json'
}


// Sass compiling

// Expanded
gulp.task('sass:expanded', () => {
  const options = {
    outputStyle: 'expanded',
    precision: 10 // rounding of css color values, etc..
  };
  return gulp.src(path.src_scss + '/theme.scss')
    .pipe(gulpSass(options).on('error', gulpSass.logError))
    .pipe(autoprefixer({
      cascade: false
    }))
    .pipe(gulp.dest(path.dist_css))
    .pipe(browserSync.stream()); // Inject css into browser
});

// Minified
gulp.task('sass:minified', () => {
  const options = {
    outputStyle: 'compressed',
    precision: 10 // rounding of css color values, etc..
  };
  return gulp.src(path.src_scss + '/theme.scss')
    .pipe(sourcemaps.init())
    .pipe(gulpSass(options).on('error', gulpSass.logError))
    .pipe(autoprefixer({
      cascade: false
    }))
    .pipe(rename({ suffix: '.min'}))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(path.dist_css))
    .pipe(browserSync.stream()); // Inject css into browser
});


// Main theme js file compilation and minification

gulp.task('js', () => {
  return gulp.src(path.src_js + '/theme.js')
    .pipe(rename('theme.min.js'))
    .pipe(babel({
      presets: ['@babel/env']
    }))
    // .pipe(uglify())
    .pipe(gulp.dest(path.dist_js))
    .on('end', () => {
      reload(); // One time browser reload at end of uglification (minification)
    });
});


// Pug compiling

// The pug task below is adapted from
// https://github.com/mrmlnc/emitty/blob/master/examples/stream-performance.js

// stream-performance
gulp.task('pug', () =>
  new Promise((resolve, reject) => {
    const sourceOptions = {
      cwd: path.src_pug,
      base: path.src_pug // This causes the components and docs subfolders to be mirrored in dist folder
    };

    emitty.scan(global.emittyChangedFile).then(() => {
      gulp.src(['*.pug'], sourceOptions)
        .pipe(gulpif(global.watch, emitty.filter(global.emittyChangedFile)))
        .pipe(pug({ pretty: true }))
        .pipe(gulp.dest(path.dist))
        .on('error', reject)
        .on('end', () => {
          reload(); // One time browser reload at end of pug compilation
          resolve();
         })
      });
  })
);

// Concatinate various vendor css files

gulp.task('concat:css', () => {
  return gulp.src([
    path.src_css_vendor + '/*.css'
  ])
    .pipe(concat('vendor.min.css'))
    .pipe(gulp.dest(path.dist_css))
    .pipe(browserSync.stream()); // Injects css into browser
});


// Concatinate various vendor js files

gulp.task('concat:js', () => {
  return gulp.src([
    path.src_js_vendor + '/*.js',
    '!' + path.src_js_vendor + '/jquery-3.1.0.min.js',
  ])
    .pipe(concat('vendor.min.js'))
    .pipe(gulp.dest(path.dist_js))
    .on('end', () => {
      reload(); // One time browser reload at end of concatination
    });
});

// Move some vendor css files to dist/css folder

// gulp.task('move:css', () => {
//   return gulp.src([
//     path.src_css_vendor + '/chartist.min.css',
//     path.src_css_vendor + '/prism.min.css'
//   ])
//     .pipe(gulp.dest(path.dist_css));
// });


// Move some vendor js files to dist/js folder

gulp.task('move:js', () => {
  return gulp.src([
    path.src_js_vendor + '/jquery-3.1.0.min.js'
  ])
    .pipe(gulp.dest(path.dist_js));
});

gulp.task('exports', () => {
  return gulp.src(path.src + '/img/**/*')
    .pipe(imagemin())
    .pipe(gulp.dest(path.dist + '/img'))
});

gulp.task('vendor:clean', () => {
  return del(path.dist_vendor);
});

// Uglify (minify) + polyfill (Babel) theme core scripts.js file

gulp.task('uglify:js', () => {
  return gulp.src(path.src_js + '/theme.js')
    .pipe(rename('theme.min.js'))
    .pipe(babel({
      presets: ['@babel/env']
    }))
    // .pipe(uglify())
    .pipe(gulp.dest(path.dist_js))
    .on('end', () => {
      reload(); // One time browser reload at end of uglification (minification)
    });
});


// gulp.task('vendor', gulp.series('vendor:clean', 'vendor:move'));


// Clean certain files/folders from dist directory. Runs before compilation of new files. See 'default' task at the most bottom of this file

gulp.task('clean', () => {
  return del([
    path.dist_css,
    path.dist_js,
    path.dist + '/*.html'
  ]);
});


// Watcher

gulp.task('watch', () => {
  global.watch = true; // Let the pug task know that we are running in "watch" mode

  // BrowserSync
  browserSync.init({
    server: {
      baseDir: path.dist,
    },
    open: true, // or "local"
  });
  gulp.watch(path.src_pug + '/**/*.pug', gulp.series('pug'))
    .on('all', (event, filepath) => {
      global.emittyChangedFile = filepath;
    });
    gulp.watch(path.src_scss + '/**/*.scss', gulp.series('sass:minified', 'sass:expanded'));
    gulp.watch(path.src_js + '/*.js', gulp.series('js'));
    gulp.watch(path.src + '/img/*', gulp.series('exports'));
});


// Default task - the dependent tasks will run in parallell / excluding Docs and Components compilation

gulp.task(
  'default',
  gulp.series('clean', gulp.parallel('exports', 'concat:js', 'move:js', 'concat:css', 'uglify:js', 'pug', 'js', 'sass:minified', 'sass:expanded'), 'watch')
);
