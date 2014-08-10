/* global fee */

( function( $ ) {
	'use strict';

	function _new( postType ) {
		wp.ajax.post( 'fee_new', { post_type: postType } ).done( function( url ) {
			url && ( window.location.href = url );
		} );
	}

	$( function() {
		$( '#wp-admin-bar-new-content > a, #wp-admin-bar-new-post > a' )
			.on( 'click', function( event ) {
				event.preventDefault();
				_new( 'post' );
			} );
		$( '#wp-admin-bar-new-page > a' )
			.on( 'click', function( event ) {
				event.preventDefault();
				_new( 'page' );
			} );
		// TODO: Custom post types.
		if ( fee.lock ) {
			// $( '.post-edit-link' ).tipsy( { fallback: fee.lock + ' is currently editing' } );
			// $( '#wp-admin-bar-edit > .ab-item' ).tipsy( { fallback: fee.lock + ' is currently editing', className: 'tipsy-bar' } );
		}
	} );
} )( jQuery );
