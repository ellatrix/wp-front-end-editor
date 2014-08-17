/* global fee */

( function( $ ) {
	'use strict';

	function _new( postType ) {
		wp.ajax.post( 'fee_new', {
			post_type: postType,
			nonce: fee.nonce
		} ).done( function( url ) {
			url && ( window.location.href = url );
		} );
	}

	$( function() {
		$.each( fee.supportedPostTypes, function( i, value ) {
			$( 'a[href="' + fee.postNew + '?post_type=' + value + '"]' )
			.add( value === 'post' ? 'a[href="' + fee.postNew + '"]' : null )
			.attr( 'href', '#' )
			.on( 'click', function( event ) {
				event.preventDefault();
				_new( value );
			} );
		} );

		if ( fee.lock ) {
			// $( '.post-edit-link' ).tipsy( { fallback: fee.lock + ' is currently editing' } );
			// $( '#wp-admin-bar-edit > .ab-item' ).tipsy( { fallback: fee.lock + ' is currently editing', className: 'tipsy-bar' } );
		}
	} );
} )( jQuery );
