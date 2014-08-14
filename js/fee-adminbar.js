/* global fee */

( function( $ ) {
	'use strict';

	function _new( postType ) {
		wp.ajax.post( 'fee_new', { post_type: postType } ).done( function( url ) {
			url && ( window.location.href = url );
		} );
	}

	$( function() {
		var i = fee.supportedPostTypes.length;

		while ( i-- ) {
			$( 'a[href="' + fee.postNew + '?post_type=' +fee.supportedPostTypes[ i ] + '"]' )
			.add( fee.supportedPostTypes[ i ] === 'post' ? 'a[href="' + fee.postNew + '"]' : null )
			.attr( 'href', '#' )
			.on( 'click', function( event ) {
				event.preventDefault();
				_new( fee.supportedPostTypes[ i ] );
			} );
		}

		if ( fee.lock ) {
			// $( '.post-edit-link' ).tipsy( { fallback: fee.lock + ' is currently editing' } );
			// $( '#wp-admin-bar-edit > .ab-item' ).tipsy( { fallback: fee.lock + ' is currently editing', className: 'tipsy-bar' } );
		}
	} );
} )( jQuery );
