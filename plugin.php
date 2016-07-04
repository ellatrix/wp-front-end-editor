<?php

/*
 * Plugin Name: Front-end Editor
 * Plugin URI:  https://wordpress.org/plugins/wp-front-end-editor/
 * Description: Edit your posts on the front-end of your site.
 * Version:     1.1.0
 * Author:      Ella Iseulde Van Dorpe
 * Author URI:  https://iseulde.com
 * Text Domain: wp-front-end-editor
 * Domain Path: languages
 * Network:     false
 * License:     GPL-2.0+
 */

if ( class_exists( 'FEE' ) ) {
	return;
}

require_once( 'class-fee.php' );

global $wp_front_end_editor;
$wp_front_end_editor = new FEE;
