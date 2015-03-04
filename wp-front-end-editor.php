<?php

/*
Plugin Name: Front-end Editor
Plugin URI: http://wordpress.org/plugins/wp-front-end-editor/
Description: Front-end Editor
Author: Ella Iseulde Van Dorpe
Author URI: http://iseulde.com
Version: 1.0.0-beta1.2
Text Domain: wp-front-end-editor
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html
*/

if ( class_exists( 'FEE' ) ) {
	return;
}

require_once( 'class-fee.php' );

new FEE;
