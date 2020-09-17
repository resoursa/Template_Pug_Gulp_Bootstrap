let gulp = require('gulp'),
    gulpif = require('gulp-if'),
    del = require('del'),
    rename = require('gulp-rename'),
    sass = require('gulp-sass'),
    pug = require('gulp-pug'),
    autoprefixer = require('gulp-autoprefixer'),
    sourcemaps = require('gulp-sourcemaps'),
    emitty = require('emitty').setup('src/templates', 'pug'),
    browserSync = require('browser-sync').create(),
    reload = browserSync.reload,
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify-es').default;


// Define reusable paths
var path = {
  src: 'src',
  dist: 'dist',
  src_pug: 'src/templates',
  src_scss: 'src/scss',
  src_js: 'src/js',
  src_js_vendor: 'src/vendor/js',
  src_css_vendor: 'src/vendor/css',
  src_bootstrap_vendor: 'src/vendor/bootstrap',
  dist_js: 'dist/js',
  dist_css: 'dist/css',
}


// Sass compiling

// Bootsrap
gulp.task('sass:bootstrap', () => {
  const options = {
    outputStyle: 'compressed',
    precision: 10 // rounding of css color values, etc..
  };
  return gulp.src(path.src_bootstrap_vendor + '/bootstrap.scss')
    .pipe(sass(options).on('error', sass.logError))
    .pipe(autoprefixer({
      browsers: ['last 2 versions', 'ie 10', 'ie 11'],
      cascade: false
    }))
    .pipe(rename({ suffix: '.min'}))
    .pipe(gulp.dest(path.src_css_vendor));
});

// Expanded
gulp.task('sass:expanded', () => {
  const options = {
    outputStyle: 'expanded',
    precision: 10 // rounding of css color values, etc..
  };
  return gulp.src(path.src_scss + '/styles.scss')
    .pipe(sass(options).on('error', sass.logError))
    .pipe(autoprefixer({
      browsers: ['last 2 versions', 'ie 10', 'ie 11'],
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
  return gulp.src(path.src_scss + '/styles.scss')
    .pipe(sourcemaps.init())
    .pipe(sass(options).on('error', sass.logError))
    .pipe(autoprefixer({
      browsers: ['last 2 versions', 'ie 10', 'ie 11'],
      cascade: false
    }))
    .pipe(rename({ suffix: '.min'}))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(path.dist_css))
    .pipe(browserSync.stream()); // Inject css into browser
});


// Pug compiling

// The pug task below is adapted from
// https://github.com/mrmlnc/emitty/blob/master/examples/stream-performance.js

// stream-performance
gulp.task('pug', () =>
  new Promise((resolve, reject) => {
    const sourceOptions = {
      cwd: path.src_pug,
      base: path.src_pug // This causes the components and docs subfolders to be mirrored on dest
    };

    emitty.scan(global.emittyChangedFile).then(() => {
      gulp.src(['*.pug', 'components/*pug', 'docs/*.pug'], sourceOptions)
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


// Start BrowserSync server for autorefresh / syncing

gulp.task('browsersync', () => {
  browserSync.init({
    server: {
      baseDir: path.dist
    },
    browser: '',
    open: true, // or "local"
    notify: false
  });
});


// Concatinate various vendor css files

gulp.task('concat:css', () => {
  return gulp.src([
    path.src_css_vendor + '/bootstrap.min.css',
    path.src_css_vendor + '/*.css'
  ])
    .pipe(concat('vendor.min.css'))
    .pipe(gulp.dest(path.dist_css))
    .pipe(browserSync.stream()); // Injects css into browser
});


// Concatinate various vendor js files

gulp.task('concat:js', () => {
  return gulp.src([
      path.src_js_vendor + '/jquery-3.1.0.min.js',
      path.src_js_vendor + '/*.js',
      '!' + path.src_js_vendor + '/modernizr-custom.js'
    ])
    .pipe(concat('vendor.min.js'))
    .pipe(gulp.dest(path.dist_js))
    .on('end', () => {
      reload(); // One time browser reload at end of concatination
    });
});


// Move some vendor js files to dist/js folder

gulp.task('move:js', () => {
  return gulp.src([
      path.src_js_vendor + '/modernizr-custom.js'
    ])
    .pipe(gulp.dest(path.dist_js));
});


// Uglify (minify) our own scripts.js file

gulp.task('uglify:js', () => {
  return gulp.src(path.src_js + '/scripts.js')
    .pipe(rename('scripts.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest(path.dist_js))
    .on('end', () => {
      reload(); // One time browser reload at end of uglification (minification)
    });
});


// Clean certain files/folders from dist directory. Runs before compilation of new files. See 'default' task at the most bottom of this file

gulp.task('clean', () => {
  return del([
    path.dist_css,
    path.dist_js,
    path.dist + '/components'
    // path.dist + '/docs',
    // path.dist + '/*.html'
  ]);
});


// Watcher

gulp.task('watch', () => {
  global.watch = true; // Let the pug task know that we are running in "watch" mode
  gulp.watch(path.src_pug + '/**/*.pug', gulp.series('pug'))
    .on('all', (event, filepath) => {
      global.emittyChangedFile = filepath;
    });
  gulp.watch(path.src_css_vendor + '/*.css', gulp.series('concat:css'));
  gulp.watch(path.src_scss + '/**/*.scss', gulp.series('sass:minified', 'sass:expanded'));
  gulp.watch(path.src_js_vendor + '/*.js', gulp.series('concat:js'));
  gulp.watch(path.src_js + '/*.js', gulp.series('uglify:js'));
});


// Default task - the dependent tasks will run in parallell

gulp.task(
  'default',
  gulp.series('clean', 'sass:bootstrap', gulp.parallel('concat:js', 'move:js', 'concat:css', 'uglify:js', 'pug', 'sass:minified', 'sass:expanded', 'watch', 'browsersync'))
);
