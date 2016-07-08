<?php

/*
 * Plugin Name: Front-end Editor
 * Plugin URI:  https://wordpress.org/plugins/wp-front-end-editor/
 * Description: Edit your posts on the front-end of your site.
 * Version:     2.0.0-alpha
 * Author:      Ella Iseulde Van Dorpe
 * Author URI:  https://iseulde.com
 * Text Domain: wp-front-end-editor
 * Domain Path: languages
 * Network:     false
 * License:     GPL-2.0+
 */

if ( ! class_exists( 'WP_REST_Post_Autosave_Controller' ) ) {
	require_once 'class-wp-rest-post-autosave-controller.php';
}

if ( ! class_exists( 'FEE' ) ) {
	require_once 'class-fee.php';
	$GLOBALS['wp_front_end_editor'] = new FEE;
}
