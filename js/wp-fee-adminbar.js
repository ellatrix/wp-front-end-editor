/* global wpFee, alert */
( function( $ ) {
	'use strict';
	function wpFeeNew( postType ) {
		$.ajax({
			type: 'POST',
			url: wpFee.ajaxUrl,
			data: {
				'action': 'wp_fee_new',
				'post_type': postType
			},
			success: function( data ) {
				window.location.href = data;
			},
			error: function() {
				alert( 'An error occurred.' );
			}
		} );
	}
	$( document )
		.ready( function() {
			$( '#wp-admin-bar-new-content > a, #wp-admin-bar-new-post > a' )
				.on( 'click', function( event ) {
					event.preventDefault();
					wpFeeNew( 'post' );
				} );
			$( '#wp-admin-bar-new-page > a' )
				.on( 'click', function( event ) {
					event.preventDefault();
					wpFeeNew( 'page' );
				} );
			if ( wpFee.lock ) {
				$( '.post-edit-link' ).tipsy( { fallback: wpFee.lock + ' is currently editing' } );
				$( '#wp-admin-bar-edit > .ab-item' ).tipsy( { fallback: wpFee.lock + ' is currently editing', className: 'tipsy-bar' } );
			}
		} );
} ( jQuery ) );
