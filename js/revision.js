/* global wpFee */
( function( $ ) {
	'use strict';
	$( document )
		.ready( function() {
			$( 'h2.long-header a' ).attr( 'href', wpFee.editLink );
		} );
} ( jQuery ) );
