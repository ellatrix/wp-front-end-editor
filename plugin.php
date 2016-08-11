<?php

/*
 * Plugin Name: Front-end Editor
 * Plugin URI:  https://wordpress.org/plugins/wp-front-end-editor/
 * Description: A simple way to write with WordPress.
 * Version:     2.1.0
 * Author:      Ella Iseulde Van Dorpe
 * Author URI:  https://iseulde.com
 * Text Domain: wp-front-end-editor
 * Domain Path: languages
 * Network:     false
 * License:     GPL-2.0+
 */

if ( ! class_exists( 'FEE' ) ) {
	require_once 'class-fee.php';
	$GLOBALS['wp_front_end_editor'] = new FEE;
}
