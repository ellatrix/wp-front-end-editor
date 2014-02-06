( function( $ ) {
	'use strict';
	function queryVar( v ) {
		var q = window.location.search.substring( 1 );
		var vars = q.split( '&' );
		for ( var i = 0; i < vars.length; i++ ) {
			var p = vars[i].split( '=' );
			if ( p[0] == v ) {
				return p[1] || null;
			}
		}
		return false;
	}
	$( document )
		.ready( function() {
			if ( queryVar( 'redirect' ) === 'front' ) {
				$( 'h2.long-header a' ).attr( 'href', wpFee.editLink );
			}
		} );
} ( jQuery ) );
