<?php

/*
 * Plugin Name: Front-end Editor
 * Plugin URI:  <%= pkg.homepage %>
 * Description: <%= pkg.description %>
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
