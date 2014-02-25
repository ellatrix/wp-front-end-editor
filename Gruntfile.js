/* jshint node:true */

module.exports = function( grunt ) {

	grunt.loadNpmTasks( 'grunt-contrib-jshint' );

	grunt.initConfig( {
		pkg: grunt.file.readJSON( 'package.json' ),
		jshint: {
			options: {
				'boss': true,
				'curly': false,
				'eqeqeq': false,
				'eqnull': true,
				'es3': true,
				'expr': true,
				'immed': true,
				'noarg': true,
				'onevar': true,
				'quotmark': 'single',
				'trailing': true,
				'undef': true,
				'unused': true,
				'browser': true,
				'globals': {
					'_': false,
					'Backbone': false,
					'jQuery': false,
					'wp': false
				}
			},
			files: [
				'Gruntfile.js',
				'js/*.js',
				'!js/jquery.tipsy.js'
			]
		}
	});
	
	grunt.registerTask( 'default', [ 'jshint' ] );

};
