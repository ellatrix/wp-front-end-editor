/* global tinymce */
tinymce.PluginManager.add( 'wpblocks', function( editor ) {

	editor.on( 'PastePreProcess', function( args ) {
		if ( args.content.match( /^\s*(https?:\/\/[^\s"]+)\s*$/im ) ) {
			var data = {
					'action': 'wp_fee_embed',
					'content': args.content
				};
			args.content = '';
			jQuery( 'body, html' ).css( 'cursor', 'progress' );
			jQuery.post( wp.fee.ajaxUrl, data, function( data ) {
				if ( data.match( /<script/i ) ) {
					jQuery( data ).find( 'script' )
						.each( function( i, val ) {
							jQuery.getScript( jQuery( val ).attr( 'src' ) );
						} );
				}
				editor.insertContent( data );
				jQuery( 'body, html' ).css( 'cursor', 'default' );
			} );
		}
	} );

} );
