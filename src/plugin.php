<?php

/*
 * Plugin Name: <%= pkg.wp.name %>
 * Plugin URI:  <%= pkg.homepage %>
 * Description: <%= pkg.description %>
 * Version:     <%= pkg.version %>
 * Author:      <%= pkg.author.name %>
 * Author URI:  <%= pkg.author.url %>
 * Text Domain: <%= pkg.wp.textDomain %>
 * Domain Path: <%= pkg.wp.domainPath %>
 * Network:     <%= pkg.wp.network %>
 * License:     <%= pkg.license %>
 */

if ( class_exists( 'FEE' ) ) {
	return;
}

require_once( 'class-fee.php' );

global $wp_front_end_editor;
$wp_front_end_editor = new FEE;
