/* jshint node:true */

module.exports = function( grunt ) {
	grunt.loadNpmTasks( 'grunt-contrib-jshint' );

	grunt.initConfig( {
		pkg: grunt.file.readJSON( 'package.json' ),
		jshint: {
			options: grunt.file.readJSON( '.jshintrc' ),
			files: [
				'Gruntfile.js',
				'js/*.js'
			]
		}
	});

	grunt.registerTask( 'default', [ 'jshint' ] );
};
