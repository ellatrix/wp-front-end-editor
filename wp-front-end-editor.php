<?php

/*
Plugin Name: WordPress Front-end Editor
Plugin URI: http://wordpress.org/plugins/wp-front-end-editor/
Description: WordPress Front-end Editor
Author: avryl
Author URI: http://profiles.wordpress.org/avryl/
Version: 0.8.5
Text Domain: wp-front-end-editor
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html
*/

if ( ! class_exists( 'WP_Front_End_Editor' ) ) {

	require_once( 'class-wp-front-end-editor.php' );

	WP_Front_End_Editor::instance();

}
