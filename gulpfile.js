var gulp = require('gulp'),
	sass = require('gulp-sass'),
	browserSync = require('browser-sync'),
	concat = require('gulp-concat'),
	uglify = require('gulp-uglify-es').default,
	cleancss = require('gulp-clean-css'),
	autoprefixer = require('gulp-autoprefixer'),
	rsync = require('gulp-rsync'),
	newer = require('gulp-newer'),
	rename = require('gulp-rename'),
	responsive = require('gulp-responsive'),
	del = require('del'),
	svgmin = require('gulp-svgmin'),
	webp = require('gulp-webp');

// Local Server
gulp.task('browser-sync', function () {
	browserSync({
		server: {
			baseDir: 'app'
		},
		notify: false,
		// online: false, // Work offline without internet connection
		// tunnel: 'vsevolod',
		// Demonstration page: http://vsevolod.localtunnel.me
	})
});

function bsReload(done) {
	browserSync.reload();
	done();
};

// Custom Styles
gulp.task('styles', function () {
	return gulp.src('app/sass/**/*.sass')
		.pipe(sass({
			outputStyle: 'expanded'
		}))
		.pipe(concat('styles.min.css'))
		.pipe(autoprefixer({
			grid: true,
			overrideBrowserslist: ['last 10 versions']
		}))
		.pipe(cleancss({
			level: {
				1: {
					specialComments: 0
				}
			}
		})) // Optional. Comment out when debugging
		.pipe(gulp.dest('app/css'))
		.pipe(browserSync.stream())
});

// Scripts & JS Libraries
gulp.task('scripts', function () {
	return gulp.src([
			// 'node_modules/jquery/dist/jquery.min.js', // Optional jQuery plug-in (npm i --save-dev jquery)
			'app/js/_lazy.js', // JS library plug-in example
			'app/js/_custom.js', // Custom scripts. Always at the end
		])
		.pipe(concat('scripts.min.js'))
		.pipe(uglify()) // Mifify js (opt.)
		.pipe(gulp.dest('app/js'))
		.pipe(browserSync.reload({
			stream: true
		}))
});

//SVG
gulp.task('svg', async function () {
	return gulp.src('app/img/_src/*.svg', {allowEmpty: true})
		.pipe(newer('app/img/svg'))
		.pipe(svgmin({
			plugins: [
				{
					convertPathData: {
						floatPrecision: 2
					}
				},
				{
					cleanupListOfValues: {
						floatPrecision: 2
					}
				},
				{
					removeViewBox: {
						active: false
					}
				},
				{
					removeDimensions: {
						active: true
					}
				},
				{
					sortAttrs: {
						active: true
					}
				}
			],
			js2svg: {
				// pretty: true
			}
		}))
		.pipe(gulp.dest('app/img/svg/'));
});

// Responsive Images
gulp.task('img-responsive', async function () {
	return gulp.src('app/img/_src/**/*.{png,jpg,jpeg,raw}')
		.pipe(newer({dest: 'app/img/@1x', ext: '.webp'}))
		.pipe(webp())
		.pipe(responsive({
			'*': [{
				// Produce @2x images
				width: '100%',
				quality: 90,
				rename: {
					prefix: '@2x/',
				},
			}, {
				// Produce @1x images
				width: '50%',
				quality: 90,
				rename: {
					prefix: '@1x/',
				}
			}]
		})).on('error', function () {
			console.log('No matching images found')
		})
		.pipe(rename(function (path) {
			path.extname = path.extname.replace('jpeg', 'jpg')
		}))
		.pipe(gulp.dest('app/img'))
});
gulp.task('img', gulp.series(gulp.parallel('img-responsive', 'svg'), bsReload));

// Clean @*x IMG's
gulp.task('cleanimg', function () {
	return del(['app/img/@*'], {
		force: true
	})
});

// Code & Reload
gulp.task('code', function () {
	return gulp.src('app/**/*.html')
		.pipe(browserSync.reload({
			stream: true
		}))
});

// Deploy
gulp.task('rsync', function () {
	return gulp.src('app/')
		.pipe(rsync({
			root: 'app/',
			hostname: 'username@yousite.com',
			destination: 'yousite/public_html/',
			// include: ['*.htaccess'], // Included files
			exclude: ['**/Thumbs.db', '**/*.DS_Store'], // Excluded files
			recursive: true,
			archive: true,
			silent: false,
			compress: true
		}))
});

//Remove dist folder
gulp.task('removedist', gulp.series(function(done) { 
	del.sync('dist'); 
	done();
}));

//Build
gulp.task('build', gulp.series('removedist', 'img', 'styles', 'scripts', function transferAll(done) {
	gulp.src(['app/*.html',	'app/.htaccess',], { allowEmpty: true }).pipe(gulp.dest('dist'));
	gulp.src('app/css/styles.min.css', { allowEmpty: true }).pipe(gulp.dest('dist/css'));
	gulp.src('app/js/scripts.min.js', { allowEmpty: true }).pipe(gulp.dest('dist/js'));
	gulp.src('app/fonts/*.woff2', { allowEmpty: true }).pipe(gulp.dest('dist/fonts'));
	gulp.src('app/img/!(_*)/*', { allowEmpty: true }).pipe(gulp.dest('dist/img'));
	done();
}));

gulp.task('watch', function () {
	gulp.watch('app/sass/**/*.sass', gulp.parallel('styles'));
	gulp.watch(['libs/**/*.js', 'app/js/_custom.js'], gulp.parallel('scripts'));
	gulp.watch('app/*.html', gulp.parallel('code'));
	gulp.watch('app/img/_src/**/*', gulp.parallel('img'));
});

gulp.task('default', gulp.parallel('img', 'styles', 'scripts', 'browser-sync', 'watch'));