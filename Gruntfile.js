/* jshint node:true */

module.exports = function( grunt ) {
	grunt.loadNpmTasks( 'grunt-contrib-jshint' );
	require( 'matchdep' ).filterDev( ['grunt-*'] ).forEach( grunt.loadNpmTasks );

	grunt.initConfig( {
		pkg: grunt.file.readJSON( 'package.json' ),
		jshint: {
			options: grunt.file.readJSON( '.jshintrc' ),
			files: [
				'Gruntfile.js',
				'js/*.js',
				'!js/modal.js',
				'!**/*.min.js'
			]
		},
		uglify: {
			tinymce: {
				src: 'js/tinymce.*.js',
				dest: 'js/tinymce.min.js'
			},
			rest: {
				expand: true,
				cwd: 'js/',
				dest: 'js/',
				ext: '.min.js',
				src: [
					'*.js',
					'!*.min.js',
					'!tinymce.*.js'
				]
			}
		},
		jsvalidate:{
			options: {
				globals: {},
				esprimaOptions:{},
				verbose: false
			},
			files: {
				src: 'js/*.js'
			}
		}
	});

	grunt.registerTask( 'default', [ 'jshint' ] );
	grunt.registerTask( 'build', [ 'uglify', 'jsvalidate' ] );
};
