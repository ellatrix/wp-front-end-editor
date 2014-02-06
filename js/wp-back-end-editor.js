( function( $ ) {
	'use strict';
	$( document )
		.ready( function() {
			$( 'form#post' ).append( '<input type="hidden" name="wp_fee_redirect" value="0">' );
			$( '#post-preview' ).on( 'click', function( event ) {
				wp_fee_redirect( event );
			} );
			$( 'a[href*="preview=true"]' ).on( 'click', function( event ) {
				wp_fee_redirect( event );
			} );
		} );
	function wp_fee_redirect( event ) {
		event.preventDefault();
		$( 'input[name="wp_fee_redirect"]' ).val( '1' );
		$( 'input[name="save"]' ).click();
	}
} ( jQuery ) );
