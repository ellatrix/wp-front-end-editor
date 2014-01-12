( function( $ ) {
	'use strict';
	$( document )
		.on( 'click', '#content-fee', function( event ) {
			wp_fee_redirect( event );
		} )
		.ready( function() {
			$( '.wp-editor-tabs' ).prepend( '<a id="content-fee" class="wp-switch-editor hide-if-no-js">Front-end<input type="hidden" name="wp_fee_redirect" value="0"></a>' );
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
