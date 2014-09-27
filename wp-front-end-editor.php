<?php

/*
Plugin Name: WordPress Front-end Editor
Plugin URI: http://wordpress.org/plugins/wp-front-end-editor/
Description: WordPress Front-end Editor
Author: Janneke Van Dorpe
Author URI: http://make.wordpress.org/ui/tag/front-end-editor/
Version: 1.0.0-beta1.1
Text Domain: wp-front-end-editor
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html
*/

if ( class_exists( 'FEE' ) ) {
	return;
}

require_once( 'class-fee.php' );

new FEE;
