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
				window.location.href = wpFee.homeUrl + '?p=' + data + '&edit';
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
		} );
} ( jQuery ) );
