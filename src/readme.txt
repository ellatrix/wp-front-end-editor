=== <%= pkg.wp.name %> ===

Contributors:      <%= getContributors( pkg ) %>
Tags:              <%= pkg.keywords.join( ', ' ) %>
Requires at least: <%= pkg.wp.min %>
Tested up to:      <%= pkg.wp.max %>
Stable tag:        <%= pkg.version %>
License:           <%= pkg.license %>

== Description ==

<%= grunt.file.read( 'readme.md' ) %>

== Changelog ==

<%= grunt.file.read( 'changelog.md' ) %>
