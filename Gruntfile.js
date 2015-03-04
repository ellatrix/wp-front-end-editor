module.exports = function( grunt ) {
	var SOURCE_DIR = 'src/';
	var BUILD_DIR = 'build/';
	var SVN = 'https://plugins.svn.wordpress.org';

	require( 'matchdep' ).filterDev( ['grunt-*'] ).forEach( grunt.loadNpmTasks );

	grunt.initConfig( {
		pkg: grunt.file.readJSON( 'package.json' ),
		getContributors: function( pkg ) {
			return [ pkg.author ].concat( pkg.contributors ).map( function( person ) {
				return person.wp.username;
			} ).join( ', ' );
		},
		clean: {
			all: [ BUILD_DIR ],
			svn: [ BUILD_DIR + '*', '!' + BUILD_DIR + '.svn' ]
		},
		copy: {
			all: {
				expand: true,
				cwd: SOURCE_DIR,
				src: '**',
				dest: BUILD_DIR
			},
			templates: {
				options: {
					process: grunt.template.process
				},
				expand: true,
				cwd: SOURCE_DIR,
				src: [
					'plugin.php',
					'readme.txt'
				],
				dest: BUILD_DIR
			},
			pkg: {
				src: 'package.json',
				dest: BUILD_DIR
			}
		},
		jshint: {
			options: grunt.file.readJSON( '.jshintrc' ),
			all: {
				expand: true,
				cwd: SOURCE_DIR,
				src: [
					'js/*.js',
					'!js/modal.js'
				]
			},
			grunt: {
				options: {
					node: true
				},
				src: [
					'Gruntfile.js'
				]
			}
		},
		jsvalidate:{
			options: {
				verbose: false
			},
			all: {
				src: BUILD_DIR + 'js/*.js'
			}
		},
		svn: {
			checkout: {
				cmd: 'checkout ' + SVN + '/<%= pkg.name %>/trunk ' + BUILD_DIR
			},
			tag: {
				cmd: 'copy ' + SVN + '/<%= pkg.name %>/trunk ' + SVN + '/<%= pkg.name %>/tags/<%= pkg.version %> -m "<%= pkg.version %>"'
			}
		},
		uglify: {
			all: {
				expand: true,
				cwd: SOURCE_DIR,
				dest: BUILD_DIR,
				ext: '.min.js',
				src: [ 'js/*.js' ]
			}
		}
	} );

	grunt.registerMultiTask( 'svn', function() {
		grunt.util.spawn( {
			cmd: 'svn',
			args: this.data.cmd.split( ' ' ),
			opts: {
				stdio: 'inherit'
			}
		}, this.async() );
	} );

	grunt.registerTask( 'default', [ 'jshint' ] );
	grunt.registerTask( 'build', [ 'clean:all', 'svn:checkout', 'clean:svn', 'copy', 'uglify', 'jsvalidate' ] );
};
